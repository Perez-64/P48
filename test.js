/**
 * @important Consider splitting json files for organization for later sprints
 */

// ==========================================
// 1. Map & Legend Initialization
// ==========================================

const map = L.map('map', { zoomControl: false }).setView([40, -95.46], 5);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, 
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">Open Street Map</a>'
}).addTo(map)

window.addEventListener('load', () => {
    map.invalidateSize();
});

/*
Optional for dark mode users

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

*/

const legend = L.control({ position: "bottomright" }); 

L.control.zoom({
    position: 'bottomright'
}).addTo(map); 

// ==========================================
// 2. UI Transitions & Animations
// ==========================================

// Defining Filters
const DEFAULT_FILTERS = {
    city: [], 
    service: [],
    owner: ["K-LOVE, INC."],
    state: []
};

const disabledFilters = {
  city: new Set(),
  service: new Set(),
  owner: new Set(),
  state: new Set()
};

let activeFilters = {
    city: [], 
    service: [],
    owner: ["K-LOVE, INC."],
    state: []
};

function applyFilters(feature) {
  return Object.entries(activeFilters).every(([type, filterValue]) => {
    if (!STATION_MAP[type]) return true;

    if (Array.isArray(filterValue)) {
      const enabled = filterValue.filter(v => !disabledFilters[type].has(v));
      if (enabled.length === 0) return true;
      const actual = String(STATION_MAP[type](feature)).toUpperCase();
      return enabled.map(v => v.toUpperCase()).includes(actual);
    }

    if (!filterValue || filterValue === "--ALL--") return true;
    return String(STATION_MAP[type](feature)).toLowerCase() === String(filterValue).toLowerCase();
  });
}

// Filter Transitions 
let reveals = document.querySelectorAll(".reveal");

reveals.forEach(btn => {
    btn.addEventListener('click', function() {
        this.classList.toggle("active"); 

        const content = this.nextElementSibling; 
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    })
})

window.addEventListener("DOMContentLoaded", () => {
    // Open left filter bar
    const filterBar = document.getElementById("filter-bar");
    filterBar.classList.add("open");

    // Move toggle button to correct position
    const filterBarToggle = document.getElementById("filter-toggle");
    filterBarToggle.classList.add("toggle-button");

    // Open right active filters panel
    const activeFilters = document.getElementById("active-filters");
    activeFilters.classList.add("open-right");

    // Move right toggle button to correct position
    const activeFilterToggle = document.getElementById("active-filter-toggle");
    activeFilterToggle.classList.add("toggle-button");
});

// Open all collapsible filter sections on page load
window.addEventListener("DOMContentLoaded", () => {
    reveals.forEach(btn => {
        btn.classList.add("active");
        const content = btn.nextElementSibling;
        content.style.maxHeight = content.scrollHeight + "px";
    });
});

// Aside Transition
const filterBar = document.getElementById("filter-bar");
const filterBarToggle = document.getElementById("filter-toggle");

filterBarToggle.addEventListener('click', () => {
    filterBar.classList.toggle('open');
});

const activeFilterBar = document.getElementById("active-filters");
const activeFilterToggle = document.getElementById("active-filter-toggle");

activeFilterToggle.addEventListener('click', () => {
    activeFilterBar.classList.toggle('open-right');
});

// Active Filter Chips
const CHIPS_CONFIG = {
    owner: document.querySelector(".active-stations-list"),
    state: document.querySelector(".active-states-list"),
    city: document.querySelector(".active-cities-list")
}

function renderFilterChips() {
  Object.entries(CHIPS_CONFIG).forEach(([filterKey, listEl]) => {
    if (!listEl) return;
    listEl.innerHTML = '';

    activeFilters[filterKey].forEach(value => {
      const li = document.createElement('li');
      li.className = 'filter-chip';

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove Filter';
      removeBtn.addEventListener('click', () => onFilterChange(filterKey, value, true));

      const label = document.createElement('span');
      label.className = 'filter-chip-label';
      label.textContent = value;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.title = 'Toggle Filter';
      checkbox.checked = !disabledFilters[filterKey].has(value);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          disabledFilters[filterKey].delete(value);
        } else {
          disabledFilters[filterKey].add(value);
        }
        li.classList.toggle('chip-disabled', !checkbox.checked);
        updateMapFilters();
      });

      li.append(removeBtn, label, checkbox);
      listEl.append(li);
    });
  });
}

// FIX 1 (Bug 5): Changed fallback from `|| {}` to `|| []` so flatMap always receives an array
function getAvailableCities() {
    if (activeFilters.state.length === 0) {
        return [...new Set(Object.values(geoJsonData.metadata?.cities || {}).flat())];
    }
    return [...new Set(
        activeFilters.state.flatMap(state => geoJsonData.metadata?.cities[state] || [])
    )];
}

// ==========================================
// 3. Data Processing Utilities
// ==========================================

/**
 * @important Build validation functions later 
 * @important Add other variables here later. 
 */

const STATION_MAP = {
    id: (f) => f.properties.id,
    latlng: (f) => {
        const coords = f.geometry.coordinates; 
        return [coords[1], coords[0]];
    },
    call_sign: (f) => f.properties.call_sign, 
    city: (f) => f.properties.city, 
    state: (f) => f.properties.state, 
    frequency: (f) => f.properties.frequency, 
    status: (f) => f.properties.status,
    owner: (f) => f.properties.owner,
    service: (f) => f.properties.service,
    radius: (f) => f.properties.radius_km,
}

// ==========================================
// 4. Station Search & Dropdown Logic
// ==========================================

let licenseeData; 
const limit = 12; 

const stationInput = document.getElementById("station-search");
const stateInput = document.getElementById("state-search");
const cityInput = document.getElementById("city-search");
const stationList = document.getElementById("station-list"); 
const stateList = document.getElementById("state-list"); 
const cityList = document.getElementById("city-list");

function displayList(listElement, inputElement, data, filterText = "", onSelect) {
    const filteredData = data.filter(item => item.toLowerCase().includes(filterText.toLowerCase()));
    const topResults = filteredData.slice(0, limit); 

    listElement.innerHTML = ""; 

    if (topResults.length > 0) {
        listElement.classList.remove("hidden"); 
        topResults.forEach(listItem => {
            let li = document.createElement("li"); 
            li.textContent = listItem; 
            li.addEventListener("mousedown", () => {
                inputElement.value = listItem; 
                listElement.classList.add("hidden");
                onSelect(listItem)
            });

            listElement.appendChild(li);
        });
    } else {
        listElement.classList.add('hidden');
    }
}

stationInput.addEventListener('input', (e) => {
    if (!stationData) return;
    displayList(stationList, stationInput, stationData, e.target.value, (selected) => onFilterChange("owner", selected));
});

stateInput.addEventListener('input', (e) => {
    if (!stateData) return;
    displayList(stateList, stateInput, stateData, e.target.value, (selected) => onStateSelect(selected));
});

cityInput.addEventListener('input', (e) => {
    if (!cityData) return;
    displayList(cityList, cityInput, cityData, e.target.value, (selected) => onFilterChange("city", selected));
});

document.addEventListener('click', (event) => {
    const inputs = [stationInput, stateInput, cityInput];
    const lists = [stationList, stateList, cityList];

    lists.forEach((list, i) => {
        if (event.target !== inputs[i] && event.target !== list) {
            list.classList.add('hidden');
        }
    });
});

function setCheckbox(id, value, checked) {
    document.getElementById(id).checked = checked; 
    if (checked && !activeFilters.service.includes(value)) {
        activeFilters.service.push(value); 
    } else if (!checked) {
        const index = activeFilters.service.indexOf(value); 
        if (index > -1) activeFilters.service.splice(index, 1);
    }
}

// ==========================================
// 4.5 Radio Station Service
// ==========================================
const checkBoxes = document.querySelectorAll('fieldset input[type="checkbox"]'); 

checkBoxes.forEach(checkbox => {
    checkbox.addEventListener("change", function (e) {
        const checkBoxText = e.target.nextElementSibling.textContent.trim(); 

        if (e.target.checked) {
            console.log(`${e.target.nextElementSibling.textContent.trim()} was checked`);
            if (!activeFilters["service"].includes(checkBoxText)) {
                onFilterChange("service", checkBoxText);
            }            
        } else {
            console.log(`${e.target.nextElementSibling.textContent.trim()} was unchecked`);
            if (activeFilters["service"].includes(checkBoxText)) {
                onFilterChange("service", checkBoxText, true);
            }          
        }
    });
});

// ==========================================
// 5. Leaflet Layer Management
// ==========================================

/**
 * @important Make changes here in the future. This is hard-coded information
 */ 
let geoJsonData = null;
let showMarkers = false; 
let activeCircle = null;
let currentLatLngData = [];

const locationMarkersLayer = L.geoJSON(null, {
    filter: feature => applyFilters(feature), 
    onEachFeature: function (feature, layer) {
        layer.on('click', function() {
            if (activeCircle && map.hasLayer(activeCircle)) {
                map.removeLayer(activeCircle); 
            }

            activeCircle = L.circle(STATION_MAP.latlng(feature), {
                radius: STATION_MAP.radius(feature) * 1000, 
                color: 'red', 
                weight: 1, 
                fillOpacity: 0.2
            }).addTo(map);
            
            map.flyTo(STATION_MAP.latlng(feature), 9)
        })

        layer.bindPopup(`
            <strong>${STATION_MAP.call_sign(feature)}</strong><br>
            ${STATION_MAP.city(feature)}, ${STATION_MAP.state(feature)}<br>
            ${STATION_MAP.owner(feature)}<br>
            ${STATION_MAP.frequency(feature)} ${STATION_MAP.service(feature)}
        `);

        currentLatLngData.push({ latlng: STATION_MAP.latlng(feature), layer });
    }
}).addTo(map); 

function updateMapFilters() {
    if (!geoJsonData) {
        return; 
    }

    locationMarkersLayer.clearLayers(); 

    if (activeCircle && map.hasLayer(activeCircle)) {
        map.removeLayer(activeCircle); 
    }

    if (showMarkers) {
        currentLatLngData = [];
        locationMarkersLayer.addData(geoJsonData); 
    }
}

// FIX 2 (Bug 7): Mutate activeFilters FIRST, then refresh cityData so getAvailableCities()
// reads the already-updated state list. Also flattened the --ALL-- case into the main flow
// instead of an early return, keeping update/render calls in one place at the bottom.
function onFilterChange(filterKey, newValue, clear = false) {
    if (newValue === "--ALL--") {
        activeFilters[filterKey] = [];
    } else if (clear) {
        const index = activeFilters[filterKey].indexOf(newValue);
        if (index > -1) activeFilters[filterKey].splice(index, 1);
    } else {
        if (!activeFilters[filterKey].includes(newValue)) {
            activeFilters[filterKey].push(newValue);
        }
    }

    if (filterKey === "state") {
        cityData = getAvailableCities();
        cityData.unshift("--ALL--");
    }

    updateMapFilters();
    renderFilterChips();
}

// FIX 3 (Bug 4): Removed the onStateSelect("--ALL--") call that was triple-firing
// updateMapFilters and renderFilterChips. cityData is now set directly here once.
function clearFilters() {
    activeFilters = {
        city: [], 
        service: [],
        owner: ["K-LOVE, INC."],
        state: []
    };

    checkBoxes.forEach(checkbox => {
        checkbox.checked = false; 
    });

    stationInput.value = "K-LOVE, INC.";
    stateInput.value = "";
    cityInput.value = "";

    cityData = getAvailableCities();
    cityData.unshift("--ALL--");

    updateMapFilters(); 
    renderFilterChips();
    map.flyTo([40, -95.46], 5);
}

function showLocations() {
    locationMarkersLayer.addTo(map); 
    console.log("Location Markers added successfully!");
    showMarkers = true; 
    updateMapFilters();
}

function hideMarkers() {
    showMarkers = false; 
    updateMapFilters();    

    if (map) {
        map.flyTo([40, -95.46], 5);
    } 
}

// FIX 4 (Bug 3): Removed direct cityData assignments that bypassed getAvailableCities().
// --ALL-- case now resets state and refreshes city pool directly.
// The else branch just clears the input and delegates entirely to onFilterChange,
// which handles the cityData refresh, updateMapFilters, and renderFilterChips.
function onStateSelect(state) {
    if (state === "--ALL--") {
        activeFilters.state = [];
        cityData = getAvailableCities();
        cityData.unshift("--ALL--");
        cityInput.value = "";
        updateMapFilters();
        renderFilterChips();
    } else {
        cityInput.value = "";
        onFilterChange("state", state);
    }
}

/**
 * @important Set to focus Ohio state
 */

function toggleMarkers() {
    const toggleButton = document.getElementById("toggle-plots"); 
    if (showMarkers) {
        hideMarkers(); 
        toggleButton.textContent = "Show Plots"
    } else {
        showLocations(); 
        toggleButton.textContent = "Hide Plots"
    }
}

function toggleRadius() {
    const toggleButton = document.getElementById("toggle-radius"); 
    if (activeCircle && map.hasLayer(activeCircle)) {
        map.removeLayer(activeCircle);
    } else {
        map.addLayer(activeCircle); 
    }
}

// 5.5 Other Utility Functions
function haversineDistance(latlng1, latlng2) {
    const R = 6371;
    const toRadians = (degree) => (degree * Math.PI) / 180;

    const dLat = toRadians(latlng2[0] - latlng1[0]);
    const dLng = toRadians(latlng2[1] - latlng1[1]);

    const rlat1 = toRadians(latlng1[0]);
    const rlat2 = toRadians(latlng2[0]);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(rlat1) * Math.cos(rlat2) *
              Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// FIX 5 (Bug 6): Added null guard — if no stations are visible (filtered out or hidden),
// nearestStation stays null and would crash on .latlng access. Now exits gracefully.
function findNearestStation() {
    let nearestStation = null; 
    let minDistance = Infinity; 
    const { lat, lng } = map.getCenter();
    const userLatLng = [lat, lng];

    currentLatLngData.forEach(({ latlng, layer }) => {
        const distance = haversineDistance(userLatLng, latlng);
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = { latlng, layer };
        }
    });

    if (!nearestStation) {
        console.warn("No visible stations to snap to.");
        return;
    }
    
    map.flyTo(nearestStation.latlng, 9);
    nearestStation.layer.openPopup(); 
}

// ==========================================
// 6. Data Loading & Execution
// ==========================================

async function loadData() { 
    const filePath = './radio_data/all_radio_stations.geojson'; 

    try {
        const response = await fetch(filePath); 
        
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`); 

        geoJsonData = await response.json(); 

        stationData = geoJsonData.metadata?.owners || []; 
        stationData = [...new Set(stationData)];
        stationData.unshift("--ALL--");

        stateData = geoJsonData.metadata?.states || []; 
        stateData = [...new Set(stateData)];
        stateData.unshift("--ALL--");

        clearFilters(); 
        console.log(activeFilters);
        toggleMarkers();

        console.log("GeoJSON data loaded and added to layer successfully!");
        
    } catch (error) {
        console.log(`Couldn't load geojson data: ${error}`)
    }
}

loadData();