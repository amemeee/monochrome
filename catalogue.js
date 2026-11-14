// The shop section on the home page: product cards + quick view, the bag card (bag -> pay -> post), and Mio peeking.
// Common helpers, saved orders and the receipt modal live in shared.js.
(() => {
  "use strict";

  const { cfg, ART, SHIP, $, esc, byId, money, calm, rememberOrder, showReceipt, goTrack, setBagCount, BAG_KEY } = window.Mono;

  // Garment outlines, 48×48. Filled with the chosen colour; used until there's drawn art.
  const ICONS = {
    tee:    `<path d="M17 6 9 10 3 19l7 4 3-3v22h22V20l3 3 7-4-6-9-8-4c-2 4-12 4-14 0Z"/>`,
    shirt:  `<path d="M18 5 10 9 5 41l6 1 3-20v22h20V22l3 20 6-1-5-32-8-4-6 7Z"/><path d="m18 5 6 7 6-7M24 12v32" fill="none"/>`,
    hoodie: `<path d="M16 10c2-8 14-8 16 0l8 3 5 28-6 1-4-18v20H13V24L9 42l-6-1 5-28Z"/><path d="M19 11c2 5 8 5 10 0M18 33h12l-2 6h-8Z" fill="none"/>`,
    pants:  `<path d="M12 4h24l5 40H29L24 17l-5 27H7Z"/><path d="M12 9h24" fill="none"/>`,
  };
  const svg = (icon, fill) =>
    `<svg viewBox="0 0 48 48" class="garment" style="--fill:${fill}">${ICONS[icon] || ICONS.tee}</svg>`;

  // ── Catalogue data ──
  const products = cfg.products.filter((p) => !p.hidden).map((p, i) => {
    const item = byId(cfg.items, p.garment);
    const q = { fit: "regular", print: "plain", sex: "unisex", colours: cfg.colours.map((c) => c.id), ...p, rank: i, item };
    q.price = p.price ?? item.price + byId(cfg.prints, q.print).price;
    return q;
  });

  const noteFor = (p) => [
    p.item.note,
    p.fit !== "regular" ? `${byId(cfg.fits, p.fit).name.toLowerCase()}, ${byId(cfg.fits, p.fit).note}` : "",
    p.print !== "plain" ? `${byId(cfg.prints, p.print).name.toLowerCase()} ${byId(cfg.prints, p.print).note}` : "",
  ].filter(Boolean).join(" · ");

  // A piece from Mio ({ garment, colour, fit, print }) or from a card ({ product, colour, size }).
  function findProduct(piece) {
    return byId(products, piece.product)
      || products.find((p) => p.garment === piece.garment && p.fit === (piece.fit || "regular") && p.print === (piece.print || "plain"))
      || products.find((p) => p.garment === piece.garment)
      || products[0];
  }

  let prefSize = "M";   // last size picked (or set by Mio's size help on the assistant page)
  try { const sv = localStorage.getItem("monochrome-size"); if (byId(cfg.sizes, sv)) prefSize = sv; } catch { /* private mode */ }

  function describe(piece) {
    const p = findProduct(piece);
    const colourId = p.colours.includes(piece.colour) ? piece.colour : p.colours[0];
    const size = piece.size || prefSize;
    const colour = byId(cfg.colours, colourId);
    return {
      piece: { product: p.id, colour: colourId, size },
      key: [p.id, colourId, size].join("|"),
      name: `${colour.name} ${p.name}`,
      plain: `Size ${size}`,
      price: p.price,
      icon: p.item.icon,
      hex: colour.hex,
    };
  }

  // ── Art: try drawn pictures, fall back to the garment icon ──
  const probes = new Map();
  const probe = (url) => {
    if (!probes.has(url)) probes.set(url, new Promise((ok) => {
      const im = new Image();
      im.onload = () => ok(true);
      im.onerror = () => ok(false);
      im.src = url;
    }));
    return probes.get(url);
  };
  // Returns { url } for art drawn in this colour, { url, recolour: true } for the same product
  // drawn in another colour (we tint the garment), or null.
  async function findArt(model, p, colour) {
    const dir = `${ART.wear}${model}/`;
    const file = (name) => `${dir}${name}${ART.ext}`;
    if (await probe(file(`${p.id}-${colour}`))) return { url: file(`${p.id}-${colour}`) };
    for (const other of p.colours) {
      if (other !== colour && await probe(file(`${p.id}-${other}`))) return { url: file(`${p.id}-${other}`), recolour: true };
    }
    for (const name of [p.id, `${p.garment}-${colour}`, p.garment]) {
      if (await probe(file(name))) return { url: file(name) };
    }
    return null;
  }

  // ── Recolour: art drawn in one colour is tinted to the chosen one ──
  // Finds the garment by flood-filling from a point on the torso, keeps its folds and
  // screentone, and shifts its tone. Skin, hair and outlines are left alone.
  const SEED = [0.42, 0.6];     // where on the picture (x, y) is garment
  const tinted = new Map();
  function recolour(url, hex, at = SEED) {
    const key = `${url}|${hex}|${at}`;
    if (!tinted.has(key)) tinted.set(key, new Promise((ok) => {
      const im = new Image();
      im.onload = () => { try { ok(tint(im, hex, at)); } catch { ok(null); } };   // null: unreadable (e.g. file://)
      im.onerror = () => ok(null);
      im.src = url;
    }));
    return tinted.get(key);
  }
  function blur(src, w, h, r) {
    const t = new Float32Array(src.length), o = new Float32Array(src.length), k = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        t[y * w + x] = s / k;
        s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        o[y * w + x] = s / k;
        s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
      }
    }
    return o;
  }
  function erode(m, w, h, r) {
    const a = new Uint8Array(m.length), o = new Uint8Array(m.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 1;
      for (let k = -r; k <= r && v; k++) { const xx = x + k; if (xx < 0 || xx >= w || !m[y * w + xx]) v = 0; }
      a[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 1;
      for (let k = -r; k <= r && v; k++) { const yy = y + k; if (yy < 0 || yy >= h || !a[yy * w + x]) v = 0; }
      o[y * w + x] = v;
    }
    return o;
  }
  function tint(im, hex, at) {
    const sc = Math.min(1, 640 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * sc), h = Math.round(im.naturalHeight * sc), n = w * h;
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(im, 0, 0, w, h);
    const px = cx.getImageData(0, 0, w, h), d = px.data;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2];
    const B = blur(L, w, h, 3);                      // blurred, so screentone dots read as one tone
    const seed = Math.round(h * at[1]) * w + Math.round(w * at[0]);
    const L0 = B[seed];
    if (L0 > 200) return null;                       // a white garment can't be told from the page
    let mask = new Uint8Array(n);
    const stack = [seed];
    mask[seed] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= n || mask[j] || Math.abs(B[j] - L0) > 40) continue;
        mask[j] = 1;
        stack.push(j);
      }
    }
    mask = erode(mask, w, h, 2);                     // leave the outline untouched
    let area = 0;
    for (let i = 0; i < n; i++) area += mask[i];
    if (area < n * 0.04 || area > n * 0.7) return null;
    const rgb = hex.replace("#", "").match(/../g).map((v) => parseInt(v, 16));
    const T = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    const s = T < 110 ? 0.6 : -0.8;                  // dark target: folds lighter; light target: folds darker
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      const v = Math.max(0, Math.min(255, T + (L[i] - L0) * s));
      d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v;
    }
    cx.putImageData(px, 0, 0);
    return cv.toDataURL("image/jpeg", 0.9);
  }

  // Male pieces are always worn by a male model, female by a female one; unisex follows "Worn by".
  const modelFor = (p) => (p.sex !== "unisex" && cfg.models.find((m) => m.sex === p.sex)?.id) || model;
  function paint(el, p, colour) {
    const who = modelFor(p);
    const key = `${who}|${p.id}|${colour}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.classList.remove("has-art");
    const hex = byId(cfg.colours, colour).hex;
    el.innerHTML = svg(p.item.icon, hex);
    findArt(who, p, colour).then(async (art) => {
      if (!art || el.dataset.key !== key) return;
      const url = art.recolour ? await recolour(art.url, hex, p.seed) : art.url;
      if (!url || el.dataset.key !== key) return;   // can't recolour: keep the drawn icon
      el.innerHTML = `<img src="${esc(url)}" alt="" decoding="async">`;
      el.classList.add("has-art");
    });
  }

  // ── Toolbar: category tabs, worn by, sort ──
  let category = "all";
  let sort = "featured";
  let model = cfg.models[0].id;
  const cardColour = new Map(products.map((p) => [p.id, p.colours[0]]));

  const tabs = [{ id: "all", name: "All" }, ...cfg.items.filter((it) => products.some((p) => p.garment === it.id)).map((it) => ({ id: it.id, name: it.plural || it.name }))];
  $("#tabs").innerHTML = tabs.map((t) => {
    const n = t.id === "all" ? products.length : products.filter((p) => p.garment === t.id).length;
    return `<button type="button" class="tab" data-cat="${t.id}" aria-pressed="${t.id === category}">${esc(t.name)} <small>${n}</small></button>`;
  }).join("");
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    category = b.dataset.cat;
    page = 1;
    $("#tabs").querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderGrid();
  });

  const modelButtons = () => cfg.models.map((m) =>
    `<button type="button" data-model="${m.id}" aria-pressed="${m.id === model}">${esc(m.name)}</button>`).join("");
  $("#worn").innerHTML = modelButtons();
  function setModel(id) {
    model = id;
    document.querySelectorAll("[data-model]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.model === id));
    $("#products").querySelectorAll(".card").forEach((c) => paint(c.querySelector(".art"), byId(products, c.dataset.id), cardColour.get(c.dataset.id)));
    if (qv) paint(dlg.querySelector(".art"), qv.p, qv.colour);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-model]");
    if (b) setModel(b.dataset.model);
  });

  $("#sort").addEventListener("change", (e) => { sort = e.target.value; page = 1; renderGrid(); });

  // ── Product grid ──
  const grid = $("#products");

  function card(p) {
    return `
      <article class="card" id="p-${p.id}" data-id="${p.id}">
        <button type="button" class="card-img" data-open aria-label="View ${esc(p.name)}">
          <span class="art"></span>
          ${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ""}
        </button>
        <div class="card-body">
          <h3 class="card-name"><button type="button" data-open>${esc(p.name)}</button></h3>
          <p class="card-price">${money(p.price)}</p>
          <p class="card-note">${esc(noteFor(p))}</p>
        </div>
      </article>`;
  }

  const PER_PAGE = +document.body.dataset.perPage || cfg.perPage || 6;
  let page = 1;

  function listed() {
    let list = products.filter((p) => category === "all" || p.garment === category);
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price || a.rank - b.rank);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price || a.rank - b.rank);
    return list;
  }

  function renderGrid() {
    const list = listed();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    page = Math.min(Math.max(1, page), pages);
    const from = (page - 1) * PER_PAGE;
    const shown = list.slice(from, from + PER_PAGE);
    grid.innerHTML = shown.map(card).join("");
    grid.querySelectorAll(".card").forEach((c) => paint(c.querySelector(".art"), byId(products, c.dataset.id), cardColour.get(c.dataset.id)));
    $("#count").textContent = list.length
      ? `${from + 1}–${from + shown.length} of ${list.length} pieces`
      : "Nothing here.";

    const nums = Array.from({ length: pages }, (_, i) => i + 1);
    $("#pager").hidden = pages < 2;
    $("#pager").innerHTML = `
      <button type="button" class="page-btn" data-page="${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="Previous page">‹ Prev</button>
      ${nums.map((n) => `<button type="button" class="page-btn num" data-page="${n}" aria-label="Page ${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`).join("")}
      <button type="button" class="page-btn" data-page="${page + 1}" ${page === pages ? "disabled" : ""} aria-label="Next page">Next ›</button>`;
  }

  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    page = +b.dataset.page;
    renderGrid();
    $("#tabs").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
  });

  function setCardColour(id, colour) {
    cardColour.set(id, colour);
    const c = document.getElementById(`p-${id}`);
    if (!c) return;
    c.querySelectorAll("[data-colour]").forEach((d) => d.setAttribute("aria-pressed", d.dataset.colour === colour));
    paint(c.querySelector(".art"), byId(products, id), colour);
  }

  grid.addEventListener("click", (e) => {
    const c = e.target.closest(".card");
    if (!c) return;
    if (e.target.closest("[data-open]")) openQuick(c.dataset.id);
  });
  // ── Quick view: size, quantity, add ──
  const dlg = $("#quick");
  let qv = null;   // { p, colour, size, qty }

  const chip = (name, value, inner, checked) => `
    <label class="chip">
      <input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>
      <span>${inner}</span>
    </label>`;

  function openQuick(id, preset = {}) {
    const p = byId(products, id);
    const colour = p.colours.includes(preset.colour) ? preset.colour : cardColour.get(id);
    qv = { p, colour, size: prefSize, qty: 1 };
    const m = p.item.measure;
    dlg.innerHTML = `
      <div class="qv">
        <div class="qv-img">
          <span class="art"></span>
          ${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ""}
          <div class="qv-worn" role="group" aria-label="Worn by"><span>Worn by</span>${modelButtons()}</div>
        </div>
        <div class="qv-info">
          <button type="button" class="qv-close" data-close aria-label="Close">×</button>
          <p class="qv-kicker">${esc(p.item.name)}</p>
          <h3 id="qvTitle">${esc(p.name)}</h3>
          <p class="qv-price">${money(p.price)}</p>
          <p class="qv-note">${esc(noteFor(p))}</p>
          <fieldset>
            <legend>Size</legend>
            <div class="chips sizes">${cfg.sizes.map((s) =>
              chip("qvSize", s.id, `<b>${esc(s.id)}</b><small>${m} ${s[m]}</small>`, s.id === prefSize)).join("")}</div>
            <p class="hint">Body ${m} in cm. Between sizes? Pick an oversized piece instead of sizing up.</p>
          </fieldset>
          <div class="qv-add">
            <div class="qty" role="group" aria-label="Quantity">
              <button type="button" data-qty="-1" aria-label="One less">−</button>
              <output aria-live="polite" data-qty-out>1</output>
              <button type="button" data-qty="1" aria-label="One more">+</button>
            </div>
            <button type="button" class="btn main" data-add></button>
          </div>
          <p class="hint" data-locked hidden>Finish paying for your bag first.</p>
        </div>
      </div>`;
    updateQuick();
    dlg.showModal();
  }

  function updateQuick() {
    const { p, colour, qty } = qv;
    paint(dlg.querySelector(".art"), p, colour);
    dlg.querySelector("[data-qty-out]").textContent = qty;
    const add = dlg.querySelector("[data-add]");
    add.textContent = `Add to bag · ${money(p.price * qty)}`;
    add.disabled = stage !== "order";
    dlg.querySelector("[data-locked]").hidden = stage === "order";
  }

  dlg.addEventListener("change", (e) => {
    if (e.target.name === "qvSize") { qv.size = prefSize = e.target.value; }
    updateQuick();
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) return dlg.close();   // backdrop or ×
    const q = e.target.closest("[data-qty]");
    if (q) { qv.qty = Math.min(10, Math.max(1, qv.qty + +q.dataset.qty)); updateQuick(); }
    if (e.target.closest("[data-add]")) addToBag();
  });
  dlg.addEventListener("close", () => { qv = null; });

  function addToBag() {
    if (stage !== "order") return;
    const info = describe({ product: qv.p.id, colour: qv.colour, size: qv.size });
    const same = bag.find((it) => it.key === info.key);
    if (same) same.qty += qv.qty; else bag.push({ ...info, qty: qv.qty });
    dlg.close();
    render();
    bump();
    peekSay(PEEK_LINES[Math.floor(Math.random() * PEEK_LINES.length)]);
  }

  // Mio's pick from section 1 → show its card, then open it with her colour.
  function prefill(piece) {
    const p = findProduct(piece);
    if (p.colours.includes(piece.colour)) cardColour.set(p.id, piece.colour);
    if (category !== "all" && category !== p.garment) {
      category = "all";
      $("#tabs").querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.cat === "all"));
    }
    page = Math.floor(listed().indexOf(p) / PER_PAGE) + 1;   // jump to the page her pick is on
    renderGrid();
    const el = document.getElementById(`p-${p.id}`);
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    el.classList.add("flash");
    setTimeout(() => { el.classList.remove("flash"); openQuick(p.id, piece); }, calm ? 0 : 750);
  }

  // Set preferences without scrolling (e.g. the size from her size help).
  function setParts(parts) {
    if (parts.size) prefSize = parts.size;
  }

  // ── Bag card: bag → pay → pickup card ──
  let bag = [];
  let ship = null;       // posting details, filled in after paying
  let stage = "order";   // order → pay → ship → card
  const total = () => bag.reduce((s, it) => s + it.price * it.qty, 0);
  const count = () => bag.reduce((s, it) => s + it.qty, 0);

  function bump() {
    const b = $("#navBag");
    b.classList.remove("bump");
    void b.offsetWidth;
    b.classList.add("bump");
  }

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
        : `<h3>Your bag</h3><p class="empty">Empty. Tap a piece and <b>Add to bag</b>.</p>`;
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
    } else if (stage === "ship") {
      box.innerHTML = `
        <h3>Where should we post it?</h3>
        <p class="ship-note">Paid ${money(total())}. Thank you. We just need your details.</p>
        <form class="ship-form" data-ship>
          <label>Full name<input name="name" autocomplete="name" required maxlength="80"></label>
          <label>Phone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="012-345 6789"></label>
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="100"></label>
          <label>Address<input name="line1" autocomplete="address-line1" required maxlength="120" placeholder="Unit, street"></label>
          <label>Address 2 <small>(optional)</small><input name="line2" autocomplete="address-line2" maxlength="120"></label>
          <div class="row2">
            <label>Postcode<input name="postcode" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{5}" maxlength="5" placeholder="50450"></label>
            <label>City<input name="city" autocomplete="address-level2" required maxlength="60"></label>
          </div>
          <label>State<select name="state" autocomplete="address-level1" required>
            <option value="">Choose…</option>${(SHIP.states || []).map((s) => `<option>${esc(s)}</option>`).join("")}
          </select></label>
          <label>Note <small>(optional)</small><textarea name="note" rows="2" maxlength="200" placeholder="Leave at the guardhouse, etc."></textarea></label>
          <p class="ship-error" role="alert" hidden></p>
          <div class="btn-row"><button type="submit" class="btn main">Confirm order</button></div>
        </form>`;
    } else {
      const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const to = ship && [ship.name, ship.line1, ship.line2, `${ship.postcode} ${ship.city}`, ship.state].filter(Boolean).join(", ");
      box.innerHTML = `
        <p class="card-kicker">Order confirmed · tracking code</p>
        <p class="card-number">${esc(orderNo)}</p>
        <ul class="card-items">${bag.map((it) => `
          <li><span class="big">${it.qty > 1 ? `${it.qty} × ` : ""}${esc(it.name)}</span><small>${esc(it.plain)}</small></li>`).join("")}
        </ul>
        ${to ? `<p class="card-meta"><b>Posting to</b><br>${esc(to)}</p>` : ""}
        <p class="card-meta">Paid by QR · ${money(total())} · ${time}</p>
        ${SHIP.note ? `<p class="card-meta">${esc(SHIP.note)}</p>` : ""}
        ${ship?.email ? `<p class="card-meta">We’ll also email this code to ${esc(ship.email)}.</p>` : ""}
        <p class="card-meta">Doesn’t fit? Send it back with this code. No questions asked.</p>
        <div class="btn-row">
          <button type="button" class="btn" data-act="new">Shop again</button>
          <button type="button" class="btn main" data-act="track">Track it</button>
        </div>`;
    }
    setBagCount(count());
    saveBag();
  }

  let orderNo = "00";

  // Keep the bag (and the step) across a refresh, so someone who has paid isn't left with
  // nothing before they've given an address. Only product / colour / size / qty: no personal data.
  function saveBag() {
    try {
      if (!bag.length || stage === "card") return localStorage.removeItem(BAG_KEY);
      localStorage.setItem(BAG_KEY, JSON.stringify({ stage, orderNo, items: bag.map((it) => ({ piece: it.piece, qty: it.qty })) }));
    } catch { /* private mode */ }
  }
  function restoreBag() {
    try {
      const d = JSON.parse(localStorage.getItem(BAG_KEY));
      if (!d || !["order", "pay", "ship"].includes(d.stage) || !Array.isArray(d.items)) return;
      for (const { piece, qty } of d.items) {
        const p = piece && byId(products, piece.product);
        const n = Math.floor(+qty);
        // Rebuilt from the catalogue, so prices are always today's, never whatever was stored.
        if (!p || !p.colours.includes(piece.colour) || !byId(cfg.sizes, piece.size) || !(n >= 1 && n <= 10)) continue;
        const info = describe(piece);
        const same = bag.find((it) => it.key === info.key);
        if (same) same.qty = Math.min(10, same.qty + n); else bag.push({ ...info, qty: n });
      }
      if (!bag.length) return;
      stage = d.stage;
      if (stage === "ship" && /^\d{4}-[A-Z0-9]{4}$/.test(d.orderNo)) orderNo = d.orderNo;
      else if (stage === "ship") stage = "pay";   // no valid order number: back to the QR step
    } catch { /* ignore a corrupt save */ }
  }
  $("#summary").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { bag.splice(+rm.dataset.remove, 1); render(); return; }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    if (act === "pay") { stage = "pay"; peekSay("…I won't look. promise."); }
    if (act === "back") stage = "order";
    if (act === "paid") {
      stage = "ship";   // next: where to post it
      orderNo = makeCode();
      peekSay("th-thank you… where should I send it?");
    }
    if (act === "new") { stage = "order"; bag = []; ship = null; }
    if (act === "track") return goTrack(orderNo);
    render();
    $("#summary").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // Posting details form → order card. Sent to cfg.shipping.endpoint if there is one.
  $("#summary").addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-ship]");
    if (!form) return;
    e.preventDefault();
    const d = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
    const err = form.querySelector(".ship-error");
    const btn = form.querySelector("[type=submit]");
    const fail = (msg) => { err.textContent = msg; err.hidden = false; btn.disabled = false; btn.textContent = "Confirm order"; };
    const missing = ["name", "phone", "email", "line1", "postcode", "city", "state"].find((k) => !d[k]);
    if (missing) return fail("Please fill in every required field.");   // spaces alone don't count
    if (!/^\d{5}$/.test(d.postcode)) return fail("Postcode should be 5 digits.");
    const digits = d.phone.replace(/\D/g, "").length;
    if (digits < 8 || digits > 14) return fail("That phone number looks off. Check it?");
    btn.disabled = true;
    btn.textContent = "Sending…";
    err.hidden = true;
    if (SHIP.endpoint) {
      try {
        const r = await fetch(SHIP.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          signal: AbortSignal.timeout(15000),   // don't hang on "Sending…" forever
          body: JSON.stringify({
            order: orderNo, total: total(), currency: cfg.currency,
            items: bag.map((it) => ({ name: it.name, detail: it.plain, qty: it.qty, price: it.price })),
            ship: d,
          }),
        });
        if (!r.ok) throw new Error(r.status);
      } catch {
        return fail("Couldn’t send your details. Check your connection and try again.");
      }
    }
    ship = d;
    const order = { code: orderNo, at: Date.now(), total: total(), ship: d,
                    items: bag.map((it) => ({ name: it.name, plain: it.plain, qty: it.qty, price: it.price })) };
    rememberOrder(order);
    stage = "card";
    peekSay("…it's on its way. almost.");
    render();
    showReceipt(order);
  });


  // Order number = tracking code, e.g. 1311-K7QP (day + month, then 4 random characters without
  // look-alikes like 0/O or 1/I).
  function makeCode() {
    const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const r = crypto.getRandomValues(new Uint8Array(4));
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}-${[...r].map((n) => abc[n % abc.length]).join("")}`;
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
      <p class="qr-demo">Online transfer coming soon</p>`;
  }

  // ── Mio peeking over the bag card (only once assets/mio/peek.jpg exists) ──
  const PEEK_LINES = ["…that'll look nice on you.", "…good choice.", "ooh. cantik.", "okay… noted.", "…I have that one too."];
  const peek = $("#peek"), peekImg = $("#peekImg"), peekBubble = $("#peekBubble");
  peekImg.addEventListener("load", () => peek.classList.add("ready"));
  peekImg.addEventListener("error", () => peek.remove());
  peekImg.src = `${ART.mio}peek${ART.ext}`;

  // She rises when the shop section scrolls into view.
  new IntersectionObserver(([e]) => peek.classList.toggle("up", e.isIntersecting), { threshold: 0.1 })
    .observe($("#order"));

  let peekTimer;
  function peekSay(text) {
    if (!peek.isConnected || !peek.classList.contains("ready")) return;
    peekBubble.textContent = text;
    peekBubble.classList.add("show");
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => peekBubble.classList.remove("show"), 2200);
  }

  restoreBag();
  renderGrid();
  render();

  // Sent here by Mio or Ren's pick: catalogue.html?pick={"garment":"hoodie",...}
  const picked = new URLSearchParams(location.search).get("pick");
  if (picked) {
    history.replaceState(null, "", location.pathname + location.hash);
    try {
      const piece = JSON.parse(picked);
      if (piece && typeof piece === "object") setTimeout(() => prefill(piece), 300);
    } catch { /* ignore a bad link */ }
  }

  window.Shop = { cfg, describe, money, prefill, setParts };
})();
