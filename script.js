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

  function initPublicContentRealtime(sb) {
    if (!sb || window.__PA_PUBLIC_REALTIME__) return;
    window.__PA_PUBLIC_REALTIME__ = true;
    try {
      sb.channel("pa-public-content")
        .on("postgres_changes", { event: "*", schema: "public", table: "profile" }, () => loadProfessionalDirectory())
        .on("postgres_changes", { event: "*", schema: "public", table: "editor_portfolio_items" }, () => loadProfessionalDirectory())
        .subscribe();
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && document.getElementById("editorsGrid")) loadProfessionalDirectory();
      });
    } catch (error) {
      console.warn("[Pale Ascendancy] realtime indisponível:", error);
    }
  }

  async function fetchPublicProfessionals(sb) {
    const viewResult = await sb.from("editor_directory")
      .select("id,nome_artistico,especialidade,bio,avatar_url,tiktok,instagram,youtube,discord,editor_categories,portfolio_url,editor_software,availability,is_featured,is_editor,is_designer")
      .order("is_featured", { ascending: false })
      .order("nome_artistico", { ascending: true });

    if (!viewResult.error) return { data: viewResult.data || [], error: null };

    const direct = await sb.from("profile")
      .select("id,nome,nome_artistico,email,especialidade,bio,avatar_url,tiktok,instagram,youtube,discord,editor_categories,portfolio_url,editor_software,availability,is_featured,is_editor,is_designer,is_public")
      .or("is_editor.eq.true,is_designer.eq.true")
      .order("is_featured", { ascending: false })
      .order("nome_artistico", { ascending: true });

    if (direct.error) return { data: [], error: direct.error };
    return { data: (direct.data || []).filter(p => p.is_public !== false), error: null };
  }

  async function loadProfessionalDirectory() {
    const grid = $("#editorsGrid");
    if (!grid) return;

    const reels = $("#portfolioReels");
    grid.innerHTML = '<div class="professional-loading">Carregando profissionais...</div>';
    if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Carregando trabalhos...</div>';

    const sb = getSupabaseClient() || (await ensureSupabase(), getSupabaseClient());
    if (!sb) {
      grid.innerHTML = '<div class="professional-loading">Não foi possível conectar à rede profissional.</div>';
      if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Não foi possível carregar os trabalhos.</div>';
      return;
    }

    initPublicContentRealtime(sb);
    const professionals = await fetchPublicProfessionals(sb);
    const approved = professionals.data || [];

    if (professionals.error) {
      console.error("[Pale Ascendancy] directory:", professionals.error);
      grid.innerHTML = '<div class="professional-loading">Não foi possível carregar os profissionais agora.</div>';
      if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Não foi possível carregar os trabalhos agora.</div>';
      return;
    }

    if (!approved.length) {
      grid.innerHTML = '<div class="professional-loading">Ainda não há profissionais publicados na rede.</div>';
    } else {
      grid.innerHTML = approved.map((profile) => {
        const name = profile.nome_artistico || profile.nome || "Profissional";
        const categories = [profile.especialidade, ...(Array.isArray(profile.editor_categories) ? profile.editor_categories : [])]
          .filter(Boolean).map(String);
        const tags = [...new Set(categories)].slice(0, 5)
          .map((item) => `<span class="editor-tag">${escapeHTML(PROFESSIONAL_CATEGORY_MAP[item] || item)}</span>`)
          .join("");
        const avatar = profile.avatar_url
          ? `<img class="editor-avatar editor-photo" src="${escapeHTML(profile.avatar_url)}" alt="Foto de perfil de ${escapeHTML(name)}" loading="lazy">`
          : `<div class="editor-avatar placeholder-icon">${escapeHTML(name.charAt(0).toUpperCase())}</div>`;
        const role = professionalRole(profile);
        const searchText = `${name} ${profile.especialidade || ""} ${categories.join(" ")} ${profile.bio || ""} ${profile.editor_software || ""}`.toLowerCase();

        return `<article class="editor-profile dynamic-professional" data-profile-id="${escapeHTML(profile.id)}" data-category="${escapeHTML(categories.join(" ").toLowerCase())}" data-search="${escapeHTML(searchText)}">
          <div class="editor-status"><span class="status-dot" aria-hidden="true"></span>${escapeHTML(profile.is_featured ? "Destaque" : professionalAvailability(profile.availability))}</div>
          ${avatar}
          <h2>${escapeHTML(name)}</h2>
          <div class="editor-role">${escapeHTML(role)}</div>
          <p class="editor-description">${escapeHTML(profile.bio || `${role.toLowerCase()} com foco em ${PROFESSIONAL_CATEGORY_MAP[profile.especialidade] || profile.especialidade || "criação audiovisual"}.`)}</p>
          <div class="editor-tags">${tags || '<span class="editor-tag">Portfólio</span>'}${profile.is_featured ? '<span class="editor-tag">Destaque</span>' : ''}</div>
          <div class="editor-footer"><a class="card-link" href="editor-perfil.html?id=${encodeURIComponent(profile.id)}">Ver perfil →</a></div>
        </article>`;
      }).join("");
    }

    initEditorPhotos();
    window.__PA_EDITOR_FILTER_APPLY__?.();

    if (!reels) return;

    const { data: items, error: itemError } = await sb.from("editor_portfolio_items")
      .select("id,editor_id,title,description,item_type,url,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (itemError) {
      console.error("[Pale Ascendancy] portfolio:", itemError);
      reels.innerHTML = '<div class="portfolio-reels-empty">Os trabalhos não puderam ser carregados. Verifique a configuração do portfólio no Supabase.</div>';
      return;
    }

    const publicIds = new Set(approved.map(p => p.id));
    const profileMap = new Map(approved.map(p => [p.id, p]));
    const validItems = (items || [])
      .filter(item => publicIds.has(item.editor_id))
      .map(item => ({ ...item, profile: profileMap.get(item.editor_id) }));

    if (!validItems.length) {
      reels.innerHTML = '<div class="portfolio-reels-empty"><strong>Portfólio em destaque</strong><span>Os trabalhos publicados pelos profissionais aparecerão aqui.</span></div>';
      return;
    }

    reels.innerHTML = validItems.map((item) => {
      const profile = item.profile || {};
      const name = profile.nome_artistico || profile.nome || "Profissional";
      const typeLabel = item.item_type === "video" ? "Vídeo" : item.item_type === "image" ? "Arte" : "Projeto";
      const media = portfolioMediaMarkup(item);

      return `<article class="portfolio-reel-card">
        <div class="portfolio-reel-visual">
          <a class="portfolio-reel-media" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${escapeHTML(item.title || "projeto")}">${media}</a>
          <div class="portfolio-reel-gradient"></div>
          <div class="portfolio-reel-play" aria-hidden="true">↗</div>
          <div class="portfolio-reel-overlay">
            <span>${escapeHTML(name)}</span>
            <strong>${escapeHTML(item.title || "Projeto")}</strong>
          </div>
        </div>
        <div class="portfolio-reel-copy">
          <strong>${escapeHTML(item.title || "Projeto")}</strong>
          <span>${escapeHTML(name)} · ${typeLabel}</span>
          ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}
          <a class="portfolio-reel-link-button" href="editor-perfil.html?id=${encodeURIComponent(profile.id)}">Ver profissional</a>
        </div>
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
        const { data } = await sb.from("site_settings").select("theme").eq("id", "global").maybeSingle();
        if (data?.theme) applySiteAppearance(data.theme);
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


  /* ---------------- AUTH COMPATIBILITY — V27 LINEAGE ---------------- */

  async function authClient() {
    if (!getSupabaseClient()) await ensureSupabase();
    return getSupabaseClient();
  }

  async function authProfile(userId) {
    const c = await authClient();
    if (!c || !userId) return null;
    try {
      const { data } = await c.from("profile").select("id,email,nome,nome_artistico,avatar_url,is_editor,is_designer,is_featured,professional_login_enabled").eq("id", userId).maybeSingle();
      return data || null;
    } catch (_) { return null; }
  }

  async function authIsAdmin(userId) {
    const c = await authClient();
    if (!c || !userId) return false;
    try {
      const { data, error } = await c.rpc("is_admin");
      return !error && data === true;
    } catch (_) { return false; }
  }

  function authMessage(id, text, type = "") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || "";
    el.className = `auth-message${type ? ` ${type}` : ""}`;
  }

  async function syncProfessionalApplication(c, user) {
    if (!c || !user?.id) return { ok: false, pending: false };
    const meta = user.user_metadata || {};
    if (meta.professional_application !== true) return { ok: true, pending: false };
    const requestedRole = meta.requested_role || "editor";
    const patch = {
      nome: meta.nome || undefined,
      nome_artistico: meta.nome_artistico || undefined,
      especialidade: meta.especialidade || undefined,
      is_editor: requestedRole === "editor" || requestedRole === "editor_designer",
      is_designer: requestedRole === "designer" || requestedRole === "editor_designer",
      professional_login_enabled: false,
      is_public: false
    };
    Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
    try {
      const { data, error } = await c.from("profile").update(patch).eq("id", user.id).select("id,is_editor,is_designer,professional_login_enabled,is_public,especialidade,nome,nome_artistico").maybeSingle();
      if (error) return { ok: false, pending: false, error };
      return { ok: true, pending: true, profile: data || null };
    } catch (error) {
      return { ok: false, pending: false, error };
    }
  }

  async function authHandleLogin(form, mode) {
    const c = await authClient();
    if (!c) { authMessage(mode === "admin" ? "adminLoginMessage" : mode === "professional" ? "professionalLoginMessage" : "loginMessage", "Não foi possível conectar ao serviço de autenticação.", "error"); return; }
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("senha")?.value || "";
    const messageId = mode === "admin" ? "adminLoginMessage" : mode === "professional" ? "professionalLoginMessage" : "loginMessage";
    const button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = mode === "admin" ? "Verificando..." : "Entrando..."; }
    authMessage(messageId, "");
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) {
      authMessage(messageId, "E-mail ou senha incorretos, ou conta não confirmada.", "error");
      if (button) { button.disabled = false; button.textContent = mode === "admin" ? "Entrar na administração" : mode === "professional" ? "Entrar na área profissional" : "Entrar"; }
      return;
    }
    const user = data?.user;
    if (!user) return;
    if (mode === "admin") {
      if (!(await authIsAdmin(user.id))) {
        await c.auth.signOut();
        authMessage(messageId, "Esta conta não possui acesso administrativo.", "error");
        if (button) { button.disabled = false; button.textContent = "Entrar na administração"; }
        return;
      }
      location.replace("admin.html");
      return;
    }
    if (mode === "professional") {
      await syncProfessionalApplication(c, user);
      const p = await authProfile(user.id);
      if (!(p?.professional_login_enabled && (p?.is_editor || p?.is_designer))) {
        await c.auth.signOut();
        authMessage(messageId, "A conta ainda não foi aprovada como profissional.", "error");
        if (button) { button.disabled = false; button.textContent = "Entrar na área profissional"; }
        return;
      }
      location.replace("editor-painel.html");
      return;
    }
    location.replace((await authIsAdmin(user.id)) ? "admin.html" : "perfil.html");
  }

  function authInitLoginPages() {
    const common = document.getElementById("loginForm");
    if (common && common.dataset.paAuthReady !== "1") {
      common.dataset.paAuthReady = "1";
      common.addEventListener("submit", (e) => { e.preventDefault(); authHandleLogin(common, "common"); });
    }
    const professional = document.getElementById("professionalLoginForm");
    if (professional && professional.dataset.paAuthReady !== "1") {
      professional.dataset.paAuthReady = "1";
      professional.addEventListener("submit", (e) => { e.preventDefault(); authHandleLogin(professional, "professional"); });
    }
    const admin = document.getElementById("adminLoginForm");
    if (admin && admin.dataset.paAuthReady !== "1") {
      admin.dataset.paAuthReady = "1";
      admin.addEventListener("submit", (e) => { e.preventDefault(); authHandleLogin(admin, "admin"); });
    }
  }

  const AUTH_CATEGORIES = [
    ["trailer", "Trailers"], ["highlight", "Highlights"], ["motion", "Motion Design"], ["anime", "Anime / Mangá"],
    ["gaming", "Gaming"], ["tiktok", "TikTok"], ["reels", "Reels"], ["amv", "AMV"], ["thumbnail", "Thumbnails"],
    ["youtube", "YouTube"], ["promo", "Promo"], ["design", "Design Gráfico"], ["branding", "Branding"], ["uiux", "UI / UX"],
    ["illustration", "Ilustração"], ["3d", "3D"], ["outros", "Outros"]
  ];

  function authCategoryButtons(holder, selected = "") {
    if (!holder) return;
    if (holder.tagName === "SELECT") {
      holder.innerHTML = AUTH_CATEGORIES.map(([value, label]) =>
        `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`
      ).join("");
      holder.value = selected || "";
      const sync = () => {
        const hidden = holder.parentElement?.querySelector("#especialidade");
        if (hidden) hidden.value = holder.value || "";
      };
      holder.addEventListener("change", sync);
      sync();
      return;
    }
    holder.innerHTML = AUTH_CATEGORIES.map(([value, label]) =>
      `<button type="button" class="category-choice ${selected === value ? "selected" : ""}" data-v="${value}">${label}</button>`
    ).join("");
    holder.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      [...holder.querySelectorAll("button")].forEach(x => x.classList.remove("selected"));
      b.classList.add("selected");
      const hidden = holder.parentElement?.querySelector("#especialidade");
      if (hidden) hidden.value = b.dataset.v || "";
    };
  }

  function authSelectedCategory(holder) {
    if (!holder) return "";
    if (holder.tagName === "SELECT") return holder.value || "";
    return holder.querySelector("button.selected")?.dataset.v || "";
  }

  function authFileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function authInitRegisterPages() {
    const form = document.getElementById("registerForm");
    if (form && form.dataset.paAuthReady !== "1") {
      form.dataset.paAuthReady = "1";
      const holder = document.getElementById("categoryChoices");
      authCategoryButtons(holder);
      const file = document.getElementById("signupAvatar");
      const image = document.getElementById("signupImage");
      const initial = document.getElementById("signupInitial");
      file?.addEventListener("change", () => {
        const f = file.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { authMessage("registerMessage", "A foto precisa ter até 5 MB.", "error"); file.value = ""; return; }
        if (image) { image.src = URL.createObjectURL(f); image.hidden = false; }
        if (initial) initial.hidden = true;
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const c = await authClient();
        const button = document.getElementById("registerButton");
        const category = authSelectedCategory(holder) || document.getElementById("especialidade")?.value || "";
        const accepted = document.getElementById("termos")?.checked;
        if (!accepted) { authMessage("registerMessage", "Aceite os termos para continuar.", "error"); return; }
        if (!c) { authMessage("registerMessage", "Serviço de autenticação indisponível.", "error"); return; }
        if (button) { button.disabled = true; button.textContent = "Criando..."; }
        const { data, error } = await c.auth.signUp({
          email: document.getElementById("email")?.value.trim(),
          password: document.getElementById("senha")?.value || "",
          options: { emailRedirectTo: new URL("perfil.html", location.href).href, data: {
            nome: document.getElementById("nome")?.value.trim(), nome_artistico: document.getElementById("nomeArtistico")?.value.trim(),
            especialidade: category, professional_application: false, requested_role: null
          }}
        });
        if (error) {
          authMessage("registerMessage", error.message || "Não foi possível criar a conta.", "error");
          if (button) { button.disabled = false; button.textContent = "Criar conta"; }
          return;
        }
        const avatar = file?.files?.[0];
        if (avatar) { try { localStorage.setItem("pa_pending_signup_avatar", await authFileToDataURL(avatar)); } catch (_) {} }
        authMessage("registerMessage", data?.session ? "Conta criada. Abrindo seu perfil..." : "Conta criada. Confirme seu e-mail e depois entre para concluir o perfil.", "success");
        if (data?.session) setTimeout(() => location.replace("perfil.html"), 500);
        else if (button) { button.disabled = false; button.textContent = "Criar conta"; }
      });
    }

    const professional = document.getElementById("professionalRegisterForm");
    if (professional && professional.dataset.paAuthReady !== "1") {
      professional.dataset.paAuthReady = "1";
      const holder = document.getElementById("categoryChoices");
      authCategoryButtons(holder);
      professional.addEventListener("submit", async (e) => {
        e.preventDefault();
        const c = await authClient();
        const button = document.getElementById("professionalRegisterButton");
        const requestedRole = document.getElementById("tipo")?.value || "editor";
        const category = authSelectedCategory(holder) || document.getElementById("especialidade")?.value || "";
        if (!c) { authMessage("professionalRegisterMessage", "Serviço de autenticação indisponível.", "error"); return; }
        if (button) { button.disabled = true; button.textContent = "Enviando..."; }
        const { data, error } = await c.auth.signUp({
          email: document.getElementById("email")?.value.trim(), password: document.getElementById("senha")?.value || "",
          options: { emailRedirectTo: new URL("login-profissional.html", location.href).href, data: {
            nome: document.getElementById("nome")?.value.trim(), nome_artistico: document.getElementById("nomeArtistico")?.value.trim(),
            especialidade: category, professional_application: true, requested_role: requestedRole
          }}
        });
        if (error) {
          authMessage("professionalRegisterMessage", error.message || "Não foi possível enviar a candidatura.", "error");
          if (button) { button.disabled = false; button.textContent = "Criar acesso profissional"; }
          return;
        }
        if (data?.user) {
          try {
            localStorage.setItem("pa_pending_professional_application", JSON.stringify({
              professional_application: true,
              requested_role: requestedRole,
              especialidade: category,
              nome: document.getElementById("nome")?.value.trim() || "",
              nome_artistico: document.getElementById("nomeArtistico")?.value.trim() || ""
            }));
          } catch (_) {}
        }
        if (data?.session && data?.user) {
          await syncProfessionalApplication(c, data.user);
          authMessage("professionalRegisterMessage", "Solicitação enviada. Aguarde a aprovação da administração.", "success");
        } else {
          authMessage("professionalRegisterMessage", "Solicitação registrada. Confirme seu e-mail e depois entre em Já tenho acesso profissional para concluir o envio.", "success");
        }
        if (button) { button.disabled = false; button.textContent = "Criar acesso profissional"; }
      });
    }
  }


  /* ---------------- PROFILE / PROFESSIONAL PAGES ---------------- */

  async function uploadAvatar(c, userId, file) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const result = await c.storage.from("avatars").upload(path, file, {
      upsert: false, contentType: file.type, cacheControl: "3600"
    });
    if (result.error) throw result.error;
    return c.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function finishPendingAvatar(c, userId) {
    const raw = read("pa_pending_signup_avatar", "");
    if (!raw) return null;
    try {
      const response = await fetch(raw);
      const blob = await response.blob();
      const url = await uploadAvatar(c, userId, blob);
      const update = await c.from("profile").update({ avatar_url: url }).eq("id", userId);
      if (update.error) throw update.error;
      localStorage.removeItem("pa_pending_signup_avatar");
      return url;
    } catch (error) {
      console.warn("[Pale Ascendancy] pending avatar:", error);
      return null;
    }
  }

  async function ensureOwnProfile(c, user) {
    if (!c || !user) return null;

    const result = await c.from("profile")
      .select("id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,professional_login_enabled,professional_plan,portfolio_limit,plan_status,plan_expires_at")
      .eq("id", user.id).maybeSingle();

    if (result.data) return result.data;

    const meta = user.user_metadata || {};
    const payload = {
      id: user.id, email: user.email || "",
      nome: meta.nome || "", nome_artistico: meta.nome_artistico || "",
      especialidade: meta.especialidade || ""
    };

    const inserted = await c.from("profile").upsert(payload, { onConflict: "id" })
      .select("id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,professional_login_enabled,professional_plan,portfolio_limit,plan_status,plan_expires_at")
      .maybeSingle();

    return inserted.data || null;
  }

  async function initCommonProfile() {
    const view = $("#profileView");
    if (!view || view.dataset.paReady === "1") return;
    view.dataset.paReady = "1";
    view.hidden = true;

    const c = await authClient();
    if (!c) { location.replace("login.html"); return; }

    try {
      const { data } = await c.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        localStorage.removeItem(STORE.profile);
        location.replace("login.html");
        return;
      }

      let p = await ensureOwnProfile(c, user);
      if (!p) {
        authMessage("profileMessage", "Não foi possível carregar sua conta. Tente novamente.", "error");
        view.hidden = false;
        return;
      }

      const pendingAvatar = await finishPendingAvatar(c, user.id);
      if (pendingAvatar) p.avatar_url = pendingAvatar;

      $("#profileNome").textContent = p.nome || "Não informado";
      $("#profileNomeArtistico").textContent = p.nome_artistico || "Não informado";
      $("#profileEmail").textContent = p.email || user.email || "Não informado";
      $("#profileEspecialidade").textContent = PROFESSIONAL_CATEGORY_MAP[p.especialidade] || p.especialidade || "Não informado";

      const initial = $("#profileInitial");
      const image = $("#profileImage");
      const displayName = p.nome_artistico || p.nome || p.email || "?";
      if (initial) initial.textContent = displayName.charAt(0).toUpperCase();

      if (image && p.avatar_url) {
        image.src = `${p.avatar_url}${p.avatar_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
        image.hidden = false;
        if (initial) initial.hidden = true;
      } else if (image) {
        image.hidden = true;
        image.removeAttribute("src");
        if (initial) initial.hidden = false;
      }

      const admin = await authIsAdmin(user.id);
      const professional = !!(p.professional_login_enabled && (p.is_editor || p.is_designer));

      const adminButton = $("#profileAdminButton");
      const professionalButton = $("#profileProfessionalButton");
      const specialActions = $("#profileSpecialActions");
      if (adminButton) adminButton.hidden = !admin;
      if (professionalButton) professionalButton.hidden = !professional;
      if (specialActions) specialActions.hidden = !(admin || professional);

      $("#logoutButton")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "Saindo...";
        try { await c.auth.signOut(); }
        finally {
          localStorage.removeItem(STORE.profile);
          location.replace("index.html");
        }
      });

      view.hidden = false;
    } catch (error) {
      console.error("[Pale Ascendancy] profile:", error);
      location.replace("login.html");
    }
  }

  async function initEditProfile() {
    const form = $("#editForm");
    if (!form || form.dataset.paReady === "1") return;
    form.dataset.paReady = "1";

    const c = await authClient();
    if (!c) { location.replace("login.html"); return; }

    const { data } = await c.auth.getSession();
    const user = data?.session?.user;
    if (!user) { location.replace("login.html"); return; }

    const p = await ensureOwnProfile(c, user);
    if (!p) { authMessage("message", "Perfil não encontrado.", "error"); return; }

    $("#nome").value = p.nome || "";
    $("#nomeArtistico").value = p.nome_artistico || "";
    $("#especialidade").value = p.especialidade || "";

    const image = $("#image"), initial = $("#initial");
    initial.textContent = (p.nome_artistico || p.nome || "?").charAt(0).toUpperCase();
    if (p.avatar_url) {
      image.src = `${p.avatar_url}${p.avatar_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      image.hidden = false; initial.hidden = true;
    }

    let avatarUrl = p.avatar_url || null;
    $("#photo")?.addEventListener("change", () => {
      const file = $("#photo").files?.[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        authMessage("message", "A foto precisa ter até 8 MB.", "error");
        $("#photo").value = ""; return;
      }
      image.src = URL.createObjectURL(file); image.hidden = false; initial.hidden = true;
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true; authMessage("message", "Salvando...");
      try {
        const file = $("#photo").files?.[0];
        if (file) avatarUrl = await uploadAvatar(c, user.id, file);
        const update = await c.from("profile").update({
          nome: $("#nome").value.trim(),
          nome_artistico: $("#nomeArtistico").value.trim(),
          especialidade: $("#especialidade").value || "",
          avatar_url: avatarUrl
        }).eq("id", user.id);
        if (update.error) throw update.error;
        authMessage("message", "Perfil atualizado.", "success");
        setTimeout(() => location.replace("perfil.html"), 500);
      } catch (error) {
        authMessage("message", error.message || "Não foi possível salvar.", "error");
        button.disabled = false;
      }
    });
  }

  function buildProfessionalCategories(holder, selected = []) {
    if (!holder) return;
    const values = new Set(Array.isArray(selected) ? selected : []);
    holder.innerHTML = AUTH_CATEGORIES.map(([value, label]) =>
      `<label class="check-chip"><input type="checkbox" value="${value}" ${values.has(value) ? "checked" : ""}><span>${label}</span></label>`
    ).join("");
  }

  function selectedProfessionalCategories(holder) {
    return $$("input[type=checkbox]:checked", holder).map(input => input.value);
  }

  async function initEditorPanel() {
    const form = $("#editorForm");
    if (!form || form.dataset.paReady === "1") return;
    form.dataset.paReady = "1";

    const c = await authClient();
    if (!c) { location.replace("login-profissional.html"); return; }
    const { data } = await c.auth.getSession();
    const user = data?.session?.user;
    if (!user) { location.replace("login-profissional.html"); return; }

    const p = await authProfile(user.id);
    if (!p || !p.professional_login_enabled || !(p.is_editor || p.is_designer)) {
      await c.auth.signOut();
      location.replace("login-profissional.html");
      return;
    }

    const result = await c.from("profile")
      .select("id,email,nome,nome_artistico,especialidade,bio,avatar_url,is_editor,is_designer,is_featured,editor_categories,portfolio_url,editor_software,availability,professional_plan,portfolio_limit,plan_status,plan_expires_at,tiktok,instagram,youtube,discord,professional_login_enabled")
      .eq("id", user.id).maybeSingle();
    const pData = result.data || p;

    const role = pData.is_editor && pData.is_designer ? "Editor + Designer" : pData.is_designer ? "Designer" : "Editor";
    $("#role").value = role;
    $("#nomeArtistico").value = pData.nome_artistico || "";
    $("#especialidade").innerHTML = AUTH_CATEGORIES.map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
    $("#especialidade").value = pData.especialidade || "";
    $("#bio").value = pData.bio || "";
    $("#software").value = pData.editor_software || "";
    $("#availability").value = pData.availability || "disponivel";
    $("#portfolioUrl").value = pData.portfolio_url || "";
    $("#tiktok").value = pData.tiktok || "";
    $("#instagram").value = pData.instagram || "";
    $("#youtube").value = pData.youtube || "";
    $("#discord").value = pData.discord || "";

    buildProfessionalCategories($("#categoryGrid"), pData.editor_categories || []);

    const initial = $("#avatarInitial"), image = $("#avatarImage");
    initial.textContent = (pData.nome_artistico || pData.nome || "?").charAt(0).toUpperCase();
    if (pData.avatar_url) {
      image.src = `${pData.avatar_url}${pData.avatar_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      image.hidden = false; initial.hidden = true;
    }

    $("#publicProfile").href = `editor-perfil.html?id=${encodeURIComponent(user.id)}`;

    const plan = ({free:["Gratuito",2],premium:["Premium",5],pro:["Pro",10],studio:["Studio",20],elite:["Elite",40]})[pData.professional_plan] || ["Gratuito",2];
    $("#planName").textContent = plan[0];
    $("#limit").textContent = plan[1];
    $("#planDesc").textContent = `${plan[1]} espaços de portfólio${pData.plan_status === "active" && pData.professional_plan !== "free" ? " ativos" : ""}`;

    await loadPortfolioManager(c, user.id, plan[1]);

    $("#avatarFile")?.addEventListener("change", async () => {
      const file = $("#avatarFile").files?.[0];
      if (!file) return;
      try {
        if (file.size > 8 * 1024 * 1024) throw new Error("A foto precisa ter até 8 MB.");
        $("#avatarStatus").textContent = "Enviando...";
        const url = await uploadAvatar(c, user.id, file);
        const update = await c.from("profile").update({ avatar_url: url }).eq("id", user.id);
        if (update.error) throw update.error;
        image.src = `${url}?v=${Date.now()}`; image.hidden = false; initial.hidden = true;
        $("#avatarStatus").textContent = "Foto atualizada.";
      } catch (error) { $("#avatarStatus").textContent = error.message || "Erro ao enviar foto."; }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = $("#saveEditor"); button.disabled = true;
      authMessage("editorMessage", "Salvando...");
      const update = await c.from("profile").update({
        nome_artistico: $("#nomeArtistico").value.trim(),
        especialidade: $("#especialidade").value,
        editor_categories: selectedProfessionalCategories($("#categoryGrid")),
        bio: $("#bio").value.trim(),
        editor_software: $("#software").value.trim(),
        availability: $("#availability").value,
        portfolio_url: $("#portfolioUrl").value.trim(),
        tiktok: $("#tiktok").value.trim(),
        instagram: $("#instagram").value.trim(),
        youtube: $("#youtube").value.trim(),
        discord: $("#discord").value.trim()
      }).eq("id", user.id);

      if (update.error) {
        authMessage("editorMessage", update.error.message, "error");
        button.disabled = false; return;
      }
      authMessage("editorMessage", "Perfil profissional salvo.", "success");
      button.disabled = false;
      loadProfessionalDirectory();
    });
  }

  async function loadPortfolioManager(c, userId, limit) {
    const list = $("#portfolioList");
    if (!list) return;
    const result = await c.from("editor_portfolio_items")
      .select("id,title,description,item_type,url,sort_order,created_at")
      .eq("editor_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (result.error) {
      list.innerHTML = `<div class="portfolio-empty">${escapeHTML(result.error.message)}</div>`;
      return;
    }

    const items = result.data || [];
    $("#count").textContent = items.length; $("#limit").textContent = limit;
    list.innerHTML = items.map(item => {
      const media = item.item_type === "video"
        ? `<video src="${escapeHTML(item.url)}" controls playsinline preload="metadata"></video>`
        : item.item_type === "image"
          ? `<img src="${escapeHTML(item.url)}" alt="${escapeHTML(item.title)}">`
          : `<div class="portfolio-link-preview"><span>↗</span><strong>Projeto externo</strong><small>${escapeHTML(item.url)}</small></div>`;
      return `<article class="portfolio-manager-item"><div class="portfolio-manager-media">${media}</div><div class="portfolio-manager-copy"><span class="portfolio-type-label">${item.item_type === "video" ? "VÍDEO" : item.item_type === "image" ? "ARTE" : "LINK"}</span><h3>${escapeHTML(item.title)}</h3>${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}<div class="portfolio-item-actions">${item.item_type === "link" ? `<a class="secondary-button" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ""}<button type="button" class="secondary-button danger-button portfolio-delete" data-id="${escapeHTML(item.id)}">Excluir</button></div></div></article>`;
    }).join("") || `<div class="portfolio-empty"><strong>Nenhum trabalho ainda.</strong><span>Adicione seu primeiro projeto para começar a montar seu portfólio.</span></div>`;

    $$(".portfolio-delete", list).forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Excluir este item do portfólio?")) return;
      button.disabled = true;
      const del = await c.from("editor_portfolio_items").delete().eq("id", button.dataset.id).eq("editor_id", userId);
      if (del.error) { authMessage("portfolioMessage", del.error.message, "error"); button.disabled = false; return; }
      await loadPortfolioManager(c, userId, limit);
      loadProfessionalDirectory();
    }));
  }

  function initPortfolioForm() {
    const form = $("#portfolioForm");
    if (!form || form.dataset.paReady === "1") return;
    form.dataset.paReady = "1";

    const type = $("#itemType"), fileRow = $("#itemFileRow"), urlRow = $("#itemUrlRow");
    const fileInput = $("#itemFile"), urlInput = $("#itemUrl");
    const toggle = () => {
      const isLink = type.value === "link";
      fileRow.hidden = isLink; urlRow.hidden = !isLink;
      fileInput.required = !isLink; urlInput.required = isLink;
    };
    type.addEventListener("change", toggle); toggle();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const c = await authClient();
      const sessionResult = await c?.auth.getSession();
      const user = sessionResult?.data?.session?.user;
      if (!user) { location.replace("login-profissional.html"); return; }

      const button = $("#addPortfolio");
      button.disabled = true; authMessage("portfolioMessage", "Enviando trabalho...");
      try {
        const title = $("#itemTitle").value.trim();
        const description = $("#itemDesc").value.trim();
        const itemType = type.value;
        let url = urlInput.value.trim();

        if (!title) throw new Error("Informe um título.");
        if (itemType !== "link") {
          const file = fileInput.files?.[0];
          if (!file) throw new Error("Escolha um arquivo.");
          if (file.size > 50 * 1024 * 1024) throw new Error("O arquivo precisa ter até 50 MB.");
          if (itemType === "video" && !/^video\/(mp4|webm)$/i.test(file.type)) throw new Error("Use MP4 ou WebM para vídeos.");
          if (itemType === "image" && !/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Use JPG, PNG ou WebP para imagens.");

          const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
          const upload = await c.storage.from("portfolio").upload(path, file, {
            upsert: false, contentType: file.type, cacheControl: "31536000"
          });
          if (upload.error) throw upload.error;
          url = c.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
        }

        const insert = await c.from("editor_portfolio_items").insert({
          editor_id: user.id, title, description, item_type: itemType, url, sort_order: Date.now()
        });
        if (insert.error) throw insert.error;

        form.reset(); toggle();
        authMessage("portfolioMessage", "Trabalho publicado no portfólio.", "success");

        const p = await authProfile(user.id);
        const limit = ({free:2,premium:5,pro:10,studio:20,elite:40})[p?.professional_plan] || 2;
        await loadPortfolioManager(c, user.id, limit);
        loadProfessionalDirectory();
      } catch (error) {
        console.error("[Pale Ascendancy] portfolio upload:", error);
        authMessage("portfolioMessage", error.message || "Não foi possível publicar o trabalho.", "error");
      } finally { button.disabled = false; }
    });
  }

  async function initPublicEditorProfile() {
    const root = $("#publicProfile");
    if (!root || root.dataset.paReady === "1") return;
    root.dataset.paReady = "1";

    const c = await authClient();
    if (!c) return;
    const id = new URLSearchParams(location.search).get("id");
    if (!id) { $("#profileContent").innerHTML = `<div class="admin-empty">Profissional não encontrado.</div>`; return; }

    let result = await c.from("editor_directory").select("*").eq("id", id).maybeSingle();
    if (result.error) {
      result = await c.from("profile")
        .select("id,nome,nome_artistico,email,especialidade,bio,avatar_url,is_editor,is_designer,is_featured,editor_categories,portfolio_url,editor_software,availability,professional_plan,plan_status,plan_expires_at,is_public,tiktok,instagram,youtube,discord")
        .eq("id", id).maybeSingle();
    }

    const p = result.data;
    if (result.error || !p || p.is_public === false || !(p.is_editor || p.is_designer)) {
      $("#profileContent").innerHTML = `<div class="admin-empty">Profissional não encontrado ou não publicado.</div>`;
      return;
    }

    const itemResult = await c.from("editor_portfolio_items")
      .select("id,title,description,item_type,url,sort_order,created_at")
      .eq("editor_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const items = itemResult.data || [];
    const cats = (p.editor_categories?.length ? p.editor_categories : [p.especialidade]).filter(Boolean);
    const planName = ({free:"Gratuito",premium:"Premium",pro:"Pro",studio:"Studio",elite:"Elite"})[p.professional_plan] || "Gratuito";

    const portfolio = items.map(item => {
      if (item.item_type === "video") return `<article class="portfolio-public-item"><div class="portfolio-public-media"><video src="${escapeHTML(item.url)}" controls playsinline preload="metadata"></video></div><div class="portfolio-public-copy"><span class="portfolio-type-label">VÍDEO</span><h3>${escapeHTML(item.title)}</h3>${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}</div></article>`;
      if (item.item_type === "image") return `<article class="portfolio-public-item"><div class="portfolio-public-media"><img src="${escapeHTML(item.url)}" alt="${escapeHTML(item.title)}" loading="lazy"></div><div class="portfolio-public-copy"><span class="portfolio-type-label">ARTE</span><h3>${escapeHTML(item.title)}</h3>${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}</div></article>`;
      return `<article class="portfolio-public-item"><div class="portfolio-public-link"><span>↗</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.url)}</small></div><div class="portfolio-public-copy">${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}<a class="secondary-button" target="_blank" rel="noopener noreferrer" href="${escapeHTML(item.url)}">Abrir projeto</a></div></article>`;
    }).join("");

    $("#profileContent").innerHTML = `
      <div class="editor-public-top">
        <div class="editor-public-avatar">${p.avatar_url ? `<img src="${escapeHTML(p.avatar_url)}" alt="Foto de ${escapeHTML(p.nome_artistico || "profissional")}">` : `<span>${escapeHTML((p.nome_artistico || p.nome || "P").charAt(0).toUpperCase())}</span>`}</div>
        <div><p class="editor-role">${escapeHTML(professionalRole(p))}</p><h1>${escapeHTML(p.nome_artistico || p.nome || "Profissional")}</h1><span class="plan-badge">${escapeHTML(planName)}</span></div>
      </div>
      <div class="editor-tags">${cats.map(x => `<span class="editor-tag">${escapeHTML(PROFESSIONAL_CATEGORY_MAP[x] || x)}</span>`).join("")}</div>
      <p class="editor-public-bio">${escapeHTML(p.bio || "Este profissional ainda não adicionou uma descrição.")}</p>
      <div class="profile-info"><span class="profile-label">Programas</span><strong>${escapeHTML(p.editor_software || "Não informado")}</strong></div>
      <div class="profile-info"><span class="profile-label">Disponibilidade</span><strong>${escapeHTML(professionalAvailability(p.availability))}</strong></div>
      <div class="profile-socials">${socialButton("TikTok",p.tiktok)}${socialButton("Instagram",p.instagram)}${socialButton("YouTube",p.youtube)}${socialButton("Portfólio",p.portfolio_url)}${p.discord ? `<span class="secondary-button">Discord: ${escapeHTML(p.discord)}</span>` : ""}</div>
      <section class="portfolio-public-section"><div class="section-heading"><p class="eyebrow">Portfólio</p><h2>Trabalhos em destaque.</h2></div><div class="portfolio-public-grid">${portfolio || `<div class="portfolio-public-empty"><strong>Nenhum trabalho publicado.</strong><span>Este profissional ainda está montando o portfólio.</span></div>`}</div></section>
      <div class="editor-public-actions"><a class="secondary-button" href="editores.html">Voltar para profissionais</a></div>`;
  }

  function socialButton(label, url) {
    return url ? `<a class="secondary-button" target="_blank" rel="noopener noreferrer" href="${escapeHTML(url)}">${escapeHTML(label)}</a>` : "";
  }

  function boot() {
    authInitLoginPages();
    authInitRegisterPages();
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    initMobileMenu();
    initNavigation();
    initEditorTools();
    initEditorPhotos();
    loadProfessionalDirectory();
    initCommonProfile();
    initEditProfile();
    initEditorPanel();
    initPortfolioForm();
    initPublicEditorProfile();
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
