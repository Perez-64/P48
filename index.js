<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="./styles.css" rel="stylesheet" type="text/css">
    <link rel="icon" type="image/png" href="./images/favicon_io/favicon.ico" >  
<!-- Leaflet API CSS and JavaScript connection-->
    <link 
    rel="stylesheet" 
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
    />

    <script 
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin="">
    </script>

    <title>Radio Map</title>
</head>
<body>
    <header>
        <a href="https://p48marketing.com/">
            <img src="./images/P48_Logo.png" />
        </a>
        <nav class="navbar">
            <ul>
                <li><a href="https://www.fcc.gov/media/radio/broadcast-radio-links" target="_blank">Data Sourcing</a></li>
                <li><a href="https://p48marketing.com/team/" target="_blank">About Us</a></li>
                <li><a href="https://p48marketing.com/#letstalk" target="_blank">Contact Us</a></li>
                <li onclick="toggleMarkers()" id="toggle-plots">Show Plots</li>
                <li id="favorites-nav-btn">★ Favorites <span id="favorites-count" class="fav-badge"></span></li>
            </ul>
        </nav>
    </header>

    <main>
        <aside id="filter-bar">
            <!-- Radio Station Selection-->
            <section class="section-reveal" id="radio-station">
                <button class="reveal">Radio Station</button>

                <form class="content" autocomplete="off">
                    <label for="station-search" >Search Licensee</label>
                    <input type="text" id="station-search" class="search" placeholder="Search stations..." autocomplete="off" />
                    <ul id="station-list" class="hidden dropdown-list">
                        </ul>

                    <label for="genre-search">Search Genres</label>
                    <input type="text" id="genre-search" class="search" placeholder="E.x. Top 40... " autocomplete="off" />
                    <ul id="genre-list" class="hidden dropdown-list">
                        </ul>

                    <!-- Radio Broadcasting Type -->
                    <fieldset>
                        <legend>Choose Broadcasting Type</legend>
                        <input type="checkbox" id="radio-am" name="broadcast-select"/>
                        <label for="radio-am" >AM</label>

                        <input type="checkbox" id="radio-fm" name="broadcast-select"/>
                        <label for="radio-fm" >FM</label>

                        <input type="checkbox" id="radio-fl" name="broadcast-select"/>
                        <label for="radio-fl" >FL</label>
                        
                        <input type="checkbox" id="radio-fb" name="broadcast-select"/>
                        <label for="radio-fb" >FB</label>

                        <input type="checkbox" id="radio-fs" name="broadcast-select"/>
                        <label for="radio-fs" >FS</label>

                        <input type="checkbox" id="radio-fx" name="broadcast-select"/>
                        <label for="radio-fx" >FX</label>
                    </fieldset>

                <button type="button" onclick="clearFilters()" id="reset-button">Reset Filters</button>

                </form>
            </section>

            <!-- Location Selection-->
            <section class="section-reveal">
                <button class="reveal">Location</button>
                
                <form class="content" autocomplete="off">
                    <label for="state-search">Search States</label>
                    <input type="text" id="state-search" class="search" placeholder="Search states..." autocomplete="off" />
                    <ul id="state-list" class="hidden dropdown-list">
                        </ul>
                    
                    <label for="city-search">Search Cities</label>
                    <input type="text" id="city-search" class="search" placeholder="Search cities..." autocomplete="off" />
                    <ul id="city-list" class="hidden dropdown-list">
                        </ul>
                </form>
            <!-- -->
            </section>
            <section class="section-reveal">
                <button class="reveal">Map Toggles</button>

                <form class="content" autocomplete="off">
                    <button type="button" onclick="toggleRadius()" id="toggle-radius" class="utility-button">Toggle Radius</button>
                    <button type="button" onclick="findNearestStation()" id="nearest-station" class="utility-button">Find Nearest Station</button>
                </form>
            </section>
            <section class="section-reveal">
                <button class="reveal">Something else</button>

                <div class="content">
                    <p>some text</p>
                    <p>lorem is </p>
                </div>
            </section>
        </aside>
        <button id="filter-toggle" class="toggle-button">
            <span class="arrow">▶</span>
        </button>
        
        <div id="map"></div>

        <aside id="active-filters">
            <section id="active-stations" class="active-section">
                <h2>Active Radio-Stations</h2>
                <ul class="active-stations-list">
                </ul>
            </section>

            <section id="active-states" class="active-section">
                <h2>Active States</h2>
                <ul class="active-states-list">
                </ul>
            </section>

            <section id="active-cities" class="active-section">
                <h2>Active Cities</h2>
                <ul class="active-cities-list">
                </ul>
            </section>
        </aside>
        <button id="active-filter-toggle" class="toggle-button">
            <span class="arrow">◀</span>
        </button>

        <!-- Favorites Panel -->
        <div id="favorites-panel">
            <h2 class="favorites-title">★ Favorites</h2>
            <ul id="favorites-list"></ul>
        </div>
        <button id="favorites-panel-toggle" class="toggle-button fav-toggle-btn">
            <span>★</span>
        </button>
    </main>

    <script src="test.js"></script>
</body>
</html>
