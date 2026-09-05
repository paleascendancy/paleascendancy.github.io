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
    ["promo", "Promo"],
    ["trailer", "Trailers"],
    ["highlight", "Highlights"],
    ["motion", "Motion Design"],
    ["anime", "Anime / Mangá"],
    ["gaming", "Gaming"],
    ["tiktok", "TikTok"],
    ["reels", "Reels"],
    ["amv", "AMV"],
    ["thumbnail", "Thumbnails"],
    ["youtube", "YouTube"],
    ["design", "Design Gráfico"],
    ["branding", "Branding"],
    ["uiux", "UI / UX"],
    ["illustration", "Ilustração"],
    ["3d", "3D"],
    ["outros", "Outros"]
  ];

  const CATEGORY_MAP = Object.fromEntries(CATEGORIES);

  const PLANS = {
    free: ["Gratuito", 2],
    premium: ["Premium", 5],
    pro: ["Pro", 10],
    studio: ["Studio", 20],
    elite: ["Elite", 40]
  };

  const THEME_DEFAULTS = {
    "--bg": "#08070c",
    "--bg-deep": "#05040a",
    "--surface": "#121018",
    "--surface-2": "#1a1722",
    "--text": "#f7f4fb",
    "--text-soft": "#ddd6e8",
    "--muted": "#9c94a8",
    "--cyan": "#9fe8ff",
    "--violet": "#a894ff",
    "--gold": "#e9cf91",
    "--pink": "#e6a4d0"
  };

  let client = null;
  let audio = null;
  let trackIndex = 0;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const esc = value =>
    String(value ?? "").replace(
      /[&<>\"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
      }[c])
    );

  const setMsg = (el, text, kind = "") => {
    if (!el) return;

    el.textContent = text || "";
    el.className = `auth-message ${kind}`.trim();
  };

  function getClient() {
    if (client) return client;

    if (window.supabase?.createClient) {
      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }

    return client;
  }

  async function ensureClient() {
    if (getClient()) return client;

    await new Promise(resolve => {
      const s = document.createElement("script");

      s.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

      s.onload = resolve;
      s.onerror = resolve;

      document.head.appendChild(s);
    });

    return getClient();
  }

  async function session() {
    const c = await ensureClient();

    return (
      await c.auth.getSession()
    ).data.session || null;
  }

  async function profile(userId, full = false) {
    const c = await ensureClient();

    const fields = full
      ? "id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,editor_categories,portfolio_url,editor_software,availability,professional_plan,portfolio_limit,plan_status,plan_expires_at,professional_application,requested_role"
      : "id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,professional_plan,portfolio_limit,plan_status,plan_expires_at";

    const r = await c
      .from("profile")
      .select(fields)
      .eq("id", userId)
      .maybeSingle();

    return r.data || null;
  }

  async function isAdmin(userId) {
    const c = await ensureClient();

    if (!userId) return false;

    const r = await c.rpc("is_admin");

    return !r.error && r.data === true;
  }
  // ============================================================
  // MOBILE MENU
  // ============================================================

  function setMenu(open) {
    const menu = $("#mobileMenu");
    const button = $("#menuButton");
    const backdrop = $("#paMenuBackdrop");

    if (!menu) return;

    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));

    if (button) {
      button.setAttribute("aria-expanded", String(open));
    }

    if (backdrop) {
      backdrop.classList.toggle("show", open);
    }

    document.body.classList.toggle("menu-open", open);
  }

  function initMenu() {
    const button = $("#menuButton");

    if (!button) return;

    let backdrop = $("#paMenuBackdrop");

    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "paMenuBackdrop";
      document.body.appendChild(backdrop);
    }

    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      const menu = $("#mobileMenu");
      const isOpen = menu?.classList.contains("open");

      setMenu(!isOpen);
    });

    backdrop.addEventListener("click", () => {
      setMenu(false);
    });

    $$("#mobileMenu a").forEach(link => {
      link.addEventListener("click", () => {
        setMenu(false);
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        setMenu(false);
      }
    });

    document.addEventListener("click", event => {
      const menu = $("#mobileMenu");

      if (!menu || !menu.classList.contains("open")) {
        return;
      }

      if (
        !menu.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setMenu(false);
      }
    });
  }


  // ============================================================
  // ACCOUNT UI
  // ============================================================

  async function injectAccountUI() {
    const c = await ensureClient();

    if (!c) return;

    const s = await c.auth.getSession();
    const currentSession = s.data.session;

    const accountAreas = $$("[data-account-area]");

    accountAreas.forEach(area => {
      area.innerHTML = "";

      if (!currentSession) {
        area.innerHTML = `
          <a class="account-link" href="login.html">
            Entrar
          </a>

          <a class="account-button" href="cadastro.html">
            Criar conta
          </a>
        `;

        return;
      }

      const user = currentSession.user;

      area.innerHTML = `
        <div class="account-menu">
          <button
            class="account-toggle"
            type="button"
            aria-expanded="false"
          >
            Minha conta
          </button>

          <div class="account-dropdown">
            <a href="perfil.html">Meu perfil</a>
            <a href="editar-perfil.html">Editar perfil</a>
            <a href="editor-painel.html">Área profissional</a>
            <a href="admin.html" data-admin-link>Administração</a>

            <button
              type="button"
              data-logout
            >
              Sair
            </button>
          </div>
        </div>
      `;

      const toggle = $(".account-toggle", area);
      const dropdown = $(".account-dropdown", area);

      if (toggle && dropdown) {
        toggle.addEventListener("click", event => {
          event.stopPropagation();

          const open =
            dropdown.classList.toggle("open");

          toggle.setAttribute(
            "aria-expanded",
            String(open)
          );
        });
      }

      const logout = $("[data-logout]", area);

      if (logout) {
        logout.addEventListener("click", async () => {
          await c.auth.signOut();

          window.location.href = "index.html";
        });
      }
    });

    const admin = await isAdmin(currentSession.user.id);

    $$("[data-admin-link]").forEach(link => {
      link.style.display = admin ? "" : "none";
    });
  }


  async function refreshAccountUI() {
    await injectAccountUI();
  }


  // ============================================================
  // GLOBAL THEME
  // ============================================================

  function applyTheme(settings = {}) {
    const root = document.documentElement;

    Object.entries(THEME_DEFAULTS).forEach(
      ([property, value]) => {
        root.style.setProperty(
          property,
          settings[property] || value
        );
      }
    );

    if (settings.site_title) {
      document.title = settings.site_title;
    }
  }


  async function loadGlobalTheme() {
    const c = await ensureClient();

    if (!c) {
      applyTheme();
      return;
    }

    const result = await c
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (result.error || !result.data) {
      applyTheme();
      return;
    }

    applyTheme(result.data);
  }


  // ============================================================
  // MUSIC PLAYER
  // ============================================================

  function musicGetState() {
    try {
      return JSON.parse(
        localStorage.getItem(
          "pa_music_state"
        ) || "{}"
      );
    } catch {
      return {};
    }
  }


  function musicSaveState() {
    try {
      localStorage.setItem(
        "pa_music_state",
        JSON.stringify({
          trackIndex,
          paused: audio
            ? audio.paused
            : true
        })
      );
    } catch {}
  }


  function musicCreatePlayer() {
    let player = $("#paMusicPlayer");

    if (player) return player;

    player = document.createElement("div");

    player.id = "paMusicPlayer";

    player.innerHTML = `
      <button
        type="button"
        class="music-main-button"
        data-music-toggle
        aria-label="Reproduzir música"
      >
        ▶
      </button>

      <button
        type="button"
        class="music-title"
        data-music-list
      >
        Meaningful Love
      </button>

      <button
        type="button"
        class="music-next"
        data-music-next
        aria-label="Próxima música"
      >
        ›
      </button>
    `;

    document.body.appendChild(player);

    return player;
  }


  function loadTrack(index, autoplay = false) {
    if (!PLAYLIST.length) return;

    trackIndex =
      ((index % PLAYLIST.length) +
        PLAYLIST.length) %
      PLAYLIST.length;

    const [name, source] =
      PLAYLIST[trackIndex];

    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";

      audio.addEventListener(
        "ended",
        () => {
          nextMusic(true);
        }
      );
    }

    audio.src = source;

    const title = $(
      "[data-music-list-title]"
    );

    if (title) {
      title.textContent = name;
    }

    const player =
      $("#paMusicPlayer");

    if (player) {
      const button = $(
        "[data-music-toggle]",
        player
      );

      if (button) {
        button.textContent =
          autoplay ? "❚❚" : "▶";
      }

      const titleButton = $(
        "[data-music-list]",
        player
      );

      if (titleButton) {
        titleButton.textContent = name;
      }
    }

    musicSaveState();

    if (autoplay) {
      playMusic();
    }
  }


  async function playMusic() {
    if (!audio) {
      loadTrack(trackIndex);
    }

    if (!audio) return;

    try {
      await audio.play();

      const button = $(
        "[data-music-toggle]"
      );

      if (button) {
        button.textContent = "❚❚";
      }

      musicSaveState();
    } catch {
      // O navegador pode bloquear autoplay.
      // O usuário poderá iniciar pelo botão.
    }
  }


  function pauseMusic() {
    if (!audio) return;

    audio.pause();

    const button = $(
      "[data-music-toggle]"
    );

    if (button) {
      button.textContent = "▶";
    }

    musicSaveState();
  }


  function toggleMusic() {
    if (!audio) {
      loadTrack(trackIndex, true);
      return;
    }

    if (audio.paused) {
      playMusic();
    } else {
      pauseMusic();
    }
  }


  function nextMusic(autoplay = true) {
    trackIndex =
      (trackIndex + 1) %
      PLAYLIST.length;

    loadTrack(
      trackIndex,
      autoplay
    );
  }


  function openMusicList() {
    let modal =
      $("#paMusicModal");

    if (!modal) {
      modal =
        document.createElement("div");

      modal.id = "paMusicModal";

      modal.innerHTML = `
        <div class="music-modal-backdrop"></div>

        <div class="music-modal">
          <div class="music-modal-header">
            <div>
              <span class="eyebrow">
                PALE ASCENDANCY
              </span>

              <h2>Biblioteca musical</h2>
            </div>

            <button
              type="button"
              data-music-close
            >
              ×
            </button>
          </div>

          <input
            type="search"
            class="music-search"
            placeholder="Pesquisar música..."
            data-music-search
          />

          <div
            class="music-list"
            data-music-list-container
          ></div>

          <div class="music-suggestion">
            <input
              type="text"
              placeholder="Sugerir uma música..."
              data-music-suggestion
            />

            <button
              type="button"
              data-music-suggest-button
            >
              Sugerir
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      $(
        "[data-music-close]",
        modal
      )?.addEventListener(
        "click",
        () => {
          modal.classList.remove("open");
        }
      );

      $(
        ".music-modal-backdrop",
        modal
      )?.addEventListener(
        "click",
        () => {
          modal.classList.remove("open");
        }
      );

      $(
        "[data-music-search]",
        modal
      )?.addEventListener(
        "input",
        event => {
          renderMusic(
            event.target.value
          );
        }
      );

      $(
        "[data-music-suggest-button]",
        modal
      )?.addEventListener(
        "click",
        () => {
          const input = $(
            "[data-music-suggestion]",
            modal
          );

          const value =
            input?.value.trim();

          if (!value) return;

          input.value = "";

          alert(
            "Sugestão recebida. Obrigado!"
          );
        }
      );
    }

    renderMusic();

    modal.classList.add("open");
  }


  function renderMusic(search = "") {
    const container = $(
      "[data-music-list-container]"
    );

    if (!container) return;

    const term =
      search.trim().toLowerCase();

    const filtered =
      PLAYLIST.filter(
        ([name]) =>
          !term ||
          name
            .toLowerCase()
            .includes(term)
      );

    container.innerHTML =
      filtered
        .map(([name, source]) => {
          const index =
            PLAYLIST.findIndex(
              item =>
                item[0] === name &&
                item[1] === source
            );

          const active =
            index === trackIndex;

          return `
            <button
              type="button"
              class="music-item ${
                active ? "active" : ""
              }"
              data-track-index="${index}"
            >
              <span>${esc(name)}</span>
              <small>
                ${active ? "Tocando" : "Reproduzir"}
              </small>
            </button>
          `;
        })
        .join("");

    $$(".music-item", container)
      .forEach(item => {
        item.addEventListener(
          "click",
          () => {
            const index =
              Number(
                item.dataset.trackIndex
              );

            loadTrack(
              index,
              true
            );

            $("#paMusicModal")
              ?.classList
              .remove("open");
          }
        );
      });
  }
