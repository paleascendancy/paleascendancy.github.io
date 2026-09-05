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
    "login-admin.html",
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

    window.__PA_EDITOR_FILTER_APPLY__ = apply;
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

  /* ---------------- PROFESSIONAL DIRECTORY / REELS ---------------- */

  const PROFESSIONAL_CATEGORY_MAP = {
    trailer: "Trailers", highlight: "Highlights", motion: "Motion Design", anime: "Anime / Mangá",
    gaming: "Gaming", tiktok: "TikTok", reels: "Reels", amv: "AMV", thumbnail: "Thumbnails",
    youtube: "YouTube", promo: "Promo", design: "Design Gráfico", branding: "Branding", uiux: "UI / UX",
    illustration: "Ilustração", "3d": "3D", outros: "Outros"
  };

  function professionalRole(profile) {
    return profile.is_editor && profile.is_designer ? "EDITOR + DESIGNER" : profile.is_designer ? "DESIGNER" : "EDITOR";
  }

  function professionalAvailability(value) {
    return value === "ocupado" ? "Ocupado" : value === "sob_consulta" ? "Sob consulta" : "Disponível";
  }

  function portfolioMediaMarkup(item) {
    const title = escapeHTML(item.title || "Trabalho");
    const url = escapeHTML(item.url || "");
    if (item.item_type === "video") return `<video src="${url}" muted autoplay loop playsinline preload="metadata" aria-label="${title}"></video>`;
    if (item.item_type === "image") return `<img src="${url}" alt="${title}" loading="lazy">`;
    return `<div class="portfolio-reel-link"><span>↗</span><strong>Abrir projeto</strong><small>${url}</small></div>`;
  }

  async function loadProfessionalDirectory() {
    const grid = $("#editorsGrid");
    if (!grid) return;

    const reels = $("#portfolioReels");
    grid.innerHTML = '<div class="professional-loading">Carregando profissionais...</div>';
    if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Carregando portfólios...</div>';

    const client = getSupabaseClient();
    if (!client) {
      await ensureSupabase();
    }
    const sb = getSupabaseClient();
    if (!sb) {
      grid.innerHTML = '<div class="professional-loading">Não foi possível conectar aos profissionais.</div>';
      if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Não foi possível carregar os portfólios.</div>';
      return;
    }

    const [{ data: profiles, error: profileError }, { data: items, error: itemError }] = await Promise.all([
      sb.from("editor_directory")
        .select("id,nome_artistico,especialidade,bio,avatar_url,tiktok,instagram,youtube,discord,editor_categories,portfolio_url,editor_software,availability,is_featured,is_editor,is_designer")
        .order("is_featured", { ascending: false }),
      sb.from("editor_portfolio_items")
        .select("id,editor_id,title,description,item_type,url,sort_order,created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    ]);

    if (profileError) {
      grid.innerHTML = '<div class="professional-loading">Não foi possível carregar os profissionais.</div>';
      if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Não foi possível carregar os portfólios.</div>';
      return;
    }

    const approved = profiles || [];
    if (!approved.length) {
      grid.innerHTML = '<div class="professional-loading">Ainda não há profissionais aprovados na rede.</div>';
    } else {
      grid.innerHTML = approved.map((profile) => {
        const name = profile.nome_artistico || profile.nome || "Profissional";
        const categories = [profile.especialidade, ...(Array.isArray(profile.editor_categories) ? profile.editor_categories : [])].filter(Boolean).map(String);
        const tags = [...new Set(categories)].slice(0, 5).map((item) => `<span class="editor-tag">${escapeHTML(PROFESSIONAL_CATEGORY_MAP[item] || item)}</span>`).join("");
        const avatar = profile.avatar_url
          ? `<img class="editor-avatar editor-photo" src="${escapeHTML(profile.avatar_url)}" alt="Foto de perfil de ${escapeHTML(name)}" loading="lazy">`
          : `<div class="editor-avatar placeholder-icon">${escapeHTML(name.charAt(0).toUpperCase())}</div>`;
        const role = professionalRole(profile);
        const searchText = `${name} ${profile.especialidade || ""} ${categories.join(" ")} ${profile.bio || ""} ${profile.editor_software || ""}`.toLowerCase();
        return `<article class="editor-profile dynamic-professional" data-profile-id="${escapeHTML(profile.id)}" data-category="${escapeHTML(categories.join(" ").toLowerCase())}" data-search="${escapeHTML(searchText)}">
          <div class="editor-status"><span class="status-dot" aria-hidden="true"></span>${escapeHTML(profile.is_featured ? "Destaque" : professionalAvailability(profile.availability))}</div>
          ${avatar}
          <h2>${escapeHTML(name)}</h2>
          <div class="editor-role">${role}</div>
          <p class="editor-description">${escapeHTML(profile.bio || `${role.toLowerCase()} com foco em ${PROFESSIONAL_CATEGORY_MAP[profile.especialidade] || profile.especialidade || "criação audiovisual"}.`)}</p>
          <div class="editor-tags">${tags || '<span class="editor-tag">Portfólio</span>'}${profile.is_featured ? '<span class="editor-tag">Destaque</span>' : ''}</div>
          <div class="editor-footer"><a class="card-link" href="editor-perfil.html?id=${encodeURIComponent(profile.id)}">Ver perfil →</a></div>
        </article>`;
      }).join("");
    }

    initEditorPhotos();
    window.__PA_EDITOR_FILTER_APPLY__?.();

    if (!reels) return;
    if (itemError) {
      reels.innerHTML = '<div class="portfolio-reels-empty">Não foi possível carregar os portfólios.</div>';
      return;
    }

    const profileMap = new Map(approved.map((profile) => [profile.id, profile]));
    const validItems = (items || []).map((item) => ({ ...item, profile: profileMap.get(item.editor_id) })).filter((item) => item.profile);
    if (!validItems.length) {
      reels.innerHTML = '<div class="portfolio-reels-empty">Os portfólios publicados pelos profissionais aparecerão aqui.</div>';
      return;
    }

    reels.innerHTML = validItems.map((item) => {
      const profile = item.profile || {};
      const name = profile.nome_artistico || profile.nome || "Profissional";
      const body = `<a class="portfolio-reel-media" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${portfolioMediaMarkup(item)}</a>`;
      return `<article class="portfolio-reel-card">
        <div class="portfolio-reel-visual">${body}<div class="portfolio-reel-gradient"></div><div class="portfolio-reel-overlay"><span>${escapeHTML(name)}</span><strong>${escapeHTML(item.title || "Projeto")}</strong></div></div>
        <div class="portfolio-reel-copy"><strong>${escapeHTML(item.title || "Projeto")}</strong><span>${escapeHTML(name)} · ${item.item_type === "video" ? "Vídeo" : item.item_type === "image" ? "Arte" : "Projeto"}</span>${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}</div>
      </article>`;
    }).join("");
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
    const primary = settings.primary || settings.cyan || "#5de1ff";
    const secondary = settings.secondary || settings.violet || "#8b7cff";
    const background = settings.background || "#050914";
    const text = settings.text || "#eef7ff";
    const accent = settings.accent || settings.gold || "#f1c76b";
    const muted = settings.muted || "#91a8bd";
    const textSoft = settings.text_soft || "#d4deea";
    const line = settings.line || "rgba(170,215,255,.15)";
    const lineStrong = settings.line_strong || "rgba(170,215,255,.28)";
    root.style.setProperty("--pa-primary", primary);
    root.style.setProperty("--pa-secondary", secondary);
    root.style.setProperty("--pa-background", background);
    root.style.setProperty("--pa-text", text);
    root.style.setProperty("--pa-accent", accent);
    root.style.setProperty("--pa-muted", muted);
    root.style.setProperty("--pa-text-soft", textSoft);
    root.style.setProperty("--pa-line", line);
    root.style.setProperty("--pa-line-strong", lineStrong);
    const surfaces = {
      obsidian:{radius:"22px",card_bg:"rgba(12,10,17,.86)",card_border:"rgba(255,255,255,.11)",card_shadow:"0 18px 60px rgba(0,0,0,.22)",card_hover:"0 24px 70px rgba(0,0,0,.34)"},
      glass:{radius:"24px",card_bg:"rgba(255,255,255,.045)",card_border:"rgba(255,255,255,.16)",card_shadow:"0 22px 70px rgba(0,0,0,.28)",card_hover:"0 28px 90px rgba(0,0,0,.38)"},
      soft:{radius:"18px",card_bg:"rgba(255,255,255,.028)",card_border:"rgba(255,255,255,.08)",card_shadow:"0 12px 38px rgba(0,0,0,.18)",card_hover:"0 18px 50px rgba(0,0,0,.25)"},
      neon:{radius:"20px",card_bg:"rgba(7,12,24,.82)",card_border:"color-mix(in srgb,var(--pa-primary,#9fe8ff) 28%,transparent)",card_shadow:"0 20px 70px color-mix(in srgb,var(--pa-primary,#9fe8ff) 10%,transparent)",card_hover:"0 26px 90px color-mix(in srgb,var(--pa-primary,#9fe8ff) 16%,transparent)"},
      editorial:{radius:"14px",card_bg:"rgba(20,17,28,.92)",card_border:"rgba(235,225,250,.14)",card_shadow:"0 16px 48px rgba(0,0,0,.22)",card_hover:"0 20px 60px rgba(0,0,0,.3)"},
      minimal:{radius:"10px",card_bg:"rgba(255,255,255,.012)",card_border:"rgba(255,255,255,.06)",card_shadow:"none",card_hover:"0 10px 30px rgba(0,0,0,.16)"}
    };
    const fonts = {
      modern:{display:'"Space Grotesk",system-ui,sans-serif',body:'"Manrope",system-ui,sans-serif',mono:'"JetBrains Mono",monospace'},
      editorial:{display:'"Sora",system-ui,sans-serif',body:'"DM Sans",system-ui,sans-serif',mono:'"JetBrains Mono",monospace'},
      clean:{display:'"Inter",system-ui,sans-serif',body:'"DM Sans",system-ui,sans-serif',mono:'"JetBrains Mono",monospace'},
      neo:{display:'"Syne",system-ui,sans-serif',body:'"Inter",system-ui,sans-serif',mono:'"JetBrains Mono",monospace'},
      elegant:{display:'"Playfair Display",Georgia,serif',body:'"Manrope",system-ui,sans-serif',mono:'"JetBrains Mono",monospace'},
      technical:{display:'"IBM Plex Sans",system-ui,sans-serif',body:'"IBM Plex Sans",system-ui,sans-serif',mono:'"JetBrains Mono",monospace'}
    };
    const surface = surfaces[settings.surface_preset] || surfaces.obsidian;
    const font = fonts[settings.font_preset] || fonts.modern;
    root.style.setProperty("--pa-card-bg", settings.card_bg || surface.card_bg);
    root.style.setProperty("--pa-card-border", settings.card_border || surface.card_border);
    root.style.setProperty("--pa-card-shadow", settings.card_shadow || surface.card_shadow);
    root.style.setProperty("--pa-card-hover", settings.card_hover || surface.card_hover);
    root.style.setProperty("--pa-radius", settings.radius || surface.radius);
    root.style.setProperty("--pa-font-display", settings.font_display || font.display);
    root.style.setProperty("--pa-font-body", settings.font_body || font.body);
    root.style.setProperty("--pa-font-mono", settings.font_mono || font.mono);
    root.style.setProperty("--pa-button-text", settings.button_text || "#061018");
    root.dataset.buttonMode = ["gradient", "solid", "outline", "glass", "minimal"].includes(settings.button_mode) ? settings.button_mode : "gradient";
    root.dataset.surfacePreset = settings.surface_preset || "obsidian";
    root.dataset.fontPreset = settings.font_preset || "modern";
    try { localStorage.setItem("paAppearance", JSON.stringify({ ...settings, primary, secondary, background, text, accent, muted, text_soft: textSoft, line, line_strong: lineStrong })); } catch (_) {}
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


  /* ---------------- AUTHENTICATION ---------------- */

  async function isAdminAccount(userId) {
    const client = getSupabaseClient();
    if (!client || !userId) return false;
    try {
      const result = await client.rpc("is_admin");
      return !result.error && result.data === true;
    } catch (_) {
      return false;
    }
  }

  async function handleLoginForm(form, mode) {
    const client = getSupabaseClient() || (await ensureSupabase(), getSupabaseClient());
    if (!client) {
      const message = mode === "admin" ? $("#adminLoginMessage") : mode === "professional" ? $("#professionalLoginMessage") : $("#loginMessage");
      if (message) {
        message.textContent = "Não foi possível conectar ao sistema de login. Tente novamente.";
        message.className = "auth-message error";
      }
      return;
    }

    const emailInput = $("#email", form);
    const passwordInput = $("#senha", form);
    const message = mode === "admin" ? $("#adminLoginMessage") : mode === "professional" ? $("#professionalLoginMessage") : $("#loginMessage");
    const button = form.querySelector("button[type=submit]");
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (button) {
      button.disabled = true;
      button.textContent = mode === "admin" ? "Verificando..." : "Entrando...";
    }
    if (message) {
      message.textContent = "";
      message.className = "auth-message";
    }

    try {
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;

      const user = result.data?.user;
      if (!user) throw new Error("Sessão não criada.");

      if (mode === "admin") {
        if (!(await isAdminAccount(user.id))) {
          await client.auth.signOut();
          throw new Error("Esta conta não possui acesso administrativo.");
        }
        location.replace("admin.html");
        return;
      }

      if (mode === "professional") {
        const profileResult = await client
          .from("profile")
          .select("is_editor,is_designer,professional_login_enabled")
          .eq("id", user.id)
          .maybeSingle();

        const profile = profileResult.data;
        const enabled = profile?.professional_login_enabled === true;
        const professional = profile?.is_editor === true || profile?.is_designer === true;

        if (profileResult.error || !professional || !enabled) {
          await client.auth.signOut();
          throw new Error("Esta conta ainda não tem o login profissional liberado pela administração.");
        }

        location.replace("editor-painel.html");
        return;
      }

      location.replace((await isAdminAccount(user.id)) ? "admin.html" : "perfil.html");
    } catch (error) {
      if (message) {
        message.textContent = error?.message || "Não foi possível entrar. Confira seus dados.";
        message.className = "auth-message error";
      }
      if (button) {
        button.disabled = false;
        button.textContent = mode === "admin" ? "Entrar na administração" : mode === "professional" ? "Entrar na área profissional" : "Entrar";
      }
    }
  }

  function initLoginPages() {
    const forms = [
      [$("#loginForm"), "common"],
      [$("#professionalLoginForm"), "professional"],
      [$("#adminLoginForm"), "admin"]
    ];

    forms.forEach(([form, mode]) => {
      if (!form || form.dataset.paLoginReady === "1") return;
      form.dataset.paLoginReady = "1";
      form.addEventListener("submit", event => {
        event.preventDefault();
        handleLoginForm(form, mode);
      });
    });
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
      initLoginPages();
      loadProfessionalDirectory();
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
    initLoginPages();
    loadProfessionalDirectory();
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
