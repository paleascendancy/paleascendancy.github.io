/* =========================================
   MENU MOBILE
========================================= */

const menuButton = document.getElementById("menuButton");
const mobileMenu = document.getElementById("mobileMenu");

if (menuButton && mobileMenu) {

  menuButton.addEventListener("click", function () {

    const isOpen = mobileMenu.classList.toggle("active");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"
    );

  });

}

/* Fecha o menu ao clicar em um link */

const mobileLinks = document.querySelectorAll(".mobile-menu a");

mobileLinks.forEach(function (link) {

  link.addEventListener("click", function () {

    mobileMenu.classList.remove("active");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menu de navegação");

  });

});


/* =========================================
   FORMULÁRIO DE CONTATO
========================================= */

const contactForm = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");

// Mostra a confirmação se a página voltou do FormSubmit com ?enviado=1
if (window.location.search.includes("enviado=1") && formNote) {
  formNote.hidden = false;
  if (contactForm) {
    contactForm.reset();
  }
}

if (contactForm && formNote) {

  contactForm.addEventListener("submit", function () {

    const submitButton = contactForm.querySelector(".form-submit");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

  });

}


/* =========================================
   BUSCA E FILTRO DE EDITORES (editores.html)
========================================= */

const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");
const editorCards = document.querySelectorAll(".editor-profile");
const noResults = document.getElementById("noResults");

if (searchInput && editorCards.length) {

  let activeFilter = "todos";

  function applyFilters() {

    const term = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    editorCards.forEach(function (card) {

      const category = card.dataset.category || "";
      const searchable = card.dataset.search || "";

      const matchesFilter = activeFilter === "todos" || category === activeFilter;
      const matchesSearch = term === "" || searchable.includes(term);
      const visible = matchesFilter && matchesSearch;

      card.style.display = visible ? "" : "none";

      if (visible) {
        visibleCount += 1;
      }

    });

    if (noResults) {
      noResults.classList.toggle("visible", visibleCount === 0);
    }

  }

  searchInput.addEventListener("input", applyFilters);

  filterButtons.forEach(function (button) {

    button.addEventListener("click", function () {

      filterButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      activeFilter = button.dataset.filter || "todos";

      applyFilters();

    });

  });

}
