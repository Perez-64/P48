/**
 * @important Consider splitting json files for organization for later sprints
 */

// ==========================================
// 1. Map & Legend Initialization
// ==========================================

const map = L.map("map", { zoomControl: false }).setView([40, -95.46], 5);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">Open Street Map</a>',
}).addTo(map);

window.addEventListener("load", () => {
  map.invalidateSize();
});

/*
Optional for dark mode users

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

*/

const legend = L.control({ position: "bottomright" });

L.control
  .zoom({
    position: "topright",
  })
  .addTo(map);

// ==========================================
// 2. UI Transitions & Animations
// ==========================================

// Defining Filters
const DEFAULT_FILTERS = {
  city: "",
  service: [],
  owner: "",
  state: "",
};

let activeFilters = { ...DEFAULT_FILTERS, service: [] };

function applyFilters(feature) {
  return Object.entries(activeFilters).every(([type, filterValue]) => {
    if (Array.isArray(filterValue) && filterValue.length === 0) return true;

    if (!filterValue || filterValue === "--ALL--") return true;

    const actualValue = STATION_MAP[type](feature);

    if (Array.isArray(filterValue)) {
      return filterValue.includes(String(actualValue).toUpperCase());
    }

    return (
      String(actualValue).toLowerCase() === String(filterValue).toLowerCase()
    );
  });
}

// Filter Transitions
let reveals = document.querySelectorAll(".reveal");

reveals.forEach((btn) => {
  btn.addEventListener("click", function () {
    this.classList.toggle("active");

    const content = this.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
});

// Aside Transition
const filterBar = document.getElementById("filter-bar");
const filterBarToggle = document.getElementById("filter-toggle");

filterBarToggle.addEventListener("click", () => {
  filterBar.classList.toggle("open");
});

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
};

// ==========================================
// 4. Station Search & Dropdown Logic
// ==========================================

let licenseeData;
const limit = 8;

const input = document.getElementById("station-search");
const stateInput = document.getElementById("state-search");
const cityInput = document.getElementById("city-search");
const list = document.getElementById("station-list");

function displayList(filterText = "") {
  const filteredData = licenseeData.filter((item) =>
    item.toLowerCase().includes(filterText.toLowerCase()),
  );

  let topEightResults = filteredData.slice(0, limit);

  list.innerHTML = "";

  if (topEightResults.length > 0) {
    // Reveals the list
    list.classList.remove("hidden");
    topEightResults.forEach((listItem) => {
      let li = document.createElement("li");
      li.textContent = listItem;
      li.addEventListener("mousedown", () => {
        input.value = listItem;
        list.classList.add("hidden");
        onFilterChange("owner", listItem);
      });
      list.appendChild(li);
    });
  } else {
    list.classList.add("hidden");
  }
}

input.addEventListener("input", (event) => displayList(event.target.value));

document.addEventListener("click", (event) => {
  if (event.target !== input && event.target !== list) {
    list.classList.add("hidden");
  }
});

// ==========================================
// 4.5 Radio Station Service
// ==========================================
const checkBoxes = document.querySelectorAll('fieldset input[type="checkbox"]');

checkBoxes.forEach((checkbox) => {
  checkbox.addEventListener("change", function (e) {
    const checkBoxText = e.target.nextElementSibling.textContent.trim();

    if (e.target.checked) {
      console.log(
        `${e.target.nextElementSibling.textContent.trim()} was checked`,
      );

      if (!activeFilters["service"].includes(checkBoxText)) {
        onFilterChange("service", checkBoxText, "array");
      }
    } else {
      console.log(
        `${e.target.nextElementSibling.textContent.trim()} was checked`,
      );
      if (activeFilters["service"].includes(checkBoxText)) {
        onFilterChange("service", checkBoxText, "array", true);
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

const locationMarkersLayer = L.geoJSON(null, {
  filter: (feature) => applyFilters(feature),
  onEachFeature: function (feature, layer) {
    layer.on("click", function () {
      if (activeCircle && map.hasLayer(activeCircle)) {
        map.removeLayer(activeCircle);
      }

      activeCircle = L.circle(STATION_MAP.latlng(feature), {
        radius: STATION_MAP.radius(feature) * 1000,
        color: "red",
        weight: 1,
        fillOpacity: 0.2,
      }).addTo(map);

      map.flyTo(STATION_MAP.latlng(feature), 9);
    });

    layer.bindPopup(`
            <strong>${STATION_MAP.call_sign(feature)}</strong><br>
            ${STATION_MAP.city(feature)}, ${STATION_MAP.state(feature)}<br>
            ${STATION_MAP.owner(feature)}<br>
            ${STATION_MAP.frequency(feature)} ${STATION_MAP.service(feature)}
        `);
  },
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
    locationMarkersLayer.addData(geoJsonData);
  }
}

function onFilterChange(filterKey, newValue, type = null, clear = null) {
  if (type == "array") {
    if (clear) {
      const index = activeFilters[filterKey].indexOf(newValue);
      activeFilters[filterKey].splice(index, 1);
    } else {
      activeFilters[filterKey].push(newValue);
    }

    updateMapFilters();
    return;
  }

  activeFilters[filterKey] = newValue;
  updateMapFilters();
}

function clearFilters() {
  activeFilters = { ...DEFAULT_FILTERS, service: [] };

  checkBoxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
  input.value = "";
  updateMapFilters();
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

/**
 * @important Set to focus Ohio state
 */

function toggleMarkers() {
  const toggleButton = document.getElementById("toggle-plots");
  if (showMarkers) {
    hideMarkers();
    toggleButton.textContent = "Show Plots";
  } else {
    showLocations();
    map.flyTo([40.361667, -82.741667], 7);
    toggleButton.textContent = "Hide Plots";
  }
}

// ==========================================
// 6. Data Loading & Execution
// ==========================================

async function loadData() {
  const filePath = "./radio_data/all_radio_stations.geojson";

  try {
    const response = await fetch(filePath);

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

    geoJsonData = await response.json();

    licenseeData = geoJsonData.metadata?.owners || [];
    licenseeData.unshift("--ALL--");

    clearFilters();
    document.getElementById("radio-am").checked = true;
    onFilterChange("service", "AM", "array");
    onFilterChange("state", "OH");
    toggleMarkers();

    console.log("GeoJSON data loaded and added to layer successfully!");
  } catch (error) {
    console.log(`Couldn't load geojson data: ${error}`);
  }
}

loadData();
