// Section 1: Mio, the shy shopkeeper, runs the shop.
// Poses, blinking, a typing speech bubble, reply buttons, pokes.
// ── Her lines are near the top. Edit freely. *stars* make a word bold. ──
(() => {
  "use strict";

  const S = window.Shop;
  const ART = S.cfg.art;
  const POSES = ["idle", "waiting", "greet", "ask", "think", "happy", "flustered", "suggest"];
  // Poses without art yet fall back to one that exists.
  const FALLBACK = { suggest: "ask" };

  const TYPE_MS = 26;       // per character while she "types"
  const AUTO_MS = 1500;     // pause after a line that continues by itself (plus reading time)
  const IDLE_MS = 20000;    // unanswered question → "take your time", then she goes idle

  const h = new Date().getHours();
  const HELLO =
    h < 5  ? "…oh. shopping this late? h-hi. I'm *Mio*." :
    h < 12 ? "…good morning. I'm *Mio*. welcome to *Monochrome*." :
    h < 19 ? "…h-hi. I'm *Mio*. welcome to *Monochrome*." :
             "…good evening. I'm *Mio*. still open, don't worry.";

  const MENU = [
    { label: "What's good?", go: "good" },
    { label: "What is this place?", go: "place" },
    { label: "Help me find my size", go: "size" },
    { label: "I'll just browse", go: "order", kind: "main" },
  ];

  // Each step: t = line, pose, then ONE of:
  //   next: step that follows by itself   options: reply buttons   pick: a piece she suggests
  //   go: "#section" to scroll to         end: stop talking
  const STEPS = {
    hello:   { t: HELLO, pose: "greet", next: "ask" },
    ask:     { t: "…are you looking for something?", pose: "waiting", options: MENU },
    again:   { t: "anything else… you want to know?", pose: "waiting", options: MENU },

    // What is this place
    place:   { t: "it's a small clothes shop… everything in black, white and grey.", pose: "idle", next: "place2" },
    place2:  { t: "no colours to match. everything goes with everything.", pose: "ask", next: "place3" },
    place3:  { t: "pick what you like, pay by QR, show your number. it's already folded in a bag.", pose: "ask", next: "place4" },
    place4:  { t: "doesn't fit? bring it back with the number. I won't ask why. promise.", pose: "happy", next: "again" },

    // Her pick: two quick questions
    good:    { t: "hmm… for going out, or staying home?", pose: "think",
               options: [{ label: "Going out", go: "goodOut" }, { label: "Staying home", go: "goodHome" }] },
    goodOut:  { t: "and… do you want people to notice you?", pose: "think",
                options: [{ label: "A little", go: "sugOutSeen" }, { label: "Please no", go: "sugOutHide" }] },
    goodHome: { t: "warm… or cool?", pose: "think",
                options: [{ label: "Warm", go: "sugHomeWarm" }, { label: "Cool", go: "sugHomeCool" }] },
    sugOutSeen:  { t: "then… a *white Shirt*. clean. you'll look like you have plans.", pose: "suggest",
                   pick: { garment: "shirt", colour: "paper", fit: "regular", print: "plain" } },
    sugOutHide:  { t: "then… an *oversized black Hoodie*. hood up. nobody will know it's you.", pose: "suggest",
                   pick: { garment: "hoodie", colour: "ink", fit: "oversized", print: "plain" } },
    sugHomeWarm: { t: "then… a *charcoal Hoodie* with *just browsing* on the back. …I have one.", pose: "suggest",
                   pick: { garment: "hoodie", colour: "charcoal", fit: "regular", print: "back" } },
    sugHomeCool: { t: "then… an *oversized grey Tee*. I sleep in mine.", pose: "suggest",
                   pick: { garment: "tee", colour: "stone", fit: "oversized", print: "plain" } },
    take:    { t: "okay… I filled it in for you. just scroll down.", pose: "happy", go: "#order" },
    notThat: { t: "o-okay… maybe something else?", pose: "flustered", next: "again" },

    // Size help (sizeXS…sizeXL are added below from config.js)
    size:    { t: "measure around your chest… right under the arms. roughly is fine.", pose: "ask", next: "size2" },
    size2:   { t: "so… about how many cm?", pose: "think", options: [] },
    noTape:  { t: "…no tape? lay your favourite tee flat, measure armpit to armpit, and double it.", pose: "ask", next: "size2" },
    size3:   { t: "if you like it loose… pick *Oversized*. don't size up. it hangs nicer.", pose: "ask", next: "again" },

    order:   { t: "okay… I'll leave you alone. the rack is right below.", pose: "happy", go: "#order" },

    // Back at the top after visiting the shop section
    back:    { t: "…oh. you're back.", pose: "greet", next: "again" },
  };

  // Size buttons from the chest measurements in config.js: each one sets the size below.
  const sizes = S.cfg.sizes;
  STEPS.size2.options = sizes.map((s, i) => {
    const lo = i ? Math.round((sizes[i - 1].chest + s.chest) / 2) : null;
    const hi = i < sizes.length - 1 ? Math.round((s.chest + sizes[i + 1].chest) / 2) : null;
    STEPS["size" + s.id] = { t: `then you're a *${s.id}*… I set it for you below.`, pose: "happy", next: "size3" };
    return {
      label: lo == null ? `Under ${hi} cm` : hi == null ? `Over ${lo} cm` : `${lo}–${hi} cm`,
      go: "size" + s.id,
      act: () => S.setParts({ size: s.id }),
    };
  }).concat({ label: "I don't have a tape", go: "noTape" });

  const POKES = ["eep—!", "…I'm not a mannequin.", "p-please just shop…", "s-stop lah…", "…I'm going to hide in the fitting room."];
  const IDLE_LINE = "…take your time. no rush.";

  // ── Plumbing ──
  const $ = (s) => document.querySelector(s);
  const mio = $("#mio"), img = $("#mioImg"), blinkImg = $("#mioBlink");
  const bubble = $("#bubble"), textEl = $("#bubbleText"), live = $("#bubbleLive"), choicesEl = $("#choices");
  const talkBtn = $("#talkBtn");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const src = (pose, blink) => `${ART.folder}${pose}${blink ? "-blink" : ""}${ART.ext}`;
  const plain = (t) => t.replace(/\*/g, "");
  const rich = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))
                       .replace(/\*(.+?)\*/g, "<em>$1</em>");

  POSES.forEach((p) => { new Image().src = src(p); });   // preload so swaps don't flicker

  let pose = null;
  function setPose(p) {
    if (p === pose) return;
    pose = p;
    mio.classList.remove("can-blink", "pop");
    void mio.offsetWidth;
    mio.classList.add("pop");
    img.src = src(p);
    blinkImg.src = src(p, true);
  }
  img.addEventListener("error", () => {   // no art for this pose yet → use its stand-in
    const alt = FALLBACK[pose];
    if (alt && !img.src.endsWith(src(alt))) { img.src = src(alt); blinkImg.src = src(alt, true); }
  });
  blinkImg.addEventListener("load", () => mio.classList.add("can-blink"));     // blink only if a -blink frame exists
  blinkImg.addEventListener("error", () => mio.classList.remove("can-blink"));
  if (!calm) (function blink() {
    mio.classList.add("blinking");
    setTimeout(() => mio.classList.remove("blinking"), 130);
    setTimeout(blink, 2500 + Math.random() * 3000);
  })();

  // ── Talking ──
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  let typeTimer = null, shown = { text: "", pose: "idle" };

  let skipTyping = null;
  function type(text, done) {
    clearInterval(typeTimer);
    live.textContent = plain(text);
    const finish = () => {
      clearInterval(typeTimer);
      bubble.classList.remove("typing");
      textEl.innerHTML = rich(text);
      typeTimer = null;
      done && done();
    };
    if (calm) return finish();
    const flat = plain(text);
    let i = 0;
    bubble.classList.add("typing");
    textEl.textContent = "";
    typeTimer = setInterval(() => {
      textEl.textContent = flat.slice(0, ++i);
      if (i >= flat.length) finish();
    }, TYPE_MS);
    skipTyping = finish;
  }
  bubble.addEventListener("click", (e) => {
    if (typeTimer && !e.target.closest(".choice")) skipTyping();
  });

  function play(id) {
    const s = STEPS[id];
    if (!s) return;
    clearTimers();
    resting = false;
    if (s.options || s.pick) lastAsk = id;   // "Talk to Mio" picks up from here
    talkBtn.hidden = true;
    choicesEl.innerHTML = "";
    bubble.classList.add("show");
    setPose(s.pose);
    shown = { text: s.t, pose: s.pose };
    type(s.t, () => {
      if (s.next) later(() => play(s.next), AUTO_MS + plain(s.t).length * 25);
      else if (s.options) offer(s.options);
      else if (s.pick) offerPick(s.pick);
      else if (s.go) later(() => goTo(s.go), 900);
      else if (s.end) later(rest, 2500);
    });
  }

  function offer(options) {
    choicesEl.innerHTML = options.map((o, i) => `
      <button type="button" class="choice ${o.kind || ""}" data-i="${i}" style="animation-delay:${i * 50}ms">${rich(o.label)}</button>`).join("");
    choicesEl.onclick = (e) => {
      const b = e.target.closest(".choice");
      if (!b) return;
      const o = options[+b.dataset.i];
      choicesEl.onclick = null;
      if (o.act) o.act();
      play(o.go);
    };
    // Nobody answers: one gentle nudge, then she goes idle until someone talks to her
    later(() => {
      aside(IDLE_LINE, "waiting", 2600);
      later(rest, 2500);
    }, IDLE_MS);
  }

  function offerPick(piece) {
    const info = S.describe(piece);
    offer([
      { label: `I'll take that · ${S.money(info.price)}`, kind: "main", go: "take", act: () => S.prefill(piece) },
      { label: "Something else", go: "notThat" },
    ]);
  }

  // Scroll to the shop section; she rests until the visitor comes back up.
  function goTo(hash) {
    lastAsk = null;   // she finished; next time she asks "anything else?"
    document.querySelector(hash).scrollIntoView({ behavior: calm ? "auto" : "smooth" });
    later(rest, 1200);
  }

  function rest() {
    clearTimers();
    choicesEl.innerHTML = "";
    bubble.classList.remove("show");
    setPose("idle");
    talkBtn.hidden = false;
    resting = true;
  }
  let resting = false, lastAsk = null;
  talkBtn.addEventListener("click", () => play(lastAsk || "again"));

  // When the visitor scrolls back up to her after leaving, she notices.
  let leftHero = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { leftHero = true; return; }
    if (leftHero && resting) { leftHero = false; play("back"); }
  }, { threshold: 0.6 }).observe($("#hero"));

  // A quick aside (poke, idle nudge) that returns to what she was saying.
  let asideTimer;
  function aside(text, p, ms) {
    if (typeTimer) skipTyping();
    const back = shown;
    setPose(p);
    textEl.innerHTML = rich(text);
    live.textContent = plain(text);
    bubble.classList.add("show");
    clearTimeout(asideTimer);
    asideTimer = setTimeout(() => {
      if (resting) { bubble.classList.remove("show"); setPose("idle"); return; }
      setPose(back.pose);
      textEl.innerHTML = rich(back.text);
      live.textContent = plain(back.text);
    }, ms);
  }

  let pokes = 0;
  mio.addEventListener("click", () => aside(POKES[Math.min(pokes++, POKES.length - 1)], "flustered", 1800));

  setPose("idle");
  later(() => play("hello"), calm ? 0 : 900);
})();
