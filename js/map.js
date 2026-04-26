// ── Event Location Data ──
const locations = [
  { name: 'Split Airport',       lat: 43.5389, lng: 16.2980, day: 'pre' },
  { name: 'Split Ferry Terminal', lat: 43.5035, lng: 16.4425, day: 'pre' },
  { name: 'Lambik Bar & Bistro', lat: 43.0587, lng: 16.1991, day: 'mon' },
  { name: 'Fort George',         lat: 43.0739, lng: 16.1967, day: 'tue' },
  { name: 'Marshal Club Hotel',  lat: 43.0608, lng: 16.1850, day: 'wed' },
  { name: 'Stiniva Beach',       lat: 43.0214, lng: 16.1716, day: 'wed' },
  { name: 'Padel Centar Split',  lat: 43.5120, lng: 16.4920, day: 'thu' },
  { name: "Diocletian's Palace", lat: 43.5085, lng: 16.4402, day: 'thu' },
];

// ── Marker Icon Factories ──
function makePinIcon() {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 36" width="28" height="32">
      <path d="M16 1C9.1 1 3.5 6.4 3.5 13C3.5 20.1 16 33 16 33S28.5 20.1 28.5 13C28.5 6.4 22.9 1 16 1z"
        fill="#f5c518" stroke="#d8ad00" stroke-width="2.5"/>
      <circle cx="16" cy="13" r="3.8" fill="rgba(255,255,255,0.95)"/>
    </svg>`,
    iconSize: [28, 32],
    iconAnchor: [14, 32],
  });
}

function makeCircleIcon() {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="15" height="15">
      <circle cx="9" cy="9" r="6.5" fill="#c9a200" stroke="#d8ad00" stroke-width="2.5"/>
    </svg>`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5],
  });
}

const ACTIVE_ICON  = () => makePinIcon();
const INACTIVE_ICON = () => makeCircleIcon();

const TARGET_ZOOM = 15;
const MIN_FLIGHT_DURATION = 2.075;
const MAX_FLIGHT_DURATION = 5.5;
const FLIGHT_PIXELS_PER_SECOND = 2850;

// ── Map Setup ──
const map = L.map('map-container', {
  zoomControl: false,
  attributionControl: false,
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &middot; <a href="https://carto.com/">CARTO</a>',
}).addTo(map);

L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

// ── Create Markers ──
const markers = locations.map(loc => {
  const marker = L.marker([loc.lat, loc.lng], {
    icon: INACTIVE_ICON(),
  }).addTo(map);

  marker.bindPopup(`<strong>${loc.name}</strong>`, {
    closeButton: false,
    className: 'map-popup',
  });

  marker.on('click', () => {
    const cards = document.querySelectorAll('.event-card');
    const idx = [...cards].findIndex(c => c.dataset.location === loc.name);
    if (idx !== -1 && typeof snapToCard === 'function') {
      snapToCard(idx);
    }
  });

  return { marker, day: loc.day, lat: loc.lat, lng: loc.lng, name: loc.name };
});

// ── Flapping bird overlay ──
const mapBird = document.createElement('div');
mapBird.id = 'map-bird';
mapBird.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-65 -45 130 90" width="75" height="52">
  <g class="bird-wing-lower" style="transform-origin:0px 5px">
    <path d="M0 5 Q-16 22 -38 20 Q-16 10 0 5" fill="#c4bfb5"/>
  </g>
  <ellipse cx="0" cy="5" rx="20" ry="10" fill="#f3ede5"/>
  <path d="M-18 5 L-30 -2 L-28 14 Z" fill="#ddd8ce"/>
  <circle cx="18" cy="-3" r="9" fill="#f3ede5"/>
  <path d="M25 -3 L38 0 L25 3 Z" fill="#f0a830"/>
  <path d="M27 1 L38 0 L27 3.5 Z" fill="#d4901c"/>
  <circle cx="21" cy="-5" r="2.3" fill="#1a1a2e"/>
  <circle cx="21.8" cy="-5.7" r="0.8" fill="white"/>
  <g class="bird-wing-upper" style="transform-origin:0px 5px">
    <path d="M0 5 Q-18 -20 -42 -16 Q-18 -4 0 5" fill="#e6e1d8"/>
  </g>
</svg>`;
document.getElementById('map-container').appendChild(mapBird);

function birdScale() {
  const zoom = map.getZoom();
  const zoomDelta = Math.max(0, TARGET_ZOOM - zoom);
  const scale = Math.min(1.35, 1 + zoomDelta * 0.28);
  mapBird.style.transform = `translate(-50%, -55%) scale(${scale})`;
  mapBird.classList.toggle('bird-flapping', zoomDelta > 0.3);
}

map.on('zoom', birdScale);

let birdShowTimer = null;
let birdHideTimer = null;

function hideBird() {
  mapBird.classList.remove('visible', 'bird-flapping');
  mapBird.style.transform = '';
}

map.on('moveend', () => {
  clearTimeout(birdShowTimer);
  clearTimeout(birdHideTimer);
  hideBird();
});

// ── Set initial view ──
const preLocs = locations.filter(l => l.day === 'pre');
const initBounds = L.latLngBounds(preLocs.map(l => [l.lat, l.lng]));
map.fitBounds(initBounds, { padding: [50, 50], maxZoom: 15 });
requestAnimationFrame(() => map.invalidateSize());
window.addEventListener('resize', () => map.invalidateSize());

// ── Highlight the marker for the scrolled-to event card ──
let currentMarkerName = 'Split Airport';

markers.forEach(m => {
  const isActive = m.name === 'Split Airport';
  m.marker.setIcon(isActive ? ACTIVE_ICON() : INACTIVE_ICON());
  m.marker.setZIndexOffset(isActive ? 1000 : 0);
});

function calculateFlightDuration(from, to) {
  const start = map.project([from.lat, from.lng], TARGET_ZOOM);
  const end = map.project([to.lat, to.lng], TARGET_ZOOM);
  const distance = start.distanceTo(end);
  return Math.min(
    MAX_FLIGHT_DURATION,
    Math.max(MIN_FLIGHT_DURATION, distance / FLIGHT_PIXELS_PER_SECOND)
  );
}

function highlightMarker(locationName) {
  if (!locationName || locationName === currentMarkerName) return;
  const source = markers.find(m => m.name === currentMarkerName);
  const target = markers.find(m => m.name === locationName);
  if (!target) return;
  currentMarkerName = locationName;

  markers.forEach(m => {
    const isActive = m.name === locationName;
    m.marker.setIcon(isActive ? ACTIVE_ICON() : INACTIVE_ICON());
    m.marker.setZIndexOffset(isActive ? 1000 : 0);
  });

  if (source) {
    const duration = calculateFlightDuration(source, target);
    map.flyTo([target.lat, target.lng], TARGET_ZOOM, { duration });

    clearTimeout(birdShowTimer);
    clearTimeout(birdHideTimer);
    const durationMs = duration * 1000;
    birdShowTimer = setTimeout(() => {
      mapBird.classList.add('visible');
      birdScale();
    }, 200);
    birdHideTimer = setTimeout(hideBird, durationMs - 200);
  }
}
