// Shared by every page: config helpers, the nav, saved orders, tracking lookup and the receipt modal.
// Pages talk to each other only through localStorage (bag, orders) and ?code= in the track page URL.
(() => {
  "use strict";

  const cfg = window.SHOP_CONFIG;
  const ART = cfg.art;
  const SHIP = cfg.shipping || {};
  const STEPS = SHIP.steps || [];
  const $ = (sel) => document.querySelector(sel);
  const money = (n) => `${cfg.currency} ${n.toFixed(2)}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byId = (list, id) => list.find((x) => x.id === id);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Saved orders (this browser only; the street address, phone and email are NOT saved) ──
  const DEMO_MIN = [0, 1, 2, 3, 5];   // demo tracking: minutes after ordering that each step is reached
  const savedOrders = () => { try { return JSON.parse(localStorage.getItem("monochrome-orders")) || []; } catch { return []; } };
  function rememberOrder(o) {
    try {
      const { name, postcode, city, state } = o.ship;
      const list = savedOrders().filter((x) => x.code !== o.code);
      list.push({ code: o.code, at: o.at, total: o.total, items: o.items, ship: { name, postcode, city, state } });
      localStorage.setItem("monochrome-orders", JSON.stringify(list.slice(-20)));
    } catch { /* private mode: demo tracking just won't find it */ }
    updateNav();
  }

  // → { status, updated, courier, parcel, demo } or null if the code isn't known
  async function lookup(code) {
    if (SHIP.trackUrl) {
      const r = await fetch(`${SHIP.trackUrl}${SHIP.trackUrl.includes("?") ? "&" : "?"}code=${encodeURIComponent(code)}`, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      return d.found === false || !d.status ? null : d;
    }
    const o = savedOrders().find((x) => x.code === code);
    if (!o) return null;
    const mins = (Date.now() - o.at) / 60000;
    let i = 0;
    DEMO_MIN.forEach((m, k) => { if (mins >= m) i = k; });
    i = Math.min(i, STEPS.length - 1);
    return { status: STEPS[i].id, updated: new Date(o.at + DEMO_MIN[i] * 60000).toISOString(), demo: true };
  }
  function normCode(v) {
    const c = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
  }
  const goTrack = (code) => { location.href = `track.html?code=${encodeURIComponent(code)}`; };

  // ── Nav: brand, bag badge, orders lock, scrolled background, current page ──
  const BAG_KEY = "monochrome-bag";
  function bagCountFromStorage() {
    try {
      const d = JSON.parse(localStorage.getItem(BAG_KEY));
      return Array.isArray(d?.items) ? d.items.reduce((s, it) => s + (+it.qty || 0), 0) : 0;
    } catch { return 0; }
  }
  function setBagCount(n) {
    const badge = $("#bagCount"), bag = $("#navBag");
    if (!badge || !bag) return;
    badge.textContent = n;
    badge.hidden = !n;   // badge only when there's something in the bag
    bag.setAttribute("aria-label", n ? `Bag, ${n} ${n === 1 ? "item" : "items"}` : "Bag, empty");
  }
  function updateNav() {
    const n = savedOrders().length, me = $("#navMe");
    if (me) {
      me.dataset.locked = n ? "false" : "true";
      me.setAttribute("aria-label", n ? `Orders (${n})` : "Orders, locked");
    }
  }
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((a) => {
    if (a.getAttribute("href").split(/[#?]/)[0] === page) a.setAttribute("aria-current", "page");
  });
  $("#brand").textContent = cfg.shopName;
  document.title = page === "index.html" ? cfg.shopName : `${document.title} · ${cfg.shopName}`;
  setBagCount(bagCountFromStorage());
  updateNav();

  // Transparent over the top of the page, a plain background once it scrolls.
  const navEl = $(".nav");
  const navTick = () => navEl.classList.toggle("scrolled", scrollY > 24);
  addEventListener("scroll", navTick, { passive: true });
  navTick();

  // ── Receipt modal: Mio says thanks, the receipt underneath ──
  let rc = $("#receipt");
  if (!rc) {
    rc = document.createElement("dialog");
    rc.className = "quick receipt";
    rc.id = "receipt";
    rc.setAttribute("aria-labelledby", "rcTitle");
    document.body.append(rc);
  }
  function showReceipt(o) {
    const ship = o.ship, orderNo = o.code, items = o.items || [];
    const when = new Date(o.at);
    const date = when.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    const time = when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const to = ship && [ship.line1, ship.line2, `${ship.postcode} ${ship.city}`, ship.state].filter(Boolean).join(", ");
    rc.innerHTML = `
      <div class="qv">
        <div class="qv-img rc-img"><img src="${esc(ART.mio)}thanks${ART.ext}" alt="Mio making a heart with her hands" decoding="async"></div>
        <div class="qv-info rc-info">
          <button type="button" class="qv-close" data-close aria-label="Close">×</button>
          <p class="qv-kicker">Thank you · receipt</p>
          <h3 id="rcTitle">Order ${esc(orderNo)}</h3>
          <p class="qv-note">${esc(date)} · ${esc(time)}</p>
          <div class="rc-code">
            <span><small>Tracking code</small><b>${esc(orderNo)}</b></span>
            <button type="button" class="btn" data-copy>Copy</button>
          </div>
          ${ship?.email ? `<p class="rc-line rc-grey">We’ll also email this code to ${esc(ship.email)}.</p>` : ""}
          <ul class="rc-items">${items.length ? items.map((it) => `
            <li><span class="q">${it.qty}×</span><div class="info"><b>${esc(it.name)}</b><small>${esc(it.plain)}</small></div><span>${money(it.price * it.qty)}</span></li>`).join("") : `
            <li><div class="info"><small>The items weren’t saved for this order (it was placed before receipts kept them).</small></div></li>`}
          </ul>
          ${o.total != null ? `<div class="total"><span>Total paid</span><span>${money(o.total)}</span></div>` : ""}
          <p class="rc-line"><b>Paid by</b> QR</p>
          ${ship ? `<p class="rc-line"><b>Posting to</b> ${esc(ship.name)}<br>${esc(to)}${ship.phone ? `<br>${esc(ship.phone)}` : ""}${ship.note ? `<br><i>“${esc(ship.note)}”</i>` : ""}</p>` : ""}
          ${SHIP.note ? `<p class="rc-line rc-grey">${esc(SHIP.note)}</p>` : ""}
          <div class="btn-row">
            <button type="button" class="btn" data-print>Print / save</button>
            <button type="button" class="btn main" data-track>Track it</button>
          </div>
        </div>
      </div>`;
    const im = rc.querySelector(".rc-img img");
    im.addEventListener("error", () => { rc.querySelector(".qv").classList.add("no-img"); im.parentNode.remove(); });
    if (!rc.open) rc.showModal();
  }
  rc.addEventListener("click", (e) => {
    if (e.target === rc || e.target.closest("[data-close]")) return rc.close();
    if (e.target.closest("[data-print]")) window.print();
    const code = rc.querySelector(".rc-code b")?.textContent;
    if (e.target.closest("[data-track]")) { rc.close(); goTrack(code); }
    const cp = e.target.closest("[data-copy]");
    if (cp) navigator.clipboard?.writeText(code).then(() => { cp.textContent = "Copied"; setTimeout(() => { cp.textContent = "Copy"; }, 1500); }, () => {});
  });

  // ── Footer year, and the reviews on the home page ──
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const list = $("#reviewList");
  if (list) {
    const reviews = cfg.reviews || [];
    const stars = (n) => `<span class="stars" role="img" aria-label="${n} out of 5">${"★".repeat(n)}<i>${"★".repeat(5 - n)}</i></span>`;
    if (!reviews.length) $("#reviews").hidden = true;
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);
    $("#reviewsScore").innerHTML = `<b>${avg.toFixed(1)}</b> ${stars(Math.round(avg))} <span>from ${reviews.length} reviews</span>`;
    list.innerHTML = reviews.map((r) => `
      <li class="review">
        ${stars(r.rating)}
        <p>${esc(r.text)}</p>
        <p class="review-by"><b>${esc(r.name)}</b> · ${esc(r.piece)}</p>
      </li>`).join("");
  }

  window.Mono = { cfg, ART, SHIP, STEPS, $, money, esc, byId, calm, BAG_KEY, savedOrders, rememberOrder, lookup, normCode, goTrack, setBagCount, updateNav, showReceipt };
})();
