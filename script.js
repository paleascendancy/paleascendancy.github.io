/* PALE ASCENDANCY V27 — unified client */
(() => {
  "use strict";

  const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
  const PLAYLIST = [
    ["Meaningful Love", "music/01-meaningful-love.mp3"],
    ["Better Days", "music/02-better-days.mp3"],
    ["Chill Day", "music/03-chill-day.mp3"],
    ["Canals", "music/04-canals.mp3"],
    ["Tek It — Hoodtrap Remix", "music/05-tek-it-hoodtrap-remix.mp3"],
    ["Star Shopping", "music/06-star-shopping.mp3"],
    ["Earrings", "music/07-earrings.mp3"],
    ["New Jeans Jersey Remix", "music/08-new-jeans-jersey-remix.mp3"],
    ["Nuts — Instrumental Slowed", "music/09-nuts-instrumental-slowed.mp3"],
    ["Sweater Weather — Instrumental", "music/10-sweater-weather-instrumental.mp3"],
    ["Childish Gambino — Instrumental", "music/11-childish-gambino-instrumental.mp3"]
  ];
  const CATEGORIES = [
    ["promo", "Promo"], ["trailer", "Trailers"], ["highlight", "Highlights"], ["motion", "Motion Design"],
    ["anime", "Anime / Mangá"], ["gaming", "Gaming"], ["tiktok", "TikTok"],
    ["reels", "Reels"], ["amv", "AMV"], ["thumbnail", "Thumbnails"],
    ["youtube", "YouTube"], ["design", "Design Gráfico"], ["branding", "Branding"],
    ["uiux", "UI / UX"], ["illustration", "Ilustração"], ["3d", "3D"], ["outros", "Outros"]
  ];
  const CATEGORY_MAP = Object.fromEntries(CATEGORIES);
  const PLANS = {
    free: ["Gratuito", 2], premium: ["Premium", 5], pro: ["Pro", 10],
    studio: ["Studio", 20], elite: ["Elite", 40]
  };
  const THEME_DEFAULTS = {
    "--bg": "#08070c", "--bg-deep": "#05040a", "--surface": "#121018", "--surface-2": "#1a1722",
    "--text": "#f7f4fb", "--text-soft": "#ddd6e8", "--muted": "#9c94a8",
    "--cyan": "#9fe8ff", "--violet": "#a894ff", "--gold": "#e9cf91", "--pink": "#e6a4d0"
  };

  let client = null;
  let audio = null;
  let trackIndex = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const setMsg = (el, text, kind = "") => { if (!el) return; el.textContent = text || ""; el.className = `auth-message ${kind}`.trim(); };

  function getClient() {
    if (client) return client;
    if (window.supabase?.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return client;
  }

  async function ensureClient() {
    if (getClient()) return client;
    await new Promise(resolve => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
    return getClient();
  }

  async function session() {
    const c = await ensureClient();
    return (await c.auth.getSession()).data.session || null;
  }

  async function profile(userId, full = false) {
    const c = await ensureClient();
    const fields = full
      ? "id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,editor_categories,portfolio_url,editor_software,availability,professional_plan,portfolio_limit,plan_status,plan_expires_at,professional_application,requested_role"
      : "id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,professional_plan,portfolio_limit,plan_status,plan_expires_at";
    const r = await c.from("profile").select(fields).eq("id", userId).maybeSingle();
    return r.data || null;
  }

  async function isAdmin(userId) {
    const c = await ensureClient();
    if (!userId) return false;
    const r = await c.rpc("is_admin");
    return !r.error && r.data === true;
  }

  function setMenu(open) {
    const menu = $("#mobileMenu");
    const button = $("#menuButton");
    const backdrop = $("#paMenuBackdrop");
    if (!menu || !button) return;
    menu.classList.toggle("open", open);
    menu.classList.toggle("active", open);
    document.body.classList.toggle("mobile-menu-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    backdrop?.classList.toggle("open", open);
  }

  function initMenu() {
    const button = $("#menuButton");
    const menu = $("#mobileMenu");
    if (!button || !menu || button.dataset.paReady === "1") return;
    button.dataset.paReady = "1";
    let backdrop = $("#paMenuBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "paMenuBackdrop";
      document.body.appendChild(backdrop);
    }
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setMenu(!menu.classList.contains("open"));
    }, { passive: false });
    menu.addEventListener("click", event => {
      const link = event.target.closest("a");
      if (link) setMenu(false);
    });
    backdrop.addEventListener("click", () => setMenu(false));
    document.addEventListener("keydown", event => { if (event.key === "Escape") setMenu(false); });
  }

  function injectAccountUI() {
    const header = $(".header");
    if (!header) return;
    if (!$("#paAccountArea")) {
      const area = document.createElement("div");
      area.id = "paAccountArea";
      area.className = "account-area";
      area.innerHTML = `<a class="secondary-button account-login" href="login.html">Entrar</a>`;
      header.insertBefore(area, $("#menuButton"));
    }
  }

  async function refreshAccountUI() {
    const area = $("#paAccountArea");
    const menu = $("#mobileMenu");
    if (!area) return;
    const s = await session();
    if (!s?.user) {
      area.innerHTML = `<a class="secondary-button account-login" href="login.html">Entrar</a><a class="primary-button account-register" href="cadastro.html">Criar conta</a>`;
      if (menu) {
        menu.innerHTML = `<a href="index.html">Home</a><a href="editores.html">Editores &amp; Designers</a><a href="servicos.html">Serviços</a><a href="planos.html">Planos profissionais</a><div class="mobile-account"><a href="login.html">Login comum</a><a href="login-profissional.html">Login profissional</a><a href="login-admin.html">Administração</a></div>`;
      }
      return;
    }
    const p = await profile(s.user.id);
    const admin = await isAdmin(s.user.id);
    const professional = !!(p?.is_editor || p?.is_designer);
    const label = p?.nome_artistico || p?.nome || "Minha conta";
    area.innerHTML = `<a class="secondary-button account-login" href="perfil.html">${esc(label)}</a>${admin ? `<a class="secondary-button admin-header-link" href="admin.html">Admin</a>` : ""}${professional ? `<a class="secondary-button editor-header-link" href="editor-painel.html">Profissional</a>` : ""}`;
    if (menu) {
      const links = [
        `<a href="index.html">Home</a>`, `<a href="editores.html">Editores &amp; Designers</a>`,
        `<a href="servicos.html">Serviços</a>`, `<a href="planos.html">Planos profissionais</a>`,
        `<a href="perfil.html">Meu perfil</a>`
      ];
      if (professional) links.push(`<a href="editor-painel.html">Área profissional</a>`);
      if (admin) links.push(`<a href="admin.html">Administração</a>`);
      links.push(`<a href="#" data-pa-logout>Sair</a>`);
      menu.innerHTML = links.join("");
      $("[data-pa-logout]", menu)?.addEventListener("click", async e => {
        e.preventDefault();
        const c = await ensureClient();
        await c.auth.signOut();
        location.replace("index.html");
      });
    }
    const manage = $("#editorManageBar");
    if (manage) manage.hidden = !professional;
  }

  async function applyTheme() {
    try {
      const c = await ensureClient();
      const r = await c.from("site_settings").select("theme").eq("id", "global").maybeSingle();
      const theme = r.data?.theme || {};
      Object.entries(theme).forEach(([key, value]) => { if (/^--/.test(key) && typeof value === "string") document.documentElement.style.setProperty(key, value); });
    } catch (_) {}
  }

  function musicInit() {
    if ($("#musicPlayer")) return;
    const wrap = document.createElement("div");
    wrap.id = "musicPlayer";
    wrap.className = "music-player";
    wrap.innerHTML = `<div class="music-player-main"><button class="music-play" id="musicPlay" type="button" aria-label="Reproduzir ou pausar">▶</button><button class="music-title-button" id="musicTitleButton" type="button"><span class="music-label">PALE ASCENDANCY</span><strong id="musicTitle"></strong><span id="musicStatus">Toque para começar</span></button><button class="music-next" id="musicNext" type="button" aria-label="Próxima música">›</button></div><audio id="musicAudio" preload="metadata" playsinline></audio>`;
    document.body.appendChild(wrap);
    audio = $("#musicAudio");
    const saved = Number.parseInt(localStorage.getItem("pa_music_index") || "0", 10);
    trackIndex = Number.isInteger(saved) && saved >= 0 && saved < PLAYLIST.length ? saved : 0;
    loadTrack(false);
    $("#musicPlay").addEventListener("click", () => audio.paused ? playMusic() : pauseMusic());
    $("#musicNext").addEventListener("click", nextMusic);
    $("#musicTitleButton").addEventListener("click", openMusicList);
    audio.addEventListener("ended", nextMusic);
    audio.addEventListener("timeupdate", () => localStorage.setItem("pa_music_time", String(audio.currentTime || 0)));
    const resume = Number.parseFloat(localStorage.getItem("pa_music_time") || "0");
    if (resume > 0) audio.addEventListener("loadedmetadata", () => { try { audio.currentTime = Math.min(resume, Math.max(0, audio.duration - 0.5)); } catch (_) {} }, { once: true });
    const unlock = () => { if (localStorage.getItem("pa_music_playing") === "1") playMusic(); };
    ["pointerdown", "touchstart", "keydown", "scroll"].forEach(type => document.addEventListener(type, unlock, { once: true, passive: true }));
  }

  function loadTrack(autoPlay) {
    if (!audio) return;
    const [title, file] = PLAYLIST[trackIndex];
    audio.src = new URL(file, document.baseURI).href;
    audio.load();
    $("#musicTitle").textContent = title;
    localStorage.setItem("pa_music_index", String(trackIndex));
    if (autoPlay) playMusic();
  }
  async function playMusic() { try { await audio.play(); localStorage.setItem("pa_music_playing", "1"); $("#musicPlay").textContent = "Ⅱ"; $("#musicStatus").textContent = "Reproduzindo"; } catch (_) { $("#musicStatus").textContent = "Toque para iniciar"; } }
  function pauseMusic() { audio.pause(); localStorage.setItem("pa_music_playing", "0"); $("#musicPlay").textContent = "▶"; $("#musicStatus").textContent = "Pausado"; }
  function nextMusic() { trackIndex = (trackIndex + 1) % PLAYLIST.length; localStorage.setItem("pa_music_time", "0"); loadTrack(true); }
  function openMusicList() {
    let panel = $("#musicPanel");
    if (!panel) {
      panel = document.createElement("aside"); panel.id = "musicPanel"; panel.className = "music-panel";
      panel.innerHTML = `<div class="music-panel-inner"><header class="music-panel-header"><div><span class="music-panel-kicker">PALE ASCENDANCY</span><h2>Biblioteca musical</h2></div><button id="musicPanelClose" class="music-panel-close" type="button">×</button></header><label class="music-search-wrap"><span>⌕</span><input id="musicSearch" class="music-search" placeholder="Pesquisar música..."></label><div id="musicList" class="music-list"></div></div>`;
      document.body.appendChild(panel);
      $("#musicPanelClose").addEventListener("click", () => panel.classList.remove("open"));
      $("#musicSearch").addEventListener("input", e => renderMusic(e.target.value));
    }
    panel.classList.add("open"); renderMusic($("#musicSearch")?.value || "");
  }
  function renderMusic(term = "") {
    const list = $("#musicList"); if (!list) return;
    const q = term.toLowerCase();
    list.innerHTML = PLAYLIST.map((item, i) => !item[0].toLowerCase().includes(q) ? "" : `<button type="button" class="music-list-item" data-track="${i}"><span class="music-list-number">${String(i + 1).padStart(2, "0")}</span><span class="music-list-name">${esc(item[0])}</span><span>▶</span></button>`).join("");
    $$('[data-track]', list).forEach(btn => btn.addEventListener("click", () => { trackIndex = Number(btn.dataset.track); localStorage.setItem("pa_music_time", "0"); loadTrack(true); $("#musicPanel").classList.remove("open"); }));
  }

  async function handleLogin(form, mode) {
    const c = await ensureClient();
    const email = $("#email", form).value.trim(); const password = $("#senha", form).value;
    const message = mode === "admin" ? $("#adminLoginMessage") : mode === "professional" ? $("#professionalLoginMessage") : $("#loginMessage");
    const button = form.querySelector("button[type=submit]");
    button.disabled = true; button.textContent = mode === "admin" ? "Verificando..." : "Entrando..."; setMsg(message, "");
    const r = await c.auth.signInWithPassword({ email, password });
    if (r.error) { setMsg(message, "E-mail ou senha incorretos, ou conta não confirmada.", "error"); button.disabled = false; button.textContent = mode === "admin" ? "Entrar na administração" : mode === "professional" ? "Entrar na área profissional" : "Entrar"; return; }
    const user = r.data.user;
    if (mode === "admin") {
      if (!(await isAdmin(user.id))) { await c.auth.signOut(); setMsg(message, "Esta conta não possui acesso administrativo.", "error"); button.disabled = false; button.textContent = "Entrar na administração"; return; }
      location.replace("admin.html"); return;
    }
    if (mode === "professional") {
      const p = await profile(user.id);
      if (!(p?.is_editor || p?.is_designer)) { await c.auth.signOut(); setMsg(message, "A conta ainda não foi aprovada como profissional.", "error"); button.disabled = false; button.textContent = "Entrar na área profissional"; return; }
      location.replace("editor-painel.html"); return;
    }
    location.replace((await isAdmin(user.id)) ? "admin.html" : "perfil.html");
  }

  function initLoginPages() {
    const common = $("#loginForm"); if (common && !common.dataset.ready) { common.dataset.ready = "1"; common.addEventListener("submit", e => { e.preventDefault(); handleLogin(common, "common"); }); }
    const professional = $("#professionalLoginForm"); if (professional && !professional.dataset.ready) { professional.dataset.ready = "1"; professional.addEventListener("submit", e => { e.preventDefault(); handleLogin(professional, "professional"); }); }
    const admin = $("#adminLoginForm"); if (admin && !admin.dataset.ready) { admin.dataset.ready = "1"; admin.addEventListener("submit", e => { e.preventDefault(); handleLogin(admin, "admin"); }); }
  }

  function buildCategoryButtons(holder, multi = false, selected = []) {
    if (!holder) return;
    const values = new Set(Array.isArray(selected) ? selected : [selected].filter(Boolean));
    holder.innerHTML = CATEGORIES.map(([value, label]) => `<button type="button" class="category-choice ${values.has(value) ? "selected" : ""}" data-v="${value}">${label}</button>`).join("");
    holder.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      if (!multi) $$("button", holder).forEach(x => x.classList.remove("selected"));
      b.classList.toggle("selected", multi ? !b.classList.contains("selected") : true);
    };
  }

  function selectedCategories(holder) { return $$("button.selected", holder).map(b => b.dataset.v); }

  function initRegister() {
    const form = $("#registerForm"); if (!form || form.dataset.ready) return; form.dataset.ready = "1";
    buildCategoryButtons($("#categoryChoices"), false);
    const file = $("#signupAvatar"), image = $("#signupImage"), initial = $("#signupInitial");
    file?.addEventListener("change", () => { const f = file.files?.[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { setMsg($("#registerMessage"), "A foto precisa ter até 5 MB.", "error"); file.value = ""; return; } image.src = URL.createObjectURL(f); image.hidden = false; initial.hidden = true; });
    form.addEventListener("submit", async e => {
      e.preventDefault(); const c = await ensureClient(); const button = $("#registerButton"); const message = $("#registerMessage");
      const selected = selectedCategories($("#categoryChoices")); $("#especialidade").value = selected[0] || "";
      button.disabled = true; button.textContent = "Criando...";
      const r = await c.auth.signUp({ email: $("#email").value.trim(), password: $("#senha").value, options: { emailRedirectTo: new URL("perfil.html", location.href).href, data: { nome: $("#nome").value.trim(), nome_artistico: $("#nomeArtistico").value.trim(), especialidade: selected[0] || "", professional_application: false, requested_role: null } } });
      if (r.error) { setMsg(message, r.error.message, "error"); button.disabled = false; button.textContent = "Criar conta"; return; }
      const avatar = file?.files?.[0];
      if (avatar) { try { localStorage.setItem("pa_pending_signup_avatar", await fileToDataUrl(avatar)); } catch (_) {} }
      setMsg(message, r.data.session ? "Conta criada. Abrindo seu perfil..." : "Conta criada. Confirme seu e-mail e depois entre para concluir o perfil.", "success");
      if (r.data.session) setTimeout(() => location.replace("perfil.html"), 500); else { button.disabled = false; button.textContent = "Criar conta"; }
    });
  }
  const fileToDataUrl = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });

  function initProfessionalRegister() {
    const form = $("#professionalRegisterForm"); if (!form || form.dataset.ready) return; form.dataset.ready = "1";
    buildCategoryButtons($("#categoryChoices"), false);
    form.addEventListener("submit", async e => {
      e.preventDefault(); const c = await ensureClient(); const message = $("#professionalRegisterMessage"), button = $("#professionalRegisterButton");
      const chosen = selectedCategories($("#categoryChoices")); $("#especialidade").value = chosen[0] || "";
      button.disabled = true; button.textContent = "Enviando...";
      const r = await c.auth.signUp({ email: $("#email").value.trim(), password: $("#senha").value, options: { emailRedirectTo: new URL("login-profissional.html", location.href).href, data: { nome: $("#nome").value.trim(), nome_artistico: $("#nomeArtistico").value.trim(), especialidade: chosen[0] || "", professional_application: true, requested_role: $("#tipo").value } } });
      if (r.error) { setMsg(message, r.error.message, "error"); button.disabled = false; button.textContent = "Enviar cadastro profissional"; return; }
      setMsg(message, r.data.session ? "Solicitação enviada. A administração precisa aprovar sua atuação." : "Solicitação enviada. Confirme seu e-mail; depois aguarde a aprovação da administração.", "success"); button.disabled = false; button.textContent = "Enviar cadastro profissional";
    });
  }

  async function uploadAvatar(c, userId, file) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const r = await c.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
    if (r.error) throw r.error;
    return c.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function finishPendingAvatar(c, userId) {
    const raw = localStorage.getItem("pa_pending_signup_avatar"); if (!raw) return null;
    try {
      const response = await fetch(raw); const blob = await response.blob();
      const url
