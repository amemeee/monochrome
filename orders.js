// The orders page: orders placed in this browser, with receipts. Locked until the first order.
(() => {
  "use strict";

  const { STEPS, $, esc, money, savedOrders, lookup, goTrack, showReceipt } = window.Mono;

  const LOCK = `<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path class="sh-closed" d="M8 11V8a4 4 0 0 1 8 0v3" fill="none"/><path class="sh-open" d="M8 11V8a4 4 0 0 1 7.6-1.7" fill="none"/></svg>`;
  function renderMe() {
    const list = savedOrders().slice().reverse();
    const box = $("#meBody");
    if (!list.length) {
      box.innerHTML = `
        <div class="me-lock">
          ${LOCK}
          <h2>Nothing here yet</h2>
          <p>Place your first order and it will show up here, with its receipt.</p>
          <a class="btn main" href="catalogue.html">Go shopping</a>
        </div>`;
      return;
    }
    box.innerHTML = `<ul class="me-list">${list.map((o) => `
      <li class="me-order" data-code="${esc(o.code)}">
        <div class="me-top"><b class="me-code">${esc(o.code)}</b><span class="me-status" data-status>…</span></div>
        <p class="me-meta">${esc(new Date(o.at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }))}${o.total != null ? ` · ${money(o.total)}` : ""}${o.ship?.city ? ` · to ${esc(o.ship.city)}` : ""}</p>
        ${o.items ? `<p class="me-items">${o.items.map((i) => `${i.qty}× ${esc(i.name)}`).join(", ")}</p>` : ""}
        <div class="btn-row">
          <button type="button" class="btn" data-receipt>Receipt</button>
          <button type="button" class="btn main" data-track>Track</button>
        </div>
      </li>`).join("")}</ul>`;
    box.querySelectorAll(".me-order").forEach((li) => {   // current status of each, like the tracker shows it
      lookup(li.dataset.code).then((f) => {
        const s = f && STEPS.find((x) => x.id === f.status);
        li.querySelector("[data-status]").textContent = s ? s.name : "Status unknown";
        if (s) li.dataset.step = STEPS.indexOf(s);
      }).catch(() => { li.querySelector("[data-status]").textContent = "Status unavailable"; });
    });
  }
  $("#meBody").addEventListener("click", (e) => {
    const li = e.target.closest(".me-order");
    if (!li) return;
    if (e.target.closest("[data-track]")) goTrack(li.dataset.code);
    if (e.target.closest("[data-receipt]")) showReceipt(savedOrders().find((o) => o.code === li.dataset.code));
  });
  renderMe();

  // Demo tracking moves on by itself, so refresh the statuses now and then.
  setInterval(() => { if (savedOrders().length && !document.hidden) renderMe(); }, 60000);
})();
