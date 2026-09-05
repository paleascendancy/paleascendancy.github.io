/* PALE ASCENDANCY — SITE CORE */
(() => {
  "use strict";

  const PLAYLIST = [
    { title: "Meaningful Love", file: "music/01-meaningful-love.mp3" },
    { title: "Better Days", file: "music/02-better-days.mp3" },
    { title: "Chill Day", file: "music/03-chill-day.mp3" },
    { title: "Canals", file: "music/04-canals.mp3" },
    { title: "Tek It — Hoodtrap Remix", file: "music/05-tek-it-hoodtrap-remix.mp3" },
    { title: "Star Shopping", file: "music/06-star-shopping.mp3" },
    { title: "Earrings", file: "music/07-earrings.mp3" },
    { title: "New Jeans Jersey Remix", file: "music/08-new-jeans-jersey-remix.mp3" },
    { title: "Nuts — Instrumental Slowed", file: "music/09-nuts-instrumental-slowed.mp3" },
    { title: "Sweater Weather — Instrumental", file: "music/10-sweater-weather-instrumental.mp3" },
    { title: "Childish Gambino — Instrumental", file: "music/11-childish-gambino-instrumental.mp3" }
  ];

  const STORE = {
    index: "pa_music_index",
    time: "pa_music_time",
    playing: "pa_music_playing",
    profile: "pa_profile_cache",
    suggestions: "pa_music_suggestions"
  };

  const AUTH_PAGES = new Set([
    "login.html",
    "cadastro.html",
    "perfil.html",
    "editar-perfil.html",
    "admin.html",
    "editor-painel.html",
    "login-editor.html",
    "login-profissional.html",
    "planos.html",
    "editor-perfil.html"
  ]);

  let audio = null;
  let currentIndex = 0;
  let failed = new Set();
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let beatFrame = 0;
  let navigating = false;
  let supabaseClient = null;
  let supabasePromise = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function read(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function absoluteURL(path) {
    return new URL(path, document.baseURI).href;
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ---------------- MENU ---------------- */

  function getMobileMenu() {
    return document.getElementById("mobileMenu");
  }

  function setMobileMenu(open) {
    const menu = getMobileMenu();
    const button = document.getElementById("menuButton");
    if (!menu) return;
    menu.classList.toggle("open", !!open);
    menu.classList.toggle("active", !!open);
    document.body.classList.toggle("mobile-menu-open", !!open);
    if (button) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
  }

  function closeMobileMenu() { setMobileMenu(false); }

  function initMobileMenu() {
    if (window.__PA_MENU_READY__) return;
    window.__PA_MENU_READY__ = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const button = target.closest("#menuButton");
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        const menu = getMobileMenu();
        if (menu) setMobileMenu(!menu.classList.contains("open"));
        return;
      }

      const menu = getMobileMenu();
      if (menu?.classList.contains("open") && !target.closest("#mobileMenu")) closeMobileMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMobileMenu();
    });
  }

  /* ---------------- SEARCH / FILTERS ---------------- */

  function initEditorTools() {
    const input = $("#searchInput");
    const grid = $("#editorsGrid");
    const buttons = $$(".filter-button");
    if (!input || !grid || input.dataset.paReady === "1") return;

    input.dataset.paReady = "1";
    let filter = "todos";

    const apply = () => {
      const term = input.value.trim().toLowerCase();
      $$(".editor-profile", grid).forEach((card) => {
        const haystack = `${card.dataset.search || ""} ${card.textContent || ""}`.toLowerCase();
        const categories = (card.dataset.category || "todos").toLowerCase().split(/\s+/);
        const matchesText = !term || haystack.includes(term);
        const matchesFilter = filter === "todos" || categories.includes(filter) || categories.includes("todos");
        card.hidden = !(matchesText && matchesFilter);
      });
    };

    input.addEventListener("input", apply);
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        filter = (button.dataset.filter || "todos").toLowerCase();
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        apply();
      });
    });

    apply();
  }

  function initEditorPhotos() {
    $$(".editor-photo").forEach((image) => {
      if (image.dataset.paReady === "1") return;
      image.dataset.paReady = "1";
      image.addEventListener("error", () => {
        const name = image.alt.replace(/^Foto de perfil de\s*/i, "").trim() || "Editor";
        const fallback = document.createElement("div");
        fallback.className = "editor-photo-fallback";
        fallback.setAttribute("aria-hidden", "true");
        fallback.textContent = name.charAt(0).toUpperCase();
        image.replaceWith(fallback);
      }, { once: true });
    });
  }

  /* ---------------- MUSIC UI ---------------- */

  function playerMarkup() {
    return `
      <div class="music-player-main">
        <button class="music-play" id="musicPlay" type="button" aria-label="Reproduzir música">▶</button>
        <button class="music-title-button" id="musicTitleButton" type="button" aria-label="Abrir lista de músicas">
          <span class="music-label">PALE ASCENDANCY</span>
          <strong id="musicTitle">Meaningful Love</strong>
          <span id="musicStatus">Toque para começar</span>
        </button>
        <button class="music-next" id="musicNext" type="button" aria-label="Próxima música">›</button>
      </div>
      <audio id="musicAudio" preload="auto" playsinline></audio>
    `;
  }

  function ensurePlayer() {
    let player = $("#musicPlayer");
    if (!player) {
      player = document.createElement("div");
      player.id = "musicPlayer";
      player.className = "music-player";
      player.setAttribute("aria-label", "Player de música");
      player.innerHTML = playerMarkup();
      document.body.appendChild(player);
    }

    audio = $("#musicAudio", player);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "musicAudio";
      audio.preload = "auto";
      audio.setAttribute("playsinline", "");
      player.appendChild(audio);
    }

    return player;
  }

  function ensureMusicPanel() {
    let panel = $("#musicPanel");
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.id = "musicPanel";
    panel.className = "music-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Biblioteca musical");
    panel.innerHTML = `
      <div class="music-panel-inner">
        <header class="music-panel-header">
          <div>
            <span class="music-panel-kicker">PALE ASCENDANCY</span>
            <h2>Biblioteca musical</h2>
            <p>Escolha uma faixa para continuar ouvindo enquanto navega.</p>
          </div>
          <button class="music-panel-close" id="musicPanelClose" type="button" aria-label="Fechar lista">×</button>
        </header>
        <label class="music-search-wrap">
          <span aria-hidden="true">⌕</span>
          <input id="musicSearch" class="music-search" type="search" placeholder="Pesquisar música..." autocomplete="off">
        </label>
        <div id="musicList" class="music-list"></div>
        <div class="music-suggestion">
          <strong>Sugira uma música</strong>
          <p>Envie o nome de uma faixa que você gostaria de ver na playlist.</p>
          <div class="music-suggestion-row">
            <input id="musicSuggestionInput" type="text" maxlength="120" placeholder="Nome da música...">
            <button id="musicSuggestionSend" type="button">Enviar</button>
          </div>
          <small id="musicSuggestionStatus" aria-live="polite"></small>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    $("#musicPanelClose").addEventListener("click", closeMusicPanel);
    $("#musicSearch").addEventListener("input", (event) => renderPlaylist(event.target.value));
    $("#musicSuggestionSend").addEventListener("click", sendSuggestion);
    $("#musicSuggestionInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") sendSuggestion();
    });

    return panel;
  }

  function renderPlaylist(filter = "") {
    const list = $("#musicList");
    if (!list) return;
    const term = filter.trim().toLowerCase();
    list.innerHTML = "";

    PLAYLIST.forEach((track, index) => {
      if (term && !track.title.toLowerCase().includes(term)) return;
      const item = document.createElement("button");
      item.type = "button";
      item.className = "music-list-item";
      item.classList.toggle("active", index === currentIndex);
      item.innerHTML = `
        <span class="music-list-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="music-list-name">${escapeHTML(track.title)}</span>
        <span class="music-list-action">${index === currentIndex && !audio?.paused ? "Ⅱ" : "▶"}</span>
      `;
      item.addEventListener("click", () => selectTrack(index));
      list.appendChild(item);
    });

    if (!list.children.length) {
      list.innerHTML = '<div class="music-empty">Nenhuma música encontrada.</div>';
    }
  }

  function openMusicPanel() {
    const panel = ensureMusicPanel();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("open"));
    document.body.classList.add("music-panel-open");
    renderPlaylist($("#musicSearch")?.value || "");
  }

  function closeMusicPanel() {
    const panel = $("#musicPanel");
    if (!panel) return;
    panel.classList.remove("open");
    document.body.classList.remove("music-panel-open");
    setTimeout(() => { if (!panel.classList.contains("open")) panel.hidden = true; }, 220);
  }

  function updatePlayer() {
    const track = PLAYLIST[currentIndex];
    const play = $("#musicPlay");
    const title = $("#musicTitle");
    const status = $("#musicStatus");
    if (title && track) title.textContent = track.title;
    if (play) {
      play.textContent = audio && !audio.paused ? "Ⅱ" : "▶";
      play.setAttribute("aria-label", audio && !audio.paused ? "Pausar música" : "Reproduzir música");
    }
    if (status) status.textContent = audio && !audio.paused ? "Reproduzindo" : "Pausado";
    renderPlaylist($("#musicSearch")?.value || "");
  }

  async function setupAudioAnalyser() {
    if (audioContext || !audio) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;

    try {
      audioContext = new Context();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
      if (audioContext.state === "suspended") await audioContext.resume();
    } catch (_) {
      audioContext = null;
      analyser = null;
      sourceNode = null;
    }
  }

  function startBeatAnimation() {
    if (beatFrame) return;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      beatFrame = requestAnimationFrame(draw);
      let intensity = 0.25;
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        let total = 0;
        let low = 0;
        for (let i = 0; i < data.length; i += 1) {
          total += data[i];
          if (i < data.length * 0.35) low += data[i];
        }
        intensity = Math.min(1, total / data.length / 255 * 0.45 + low / Math.max(1, data.length * 0.35) / 255 * 0.85);
      }

      const phone = $(".phone");
      const glow = $(".phone-beat-glow");
      const bars = $$("#beatBars i");
      if (phone) {
        phone.style.setProperty("--beat-scale", (1 + intensity * 0.012).toFixed(4));
        phone.style.setProperty("--beat-glow", `${Math.round(18 + intensity * 38)}px`);
      }
      if (glow) glow.style.opacity = String(0.18 + intensity * 0.5);
      bars.forEach((bar, index) => {
        const wave = (Math.sin(performance.now() / (120 + index * 9) + index) + 1) / 2;
        bar.style.height = `${Math.round(14 + intensity * 48 * (0.45 + wave * 0.55))}px`;
        bar.style.opacity = String(0.35 + intensity * 0.65);
      });
    };
    draw();
  }

  function stopBeatAnimation() {
    if (beatFrame) cancelAnimationFrame(beatFrame);
    beatFrame = 0;
    const phone = $(".phone");
    if (phone) {
      phone.style.setProperty("--beat-scale", "1");
      phone.style.setProperty("--beat-glow", "18px");
    }
    $$("#beatBars i").forEach((bar) => {
      bar.style.height = "14px";
      bar.style.opacity = ".35";
    });
  }

  async function playMusic() {
    if (!audio) return false;
    try {
      await setupAudioAnalyser();
      if (audioContext?.state === "suspended") await audioContext.resume();
      await audio.play();
      write(STORE.playing, "1");
      updatePlayer();
      startBeatAnimation();
      return true;
    } catch (_) {
      write(STORE.playing, "0");
      updatePlayer();
      return false;
    }
  }

  function pauseMusic() {
    if (!audio) return;
    audio.pause();
    write(STORE.playing, "0");
    write(STORE.time, Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    updatePlayer();
    stopBeatAnimation();
  }

  function setTrack(index, autoplay = false, restoreTime = 0) {
    if (!audio) return;
    currentIndex = (index + PLAYLIST.length) % PLAYLIST.length;
    const track = PLAYLIST[currentIndex];
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio.src = absoluteURL(track.file);
    audio.preload = "auto";
    audio.load();
    write(STORE.index, currentIndex);
    write(STORE.time, restoreTime || 0);
    write(STORE.playing, autoplay ? "1" : "0");
    updatePlayer();

    if (restoreTime > 0) {
      const restore = () => {
        if (Number.isFinite(audio.duration) && restoreTime < audio.duration) audio.currentTime = restoreTime;
      };
      if (audio.readyState >= 1) restore();
      else audio.addEventListener("loadedmetadata", restore, { once: true });
    }

    if (autoplay) {
      const attempt = () => { playMusic(); };
      if (audio.readyState >= 2) attempt();
      else audio.addEventListener("canplay", attempt, { once: true });
    }
  }

  function selectTrack(index) {
    failed.delete(index);
    setTrack(index, true);
    closeMusicPanel();
  }

  function nextTrack() {
    let next = (currentIndex + 1) % PLAYLIST.length;
    let guard = 0;
    while (failed.has(next) && guard < PLAYLIST.length) {
      next = (next + 1) % PLAYLIST.length;
      guard += 1;
    }
    if (guard >= PLAYLIST.length) failed.clear();
    setTrack(next, true);
  }

  function handleAudioError() {
    if (!audio) return;
    failed.add(currentIndex);
    if (failed.size >= PLAYLIST.length) {
      failed.clear();
      const status = $("#musicStatus");
      if (status) status.textContent = "Não foi possível carregar as músicas.";
      return;
    }
    nextTrack();
  }

  function sendSuggestion() {
    const input = $("#musicSuggestionInput");
    const status = $("#musicSuggestionStatus");
    if (!input || !status) return;
    const value = input.value.trim();
    if (!value) {
      status.textContent = "Digite o nome da música.";
      return;
    }

    let suggestions = [];
    try { suggestions = JSON.parse(read(STORE.suggestions, "[]")); } catch (_) {}
    if (!Array.isArray(suggestions)) suggestions = [];
    suggestions.push({ music: value, date: new Date().toISOString() });
    write(STORE.suggestions, JSON.stringify(suggestions));
    status.textContent = "Sugestão registrada.";
    input.value = "";
  }

  function initMusic() {
    ensurePlayer();
    ensureMusicPanel();

    const play = $("#musicPlay");
    const title = $("#musicTitleButton");
    const next = $("#musicNext");

    if (play && play.dataset.paReady !== "1") {
      play.dataset.paReady = "1";
      play.addEventListener("click", () => audio?.paused ? playMusic() : pauseMusic());
    }

    if (title && title.dataset.paReady !== "1") {
      title.dataset.paReady = "1";
      title.addEventListener("click", openMusicPanel);
    }

    if (next && next.dataset.paReady !== "1") {
      next.dataset.paReady = "1";
      next.addEventListener("click", nextTrack);
    }

    if (audio?.dataset.paReady !== "1") {
      audio.dataset.paReady = "1";
      audio.addEventListener("ended", nextTrack);
      audio.addEventListener("error", handleAudioError);
      audio.addEventListener("play", () => {
        write(STORE.playing, "1");
        updatePlayer();
        startBeatAnimation();
      });
      audio.addEventListener("pause", () => {
        write(STORE.playing, "0");
        updatePlayer();
        stopBeatAnimation();
      });
      audio.addEventListener("timeupdate", () => {
        if (!audio.paused) write(STORE.time, audio.currentTime || 0);
      });
    }

    let index = parseInt(read(STORE.index, "0"), 10);
    if (!Number.isInteger(index) || index < 0 || index >= PLAYLIST.length) index = 0;

    const savedTime = Math.max(0, parseFloat(read(STORE.time, "0")) || 0);
    const shouldPlay = read(STORE.playing, "1") === "1";

    currentIndex = index;
    setTrack(index, false, savedTime);

    if (shouldPlay) {
      // Give the page time to settle before requesting autoplay.
      // If the browser blocks sound, the first meaningful interaction unlocks it.
      setTimeout(() => {
        playMusic().then((started) => {
          if (!started) installAutoplayUnlock();
        });
      }, 1800);
    }
  }

  let unlockInstalled = false;

  function installAutoplayUnlock() {
    if (unlockInstalled) return;
    unlockInstalled = true;

    const unlock = () => {
      if (audio?.paused) playMusic();

      ["pointerdown", "touchstart", "keydown", "scroll"].forEach((type) => {
        document.removeEventListener(type, unlock, true);
      });

      unlockInstalled = false;
    };

    ["pointerdown", "touchstart", "keydown", "scroll"].forEach((type) => {
      document.addEventListener(type, unlock, true, { passive: type === "scroll" });
    });
  }

  /* ---------------- SUPABASE / HEADER ---------------- */

  function ensureSupabase() {
    if (window.supabase?.createClient) return Promise.resolve(true);
    if (supabasePromise) return supabasePromise;

    supabasePromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.onload = () => resolve(!!window.supabase?.createClient);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return supabasePromise;
  }

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase?.createClient) return null;

    try {
      supabaseClient = window.supabase.createClient(
        "https://fnyellunugdfesprmvzm.supabase.co",
        "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

      return supabaseClient;
    } catch (_) {
      return null;
    }
  }


  /* ---------------- GLOBAL APPEARANCE ---------------- */

  const BUTTON_MODES = new Set(["gradient", "solid", "outline", "glass", "minimal"]);

  function applySiteAppearance(settings) {
    if (!settings || typeof settings !== "object") return;
    const root = document.documentElement;
    if (settings.primary) root.style.setProperty("--pa-primary", settings.primary);
    if (settings.secondary) root.style.setProperty("--pa-secondary", settings.secondary);
    if (settings.background) root.style.setProperty("--pa-background", settings.background);
    if (settings.text) root.style.setProperty("--pa-text", settings.text);
    if (settings.accent) root.style.setProperty("--pa-accent", settings.accent);
    if (BUTTON_MODES.has(settings.button_mode)) root.dataset.buttonMode = settings.button_mode;
    try { localStorage.setItem("paAppearance", JSON.stringify(settings)); } catch (_) {}
  }

  async function initGlobalAppearance() {
    try {
      const cached = JSON.parse(read("paAppearance", "null"));
      if (cached) applySiteAppearance(cached);
    } catch (_) {}
    const load = async () => {
      const sb = getSupabaseClient();
      if (!sb) return;
      try {
        const { data } = await sb.from("site_settings").select("settings").eq("id", true).maybeSingle();
        if (data?.settings) applySiteAppearance(data.settings);
      } catch (_) {}
    };
    if (window.supabase?.createClient) await load();
    else setTimeout(load, 700);
  }

  function applyCachedHeaderProfile() {
    const cached = (() => {
      try { return JSON.parse(read(STORE.profile, "null")); }
      catch (_) { return null; }
    })();

    const initial = $("#headerProfileInitial");
    const image = $("#headerProfileImage");
    if (!cached || !initial || !image) return;

    const name = String(cached.name || "U").trim() || "U";
    initial.textContent = name.charAt(0).toUpperCase();

    if (cached.avatar_url) {
      image.src = cached.avatar_url;
      image.hidden = false;
      initial.hidden = true;
    } else {
      image.hidden = true;
      initial.hidden = false;
    }
  }

  function ensureAccountMarkup() {
    const header = document.querySelector(".header");
    if (!header) return;

    let account = document.getElementById("accountArea");
    if (!account) {
      account = document.createElement("div");
      account.className = "account-area";
      account.id = "accountArea";
      account.innerHTML = `
        <div class="logged-out-area" id="loggedOutArea">
          <a class="account-login" href="login.html">Entrar</a>
          <a class="account-register" href="cadastro.html">Criar conta</a>
        </div>
        <div class="logged-in-area" id="loggedInArea" hidden>
          <a class="profile-link" href="perfil.html" aria-label="Abrir meu perfil">
            <span class="profile-avatar-small">
              <span id="headerProfileInitial">?</span>
              <img id="headerProfileImage" src="" alt="Foto de perfil" hidden>
            </span>
            <span class="profile-link-text">Perfil</span>
          </a>
        </div>
      `;
      const menuButton = header.querySelector("#menuButton");
      if (menuButton) header.insertBefore(account, menuButton);
      else header.appendChild(account);
    }

    let loggedOut = document.getElementById("loggedOutArea");
    let loggedIn = document.getElementById("loggedInArea");
    if (!loggedOut || !loggedIn) {
      account.innerHTML = `
        <div class="logged-out-area" id="loggedOutArea">
          <a class="account-login" href="login.html">Entrar</a>
          <a class="account-register" href="cadastro.html">Criar conta</a>
        </div>
        <div class="logged-in-area" id="loggedInArea" hidden>
          <a class="profile-link" href="perfil.html" aria-label="Abrir meu perfil">
            <span class="profile-avatar-small">
              <span id="headerProfileInitial">?</span>
              <img id="headerProfileImage" src="" alt="Foto de perfil" hidden>
            </span>
            <span class="profile-link-text">Perfil</span>
          </a>
        </div>`;
      loggedOut = document.getElementById("loggedOutArea");
      loggedIn = document.getElementById("loggedInArea");
    }

    const mobileMenu = getMobileMenu();
    if (mobileMenu && !document.getElementById("mobileAccount")) {
      const mobileAccount = document.createElement("div");
      mobileAccount.className = "mobile-account";
      mobileAccount.id = "mobileAccount";
      mobileAccount.innerHTML = `
        <div id="mobileLoggedOut">
          <a href="login.html">Entrar</a>
          <a href="cadastro.html">Criar conta</a>
        </div>
        <div id="mobileLoggedIn" hidden>
          <a href="perfil.html">Meu perfil</a>
          <a href="admin.html" id="mobileAdminLink" hidden>Administração</a>
          <a href="editor-painel.html" id="mobileEditorLink" hidden>Área do editor</a>
        </div>`;
      mobileMenu.appendChild(mobileAccount);
    }

    const mobileIn = document.getElementById("mobileLoggedIn");
    if (mobileIn && !document.getElementById("mobileEditorLink")) {
      const editorLink = document.createElement("a");
      editorLink.href = "editor-painel.html";
      editorLink.id = "mobileEditorLink";
      editorLink.textContent = "Área profissional";
      editorLink.hidden = true;
      mobileIn.appendChild(editorLink);
    }

    if (mobileIn && !document.getElementById("mobileAdminLink")) {
      const adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.id = "mobileAdminLink";
      adminLink.textContent = "Administração";
      adminLink.hidden = true;
      mobileIn.appendChild(adminLink);
    }
  }

  function setAdminHeaderLink(show) {
    const loggedIn = document.getElementById("loggedInArea");
    const mobileLink = document.getElementById("mobileAdminLink");
    if (mobileLink) mobileLink.hidden = !show;
    if (!loggedIn) return;
    let link = document.getElementById("adminHeaderLink");
    if (show) {
      if (!link) {
        link = document.createElement("a");
        link.id = "adminHeaderLink";
        link.className = "admin-header-link";
        link.href = "admin.html";
        link.textContent = "Admin";
        link.setAttribute("aria-label", "Abrir painel de administração");
        loggedIn.appendChild(link);
      }
      link.hidden = false;
    } else if (link) {
      link.remove();
    }
  }

  function setEditorHeaderLink(show) {
    const loggedIn = document.getElementById("loggedInArea");
    const mobileLink = document.getElementById("mobileEditorLink");
    if (mobileLink) mobileLink.hidden = !show;
    if (!loggedIn) return;
    let link = document.getElementById("editorHeaderLink");
    if (show) {
      if (!link) {
        link = document.createElement("a");
        link.id = "editorHeaderLink";
        link.className = "editor-header-link";
        link.href = "editor-painel.html";
        link.textContent = "Profissional";
        link.setAttribute("aria-label", "Abrir área profissional");
        loggedIn.appendChild(link);
      }
      link.hidden = false;
    } else if (link) {
      link.remove();
    }
  }

  function updateEditorPageAccess(isEditor) {
    const bar = document.getElementById("editorManageBar");
    if (!bar) return;
    bar.hidden = !isEditor;
  }

  function updateAccountUI(session, profile, isAdmin = false) {
    const loggedOut = $("#loggedOutArea");
    const loggedIn = $("#loggedInArea");
    const mobileOut = $("#mobileLoggedOut");
    const mobileIn = $("#mobileLoggedIn");

    if (!loggedOut || !loggedIn) return;

    const logged = !!session?.user;
    loggedOut.hidden = logged;
    loggedIn.hidden = !logged;
    if (mobileOut) mobileOut.hidden = logged;
    if (mobileIn) mobileIn.hidden = !logged;
    setAdminHeaderLink(logged && isAdmin);
    setEditorHeaderLink(logged && (profile?.is_editor === true || profile?.is_designer === true));
    updateEditorPageAccess(logged && (profile?.is_editor === true || profile?.is_designer === true));

    if (!logged) return;

    const initial = $("#headerProfileInitial");
    const image = $("#headerProfileImage");
    if (!initial || !image) return;

    const name = String(
      profile?.nome_artistico || profile?.nome || session.user.email || "U"
    ).trim() || "U";

    initial.textContent = name.charAt(0).toUpperCase();

    if (profile?.avatar_url) {
      image.src = profile.avatar_url;
      image.hidden = false;
      initial.hidden = true;
    } else {
      image.hidden = true;
      image.removeAttribute("src");
      initial.hidden = false;
    }

    write(STORE.profile, JSON.stringify({
      name,
      avatar_url: profile?.avatar_url || ""
    }));
  }

  async function initAccountHeader() {
    ensureAccountMarkup();
    applyCachedHeaderProfile();

    const client = getSupabaseClient();
    if (!client) {
      const loaded = await ensureSupabase();
      if (loaded && getSupabaseClient()) return initAccountHeader();
      updateAccountUI(null, null, false);
      return;
    }

    try {
      const { data } = await client.auth.getSession();
      const session = data?.session || null;

      if (!session?.user) {
        updateAccountUI(null, null, false);
        return;
      }

      let profile = null;
      try {
        const result = await client
          .from("profile")
          .select("nome,nome_artistico,avatar_url,is_editor,is_designer")
          .eq("id", session.user.id)
          .maybeSingle();
        profile = result.data || null;
      } catch (_) {}

      let isAdmin = false;
      try {
        const result = await client.rpc("is_admin");
        isAdmin = result.data === true && !result.error;
      } catch (_) {}

      updateAccountUI(session, profile, isAdmin);
    } catch (_) {
      updateAccountUI(null, null, false);
    }

    if (!window.__PA_AUTH_LISTENER__) {
      window.__PA_AUTH_LISTENER__ = true;
      client.auth.onAuthStateChange(() => {
        setTimeout(() => initAccountHeader(), 0);
      });
    }
  }

  async function handleAuthRedirect() {
    const current = pageName(location.pathname);
    const client = getSupabaseClient();
    if (!client) return;

    try {
      // Supabase can return from email confirmation using either a hash session
      // or a PKCE `code`. The client is configured to detect the URL; this
      // explicit exchange covers hosted-email configurations that use PKCE.
      const code = new URLSearchParams(location.search).get("code");
      if (code && typeof client.auth.exchangeCodeForSession === "function") {
        await client.auth.exchangeCodeForSession(code);
        history.replaceState({}, document.title, location.pathname + location.hash);
      }

      const { data } = await client.auth.getSession();
      if (data?.session?.user && (current === "login.html" || current === "cadastro.html")) {
        window.location.replace("perfil.html");
      }
    } catch (_) {}
  }

  /* ---------------- NAVIGATION ---------------- */

  function pageName(pathname) {
    return pathname.split("/").pop() || "index.html";
  }

  function shouldUseSpa(link, event) {
    if (!link || event.defaultPrevented || event.button !== 0) return false;

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return false;

    if (link.target === "_blank" || link.hasAttribute("download")) return false;

    const href = link.getAttribute("href") || "";

    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return false;

    let url;

    try {
      url = new URL(href, location.href);
    } catch (_) {
      return false;
    }

    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;

    const extension = url.pathname.split(".").pop().toLowerCase();

    if (extension && !["html", "htm"].includes(extension)) return false;

    if (AUTH_PAGES.has(pageName(url.pathname))) return false;

    return true;
  }

  function updateActiveLinks() {
    const current = pageName(location.pathname);

    $$('a[href]').forEach((link) => {
      try {
        const url = new URL(link.href, location.href);

        link.classList.toggle(
          "active",
          url.origin === location.origin &&
          pageName(url.pathname) === current &&
          !url.hash
        );
      } catch (_) {}
    });
  }

  async function navigate(url, push = true) {
    if (navigating) return;

    navigating = true;

    try {
      const target = new URL(url, location.href);

      const response = await fetch(
        target.href,
        {
          credentials: "same-origin",
          cache: "no-store"
        }
      );

      if (!response.ok) throw new Error("navigation");

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const nextMain = $("main", doc);
      const currentMain = $("main");

      if (!nextMain || !currentMain) throw new Error("page");

      currentMain.replaceWith(nextMain);

      if (doc.title) document.title = doc.title;

      if (push) history.pushState({ pale: true }, "", target.href);

      closeMobileMenu();
      closeMusicPanel();

      initEditorTools();
      initEditorPhotos();
      ensureAccountMarkup();
      handleAuthRedirect().finally(() => initAccountHeader());
      updateActiveLinks();

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      if (target.hash) {
        setTimeout(() => {
          const targetElement = document.getElementById(
            target.hash.slice(1)
          );

          targetElement?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }, 40);
      }
    } catch (_) {
      location.href = url;
    } finally {
      navigating = false;
    }
  }

  function initNavigation() {
    if (window.__PA_NAV_READY__) return;

    window.__PA_NAV_READY__ = true;

    document.addEventListener("click", (event) => {
      const target =
        event.target instanceof Element ? event.target : null;

      const link = target?.closest("a[href]");

      if (!shouldUseSpa(link, event)) return;

      event.preventDefault();
      navigate(link.href, true);
    });

    window.addEventListener(
      "popstate",
      () => navigate(location.href, false)
    );
  }

  function boot() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    initMobileMenu();
    initNavigation();
    initEditorTools();
    initEditorPhotos();
    initMusic();
    initGlobalAppearance();
    ensureAccountMarkup();
    handleAuthRedirect().finally(() => initAccountHeader());
    updateActiveLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }

  window.PaleAscendancy = {
    music: {
      play: playMusic,
      pause: pauseMusic,
      next: nextTrack,
      open: openMusicPanel,
      close: closeMusicPanel,
      playlist: PLAYLIST
    }
  };
})();
