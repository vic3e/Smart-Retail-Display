// frontend/config.js

// Set to true only if you are running a local zuke-admin-dashboard on localhost:3000.
// Otherwise, keep as false to use the production dashboard https://app.zuke.co.za
const isLocal = false;

// Base URL for the zuke-admin-dashboard Node.js backend (handles pairing and playlist)
export const DASHBOARD_API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://app.zuke.co.za';
export const PAIRING_API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://app.zuke.co.za';

// Base URL for the Smart-Retail-Display Python backend (handles /api/media configuration)
export const MEDIA_API_BASE_URL = isLocal ? 'http://localhost:3002' : window.location.origin;
