/* ==================================================
   PALE ASCENDANCY
   SISTEMA PRINCIPAL
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==================================================
       MENU MOBILE
    ================================================== */

    const menuButton = document.getElementById("menuButton");
    const mobileMenu = document.getElementById("mobileMenu");

    if (menuButton && mobileMenu) {

        const toggleMenu = () => {
            const isOpen =
                menuButton.getAttribute("aria-expanded") === "true";

            menuButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            mobileMenu.classList.toggle("active", !isOpen);
            mobileMenu.classList.toggle("is-open", !isOpen);
        };

        menuButton.addEventListener("click", toggleMenu);

        const mobileLinks = mobileMenu.querySelectorAll("a");

        mobileLinks.forEach(link => {
            link.addEventListener("click", () => {
                menuButton.setAttribute("aria-expanded", "false");
                mobileMenu.classList.remove("active", "is-open");
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

    console.log(
        "Pale Ascendancy carregada."
    );
});


/* ==================================================
   PALE ASCENDANCY — PLAYER + VISUALIZADOR
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const audio =
        document.getElementById("musicAudio");

    const play =
        document.getElementById("musicPlay");

    const next =
        document.getElementById("musicNext");

    const title =
        document.getElementById("musicTitle");

    const bars =
        [...document.querySelectorAll("#beatBars i")];

    const phone =
        document.querySelector(".phone");

    /*
     * Se o player não existir nesta página,
     * não executa o restante do código.
     */
    if (!audio || !play || !next || !title) {
        return;
    }


    /* ==================================================
       PLAYLIST
    ================================================== */

    const playlist = [

        [
            "Meaningful Love",
            "assets/music/meaningful love (slowed instrumental)(MP3_160K).mp3"
        ],

        [
            "Cafuné — Tek It",
            "assets/music/Cafuné - Tek it (Tai2Talented☆ Hoodtrap Remix)(MP3_160K).mp3"
        ],

        [
            "Canals",
            "assets/music/Joakim Karud - Canais(MP3_160K).mp3"
        ],

        [
            "Better Days",
            "assets/music/LAKEY INSPIRED - Better Days (MP3_160K).mp3"
        ],

        [
            "Chill Day",
            "assets/music/LAKEY INSPIRED - Chill Day (MP3_160K).mp3"
        ],

        [
            "Star Shopping",
            "assets/music/Lil Peep - Star Shopping (Áudio Oficial)(MP3_160K).mp3"
        ],

        [
            "Earrings",
            "assets/music/Malcolm Todd - Earrings (Visualizador Oficial)(MP3_160K).mp3"
        ],

        [
            "New Jeans Jersey Remix",
            "assets/music/New Jeans Jersey Remix SLOWED - (Jiandro x Dxrkaii)(MP3_160K).mp3"
        ],

        [
            "Nuts — Instrumental",
            "assets/music/Instrumental de Nuts (Versão Lenta) (MP3_160K).mp3"
        ],

        [
            "Sweater Weather — Instrumental",
            "assets/music/The Neighbourhood - Sweater Weather (Instrumental Oficial) (MP3_160K).mp3"
        ],

        [
            "Les Gambino — Instrumental",
            "assets/music/les gambino infantil instrumental _foryoupage _song _fyp _slowandreverb _instrumental _Mreso(MP3).mp3"
        ]
    ];


    /* ==================================================
       ESTADO
    ================================================== */

    let currentTrack = 0;

    let audioContext = null;
    let analyser = null;
    let audioSource = null;
    let frequencyData = null;

    let animationFrame = 0;

    let visualizerReady = false;


    /* ==================================================
       CARREGAR MÚSICA
    ================================================== */

    function loadTrack(trackIndex) {

        currentTrack =
            (trackIndex + playlist.length) %
            playlist.length;

        const track =
            playlist[currentTrack];

        title.textContent =
            track[0];

        /*
         * URL relativa ao próprio site.
         *
         * new URL() garante tratamento correto
         * para espaços, acentos, parênteses
         * e caracteres especiais.
         */
        const trackURL =
            new URL(
                track[1],
                document.baseURI
            ).href;

        audio.src = trackURL;

        audio.load();
    }


    /* ==================================================
       VISUALIZADOR
    ================================================== */

    function stopVisualizer() {

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }

        bars.forEach(bar => {

            bar.style.height = "8px";
            bar.style.opacity = "0.35";
        });

        if (phone) {

            phone.style.setProperty(
                "--beat-scale",
                "1"
            );

            phone.style.setProperty(
                "--beat-glow",
                "10px"
            );
        }
    }


    function setupVisualizer() {

        if (visualizerReady) {
            return true;
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

            /*
             * FFT pequeno para manter o efeito
             * leve e discreto no celular.
             */
            analyser.fftSize = 64;

            audioSource =
                audioContext.createMediaElementSource(
                    audio
                );

            audioSource.connect(analyser);

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

            audioContext = null;
            analyser = null;
            audioSource = null;
            frequencyData = null;

            return false;
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
            audioContext.resume().catch(() => {});
        }

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        function draw() {

            if (
                !analyser ||
                !frequencyData ||
                audio.paused
            ) {
                return;
            }

            analyser.getByteFrequencyData(
                frequencyData
            );


            /* ------------------------------
               BARRAS
            ------------------------------ */

            bars.forEach((bar, i) => {

                const value =
                    (
                        frequencyData[
                            (i * 2) %
                            frequencyData.length
                        ] || 0
                    ) / 255;

                /*
                 * Movimento propositalmente pequeno.
                 */
                const height =
                    8 + value * 24;

                bar.style.height =
                    `${height}px`;

                bar.style.opacity =
                    `${0.28 + value * 0.55}`;
            });


            /* ------------------------------
               GRAVES / CELULAR
            ------------------------------ */

            const bass =
                (frequencyData[1] || 0) / 255;

            if (phone) {

                /*
                 * Pulsação extremamente sutil.
                 */
                phone.style.setProperty(
                    "--beat-scale",
                    String(
                        1 + bass * 0.006
                    )
                );

                phone.style.setProperty(
                    "--beat-glow",
                    `${10 + bass * 16}px`
                );
            }


            animationFrame =
                requestAnimationFrame(draw);
        }

        draw();
    }


    /* ==================================================
       REPRODUZIR
    ================================================== */

    async function playMusic() {

        try {

            setupVisualizer();

            if (
                audioContext &&
                audioContext.state === "suspended"
            ) {
                await audioContext.resume();
            }

            await audio.play();

        } catch (error) {

            /*
             * Navegador bloqueou autoplay.
             * A próxima interação do usuário
             * tentará novamente.
             */
            console.log(
                "Reprodução aguardando interação do usuário."
            );
        }
    }


    /* ==================================================
       PRIMEIRA INTERAÇÃO
    ================================================== */

    let firstInteractionHandled = false;

    function handleFirstInteraction() {

        if (firstInteractionHandled) {
            return;
        }

        firstInteractionHandled = true;

        playMusic();

        document.removeEventListener(
            "pointerdown",
            handleFirstInteraction
        );

        document.removeEventListener(
            "touchstart",
            handleFirstInteraction
        );

        document.removeEventListener(
            "keydown",
            handleFirstInteraction
        );
    }


    document.addEventListener(
        "pointerdown",
        handleFirstInteraction,
        {
            passive: true
        }
    );

    document.addEventListener(
        "touchstart",
        handleFirstInteraction,
        {
            passive: true
        }
    );

    document.addEventListener(
        "keydown",
        handleFirstInteraction
    );


    /* ==================================================
       PLAY / PAUSE
    ================================================== */

    play.addEventListener(
        "click",
        async () => {

            if (audio.paused) {

                await playMusic();

            } else {

                audio.pause();
            }
        }
    );


    /* ==================================================
       PRÓXIMA MÚSICA
    ================================================== */

    next.addEventListener(
        "click",
        async () => {

            loadTrack(
                currentTrack + 1
            );

            await playMusic();
        }
    );


    /* ==================================================
       EVENTOS DO ÁUDIO
    ================================================== */

    audio.addEventListener(
        "play",
        () => {

            play.textContent = "Ⅱ";

            play.setAttribute(
                "aria-label",
                "Pausar música"
            );

            startVisualizer();
        }
    );


    audio.addEventListener(
        "pause",
        () => {

            play.textContent = "▶";

            play.setAttribute(
                "aria-label",
                "Reproduzir música"
            );

            stopVisualizer();
        }
    );


    /* ==================================================
       PRÓXIMA AUTOMÁTICA
    ================================================== */

    audio.addEventListener(
        "ended",
        async () => {

            /*
             * Quando chegar à última,
             * volta automaticamente para a primeira.
             */
            loadTrack(
                currentTrack + 1
            );

            await playMusic();
        }
    );


    /* ==================================================
       ERRO DE CARREGAMENTO
    ================================================== */

    audio.addEventListener(
        "error",
        () => {

            console.error(
                "Falha ao carregar música:",
                playlist[currentTrack][1]
            );
        }
    );


    /* ==================================================
       PRIMEIRA MÚSICA
    ================================================== */

    loadTrack(0);


    /*
     * Tenta iniciar automaticamente.
     *
     * Se o navegador bloquear autoplay,
     * a primeira interação da página
     * fará a tentativa novamente.
     */
    audio.play().catch(() => {
        console.log(
            "Autoplay bloqueado pelo navegador; aguardando primeira interação."
        );
    });

});
