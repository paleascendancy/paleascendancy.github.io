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
  const PREMIUM_BORDERS = { minimal:"Minimal", aurora:"Aurora", pale:"Pale", ascendancy:"Ascendancy", neon:"Neon", obsidian:"Obsidian" };
  const PREMIUM_CARDS = { elegant:"Elegant", glass:"Glass", showcase:"Showcase" };
  function premiumActive(profile) { return !!profile && profile.professional_plan === "premium" && profile.plan_status === "active" && (!profile.plan_expires_at || new Date(profile.plan_expires_at).getTime() > Date.now()); }
  function premiumBorder(profile) { return PREMIUM_BORDERS[profile?.premium_border] ? profile.premium_border : "minimal"; }
  function premiumCard(profile) { return PREMIUM_CARDS[profile?.premium_card_style] ? profile.premium_card_style : "elegant"; }
  function premiumVars(profile) { return `premium-border-${premiumBorder(profile)}`; }
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
    // Campos estáveis do perfil. O login não depende das colunas opcionais
    // de personalização Premium, evitando que uma migração futura bloqueie
    // a autenticação profissional.
    const fields = full
      ? "id,email,nome,nome_artistico,especialidade,bio,avatar_url,is_editor,is_designer,is_featured,editor_categories,portfolio_url,editor_software,availability,professional_plan,portfolio_limit,plan_status,plan_expires_at"
      : "id,email,nome,nome_artistico,especialidade,bio,avatar_url,is_editor,is_designer,is_featured,professional_plan,portfolio_limit,plan_status,plan_expires_at";
    const r = await c.from("profile").select(fields).eq("id", userId).maybeSingle();
    if (r.error) {
      console.error("Erro ao carregar perfil:", r.error);
      return null;
    }
    return r.data || null;
  }

  async function premiumProfileOptions(userId) {
    const c = await ensureClient();
    try {
      const r = await c.from("profile").select("premium_border,premium_card_style").eq("id", userId).maybeSingle();
      return r.error ? {} : (r.data || {});
    } catch (_) {
      return {};
    }
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
      if (!p) {
        await c.auth.signOut();
        setMsg(message, "Não foi possível carregar seu perfil profissional. Verifique a configuração do Supabase.", "error");
        button.disabled = false; button.textContent = "Entrar na área profissional";
        return;
      }
      if (!(p.is_editor || p.is_designer)) {
        await c.auth.signOut();
        setMsg(message, "A conta ainda não foi aprovada como profissional.", "error");
        button.disabled = false; button.textContent = "Entrar na área profissional";
        return;
      }
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
      const url = await uploadAvatar(c, userId, blob); await c.from("profile").update({ avatar_url: url }).eq("id", userId); localStorage.removeItem("pa_pending_signup_avatar"); return url;
    } catch (_) { return null; }
  }

  function initCommonProfile() {
    const view = $("#profileView"); if (!view || view.dataset.ready) return; view.dataset.ready = "1";
    (async () => {
      const c = await ensureClient(); const s = await session(); if (!s?.user) { location.replace("login.html"); return; }
      let p = await profile(s.user.id); if (!p) { setMsg($("#profileMessage"), "Seu perfil ainda está sendo criado. Recarregue em alguns segundos.", "error"); return; }
      const pending = await finishPendingAvatar(c, s.user.id); if (pending) p.avatar_url = pending;
      const map = CATEGORY_MAP;
      $("#profileNome").textContent = p.nome || "Não informado"; $("#profileNomeArtistico").textContent = p.nome_artistico || "Não informado"; $("#profileEmail").textContent = p.email || s.user.email || "Não informado"; $("#profileEspecialidade").textContent = map[p.especialidade] || p.especialidade || "Não informado";
      const initial = $("#profileInitial"), image = $("#profileImage"); initial.textContent = (p.nome_artistico || p.nome || p.email || "?").charAt(0).toUpperCase(); if (p.avatar_url) { image.src = `${p.avatar_url}${p.avatar_url.includes("?") ? "&" : "?"}v=${Date.now()}`; image.hidden = false; initial.hidden = true; }
      const admin = await isAdmin(s.user.id); const professional = !!(p.is_editor || p.is_designer); $("#profileAdminButton").hidden = !admin; $("#profileProfessionalButton").hidden = !professional; $("#profileSpecialActions").hidden = !(admin || professional);
      $("#logoutButton")?.addEventListener("click", async () => { await c.auth.signOut(); location.replace("index.html"); });
    })();
  }

  function initEditProfile() {
    const form = $("#editForm"); if (!form || form.dataset.ready) return; form.dataset.ready = "1";
    (async () => {
      const c = await ensureClient(), s = await session(); if (!s?.user) { location.replace("login.html"); return; }
      const p = await profile(s.user.id); if (!p) { setMsg($("#message"), "Perfil não encontrado.", "error"); return; }
      $("#nome").value = p.nome || ""; $("#nomeArtistico").value = p.nome_artistico || ""; $("#especialidade").value = p.especialidade || "";
      if (p.avatar_url) { $("#image").src = `${p.avatar_url}?v=${Date.now()}`; $("#image").hidden = false; $("#initial").hidden = true; } $("#initial").textContent = (p.nome_artistico || p.nome || "?").charAt(0).toUpperCase();
      let avatarUrl = p.avatar_url || null; $("#photo").addEventListener("change", () => { const f = $("#photo").files?.[0]; if (!f) return; $("#image").src = URL.createObjectURL(f); $("#image").hidden = false; $("#initial").hidden = true; });
      form.addEventListener("submit", async e => { e.preventDefault(); const button = form.querySelector("button[type=submit]"); button.disabled = true; setMsg($("#message"), "Salvando..."); try { const f = $("#photo").files?.[0]; if (f) { if (f.size > 8 * 1024 * 1024) throw new Error("A foto precisa ter até 8 MB."); avatarUrl = await uploadAvatar(c, s.user.id, f); } const r = await c.from("profile").update({ nome: $("#nome").value.trim(), nome_artistico: $("#nomeArtistico").value.trim(), especialidade: $("#especialidade").value || "", avatar_url: avatarUrl }).eq("id", s.user.id); if (r.error) throw r.error; setMsg($("#message"), "Perfil atualizado.", "success"); setTimeout(() => location.replace("perfil.html"), 450); } catch (err) { setMsg($("#message"), err.message || "Não foi possível salvar.", "error"); button.disabled = false; } });
    })();
  }

  function initEditorPanel() {
    const form = $("#editorForm"); if (!form || form.dataset.ready) return; form.dataset.ready = "1";
    (async () => {
      const c = await ensureClient(), s = await session(); if (!s?.user) { location.replace("login-profissional.html"); return; }
      const p = await profile(s.user.id, true); if (!p || !(p.is_editor || p.is_designer)) { await c.auth.signOut(); location.replace("login-profissional.html"); return; }
      const role = p.is_editor && p.is_designer ? "Editor + Designer" : p.is_editor ? "Editor" : "Designer";
      $("#role").value = role; $("#nomeArtistico").value = p.nome_artistico || ""; $("#especialidade").innerHTML = CATEGORIES.map(([v,l]) => `<option value="${v}">${l}</option>`).join(""); $("#especialidade").value = p.especialidade || ""; $("#bio").value = p.bio || ""; $("#software").value = p.editor_software || ""; $("#availability").value = p.availability || "disponivel"; $("#portfolioUrl").value = p.portfolio_url || ""; $("#tiktok").value = p.tiktok || ""; $("#instagram").value = p.instagram || ""; $("#youtube").value = p.youtube || ""; $("#discord").value = p.discord || "";
      buildCategoryButtons($("#categoryGrid"), true, p.editor_categories || []);
      const initial = $("#avatarInitial"), image = $("#avatarImage"); initial.textContent = (p.nome_artistico || p.nome || "?").charAt(0).toUpperCase(); if (p.avatar_url) { image.src = `${p.avatar_url}?v=${Date.now()}`; image.hidden = false; initial.hidden = true; }
      $("#publicProfile").href = `editor-perfil.html?id=${encodeURIComponent(s.user.id)}`;
      const plan = PLANS[p.professional_plan] || PLANS.free; $("#planName").textContent = plan[0]; $("#limit").textContent = plan[1]; $("#planDesc").textContent = `${plan[1]} espaços de portfólio${p.plan_status === "active" && p.professional_plan !== "free" ? " ativos" : ""}.`;
      const premium = premiumActive(p), customization = $("#premiumCustomization");
      if (customization) {
        customization.hidden = !premium;
        if (premium) {
          const premiumOptions = await premiumProfileOptions(s.user.id);
          $("#premiumBorder").value = premiumOptions.premium_border || "minimal";
          $("#premiumCardStyle").value = premiumOptions.premium_card_style || "elegant";
          const preview=$("#premiumLivePreview"), update=()=>{ preview.className=`premium-live-preview premium-border-${$("#premiumBorder").value}`; };
          $("#premiumBorder").addEventListener("change",update);
          update();
        }
      }
      await loadPortfolioManager(c, s.user.id, plan[1]);
      $("#avatarFile")?.addEventListener("change", async () => { const f = $("#avatarFile").files?.[0]; if (!f) return; try { if (f.size > 8 * 1024 * 1024) throw new Error("A foto precisa ter até 8 MB."); $("#avatarStatus").textContent = "Enviando..."; const url = await uploadAvatar(c, s.user.id, f); const r = await c.from("profile").update({ avatar_url: url }).eq("id", s.user.id); if (r.error) throw r.error; image.src = `${url}?v=${Date.now()}`; image.hidden = false; initial.hidden = true; $("#avatarStatus").textContent = "Foto atualizada."; } catch (err) { $("#avatarStatus").textContent = err.message || "Erro ao enviar foto."; } });
      form.addEventListener("submit", async e => { e.preventDefault(); const b = $("#saveEditor"); b.disabled = true; setMsg($("#editorMessage"), "Salvando..."); const patch = { nome_artistico: $("#nomeArtistico").value.trim(), especialidade: $("#especialidade").value, editor_categories: selectedCategories($("#categoryGrid")), bio: $("#bio").value.trim(), editor_software: $("#software").value.trim(), availability: $("#availability").value, portfolio_url: $("#portfolioUrl").value.trim(), tiktok: $("#tiktok").value.trim(), instagram: $("#instagram").value.trim(), youtube: $("#youtube").value.trim(), discord: $("#discord").value.trim() }; if (premium) { patch.premium_border=$("#premiumBorder").value; patch.premium_card_style=$("#premiumCardStyle").value; } const r = await c.from("profile").update(patch).eq("id", s.user.id); if (r.error) { setMsg($("#editorMessage"), r.error.message, "error"); b.disabled = false; return; } setMsg($("#editorMessage"), "Perfil profissional salvo.", "success"); b.disabled = false; await loadPortfolioManager(c, s.user.id, plan[1]); });
    })();
  }

  async function loadPortfolioManager(c, userId, limit) {
    const list = $("#portfolioList"); if (!list) return;
    const r = await c.from("editor_portfolio_items").select("id,title,description,item_type,url,sort_order,created_at").eq("editor_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (r.error) { list.innerHTML = `<div class="admin-empty">${esc(r.error.message)}</div>`; return; }
    const items = r.data || []; $("#count").textContent = items.length; $("#limit").textContent = limit;
    list.innerHTML = items.map(x => `<article class="portfolio-manager-item"><div class="portfolio-manager-media">${x.item_type === "video" ? `<video src="${esc(x.url)}" controls preload="metadata"></video>` : x.item_type === "image" ? `<img src="${esc(x.url)}" alt="${esc(x.title)}">` : `<div class="portfolio-link-preview">LINK</div>`}</div><div><strong>${esc(x.title)}</strong><p>${esc(x.description || "")}</p><button type="button" class="secondary-button portfolio-delete" data-id="${x.id}" data-url="${esc(x.url)}">Excluir</button></div></article>`).join("") || `<div class="admin-empty">Nenhum item no portfólio.</div>`;
    $$(".portfolio-delete", list).forEach(b => b.addEventListener("click", async () => { if (!confirm("Excluir este item do portfólio?")) return; const del = await c.from("editor_portfolio_items").delete().eq("id", b.dataset.id).eq("editor_id", userId); if (!del.error) await loadPortfolioManager(c, userId, limit); }));
  }

  function initPortfolioForm() {
    const form = $("#portfolioForm"); if (!form || form.dataset.ready) return; form.dataset.ready = "1";
    const type = $("#itemType"), fileRow = $("#itemFileRow"), urlRow = $("#itemUrlRow");
    const toggle = () => { const isLink = type.value === "link"; fileRow.hidden = isLink; urlRow.hidden = !isLink; $("#itemFile").required = !isLink; $("#itemUrl").required = isLink; }; type.addEventListener("change", toggle); toggle();
    form.addEventListener("submit", async e => { e.preventDefault(); const c = await ensureClient(), s = await session(); if (!s?.user) { location.replace("login-profissional.html"); return; } const message = $("#portfolioMessage"), button = $("#addPortfolio"); button.disabled = true; setMsg(message, "Enviando..."); try { const title = $("#itemTitle").value.trim(), desc = $("#itemDesc").value.trim(); let url = $("#itemUrl").value.trim(); const itemType = type.value; if (itemType !== "link") { const f = $("#itemFile").files?.[0]; if (!f) throw new Error("Escolha um arquivo."); if (f.size > 50 * 1024 * 1024) throw new Error("O arquivo precisa ter até 50 MB."); const ext = f.name.split(".").pop()?.toLowerCase() || "bin"; const path = `${s.user.id}/${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`; const up = await c.storage.from("portfolio").upload(path, f, { upsert: false, contentType: f.type }); if (up.error) throw up.error; url = c.storage.from("portfolio").getPublicUrl(path).data.publicUrl; } const ins = await c.from("editor_portfolio_items").insert({ editor_id: s.user.id, title, description: desc, item_type: itemType, url, sort_order: Date.now() }); if (ins.error) throw ins.error; form.reset(); toggle(); setMsg(message, "Item adicionado ao portfólio.", "success"); const p = await profile(s.user.id); await loadPortfolioManager(c, s.user.id, (PLANS[p?.professional_plan] || PLANS.free)[1]); } catch (err) { setMsg(message, err.message || "Não foi possível adicionar.", "error"); } finally { button.disabled = false; } });
  }

  function portfolioMediaMarkup(item) {
    const title = esc(item.title || "Trabalho"), url = esc(item.url || "");
    if (item.item_type === "video") return `<video src="${url}" muted autoplay loop playsinline preload="metadata" aria-label="${title}"></video>`;
    if (item.item_type === "image") return `<img src="${url}" alt="${title}" loading="lazy">`;
    return `<div class="portfolio-reel-link"><span>↗</span><strong>Abrir projeto</strong><small>${url}</small></div>`;
  }

  async function initEditorsDirectory() {
    const grid = $("#editorsGrid"); if (!grid || grid.dataset.ready) return; grid.dataset.ready = "1";
    const reels = $("#portfolioReels"), premiumHolder = $("#premiumHighlights");
    grid.innerHTML = '<div class="professional-loading">Carregando profissionais...</div>';
    if (reels) reels.innerHTML = '<div class="portfolio-reels-empty">Carregando portfólios...</div>';
    if (premiumHolder) premiumHolder.innerHTML = '<div class="portfolio-reels-empty">Carregando destaques...</div>';
    const c = await ensureClient();
    if (!c) { grid.innerHTML='<div class="professional-loading">Não foi possível conectar aos profissionais.</div>'; return; }
    const [{ data: profiles, error: profileError }, { data: items, error: itemError }] = await Promise.all([
      c.from("editor_directory").select("*").order("is_featured", { ascending:false }),
      c.from("editor_portfolio_items").select("id,editor_id,title,description,item_type,url,sort_order,created_at").order("sort_order", { ascending:true }).order("created_at", { ascending:false })
    ]);
    if (profileError) { grid.innerHTML='<div class="professional-loading">Não foi possível carregar os profissionais.</div>'; if(reels) reels.innerHTML='<div class="portfolio-reels-empty">Não foi possível carregar os portfólios.</div>'; return; }
    const approved=profiles||[], activePremium=approved.filter(premiumActive);
    const ordered=[...approved].sort((a,b)=>Number(premiumActive(b))-Number(premiumActive(a))||Number(b.is_featured)-Number(a.is_featured)||String(a.nome_artistico||"").localeCompare(String(b.nome_artistico||"")));
    grid.innerHTML=ordered.map(p=>{const cats=(p.editor_categories?.length?p.editor_categories:[p.especialidade]).filter(Boolean), tags=cats.map(x=>`<span class="editor-tag">${esc(CATEGORY_MAP[x]||x)}</span>`).join(""), name=p.nome_artistico||"Profissional", premium=premiumActive(p), border=premiumBorder(p), avatar=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:`<span>${esc(name.charAt(0).toUpperCase())}</span>`; return `<article class="editor-profile ${premium?`premium-directory-card premium-border-${border}`:""}" data-search="${esc([name,p.especialidade,p.bio,p.editor_software].join(" "))}" data-category="${esc(cats.join(" "))}"><div class="editor-card-top"><div class="editor-avatar">${avatar}</div><div><p class="editor-role">${p.is_editor&&p.is_designer?"Editor + Designer":p.is_editor?"Editor":"Designer"}</p><h2>${esc(name)}</h2></div></div>${premium?'<span class="premium-badge directory-premium-badge">Premium</span>':''}<div class="editor-tags">${tags}</div><p>${esc(p.bio||"Profissional da Pale Ascendancy.")}</p><div class="editor-card-actions"><a class="secondary-button" href="editor-perfil.html?id=${encodeURIComponent(p.id)}">Ver perfil</a></div></article>`;}).join("")||'<div class="professional-loading">Nenhum profissional aprovado ainda.</div>';
    initFilters();
    if(premiumHolder){const map=new Map(approved.map(p=>[p.id,p])),by=new Map();(items||[]).forEach(item=>{if(!map.has(item.editor_id))return;if(!by.has(item.editor_id))by.set(item.editor_id,[]);by.get(item.editor_id).push(item);}); premiumHolder.innerHTML=activePremium.map(p=>{const name=p.nome_artistico||"Profissional",works=by.get(p.id)||[],avatar=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:`<span>${esc(name.charAt(0).toUpperCase())}</span>`,border=premiumBorder(p),card=premiumCard(p),workMarkup=works.length?works.map(item=>`<a class="premium-mini-item" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><div class="premium-mini-item-media">${item.item_type==="video"?`<video src="${esc(item.url)}" muted autoplay loop playsinline preload="metadata"></video>`:item.item_type==="image"?`<img src="${esc(item.url)}" alt="${esc(item.title||"Trabalho")}" loading="lazy">`:`<div class="portfolio-link-preview">LINK</div>`}</div><div class="premium-mini-item-copy"><strong>${esc(item.title||"Projeto")}</strong><span>${item.item_type==="video"?"Vídeo":item.item_type==="image"?"Arte":"Link"}</span></div></a>`).join(""):'<div class="portfolio-reels-empty">Este profissional ainda não adicionou trabalhos.</div>'; return `<article class="premium-showcase-card premium-border-${border}" data-border="${border}" data-card="${card}"><div class="premium-showcase-head"><div class="premium-profile-identity"><div class="premium-profile-avatar">${avatar}</div><div><span class="premium-badge">Premium · R$ 15/mês</span><h3>${esc(name)}</h3><p>${esc(CATEGORY_MAP[p.especialidade]||p.especialidade||"Profissional")}</p></div></div><a class="premium-profile-link" href="editor-perfil.html?id=${encodeURIComponent(p.id)}">Ver perfil →</a></div><p class="premium-profile-bio">${esc(p.bio||"Perfil profissional em destaque na Pale Ascendancy.")}</p><div class="premium-items">${workMarkup}</div></article>`;}).join("")||'<div class="portfolio-reels-empty">Nenhum perfil Premium ativo no momento.</div>';}
    if(!reels)return;if(itemError){reels.innerHTML='<div class="portfolio-reels-empty">Não foi possível carregar os portfólios.</div>';return;}
    const map=new Map(approved.map(p=>[p.id,p])); const valid=(items||[]).map(item=>({...item,profile:map.get(item.editor_id)})).filter(item=>item.profile).sort((a,b)=>Number(premiumActive(b.profile))-Number(premiumActive(a.profile))||new Date(b.created_at||0)-new Date(a.created_at||0));
    reels.innerHTML=valid.map(item=>{const p=item.profile,name=p.nome_artistico||"Profissional",premium=premiumActive(p),border=premiumBorder(p),avatar=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:`<span>${esc(name.charAt(0).toUpperCase())}</span>`,body=`<a class="portfolio-reel-media" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${portfolioMediaMarkup(item)}</a>`;return `<article class="portfolio-reel-card ${premium?`is-premium premium-border-${border}`:""}"><div class="portfolio-reel-visual">${premium?'<div class="portfolio-reel-premium"><span class="premium-badge">Premium</span></div>':''}${body}<div class="portfolio-reel-gradient"></div><div class="portfolio-reel-overlay"><span>${premium?"Destaque Premium":"Portfólio"}</span><strong>${esc(item.title||"Projeto")}</strong></div></div><div class="portfolio-reel-copy"><strong>${esc(item.title||"Projeto")}</strong><a class="portfolio-author" href="editor-perfil.html?id=${encodeURIComponent(p.id)}" aria-label="Ver perfil de ${esc(name)}"><span class="portfolio-author-avatar">${avatar}</span>${esc(name)} →</a>${item.description?`<p>${esc(item.description)}</p>`:""}</div></article>`;}).join("")||'<div class="portfolio-reels-empty">Os portfólios publicados pelos profissionais aparecerão aqui.</div>';
  }

  function initFilters() { const input = $("#searchInput"), grid = $("#editorsGrid"); if (!input || !grid || input.dataset.filterReady) return; input.dataset.filterReady = "1"; let filter = "todos"; const run = () => $$(".editor-profile", grid).forEach(card => { const text = `${card.textContent} ${card.dataset.search || ""}`.toLowerCase(); const cats = (card.dataset.category || "todos").toLowerCase().split(/\s+/); card.hidden = !!((input.value.trim() && !text.includes(input.value.trim().toLowerCase())) || (filter !== "todos" && !cats.includes(filter))); }); input.addEventListener("input", run); $$(".filter-button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.filter || "todos"; $$(".filter-button").forEach(x => x.classList.toggle("active", x === b)); run(); })); run(); }

  function initPublicEditorProfile() {
    const root = $("#publicProfile"); if (!root || root.dataset.ready) return; root.dataset.ready="1";
    (async()=>{ const c=await ensureClient(), id=new URLSearchParams(location.search).get("id"); if(!id){$("#profileContent").innerHTML='<div class="admin-empty">Profissional não encontrado.</div>';return;} const r=await c.from("editor_directory").select("*").eq("id",id).maybeSingle(); if(r.error||!r.data){$("#profileContent").innerHTML='<div class="admin-empty">Profissional não encontrado.</div>';return;} const p=r.data; const items=(await c.from("editor_portfolio_items").select("id,title,description,item_type,url,sort_order,created_at").eq("editor_id",id).order("sort_order",{ascending:true}).order("created_at",{ascending:true})).data||[]; const role=p.is_editor&&p.is_designer?"Editor + Designer":p.is_editor?"Editor":"Designer", cats=(p.editor_categories?.length?p.editor_categories:[p.especialidade]).filter(Boolean), plan=PLANS[p.professional_plan]||PLANS.free, premium=premiumActive(p), border=premiumBorder(p), card=premiumCard(p); root.classList.toggle("is-premium-profile",premium); root.dataset.border=premium?border:""; root.dataset.card=premium?card:""; const badge=premium?`<span class="premium-badge">Premium · R$ 15/mês</span>`:`<span class="plan-badge">${esc(plan[0])}</span>`; $("#profileContent").innerHTML=`<div class="editor-public-top ${premium?`premium-public-top premium-border-${border}`:""}"><div class="editor-public-avatar">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:`<span>${esc((p.nome_artistico||"P").charAt(0).toUpperCase())}</span>`}</div><div><p class="editor-role">${role}</p><h1>${esc(p.nome_artistico||"Profissional")}</h1>${badge}</div></div><div class="editor-tags">${cats.map(x=>`<span class="editor-tag">${esc(CATEGORY_MAP[x]||x)}</span>`).join("")}</div><p class="editor-public-bio">${esc(p.bio||"Este profissional ainda não adicionou uma descrição.")}</p><div class="profile-info"><span class="profile-label">Programas</span><strong>${esc(p.editor_software||"Não informado")}</strong></div><div class="profile-info"><span class="profile-label">Disponibilidade</span><strong>${esc(p.availability==="disponivel"?"Disponível":p.availability==="ocupado"?"Ocupado no momento":"Sob consulta")}</strong></div><div class="profile-socials">${social("TikTok",p.tiktok)}${social("Instagram",p.instagram)}${social("YouTube",p.youtube)}${social("Portfólio",p.portfolio_url)}${p.discord?`<span class="secondary-button">Discord: ${esc(p.discord)}</span>`:""}</div><section class="public-portfolio"><div class="section-heading"><p class="eyebrow">Portfólio ${premium?"Premium":""}</p><h2>${premium?"Apresentação em destaque.":"Trabalhos em destaque."}</h2></div><div class="portfolio-public-grid ${premium?`premium-public-grid premium-border-${border}`:""}">${items.map(item=>item.item_type==="video"?`<article class="portfolio-public-card ${premium?`premium-public-card premium-border-${border}`:""}"><video src="${esc(item.url)}" controls playsinline preload="metadata"></video><div><strong>${esc(item.title)}</strong><p>${esc(item.description||"")}</p></div></article>`:item.item_type==="image"?`<article class="portfolio-public-card ${premium?`premium-public-card premium-border-${border}`:""}"><img src="${esc(item.url)}" alt="${esc(item.title)}"><div><strong>${esc(item.title)}</strong><p>${esc(item.description||"")}</p></div></article>`:`<article class="portfolio-public-card ${premium?`premium-public-card premium-border-${border}`:""}"><div class="portfolio-link-preview">LINK</div><div><strong>${esc(item.title)}</strong><p>${esc(item.description||"")}</p><a class="secondary-button" target="_blank" rel="noopener noreferrer" href="${esc(item.url)}">Abrir projeto</a></div></article>`).join("")||`<div class="admin-empty">Este profissional ainda não adicionou trabalhos.</div>`}</div></section><div class="editor-public-actions"><a class="secondary-button" href="editores.html">Voltar para profissionais</a></div>`; })();
  }
  function social(label, url) { return url ? `<a class="secondary-button" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${label}</a>` : ""; }

  async function initAdmin() {
    const content = $("#adminContent"); if (!content || content.dataset.ready) return; content.dataset.ready = "1";
    const c = await ensureClient(), s = await session(); if (!s?.user || !(await isAdmin(s.user.id))) { $("#adminDenied").hidden = false; content.hidden = true; return; }
    content.hidden = false; $("#adminDenied").hidden = true;
    const list = $("#adminList"), search = $("#adminSearch"), message = $("#adminMessage"), stats = $("#adminStats"); let profiles = [];
    const renderStats = () => { stats.innerHTML = `<div><strong>${profiles.length}</strong><span>Contas</span></div><div><strong>${profiles.filter(p=>p.is_editor).length}</strong><span>Editores</span></div><div><strong>${profiles.filter(p=>p.is_designer).length}</strong><span>Designers</span></div><div><strong>${profiles.filter(p=>p.is_featured).length}</strong><span>Destacados</span></div>`; };
    const role = p => p.is_editor && p.is_designer ? "Editor + Designer" : p.is_editor ? "Editor" : p.is_designer ? "Designer" : "Membro";
    const render = () => { const q=(search.value||"").toLowerCase().trim(); const rows=profiles.filter(p=>`${p.nome||""} ${p.nome_artistico||""} ${p.email||""} ${p.especialidade||""} ${role(p)}`.toLowerCase().includes(q)); list.innerHTML=rows.map(p=>`<article class="admin-user"><div class="admin-user-main"><div class="admin-avatar">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p.nome_artistico||p.nome||"U").charAt(0).toUpperCase())}</div><div><h2>${esc(p.nome_artistico||p.nome||"Sem nome")}</h2><p>${esc(p.email||"")}</p><small>${role(p)} · ${esc(CATEGORY_MAP[p.especialidade]||p.especialidade||"Sem categoria")}</small></div></div><div class="admin-actions"><label><input type="checkbox" data-id="${p.id}" data-field="is_editor" ${p.is_editor?"checked":""}> Editor</label><label><input type="checkbox" data-id="${p.id}" data-field="is_designer" ${p.is_designer?"checked":""}> Designer</label><label><input type="checkbox" data-id="${p.id}" data-field="is_featured" ${p.is_featured?"checked":""}> Destaque</label><label class="admin-plan-field"><span>Plano</span><select data-id="${p.id}" data-field="professional_plan">${Object.entries(PLANS).map(([k,v])=>`<option value="${k}" ${p.professional_plan===k?"selected":""}>${v[0]} · ${v[1]} espaços</option>`).join("")}</select></label><a class="secondary-button" href="editor-perfil.html?id=${encodeURIComponent(p.id)}">Perfil</a></div></article>`).join("") || `<div class="admin-empty">Nenhuma conta encontrada.</div>`; };
    const load = async () => { setMsg(message,"Carregando..."); const r=await c.from("profile").select("id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,professional_plan,portfolio_limit,plan_status,plan_expires_at").order("created_at",{ascending:false}); if(r.error){setMsg(message,r.error.message,"error");return;} profiles=r.data||[];renderStats();render();setMsg(message,""); };
    list.addEventListener("change", async e => { const el=e.target;if(!el.dataset.field)return; const patch={[el.dataset.field]:el.type==="checkbox"?el.checked:el.value};if(el.dataset.field==="professional_plan"){patch.portfolio_limit=PLANS[el.value][1];patch.plan_status=el.value==="free"?"inactive":"active";patch.plan_expires_at=null;}const r=await c.from("profile").update(patch).eq("id",el.dataset.id);if(r.error)setMsg(message,r.error.message,"error");else await load(); });
    search.addEventListener("input",render); $("#adminRefresh")?.addEventListener("click",load);
    $$(".admin-tab").forEach(tab=>tab.addEventListener("click",()=>{ $$(".admin-tab").forEach(x=>x.classList.toggle("active",x===tab)); $$(".admin-panel").forEach(x=>x.hidden=x.id!==`panel-${tab.dataset.panel}`); }));
    async function loadTheme(){ const r=await c.from("site_settings").select("theme").eq("id","global").maybeSingle(); const theme={...THEME_DEFAULTS,...(r.data?.theme||{})}; const holder=$("#themeGrid"); holder.innerHTML=Object.entries(THEME_DEFAULTS).map(([k,v])=>`<label class="admin-color-field"><input type="color" data-key="${k}" value="${/^#[0-9a-f]{6}$/i.test(theme[k])?theme[k]:v}"><span><strong>${esc(k)}</strong><small>${esc(theme[k])}</small></span></label>`).join(""); }
    $("#saveTheme")?.addEventListener("click",async()=>{const theme={};$$('[data-key]',$('#themeGrid')).forEach(x=>theme[x.dataset.key]=x.value);const r=await c.from("site_settings").upsert({id:"global",theme,updated_by:s.user.id,updated_at:new Date().toISOString()});setMsg($("#themeMessage"),r.error?r.error.message:"Aparência salva.",r.error?"error":"success");if(!r.error)Object.entries(theme).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));});
    $("#resetTheme")?.addEventListener("click",async()=>{const r=await c.from("site_settings").upsert({id:"global",theme:THEME_DEFAULTS,updated_by:s.user.id,updated_at:new Date().toISOString()});setMsg($("#themeMessage"),r.error?r.error.message:"Padrão restaurado.",r.error?"error":"success");if(!r.error)Object.entries(THEME_DEFAULTS).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));});
    async function loadPerms(){ const admins=(await c.from("admin_users").select("user_id,created_at").order("created_at",{ascending:true})).data||[]; const ids=admins.map(x=>x.user_id); if(!ids.length){$("#permissionList").innerHTML=`<div class="admin-empty">Nenhum administrador.</div>`;return;} const ps=(await c.from("profile").select("id,nome,nome_artistico,email").in("id",ids)).data||[]; const perms=(await c.from("admin_permissions").select("*").in("user_id",ids)).data||[]; $("#permissionList").innerHTML=ps.map(p=>{const q=perms.find(x=>x.user_id===p.id)||{};return `<article class="admin-permission-card"><h3>${esc(p.nome_artistico||p.nome||p.email)}</h3><p>${esc(p.email)}</p>${[["can_manage_professionals","Gerenciar profissionais"],["can_manage_theme","Gerenciar aparência"],["can_manage_users","Gerenciar contas"],["can_manage_content","Gerenciar conteúdo"]].map(([k,l])=>`<label><input type="checkbox" data-user="${p.id}" data-perm="${k}" ${q[k]?"checked":""}>${l}</label>`).join("")}</article>`}).join(""); }
    $("#permissionList")?.addEventListener("change",async e=>{const x=e.target;if(!x.dataset.user)return;const patch={user_id:x.dataset.user,[x.dataset.perm]:x.checked};const r=await c.from("admin_permissions").upsert(patch,{onConflict:"user_id"});if(r.error)setMsg($("#permissionMessage"),r.error.message,"error");});
    $("#makeAdmin")?.addEventListener("click",async()=>{const r=await c.rpc("set_admin_by_email",{target_email:$("#adminEmail").value.trim()});setMsg($("#userAdminMessage"),r.error?r.error.message:"Administrador adicionado.",r.error?"error":"success");if(!r.error)loadPerms();});
    $("#removeAdmin")?.addEventListener("click",async()=>{const r=await c.rpc("remove_admin_by_email",{target_email:$("#adminEmail").value.trim()});setMsg($("#userAdminMessage"),r.error?r.error.message:"Acesso administrativo revogado.",r.error?"error":"success");if(!r.error)loadPerms();});
    await Promise.all([load(),loadTheme(),loadPerms()]);
  }

  async function init() {
    initMenu(); injectAccountUI(); initLoginPages(); initRegister(); initProfessionalRegister(); initCommonProfile(); initEditProfile(); initEditorPanel(); initPortfolioForm(); initPublicEditorProfile(); initEditorsDirectory(); initAdmin(); await applyTheme(); refreshAccountUI(); musicInit();
  }

  window.PaleAscendancy = { supabase: () => getClient(), logout: async () => { const c=await ensureClient(); await c.auth.signOut(); location.replace("index.html"); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
