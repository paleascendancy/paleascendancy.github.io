(() => {
  "use strict";

  const TRACKS = [
    { title: "Meaningful Love", file: "music/01-meaningful-love.mp3", group: "lofi" },
    { title: "Better Days", file: "music/02-better-days.mp3", group: "lofi" },
    { title: "Chill Day", file: "music/03-chill-day.mp3", group: "lofi" },
    { title: "Canals", file: "music/04-canals.mp3", group: "eletronica" },
    { title: "Tek It — Hoodtrap Remix", file: "music/05-tek-it-hoodtrap-remix.mp3", group: "remix" },
    { title: "Star Shopping", file: "music/06-star-shopping.mp3", group: "lofi" },
    { title: "Earrings", file: "music/07-earrings.mp3", group: "eletronica" },
    { title: "New Jeans Jersey Remix", file: "music/08-new-jeans-jersey-remix.mp3", group: "remix" },
    { title: "Nuts — Instrumental Slowed", file: "music/09-nuts-instrumental-slowed.mp3", group: "instrumental" },
    { title: "Sweater Weather — Instrumental", file: "music/10-sweater-weather-instrumental.mp3", group: "instrumental" },
    { title: "Childish Gambino — Instrumental", file: "music/11-childish-gambino-instrumental.mp3", group: "instrumental" }
  ];

  const durations = new Map();
  let activeFilter = "todas";
  let repeatEnabled = false;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function currentTrackIndex() {
    const title = document.getElementById("musicTitle")?.textContent?.trim() || "";
    const index = TRACKS.findIndex((track) => track.title === title);
    return index >= 0 ? index : 0;
  }

  function stepTo(targetIndex, autoplay = true) {
    const next = document.getElementById("musicNext");
    const play = document.getElementById("musicPlay");
    const audio = document.getElementById("musicAudio");
    if (!next || !audio) return;
    const current = currentTrackIndex();
    const steps = (targetIndex - current + TRACKS.length) % TRACKS.length;
    for (let i = 0; i < steps; i += 1) next.click();
    if (autoplay && audio.paused && play) play.click();
    window.setTimeout(syncUI, 80);
  }

  function previousTrack() {
    stepTo((currentTrackIndex() - 1 + TRACKS.length) % TRACKS.length, true);
  }

  function shuffleTrack() {
    const current = currentTrackIndex();
    let target = current;
    if (TRACKS.length > 1) {
      while (target === current) target = Math.floor(Math.random() * TRACKS.length);
    }
    stepTo(target, true);
  }

  function trackMatches(track) {
    return activeFilter === "todas" || track.group === activeFilter;
  }

  function renderTracks() {
    const list = document.querySelector(".music-library-list");
    if (!list) return;
    const current = currentTrackIndex();
    list.innerHTML = TRACKS.map((track, index) => {
      if (!trackMatches(track)) return "";
      const active = index === current;
      return `<button class="music-library-track${active ? " active" : ""}" type="button" data-track-index="${index}" aria-current="${active ? "true" : "false"}">
        <span class="music-cover music-cover-${index % 6}"><span>♪</span></span>
        <span class="music-library-copy"><strong>${track.title}</strong><small>PALE ASCENDANCY</small></span>
        <span class="music-library-playing" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="music-library-duration" data-duration-index="${index}">${formatTime(durations.get(index))}</span>
        <span class="music-library-more" aria-hidden="true">⋮</span>
      </button>`;
    }).join("") || '<div class="music-library-empty">Nenhuma faixa nesta categoria.</div>';

    list.querySelectorAll(".music-library-track").forEach((button) => {
      button.addEventListener("click", () => stepTo(Number(button.dataset.trackIndex || 0), true));
    });
  }

  function loadDurations() {
    TRACKS.forEach((track, index) => {
      if (durations.has(index)) return;
      const probe = new Audio();
      probe.preload = "metadata";
      probe.src = track.file;
      probe.addEventListener("loadedmetadata", () => {
        durations.set(index, probe.duration);
        document.querySelectorAll(`[data-duration-index="${index}"]`).forEach((el) => {
          el.textContent = formatTime(probe.duration);
        });
      }, { once: true });
    });
  }

  function syncUI() {
    const audio = document.getElementById("musicAudio");
    const panel = document.getElementById("musicLibraryPanel");
    if (!audio || !panel) return;
    const current = currentTrackIndex();
    const track = TRACKS[current];

    panel.querySelectorAll(".music-library-track").forEach((button) => {
      const active = Number(button.dataset.trackIndex) === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
    });

    panel.querySelector("#libraryCurrentTitle")?.replaceChildren(document.createTextNode(track?.title || "Faixa"));
    const cover = panel.querySelector("#libraryCurrentCover");
    if (cover) cover.className = `music-cover music-cover-large music-cover-${current % 6}`;

    const play = panel.querySelector("#libraryPlay");
    if (play) {
      play.textContent = audio.paused ? "▶" : "Ⅱ";
      play.setAttribute("aria-label", audio.paused ? "Reproduzir" : "Pausar");
    }

    const currentTime = panel.querySelector("#libraryCurrentTime");
    const totalTime = panel.querySelector("#libraryTotalTime");
    if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
    if (totalTime) totalTime.textContent = formatTime(audio.duration);

    const progress = panel.querySelector("#libraryProgress");
    if (progress && Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = String((audio.currentTime / audio.duration) * 100);
      progress.style.setProperty("--music-progress", `${progress.value}%`);
    }
  }

  function createLibrary() {
    if (document.getElementById("musicLibraryPanel")) return;
    const playerMain = document.querySelector("#musicPlayer .music-player-main");
    const audio = document.getElementById("musicAudio");
    const mainPlay = document.getElementById("musicPlay");
    const mainNext = document.getElementById("musicNext");
    if (!playerMain || !audio) return;

    let libraryButton = document.getElementById("musicLibraryButton");
    if (!libraryButton) {
      libraryButton = document.createElement("button");
      libraryButton.id = "musicLibraryButton";
      libraryButton.className = "music-library-button";
      libraryButton.type = "button";
      libraryButton.setAttribute("aria-label", "Abrir biblioteca de músicas");
      libraryButton.setAttribute("aria-expanded", "false");
      libraryButton.textContent = "☰";
      playerMain.appendChild(libraryButton);
    }

    const panel = document.createElement("section");
    panel.id = "musicLibraryPanel";
    panel.className = "music-library-panel music-library-premium";
    panel.setAttribute("aria-label", "Biblioteca de músicas");
    panel.innerHTML = `
      <div class="music-library-head">
        <div class="music-library-heading-icon">♫</div>
        <div class="music-library-heading-copy"><strong>Biblioteca</strong><span>${TRACKS.length} faixas disponíveis</span></div>
        <button class="music-library-close" type="button" aria-label="Fechar biblioteca">×</button>
      </div>
      <div class="music-library-filters" role="tablist" aria-label="Categorias">
        <button class="active" type="button" data-music-filter="todas">Todas</button>
        <button type="button" data-music-filter="lofi">Lofi</button>
        <button type="button" data-music-filter="eletronica">Eletrônica</button>
        <button type="button" data-music-filter="instrumental">Instrumental</button>
        <button type="button" data-music-filter="remix">Remix</button>
      </div>
      <div class="music-library-list"></div>
      <div class="music-library-now">
        <span id="libraryCurrentCover" class="music-cover music-cover-large music-cover-0"><span>♪</span></span>
        <div class="music-library-now-copy"><strong id="libraryCurrentTitle">Meaningful Love</strong><small>PALE ASCENDANCY</small><div class="music-library-progress-wrap"><input id="libraryProgress" type="range" min="0" max="100" value="0" aria-label="Progresso da música"><div><span id="libraryCurrentTime">0:00</span><span id="libraryTotalTime">--:--</span></div></div></div>
        <div class="music-library-controls">
          <button id="libraryShuffle" type="button" aria-label="Aleatório">⌘</button>
          <button id="libraryPrev" type="button" aria-label="Música anterior">‹</button>
          <button id="libraryPlay" class="music-library-main-play" type="button" aria-label="Reproduzir">▶</button>
          <button id="libraryNext" type="button" aria-label="Próxima música">›</button>
          <button id="libraryRepeat" type="button" aria-label="Repetir">↻</button>
        </div>
      </div>`;
    document.body.appendChild(panel);

    const setOpen = (open) => {
      panel.classList.toggle("open", open);
      document.body.classList.toggle("music-library-open", open);
      libraryButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        renderTracks();
        loadDurations();
        syncUI();
      }
    };

    libraryButton.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
    document.getElementById("musicTitleButton")?.addEventListener("click", () => setOpen(true));
    panel.querySelector(".music-library-close")?.addEventListener("click", () => setOpen(false));

    panel.querySelectorAll("[data-music-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.musicFilter || "todas";
        panel.querySelectorAll("[data-music-filter]").forEach((item) => item.classList.toggle("active", item === button));
        renderTracks();
        syncUI();
      });
    });

    panel.querySelector("#libraryPlay")?.addEventListener("click", () => mainPlay?.click());
    panel.querySelector("#libraryNext")?.addEventListener("click", () => mainNext?.click());
    panel.querySelector("#libraryPrev")?.addEventListener("click", previousTrack);
    panel.querySelector("#libraryShuffle")?.addEventListener("click", shuffleTrack);
    panel.querySelector("#libraryRepeat")?.addEventListener("click", (event) => {
      repeatEnabled = !repeatEnabled;
      audio.loop = repeatEnabled;
      event.currentTarget.classList.toggle("active", repeatEnabled);
      event.currentTarget.setAttribute("aria-pressed", repeatEnabled ? "true" : "false");
    });

    panel.querySelector("#libraryProgress")?.addEventListener("input", (event) => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (Number(event.currentTarget.value) / 100) * audio.duration;
      syncUI();
    });

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !panel.classList.contains("open")) return;
      if (!target.closest("#musicLibraryPanel, #musicLibraryButton, #musicTitleButton")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });

    audio.addEventListener("timeupdate", syncUI);
    audio.addEventListener("play", syncUI);
    audio.addEventListener("pause", syncUI);
    audio.addEventListener("loadedmetadata", syncUI);
    audio.addEventListener("ended", syncUI);
    mainNext?.addEventListener("click", () => window.setTimeout(() => { renderTracks(); syncUI(); }, 60));

    renderTracks();
    syncUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createLibrary, { once: true });
  else createLibrary();
})();
