# Lumen API & Data Contract Documentation

## 1. API Overview

The Lumen API is responsible for serving validated digital signage campaigns, scheduling parameters, and entertainment configuration to the display engine. The display engine consumes this data to render advertisement media (images and videos) alongside interactive Paystack payment QR codes and scheduled YouTube entertainment intervals.

### Relationship Between Spark/Zuke Platform and the Display Engine

In the broader architecture, Spark/Zuke serves as the central advertising management and distribution platform. The display engine acts as an edge signage player that continuously queries or subscribes to advertising data, validates the contract, and presents active campaigns to viewers.

```text
Spark/Zuke Platform
        ↓
     API/JSON
        ↓
 Display Engine
        ↓
 Validate media
        ↓
 Check payment/status
        ↓
 Display advertisement
        ↓
 Generate QR from Paystack URL
```

---

## 2. Development Mode

During development and MVP phases, the system operates in development mode using local configuration:
- Media definitions are loaded from `frontend/media.json`.
- The FastAPI backend serves these validated definitions at `GET /api/media`.
- `frontend/config.js` holds the development base URLs: `MEDIA_API_BASE_URL` points at the FastAPI backend (commonly `http://localhost:3002`), while `PAIRING_API_BASE_URL` / `DASHBOARD_API_BASE_URL` point at the Node.js dashboard (commonly `http://localhost:3000`).
- If the backend is unavailable or running as a static web server, the display engine automatically falls back to fetching `media.json` directly.

### Sample Development JSON

```json
{
  "media": [
    {
      "id": "media_001",
      "business_id": "business_001",
      "business_name": "GrowthPilot",
      "type": "product",
      "name": "Search Engine Optimization",
      "media_type": "image",
      "media_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=85",
      "paystack_url": "https://paystack.com/buy/search-engine-optimization-seo-vhraqr",
      "payment_status": "paid",
      "play_count": 2,
      "status": "active",
      "orientation": "landscape"
    },
    {
      "id": "media_002",
      "business_id": "business_002",
      "business_name": "RankNow Agency",
      "type": "product",
      "name": "SEO Starter Pack",
      "media_type": "image",
      "media_url": "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1920&q=85",
      "paystack_url": "https://paystack.com/buy/search-engine-optimization-seo-vhraqr",
      "payment_status": "paid",
      "play_count": 1,
      "status": "active",
      "orientation": "portrait"
    },
    {
      "id": "media_003",
      "business_id": "business_003",
      "business_name": "SearchFirst",
      "type": "product",
      "name": "Keyword Mastery",
      "media_type": "video",
      "media_url": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      "paystack_url": "https://paystack.com/buy/search-engine-optimization-seo-vhraqr",
      "payment_status": "paid",
      "play_count": 1,
      "status": "active",
      "orientation": "square"
    },
    {
      "id": "media_004",
      "business_id": "business_004",
      "business_name": "Traffic Lab",
      "type": "product",
      "name": "Local SEO Boost",
      "media_type": "image",
      "media_url": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1920&q=85",
      "paystack_url": "https://paystack.com/buy/search-engine-optimization-seo-vhraqr",
      "payment_status": "paid",
      "play_count": 1,
      "status": "active"
    }
  ],
  "youtube_playlist_id": "PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
  "ad_duration_seconds": 30,
  "youtube_duration_minutes": 10
}
```
---

## 3. Expected Media Data Structure

The media configuration is structured as a root JSON object containing a `media` list and global scheduling settings.

### Media Item Field Specification

| Field | Type | Requirement | Purpose | Example |
| --- | --- | --- | --- | --- |
| `id` | `string` | **Required** | Unique identifier for the media record | `"media_001"` |
| `business_id` | `string` | **Required** | Identifier of the merchant / business | `"business_001"` |
| `business_name` | `string` | **Required** | Display name of the business shown on caption/header | `"GrowthPilot"` |
| `business_logo` | `string` | **Optional** | Absolute URL to the business logo rendered in the brand bar | `"https://cdn.example.com/logo.png"` |
| `type` | `string` | **Required** | Content category classification | `"product"` |
| `name` | `string` | **Required** | Name of advertised item / campaign title | `"Search Engine Optimization"` |
| `media_type` | `string` | **Required** | Type of media asset (`"image"` or `"video"`) | `"image"` |
| `media_url` | `string` | **Required** | Absolute HTTP(S) URL to the asset | `"https://cdn.example.com/ad.jpg"` |
| `paystack_url` | `string` | **Required** | Paystack payment URL encoded into the on-screen QR code | `"https://paystack.com/pay/item-1"` |
| `payment_status` | `string` | **Required** | Status of ad payment; must be `"paid"` to display | `"paid"` |
| `play_count` | `integer` | **Required** | Frequency weighting multiplier (positive integer >= 1) | `2` |
| `status` | `string` | **Required** | Lifecycle status; must be `"active"` to display | `"active"` |
| `orientation` | `string` | **Optional** | Target visual orientation (`"landscape"`, `"portrait"`, `"square"`) | `"landscape"` |
| `category` | `string` | **Optional** | Content industry or category tag | `"beauty"` |
| `time` | `string` | **Optional** | Target time slot: `"morning"`, `"afternoon"`, `"evening"`, or `"all"` | `"morning"` |

### Root Configuration Fields

| Field | Type | Requirement | Default | Purpose |
| --- | --- | --- | --- | --- |
| `schedule` | `object` | Optional | Morning: 05:00-11:30, Afternoon: 11:30-18:00, Evening: 18:00-22:00 | Time window boundaries for ad slot matching (`morning`, `afternoon`, `evening`) |
| `youtube_playlist_id` | `string` | Optional | `""` | YouTube playlist/video ID for the entertainment intermission |
| `ad_duration_seconds` | `integer` | Optional | `30` | Duration (in seconds) to show each individual ad slot (1–300s) |
| `youtube_duration_minutes` | `integer` | Optional | `10` | Duration (in minutes) to run the YouTube intermission (1–120m) |
| `youtube_mode` | `string` | Optional | `"both"` | Mode: `"api"` (YouTube Data API), `"normal"` (standard IFrame playlist embed), or `"both"` (API with embed fallback) |
| `youtube_api_key` | `string` | Optional | `""` | Optional Google / YouTube Data API v3 key |
| `youtube_morning_playlists` | `array<string>` | Optional | `[]` | YouTube playlist IDs used during the `morning` schedule slot |
| `youtube_afternoon_playlists` | `array<string>` | Optional | `[]` | YouTube playlist IDs used during the `afternoon` schedule slot |
| `youtube_evening_playlists` | `array<string>` | Optional | `[]` | YouTube playlist IDs used during the `evening` schedule slot |
| `youtube_fallback_playlist_ids` | `array<string>` | Optional | `[]` | Fallback playlist pool used when the primary playback mode or playlist cannot resolve |
| `youtube_shuffle` | `boolean` | Optional | `false` | Shuffle the active YouTube queue ordering |

---

## 4. Orientation

The `orientation` property communicates the intended aspect ratio and presentation style of an advertisement asset.

### Allowed Values
- `"landscape"`: Standard horizontal aspect ratio (e.g. 16:9 or 4:3). Rendered as full coverage on standard displays.
- `"portrait"`: Vertical aspect ratio (e.g. 9:16). Rendered with contained aspect ratio preservation to avoid cropping key content.
- `"square"`: 1:1 aspect ratio. Rendered with contained fit to prevent cropping.

### Optional Field & Backward Compatibility
- **`orientation` is OPTIONAL.**
- Any existing media objects omitting `orientation` remain valid and will use default aspect ratio detection (`ratio < 1.6` detection for images).
- If an invalid value is supplied (e.g., `"diagonal"` or a non-string type), the item is rejected during validation without crashing the application or disrupting other advertisements.

---

## 5. Advertisement Processing Flow

The display engine follows a 12-step processing pipeline:

1. **Receive / Load Data**: Ingest configuration from `GET /api/media` (or `media.json` / Zuke subscription).
2. **Validate JSON**: Verify root object structure and fallback to default scheduling if malformed.
3. **Validate Advertisement Fields**: Verify non-empty strings for required identifiers, valid HTTP(S) URLs, and valid `media_type`.
4. **Check Status**: Ensure `status === "active"`.
5. **Check Payment Status**: Ensure `payment_status === "paid"`.
6. **Ignore Invalid / Unpaid / Inactive Advertisements**: Filter out non-compliant items without halting playback.
7. **Load Media**: Preload the active image or initialize video stream.
8. **Read Paystack URL**: Extract `paystack_url` for the active advert.
9. **Generate QR Code**: Dynamically generate QR code encoding the exact payment link.
10. **Overlay QR Code**: Render QR code and product caption over the display stage.
11. **Play Advertisement**: Show media for `ad_duration_seconds` (up to a 5-minute total advertising cycle cap).
12. **Continue Through Advertising Cycle**: Advance through the playlist slots; upon completion, switch to YouTube entertainment for `youtube_duration_minutes`, then reload and repeat.

---

## 6. API Request

### Endpoint Overview

The full API surface spans three backends (see Sections 12 and 13 for the pairing and webhook payloads):

| Endpoint | Backend | Purpose |
| --- | --- | --- |
| `GET /api/media` | FastAPI (`MEDIA_API_BASE_URL`) | Validated media + entertainment configuration |
| `POST /api/paystack/webhook` | FastAPI | Paystack charge-success webhook → unlock product |
| `POST /api/screens/initiate-pairing` | Node.js dashboard (`DASHBOARD_API_BASE_URL`) | Generate a pairing code (authenticated) |
| `POST /api/screens/complete-pairing` | Node.js dashboard (`PAIRING_API_BASE_URL`) | Link a display `deviceId` to a code |
| `GET /api/screens?businessId=...` | Node.js dashboard | List screens for a business (authenticated) |
| `GET /api/screens/:deviceId/playlist` | Node.js dashboard | Screen-scoped ad playlist |
| `GET /api/display-ads/export` | app.zuke.co.za | Versioned published content (live Zuke source) |

### Local Development Request (Media Configuration)
```http
GET /api/media HTTP/1.1
Host: 127.0.0.1:8000
Accept: application/json
```
*In development the display is configured via `frontend/config.js`: `MEDIA_API_BASE_URL` points at the FastAPI backend (commonly `http://localhost:3002`) and `PAIRING_API_BASE_URL` / `DASHBOARD_API_BASE_URL` point at the Node.js dashboard (commonly `http://localhost:3000`).*

### Live Zuke Request
```http
GET https://app.zuke.co.za/api/display-ads/export HTTP/1.1
Accept: application/json
If-None-Match: "rev-<revision>"
```
*The endpoint returns HTTP `304` when the content revision has not changed since the last poll (see Section 11).*

---

## 7. Example Request

### Conceptual Request
```bash
curl -X GET "https://<API_HOST_TBD>/<API_ENDPOINT_TBD>" \
     -H "Accept: application/json"
```

*Note: Any additional query parameters, pagination, or filtering flags are TBD.*

---

## 8. Example Response

```json
{
  "media": [
    {
      "id": "media_001",
      "business_id": "business_001",
      "business_name": "Amanda Cosmetics",
      "business_logo": "https://cdn.example.com/logo.png",
      "type": "product",
      "category": "beauty",
      "name": "Premium Lipstick Collection",
      "media_type": "image",
      "media_url": "https://cdn.example.com/lipstick.jpg",
      "paystack_url": "https://paystack.com/pay/lipstick-001",
      "payment_status": "paid",
      "play_count": 2,
      "status": "active",
      "orientation": "landscape",
      "time": "all"
    }
  ],
  "youtube_playlist_id": "PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
  "ad_duration_seconds": 30,
  "youtube_duration_minutes": 10,
  "youtube_mode": "both",
  "youtube_api_key": "",
  "youtube_morning_playlists": ["PL5KIAukFInzsB_EfwC1Zi5Mg7y7PlDTFT"],
  "youtube_afternoon_playlists": ["PLyyJqitdpWMW82LEngVg_njqZH4ptctAO"],
  "youtube_evening_playlists": ["PLY7v70bGVb3n_-GvTwTXkRiDy-Pj4wHTs"],
  "schedule": {
    "morning": { "start": "05:00", "end": "11:30" },
    "afternoon": { "start": "11:30", "end": "18:00" },
    "evening": { "start": "18:00", "end": "22:00" }
  }
}
```

---

## 9. Error Handling

The display engine is resilient against data corruption, network errors, and invalid campaigns:

- **Invalid JSON**: Falls back to an empty media array with default durations (`ad_duration_seconds: 30`, `youtube_duration_minutes: 10`).
- **Missing Required Fields**: Any media record missing `id`, `business_id`, `business_name`, `name`, `media_url`, etc., is ignored.
- **Invalid Orientation**: Items with unsupported `orientation` values (e.g. `"diagonal"`) are ignored while valid items continue playing.
- **Missing / Invalid Media or Paystack URLs**: Checked with URL parser; invalid URLs cause the item to be omitted.
- **Unpaid / Inactive Advertisements**: Silently filtered out.
- **Empty Media Array**: If no active, paid adverts are available, the display engine immediately switches to YouTube entertainment or displays the fallback state without crashing.
- **API Unavailable / Network Failure**: The frontend catches fetch errors, attempts fallback to static `media.json`, and retries on subsequent cycles.
- **Broken Media (404/decode error)**: An `onerror` handler advances immediately to the next advert in the sequence.

---

## 10. Authentication

The API surface is split across three backends with different trust models:

- **Media configuration (`GET /api/media`)** — Public. The display fetches media without credentials; access is intended to be network-isolated.
- **Node.js dashboard screens API (`/api/screens/...`)** — Dashboard endpoints (`initiate-pairing`, list) require an authenticated dashboard session (Auth0 JWT, verified via JWKS). Display-side endpoints (`complete-pairing`, `:deviceId/playlist`) are **public**; the display's generated `deviceId` (persisted in `localStorage` under `smart-retail-display-deviceId`) is the de-facto device credential.
- **Paystack webhook (`POST /api/paystack/webhook`)** — Authenticated by an HMAC-SHA512 signature in the `x-paystack-signature` header, computed over the raw request body with the `PAYSTACK_SECRET_KEY` environment variable.

Requirements still to be confirmed with the Spark/Zuke backend team:
- Token refresh lifecycle and rate limits for the Zuke export endpoint
- Whether screens should authenticate per-device (e.g. key rotation) beyond the current `deviceId`

---

## 11. Zuke/Spark Integration (Live)

The application ships with a modular transport seam (`subscription-adapter.js`) and currently uses the HTTP polling adapter against Zuke's versioned export endpoint — this is the **live** production source for published content, not a future goal:

- **Endpoint**: `https://app.zuke.co.za/api/display-ads/export` (override with the `?zuke=<url>` query parameter or `window.ZUKE_EXPORT_URL`).
- **Polling**: Every `POLL_INTERVAL_MS` (30 s) with `If-None-Match: "rev-<revision>"`; HTTP `304` means unchanged and no re-render occurs.
- **Revisioning**: The payload carries a numeric `revision` idempotency key (and `published_at`). Listeners ignore payloads whose `revision` is not greater than the last one applied — safe for at-least-once delivery.
- **Contract**: The export returns the same root `{ media, youtube_playlist_id, ad_duration_seconds, youtube_duration_minutes, ... }` structure described in Section 3.
- **Transport swap without UI changes**: A future RabbitMQ adapter implementing the same `subscribe / start / stop / getCurrent` interface can be dropped in (via the global `SMART_RETAIL_ADAPTER = "rabbitmq"`, e.g. `window.LUMEN_ADAPTER`); `app.js` renders uniformly from the data contract.
---

## 12. Screen Pairing & Management API

Pairing is coordinated by the Node.js dashboard backend (`DASHBOARD_API_BASE_URL` / `PAIRING_API_BASE_URL`, commonly `http://localhost:3000`). A screen record is stored in the `screens` collection with a `status` of `PENDING` or `ACTIVE`, a pairing code, and a 10-minute expiry.

### Pairing Flow

1. **Dashboard generates a code** — `POST /api/screens/initiate-pairing` with `{ "businessId": "<objectId>" }` (authenticated). Creates a `PENDING` screen row and returns a 6-digit code:
   ```json
   { "success": true, "pairingCode": "123456" }
   ```
2. **Display enters the code** — the kiosk pairs itself via `POST /api/screens/complete-pairing`:
   ```json
   { "pairingCode": "123456", "deviceId": "device-1730000000000-ab12cd" }
   ```
   On success the row flips to `ACTIVE`, is assigned `deviceId` / `pairedAt`, and the pairing code is cleared.

### Endpoints

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/screens/initiate-pairing` | Auth0 JWT | `{ "businessId": "..." }` | `{ "success": true, "pairingCode": "123456" }` |
| `POST` | `/api/screens/complete-pairing` | None | `{ "pairingCode": "123456", "deviceId": "device-..." }` | `{ "success": true, "message": "...", "screen": {...} }` |
| `GET` | `/api/screens?businessId=<id>` | Auth0 JWT | — | `{ "success": true, "screens": [...] }` (newest first) |
| `GET` | `/api/screens/:deviceId/playlist` | None | — | `{ "success": true, "playlist": [<mediaUrl>, ...] }` |

### Display Behaviour

- The kiosk generates a `deviceId` on first launch (`device-<timestamp>-<random>`), persists it in `localStorage` under `smart-retail-display-deviceId`, and shows the pairing view until a successful `complete-pairing`.
- Once paired, the display hides the pairing view and resumes the normal ad/YouTube cycle.
- The dashboard's **Manage Screens** page polls `GET /api/screens?businessId=...` (every 15 s) so a newly connected screen appears automatically.

---

## 13. Paystack Webhook

After a successful payment, Paystack delivers a webhook to the FastAPI backend:

- **Endpoint**: `POST /api/paystack/webhook`
- **Signature**: HMAC-SHA512 over the raw request body using `PAYSTACK_SECRET_KEY`, sent in the `x-paystack-signature` header. Requests without a valid signature are rejected with `401`.
- **Handling**: Only `charge.success` events are processed; the product is resolved from `data.metadata.product_id`, and the shelf service unlocks the matching GPIO pin for `UNLOCK_DURATION_SECONDS`.

### Handler behaviour

| Condition | Response |
| --- | --- |
| Valid signature, `charge.success`, known product | `200 { "received": true, "processed": true, "product_id": "...", "gpio_pin": 17 }` |
| Valid signature, non-`charge.success` event | `200 { "received": true, "processed": false, "reason": "ignored_event" }` |
| Missing `metadata.product_id` | `422` |
| Unknown product | `422` |
| Invalid or missing signature | `401` |
| Malformed JSON | `400` |
