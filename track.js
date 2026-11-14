// The track page: enter the code from a receipt (or arrive with ?code=) to see where the parcel is.
(() => {
  "use strict";

  const { STEPS, $, esc, savedOrders, lookup, normCode } = window.Mono;

  // Codes of orders placed in this browser, as one-tap buttons.
  function showRecent() {
    const list = savedOrders().slice(-3).reverse();
    $("#trackRecent").innerHTML = list.length
      ? `<span>Your orders:</span>${list.map((o) => `<button type="button" data-code="${esc(o.code)}">${esc(o.code)}</button>`).join("")}`
      : "";
  }
  $("#trackRecent").addEventListener("click", (e) => {
    const b = e.target.closest("[data-code]");
    if (b) track(b.dataset.code);
  });

  async function track(raw) {
    const out = $("#trackResult"), code = normCode(raw);
    $("#trackCode").value = code;
    out.innerHTML = `<p class="track-msg">Looking…</p>`;
    let found;
    try { found = await lookup(code); }
    catch { out.innerHTML = `<p class="track-msg">Couldn’t reach tracking. Try again in a moment.</p>`; return; }
    if (!found) {
      out.innerHTML = `<p class="track-msg">We can’t find <b>${esc(code)}</b>. Check it matches your receipt exactly (4 digits, a dash, 4 characters).</p>`;
      return;
    }
    const cur = Math.max(0, STEPS.findIndex((s) => s.id === found.status));
    const upd = found.updated ? new Date(found.updated) : null;
    // Demo note, switched off. To show it again, add this line at the end of the card below:
    // ${found.demo ? `<p class="track-meta">Demo tracking: moves forward every minute. Real updates need <code>trackUrl</code> in config.js.</p>` : ""}
    out.innerHTML = `
      <div class="track-card">
        <p class="card-kicker">Tracking code</p>
        <p class="track-code">${esc(code)}</p>
        <ol class="timeline">${STEPS.map((s, i) => `
          <li class="${i < cur ? "done" : i === cur ? "now" : ""}" ${i === cur ? 'aria-current="step"' : ""}>
            <span class="pin" aria-hidden="true">${i < cur ? "✓" : i + 1}</span>
            <div><b>${esc(s.name)}</b><small>${esc(s.note || "")}</small></div>
          </li>`).join("")}
        </ol>
        ${found.courier || found.parcel ? `<p class="track-meta"><b>${esc(found.courier || "Courier")}</b>${found.parcel ? ` · parcel no. ${esc(found.parcel)}` : ""}</p>` : ""}
        ${upd && !isNaN(upd) ? `<p class="track-meta">Updated ${esc(upd.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }))}</p>` : ""}
      </div>`;
  }

  showRecent();
  $("#trackForm").addEventListener("submit", (e) => { e.preventDefault(); track($("#trackCode").value); });

  // Arrived from a receipt or the orders page: track.html?code=1311-K7QP
  const fromUrl = new URLSearchParams(location.search).get("code");
  if (fromUrl) track(fromUrl);
})();
