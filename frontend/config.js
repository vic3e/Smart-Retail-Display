// frontend/config.js

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base URL for the zuke-admin-dashboard Node.js backend (handles pairing and playlist)
export const DASHBOARD_API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://app.zuke.co.za';
export const PAIRING_API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://app.zuke.co.za';

// Base URL for the Smart-Retail-Display Python backend (handles /api/media configuration)
export const MEDIA_API_BASE_URL = isLocal ? 'http://localhost:3002' : window.location.origin;
