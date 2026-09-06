(() => {
  "use strict";

  const SB_URL = "https://fnyellunugdfesprmvzm.supabase.co";
  const SB_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
  const mq = window.matchMedia("(max-width:820px)");
  let playerHome = null;
  let playerNext = null;
  let recentBuilt = false;

  function accentTitle(){
    const h1 = document.querySelector(".v3-home .hero-content h1");
    if (!h1 || h1.dataset.mobileAccent === "1") return;
    const text = h1.textContent.trim();
    const phrase = "seu projeto";
    const idx = text.toLowerCase().lastIndexOf(phrase);
    if (idx >= 0) {
      h1.innerHTML = `${text.slice(0, idx)}<span class="mobile-accent">${text.slice(idx, idx + phrase.length)}</span>${text.slice(idx + phrase.length)}`;
    }
    h1.dataset.mobileAccent = "1";
  }

  function ensureStats(){
    const content = document.querySelector(".v3-home .hero-content");
    if (!content || content.querySelector(".mobile-hero-stats")) return;
    const stats = document.createElement("div");
    stats.className = "mobile-hero-stats";
    stats.innerHTML = `
      <div class="mobile-hero-stat"><strong>Perfis públicos</strong><span>Profissionais publicados</span></div>
      <div class="mobile-hero-stat"><strong>Portfólios reais</strong><span>Trabalhos da comunidade</span></div>
      <div class="mobile-hero-stat"><strong>Briefing claro</strong><span>Projeto antes do contato</span></div>`;
    content.appendChild(stats);
  }

  function ensureMusicSlot(){
    const visual = document.querySelector(".v3-home .hero-visual");
    const player = document.getElementById("musicPlayer");
    if (!visual || !player) return;
    let slot = visual.querySelector(".mobile-music-slot");
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "mobile-music-slot";
      visual.appendChild(slot);
    }
    if (!playerHome) {
      playerHome = player.parentNode;
      playerNext = player.nextSibling;
    }
    if (mq.matches && player.parentNode !== slot) slot.appendChild(player);
    if (!mq.matches && playerHome && player.parentNode !== playerHome) {
      if (playerNext && playerNext.parentNode === playerHome) playerHome.insertBefore(player, playerNext);
      else playerHome.appendChild(player);
    }
  }

  function recentShell(){
    if (document.querySelector(".mobile-recent")) return document.querySelector(".mobile-recent");
    const hero = document.querySelector(".v3-home .hero");
    if (!hero) return null;
    const section = document.createElement("section");
    section.className = "mobile-recent";
    section.innerHTML = `
      <div class="mobile-recent-head">
        <div><span class="mobile-recent-kicker">Em destaque</span><h2>Trabalhos recentes</h2></div>
        <a href="editores.html">Ver todos →</a>
      </div>
      <div class="mobile-recent-track" id="mobileRecentWorks"><div class="mobile-work-empty">Carregando trabalhos...</div></div>`;
    hero.insertAdjacentElement("afterend", section);
    return section;
  }

  function escapeHTML(value){return String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}

  async function loadRecent(){
    if (recentBuilt) return;
    recentBuilt = true;
    const section = recentShell();
    const track = section?.querySelector("#mobileRecentWorks");
    if (!track) return;
    try {
      const endpoint = `${SB_URL}/rest/v1/editor_portfolio_items?select=id,title,item_type,url,created_at&order=created_at.desc&limit=8`;
      const response = await fetch(endpoint,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = await response.json();
      if (!Array.isArray(items) || !items.length) {
        track.innerHTML = '<div class="mobile-work-empty">Os trabalhos publicados pelos profissionais aparecerão aqui.</div>';
        return;
      }
      track.innerHTML = items.map(item => {
        const title = escapeHTML(item.title || "Projeto");
        const url = escapeHTML(item.url || "editores.html");
        const type = item.item_type === "video" ? "VÍDEO" : item.item_type === "image" ? "ARTE" : "PROJETO";
        let media = '<div style="width:100%;height:100%;background:radial-gradient(circle at 70% 20%,rgba(231,25,71,.22),transparent 55%),linear-gradient(145deg,#152032,#080c12)"></div>';
        if (item.item_type === "image" && item.url) media = `<img src="${url}" alt="${title}" loading="lazy">`;
        else if (item.item_type === "video" && item.url) media = `<video src="${url}" muted playsinline preload="metadata"></video>`;
        return `<a class="mobile-work-card" href="${url}" target="_blank" rel="noopener noreferrer">${media}<span class="mobile-work-shade"></span><span class="mobile-work-meta"><strong>${title}</strong><span>${type}</span></span></a>`;
      }).join("");
    } catch (error) {
      console.warn("[Pale Ascendancy] trabalhos recentes:", error);
      track.innerHTML = '<div class="mobile-work-empty">Não foi possível carregar os trabalhos agora.</div>';
    }
  }

  function apply(){
    accentTitle();
    ensureStats();
    ensureMusicSlot();
    if (mq.matches) loadRecent();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, {once:true});
  else apply();
  mq.addEventListener?.("change", ensureMusicSlot);
})();
