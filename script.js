/* =========================================================
   PALE ASCENDANCY — SCRIPT.JS
   Menu + busca + navegação + player global de música
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURAÇÕES
  ========================================================= */

  const PLAYLIST = [
    {
      title: "Meaningful Love",
      file: "assets/music/meaningful love (slowed instrumental)(MP3_160K).mp3"
    },
    {
      title: "Better Days",
      file: "assets/music/LAKEY INSPIRED - Better Days (MP3_160K).mp3"
    },
    {
      title: "Chill Day",
      file: "assets/music/LAKEY INSPIRED - Chill Day (MP3_160K).mp3"
    },
    {
      title: "Canals",
      file: "assets/music/Joakim Karud - Canais(MP3_160K).mp3"
    },
    {
      title: "Tek It — Hoodtrap Remix",
      file: "assets/music/Cafuné - Tek it (Tai2Talented☆ Hoodtrap Remix)(MP3_160K).mp3"
    },
    {
      title: "Star Shopping",
      file: "assets/music/Lil Peep - Star Shopping (Áudio Oficial)(MP3_160K).mp3"
    },
    {
      title: "Earrings",
      file: "assets/music/Malcolm Todd - Earrings (Visualizador Oficial)(MP3_160K).mp3"
    },
    {
      title: "New Jeans Jersey Remix",
      file: "assets/music/New Jeans Jersey Remix SLOWED - (Jiandro x Dxrkaii)(MP3_160K).mp3"
    },
    {
      title: "Nuts — Slowed",
      file: "assets/music/Instrumental de Nuts (Versão Lenta) (MP3_160K).mp3"
    },
    {
      title: "Sweater Weather",
      file: "assets/music/The Neighbourhood - Sweater Weather (Instrumental Oficial) (MP3_160K).mp3"
    },
    {
      title: "Infantil Instrumental",
      file: "assets/music/les gambino infantil instrumental _foryoupage _song _fyp _slowandreverb _instrumental _Mreso(MP3).mp3"
    }
  ];

  const STORAGE = {
    index: "pa_music_index",
    time: "pa_music_time",
    playing: "pa_music_playing",
    volume: "pa_music_volume",
    suggestions: "pa_music_suggestions"
  };

  let audio = null;
  let currentIndex = 0;
  let isPlaying = false;
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let animationFrame = null;
  let navigationInProgress = false;

  /* =========================================================
     UTILIDADES
  ========================================================= */

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (_) {}
  }

  function load(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function absoluteURL(path) {
    try {
      return new URL(path, document.baseURI).href;
    } catch (_) {
      return path;
    }
  }

  function isSameOrigin(url) {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch (_) {
      return false;
    }
  }

  /* =========================================================
     MENU MOBILE
  ========================================================= */

  function initMobileMenu() {
    const menuButton =
      qs("#menuToggle") ||
      qs(".menu-toggle") ||
      qs("#mobileMenuButton");

    const mobileMenu =
      qs("#mobileMenu") ||
      qs(".mobile-menu");

    if (!menuButton || !mobileMenu) return;

    if (menuButton.dataset.paMenuReady === "1") return;

    menuButton.dataset.paMenuReady = "1";

    menuButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const opened =
        mobileMenu.classList.toggle("active") ||
        mobileMenu.classList.contains("open");

      menuButton.setAttribute(
        "aria-expanded",
        mobileMenu.classList.contains("active") ||
        mobileMenu.classList.contains("open")
          ? "true"
          : "false"
      );
    });

    qsa("a", mobileMenu).forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("active");
        mobileMenu.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      if (
        !mobileMenu.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        mobileMenu.classList.remove("active");
        mobileMenu.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* =========================================================
     BUSCA
  ========================================================= */

  function initSearch() {
    const searchInputs = qsa(
      'input[type="search"], .search-input, #searchInput'
    );

    searchInputs.forEach((input) => {
      if (input.dataset.paSearchReady === "1") return;

      input.dataset.paSearchReady = "1";

      input.addEventListener("input", () => {
        const term = input.value.trim().toLowerCase();

        const containers = qsa(
          ".editor-card, .service-card, .card, .search-item"
        );

        containers.forEach((item) => {
          const text = item.textContent.toLowerCase();

          item.style.display =
            !term || text.includes(term)
              ? ""
              : "none";
        });
      });
    });
  }

  /* =========================================================
     LINKS EXTERNOS
  ========================================================= */

  function initExternalLinks() {
    qsa("a[href]").forEach((link) => {
      if (link.dataset.paExternalReady === "1") return;

      const href = link.getAttribute("href");

      if (!href) return;

      if (
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        try {
          const url = new URL(href);

          if (url.origin !== location.origin) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
        } catch (_) {}
      }

      link.dataset.paExternalReady = "1";
    });
  }

  /* =========================================================
     PLAYER HTML
  ========================================================= */

  function createPlayer() {
    let player = qs("#musicPlayer");

    if (!player) {
      player = document.createElement("div");

      player.id = "musicPlayer";
      player.className = "music-player";

      player.innerHTML = `
        <div class="music-player-main">

          <button
            class="music-play"
            id="musicPlay"
            type="button"
            aria-label="Reproduzir música"
          >
            ▶
          </button>

          <button
            class="music-title-button"
            id="musicTitleButton"
            type="button"
            aria-label="Abrir lista de músicas"
          >
            <span class="music-label">
              PALE ASCENDANCY
            </span>

            <strong id="musicTitle">
              Meaningful Love
            </strong>

            <span id="musicStatus">
              Toque para começar
            </span>
          </button>

          <button
            class="music-next"
            id="musicNext"
            type="button"
            aria-label="Próxima música"
          >
            ›
          </button>

        </div>

        <audio
          id="musicAudio"
          preload="metadata"
        ></audio>
      `;

      document.body.appendChild(player);
    }

    audio = qs("#musicAudio");

    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "musicAudio";
      audio.preload = "metadata";
      player.appendChild(audio);
    }

    return player;
  }

  /* =========================================================
     PAINEL DE MÚSICAS
  ========================================================= */

  function ensurePanel() {
    let panel = qs("#musicPanel");

    if (panel) return panel;

    panel = document.createElement("div");

    panel.id = "musicPanel";
    panel.className = "music-panel";
    panel.hidden = true;

    panel.innerHTML = `
      <div class="music-panel-inner">

        <div class="music-panel-header">

          <div>
            <span class="music-panel-kicker">
              PALE ASCENDANCY
            </span>

            <h3>
              Músicas
            </h3>
          </div>

          <button
            id="musicPanelClose"
            class="music-panel-close"
            type="button"
            aria-label="Fechar"
          >
            ×
          </button>

        </div>

        <div class="music-search-wrap">

          <input
            id="musicSearch"
            class="music-search"
            type="search"
            placeholder="Pesquisar música..."
            autocomplete="off"
          >

        </div>

        <div
          id="musicList"
          class="music-list"
        ></div>

        <div class="music-suggestion">

          <div class="music-suggestion-title">
            Sugira uma música
          </div>

          <div class="music-suggestion-row">

            <input
              id="musicSuggestionInput"
              type="text"
              placeholder="Nome da música..."
              maxlength="120"
            >

            <button
              id="musicSuggestionSend"
              type="button"
            >
              Enviar
            </button>

          </div>

          <small id="musicSuggestionStatus"></small>

        </div>

      </div>
    `;

    document.body.appendChild(panel);

    renderPlaylist();

    const close = qs("#musicPanelClose");

    if (close) {
      close.addEventListener("click", closeMusicPanel);
    }

    const search = qs("#musicSearch");

    if (search) {
      search.addEventListener("input", () => {
        renderPlaylist(search.value);
      });
    }

    const send = qs("#musicSuggestionSend");

    if (send) {
      send.addEventListener("click", sendSuggestion);
    }

    return panel;
  }

  function openMusicPanel() {
    const panel = ensurePanel();

    panel.hidden = false;

    requestAnimationFrame(() => {
      panel.classList.add("active");
    });

    const search = qs("#musicSearch");

    if (search) {
      setTimeout(() => {
        search.focus();
      }, 100);
    }
  }

  function closeMusicPanel() {
    const panel = qs("#musicPanel");

    if (!panel) return;

    panel.classList.remove("active");

    setTimeout(() => {
      panel.hidden = true;
    }, 180);
  }

  /* =========================================================
     LISTA DE MÚSICAS
  ========================================================= */

  function renderPlaylist(filter = "") {
    const list = qs("#musicList");

    if (!list) return;

    const term = String(filter).trim().toLowerCase();

    list.innerHTML = "";

    PLAYLIST.forEach((track, index) => {
      if (
        term &&
        !track.title.toLowerCase().includes(term)
      ) {
        return;
      }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "music-list-item";

      if (index === currentIndex) {
        button.classList.add("current");
      }

      button.innerHTML = `
        <span class="music-list-number">
          ${String(index + 1).padStart(2, "0")}
        </span>

        <span class="music-list-name">
          ${escapeHTML(track.title)}
        </span>

        <span class="music-list-action">
          ${index === currentIndex && isPlaying ? "Ⅱ" : "▶"}
        </span>
      `;

      button.addEventListener("click", () => {
        loadTrack(index, true);
      });

      list.appendChild(button);
    });

    if (!list.children.length) {
      list.innerHTML = `
        <div class="music-empty">
          Nenhuma música encontrada.
        </div>
      `;
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================================================
     PLAYER
  ========================================================= */

  function getPlayerElements() {
    return {
      play: qs("#musicPlay"),
      title: qs("#musicTitle"),
      titleButton: qs("#musicTitleButton"),
      status: qs("#musicStatus"),
      next: qs("#musicNext")
    };
  }

  function updatePlayerUI() {
    const {
      play,
      title,
      status
    } = getPlayerElements();

    const track = PLAYLIST[currentIndex];

    if (title && track) {
      title.textContent = track.title;
    }

    if (play) {
      play.textContent = isPlaying ? "Ⅱ" : "▶";

      play.setAttribute(
        "aria-label",
        isPlaying
          ? "Pausar música"
          : "Reproduzir música"
      );
    }

    if (status) {
      if (isPlaying) {
        status.textContent = "Reproduzindo";
      } else {
        status.textContent = "Pausado";
      }
    }

    renderPlaylist(
      qs("#musicSearch")
        ? qs("#musicSearch").value
        : ""
    );
  }

  function loadTrack(index, autoPlay = false) {
    if (!PLAYLIST.length || !audio) return;

    if (index < 0) {
      index = PLAYLIST.length - 1;
    }

    if (index >= PLAYLIST.length) {
      index = 0;
    }

    currentIndex = index;

    const track = PLAYLIST[currentIndex];

    save(STORAGE.index, currentIndex);
    save(STORAGE.time, 0);

    audio.pause();

    audio.src = absoluteURL(track.file);
    audio.load();

    updatePlayerUI();

    if (autoPlay) {
      playMusic();
    }
  }

  async function playMusic() {
    if (!audio) return;

    try {
      await setupAudioAnalyser();

      await audio.play();

      isPlaying = true;

      save(STORAGE.playing, "1");

      updatePlayerUI();

      startBeatAnimation();

    } catch (error) {
      isPlaying = false;

      updatePlayerUI();

      /*
        Autoplay com som pode ser bloqueado pelo navegador.
        Nesse caso esperamos a primeira interação do usuário.
      */
    }
  }

  function pauseMusic() {
    if (!audio) return;

    audio.pause();

    isPlaying = false;

    save(STORAGE.playing, "0");

    updatePlayerUI();

    stopBeatAnimation();
  }

  function toggleMusic() {
    if (!audio) return;

    if (audio.paused) {
      playMusic();
    } else {
      pauseMusic();
    }
  }

  function nextTrack() {
    const nextIndex =
      (currentIndex + 1) % PLAYLIST.length;

    loadTrack(nextIndex, true);
  }

  /* =========================================================
     AUTOPLAY / PRIMEIRA INTERAÇÃO
  ========================================================= */

  function installAutoplayUnlock() {
    const events = [
      "pointerdown",
      "touchstart",
      "keydown"
    ];

    const unlock = () => {
      if (!audio) return;

      if (audio.paused) {
        playMusic();
      }

      events.forEach((event) => {
        document.removeEventListener(
          event,
          unlock,
          true
        );
      });
    };

    events.forEach((event) => {
      document.addEventListener(
        event,
        unlock,
        {
          capture: true,
          passive: true
        }
      );
    });
  }

  /* =========================================================
     ÁUDIO / ANALYSER
  ========================================================= */

  async function setupAudioAnalyser() {
    if (!audio) return;

    if (audioContext) {
      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch (_) {}
      }

      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) return;

      audioContext = new AudioContext();

      analyser = audioContext.createAnalyser();

      analyser.fftSize = 128;

      analyser.smoothingTimeConstant = 0.82;

      sourceNode =
        audioContext.createMediaElementSource(audio);

      sourceNode.connect(analyser);

      analyser.connect(audioContext.destination);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    } catch (_) {
      audioContext = null;
      analyser = null;
      sourceNode = null;
    }
  }

  function startBeatAnimation() {
    if (animationFrame) return;

    const data =
      analyser
        ? new Uint8Array(analyser.frequencyBinCount)
        : null;

    const phone =
      qs(".phone") ||
      qs(".phone-mockup");

    const beatBars =
      qs("#beatBars");

    const animate = () => {
      animationFrame =
        requestAnimationFrame(animate);

      let intensity = 0;

      if (analyser && data) {
        analyser.getByteFrequencyData(data);

        let total = 0;

        for (let i = 0; i < data.length; i++) {
          total += data[i];
        }

        intensity =
          total / data.length / 255;
      } else {
        intensity =
          0.35 +
          Math.sin(Date.now() / 220) * 0.08;
      }

      intensity = Math.max(
        0,
        Math.min(1, intensity)
      );

      if (phone) {
        const scale =
          1 + intensity * 0.018;

        const glow =
          0.25 + intensity * 0.75;

        phone.style.setProperty(
          "--beat-scale",
          scale.toFixed(3)
        );

        phone.style.setProperty(
          "--beat-glow",
          glow.toFixed(2)
        );
      }

      if (beatBars) {
        const bars = qsa("i", beatBars);

        bars.forEach((bar, index) => {
          const value =
            0.25 +
            intensity *
              (0.55 +
                Math.sin(
                  Date.now() / 120 +
                  index
                ) *
                  0.25);

          bar.style.transform =
            `scaleY(${Math.max(
              0.25,
              Math.min(1.2, value)
            )})`;
        });
      }
    };

    animate();
  }

  function stopBeatAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    const phone =
      qs(".phone") ||
      qs(".phone-mockup");

    if (phone) {
      phone.style.setProperty(
        "--beat-scale",
        "1"
      );

      phone.style.setProperty(
        "--beat-glow",
        "0.25"
      );
    }
  }

  /* =========================================================
     EVENTOS DO PLAYER
  ========================================================= */

  function initMusicControls() {
    createPlayer();
    ensurePanel();

    const {
      play,
      titleButton,
      next
    } = getPlayerElements();

    if (play && play.dataset.paMusicReady !== "1") {
      play.dataset.paMusicReady = "1";

      play.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          toggleMusic();
        }
      );
    }

    if (
      titleButton &&
      titleButton.dataset.paMusicReady !== "1"
    ) {
      titleButton.dataset.paMusicReady = "1";

      titleButton.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          openMusicPanel();
        }
      );
    }

    if (
      next &&
      next.dataset.paMusicReady !== "1"
    ) {
      next.dataset.paMusicReady = "1";

      next.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          nextTrack();
        }
      );
    }

    if (
      audio &&
      audio.dataset.paMusicReady !== "1"
    ) {
      audio.dataset.paMusicReady = "1";

      audio.addEventListener(
        "ended",
        () => {
          nextTrack();
        }
      );

      audio.addEventListener(
        "timeupdate",
        () => {
          if (
            Number.isFinite(audio.currentTime)
          ) {
            save(
              STORAGE.time,
              audio.currentTime
            );
          }
        }
      );

      audio.addEventListener(
        "play",
        () => {
          isPlaying = true;

          save(
            STORAGE.playing,
            "1"
          );

          updatePlayerUI();

          startBeatAnimation();
        }
      );

      audio.addEventListener(
        "pause",
        () => {
          isPlaying = false;

          save(
            STORAGE.playing,
            "0"
          );

          updatePlayerUI();

          stopBeatAnimation();
        }
      );

      audio.addEventListener(
        "error",
        () => {
          const status =
            qs("#musicStatus");

          if (status) {
            status.textContent =
              "Não foi possível carregar esta faixa";
          }

          isPlaying = false;

          updatePlayerUI();
        }
      );
    }

    restoreMusicState();
  }

  /* =========================================================
     RESTAURAR MÚSICA
  ========================================================= */

  function restoreMusicState() {
    if (!audio) return;

    let savedIndex =
      parseInt(
        load(STORAGE.index, "0"),
        10
      );

    if (
      !Number.isFinite(savedIndex) ||
      savedIndex < 0 ||
      savedIndex >= PLAYLIST.length
    ) {
      savedIndex = 0;
    }

    currentIndex = savedIndex;

    const track = PLAYLIST[currentIndex];

    if (!track) return;

    audio.src =
      absoluteURL(track.file);

    audio.load();

    const savedTime =
      parseFloat(
        load(STORAGE.time, "0")
      );

    const savedPlaying =
      load(STORAGE.playing, "0") === "1";

    audio.addEventListener(
      "loadedmetadata",
      () => {
        if (
          Number.isFinite(savedTime) &&
          savedTime > 0 &&
          savedTime < audio.duration
        ) {
          try {
            audio.currentTime =
              savedTime;
          } catch (_) {}
        }

        updatePlayerUI();

        if (savedPlaying) {
          playMusic();
        }
      },
      {
        once: true
      }
    );

    updatePlayerUI();

    /*
      Tentativa inicial de autoplay.
    */
    if (savedPlaying || currentIndex === 0) {
      setTimeout(() => {
        playMusic();
      }, 250);
    }

    installAutoplayUnlock();
  }

  /* =========================================================
     SUGESTÕES DE MÚSICAS
  ========================================================= */

  function sendSuggestion() {
    const input =
      qs("#musicSuggestionInput");

    const status =
      qs("#musicSuggestionStatus");

    if (!input || !status) return;

    const value =
      input.value.trim();

    if (!value) {
      status.textContent =
        "Digite o nome de uma música.";

      return;
    }

    let suggestions = [];

    try {
      suggestions =
        JSON.parse(
          load(
            STORAGE.suggestions,
            "[]"
          )
        );

      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch (_) {
      suggestions = [];
    }

    suggestions.push({
      music: value,
      date: new Date().toISOString()
    });

    save(
      STORAGE.suggestions,
      JSON.stringify(suggestions)
    );

    input.value = "";

    status.textContent =
      "Sugestão registrada neste dispositivo.";

    setTimeout(() => {
      status.textContent = "";
    }, 3500);
  }

  /* =========================================================
     NAVEGAÇÃO ENTRE PÁGINAS
     
     Mantém o player e o áudio vivos quando possível,
     evitando que a música reinicie.
  ========================================================= */

  function initSpaNavigation() {
    if (
      window.__PA_SPA_INITIALIZED__
    ) {
      return;
    }

    window.__PA_SPA_INITIALIZED__ = true;

    document.addEventListener(
      "click",
      async (event) => {
        const link =
          event.target.closest(
            "a[href]"
          );

        if (!link) return;

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const href =
          link.getAttribute("href");

        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          return;
        }

        let url;

        try {
          url =
            new URL(
              href,
              location.href
            );
        } catch (_) {
          return;
        }

        if (
          url.origin !== location.origin
        ) {
          return;
        }

        if (
          url.pathname === location.pathname &&
          url.search === location.search &&
          url.hash
        ) {
          return;
        }

        const extension =
          url.pathname
            .split(".")
            .pop()
            .toLowerCase();

        if (
          extension &&
          ![
            "html",
            "htm"
          ].includes(extension)
        ) {
          return;
        }

        event.preventDefault();

        await navigateWithoutReload(
          url.href,
          true
        );
      }
    );
  }

  async function navigateWithoutReload(
    targetURL,
    pushState = true
  ) {
    if (navigationInProgress) {
      return;
    }

    navigationInProgress = true;

    try {
      const response =
        await fetch(
          targetURL,
          {
            credentials: "same-origin"
          }
        );

      if (!response.ok) {
        throw new Error(
          "Página não encontrada"
        );
      }

      const html =
        await response.text();

      const parser =
        new DOMParser();

      const doc =
        parser.parseFromString(
          html,
          "text/html"
        );

      const newMain =
        doc.querySelector("main");

      const currentMain =
        document.querySelector("main");

      if (
        !newMain ||
        !currentMain
      ) {
        location.href = targetURL;
        return;
      }

      currentMain.replaceWith(
        newMain
      );

      if (doc.title) {
        document.title =
          doc.title;
      }

      if (pushState) {
        history.pushState(
          {
            paNavigation: true
          },
          "",
          targetURL
        );
      }

      window.scrollTo(
        0,
        0
      );

      /*
        Não recriamos o player.
        O áudio continua exatamente onde estava.
      */

      initMobileMenu();
      initSearch();
      initExternalLinks();

      /*
        Algumas páginas possuem elementos que
        dependem do carregamento do DOM.
      */
      document.dispatchEvent(
        new CustomEvent(
          "pa:navigation",
          {
            detail: {
              url: targetURL
            }
          }
        )
      );

    } catch (error) {
      /*
        Se a navegação sem reload falhar,
        fazemos a navegação normal.
      */

      location.href = targetURL;

    } finally {
      navigationInProgress = false;
    }
  }

  function initHistoryNavigation() {
    window.addEventListener(
      "popstate",
      () => {
        location.reload();
      }
    );
  }

  /* =========================================================
     PROTEÇÃO CONTRA RECARREGAMENTO
  ========================================================= */

  window.addEventListener(
    "beforeunload",
    () => {
      if (!audio) return;

      save(
        STORAGE.index,
        currentIndex
      );

      save(
        STORAGE.time,
        audio.currentTime || 0
      );

      save(
        STORAGE.playing,
        audio.paused
          ? "0"
          : "1"
      );
    }
  );

  /* =========================================================
     API GLOBAL
  ========================================================= */

  window.PaleAscendancy =
    window.PaleAscendancy || {};

  window.PaleAscendancy.music = {
    play: playMusic,
    pause: pauseMusic,
    toggle: toggleMusic,
    next: nextTrack,
    open: openMusicPanel,
    close: closeMusicPanel,
    getPlaylist: () =>
      PLAYLIST.slice(),
    getCurrent: () =>
      PLAYLIST[currentIndex]
  };

  /* =========================================================
     INICIALIZAÇÃO
  ========================================================= */

  function boot() {
    initMobileMenu();
    initSearch();
    initExternalLinks();

    /*
      Player global.
      Ele é criado também nas páginas que não possuem
      o HTML do player.
    */
    initMusicControls();

    /*
      Navegação sem recarregar a página.
      Isso permite manter o áudio tocando.
    */
    initSpaNavigation();

    initHistoryNavigation();
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }

})();
