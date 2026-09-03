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
                    searchData.includes(search) ||
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
       
       FUTURAMENTE:
       - Cadastro
       - Login
       - Banco de dados
       - Foto
       - Redes sociais
       - Portfólio
       - Disponibilidade
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
   PLAYER DE MÚSICA — PALE ASCENDANCY
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const audio = document.getElementById("musicAudio");
    const playButton = document.getElementById("musicPlay");
    const prevButton = document.getElementById("musicPrev");
    const nextButton = document.getElementById("musicNext");
    const progress = document.getElementById("musicProgress");
    const volume = document.getElementById("musicVolume");
    const title = document.getElementById("musicTitle");
    const status = document.getElementById("musicStatus");
    const message = document.getElementById("musicMessage");

    if (!audio || !playButton || !prevButton || !nextButton) {
        return;
    }

    /*
     * Coloque os arquivos .mp3 dentro de:
     * assets/music/
     *
     * A primeira música é Meaningful Love.
     * Quando uma faixa termina, a próxima é iniciada automaticamente.
     */
    const playlist = [
        {
            title: "Meaningful Love",
            file: "assets/music/Meaningful Love.mp3"
        },
        {
            title: "Canals",
            file: "assets/music/Joakim Karud - Canals(MP3_160K).mp3"
        },
        {
            title: "Better Days",
            file: "assets/music/LAKEY INSPIRED - Better Days(MP3_160K).mp3"
        },
        {
            title: "Chill Day",
            file: "assets/music/LAKEY INSPIRED - Chill Day(MP3_160K).mp3"
        }
    ];

    let currentTrack = 0;

    function updatePlayerText() {
        const track = playlist[currentTrack];

        title.textContent = track.title;
        status.textContent = audio.paused
            ? "Pausada"
            : "Reproduzindo";

        playButton.textContent = audio.paused ? "▶" : "Ⅱ";
        playButton.setAttribute(
            "aria-label",
            audio.paused ? "Reproduzir música" : "Pausar música"
        );
    }

    function loadTrack(index, autoplay = false) {
        currentTrack = (index + playlist.length) % playlist.length;

        const track = playlist[currentTrack];

        audio.src = track.file;
        audio.currentTime = 0;
        progress.value = 0;

        updatePlayerText();

        if (autoplay) {
            audio.play().catch(() => {
                status.textContent = "Toque em play para iniciar";
            });
        }
    }

    playButton.addEventListener("click", () => {
        if (audio.paused) {
            audio.play().catch(() => {
                status.textContent = "Toque novamente para iniciar";
            });
        } else {
            audio.pause();
        }
    });

    nextButton.addEventListener("click", () => {
        loadTrack(currentTrack + 1, true);
    });

    prevButton.addEventListener("click", () => {
        if (audio.currentTime > 4) {
            audio.currentTime = 0;
            progress.value = 0;
            return;
        }

        loadTrack(currentTrack - 1, true);
    });

    audio.addEventListener("play", () => {
        updatePlayerText();
        message.textContent = "A próxima faixa será iniciada automaticamente.";
    });

    audio.addEventListener("pause", () => {
        updatePlayerText();
    });

    audio.addEventListener("timeupdate", () => {
        if (!audio.duration || !Number.isFinite(audio.duration)) {
            return;
        }

        progress.value = (audio.currentTime / audio.duration) * 100;
    });

    progress.addEventListener("input", () => {
        if (!audio.duration || !Number.isFinite(audio.duration)) {
            return;
        }

        audio.currentTime =
            (Number(progress.value) / 100) * audio.duration;
    });

    volume.addEventListener("input", () => {
        audio.volume = Number(volume.value);
    });

    audio.addEventListener("ended", () => {
        loadTrack(currentTrack + 1, true);
    });

    audio.addEventListener("error", () => {
        status.textContent = "Arquivo de música não encontrado";
        message.textContent =
            "Adicione os arquivos da playlist em assets/music/ e mantenha os nomes exatamente iguais.";
    });

    audio.volume = Number(volume.value);

    loadTrack(0, false);
});
