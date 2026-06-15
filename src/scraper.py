#import libraries
import requests
import json
import time
import warnings

from pathlib import Path
warnings.filterwarnings("ignore")

#Define variables
current_dir = Path(__file__).resolve().parent
target_directory = current_dir.parent / "radio_data"
target_directory.mkdir(parents = True, exist_ok = True)

def build_urls(state):

    FM_URL = f"https://transition.fcc.gov/fcc-bin/fmq?state={state}&call=&city=&freq=0.0&fre2=107.9&type=0&list=4&size=9&Nt=0&Nd=1"
    AM_URL = f"https://transition.fcc.gov/fcc-bin/amq?state={state}&call=&city=&freq=0&fre2=1700&type=0&list=4&size=9&Nt=0&Nd=1"
    return FM_URL, AM_URL

HEADERS = {
    "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

REQUEST_DELAY = 1.5

CLASS_RADIUS_KM = {
    "A": 28,
    "B1": 45,
    "B": 65,
    "C3": 39,
    "C2": 52,
    "C1": 72,
    "C0": 83,
    "C": 92,
    "D": 6
}

#first function - fetches url
def fetch_stations(url):
    print(f"Fetching data from: {url}")
    response = requests.get(url, headers=HEADERS, verify=False, timeout=20)
    
    if response.status_code == 200:
        print("Success! Data received.")
        print(response.text[:500])
        return response.text
    else:
        print(f"Something went wrong. Status code: {response.status_code}")
        return None

#second function - parsing data
def parse_stations(raw_text):
    stations = []
    lines = raw_text.strip().split("\n")

    for line in lines:
        if line.startswith("|"):
            line = line[1:]
        fields = line.split("|")
        fields = [f.strip() for f in fields]
        if len(fields) < 20:
            continue
        
        try:
            call_sign = fields[0].strip()
            frequency = fields[1].strip()
            service = fields[2].strip()
            station_class = fields[6].strip()
            status = fields[8].strip()
            
            city = fields[9].strip()
            state = fields[10].strip()
            facility_id = fields[17].strip()

            lat_dir = fields[18].strip()
            lat_deg = float(fields[19])
            lat_min = float(fields[20])
            lat_sec = float(fields[21])

            lon_dir = fields[22].strip()
            lon_deg = float(fields[23])
            lon_min = float(fields[24])
            lon_sec = float(fields[25])
            
            owner = fields[26].strip()
            if not owner: 
                owner = "Unknown"

            if not call_sign or not city:
                continue

            latitude = round(lat_deg + lat_min / 60 + lat_sec / 3600, 6)
            longitude = round(lon_deg + lon_min / 60 + lon_sec / 3600, 6)

            if lat_dir.upper() == "S":
                latitude = -latitude
            if lon_dir.upper() == "W":
                longitude = -longitude
                
            stations.append ({
                "facility_id": facility_id,
                "call_sign": call_sign,
                "frequency": frequency,
                "service": service, 
                "owner": owner,
                "city": city,
                "state": state,
                "station_class": station_class,
                "transmitter_location": {
                    "wgs84_lat": latitude,
                    "wgs84_lon": longitude
                }
            })

        except (ValueError, IndexError):
            continue
    
    return stations

def clean_frequency(frequency_str): 
    try: 
        cleaned = "".join(c for c in frequency_str if c.isdigit() or c == ".")
        return float(cleaned)
    except (ValueError, TypeError): 
        return 0.0

#main fucntion - calls fetch and parse functions, combines and saves data as geoJson
def main():
    print("Starting FCC station scraper")

    VALID_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
    
    combinedGeoJson = {
        "type": "FeatureCollection",
        "features": [], 
        "metadata": {}, 
    } 
    
    unique_cities = {}
    unique_owners = set()
    unique_frequencies = set()
    unique_services = set()
    

    for index, state in enumerate(VALID_STATES): 
        try:
            FM_URL, AM_URL = build_urls(state)

            fm_raw = fetch_stations(FM_URL)
            fm_stations = []
            if fm_raw:
                fm_stations = parse_stations(fm_raw)
                print(f"Found {len(fm_stations)} FM stations")

            time.sleep(REQUEST_DELAY)

            am_raw = fetch_stations(AM_URL)
            am_stations = []
            if am_raw:
                am_stations = parse_stations(am_raw)
                print(f"Found {len(am_stations)} AM stations")

            all_stations = fm_stations + am_stations
            print(f"Total stations found: {len(all_stations)}")

            seen_ids = set()
            unique_stations = []
            for station in all_stations: 
                if station['facility_id'] not in seen_ids: 
                    seen_ids.add(station['facility_id'])
                    unique_stations.append(station)
            all_stations = unique_stations
            
            #Build GeoJson structure
            for station in all_stations:
                if station['state'] not in unique_cities: 
                    unique_cities[station['state']] = set()
                unique_cities[station['state']].add(station['city'])
                
                unique_frequencies.add(station["frequency"])
                unique_owners.add(station["owner"])
                unique_services.add(station["service"])
                radius_km = CLASS_RADIUS_KM.get(station['station_class'], 28)
                
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            station["transmitter_location"]["wgs84_lon"],
                            station["transmitter_location"]["wgs84_lat"]
                        ]
                    },
                    "properties": {
                        "id": station["facility_id"],
                        "call_sign": station["call_sign"],
                        "frequency": station["frequency"],
                        "service": station["service"],
                        "owner": station["owner"],
                        "city": station["city"],
                        "state": station["state"],
                        "station_class": station["station_class"],
                        "radius_km": radius_km
                    }
                }
                combinedGeoJson["features"].append(feature)

            time.sleep(REQUEST_DELAY * 2)
        except Exception as e: 
            print(f"ERROR: {state} THROWS {e}")
            print("Moving to next state...")
            continue
                
    combinedGeoJson["metadata"] = {
        "cities": { state: sorted(list(cities)) for state, cities in unique_cities.items() },
        "frequencies": sorted(list(unique_frequencies), key = clean_frequency), 
        "owners": sorted(list(unique_owners)),
        "services": sorted(list(unique_services)),
        "states": sorted(list(VALID_STATES)),
    }

    #Save to file
    output_file = target_directory / f"all_radio_stations.geojson"
    with open(output_file, "w") as f:
        json.dump(combinedGeoJson, f, indent=2)
    
    print(f"Done! {len(combinedGeoJson['features'])} stations saved to {output_file}")

if __name__ == "__main__":
    main()
