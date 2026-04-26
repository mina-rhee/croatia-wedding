// ── Event Location Data ──
const locations = [
  { name: 'Lambik Bar & Bistro', lat: 43.0587, lng: 16.1991, day: 'mon' },
  { name: 'Fort George',         lat: 43.0739, lng: 16.1967, day: 'tue' },
  { name: 'Marshal Club Hotel',  lat: 43.0608, lng: 16.1850, day: 'wed' },
  { name: 'Stiniva Beach',       lat: 43.0214, lng: 16.1716, day: 'wed' },
  { name: 'Padel Centar Split',  lat: 43.5120, lng: 16.4920, day: 'thu' },
  { name: "Diocletian's Palace", lat: 43.5085, lng: 16.4402, day: 'thu' },
];

// ── Marker Icon Factories ──
function makeIcon(size, color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${color};
      border-radius:50%;
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.25);
      transition: all 0.3s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ACTIVE_ICON  = () => makeIcon(16, '#c0392b');
const INACTIVE_ICON = () => makeIcon(9, '#8a8a8a');

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

  return { marker, day: loc.day, lat: loc.lat, lng: loc.lng, name: loc.name };
});

// ── Set initial view so Leaflet doesn't error ──
const monLocs = locations.filter(l => l.day === 'mon');
const initBounds = L.latLngBounds(monLocs.map(l => [l.lat, l.lng]));
map.fitBounds(initBounds, { padding: [50, 50], maxZoom: 15 });

// ── Highlight + Fly To Active Day ──
let currentDay = 'mon';

// Set initial marker states
markers.forEach(m => {
  const isActive = m.day === 'mon';
  m.marker.setIcon(isActive ? ACTIVE_ICON() : INACTIVE_ICON());
  m.marker.setZIndexOffset(isActive ? 1000 : 0);
});

function highlightDay(dayId) {
  if (dayId === currentDay) return;
  currentDay = dayId;

  // Update marker icons
  markers.forEach(m => {
    const isActive = m.day === dayId;
    m.marker.setIcon(isActive ? ACTIVE_ICON() : INACTIVE_ICON());
    m.marker.setZIndexOffset(isActive ? 1000 : 0);
  });

  // Fly to the active day's bounds
  const dayMarkers = markers.filter(m => m.day === dayId);
  const bounds = L.latLngBounds(dayMarkers.map(m => [m.lat, m.lng]));

  map.flyToBounds(bounds, {
    padding: [50, 50],
    maxZoom: 15,
    duration: 1.2,
  });
}
