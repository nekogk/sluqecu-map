const bounds = [[0, 0], [65536, 65536]];
const defaultColor = '#ffffff';
const mapName = 'sluqecu_map';
// ---------- 주소 파라미터 ----------
// ?at=44032,28672&z=-1        그 좌표·줌으로 열기
// &embed=1                    다른 사이트(위키 등)에 iframe으로 넣을 때
const params = new URLSearchParams(location.search);
const isEmbed = params.has('embed');
const DEFAULT_VIEW = { center: [44032, 28672], zoom: 0 };

function initialView() {
    const at = (params.get('at') || '').split(',').map(Number);
    const z = Number(params.get('z'));
    return {
        center: at.length === 2 && at.every(Number.isFinite) ? at : DEFAULT_VIEW.center,
        zoom: params.has('z') && Number.isFinite(z) ? Math.min(3, Math.max(-5, z)) : DEFAULT_VIEW.zoom,
    };
}

// 크기 단위(1u = 1vh). embed에서는 iframe이 작아도 글자가 읽히도록 최소 720px 화면 기준
function unitPx() {
    return (isEmbed ? Math.max(window.innerHeight, 720) : window.innerHeight) / 100;
}
if (isEmbed) document.documentElement.style.setProperty('--u', `${unitPx()}px`);

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
            const fontPx = parseFloat(fontSizeThresholds[loc.rank]) * unitPx();
            const fontSize = `${fontPx}px`;

            let html, iconSize, iconAnchor;

            if (loc.icon && iconRanks.includes(loc.rank)) {
                const iconDef = iconData[loc.icon];
                const iconColor = iconDef ? iconDef.color : defaultColor;
                const iconSvg = buildIconSvg(iconDef);
                const iconPx = Math.round(fontPx * 2);
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
    const key = mapName + String((map.getZoom() < -2) + transitLayer * 2).padStart(2, '0');
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

Promise.all([
    fetch('datas/icon.json').then(res => res.json()),
    fetch('datas/location.json').then(res => res.json()),
    fetch('datas/station.json').then(res => res.json())
]).then(([icon, location, station]) => {
    iconData = icon;
    locationData = location.concat(station);
    renderMarkers();
    updateMapLayers();
    const view = initialView();
    map.setView(view.center, view.zoom);
});

// 현재 위치 → 주소 (?at=위도,경도&z=줌)
function viewUrl(center, zoom) {
    const lat = Array.isArray(center) ? center[0] : center.lat;
    const lng = Array.isArray(center) ? center[1] : center.lng;
    return `${location.pathname}?at=${Math.round(lat)},${Math.round(lng)}&z=${Number(zoom.toFixed(2))}`;
}

// 일반 화면: 지도를 움직이면 주소창에 현재 위치를 적어 둔다 (주소를 복사해 위키에 쓰면 됨)
if (!isEmbed) {
    map.on('moveend', () => history.replaceState(null, '', viewUrl(map.getCenter(), map.getZoom())));
}

// embed: 휠 확대는 끄고(글 스크롤을 방해하지 않게) 확대 버튼과 "전체 지도로 열기" 버튼을 둔다
if (isEmbed) {
    map.scrollWheelZoom.disable();
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const open = document.createElement('a');
    open.className = 'control-btn open-full';
    open.target = '_blank';
    open.rel = 'noopener';
    open.title = '전체 지도로 열기';
    open.setAttribute('aria-label', '전체 지도로 열기');
    open.textContent = '↗';
    const first = initialView();
    open.href = viewUrl(first.center, first.zoom);   // 지도가 뜨기 전에는 처음 위치로
    map.on('moveend', () => { open.href = viewUrl(map.getCenter(), map.getZoom()); });
    document.getElementById('custom-controls').append(open);
}

// 창 크기가 바뀌면 글자 크기를 다시 계산
map.on('resize', () => {
    if (isEmbed) document.documentElement.style.setProperty('--u', `${unitPx()}px`);
    renderMarkers();
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