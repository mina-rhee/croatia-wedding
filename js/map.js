// ── Guest Accommodation Data ──
// Edit this array to add/remove markers on the map.
const accommodations = [
  {
    name: 'Villa Dubrovnik',
    guests: 'Sarah & Tom',
    lat: 42.6394,
    lng: 18.0856,
  },
  {
    name: 'Hotel Excelsior',
    guests: 'James & Priya',
    lat: 42.6401,
    lng: 18.1145,
  },
  {
    name: 'Old Town Apartment',
    guests: 'Luca & Maria',
    lat: 42.6411,
    lng: 18.1083,
  },
  {
    name: 'Sun Gardens Resort',
    guests: 'Alex & Jordan',
    lat: 42.6650,
    lng: 18.0560,
  },
  {
    name: 'Wedding Venue',
    guests: '',
    lat: 42.6350,
    lng: 18.1050,
  },
];

// ── Map Initialization ──
let map = null;

function initMap() {
  if (map) {
    map.invalidateSize();
    return;
  }

  map = L.map('map-container').setView([42.6480, 18.0900], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const venueIcon = L.divIcon({
    className: 'marker-venue',
    html: '<div style="background:#c0392b;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const guestIcon = L.divIcon({
    className: 'marker-guest',
    html: '<div style="background:#4a7c6f;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  accommodations.forEach(place => {
    const isVenue = place.name === 'Wedding Venue';
    const icon = isVenue ? venueIcon : guestIcon;
    const popup = isVenue
      ? `<strong>${place.name}</strong>`
      : `<strong>${place.name}</strong><br>${place.guests}`;

    L.marker([place.lat, place.lng], { icon })
      .addTo(map)
      .bindPopup(popup);
  });
}
