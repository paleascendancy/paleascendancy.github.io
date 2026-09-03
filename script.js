/* ==================================================
   PALE ASCENDANCY
   SISTEMA PRINCIPAL + PLAYER DE MÚSICA
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==================================================
       MENU MOBILE
    ================================================== */

    const menuButton = document.getElementById("menuButton");
    const mobileMenu = document.getElementById("mobileMenu");

    if (menuButton && mobileMenu) {

        menuButton.addEventListener("click", () => {

            const isOpen =
                menuButton.getAttribute("aria-expanded") === "true";

            menuButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            mobileMenu.classList.toggle("active");

        });

        const mobileLinks =
            mobileMenu.querySelectorAll("a");

        mobileLinks.forEach(link => {

            link.addEventListener("click", () => {

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

                mobileMenu.classList.remove("active");

            });

        });

    }


    /* ==================================================
       FILTRO E BUSCA DE EDITORES
    ================================================== */

    const searchInput =
        document.getElementById("searchInput");

    const editorsGrid =
        document.getElementById("editorsGrid");

    const filterButtons =
        document.querySelectorAll(".filter-button");

    const noResults =
        document.getElementById("noResults");


    if (
        searchInput &&
        editorsGrid &&
        filterButtons.length > 0
    ) {

        const editorCards =
            editorsGrid.querySelectorAll(".editor-profile");

        let currentFilter = "todos";


        function filterEditors() {

            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();

            let visibleEditors = 0;


            editorCards.forEach(card => {

                const category =
                    card.dataset.category || "";

                const searchData =
                    card.dataset.search || "";

                const name =
                    card.querySelector("h2")?.textContent
                        .toLowerCase() || "";


                const matchesSearch =
                    search === "" ||
                    searchData.toLowerCase().includes(search) ||
                    name.includes(search);


                const matchesFilter =
                    currentFilter === "todos" ||
                    category === currentFilter ||
                    category === "todos";


                if (
                    matchesSearch &&
                    matchesFilter
                ) {

                    card.style.display = "";
                    visibleEditors++;

                } else {

                    card.style.display = "none";

                }

            });


            if (noResults) {

                noResults.classList.toggle(
                    "visible",
                    visibleEditors === 0
                );

            }

        }


        searchInput.addEventListener(
            "input",
            filterEditors
        );


        filterButtons.forEach(button => {

            button.addEventListener("click", () => {

                filterButtons.forEach(btn => {
                    btn.classList.remove("active");
                });

                button.classList.add("active");

                currentFilter =
                    button.dataset.filter || "todos";

                filterEditors();

            });

        });

    }


    /* ==================================================
       FORMULÁRIO DE CONTATO
    ================================================== */

    const contactForm =
        document.getElementById("contactForm");

    const formNote =
        document.getElementById("formNote");


    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            () => {

                if (formNote) {
                    formNote.hidden = false;
                }

            }
        );

    }


    /* ==================================================
       LINKS EXTERNOS
    ================================================== */

    const externalLinks =
        document.querySelectorAll(
            'a[target="_blank"]'
        );


    externalLinks.forEach(link => {

        link.addEventListener("click", () => {

            link.setAttribute(
                "rel",
                "noopener noreferrer"
            );

        });

    });


    /* ==================================================
       SISTEMA BASE DE PERFIL
    ================================================== */

    window.PaleAscendancy = {

        version: "1.0.0",

        platform: "Pale Ascendancy",

        user: null,

        isLoggedIn() {
            return this.user !== null;
        },

        logout() {

            this.user = null;

            console.log(
                "Usuário desconectado."
            );

        }

    };


    /* ==================================================
       PLAYER DE MÚSICA
    ================================================== */

    const music =
        document.getElementById("musicAudio") ||
        document.getElementById("backgroundMusic");

    const musicButton =
        document.getElementById("musicPlay") ||
        document.getElementById("musicButton");

    const nextButton =
        document.getElementById("musicNext") ||
        document.getElementById("nextMusic");

    const musicTitle =
        document.getElementById("musicTitle");

    const musicPlayer =
        document.getElementById("musicPlayer");


    /*
       Se a página não tiver player,
       não interfere no restante do site.
    */

    if (!music) {
        console.log("Player de música não encontrado.");
    } else {

        /* ==================================================
           PLAYLIST
        ================================================== */

        const playlist = [

            {
                name: "Meaningful Love",
                file: "assets/music/meaningful love (slowed instrumental)(MP3_160K).mp3"
            },

            {
                name: "Joakim Karud — Canals",
                file: "assets/music/Joakim Karud - Canals(MP3_160K).mp3"
            },

            {
                name: "LAKEY INSPIRED — Better Days",
                file: "assets/music/LAKEY INSPIRED - Better Days (MP3_160K).mp3"
            },

            {
                name: "LAKEY INSPIRED — Chill Day",
                file: "assets/music/LAKEY INSPIRED - Chill Day (MP3_160K).mp3"
            },

            {
                name: "New Jeans Jersey Remix — Slowed",
                file: "assets/music/New Jeans Jersey Remix SLOWED - (Jiandro x Dxrkaii)(MP3_160K).mp3"
            },

            {
                name: "Nuts — Instrumental Slowed",
                file: "assets/music/Instrumental de Nuts (Versão Lenta) (MP3_160K).mp3"
            },

            {
                name: "The Neighbourhood — Sweater Weather",
                file: "assets/music/The Neighbourhood - Sweater Weather (Instrumental Oficial) (MP3_160K).mp3"
            },

            {
                name: "Childish Gambino — Instrumental",
                file: "assets/music/les gambino infantil instrumental _foryoupage _song _fyp _slowandreverb _instrumental _Mreso(MP3).mp3"
            },

            {
                name: "Lil Peep — Star Shopping",
                file: "assets/music/Lil Peep - Star Shopping (Áudio Oficial)(MP3_160K).mp3"
            },

            {
                name: "Malcolm Todd — Earrings",
                file: "assets/music/Malcolm Todd - Earrings (Visualizador Oficial)(MP3_160K).mp3"
            },

            {
                name: "Cafuné — Tek It",
                file: "assets/music/Cafuné - Tek it (Tai2Talented☆ Hoodtrap Remix)(MP3_160K).mp3"
            }

        ];


        /* ==================================================
           ESTADO
        ================================================== */

        const STORAGE_KEY =
            "pale_ascendancy_music_state";


        let currentTrack = 0;

        let isPlaying = false;

        let userInteracted = false;


        /* ==================================================
           UTILIDADES
        ================================================== */

        function getTrackURL(file) {

            return new URL(
                file,
                document.baseURI
            ).href;

        }


        function getSavedState() {

            try {

                const saved =
                    localStorage.getItem(STORAGE_KEY);

                if (!saved) return null;

                return JSON.parse(saved);

            } catch (error) {

                return null;

            }

        }


        function saveState() {

            try {

                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({

                        track: currentTrack,

                        time: Number(
                            music.currentTime || 0
                        ),

                        playing: isPlaying

                    })
                );

            } catch (error) {

                console.warn(
                    "Não foi possível salvar o estado da música."
                );

            }

        }


        /* ==================================================
           ATUALIZAR INTERFACE
        ================================================== */

        function updateMusicUI() {

            if (musicButton) {

                musicButton.textContent =
                    isPlaying ? "❚❚" : "▶";

                musicButton.setAttribute(
                    "aria-label",
                    isPlaying
                        ? "Pausar música"
                        : "Reproduzir música"
                );

            }


            if (musicTitle) {

                musicTitle.textContent =
                    playlist[currentTrack].name;

            }


            if (musicPlayer) {

                musicPlayer.classList.toggle(
                    "is-playing",
                    isPlaying
                );

            }


            document.body.classList.toggle(
                "music-active",
                isPlaying
            );

        }


        /* ==================================================
           CARREGAR MÚSICA
        ================================================== */

        function loadTrack(
            index,
            autoplay = false,
            startTime = 0
        ) {

            currentTrack =
                (index + playlist.length) %
                playlist.length;


            const track =
                playlist[currentTrack];


            music.src =
                getTrackURL(track.file);


            music.load();


            if (musicTitle) {

                musicTitle.textContent =
                    track.name;

            }


            music.addEventListener(
                "loadedmetadata",
                function restorePosition() {

                    music.removeEventListener(
                        "loadedmetadata",
                        restorePosition
                    );


                    if (
                        startTime > 0 &&
                        Number.isFinite(startTime)
                    ) {

                        try {

                            music.currentTime =
                                Math.min(
                                    startTime,
                                    Math.max(
                                        0,
                                        music.duration - 0.5
                                    )
                                );

                        } catch (error) {}

                    }


                    if (autoplay) {
                        startMusic();
                    }

                }
            );

        }


        /* ==================================================
           INICIAR MÚSICA
        ================================================== */

        async function startMusic() {

            try {

                userInteracted = true;


                if (!music.src) {

                    loadTrack(
                        currentTrack,
                        false
                    );

                }


                await music.play();


                isPlaying = true;


                updateMusicUI();

                saveState();


                setupAudioVisualizer();


                if (
                    audioContext &&
                    audioContext.state === "suspended"
                ) {

                    await audioContext.resume();

                }

            } catch (error) {

                isPlaying = false;

                updateMusicUI();

                console.log(
                    "Autoplay bloqueado pelo navegador. "
                    + "A música começará após uma interação."
                );

            }

        }


        /* ==================================================
           PAUSAR
        ================================================== */

        function pauseMusic() {

            music.pause();

            isPlaying = false;

            updateMusicUI();

            saveState();

        }


        /* ==================================================
           BOTÃO PLAY / PAUSE
        ================================================== */

        if (musicButton) {

            musicButton.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();


                    if (music.paused) {

                        await startMusic();

                    } else {

                        pauseMusic();

                    }

                }
            );

        }


        /* ==================================================
           PRÓXIMA MÚSICA
        ================================================== */

        if (nextButton) {

            nextButton.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();


                    loadTrack(
                        currentTrack + 1,
                        true,
                        0
                    );

                }
            );

        }


        /* ==================================================
           MÚSICA TERMINOU
        ================================================== */

        music.addEventListener(
            "ended",
            () => {

                currentTrack =
                    (currentTrack + 1) %
                    playlist.length;


                loadTrack(
                    currentTrack,
                    true,
                    0
                );

            }
        );


        /* ==================================================
           ERRO DE ÁUDIO
        ================================================== */

        music.addEventListener(
            "error",
            () => {

                isPlaying = false;

                updateMusicUI();

                console.error(
                    "Erro ao carregar:",
                    playlist[currentTrack].file
                );

            }
        );


        /* ==================================================
           SALVAR POSIÇÃO PERIODICAMENTE
        ================================================== */

        let lastSave = 0;


        music.addEventListener(
            "timeupdate",
            () => {

                const now =
                    Date.now();


                if (now - lastSave > 1000) {

                    lastSave = now;

                    saveState();

                }

            }
        );


        /* ==================================================
           QUANDO SAI DA PÁGINA
        ================================================== */

        window.addEventListener(
            "beforeunload",
            () => {

                saveState();

            }
        );


        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    saveState();

                }

            }
        );


        /* ==================================================
           RESTAURAR MÚSICA
        ================================================== */

        function restoreMusic() {

            const saved =
                getSavedState();


            if (saved) {

                const savedTrack =
                    Number.isInteger(saved.track)
                        ? saved.track
                        : 0;


                const savedTime =
                    Number.isFinite(saved.time)
                        ? saved.time
                        : 0;


                currentTrack =
                    (
                        savedTrack +
                        playlist.length
                    ) %
                    playlist.length;


                loadTrack(
                    currentTrack,
                    false,
                    savedTime
                );


                /*
                   Tentamos continuar automaticamente
                   se a música estava tocando antes.
                */

                if (saved.playing) {

                    const continuePlayback =
                        () => {

                            startMusic();

                            document.removeEventListener(
                                "pointerdown",
                                continuePlayback
                            );

                            document.removeEventListener(
                                "keydown",
                                continuePlayback
                            );

                        };


                    document.addEventListener(
                        "pointerdown",
                        continuePlayback,
                        { once: true }
                    );


                    document.addEventListener(
                        "keydown",
                        continuePlayback,
                        { once: true }
                    );


                    /*
                       Alguns navegadores permitem
                       continuar sem interação.
                    */

                    music.addEventListener(
                        "loadedmetadata",
                        () => {

                            music.play()
                                .then(() => {

                                    isPlaying = true;

                                    updateMusicUI();

                                })
                                .catch(() => {});

                        },
                        { once: true }
                    );

                }

            } else {

                /*
                   Primeiro acesso:
                   Meaningful Love começa primeiro.
                */

                loadTrack(
                    0,
                    false,
                    0
                );

            }

        }


        /* ==================================================
           PRIMEIRA INTERAÇÃO
        ================================================== */

        function firstInteraction(event) {

            if (
                event.target.closest &&
                event.target.closest(".music-player")
            ) {

                return;

            }


            if (!isPlaying) {

                startMusic();

            }


            document.removeEventListener(
                "pointerdown",
                firstInteraction
            );

            document.removeEventListener(
                "keydown",
                firstInteraction
            );

        }


        document.addEventListener(
            "pointerdown",
            firstInteraction
        );


        document.addEventListener(
            "keydown",
            firstInteraction
        );


        /* ==================================================
           VISUALIZADOR DE ÁUDIO
        ================================================== */

        let audioContext = null;

        let analyser = null;

        let sourceNode = null;

        let frequencyData = null;

        let audioReady = false;


        function setupAudioVisualizer() {

            if (audioReady) {

                return true;

            }


            try {

                audioContext =
                    new (
                        window.AudioContext ||
                        window.webkitAudioContext
                    )();


                analyser =
                    audioContext.createAnalyser();


                analyser.fftSize = 256;

                analyser.smoothingTimeConstant = 0.78;


                frequencyData =
                    new Uint8Array(
                        analyser.frequencyBinCount
                    );


                sourceNode =
                    audioContext.createMediaElementSource(
                        music
                    );


                sourceNode.connect(
                    analyser
                );


                analyser.connect(
                    audioContext.destination
                );


                audioReady = true;


                return true;

            } catch (error) {

                console.warn(
                    "Visualizador de áudio indisponível."
                );

                return false;

            }

        }


        /* ==================================================
           ANIMAÇÃO REATIVA À MÚSICA
        ================================================== */

        function animateMusic() {

            requestAnimationFrame(
                animateMusic
            );


            if (
                !analyser ||
                !frequencyData ||
                music.paused
            ) {

                return;

            }


            analyser.getByteFrequencyData(
                frequencyData
            );


            const length =
                frequencyData.length;


            let bass = 0;

            let mids = 0;

            let highs = 0;


            for (
                let i = 0;
                i < length;
                i++
            ) {

                const value =
                    frequencyData[i] / 255;


                if (i < length * 0.16) {

                    bass += value;

                } else if (
                    i < length * 0.55
                ) {

                    mids += value;

                } else {

                    highs += value;

                }

            }


            bass /=
                Math.max(
                    1,
                    length * 0.16
                );


            mids /=
                Math.max(
                    1,
                    length * 0.39
                );


            highs /=
                Math.max(
                    1,
                    length * 0.45
                );


            const energy =
                Math.min(
                    1,
                    bass * 0.58 +
                    mids * 0.27 +
                    highs * 0.15
                );


            const pulse =
                1 +
                energy * 0.10;


            document.documentElement.style.setProperty(
                "--music-energy",
                energy.toFixed(3)
            );


            document.documentElement.style.setProperty(
                "--music-glow",
                `${Math.round(
                    10 + energy * 30
                )}px`
            );


            document.documentElement.style.setProperty(
                "--music-pulse",
                pulse.toFixed(3)
            );


            if (musicPlayer) {

                musicPlayer.style.setProperty(
                    "--beat-scale",
                    pulse.toFixed(3)
                );

            }


            /*
               Barras do visualizador.
               Funciona caso existam no HTML.
            */

            const bars =
                document.querySelectorAll(
                    ".music-visualizer span, #beatBars span"
                );


            bars.forEach(
                (bar, index) => {

                    const position =
                        Math.min(
                            length - 1,
                            Math.floor(
                                (
                                    index + 1
                                ) *
                                length /
                                Math.max(
                                    1,
                                    bars.length
                                )
                            )
                        );


                    const value =
                        frequencyData[position] /
                        255;


                    const scale =
                        Math.max(
                            0.35,
                            0.45 +
                            value * 1.9 +
                            energy * 0.35
                        );


                    bar.style.transform =
                        `scaleY(${scale.toFixed(2)})`;

                }
            );


            /*
               Efeito geral no player.
            */

            if (musicPlayer) {

                musicPlayer.style.setProperty(
                    "--audio-energy",
                    energy.toFixed(3)
                );

            }

        }


        animateMusic();


        /* ==================================================
           EVENTOS DE PLAY / PAUSE
        ================================================== */

        music.addEventListener(
            "play",
            async () => {

                isPlaying = true;

                updateMusicUI();

                setupAudioVisualizer();


                if (
                    audioContext &&
                    audioContext.state === "suspended"
                ) {

                    try {

                        await audioContext.resume();

                    } catch (error) {}

                }

            }
        );


        music.addEventListener(
            "pause",
            () => {

                isPlaying = false;

                updateMusicUI();

                saveState();

            }
        );


        /* ==================================================
           RESTAURAR AO ABRIR A PÁGINA
        ================================================== */

        restoreMusic();


        /* ==================================================
           TENTATIVA DE AUTOPLAY
        ================================================== */

        window.addEventListener(
            "load",
            () => {

                setTimeout(
                    () => {

                        if (
                            !music.src
                        ) {

                            loadTrack(
                                0,
                                false
                            );

                        }


                        if (
                            !userInteracted &&
                            music.paused
                        ) {

                            music.play()
                                .then(() => {

                                    isPlaying = true;

                                    updateMusicUI();

                                })
                                .catch(() => {

                                    /*
                                       Normal em celulares:
                                       o navegador pode bloquear
                                       autoplay com som.
                                    */

                                });

                        }

                    },
                    250
                );

            }
        );


        /* ==================================================
           API DO PLAYER
        ================================================== */

        window.PaleAscendancyMusic = {

            playlist,

            getCurrentTrack() {

                return playlist[
                    currentTrack
                ];

            },

            play() {

                return startMusic();

            },

            pause() {

                pauseMusic();

            },

            next() {

                loadTrack(
                    currentTrack + 1,
                    true,
                    0
                );

            },

            select(index) {

                if (
                    index < 0 ||
                    index >= playlist.length
                ) {

                    return;

                }


                loadTrack(
                    index,
                    true,
                    0
                );

            }

        };


        console.log(
            "Player de música carregado."
        );

    }


    /* ==================================================
       FINAL
    ================================================== */

    console.log(
        "Pale Ascendancy carregada."
    );

});
