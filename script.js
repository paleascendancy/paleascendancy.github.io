/* PALE ASCENDANCY V27 — unified client */
(() => {
  "use strict";

  const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";

  const PLAYLIST = [
    ["Meaningful Love", "music/01-meaningful-love.mp3"],
    ["Better Days", "music/02-better-days.mp3"],
    ["Chill Day", "music/03-chill-day.mp3"],
    ["Canals", "music/04-canals.mp3"],
    ["Tek It — Hoodtrap Remix", "music/05-tek-it-hoodtrap-remix.mp3"],
    ["Star Shopping", "music/06-star-shopping.mp3"],
    ["Earrings", "music/07-earrings.mp3"],
    ["New Jeans Jersey Remix", "music/08-new-jeans-jersey-remix.mp3"],
    ["Nuts — Instrumental Slowed", "music/09-nuts-instrumental-slowed.mp3"],
    ["Sweater Weather — Instrumental", "music/10-sweater-weather-instrumental.mp3"],
    ["Childish Gambino — Instrumental", "music/11-childish-gambino-instrumental.mp3"]
  ];

  const CATEGORIES = [
    ["promo", "Promo"],
    ["trailer", "Trailers"],
    ["highlight", "Highlights"],
    ["motion", "Motion Design"],
    ["anime", "Anime / Mangá"],
    ["gaming", "Gaming"],
    ["tiktok", "TikTok"],
    ["reels", "Reels"],
    ["amv", "AMV"],
    ["thumbnail", "Thumbnails"],
    ["youtube", "YouTube"],
    ["design", "Design Gráfico"],
    ["branding", "Branding"],
    ["uiux", "UI / UX"],
    ["illustration", "Ilustração"],
    ["3d", "3D"],
    ["outros", "Outros"]
  ];

  const CATEGORY_MAP = Object.fromEntries(CATEGORIES);

  const PLANS = {
    free: ["Gratuito", 2],
    premium: ["Premium", 5],
    pro: ["Pro", 10],
    studio: ["Studio", 20],
    elite: ["Elite", 40]
  };

  const THEME_DEFAULTS = {
    "--bg": "#08070c",
    "--bg-deep": "#05040a",
    "--surface": "#121018",
    "--surface-2": "#1a1722",
    "--text": "#f7f4fb",
    "--text-soft": "#ddd6e8",
    "--muted": "#9c94a8",
    "--cyan": "#9fe8ff",
    "--violet": "#a894ff",
    "--gold": "#e9cf91",
    "--pink": "#e6a4d0"
  };

  let client = null;
  let audio = null;
  let trackIndex = 0;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const esc = value =>
    String(value ?? "").replace(
      /[&<>\"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
      }[c])
    );

  const setMsg = (el, text, kind = "") => {
    if (!el) return;

    el.textContent = text || "";
    el.className = `auth-message ${kind}`.trim();
  };

  function getClient() {
    if (client) return client;

    if (window.supabase?.createClient) {
      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }

    return client;
  }

  async function ensureClient() {
    if (getClient()) return client;

    await new Promise(resolve => {
      const s = document.createElement("script");

      s.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

      s.onload = resolve;
      s.onerror = resolve;

      document.head.appendChild(s);
    });

    return getClient();
  }

  async function session() {
    const c = await ensureClient();

    return (
      await c.auth.getSession()
    ).data.session || null;
  }

  async function profile(userId, full = false) {
    const c = await ensureClient();

    const fields = full
      ? "id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,editor_categories,portfolio_url,editor_software,availability,professional_plan,portfolio_limit,plan_status,plan_expires_at,professional_application,requested_role"
      : "id,email,nome,nome_artistico,especialidade,avatar_url,is_editor,is_designer,is_featured,professional_plan,portfolio_limit,plan_status,plan_expires_at";

    const r = await c
      .from("profile")
      .select(fields)
      .eq("id", userId)
      .maybeSingle();

    return r.data || null;
  }

  async function isAdmin(userId) {
    const c = await ensureClient();

    if (!userId) return false;

    const r = await c.rpc("is_admin");

    return !r.error && r.data === true;
  }
