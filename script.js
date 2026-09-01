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
