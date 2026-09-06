import { DASHBOARD_API_BASE_URL, MEDIA_API_BASE_URL, PAIRING_API_BASE_URL } from './config.js';

"use strict";
  const MAX_AD_CYCLE_MS = 5 * 60_000;
  const DEFAULT_SCHEDULE = {
    morning: { start: "05:00", end: "11:30" },
    afternoon: { start: "11:30", end: "18:00" },
    evening: { start: "18:00", end: "22:00" }
  };
  const DEFAULTS = {
    adDurationMs: 30_000,
    youtubeDurationMs: 10 * 60_000,
    playlistId: "",
    fallbackPlaylists: [],
    shuffle: false,
    youtubeMode: "both",
    apiKey: "",
    morningPlaylists: [],
    afternoonPlaylists: [],
    eveningPlaylists: [],
    youtubePlayNowId: "",
    youtubePlayNextId: "",
    pairedBusinessId: "",
    schedule: DEFAULT_SCHEDULE
  };
  const ZUKE_LOGO = "https://res.cloudinary.com/dekgwsl3c/image/upload/v1765557660/Wide_Logos_v2_Zuke_Logo_Wide_White_shv9wx.webp";

  const elements = {
    mediaStage: document.querySelector("#media-stage"),
    youtubeStage: document.querySelector("#youtube-stage"),
    image: document.querySelector("#image-media"),
    video: document.querySelector("#video-media"),
    empty: document.querySelector("#empty-state"),
    caption: document.querySelector("#caption"),
    business: document.querySelector("#caption-business"),
    name: document.querySelector("#caption-name"),
    ask: document.querySelector("#payment-ask"),
    payment: document.querySelector("#payment-overlay"),
    qrCode: document.querySelector("#qr-code"),
    player: document.querySelector("#youtube-player"),
    progress: document.querySelector("#progress-bar"),
    brandBar: document.querySelector("#brandBar"),
    masterMute: document.querySelector("#master-mute"),
    muteIconOn: document.querySelector("#mute-icon-on"),
    muteIconOff: document.querySelector("#mute-icon-off"),
    splash: document.querySelector("#splash-screen"),
    splashBar: document.querySelector("#splash-progress"),
    entertainmentLabel: document.querySelector(".entertainment-label"),
    // New elements for pairing view
    pairingView: document.querySelector('#pairing-view'),
    pairingCodeInput: document.querySelector('#pairing-code-input'),
    pairButton: document.querySelector('#pair-button'),
    errorMessage: document.querySelector('#error-message'),
  };
  let timeoutId, playlist = [], rawMediaList = [], index = 0, lastPlayedAdId = null, config = { ...DEFAULTS };
  let labelTimeoutId = null;
  let store = { content: null, hasZuke: false };
  let ytPlayer = null, ytReady = false, masterMuted = localStorage.getItem("masterMuted") === "true";
  const ytVideoQueues = {};
  let deviceId = null; // Only deviceId state is needed for pairing
  let isPlayingOverride = false;
  let firstPlay = true;

  function handleLabelAnimation() {
    if (!elements.entertainmentLabel) return;
    
    // Clear any pending animation timeouts
    clearTimeout(labelTimeoutId);
    
    // Initial expansion
    setTimeout(() => {
      elements.entertainmentLabel.classList.add("expanded");
      
      // Collapse after 5 seconds
      labelTimeoutId = setTimeout(() => {
        elements.entertainmentLabel.classList.remove("expanded");
      }, 5000);
    }, 1000);
  }

  // Persistence: Store current video ID and time to local storage
  function saveYTState() {
    if (!ytPlayer || !ytReady || typeof ytPlayer.getVideoData !== "function") return;
    const data = ytPlayer.getVideoData();
    const time = ytPlayer.getCurrentTime();
    if (data && data.video_id) {
      localStorage.setItem("yt_last_video_id", data.video_id);
      localStorage.setItem("yt_last_time", time);
      localStorage.setItem("yt_last_save_ts", Date.now().toString());
    }
  }

  // Restore state: Load from local storage
  function getYTState() {
    return {
      videoId: localStorage.getItem("yt_last_video_id"),
      time: parseFloat(localStorage.getItem("yt_last_time") || "0")
    };
  }

  // Auto-save progress every 5 seconds
  setInterval(saveYTState, 5000);

  function updateMuteUI() {
    if (masterMuted) {
      elements.muteIconOn.classList.remove("hidden");
      elements.muteIconOff.classList.add("hidden");
    } else {
      elements.muteIconOn.classList.add("hidden");
      elements.muteIconOff.classList.remove("hidden");
    }
  }
  updateMuteUI();

  elements.masterMute.addEventListener("click", () => {
    masterMuted = !masterMuted;
    localStorage.setItem("masterMuted", masterMuted);
    updateMuteUI();
    // Immediate apply
    if (ytPlayer && typeof ytPlayer.mute === "function") {
      if (masterMuted) ytPlayer.mute();
      else if (!elements.youtubeStage.classList.contains("mini") || (playlist[index] && playlist[index].media_type === "image")) {
        ytPlayer.unMute();
      }
    }
    if (elements.video) {
      if (masterMuted) elements.video.muted = true;
      else if (!elements.video.classList.contains("hidden")) elements.video.muted = false;
    }
  });

  // ── Pairing / first-run device registration ────────────────────────────────
  function hideAllContentViews() {
    // Only hide the pairing view. The main content elements (media-stage, brandBar, etc.)
    // are managed by showAd/startEntertainment directly.
    if (elements.pairingView) elements.pairingView.classList.add("hidden");
  }

  function showPairingView() {
    // Hide all main content elements before showing pairing view
    elements.mediaStage.classList.add("hidden");
    elements.youtubeStage.classList.add("hidden");
    elements.brandBar.classList.add("hidden");
    elements.caption.classList.add("hidden");
    elements.payment.classList.add("hidden");
    elements.masterMute.classList.add("hidden");
    if (elements.entertainmentLabel) elements.entertainmentLabel.classList.add("hidden");
    if (elements.pairingView) elements.pairingView.classList.remove("hidden");
    document.body.classList.remove("sidebar-layout");
  }

  function activateContentCycle() {
    if (elements.pairingView) elements.pairingView.classList.add("hidden");
    elements.mediaStage.classList.remove("hidden");
    elements.brandBar.classList.remove("hidden");
    elements.masterMute.classList.remove("hidden");
    startCycle();
  }

  const generateDeviceId = () => {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handlePairing = async () => {
    if (!elements.pairingCodeInput || !elements.errorMessage || !elements.pairButton) return;
    const pairingCode = elements.pairingCodeInput.value.replace(/-/g, '').trim();
    if (pairingCode.length !== 6) {
      elements.errorMessage.textContent = 'Please enter a valid 6-digit code.';
      return;
    }

    elements.pairButton.disabled = true;
    elements.pairButton.textContent = 'Connecting...';
    elements.errorMessage.textContent = '';

    try {
      const response = await fetch(`${PAIRING_API_BASE_URL}/api/screens/complete-pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode, deviceId })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('smart-retail-display-deviceId', deviceId);
        if (result.screen && result.screen.businessId) {
          localStorage.setItem('smart-retail-display-businessId', result.screen.businessId);
        }
        activateContentCycle();
      } else {
        throw new Error(result.error || 'Pairing failed. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Pairing error:', error);
      elements.errorMessage.textContent = error.message || 'Pairing failed. Please check the code and try again.';
      elements.pairButton.disabled = false;
      elements.pairButton.textContent = 'Connect';
    }
  };

  const ALLOWED_ORIENTATIONS = ["landscape", "portrait", "square"];
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const decodeEntities = (v) => { const d = document.createElement("div"); d.innerHTML = String(v == null ? "" : v); return d.textContent; };
  const validUrl = (value) => { try { new URL(value); return true; } catch (e) { return false; } };
  const usable = (ad) => ad && ad.status === "active" && ad.payment_status === "paid" && ["image", "video"].includes(ad.media_type) && ["id", "business_id", "business_name", "name"].every((k) => typeof ad[k] === "string" && ad[k].trim()) && validUrl(ad.media_url) && validUrl(ad.paystack_url) && Number.isInteger(ad.play_count) && ad.play_count > 0 && (ad.orientation == null || ALLOWED_ORIENTATIONS.includes(ad.orientation));
  const positive = (value, fallback, maximum) => Number.isFinite(value) && value > 0 && value <= maximum ? value : fallback;

  function validateSchedule(rawSchedule) {
    if (!rawSchedule || typeof rawSchedule !== "object" || Array.isArray(rawSchedule)) return DEFAULT_SCHEDULE;
    const result = {};
    for (const [key, val] of Object.entries(rawSchedule)) {
      if (typeof key === "string" && key.trim() && val && typeof val === "object" && typeof val.start === "string" && typeof val.end === "string") {
        result[key.trim()] = { start: val.start.trim(), end: val.end.trim() };
      }
    }
    return Object.keys(result).length ? result : DEFAULT_SCHEDULE;
  }

  function getCurrentTimeSlot(schedule) {
    if (!schedule || typeof schedule !== "object") return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Debug: Log the current time being used for slot calculation
    console.log(`[TimeCheck] Current local time: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} (${currentMins} mins)`);

    for (const [slotName, range] of Object.entries(schedule)) {
      if (!range || typeof range.start !== "string" || typeof range.end !== "string") continue;
      const [sH, sM] = range.start.split(":").map(Number);
      const [eH, eM] = range.end.split(":").map(Number);
      if (Number.isNaN(sH) || Number.isNaN(sM) || Number.isNaN(eH) || Number.isNaN(eM)) continue;

      const startTotal = sH * 60 + sM;
      const endTotal = eH * 60 + eM;

      if (startTotal <= endTotal) {
        if (currentMins >= startTotal && currentMins < endTotal) {
          return slotName.toLowerCase();
        }
      } else {
        // Overnight wrap-around slot (e.g. 22:00 to 04:00)
        if (currentMins >= startTotal || currentMins < endTotal) {
          return slotName.toLowerCase();
        }
      }
    }
    return null;
  }

  function getEligibleMedia(mediaList, schedule) {
    const usableAds = (Array.isArray(mediaList) ? mediaList : []).filter(usable);
    if (!usableAds.length) return [];

    const currentSlot = getCurrentTimeSlot(schedule);
    if (!currentSlot) return usableAds;

    const slotMatched = usableAds.filter((ad) => {
      if (!ad.time || typeof ad.time !== "string" || !ad.time.trim()) return true;
      const t = ad.time.trim().toLowerCase();
      return t === "all" || t === currentSlot;
    });

    return slotMatched.length ? slotMatched : usableAds;
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function buildCyclePlaylist(mediaList, cfg, maxAdCycleMs) {
    const allUsable = (Array.isArray(mediaList) ? mediaList : []).filter(usable);
    if (!allUsable.length) return [];

    const maxSlots = Math.max(1, Math.floor(maxAdCycleMs / cfg.adDurationMs));

    // Play Now / Play Next overrides bypass the time-slot filter — they are
    // explicit user actions and should play regardless of the current slot.
    const playNow = allUsable.filter((a) => a.play_now);
    const playNext = allUsable.filter((a) => a.play_next && !a.play_now);

    // Normal loop pool (time-slot filtered), shuffled with de-dupe vs last ad.
    const normalPool = getEligibleMedia(allUsable, cfg.schedule)
      .filter((a) => !a.play_now && !a.play_next)
      .flatMap((ad) =>
        Array.from({ length: Math.min(ad.play_count || 1, maxSlots) }, () => ad)
      );

    const pool = shuffleArray(normalPool);

    const uniqueAdIds = new Set(pool.map((a) => a.id));
    if (uniqueAdIds.size > 1 && lastPlayedAdId && pool[0] && pool[0].id === lastPlayedAdId) {
      const swapIdx = pool.findIndex((a) => a.id !== lastPlayedAdId);
      if (swapIdx > 0) {
        const temp = pool[0];
        pool[0] = pool[swapIdx];
        pool[swapIdx] = temp;
      }
    }

    // Order: Play Now → first ad of the normal loop → Play Next → rest of loop.
    // Play Next therefore lands immediately after whatever is playing next.
    const ordered = [...playNow, ...pool.slice(0, 1), ...playNext, ...pool.slice(1)];
    return ordered.slice(0, maxSlots);
  }

  // ── Override acknowledgement (Play Now / Play Next) ─────────────────────
  // The display tells the dashboard "this override actually played", so it is
  // cleared and not re-queued on the next poll.
  function dashboardApiBase() {
    const zukeUrl = queryParams.get("zuke") || window.ZUKE_EXPORT_URL;
    if (zukeUrl) {
      try { return new URL(zukeUrl).origin; } catch (e) { /* ignore */ }
    }
    return window.DASHBOARD_API_BASE_URL || PAIRING_API_BASE_URL;
  }
  function acknowledgePlayedAd(ad) {
    if (!ad || !ad.id) return;
    fetch(dashboardApiBase() + "/api/display-ads/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adId: ad.id })
    }).catch(() => { /* Override simply re-queues if ack fails. */ });
  }
  function acknowledgePlaylistOverride(playlistId) {
    if (!playlistId) return;
    fetch(dashboardApiBase() + "/api/display-ads/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId })
    }).catch(() => { /* Override simply re-queues if ack fails. */ });
  }

  function parse(payload) {
    const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
    const validModes = ["api", "normal", "both"];
    const modeFromPayload = typeof data.youtube_mode === "string" ? data.youtube_mode.toLowerCase() : "";
    const resolvedMode = validModes.includes(modeFromPayload) ? modeFromPayload : (window.YOUTUBE_MODE || "both");
    const apiKeyFromPayload = typeof data.youtube_api_key === "string" ? data.youtube_api_key.trim() : "";
    if (apiKeyFromPayload) window.YOUTUBE_API_KEY = apiKeyFromPayload;

    // Use current playlists as defaults if payload is missing them (protection against partial Zuke payloads)
    const morning = Array.isArray(data.youtube_morning_playlists) && data.youtube_morning_playlists.filter(Boolean).length 
      ? data.youtube_morning_playlists.filter(Boolean) 
      : config.morningPlaylists;
    
    const afternoon = Array.isArray(data.youtube_afternoon_playlists) && data.youtube_afternoon_playlists.filter(Boolean).length 
      ? data.youtube_afternoon_playlists.filter(Boolean) 
      : config.afternoonPlaylists;
    
    const evening = Array.isArray(data.youtube_evening_playlists) && data.youtube_evening_playlists.filter(Boolean).length 
      ? data.youtube_evening_playlists.filter(Boolean) 
      : config.eveningPlaylists;

    config = {
      adDurationMs: positive(data.ad_duration_seconds, 30, 300) * 1000,
      youtubeDurationMs: positive(data.youtube_duration_minutes, 10, 120) * 60_000,
      playlistId: typeof data.youtube_playlist_id === "string" ? data.youtube_playlist_id.trim() : (config.playlistId || ""),
      fallbackPlaylists: Array.isArray(data.youtube_fallback_playlist_ids) ? data.youtube_fallback_playlist_ids.filter(Boolean) : (config.fallbackPlaylists || []),
      shuffle: !!data.youtube_shuffle,
      youtubeMode: resolvedMode,
      apiKey: apiKeyFromPayload || window.YOUTUBE_API_KEY || "",
      morningPlaylists: morning,
      afternoonPlaylists: afternoon,
      eveningPlaylists: evening,
      youtubePlayNowId: typeof data.youtube_play_now === "string" ? data.youtube_play_now.trim() : (config.youtubePlayNowId || ""),
      youtubePlayNextId: typeof data.youtube_play_next === "string" ? data.youtube_play_next.trim() : (config.youtubePlayNextId || ""),
      pairedBusinessId: typeof data.display_business_id === "string" ? data.display_business_id.trim() : (config.pairedBusinessId || ""),
      schedule: validateSchedule(data.schedule)
    };
    rawMediaList = Array.isArray(data.media) ? data.media : [];
    playlist = buildCyclePlaylist(rawMediaList, config, MAX_AD_CYCLE_MS);
  }


  // ── Brand bar: Zuke logo × active ad's business logo (or name) ─────────
  function renderBrand(ad) {
    const bizName = (ad && ad.business_name) || "";
    const bizLogo = (ad && ad.business_logo) || "";
    let html = '<img class="brand-zuke" src="' + ZUKE_LOGO + '" alt="Zuke" />';
    if (bizLogo) html += '<span class="brand-sep">×</span><img class="brand-biz" src="' + esc(bizLogo) + '" alt="' + esc(bizName) + '" />';
    else if (bizName) html += '<span class="brand-sep">×</span><span class="brand-name">' + esc(bizName) + '</span>';
    elements.brandBar.innerHTML = html;
  }

  let baseConfigLoaded = false;
  async function loadMedia() {
    if (store.hasZuke && store.content && baseConfigLoaded) {
      parse(store.content);
      return;
    }
    try {
      let resp = await fetch(`${MEDIA_API_BASE_URL}/api/media`, { cache: "no-store" });
      if (!resp.ok) resp = await fetch("/api/media", { cache: "no-store" });
      if (!resp.ok) resp = await fetch("media.json", { cache: "no-store" });
      if (!resp.ok) throw new Error("Media request failed (" + resp.status + ")");
      const data = await resp.json();
      parse(data);
      baseConfigLoaded = true;
      // If Zuke content was already received, re-apply it over the base we just loaded
      if (store.hasZuke && store.content) {
        parse(store.content);
      }
    } catch (e) {
      console.error("Unable to load media", e);
      if (!baseConfigLoaded) parse({ media: [] });
    }
  }

  // Called by the subscription adapter whenever a NEWER revision arrives.
  function onZukeContent(content) {
    if (!content) return;
    store.hasZuke = true;
    store.content = content;
    parse(content);

    // If we are currently playing a YouTube override, do NOT restart the cycle.
    // This prevents the next poll (which carries the cleared override) from interrupting playback.
    if (isPlayingOverride) {
      if (config.youtubePlayNowId) {
        // There is a NEW override, let's play it!
        clearTimeout(timeoutId);
        startEntertainment(true);
      }
      return;
    }

    clearTimeout(timeoutId);
    // Only start the content cycle once the display has been paired.
    if (deviceId && !(elements.pairingView && !elements.pairingView.classList.contains("hidden"))) {
      // A queued "Play Video Now" jumps straight into entertainment so it
      // interrupts on the next display poll (~30s) instead of waiting for the
      // ad cycle to finish.
      if (config.youtubePlayNowId) {
        isPlayingOverride = true;
        startEntertainment(true);
      } else {
        startCycle();
      }
    }
  }

  function hideMedia() {
    elements.image.classList.remove("image-zoom");
    elements.image.classList.add("hidden");
    elements.video.classList.add("hidden");
    elements.video.pause();
    elements.video.muted = true;
  }
  function schedule(next, duration) {
    clearTimeout(timeoutId);
    elements.progress.style.transition = "none";
    elements.progress.style.width = "0";
    requestAnimationFrame(() => {
      // Force a reflow to ensure the transition is reapplied for every ad
      void elements.progress.offsetWidth;
      elements.progress.style.transition = "width " + duration + "ms linear";
      elements.progress.style.width = "100%";
    });
    timeoutId = setTimeout(next, duration);
  }
  function renderQr(url) {
    if (!elements.qrCode) return;
    elements.qrCode.replaceChildren();
    if (!url || url === 'https://paystack.com/pay/') {
      elements.payment.classList.add("hidden");
      return;
    }
    elements.payment.classList.remove("hidden");
    if (window.QRCode) {
      try {
        new window.QRCode(elements.qrCode, { text: url, width: 140, height: 140, correctLevel: window.QRCode.CorrectLevel.M });
      } catch (e) {
        console.error("Failed to render QR Code:", e);
      }
    }
  }

  function showEmpty() {
    renderBrand(null);
    // When empty, we show YouTube full screen as entertainment
    startEntertainment();
  }

  function showAd() {
    if (!playlist.length) return showEmpty();
    const ad = playlist[index];
    lastPlayedAdId = ad.id;
    if (ad.play_now || ad.play_next) acknowledgePlayedAd(ad);
    renderBrand(ad);

    // Keep YouTube stage visible but in mini mode
    elements.youtubeStage.classList.remove("hidden");
    elements.youtubeStage.classList.add("mini");
    document.body.classList.add("sidebar-layout");

    elements.mediaStage.classList.remove("hidden");
    elements.mediaStage.dataset.orientation = ad.orientation || "unspecified";
    elements.empty.classList.add("hidden");
    elements.caption.classList.remove("hidden");
    
    // Toggle "Ask in Store" badge if the ad belongs to this paired store
    const pairedBusinessId = localStorage.getItem('smart-retail-display-businessId') || config.pairedBusinessId || '';
    if (pairedBusinessId && ad.business_id === pairedBusinessId && elements.ask) {
      elements.ask.classList.remove("hidden");
    } else if (elements.ask) {
      elements.ask.classList.add("hidden");
    }

    elements.business.textContent = decodeEntities(ad.business_name);
    elements.name.textContent = decodeEntities(ad.name);
    renderQr(ad.paystack_url);
    hideMedia();

    if (ad.media_type === "video") {
      elements.image.removeAttribute("src");
      elements.video.classList.remove("hidden");
      elements.video.src = ad.media_url;
      elements.video.load();
      // If it's a video ad, we unmute it (if not master muted) and mute YouTube
      elements.video.muted = masterMuted;
      elements.video.play().catch(() => {
        console.warn("Video autoplay was blocked, muting to retry");
        elements.video.muted = true;
        elements.video.play();
      });
    } else {
      elements.video.removeAttribute("src");
      elements.image.classList.remove("hidden");
      elements.image.classList.add("image-zoom");
      elements.image.style.animationDuration = config.adDurationMs + "ms";
      if (ad.orientation === "portrait" || ad.orientation === "square") {
        elements.image.classList.add("contain");
        elements.image.onload = null;
      } else if (ad.orientation === "landscape") {
        elements.image.classList.remove("contain");
        elements.image.onload = null;
      } else {
        elements.image.onload = function onImgLoad() {
          const ratio = (elements.image.naturalWidth && elements.image.naturalHeight) ? elements.image.naturalWidth / elements.image.naturalHeight : 1;
          elements.image.classList.toggle("contain", ratio < 1.6);
          elements.image.onload = null;
        };
      }
      elements.image.src = ad.media_url;
    }

    // Handle YouTube playback and muting
    ensureYTPlaying().then(() => {
      if (ytPlayer && typeof ytPlayer.mute === "function") {
        if (masterMuted || ad.media_type === "video") ytPlayer.mute();
        else ytPlayer.unMute();
      }
    });

    const proceed = () => { index += 1; index < playlist.length ? showAd() : startEntertainment(); };
    const target = ad.media_type === "video" ? elements.video : elements.image;
    target.onerror = () => { console.warn("Skipping broken media", ad.media_url); proceed(); };
    schedule(proceed, config.adDurationMs);
  }

// ── YouTube entertainment (fallback / random videos) ─────────────────────
  function playlistIds() {
    const slot = getCurrentTimeSlot(config.schedule);
    let list = [];

    // Honor a queued Play Now / Play Next YouTube playlist first.
    if (config.youtubePlayNowId) list.push(config.youtubePlayNowId);
    if (config.youtubePlayNextId && config.youtubePlayNextId !== config.youtubePlayNowId) list.push(config.youtubePlayNextId);

    const slotList = [];
    if (slot === "morning") {
      slotList.push(...config.morningPlaylists, ...config.eveningPlaylists);
    } else if (slot === "afternoon") {
      slotList.push(...config.afternoonPlaylists);
    } else if (slot === "evening") {
      slotList.push(...config.eveningPlaylists, ...config.morningPlaylists);
    }

    // Fallback to legacy/general lists if slot-specific lists are empty
    if (slotList.length) {
      list.push(...slotList);
    } else {
      if (config.playlistId) list.push(config.playlistId);
      (config.fallbackPlaylists || []).forEach((p) => {
        const pid = String(p || "").trim();
        if (pid && !list.includes(pid)) list.push(pid);
      });
    }

    // Emergency fallback: if still empty, use any available playlist from any slot
    if (!list.length) {
      const allPossible = [
        ...config.morningPlaylists,
        ...config.afternoonPlaylists,
        ...config.eveningPlaylists
      ];
      if (allPossible.length) {
        list = allPossible;
      }
    }

    // Ensure uniqueness and clean strings
    return [...new Set(list.map(s => String(s || "").trim()).filter(Boolean))];
  }

  // Lazily load the YouTube IFrame API and create the player.
  function ensureYTPlayer() {
    return new Promise((resolve) => {
      if (ytReady && ytPlayer) return resolve(ytPlayer);
      
      const create = () => {
        if (ytPlayer && typeof ytPlayer.destroy === "function") {
          try { ytPlayer.destroy(); } catch (e) {}
        }
        elements.player.innerHTML = "";
        
        // Use the safest possible origin: prioritize window.location.origin
        const origin = window.location.origin || (window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : ""));
        
        ytPlayer = new window.YT.Player(elements.player, {
          width: "100%", height: "100%",
          playerVars: { 
            autoplay: 1, 
            mute: 1, 
            playsinline: 1, 
            rel: 0, 
            modestbranding: 1,
            enablejsapi: 1,
            origin: origin
          },
          events: { 
            onReady: () => { 
              ytReady = true; 
              resolve(ytPlayer); 
            }, 
            onStateChange: (e) => {
              // State 0 is 'ENDED'
              if (e.data === 0) {
                console.log("[YouTube] Video finished, picking next...");
                localStorage.removeItem("yt_last_video_id");
                localStorage.removeItem("yt_last_time");
                playYouTubeMedia(true);
              }
              // YouTube Player State 1 is 'PLAYING'
              else if (e.data === 1) {
                const data = ytPlayer.getVideoData ? ytPlayer.getVideoData() : null;
                // isUpcoming is sometimes present in the video data for Premieres
                if (data && data.isUpcoming === true) {
                  console.warn("[YouTube] Detected upcoming premiere during playback, skipping...");
                  localStorage.removeItem("yt_last_video_id");
                  localStorage.removeItem("yt_last_time");
                  setTimeout(() => playYouTubeMedia(true), 500);
                }
              }
            },
            onError: (e) => { 
              const errorMap = {
                2: "Invalid video parameter or bad ID format.",
                5: "HTML5 player error.",
                100: "Video not found, removed, or marked private.",
                101: "Video owner does not allow embedded playback.",
                150: "Video owner does not allow embedded playback."
              };
              const msg = errorMap[e.data] || "Unknown player error code: " + e.data;
              console.error("[YouTube Player Error " + e.data + "]:", msg);
              
              // If a video fails to play (e.g. embedding restricted or deleted),
              // we should skip to the next one to keep the entertainment loop running.
              if ([100, 101, 150].includes(e.data)) {
                console.log("[YouTube] Error is fatal for this video, skipping...");
                // Clear the saved state so we don't loop on the same broken video
                localStorage.removeItem("yt_last_video_id");
                localStorage.removeItem("yt_last_time");
                setTimeout(() => {
                  playYouTubeMedia(true);
                }, 1000);
              }

              ytReady = true; 
              resolve(ytPlayer); 
            } 
          }
        });
      };

      if (window.YT && window.YT.Player) { create(); return; }
      
      // If API not loaded, set up callback and load script
      window.onYouTubeIframeAPIReady = () => {
        create();
      };
      
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    });
  }

  // Fetch video IDs for a playlist via the YouTube Data API.
  function fetchPlaylistItems(pid) {
    const apiKey = config.apiKey || window.YOUTUBE_API_KEY;
    if (!apiKey) {
      const err = new Error("YOUTUBE_API_KEY is missing. Please set YOUTUBE_API_KEY in your .env file or configuration.");
      console.error("[YouTube API Mode]", err.message);
      return Promise.reject(err);
    }
    const url = "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=50&playlistId=" + encodeURIComponent(pid) + "&key=" + encodeURIComponent(apiKey);
    return fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          let errorDetails = "";
          try {
            const errJson = await r.json();
            errorDetails = errJson.error ? (errJson.error.message || JSON.stringify(errJson.error)) : JSON.stringify(errJson);
          } catch (e) {
            errorDetails = "HTTP " + r.status + " " + r.statusText;
          }
          const err = new Error("YouTube API request failed (" + errorDetails + ")");
          console.error("[YouTube API Mode]", err.message);
          throw err;
        }
        return r.json();
      })
      .then((j) => {
        const items = (j && j.items || [])
          .filter((it) => {
            // Skip upcoming premieres and live streams
            // snippet.liveBroadcastContent is 'upcoming' for scheduled premieres
            const liveStatus = it.snippet && it.snippet.liveBroadcastContent;
            if (liveStatus === "upcoming") {
              console.log("[YouTube API] Skipping upcoming premiere:", it.snippet.title);
              return false;
            }
            return true;
          })
          .map((it) => it && it.contentDetails && it.contentDetails.videoId)
          .filter(Boolean);
        
        if (!items.length) {
          const err = new Error("No videos returned from YouTube Data API for playlist ID: " + pid);
          console.error("[YouTube API Mode]", err.message);
          throw err;
        }
        return items;
      });
  }

  function playPlaylist(listId) {
    if (!ytPlayer || typeof ytPlayer.loadPlaylist !== "function") return;
    
    handleLabelAnimation();
    
    // Check if the listId is a video ID or a playlist ID
    // Standard YouTube IDs are 11 chars. Playlists/Mixes are usually much longer or start with PL.
    if (listId.length === 11 && !listId.startsWith("PL")) {
      ytPlayer.loadVideoById({
        videoId: listId,
        suggestedQuality: 'default'
      });
    } else {
      // Use the most compatible loading method for playlists/mixes
      const params = {
        list: listId,
        listType: 'playlist',
        index: 0,
        suggestedQuality: 'default'
      };
      
      // If it's a Mix (not starting with PL), YouTube requires slightly different handling
      if (!listId.startsWith("PL") && listId.length > 11) {
        // Handle potential Radio/Mix IDs
        ytPlayer.loadPlaylist(params);
      } else {
        ytPlayer.loadPlaylist(params);
      }
    }
    
    // Ensure we attempt to play
    setTimeout(() => {
      if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
    }, 500);
  }

  // Play using YouTube Data API
  function playWithApi(listId) {
    if (listId.length === 11) {
      if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
        ytPlayer.loadVideoById(listId);
        ytPlayer.playVideo();
        return Promise.resolve();
      }
      return Promise.reject(new Error("YouTube player not ready"));
    }
    return fetchPlaylistItems(listId).then((items) => {
      if (!ytVideoQueues[listId] || !ytVideoQueues[listId].length) {
        ytVideoQueues[listId] = shuffleArray(items);
      }
      const chosen = ytVideoQueues[listId].pop();
      if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
        ytPlayer.loadVideoById(chosen);
        ytPlayer.playVideo();
      }
    });
  }

  // Unified YouTube playback router honoring youtubeMode ("api", "normal", "both")
  function playYouTubeMedia(forceNew = false) {
    // A queued "Play Now / Play Next" entertainment override always wins over
    // resume and random selection, so a pasted YouTube link plays immediately.
    const overrideId = config.youtubePlayNowId || config.youtubePlayNextId;
    if (overrideId) {
      console.log("[YouTube] Playing queued entertainment override:", overrideId);
      acknowledgePlaylistOverride(overrideId);
      config.youtubePlayNowId = "";
      config.youtubePlayNextId = "";
      handleLabelAnimation();
      if (config.youtubeMode === "normal") {
        playPlaylist(overrideId);
      } else if (config.youtubeMode === "api") {
        // STRICT API MODE: No fallback to normal embed on error.
        playWithApi(overrideId).catch((err) => {
          console.error("[YouTube API Mode Error] Strict API mode active — will NOT fallback to normal embed. Error:", err.message);
        });
      } else {
        // "both" mode: Try API mode first if apiKey is present; fallback to normal embed on error
        const apiKey = config.apiKey || window.YOUTUBE_API_KEY;
        if (apiKey) {
          playWithApi(overrideId).catch((err) => {
            console.warn("[YouTube Both Mode] API mode encountered an error, falling back to normal embed:", err.message);
            playPlaylist(overrideId);
          });
        } else {
          playPlaylist(overrideId);
        }
      }
      return;
    }

    const state = getYTState();
    // Only resume if the saved video is from within the last 12 hours (freshness)
    const lastSave = localStorage.getItem("yt_last_save_ts") || "0";
    const isRecent = (Date.now() - parseInt(lastSave)) < 12 * 60 * 60 * 1000;

    if (!forceNew && state.videoId && isRecent) {
      console.log("[YouTube] Resuming last played video:", state.videoId, "at", state.time, "s");
      if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
        handleLabelAnimation();
        ytPlayer.loadVideoById({
          videoId: state.videoId,
          startSeconds: state.time
        });
        ytPlayer.playVideo();
        return;
      }
    }

    const ids = playlistIds();
    if (!ids.length) {
      console.warn("[YouTube] No playlist ID configured in media configuration.");
      return;
    }
    const chosenListId = ids[Math.floor(Math.random() * ids.length)];

    if (config.youtubeMode === "normal") {
      playPlaylist(chosenListId);
    } else if (config.youtubeMode === "api") {
      // STRICT API MODE: No fallback to normal embed on error.
      playWithApi(chosenListId).catch((err) => {
        console.error("[YouTube API Mode Error] Strict API mode active — will NOT fallback to normal embed. Error:", err.message);
      });
    } else {
      // "both" mode: Try API mode first if apiKey is present; fallback to normal embed on error
      const apiKey = config.apiKey || window.YOUTUBE_API_KEY;
      if (apiKey) {
        playWithApi(chosenListId).catch((err) => {
          console.warn("[YouTube Both Mode] API mode encountered an error, falling back to normal embed:", err.message);
          playPlaylist(chosenListId);
        });
      } else {
        playPlaylist(chosenListId);
      }
    }
  }

  function ensureYTPlaying() {
    return ensureYTPlayer().then(() => {
      if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return;
      const state = ytPlayer.getPlayerState();
      // If NOT playing (1) and NOT buffering (3), start playing.
      if (state !== 1 && state !== 3) {
        playYouTubeMedia();
      }
    }).catch(() => {});
  }

  function hideYouTube() {
    // We don't really hide it anymore, but we can stop it if needed.
    // However, the requirement is to "keep playing".
  }

  function startEntertainment(force = false) {
    hideMedia();
    elements.mediaStage.classList.add("hidden");
    elements.payment.classList.add("hidden");

    // Transition YouTube to full screen
    elements.youtubeStage.classList.remove("hidden");
    elements.youtubeStage.classList.remove("mini");
    document.body.classList.remove("sidebar-layout");
    renderBrand(null);

    ensureYTPlayer().then(() => {
      if (masterMuted || firstPlay) ytPlayer.mute();
      else if (ytPlayer.unMute) ytPlayer.unMute();

      try {
        const state = ytPlayer.getPlayerState();
        if (force || (state !== 1 && state !== 3)) {
          playYouTubeMedia(force);
        }
      } catch (e) {
        // If player isn't ready for getPlayerState, just force play
        playYouTubeMedia(force);
      }
      return undefined;
    }).catch(() => {});

    schedule(startCycle, config.youtubeDurationMs);
  }

  // Unmute the player on the first click/interaction with the screen to satisfy browser autoplay policies
  document.addEventListener("click", () => {
    if (firstPlay) {
      firstPlay = false;
      if (ytPlayer && typeof ytPlayer.unMute === "function" && !masterMuted) {
        ytPlayer.unMute();
      }
    }
  });

  async function startCycle() {
    isPlayingOverride = false;
    clearTimeout(timeoutId);
    index = 0;
    // Don't hide YouTube here, just load media and show ads
    await loadMedia();
    playlist = buildCyclePlaylist(rawMediaList, config, MAX_AD_CYCLE_MS);
    showAd();
  }

  // ── Subscribe to Zuke publications (transport-agnostic seam). ────────────
  const queryParams = new URLSearchParams(window.location.search);
  const deviceIdParam = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
  const defaultExportUrl = DASHBOARD_API_BASE_URL ? `${DASHBOARD_API_BASE_URL}/api/display-ads/export${deviceIdParam}` : `https://app.zuke.co.za/api/display-ads/export${deviceIdParam}`;
  const ZUKE_EXPORT_URL = queryParams.get("zuke") || window.ZUKE_EXPORT_URL || defaultExportUrl;
  const POLL_INTERVAL_MS = 30_000;
  const adapter = window.createSubscriptionAdapter({ url: ZUKE_EXPORT_URL, intervalMs: POLL_INTERVAL_MS });
  adapter.subscribe(onZukeContent);

  // Wait briefly for the first Zuke poll so the initial frame is usually real
  // published content; falls back to /api/media|media.json within ~4s.
  async function init() {
    // Show progress on splash
    if (elements.splashBar) elements.splashBar.style.width = "30%";

    // Load base configuration first (defaults from media.json/api)
    await loadMedia();
    if (elements.splashBar) elements.splashBar.style.width = "45%";

    const delay = new Promise((r) => setTimeout(r, 4000));

    try {
      await Promise.race([adapter.start(), delay]);
      if (elements.splashBar) elements.splashBar.style.width = "100%";

      // Short delay to show 100% then fade
      setTimeout(() => {
        if (elements.splash) elements.splash.classList.add("fade-out");
        readyContent();
      }, 500);
    } catch (e) {
      if (elements.splash) elements.splash.classList.add("fade-out");
      readyContent();
    }
  }

  // Decide between the content cycle (already-paired display) and the pairing
  // view (first launch).
  function readyContent() {
    const storedDeviceId = localStorage.getItem('smart-retail-display-deviceId');

    if (elements.pairButton) {
      elements.pairButton.addEventListener('click', handlePairing);
    }

    if (storedDeviceId) {
      deviceId = storedDeviceId;
      activateContentCycle();
    } else {
      deviceId = generateDeviceId();
      showPairingView();
    }
  }

  init();