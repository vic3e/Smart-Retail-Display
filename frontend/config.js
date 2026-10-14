// frontend/config.js

const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const forceLocal = query ? query.get('local') === 'true' : false;

// Base URL for the zuke-admin-dashboard Node.js backend (handles pairing, export, and playlists).
// By default, ALL kiosks and deployments connect to production https://app.zuke.co.za.
// Pass ?local=true or ?dashboard=http://localhost:3000 only when developing against a local dashboard server.
export const DASHBOARD_API_BASE_URL = query?.get('dashboard') || (forceLocal ? 'http://localhost:3000' : 'https://app.zuke.co.za');
export const PAIRING_API_BASE_URL = DASHBOARD_API_BASE_URL;

// Base URL for the Smart-Retail-Display Python backend (running on http://127.0.0.1:8000 on the Pi)
export const MEDIA_API_BASE_URL = query?.get('media_api') || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
