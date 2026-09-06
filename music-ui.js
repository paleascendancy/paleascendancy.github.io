(() => {
  "use strict";

  const TRACKS = [
    "Meaningful Love",
    "Better Days",
    "Chill Day",
    "Canals",
    "Tek It — Hoodtrap Remix",
    "Star Shopping",
    "Earrings",
    "New Jeans Jersey Remix",
    "Nuts — Instrumental Slowed",
    "Sweater Weather — Instrumental",
    "Childish Gambino — Instrumental"
  ];

  function currentTrackIndex() {
    const title = document.getElementById("musicTitle")?.textContent?.trim() || "";
    const index = TRACKS.findIndex((track) => track === title);
    return index >= 0 ? index : 0;
  }

  function updateLibraryActive() {
    const current = currentTrackIndex();
    document.querySelectorAll(".music-library-track").forEach((button, index) => {
      button.classList.toggle("active", index === current);
      button.setAttribute("aria-current", index === current ? "true" : "false");
    });
  }

  function selectTrack(targetIndex) {
    const next = document.getElementById("musicNext");
    const play = document.getElementById("musicPlay");
    const audio = document.getElementById("musicAudio");
    if (!next || !audio) return;

    const current = currentTrackIndex();
    const steps = (targetIndex - current + TRACKS.length) % TRACKS.length;
    for (let i = 0; i < steps; i += 1) next.click();

    if (audio.paused && play) play.click();
    window.setTimeout(updateLibraryActive, 80);
  }

  function createLibrary() {
    if (document.getElementById("musicLibraryPanel")) return;

    const playerMain = document.querySelector("#musicPlayer .music-player-main");
    if (!playerMain) return;

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
    panel.className = "music-library-panel";
    panel.setAttribute("aria-label", "Biblioteca de músicas");
    panel.innerHTML = `
      <div class="music-library-head">
        <div><strong>Biblioteca</strong><span>${TRACKS.length} faixas</span></div>
        <button class="music-library-close" type="button" aria-label="Fechar biblioteca">×</button>
      </div>
      <div class="music-library-list">
        ${TRACKS.map((track, index) => `
          <button class="music-library-track" type="button" data-track-index="${index}">
            <span class="music-library-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="music-library-name">${track}</span>
          </button>`).join("")}
      </div>`;
    document.body.appendChild(panel);

    const setOpen = (open) => {
      panel.classList.toggle("open", open);
      libraryButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) updateLibraryActive();
    };

    libraryButton.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
    panel.querySelector(".music-library-close")?.addEventListener("click", () => setOpen(false));
    panel.querySelectorAll(".music-library-track").forEach((button) => {
      button.addEventListener("click", () => {
        selectTrack(Number(button.dataset.trackIndex || 0));
        setOpen(false);
      });
    });

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !panel.classList.contains("open")) return;
      if (!target.closest("#musicLibraryPanel, #musicLibraryButton")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    document.getElementById("musicNext")?.addEventListener("click", () => window.setTimeout(updateLibraryActive, 60));
    document.getElementById("musicAudio")?.addEventListener("play", updateLibraryActive);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createLibrary, { once: true });
  else createLibrary();
})();
