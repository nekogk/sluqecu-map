const bounds = [[0, 0], [65536, 65536]];
const defaultColor = '#ffffff';
const mapName = 'sluqecu_map';
const map = L.map('map', {crs: L.CRS.Simple, zoomSnap: 0, minZoom: -5, maxZoom: 3, zoomControl: false, maxBounds: bounds, maxBoundsViscosity: 1.0});
const iconRanks = ['a', 'b', 'c', 'd', 'e'];
const zoomThresholds = {'m': -5, 'w': -4, 't': -3, 's': -2.5, 'a': -2, 'b': -1.5, 'c': -1, 'd': -0.5, 'e': 0};
const zoomThresholdsDisappear = {'m': -2, 'w': -1, 't': 0, 's': 0.5, 'a': 1, 'b': 1.5, 'c': 2, 'd': 2.5, 'e': 3};
const fontSizeThresholds = {'m': '4.8vh', 'w': '3.2vh', 't': '2.4vh', 's': '2.4vh', 'a': '1.6vh', 'b': '1.6vh', 'c': '1.6vh', 'd': '1.6vh', 'e': '1.6vh'};
const zIndexRanks = {'m': 800, 'w': 700, 's': 600, 'a': 500, 'b': 400, 'c': 300, 'd': 200, 'e': 100};

let currentMapKey = mapName + '00';
let mapOverlay = L.imageOverlay(`maps/${currentMapKey}.svg`, bounds, {pane: 'mapPane'}).addTo(map);
let markerLayer = L.layerGroup().addTo(map);
let currentLang = 'ro';
let transitLayer = 0;
let landLayer = 0;
let mapLayerDefs = [];
let locationData = [];
let iconData = {};
let mapLayers = {};

function buildIconSvg(def) {
    if (!def) return;
    
    const shapeMarkup = def.shape === 'rect'
        ? `<rect x="2" y="2" width="20" height="20" rx="6" ry="6" fill="currentColor" stroke="#222222" stroke-width="2" />`
        : `<circle cx="12" cy="12" r="10" fill="currentColor" stroke="#222222" stroke-width="2" />`;

    return `<svg viewBox="0 0 24 24" width="24" height="24">
        ${shapeMarkup}
        <use href="icons/${def.icon}" x="5" y="5" width="14" height="14" />
    </svg>`;
}

function renderMarkers() {
    markerLayer.clearLayers();
    const currentZoom = map.getZoom();

    locationData.forEach(loc => {
        if (currentZoom >= zoomThresholds[loc.rank] && currentZoom <= zoomThresholdsDisappear[loc.rank]) {
            const text = loc.names[currentLang] || loc.names['en'];
            const fontSize = fontSizeThresholds[loc.rank];

            let html, iconSize, iconAnchor;

            if (loc.icon && iconRanks.includes(loc.rank)) {
                const iconDef = iconData[loc.icon];
                const iconColor = iconDef ? iconDef.color : defaultColor;
                const iconSvg = buildIconSvg(iconDef);
                const iconPx = Math.round(parseFloat(fontSize) * window.innerHeight / 50);
                const isRect = iconDef && iconDef.shape === 'rect';

                if (isRect) {
                    html = `
                        <div class="map-label-col">
                            <span class="map-icon" style="width:${iconPx}px; height:${iconPx}px; color:${iconColor};">${iconSvg}</span>
                            <span class="map-label-text" style="font-size:${fontSize}; color:${iconColor};">${text}</span>
                        </div>
                    `;
                    const colWidth = Math.max(iconPx * 2, 200);
                    iconSize = [colWidth, iconPx + 40];
                    iconAnchor = [colWidth / 2, iconPx / 2];
                } else {
                    html = `
                        <div class="map-label-row">
                            <span class="map-icon" style="width:${iconPx}px; height:${iconPx}px; color:${iconColor};">${iconSvg}</span>
                            <span class="map-label-text" style="font-size:${fontSize}; color:${iconColor};">${text}</span>
                        </div>
                    `;
                    iconSize = [300, 40];
                    iconAnchor = [iconPx / 2, 20];
                }
            } else {
                html = `<div style="font-size: ${fontSize}">${text}</div>`;
                iconSize = [200, 40];
                iconAnchor = [100, 10];
            }

            const textIcon = L.divIcon({className: 'map-label', html: html, iconSize: iconSize, iconAnchor: iconAnchor});
            const offset = zIndexRanks[loc.rank] || 0;

            L.marker(loc.coords, {icon: textIcon, zIndexOffset: offset}).addTo(markerLayer);
        }
    });
}

function updateMapLayers() {
    const key = mapName + String((map.getZoom() < -2) + transitLayer * 2 + landLayer * 4).padStart(2, '0');
    if (key === currentMapKey) return;
    mapOverlay.setUrl(`maps/${key}.svg`);
    currentMapKey = key;
}

function toggleLang(btnElement) {
    const isActive = btnElement.classList.toggle('active');
    currentLang = isActive ? 'en' : 'ro';
    renderMarkers();
}

function toggleTransit(btnElement) {
    const isActive = btnElement.classList.toggle('active');
    transitLayer = isActive ? 1 : 0;
    updateMapLayers();
}

function toggleLand(btnElement) {
    const isActive = btnElement.classList.toggle('active');
    landLayer = isActive ? 1 : 0;
    updateMapLayers();
}

Promise.all([
    fetch('datas/icon.json').then(res => res.json()),
    fetch('datas/location.json').then(res => res.json()),
    fetch('datas/station.json').then(res => res.json())
]).then(([icon, location, station]) => {
    iconData = icon;
    locationData = location.concat(station);
    renderMarkers();
    updateMapLayers();
    map.fitBounds(bounds);
    map.setView([44032, 28672], 0);
});

mapLayerDefs.forEach(def => {
    const paneName = `${def.key}Pane`;
    const pane = map.getPane(paneName);
    map.createPane(paneName);
    pane.style.zIndex = def.zIndex;
    pane.classList.add('map-svg-pane');
    mapLayers[def.key] = L.imageOverlay(def.file, bounds, { pane: paneName });
});

map.on('zoomend', updateMapLayers);
map.on('zoomend', renderMarkers);

map.on('click', function(e) {
    if (!e.originalEvent.shiftKey) return;
    navigator.clipboard.writeText(`[${Math.round(e.latlng.lat)}, ${Math.round(e.latlng.lng)}]`);
});