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
    owner: [], 
    state: []
}

let activeFilters = {
    city: [], 
    service: [], 
    owner: [], 
    state: []
};

function applyFilters(feature) {
    return Object.entries(activeFilters).every(([type, filterValue]) => {
        if (Array.isArray(filterValue) && filterValue.length === 0) return true;
        if (!filterValue || filterValue === "--ALL--") return true; 
        if (!STATION_MAP[type]) return true; 

        const actualValue = STATION_MAP[type](feature); 

        if (Array.isArray(filterValue)) {
            return filterValue.map(v => v.toUpperCase()).includes(String(actualValue).toUpperCase());
        }

        return String(actualValue).toLowerCase() === String(filterValue).toLowerCase(); 
    })
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
        if (!listEl) {
            console.error(`CHIPS_CONFIG: no element found for key "${filterKey}"`);
            return;
        }
        listEl.innerHTML = ''; 

        activeFilters[filterKey].forEach(value => {
            const li = document.createElement('li'); 
            li.className = 'filter-chip'; 
            li.innerHTML = li.innerHTML = `<span title="Remove Filter"><button onclick="onFilterChange('${filterKey}', '${value}', true)">✕</button></span> <span>${value}</span>`; 
            listEl.append(li); 
        });
    });
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
// 3.5 Favorites
// ==========================================

const FAVORITES_KEY = 'radio-map-favorites';

function loadFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || {};
    } catch {
        return {};
    }
}

function saveFavorites(favs) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function isFavorite(id) {
    return !!loadFavorites()[id];
}

function toggleFavorite(feature) {
    const favs = loadFavorites();
    const id = STATION_MAP.id(feature);

    if (favs[id]) {
        delete favs[id];
    } else {
        favs[id] = {
            id,
            call_sign: STATION_MAP.call_sign(feature),
            city: STATION_MAP.city(feature),
            state: STATION_MAP.state(feature),
            owner: STATION_MAP.owner(feature),
            frequency: STATION_MAP.frequency(feature),
            service: STATION_MAP.service(feature),
            latlng: STATION_MAP.latlng(feature),
        };
    }

    saveFavorites(favs);
    renderFavoritesPanel();

    // Refresh popup so the heart icon updates
    locationMarkersLayer.eachLayer(layer => {
        if (layer.feature && STATION_MAP.id(layer.feature) === id) {
            if (layer.isPopupOpen()) {
                layer.setPopupContent(buildPopupHTML(layer.feature));
            }
        }
    });
}

function buildPopupHTML(feature) {
    const id = STATION_MAP.id(feature);
    const starred = isFavorite(id);
    return `
        <div class="popup-content">
            <div class="popup-header">
                <strong>${STATION_MAP.call_sign(feature)}</strong>
                <button class="fav-btn ${starred ? 'fav-active' : ''}" 
                        onclick="toggleFavorite(window._popupFeature)" 
                        title="${starred ? 'Remove from favorites' : 'Add to favorites'}">
                    ${starred ? '★' : '☆'}
                </button>
            </div>
            <div class="popup-body">
                ${STATION_MAP.city(feature)}, ${STATION_MAP.state(feature)}<br>
                ${STATION_MAP.owner(feature)}<br>
                ${STATION_MAP.frequency(feature)} ${STATION_MAP.service(feature)}
            </div>
        </div>
    `;
}

function renderFavoritesPanel() {
    const favs = loadFavorites();
    const list = document.getElementById('favorites-list');
    const count = document.getElementById('favorites-count');
    const favEntries = Object.values(favs);

    count.textContent = favEntries.length > 0 ? favEntries.length : '';

    list.innerHTML = '';

    if (favEntries.length === 0) {
        list.innerHTML = '<li class="fav-empty">No favorites yet.<br>Click ☆ on any station popup.</li>';
        return;
    }

    favEntries.forEach(fav => {
        const li = document.createElement('li');
        li.className = 'fav-item';
        li.innerHTML = `
            <div class="fav-item-info">
                <span class="fav-call-sign">${fav.call_sign}</span>
                <span class="fav-detail">${fav.frequency} ${fav.service} · ${fav.city}, ${fav.state}</span>
            </div>
            <div class="fav-item-actions">
                <button class="fav-fly-btn" title="Fly to station" onclick="flyToFavorite('${fav.id}')">📍</button>
                <button class="fav-remove-btn" title="Remove favorite" onclick="removeFavorite('${fav.id}')">✕</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function flyToFavorite(id) {
    const favs = loadFavorites();
    const fav = favs[id];
    if (!fav) return;
    map.flyTo(fav.latlng, 9);

    // Open that station's popup if visible on map
    locationMarkersLayer.eachLayer(layer => {
        if (layer.feature && STATION_MAP.id(layer.feature) === id) {
            layer.openPopup();
        }
    });
}

function removeFavorite(id) {
    const favs = loadFavorites();
    delete favs[id];
    saveFavorites(favs);
    renderFavoritesPanel();

    // Refresh popup heart if open
    locationMarkersLayer.eachLayer(layer => {
        if (layer.feature && STATION_MAP.id(layer.feature) === id) {
            if (layer.isPopupOpen()) {
                layer.setPopupContent(buildPopupHTML(layer.feature));
            }
        }
    });
}

// Favorites panel toggle
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesPanelToggle = document.getElementById('favorites-panel-toggle');

favoritesPanelToggle.addEventListener('click', () => {
    favoritesPanel.classList.toggle('open');
});

document.getElementById('favorites-nav-btn').addEventListener('click', () => {
    favoritesPanel.classList.toggle('open');
});

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
            console.log(`${e.target.nextElementSibling.textContent.trim()} was checked`);
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

        layer.bindPopup(buildPopupHTML(feature));

        layer.on('popupopen', () => {
            window._popupFeature = feature;
        });

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

function onFilterChange(filterKey, newValue, clear = false) {
    if (newValue === "--ALL--") {
        activeFilters[filterKey] = [];
        updateMapFilters();
        renderFilterChips();
        return;
    }

    if (clear) {
        const index = activeFilters[filterKey].indexOf(newValue);
        activeFilters[filterKey].splice(index, 1);
    } else {
        if (!activeFilters[filterKey].includes(newValue)) {
            activeFilters[filterKey].push(newValue);
        }
    }
    updateMapFilters();
    renderFilterChips();
}

function clearFilters() {
    activeFilters = {
        city: [], 
        service: [], 
        owner: [], 
        state: []
    };
    checkBoxes.forEach(checkbox => {
        checkbox.checked = false; 
    })
    stationInput.value = ""; 
    stateInput.value = ""; 
    cityInput.value = ""; 

    onStateSelect("--ALL--");
    stateInput.value = "--ALL--";
    updateMapFilters(); 
    renderFilterChips();

    map.flyTo([40, -95.46], 5)
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

function onStateSelect(state) {
    if (state === "--ALL--") {
        cityData = [...new Set(Object.values(geoJsonData.metadata?.cities || {}).flat())];
        activeFilters.state = []; 
    } else {
        cityData = geoJsonData.metadata?.cities[state] || [];
        onFilterChange("state", state);
    }
    cityData.unshift("--ALL--"); 
    cityInput.value = ""; 
    updateMapFilters();
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
    const R = 6371; // Earth radius in kilometers
    const toRadians = (degree) => (degree * Math.PI) / 180;

    const dLat = toRadians(latlng2[0] - latlng1[0]);
    const dLng = toRadians(latlng2[1] - latlng1[1]);

    const rlat1 = toRadians(latlng1[0]);
    const rlat2 = toRadians(latlng2[0]);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(rlat1) * Math.cos(rlat2) *
              Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
}

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
        stateData.unshift("--ALL--")

        cityData = [...new Set(Object.values(geoJsonData.metadata?.cities || {}).flat())];

        clearFilters(); 
        console.log(activeFilters);
        toggleMarkers();
        renderFavoritesPanel();

        console.log("GeoJSON data loaded and added to layer successfully!");
        
    } catch (error) {
        console.log(`Couldn't load geojson data: ${error}`)
    }
}

loadData();
