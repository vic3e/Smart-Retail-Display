// frontend/config.js

// Auto-detect local development vs production deployment.
// When running locally on localhost/127.0.0.1, automatically connects to local dashboard on port 3000.
// When deployed on a physical kiosk or production, connects to https://app.zuke.co.za.
const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const forceLocal = query ? query.get('local') === 'true' : false;
const forceProd = query ? query.get('prod') === 'true' : false;

const isLocalHost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const isLocal = !forceProd && (forceLocal || isLocalHost);

// Base URL for the zuke-admin-dashboard Node.js backend (handles pairing, export, and playlists)
export const DASHBOARD_API_BASE_URL = query?.get('dashboard') || (isLocal ? 'http://localhost:3000' : 'https://app.zuke.co.za');
export const PAIRING_API_BASE_URL = DASHBOARD_API_BASE_URL;

// Base URL for the Smart-Retail-Display Python backend (handles /api/media configuration)
export const MEDIA_API_BASE_URL = isLocal ? (query?.get('media_api') || 'http://localhost:3002') : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002');
