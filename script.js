
document.addEventListener("DOMContentLoaded", () => {
  // Controle do Menu Mobile
  const menuButton = document.getElementById("menuButton");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuButton && mobileMenu) {
    menuButton.addEventListener("click", () => {
      const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", !isExpanded);
      mobileMenu.classList.toggle("is-active", !isExpanded);
      
      // Suporte para exibição via estilo caso css utilize [hidden] ou classe
      if (mobileMenu.hasAttribute("hidden")) {
        mobileMenu.removeAttribute("hidden");
      } else if (isExpanded) {
        mobileMenu.setAttribute("hidden", "true");
      }
    });
  }

  // Atualização do Cabeçalho conforme Autenticação
  if (window.PaleAscendancy && window.PaleAscendancy.supabase) {
    const supabase = window.PaleAscendancy.supabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const loggedOutArea = document.getElementById("loggedOutArea");
      const loggedInArea = document.getElementById("loggedInArea");
      const mobileLoggedOut = document.getElementById("mobileLoggedOut");
      const mobileLoggedIn = document.getElementById("mobileLoggedIn");

      if (session?.user) {
        if (loggedOutArea) loggedOutArea.hidden = true;
        if (loggedInArea) loggedInArea.hidden = false;
        if (mobileLoggedOut) mobileLoggedOut.hidden = true;
        if (mobileLoggedIn) mobileLoggedIn.hidden = false;
      } else {
        if (loggedOutArea) loggedOutArea.hidden = false;
        if (loggedInArea) loggedInArea.hidden = true;
        if (mobileLoggedOut) mobileLoggedOut.hidden = false;
        if (mobileLoggedIn) mobileLoggedIn.hidden = true;
      }
    });
  }
});
