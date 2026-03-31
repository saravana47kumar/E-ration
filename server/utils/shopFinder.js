/**
 * shopFinder.js
 * - Haversine distance formula
 * - ETA calculation (20 km/h city speed)
 * - Nearest ration shop via Google Places API (or fallback mock)
 * - Auto-assign nearest distributor
 */
const User = require('../models/User');

const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY || '';

// ── Haversine distance in metres ──────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── ETA minutes at 20 km/h ───────────────────────────────────────
function etaFromDistance(distMetres) {
  return Math.max(1, Math.ceil(distMetres / (20000 / 60)));
}

// ── Find nearest ration shop (Google Places or mock fallback) ─────
async function findNearestShop(lat, lng) {
  // Try Google Places API
  if (GOOGLE_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}&radius=5000&keyword=ration+shop+fair+price+shop&key=${GOOGLE_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data.results?.length) {
        let best = null, bestDist = Infinity;
        for (const place of data.results.slice(0, 10)) {
          const pLat = place.geometry.location.lat;
          const pLng = place.geometry.location.lng;
          const dist = haversine(lat, lng, pLat, pLng);
          if (dist < bestDist) {
            bestDist = dist;
            best = {
              placeId:  place.place_id,
              name:     place.name,
              address:  place.vicinity,
              lat:      pLat,
              lng:      pLng,
              distance: Math.round(dist),
            };
          }
        }
        return best;
      }
    } catch (err) {
      console.warn('Google Places error, using mock shop:', err.message);
    }
  }

  // ── Fallback: mock shop 1 km from customer ───────────────────
  const OFFSET = 0.009; // ~1 km
  return {
    placeId:  'mock_shop_001',
    name:     'Anna Nagar Fair Price Shop',
    address:  'Near Bus Stand, Tamil Nadu',
    lat:      lat + OFFSET,
    lng:      lng + OFFSET,
    distance: Math.round(haversine(lat, lng, lat + OFFSET, lng + OFFSET)),
  };
}

// ── Auto-assign nearest active distributor ────────────────────────
async function autoAssignDistributor(customerLat, customerLng) {
  try {
    const distributors = await User.find({ role: 'distributor', isActive: true });
    if (!distributors.length) return null;

    // If distributors have stored locations, pick closest
    let best = null, bestDist = Infinity;
    for (const d of distributors) {
      if (d.location?.lat && d.location?.lng) {
        const dist = haversine(customerLat, customerLng, d.location.lat, d.location.lng);
        if (dist < bestDist) { bestDist = dist; best = d._id; }
      }
    }
    return best || distributors[0]._id;
  } catch { return null; }
}

module.exports = { findNearestShop, autoAssignDistributor, haversine, etaFromDistance };