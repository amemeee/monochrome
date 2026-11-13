// Section 1: the shopkeepers. Visitors choose who to talk to: Mio (shy, leads by default) or Ren
// (deadpan). Whoever you pick talks in the big bubble with reply buttons; the other chimes in.
// Poses, blinking, a typing speech bubble, reply buttons, pokes.
// ── Their lines are near the top. Edit freely. *stars* make a word bold. ──
(() => {
  "use strict";

  const S = window.Shop;
  const ART = S.cfg.art;

  const TYPE_MS = 26;       // per character while they "type"
  const AUTO_MS = 1500;     // pause after a line that continues by itself (plus reading time)
  const IDLE_MS = 20000;    // unanswered question → a gentle nudge, then they go idle
  const SIDE_MS = 3000;     // how long the other one's chime-in stays up

  const h = new Date().getHours();
  const MIO_HELLO =
    h < 5  ? "…oh. shopping this late? h-hi. I'm *Mio*." :
    h < 12 ? "…good morning. I'm *Mio*." :
    h < 19 ? "…h-hi. I'm *Mio*." :
             "…good evening. I'm *Mio*. still open, don't worry.";
  const REN_HELLO =
    h < 5  ? "…you're up late. I'm *Ren*. I fold things." :
    h < 12 ? "…morning. I'm *Ren*. I fold things." :
    h < 19 ? "…hey. I'm *Ren*. I fold things." :
             "…evening. I'm *Ren*. we're still open.";

  // ── MIO's script ──
  // Each step: t = line, pose, then ONE of:
  //   next: step that follows by itself   options: reply buttons   pick: a piece she suggests
  //   go: "#section" to scroll to         end: stop talking
  // side = what the other one says right after (one line or a list, each with delay / ms / pose).
  const menu = () => [
    { label: "What's good?", go: "good" },
    { label: "What is this place?", go: "place" },
    { label: "Help me find my size", go: "size" },
    { label: lead === mio ? "Talk to Ren instead" : "Talk to Mio instead", go: "hello", kind: "swap", act: () => seat(lead === mio ? ren : mio) },
    { label: "I'll just browse", go: "order", kind: "main" },
  ];

  const MIO_STEPS = {
    // The opening: they say "welcome to" together, then Ren says *mono* and Mio says *chrome*.
    // (wait = ms before the next step.) Then, on desktop, you choose who to talk to.
    welcome: { t: "welcome to…", pose: "greet", wait: 2700,
               side: [{ t: "welcome to…", pose: "show", delay: 0, ms: 1500 },
                      { t: "*mono*", pose: "show", delay: 1500, ms: 3000 }],
               next: "chrome" },
    chrome:  { t: "*chrome*.", pose: "happy", wait: 1600, next: "who" },
    who:     { t: "…who would you like to talk to?", pose: "ask",
               side: { t: "…either. I don't mind.", pose: "idle", delay: 700 },
               options: () => [
                 { label: "Mio", go: "hello", act: () => seat(mio) },
                 { label: "Ren", go: "hello", act: () => seat(ren) },
               ] },

    hello:   { t: MIO_HELLO, pose: "greet", next: "ask", side: { t: "…and I'm *Ren*. I fold things.", pose: "show", delay: 700, ms: 3500 } },
    ask:     { t: "…are you looking for something?", pose: "waiting", options: menu },
    again:   { t: "anything else… you want to know?", pose: "waiting", options: menu },

    // What is this place
    place:   { t: "it's a small clothes shop… everything in black, white and grey.", pose: "idle", next: "place2" },
    place2:  { t: "no colours to match. everything goes with everything.", pose: "ask", next: "place3", side: { t: "…I wore colour once. once." } },
    place3:  { t: "tap anything below to see it on us. pay by QR, tell us where to post it. we'll fold it in a bag.", pose: "ask", next: "place4" },
    place4:  { t: "doesn't fit? send it back with your code. I won't ask why. promise.", pose: "happy", next: "again", side: { t: "she means it. she's too shy to ask." } },

    // Her pick: two quick questions
    good:    { t: "hmm… for going out, or staying home?", pose: "think",
               options: [{ label: "Going out", go: "goodOut" }, { label: "Staying home", go: "goodHome" }] },
    goodOut:  { t: "and… do you want people to notice you?", pose: "think",
                options: [{ label: "A little", go: "sugOutSeen" }, { label: "Please no", go: "sugOutHide" }] },
    goodHome: { t: "warm… or cool?", pose: "think",
                options: [{ label: "Warm", go: "sugHomeWarm" }, { label: "Cool", go: "sugHomeCool" }] },
    sugOutSeen:  { t: "then… a *white Shirt*. clean. you'll look like you have plans.", pose: "suggest",
                   pick: { garment: "shirt", colour: "paper", fit: "regular", print: "plain" },
                   side: { t: "…that's what I'm wearing.", pose: "show" } },
    sugOutHide:  { t: "then… an *oversized black Hoodie*. hood up. nobody will know it's you.", pose: "suggest",
                   pick: { garment: "hoodie", colour: "ink", fit: "oversized", print: "plain" },
                   side: { t: "my day-off hoodie. nobody talks to me.", pose: "show" } },
    sugHomeWarm: { t: "then… a *charcoal Hoodie*. soft inside. …I have one.", pose: "suggest",
                   pick: { garment: "hoodie", colour: "charcoal", fit: "regular", print: "plain" },
                   side: { t: "…she never takes it off." } },
    sugHomeCool: { t: "then… an *oversized grey Tee*. I sleep in mine.", pose: "suggest",
                   pick: { garment: "tee", colour: "stone", fit: "oversized", print: "plain" },
                   side: { t: "…too much information, Mio." } },
    take:    { t: "okay… here it is. just pick your size.", pose: "happy", end: true },
    notThat: { t: "o-okay… maybe something else?", pose: "flustered", next: "again", side: { t: "…it was a good pick though." } },

    // Size help (sizeXS…sizeXL are added below from config.js)
    size:    { t: "measure around your chest… right under the arms. roughly is fine.", pose: "ask", next: "size2" },
    size2:   { t: "so… about how many cm?", pose: "think", options: [] },
    noTape:  { t: "…no tape? lay your favourite tee flat, measure armpit to armpit, and double it.", pose: "ask", next: "size2", side: { t: "or just guess. I always do." } },
    size3:   { t: "if you like it loose… pick *Oversized*. don't size up. it hangs nicer.", pose: "ask", next: "again", side: { t: "listen to her. she knows sizes." } },

    order:   { t: "okay… I'll leave you alone. the rack is right below.", pose: "happy", go: "#order", side: { t: "…we'll be here. quietly." } },

    // Back at the top after visiting the shop section
    back:    { t: "…oh. you're back.", pose: "greet", next: "again", side: { t: "told you they'd come back." } },
  };

  // Size buttons from the chest measurements in config.js: each one sets the size below.
  const sizes = S.cfg.sizes;
  MIO_STEPS.size2.options = sizes.map((s, i) => {
    const lo = i ? Math.round((sizes[i - 1].chest + s.chest) / 2) : null;
    const hi = i < sizes.length - 1 ? Math.round((s.chest + sizes[i + 1].chest) / 2) : null;
    MIO_STEPS["size" + s.id] = { t: `then you're a *${s.id}*… I'll remember that when you pick something.`, pose: "happy", next: "size3" };
    return {
      label: lo == null ? `Under ${hi} cm` : hi == null ? `Over ${lo} cm` : `${lo}–${hi} cm`,
      go: "size" + s.id,
      act: () => S.setParts({ size: s.id }),
    };
  }).concat({ label: "I don't have a tape", go: "noTape" });

  // ── REN's script: same steps, buttons and picks, but his words (and Mio chimes in) ──
  const REN_TEXT = {
    hello:   { t: REN_HELLO, pose: "show", side: { t: "…and I'm *Mio*. he's nicer than he looks.", pose: "happy", delay: 700, ms: 3500 } },
    ask:     { t: "…looking for something?", pose: "idle" },
    again:   { t: "…anything else?", pose: "idle" },

    place:   { t: "…small shop. black, white, grey. that's it." },
    place2:  { t: "…nothing clashes. I like that.", pose: "idle", side: { t: "…he wore colour once. a yellow tie.", pose: "happy" } },
    place3:  { t: "…tap anything below to see it on us. pay by QR, tell us where to post it." },
    place4:  { t: "…doesn't fit? send it back with your code. no questions.", pose: "show", side: { t: "…he means it. he's just bad at saying it.", pose: "happy" } },

    good:    { t: "…going out, or staying home?", pose: "idle" },
    goodOut: { t: "…want people to notice you?", pose: "idle" },
    goodHome:{ t: "…warm, or cool?", pose: "idle" },
    sugOutSeen:  { t: "…a *white Shirt*. it's what I'm wearing. it works.", pose: "show", side: { t: "…he irons it every morning.", pose: "happy" } },
    sugOutHide:  { t: "…an *oversized black Hoodie*. hood up. nobody talks to you.", pose: "show", side: { t: "…that's his day-off hoodie.", pose: "happy" } },
    sugHomeWarm: { t: "…a *charcoal Hoodie*. soft inside. Mio has one.", pose: "show", side: { t: "…it's my favourite. …don't tell him.", pose: "flustered" } },
    sugHomeCool: { t: "…an *oversized grey Tee*. Mio sleeps in hers.", pose: "show", side: { t: "…Ren!! don't say that.", pose: "flustered" } },
    take:    { t: "…okay. pick your size.", pose: "show" },
    notThat: { t: "…fair. something else then?", pose: "idle", side: { t: "…it was a good pick though.", pose: "ask" } },

    size:    { t: "…measure around your chest. under the arms. roughly is fine.", pose: "idle" },
    size2:   { t: "…about how many cm?", pose: "idle" },
    noTape:  { t: "…no tape? lay a tee flat. armpit to armpit. double it.", pose: "idle", side: { t: "…or just guess. he always does.", pose: "happy" } },
    size3:   { t: "…like it loose? pick *Oversized*. don't size up.", pose: "idle", side: { t: "…listen to him. he knows sizes.", pose: "happy" } },

    order:   { t: "…alright. the rack's right below. I'll be here. quietly.", pose: "show", side: { t: "…we'll be here. both of us.", pose: "happy" } },
    back:    { t: "…you're back.", pose: "show", side: { t: "…told you they'd come back.", pose: "happy" } },
  };
  sizes.forEach((s) => { REN_TEXT["size" + s.id] = { t: `…you're a *${s.id}*. I'll remember it.`, pose: "show" }; });
  const REN_STEPS = {};
  for (const [id, step] of Object.entries(MIO_STEPS)) {
    if (!REN_TEXT[id]) continue;                       // welcome / chrome / who are the shared opening
    const { side, ...rest } = step;                    // her chime-ins are replaced by Mio's own
    REN_STEPS[id] = { ...rest, ...REN_TEXT[id] };
  }

  const POKES = ["eep—!", "…I'm not a mannequin.", "p-please just shop…", "s-stop lah…", "…I'm going to hide in the fitting room."];
  const REN_POKES = ["…what.", "I'm on break.", "…I'm not a mannequin either.", "poke Mio. she reacts more.", "…", "okay. that's enough."];
  const MIO_IDLE = "…take your time. no rush.";
  const REN_IDLE = "…no rush. I'm folding anyway.";

  // ── Plumbing ──
  const $ = (s) => document.querySelector(s);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = matchMedia("(min-width: 1000px)");        // both on screen together from here up; below, one at a time
  const plain = (t) => t.replace(/\*/g, "");
  const rich = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))
                       .replace(/\*(.+?)\*/g, "<em>$1</em>");

  // A character: swaps poses (falling back to one that exists) and blinks.
  function makeChar(key, name, poses, fallback, blinkMs) {
    const el = $("#" + key), img = $(`#${key}Img`), blinkImg = $(`#${key}Blink`);
    const src = (p, blink) => `${ART[key]}${p}${blink ? "-blink" : ""}${ART.ext}`;
    poses.forEach((p) => { new Image().src = src(p); });   // preload so swaps don't flicker
    const c = {
      key, name, el, pose: null,
      setPose(p) {
        if (p === c.pose) return;
        c.pose = p;
        el.classList.remove("can-blink", "pop");
        void el.offsetWidth;
        el.classList.add("pop");
        img.src = src(p);
        blinkImg.src = src(p, true);
      },
    };
    img.addEventListener("error", () => {                  // no art for this pose yet → its stand-in
      const alt = fallback[c.pose] || "idle";
      if (!img.src.endsWith(src(alt))) { img.src = src(alt); blinkImg.src = src(alt, true); }
    });
    blinkImg.addEventListener("load", () => el.classList.add("can-blink"));    // blink only if a -blink frame exists
    blinkImg.addEventListener("error", () => el.classList.remove("can-blink"));
    if (!calm) (function blink() {
      el.classList.add("blinking");
      setTimeout(() => el.classList.remove("blinking"), 130);
      setTimeout(blink, blinkMs + Math.random() * blinkMs * 1.2);
    })();
    return c;
  }
  const mio = makeChar("mio", "Mio", ["idle", "waiting", "greet", "ask", "think", "happy", "flustered", "suggest"],
                       { suggest: "ask", react: "idle" }, 2500);
  const ren = makeChar("ren", "Ren", ["idle", "show"],
                       { greet: "show", happy: "show", suggest: "show", react: "idle", flustered: "idle", ask: "idle", think: "idle", waiting: "idle" }, 3000);

  // Who leads: their figure holds the big bubble (with reply buttons); the other holds the small one.
  let lead = mio, side = ren;
  const hero = $("#hero"), figure = { mio: $("#mioFigure"), ren: $("#renFigure") };
  const bubble = $("#bubble"), textEl = $("#bubbleText"), live = $("#bubbleLive"), choicesEl = $("#choices");
  const sideBubble = $("#renBubble"), sideLive = $("#renLive");
  const talkBtn = $("#talkBtn");
  const idleLine = () => (lead === mio ? MIO_IDLE : REN_IDLE);
  const script = (id) => (lead === mio ? MIO_STEPS : REN_STEPS)[id] || MIO_STEPS[id];

  function seat(who) {   // make `who` the one you're talking to; they swap places on screen
    lead = who;
    side = who === mio ? ren : mio;
    clearTimers();
    clearTimeout(sideTimer);
    sideBubble.classList.remove("show");
    figure[lead.key].append(bubble);
    figure[side.key].append(sideBubble);
    hero.classList.toggle("lead-ren", lead === ren);
    bubble.setAttribute("aria-label", `${lead.name} is talking`);
    choicesEl.setAttribute("aria-label", `Reply to ${lead.name}`);
    talkBtn.textContent = `Talk to ${lead.name}`;
    lead.setPose("idle");
    side.setPose("idle");
    shown = { text: "", pose: "idle" };
  }

  // One short line from the other one, then they go quiet again. Only when they're on screen.
  let sideTimer;
  function sideSay(text, p = "react", ms = SIDE_MS) {
    if (!wide.matches) return;
    side.setPose(p);
    sideBubble.innerHTML = rich(text);
    sideLive.textContent = `${side.name}: ${plain(text)}`;
    sideBubble.classList.add("show");
    clearTimeout(sideTimer);
    sideTimer = setTimeout(() => { sideBubble.classList.remove("show"); side.setPose("idle"); }, ms);
  }

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
    const s = script(id);
    if (!s) return;
    clearTimers();
    resting = false;
    if ((s.options || s.pick) && id !== "who") lastAsk = id;   // "Talk to …" picks up from here (not the who-to-talk-to question)
    talkBtn.hidden = true;
    choicesEl.innerHTML = "";
    bubble.classList.add("show");
    lead.setPose(s.pose);
    shown = { text: s.t, pose: s.pose };
    type(s.t, () => {
      for (const r of [].concat(s.side || [])) later(() => sideSay(r.t, r.pose, r.ms), r.delay ?? 500);
      if (s.next) later(() => play(s.next), s.wait ?? AUTO_MS + plain(s.t).length * 25);
      else if (s.options) offer(s.options);
      else if (s.pick) offerPick(s.pick);
      else if (s.go) later(() => goTo(s.go), 900);
      else if (s.end) later(rest, 2500);
    });
  }

  function offer(options) {
    const opts = typeof options === "function" ? options() : options;
    choicesEl.innerHTML = opts.map((o, i) => `
      <button type="button" class="choice ${o.kind || ""}" data-i="${i}" style="animation-delay:${i * 50}ms">${rich(o.label)}</button>`).join("");
    choicesEl.onclick = (e) => {
      const b = e.target.closest(".choice");
      if (!b) return;
      const o = opts[+b.dataset.i];
      choicesEl.onclick = null;
      if (o.act) o.act();
      play(o.go);
    };
    // Nobody answers: one gentle nudge, then they go idle until someone talks to them
    later(() => {
      aside(idleLine(), "waiting", 2600);
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

  // Scroll to the shop section; they rest until the visitor comes back up.
  function goTo(hash) {
    lastAsk = null;   // finished; next time they ask "anything else?"
    document.querySelector(hash).scrollIntoView({ behavior: calm ? "auto" : "smooth" });
    later(rest, 1200);
  }

  function rest() {
    clearTimers();
    choicesEl.innerHTML = "";
    bubble.classList.remove("show");
    lead.setPose("idle");
    talkBtn.hidden = false;
    resting = true;
  }
  let resting = false, lastAsk = null;
  talkBtn.addEventListener("click", () => play(lastAsk || "again"));

  // When the visitor scrolls back up after leaving, they notice.
  let leftHero = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { leftHero = true; return; }
    if (leftHero && resting) { leftHero = false; play("back"); }
  }, { threshold: 0.6 }).observe(hero);

  // A quick aside (poke, idle nudge) that returns to what the leader was saying.
  let asideTimer;
  function aside(text, p, ms) {
    if (typeTimer) skipTyping();
    const back = shown;
    lead.setPose(p);
    textEl.innerHTML = rich(text);
    live.textContent = plain(text);
    bubble.classList.add("show");
    clearTimeout(asideTimer);
    asideTimer = setTimeout(() => {
      if (resting) { bubble.classList.remove("show"); lead.setPose("idle"); return; }
      lead.setPose(back.pose);
      textEl.innerHTML = rich(back.text);
      live.textContent = plain(back.text);
    }, ms);
  }
  // Speak as `c`: in the big bubble if they're leading, otherwise as the small chime-in.
  const say = (c, text, p = "idle", ms = SIDE_MS) => (c === lead ? aside(text, p, ms) : sideSay(text, p, ms));

  let pokes = 0, renPokes = 0;
  mio.el.addEventListener("click", () => {
    say(mio, POKES[Math.min(pokes++, POKES.length - 1)], "flustered", 1800);
    if (pokes === 3) setTimeout(() => say(ren, "…leave her alone."), 700);
  });
  ren.el.addEventListener("click", () => {
    const n = renPokes++;
    say(ren, REN_POKES[Math.min(n, REN_POKES.length - 1)], "flustered", 2000);
    if (n === 1) setTimeout(() => say(mio, "…he's always on break.", "happy", 1800), 900);
  });

  mio.setPose("idle");
  ren.setPose("idle");
  // Small screens show one of them at a time: Mio says the whole name herself, then you pick who
  // to talk to, and Ren (if picked) takes Mio's place on screen.
  if (!wide.matches) MIO_STEPS.welcome = { t: "welcome to *Monochrome*.", pose: "greet", wait: 1800, next: "who" };
  later(() => play("welcome"), calm ? 0 : 900);
})();
