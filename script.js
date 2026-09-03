/* ==================================================
   PALE ASCENDANCY — SISTEMA PRINCIPAL + PLAYER
   Correções sem alterar a estrutura do site.
================================================== */

(() => {
    "use strict";

    const PLAYLIST = [
        ["Meaningful Love", "assets/music/meaningful love (slowed instrumental)(MP3_160K).mp3"],
        ["Cafuné — Tek It", "assets/music/Cafuné - Tek it (Tai2Talented☆ Hoodtrap Remix)(MP3_160K).mp3"],
        ["Canals", "assets/music/Joakim Karud - Canais(MP3_160K).mp3"],
        ["Better Days", "assets/music/LAKEY INSPIRED - Better Days (MP3_160K).mp3"],
        ["Chill Day", "assets/music/LAKEY INSPIRED - Chill Day (MP3_160K).mp3"],
        ["Star Shopping", "assets/music/Lil Peep - Star Shopping (Áudio Oficial)(MP3_160K).mp3"],
        ["Earrings", "assets/music/Malcolm Todd - Earrings (Visualizador Oficial)(MP3_160K).mp3"],
        ["New Jeans Jersey Remix", "assets/music/New Jeans Jersey Remix SLOWED - (Jiandro x Dxrkaii)(MP3_160K).mp3"],
        ["Nuts — Instrumental", "assets/music/Instrumental de Nuts (Versão Lenta) (MP3_160K).mp3"],
        ["Sweater Weather — Instrumental", "assets/music/The Neighbourhood - Sweater Weather (Instrumental Oficial) (MP3_160K).mp3"],
        ["Les Gambino — Instrumental", "assets/music/les gambino infantil instrumental _foryoupage _song _fyp _slowandreverb _instrumental _Mreso(MP3).mp3"]
    ];

    const STORAGE = {
        track: "pa_music_track",
        time: "pa_music_time",
        playing: "pa_music_playing",
        suggestions: "pa_music_suggestions"
    };

    let savedTrack = Number.parseInt(
        localStorage.getItem(STORAGE.track) || "0",
        10
    );

    if (
        !Number.isFinite(savedTrack) ||
        savedTrack < 0 ||
        savedTrack >= PLAYLIST.length
    ) {
        savedTrack = 0;
    }

    const playerState = {
        index: savedTrack,
        shouldPlay:
            localStorage.getItem(STORAGE.playing) === "true",
        userStarted: false
    };

    let audioContext = null;
    let analyser = null;
    let audioSource = null;
    let frequencyData = null;
    let animationFrame = 0;
    let visualizerReady = false;
    let playerEventsReady = false;
    let navigationBusy = false;

    /* ==================================================
       UTILITÁRIOS
    ================================================== */

    function qs(selector, root = document) {
        return root.querySelector(selector);
    }

    function qsa(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
    }

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value;
        return div.innerHTML;
    }

    function getAudio() {
        return document.getElementById("musicAudio");
    }

    function getPlay() {
        return document.getElementById("musicPlay");
    }

    function getTitle() {
        return document.getElementById("musicTitle");
    }

    function getStatus() {
        return document.getElementById("musicStatus");
    }

    function getBars() {
        return qsa("#beatBars i");
    }

    function getPhone() {
        return document.querySelector(".phone");
    }

    /* ==================================================
       MENU MOBILE
    ================================================== */

    function initMenu() {
        const menuButton =
            document.getElementById("menuButton");

        const mobileMenu =
            document.getElementById("mobileMenu");

        if (
            !menuButton ||
            !mobileMenu ||
            menuButton.dataset.paReady === "1"
        ) {
            return;
        }

        menuButton.dataset.paReady = "1";

        menuButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen =
                menuButton.getAttribute("aria-expanded") === "true";

            menuButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            mobileMenu.classList.toggle(
                "active",
                !isOpen
            );

            mobileMenu.classList.toggle(
                "is-open",
                !isOpen
            );
        });

        mobileMenu.addEventListener("click", event => {
            const link =
                event.target.closest("a");

            if (!link) {
                return;
            }

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            mobileMenu.classList.remove("active");
            mobileMenu.classList.remove("is-open");
        });
    }

    /* ==================================================
       FILTRO DE EDITORES
    ================================================== */

    function initEditorFilter() {
        const searchInput =
            document.getElementById("searchInput");

        const editorsGrid =
            document.getElementById("editorsGrid");

        const filterButtons =
            qsa(".filter-button");

        const noResults =
            document.getElementById("noResults");

        if (
            !searchInput ||
            !editorsGrid ||
            !filterButtons.length ||
            searchInput.dataset.paReady === "1"
        ) {
            return;
        }

        searchInput.dataset.paReady = "1";

        const editorCards =
            qsa(".editor-profile", editorsGrid);

        let currentFilter = "todos";

        function filterEditors() {
            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();

            let visible = 0;

            editorCards.forEach(card => {
                const category =
                    (
                        card.dataset.category || ""
                    ).toLowerCase();

                const searchData =
                    (
                        card.dataset.search || ""
                    ).toLowerCase();

                const name =
                    (
                        qs("h2", card)?.textContent || ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    searchData.includes(search) ||
                    name.includes(search);

                const matchesFilter =
                    currentFilter === "todos" ||
                    category === currentFilter ||
                    category === "todos";

                const show =
                    matchesSearch &&
                    matchesFilter;

                card.style.display =
                    show ? "" : "none";

                if (show) {
                    visible++;
                }
            });

            if (noResults) {
                noResults.classList.toggle(
                    "visible",
                    visible === 0
                );
            }
        }

        searchInput.addEventListener(
            "input",
            filterEditors
        );

        filterButtons.forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    filterButtons.forEach(btn => {
                        btn.classList.remove("active");
                    });

                    button.classList.add("active");

                    currentFilter =
                        (
                            button.dataset.filter ||
                            "todos"
                        ).toLowerCase();

                    filterEditors();
                }
            );
        });
    }

    /* ==================================================
       FUNÇÕES GERAIS
    ================================================== */

    function initGeneralFeatures() {
        initMenu();
        initEditorFilter();

        const contactForm =
            document.getElementById("contactForm");

        const formNote =
            document.getElementById("formNote");

        if (
            contactForm &&
            contactForm.dataset.paReady !== "1"
        ) {
            contactForm.dataset.paReady = "1";

            contactForm.addEventListener(
                "submit",
                () => {
                    if (formNote) {
                        formNote.hidden = false;
                    }
                }
            );
        }

        qsa('a[target="_blank"]').forEach(link => {
            link.setAttribute(
                "rel",
                "noopener noreferrer"
            );
        });

        if (!window.PaleAscendancy) {
            window.PaleAscendancy = {
                version: "1.0.0",
                platform: "Pale Ascendancy",
                user: null,

                isLoggedIn() {
                    return this.user !== null;
                },

                logout() {
                    this.user = null;
                }
            };
        }
    }

    /* ==================================================
       PLAYER — HTML
    ================================================== */

    function playerMarkup() {
        return `
<div class="music-player" id="musicPlayer" aria-label="Player de música">

    <div class="music-player-main">

        <button
            class="music-play"
            id="musicPlay"
            type="button"
            aria-label="Reproduzir música"
        >▶</button>

        <button
            class="music-open"
            id="musicOpen"
            type="button"
            aria-label="Abrir lista de músicas"
        >
            <span
                class="music-open-dot"
                aria-hidden="true"
            ></span>

            <span class="music-info">
                <strong id="musicTitle">
                    Meaningful Love
                </strong>

                <span id="musicStatus">
                    Toque para começar
                </span>
            </span>
        </button>

        <button
            class="music-next"
            id="musicNext"
            type="button"
            aria-label="Próxima música"
        >›</button>

    </div>

    <audio
        id="musicAudio"
        preload="metadata"
    ></audio>

    <div
        class="music-library"
        id="musicLibrary"
        hidden
        aria-hidden="true"
    >

        <div class="music-library-head">

            <div>
                <span class="music-library-kicker">
                    PALE ASCENDANCY
                </span>

                <h3>Playlist</h3>
            </div>

            <button
                class="music-close"
                id="musicClose"
                type="button"
                aria-label="Fechar lista"
            >×</button>

        </div>

        <label class="music-search-wrap">

            <span aria-hidden="true">
                ⌕
            </span>

            <input
                id="musicSearch"
                type="search"
                placeholder="Pesquisar música..."
                autocomplete="off"
            >

        </label>

        <div
            class="music-track-list"
            id="musicTrackList"
        ></div>

        <form
            class="music-suggestion"
            id="musicSuggestionForm"
        >

            <input
                id="musicSuggestionInput"
                type="text"
                maxlength="120"
                placeholder="Sugira uma música para entrar no site..."
                autocomplete="off"
            >

            <button type="submit">
                Sugerir
            </button>

        </form>

        <p
            class="music-suggestion-note"
            id="musicSuggestionNote"
            aria-live="polite"
        ></p>

    </div>

</div>`;
    }

    /* ==================================================
       GARANTIR PLAYER
    ================================================== */

    function ensurePlayer() {
        let player =
            document.getElementById("musicPlayer");

        if (player) {
            return player;
        }

        const wrapper =
            document.createElement("div");

        wrapper.innerHTML =
            playerMarkup();

        player =
            wrapper.firstElementChild;

        const footer =
            document.querySelector("footer");

        if (footer) {
            footer.parentNode.insertBefore(
                player,
                footer
            );
        } else {
            document.body.appendChild(player);
        }

        return player;
    }

    /* ==================================================
       ABRIR / FECHAR PLAYLIST
    ================================================== */

    function openMusicLibrary() {
        const library =
            document.getElementById("musicLibrary");

        const search =
            document.getElementById("musicSearch");

        if (!library) {
            return;
        }

        library.hidden = false;

        library.setAttribute(
            "aria-hidden",
            "false"
        );

        renderTrackList(
            search?.value || ""
        );

        requestAnimationFrame(() => {
            if (search) {
                search.focus();
            }
        });
    }

    function closeMusicLibrary() {
        const library =
            document.getElementById("musicLibrary");

        if (!library) {
            return;
        }

        library.hidden = true;

        library.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    /* ==================================================
       LISTA DE MÚSICAS
    ================================================== */

    function renderTrackList(filter = "") {
        const list =
            document.getElementById(
                "musicTrackList"
            );

        if (!list) {
            return;
        }

        const query =
            String(filter)
                .toLowerCase()
                .trim();

        const matches =
            PLAYLIST
                .map((track, index) => ({
                    track,
                    index
                }))
                .filter(item => {
                    return (
                        !query ||
                        item.track[0]
                            .toLowerCase()
                            .includes(query)
                    );
                });

        if (!matches.length) {
            list.innerHTML = `
                <div class="music-empty">
                    Nenhuma música encontrada.
                </div>
            `;

            return;
        }

        list.innerHTML =
            matches
                .map(({ track, index }) => {

                    const current =
                        index === playerState.index;

                    return `
<button
    class="music-track ${current ? "is-current" : ""}"
    type="button"
    data-track-index="${index}"
>
    <span class="music-track-number">
        ${String(index + 1).padStart(2, "0")}
    </span>

    <span class="music-track-name">
        ${escapeHtml(track[0])}
    </span>

    <span class="music-track-play">
        ${current ? "●" : "▶"}
    </span>
</button>`;
                })
                .join("");

        qsa(
            ".music-track",
            list
        ).forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.trackIndex
                        );

                    loadTrack(
                        index,
                        true,
                        true
                    );

                    closeMusicLibrary();
                }
            );
        });
    }

    /* ==================================================
       PLAYER — CONTROLES DA LISTA
    ================================================== */

    function initMusicLibrary() {
        const open =
            document.getElementById("musicOpen");

        const close =
            document.getElementById("musicClose");

        const search =
            document.getElementById("musicSearch");

        const form =
            document.getElementById(
                "musicSuggestionForm"
            );

        const input =
            document.getElementById(
                "musicSuggestionInput"
            );

        const note =
            document.getElementById(
                "musicSuggestionNote"
            );

        if (
            open &&
            open.dataset.paReady !== "1"
        ) {
            open.dataset.paReady = "1";

            open.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    openMusicLibrary();
                }
            );
        }

        if (
            close &&
            close.dataset.paReady !== "1"
        ) {
            close.dataset.paReady = "1";

            close.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    closeMusicLibrary();
                }
            );
        }

        if (
            search &&
            search.dataset.paReady !== "1"
        ) {
            search.dataset.paReady = "1";

            search.addEventListener(
                "input",
                () => {
                    renderTrackList(
                        search.value
                    );
                }
            );
        }

        if (
            form &&
            form.dataset.paReady !== "1"
        ) {
            form.dataset.paReady = "1";

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    const value =
                        input?.value
                            .trim();

                    if (!value) {
                        return;
                    }

                    let saved = [];

                    try {
                        saved =
                            JSON.parse(
                                localStorage.getItem(
                                    STORAGE.suggestions
                                ) || "[]"
                            );
                    } catch (_) {
                        saved = [];
                    }

                    saved.push({
                        title: value,
                        createdAt:
                            new Date()
                                .toISOString()
                    });

                    localStorage.setItem(
                        STORAGE.suggestions,
                        JSON.stringify(
                            saved.slice(-30)
                        )
                    );

                    if (input) {
                        input.value = "";
                    }

                    if (note) {
                        note.textContent =
                            "Sugestão registrada. Obrigado!";
                    }

                    setTimeout(() => {
                        if (note) {
                            note.textContent = "";
                        }
                    }, 3000);
                }
            );
        }

        renderTrackList();
    }

    /* ==================================================
       SALVAR ESTADO
    ================================================== */

    function persistState() {
        const audio =
            getAudio();

        if (!audio) {
            return;
        }

        localStorage.setItem(
            STORAGE.track,
            String(playerState.index)
        );

        localStorage.setItem(
            STORAGE.time,
            String(
                Number.isFinite(audio.currentTime)
                    ? audio.currentTime
                    : 0
            )
        );

        localStorage.setItem(
            STORAGE.playing,
            String(!audio.paused)
        );
    }

    /* ==================================================
       BOTÃO PLAY / PAUSE
    ================================================== */

    function setButtonState(isPlaying) {
        const play =
            getPlay();

        if (!play) {
            return;
        }

        play.textContent =
            isPlaying ? "Ⅱ" : "▶";

        play.setAttribute(
            "aria-label",
            isPlaying
                ? "Pausar música"
                : "Reproduzir música"
        );
    }

    /* ==================================================
       CARREGAR MÚSICA
    ================================================== */

    function loadTrack(
        index,
        autoplay = false,
        fromUser = false
    ) {
        const audio =
            getAudio();

        const title =
            getTitle();

        const status =
            getStatus();

        if (!audio) {
            return;
        }

        playerState.index =
            (
                index + PLAYLIST.length
            ) % PLAYLIST.length;

        const track =
            PLAYLIST[playerState.index];

        /*
         * URL RELATIVA AO SITE.
         *
         * Isso trata corretamente:
         * espaços
         * acentos
         * parênteses
         * caracteres especiais
         */

        const url =
            new URL(
                track[1],
                document.baseURI
            ).href;

        if (title) {
            title.textContent =
                track[0];
        }

        /*
         * Não recria o Audio.
         * Isso ajuda a manter o player
         * durante a navegação interna.
         */

        audio.src = url;

        audio.load();

        const savedTrack =
            Number.parseInt(
                localStorage.getItem(
                    STORAGE.track
                ) || "0",
                10
            );

        const savedTime =
            Number.parseFloat(
                localStorage.getItem(
                    STORAGE.time
                ) || "0"
            );

        if (
            !fromUser &&
            playerState.index === savedTrack &&
            Number.isFinite(savedTime) &&
            savedTime > 0
        ) {
            const restorePosition =
                () => {

                    try {

                        if (
                            Number.isFinite(
                                audio.duration
                            ) &&
                            audio.duration > 0
                        ) {
                            audio.currentTime =
                                Math.min(
                                    savedTime,
                                    Math.max(
                                        0,
                                        audio.duration - 0.25
                                    )
                                );
                        }

                    } catch (_) {}
                };

            if (
                audio.readyState >= 1
            ) {
                restorePosition();
            } else {
                audio.addEventListener(
                    "loadedmetadata",
                    restorePosition,
                    {
                        once: true
                    }
                );
            }
        }

        if (status) {
            status.textContent =
                autoplay
                    ? "Reproduzindo"
                    : "Toque para começar";
        }

        setButtonState(false);

        localStorage.setItem(
            STORAGE.track,
            String(playerState.index)
        );

        if (fromUser) {
            localStorage.setItem(
                STORAGE.time,
                "0"
            );
        }

        renderTrackList(
            document.getElementById(
                "musicSearch"
            )?.value || ""
        );

        if (autoplay) {
            playMusic();
        }
    }

    /* ==================================================
       VISUALIZADOR
    ================================================== */

    function setupVisualizer() {
        if (visualizerReady) {
            return true;
        }

        const audio =
            getAudio();

        if (!audio) {
            return false;
        }

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {
            return false;
        }

        try {

            audioContext =
                new AudioContextClass();

            analyser =
                audioContext.createAnalyser();

            analyser.fftSize = 128;

            analyser.smoothingTimeConstant =
                0.78;

            audioSource =
                audioContext.createMediaElementSource(
                    audio
                );

            audioSource.connect(
                analyser
            );

            analyser.connect(
                audioContext.destination
            );

            frequencyData =
                new Uint8Array(
                    analyser.frequencyBinCount
                );

            visualizerReady = true;

            return true;

        } catch (error) {

            console.warn(
                "Visualizador de áudio indisponível:",
                error
            );

            return false;
        }
    }

    function stopVisualizer() {
        if (animationFrame) {
            cancelAnimationFrame(
                animationFrame
            );
        }

        animationFrame = 0;

        const bars =
            getBars();

        bars.forEach(bar => {

            bar.style.height =
                "10px";

            bar.style.opacity =
                "0.32";
        });

        const phone =
            getPhone();

        if (phone) {

            phone.style.setProperty(
                "--beat-scale",
                "1"
            );

            phone.style.setProperty(
                "--beat-glow",
                "14px"
            );

            phone.style.setProperty(
                "--beat-energy",
                "0"
            );
        }
    }

    function startVisualizer() {

        if (!setupVisualizer()) {
            return;
        }

        if (
            audioContext &&
            audioContext.state === "suspended"
        ) {
            audioContext
                .resume()
                .catch(() => {});
        }

        if (animationFrame) {
            cancelAnimationFrame(
                animationFrame
            );
        }

        const draw = () => {

            const audio =
                getAudio();

            if (
                !audio ||
                !analyser ||
                !frequencyData ||
                audio.paused
            ) {
                animationFrame = 0;
                return;
            }

            analyser.getByteFrequencyData(
                frequencyData
            );

            const bars =
                getBars();

            bars.forEach(
                (bar, index) => {

                    const position =
                        bars.length > 1
                            ? index /
                              (
                                  bars.length - 1
                              )
                            : 0;

                    const dataIndex =
                        Math.min(
                            frequencyData.length - 1,
                            Math.floor(
                                position * 34
                            )
                        );

                    const value =
                        (
                            frequencyData[
                                dataIndex
                            ] || 0
                        ) / 255;

                    const height =
                        9 + value * 34;

                    bar.style.height =
                        `${height}px`;

                    bar.style.opacity =
                        String(
                            0.28 +
                            value * 0.72
                        );
                }
            );

            /*
             * Graves.
             */

            let bass = 0;

            const bassCount =
                Math.min(
                    7,
                    frequencyData.length
                );

            for (
                let i = 0;
                i < bassCount;
                i++
            ) {
                bass +=
                    frequencyData[i] || 0;
            }

            if (bassCount > 0) {
                bass =
                    bass /
                    (
                        bassCount * 255
                    );
            }

            const phone =
                getPhone();

            if (phone) {

                /*
                 * Pulsação pequena.
                 */

                phone.style.setProperty(
                    "--beat-scale",
                    String(
                        1 +
                        bass * 0.009
                    )
                );

                /*
                 * Brilho.
                 */

                phone.style.setProperty(
                    "--beat-glow",
                    `${14 + bass * 30}px`
                );

                phone.style.setProperty(
                    "--beat-energy",
                    bass.toFixed(3)
                );
            }

            animationFrame =
                requestAnimationFrame(
                    draw
                );
        };

        draw();
    }

    /* ==================================================
       REPRODUZIR
    ================================================== */

    async function playMusic() {

        const audio =
            getAudio();

        const status =
            getStatus();

        if (!audio) {
            return false;
        }

        try {

            setupVisualizer();

            if (
                audioContext &&
                audioContext.state === "suspended"
            ) {
                await audioContext.resume();
            }

            await audio.play();

            playerState.userStarted =
                true;

            playerState.shouldPlay =
                true;

            localStorage.setItem(
                STORAGE.playing,
                "true"
            );

            startVisualizer();

            return true;

        } catch (error) {

            /*
             * Autoplay bloqueado.
             */

            playerState.shouldPlay =
                false;

            localStorage.setItem(
                STORAGE.playing,
                "false"
            );

            if (status) {
                status.textContent =
                    "Toque para iniciar";
            }

            return false;
        }
    }

    /* ==================================================
       PAUSAR
    ================================================== */

    function pauseMusic() {

        const audio =
            getAudio();

        if (!audio) {
            return;
        }

        audio.pause();

        playerState.shouldPlay =
            false;

        localStorage.setItem(
            STORAGE.playing,
            "false"
        );

        persistState();
    }

    /* ==================================================
       EVENTOS DO ÁUDIO
    ================================================== */

    function initAudioEvents() {

        const audio =
            getAudio();

        const play =
            getPlay();

        const next =
            document.getElementById(
                "musicNext"
            );

        if (
            !audio ||
            !play ||
            !next ||
            playerEventsReady
        ) {
            return;
        }

        playerEventsReady = true;

        /* PLAY / PAUSE */

        play.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                if (audio.paused) {
                    await playMusic();
                } else {
                    pauseMusic();
                }
            }
        );

        /* PRÓXIMA */

        next.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                loadTrack(
                    playerState.index + 1,
                    true,
                    true
                );
            }
        );

        /* COMEÇOU */

        audio.addEventListener(
            "play",
            () => {

                setButtonState(true);

                const status =
                    getStatus();

                if (status) {
                    status.textContent =
                        "Reproduzindo";
                }

                localStorage.setItem(
                    STORAGE.playing,
                    "true"
                );

                startVisualizer();
            }
        );

        /* PAUSOU */

        audio.addEventListener(
            "pause",
            () => {

                setButtonState(false);

                const status =
                    getStatus();

                if (status) {
                    status.textContent =
                        "Pausada";
                }

                stopVisualizer();

                persistState();
            }
        );

        /* SALVAR POSIÇÃO */

        audio.addEventListener(
            "timeupdate",
            () => {

                /*
                 * Salva a cada poucos segundos.
                 */

                if (
                    Math.floor(
                        audio.currentTime
                    ) % 3 === 0
                ) {
                    persistState();
                }
            }
        );

        /* FINAL DA MÚSICA */

        audio.addEventListener(
            "ended",
            () => {

                /*
                 * Vai para a próxima.
                 * No final da playlist,
                 * volta para Meaningful Love.
                 */

                loadTrack(
                    playerState.index + 1,
                    true,
                    true
                );
            }
        );

        /* ERRO */

        audio.addEventListener(
            "error",
            () => {

                const status =
                    getStatus();

                if (status) {
                    status.textContent =
                        "Arquivo não encontrado";
                }

                console.error(
                    "Falha ao carregar música:",
                    PLAYLIST[
                        playerState.index
                    ][1]
                );
            }
        );

        /* SAÍDA DA PÁGINA */

        window.addEventListener(
            "pagehide",
            persistState
        );

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "hidden"
                ) {
                    persistState();
                }
            }
        );
    }

    /* ==================================================
       PRIMEIRA INTERAÇÃO
       LIBERA O ÁUDIO NO CELULAR
    ================================================== */

    function initAutoplayUnlock() {

        if (
            document.documentElement.dataset
                .paAudioUnlock === "1"
        ) {
            return;
        }

        document.documentElement.dataset
            .paAudioUnlock = "1";

        let handled = false;

        const unlock = () => {

            if (handled) {
                return;
            }

            handled = true;

            const audio =
                getAudio();

            if (!audio) {
                return;
            }

            if (audio.paused) {
                playMusic();
            }

            document.removeEventListener(
                "pointerdown",
                unlock
            );

            document.removeEventListener(
                "touchstart",
                unlock
            );

            document.removeEventListener(
                "keydown",
                unlock
            );
        };

        document.addEventListener(
            "pointerdown",
            unlock,
            {
                passive: true
            }
        );

        document.addEventListener(
            "touchstart",
            unlock,
            {
                passive: true
            }
        );

        document.addEventListener(
            "keydown",
            unlock
        );
    }

    /* ==================================================
       INICIALIZAR PLAYER
    ================================================== */

    function initMusicPlayer() {

        ensurePlayer();

        initMusicLibrary();

        initAudioEvents();

        initAutoplayUnlock();

        const audio =
            getAudio();

        if (!audio) {
            return;
        }

        const desired =
            new URL(
                PLAYLIST[
                    playerState.index
                ][1],
                document.baseURI
            ).href;

        /*
         * Verifica se já é a mesma música.
         * Isso evita reiniciar o áudio
         * durante a navegação interna.
         */

        let currentSrc = "";

        try {
            currentSrc =
                audio.currentSrc ||
                audio.src ||
                "";
        } catch (_) {}

        if (
            !currentSrc ||
            decodeURI(currentSrc) !==
            decodeURI(desired)
        ) {
            loadTrack(
                playerState.index,
                false,
                false
            );
        }

        /*
         * Tenta continuar tocando.
         *
         * Se o navegador bloquear,
         * a primeira interação libera.
         */

        if (
            playerState.shouldPlay &&
            !playerState.userStarted &&
            audio.paused
        ) {

            audio
                .play()
                .then(() => {

                    playerState.userStarted =
                        true;

                    startVisualizer();
                })
                .catch(() => {
                    /*
                     * O listener de primeira
                     * interação cuidará disso.
                     */
                });
        }
    }

    /* ==================================================
       INTERAÇÃO COM CELULAR
    ================================================== */

    function initPhoneInteraction() {

        const phoneScene =
            document.getElementById(
                "phoneScene"
            );

        if (
            !phoneScene ||
            phoneScene.dataset.paReady === "1"
        ) {
            return;
        }

        phoneScene.dataset.paReady = "1";

        const phone =
            phoneScene.querySelector(
                ".phone"
            );

        if (!phone) {
            return;
        }

        const touchPhone = () => {

            phone.classList.remove(
                "touched"
            );

            void phone.offsetWidth;

            phone.classList.add(
                "touched"
            );

            setTimeout(() => {
                phone.classList.remove(
                    "touched"
                );
            }, 550);
        };

        phoneScene.addEventListener(
            "click",
            touchPhone
        );

        phoneScene.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    touchPhone();
                }
            }
        );
    }

    /* ==================================================
       NAVEGAÇÃO INTERNA
       MANTÉM O PLAYER TOCANDO
    ================================================== */

    function isInternalLink(link) {

        if (!link) {
            return false;
        }

        if (!link.href) {
            return false;
        }

        if (
            link.target === "_blank" ||
            link.hasAttribute("download")
        ) {
            return false;
        }

        try {

            const url =
                new URL(
                    link.href,
                    document.baseURI
                );

            return (
                url.origin ===
                window.location.origin
            );

        } catch (_) {

            return false;
        }
    }

    function getPageName(url) {

        try {

            const path =
                new URL(
                    url,
                    document.baseURI
                ).pathname;

            const parts =
                path.split("/");

            return (
                parts[parts.length - 1] ||
                "index.html"
            );

        } catch (_) {

            return "index.html";
        }
    }

    function isSitePage(url) {

        const page =
            getPageName(url)
                .toLowerCase();

        return [
            "",
            "index.html",
            "servicos.html",
            "editores.html"
        ].includes(page);
    }

    /* ==================================================
       NAVEGAR SEM RECARREGAR
    ================================================== */

    async function softNavigate(
        url,
        replace = false
    ) {

        if (navigationBusy) {
            return;
        }

        navigationBusy = true;

        try {

            const target =
                new URL(
                    url,
                    document.baseURI
                );

            const response =
                await fetch(
                    target.href,
                    {
                        credentials:
                            "same-origin"
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const html =
                await response.text();

            const parser =
                new DOMParser();

            const newDocument =
                parser.parseFromString(
                    html,
                    "text/html"
                );

            const newMain =
                newDocument.querySelector(
                    "main"
                );

            const currentMain =
                document.querySelector(
                    "main"
                );

            if (
                !newMain ||
                !currentMain
            ) {
                throw new Error(
                    "Elemento main não encontrado"
                );
            }

            /*
             * Preserva o player porque ele
             * está fora do main.
             */

            currentMain.replaceWith(
                newMain
            );

            document.title =
                newDocument.title ||
                document.title;

            if (replace) {

                history.replaceState(
                    {
                        paleAscendancy: true
                    },
                    "",
                    target.href
                );

            } else {

                history.pushState(
                    {
                        paleAscendancy: true
                    },
                    "",
                    target.href
                );
            }

            /*
             * Reinicializa somente os elementos
             * que foram trocados dentro do main.
             */

            initGeneralFeatures();

            initPhoneInteraction();

            /*
             * NÃO recria o player.
             * O mesmo áudio continua existindo.
             */

            initMusicLibrary();

            renderTrackList();

            /*
             * Fecha menu mobile.
             */

            const menuButton =
                document.getElementById(
                    "menuButton"
                );

            const mobileMenu =
                document.getElementById(
                    "mobileMenu"
                );

            if (menuButton) {
                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

            if (mobileMenu) {
                mobileMenu.classList.remove(
                    "active"
                );

                mobileMenu.classList.remove(
                    "is-open"
                );
            }

            /*
             * Scroll para o topo.
             */

            if (!target.hash) {

                window.scrollTo(
                    0,
                    0
                );

            } else {

                requestAnimationFrame(
                    () => {

                        const element =
                            document.querySelector(
                                target.hash
                            );

                        if (element) {
                            element.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "start"
                            });
                        }
                    }
                );
            }

        } catch (error) {

            console.warn(
                "Navegação interna indisponível. Usando navegação normal.",
                error
            );

            window.location.href =
                url;

        } finally {

            navigationBusy =
                false;
        }
    }

    /* ==================================================
       INTERCEPTAR LINKS
    ================================================== */

    function initSoftNavigation() {

        if (
            document.documentElement.dataset
                .paNavigation === "1"
        ) {
            return;
        }

        document.documentElement.dataset
            .paNavigation = "1";

        document.addEventListener(
            "click",
            event => {

                const link =
                    event.target.closest(
                        "a"
                    );

                if (
                    !isInternalLink(link)
                ) {
                    return;
                }

                const url =
                    new URL(
                        link.href,
                        document.baseURI
                    );

                if (
                    !isSitePage(url)
                ) {
                    return;
                }

                /*
                 * Links com download não entram.
                 */

                if (
                    link.hasAttribute(
                        "download"
                    )
                ) {
                    return;
                }

                /*
                 * Links externos não entram.
                 */

                if (
                    url.origin !==
                    window.location.origin
                ) {
                    return;
                }

                /*
                 * Âncora da mesma página.
                 */

                const currentUrl =
                    new URL(
                        window.location.href
                    );

                const samePage =
                    getPageName(
                        currentUrl.href
                    ).toLowerCase() ===
                    getPageName(
                        url.href
                    ).toLowerCase();

                if (
                    samePage &&
                    url.hash
                ) {

                    event.preventDefault();

                    history.pushState(
                        {},
                        "",
                        url.href
                    );

                    const element =
                        document.querySelector(
                            url.hash
                        );

                    if (element) {

                        element.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "start"
                        });
                    }

                    return;
                }

                /*
                 * Home:
                 * reinicia a Meaningful Love.
                 */

                const targetPage =
                    getPageName(
                        url.href
                    ).toLowerCase();

                const isHome =
                    targetPage ===
                        "index.html" ||
                    targetPage === "";

                const linkText =
                    (
                        link.textContent ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                const isHomeLink =
                    linkText === "home" ||
                    isHome;

                if (isHomeLink) {

                    const audio =
                        getAudio();

                    if (audio) {

                        playerState.index =
                            0;

                        localStorage.setItem(
                            STORAGE.track,
                            "0"
                        );

                        localStorage.setItem(
                            STORAGE.time,
                            "0"
                        );

                        localStorage.setItem(
                            STORAGE.playing,
                            "true"
                        );

                        audio.pause();

                        loadTrack(
                            0,
                            true,
                            true
                        );
                    }
                }

                /*
                 * Intercepta a navegação.
                 * O áudio continua.
                 */

                event.preventDefault();

                softNavigate(
                    url.href
                );
            }
        );

        /*
         * Botões voltar / avançar
         * do navegador.
         */

        window.addEventListener(
            "popstate",
            () => {

                softNavigate(
                    window.location.href,
                    true
                );
            }
        );
    }

    /* ==================================================
       INICIALIZAÇÃO
    ================================================== */

    function boot() {

        initGeneralFeatures();

        initSoftNavigation();

        initMusicPlayer();

        initPhoneInteraction();
    }

    if (
        document.readyState ===
        "loading"
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
