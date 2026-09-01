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
