// Section 2: the shop builder, the bag card on the right, paying, and Mio peeking.
// mio.js (section 1) uses window.Shop to describe items and to prefill her picks.
(() => {
  "use strict";

  const cfg = window.SHOP_CONFIG;
  const $ = (sel) => document.querySelector(sel);
  const money = (n) => `${cfg.currency} ${n.toFixed(2)}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byId = (list, id) => list.find((x) => x.id === id);

  // Garment outlines, 48×48. Filled with the chosen colour in the preview.
  const ICONS = {
    tee:    `<path d="M17 6 9 10 3 19l7 4 3-3v22h22V20l3 3 7-4-6-9-8-4c-2 4-12 4-14 0Z"/>`,
    shirt:  `<path d="M18 5 10 9 5 41l6 1 3-20v22h20V22l3 20 6-1-5-32-8-4-6 7Z"/><path d="m18 5 6 7 6-7M24 12v32" fill="none"/>`,
    hoodie: `<path d="M16 10c2-8 14-8 16 0l8 3 5 28-6 1-4-18v20H13V24L9 42l-6-1 5-28Z"/><path d="M19 11c2 5 8 5 10 0M18 33h12l-2 6h-8Z" fill="none"/>`,
    pants:  `<path d="M12 4h24l5 40H29L24 17l-5 27H7Z"/><path d="M12 9h24" fill="none"/>`,
  };
  const svg = (icon, fill) =>
    `<svg viewBox="0 0 48 48" class="garment" style="--fill:${fill}">${ICONS[icon] || ICONS.tee}</svg>`;

  const DEFAULTS = { colour: "ink", size: "M", fit: "regular", print: "plain" };
  const PARTS = ["garment", "colour", "size", "fit", "print"];

  // A piece is { garment, colour, size, fit, print }; missing parts count as the defaults.
  function describe(partial) {
    const d = { ...DEFAULTS, ...partial };
    const item = byId(cfg.items, d.garment);
    const colour = byId(cfg.colours, d.colour);
    const fit = byId(cfg.fits, d.fit);
    const print = byId(cfg.prints, d.print);
    const name = [d.fit !== "regular" ? fit.name : "", colour.name, item.name].filter(Boolean).join(" ");
    const plain = [`Size ${d.size}`, d.print !== "plain" ? `${print.name.toLowerCase()} ${print.note}` : "plain"].join(" · ");
    const price = item.price + print.price;
    return { piece: d, key: PARTS.map((k) => d[k]).join("|"), name, plain, price, icon: item.icon, hex: colour.hex };
  }

  // ── Builder ──
  const form = $("#builder");
  let qty = 1;

  const chip = (name, value, inner, checked) => `
    <label class="chip">
      <input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>
      <span>${inner}</span>
    </label>`;

  $("#itemChips").innerHTML = cfg.items.map((it) =>
    chip("garment", it.id, `${svg(it.icon, "transparent")}<b>${esc(it.name)}</b><small>${esc(it.note)}</small><small>${money(it.price)}</small>`)).join("");
  $("#colourChips").innerHTML = cfg.colours.map((c) =>
    chip("colour", c.id, `<i class="swatch" style="background:${esc(c.hex)}"></i><b>${esc(c.name)}</b>`, c.id === DEFAULTS.colour)).join("");
  $("#sizeChips").innerHTML = cfg.sizes.map((s) =>
    chip("size", s.id, `<b>${esc(s.id)}</b><small data-size="${esc(s.id)}">&nbsp;</small>`, s.id === DEFAULTS.size)).join("");
  $("#fitChips").innerHTML = cfg.fits.map((f) =>
    chip("fit", f.id, `<b>${esc(f.name)}</b><small>${esc(f.note)}</small>`, f.id === DEFAULTS.fit)).join("");
  $("#printChips").innerHTML = cfg.prints.map((p) =>
    chip("print", p.id, `<b>${esc(p.name)}</b><small>${esc(p.note)}</small><small>${p.price ? `+${money(p.price)}` : "free"}</small>`, p.id === DEFAULTS.print)).join("");

  function current() {
    const fd = new FormData(form);
    if (!fd.get("garment")) return null;
    return Object.fromEntries(PARTS.map((k) => [k, fd.get(k)]));
  }

  function refresh() {
    const itemId = form.elements.garment.value;
    const item = byId(cfg.items, itemId);

    // Size chips show chest or waist depending on the item.
    const measure = item ? item.measure : "chest";
    form.querySelectorAll("[data-size]").forEach((el) => {
      el.textContent = `${measure} ${byId(cfg.sizes, el.dataset.size)[measure]}`;
    });
    $("#sizeHint").textContent = `Body ${measure} in cm. Between sizes? Pick “Oversized” instead of sizing up.`;

    // Tops-only prints are off for pants.
    const bottoms = item && item.measure === "waist";
    let blocked = false;
    cfg.prints.forEach((p) => {
      if (!p.tops) return;
      const input = form.querySelector(`input[name=print][value="${p.id}"]`);
      input.disabled = bottoms;
      if (bottoms && input.checked) { form.elements.print.value = "plain"; }
      blocked = blocked || bottoms;
    });
    $("#printHint").style.visibility = blocked ? "visible" : "hidden";   // keeps its space either way

    $("#qty").textContent = qty;
    const d = current();
    if (!d) {
      $("#preview").innerHTML = "";
      $("#nameLine").textContent = "Pick an item";
      $("#plainName").innerHTML = "&nbsp;";
      $("#addPrice").textContent = "";
      $("#addBtn").disabled = true;
      return;
    }
    const info = describe(d);
    $("#preview").innerHTML = svg(info.icon, info.hex);
    $("#nameLine").textContent = (qty > 1 ? `${qty} × ` : "") + info.name;
    $("#plainName").textContent = info.plain;
    $("#plainName").title = info.plain;   // full text on hover when it's cut off with "…"
    $("#addPrice").textContent = `· ${money(info.price * qty)}`;
    $("#addBtn").disabled = stage !== "order";
  }

  form.addEventListener("change", refresh);
  $("#qtyUp").addEventListener("click", () => { qty = Math.min(qty + 1, 10); refresh(); });
  $("#qtyDown").addEventListener("click", () => { qty = Math.max(qty - 1, 1); refresh(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = current();
    if (!d || stage !== "order") return;
    const info = describe(d);
    const same = bag.find((it) => it.key === info.key);
    if (same) same.qty += qty; else bag.push({ ...info, qty });
    peekSay(PEEK_LINES[Math.floor(Math.random() * PEEK_LINES.length)]);
    // Keep the size: people rarely change it between pieces.
    const keepSize = d.size;
    form.reset();
    form.elements.size.value = keepSize;
    qty = 1;
    refresh();
    render();
  });

  function flash() {
    form.classList.remove("flash");
    void form.offsetWidth;
    form.classList.add("flash");
  }

  // Mio's pick from section 1 → fill in the builder and scroll here.
  function prefill(piece) {
    for (const [k, v] of Object.entries({ ...DEFAULTS, size: form.elements.size.value || DEFAULTS.size, ...piece }))
      form.elements[k].value = v;
    qty = 1;
    refresh();
    $("#order").scrollIntoView({ behavior: "smooth" });
    flash();
    setTimeout(() => peekSay("…I filled it in for you."), 700);
  }

  // Just set some parts (e.g. the size from her size quiz), without scrolling.
  function setParts(parts) {
    for (const [k, v] of Object.entries(parts)) form.elements[k].value = v;
    refresh();
  }

  // ── Bag card: bag → pay → pickup card ──
  let bag = [];
  let stage = "order";
  const total = () => bag.reduce((s, it) => s + it.price * it.qty, 0);
  const count = () => bag.reduce((s, it) => s + it.qty, 0);

  function render() {
    const box = $("#summary");
    if (stage === "order") {
      box.innerHTML = bag.length ? `
        <h3>Your bag · ${count()}</h3>
        <ul class="order-list">${bag.map((it, i) => `
          <li>
            <span class="q">${it.qty}×</span>
            <span class="mini" aria-hidden="true">${svg(it.icon, it.hex)}</span>
            <div class="info"><b>${esc(it.name)}</b><small>${esc(it.plain)} · ${money(it.price * it.qty)}</small></div>
            <button type="button" class="remove" data-remove="${i}" aria-label="Remove ${esc(it.name)}">×</button>
          </li>`).join("")}
        </ul>
        <div class="total"><span>Total</span><span>${money(total())}</span></div>
        <div class="btn-row"><button type="button" class="btn main" data-act="pay">Pay by QR</button></div>`
        : `<h3>Your bag</h3><p class="empty">Empty. Pick something and tap <b>Add</b>.</p>`;
    } else if (stage === "pay") {
      const qr = cfg.paymentQr
        ? `<img src="${esc(cfg.paymentQr)}" alt="Payment QR for ${esc(cfg.payee)}">`
        : demoQr();
      box.innerHTML = `
        <h3>Scan to pay</h3>
        <p class="pay-amount">${money(total())}</p>
        <div class="qr-box">${qr}</div>
        <p class="payee">${esc(cfg.payee)}</p>
        <div class="btn-row">
          <button type="button" class="btn quiet" data-act="back">Back</button>
          <button type="button" class="btn main" data-act="paid">I’ve paid</button>
        </div>`;
    } else {
      const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      box.innerHTML = `
        <p class="card-kicker">Show this at the counter</p>
        <p class="card-number">#${orderNo}</p>
        <ul class="card-items">${bag.map((it) => `
          <li><span class="big">${it.qty > 1 ? `${it.qty} × ` : ""}${esc(it.name)}</span><small>${esc(it.plain)}</small></li>`).join("")}
        </ul>
        <p class="card-meta">Paid by QR · ${money(total())} · ${time}</p>
        <p class="card-meta">Doesn’t fit? Bring it back with this number. No questions asked.</p>
        <div class="btn-row"><button type="button" class="btn" data-act="new">Shop again</button></div>`;
    }
    $("#addBtn").title = stage === "order" ? "" : "Finish this order first";
    refresh();
  }

  let orderNo = "00";
  $("#summary").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { bag.splice(+rm.dataset.remove, 1); render(); return; }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    if (act === "pay") { stage = "pay"; peekSay("…I won't look. promise."); }
    if (act === "back") stage = "order";
    if (act === "paid") {
      stage = "card";
      orderNo = String(nextOrderNo()).padStart(2, "0");
      peekSay("th-thank you… it's folded and ready.");
    }
    if (act === "new") { stage = "order"; bag = []; }
    render();
    $("#summary").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  function nextOrderNo() {
    try {
      const n = (parseInt(localStorage.getItem("monochrome-order-no"), 10) || 0) % 99 + 1;
      localStorage.setItem("monochrome-order-no", String(n));
      return n;
    } catch {
      return Math.floor(Math.random() * 99) + 1;
    }
  }

  function demoQr() {
    // Decorative placeholder only — not scannable.
    const n = 25, c = 4;
    let seed = 11;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const finder = (x, y) => `
      <rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}"/>
      <rect x="${(x + 1) * c}" y="${(y + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#fff"/>
      <rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}"/>`;
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    let cells = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (!inFinder(x, y) && rnd() > 0.5) cells += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}"/>`;
    return `<svg viewBox="0 0 ${n * c} ${n * c}" aria-label="Demo QR code">${cells}
      ${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>
      <p class="qr-demo">Demo QR · set <code>paymentQr</code> in config.js</p>`;
  }

  // ── Mio peeking over the bag card (only once assets/peek.jpg exists) ──
  const PEEK_LINES = ["…that'll look nice on you.", "…good choice.", "ooh. cantik.", "okay… noted.", "…I have that one too."];
  const peek = $("#peek"), peekImg = $("#peekImg"), peekBubble = $("#peekBubble");
  peekImg.addEventListener("load", () => peek.classList.add("ready"));
  peekImg.addEventListener("error", () => peek.remove());
  peekImg.src = `${cfg.art.folder}peek${cfg.art.ext}`;

  // She rises when the shop section scrolls into view.
  new IntersectionObserver(([e]) => peek.classList.toggle("up", e.isIntersecting), { threshold: 0.25 })
    .observe($("#order"));

  let peekTimer;
  function peekSay(text) {
    if (!peek.isConnected || !peek.classList.contains("ready")) return;
    peekBubble.textContent = text;
    peekBubble.classList.add("show");
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => peekBubble.classList.remove("show"), 2200);
  }

  $("#brand").textContent = cfg.shopName;
  document.title = cfg.shopName;
  refresh();
  render();

  window.Shop = { cfg, describe, money, prefill, setParts };
})();
