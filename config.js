// Shop settings. Edit this file — no build step needed.
window.SHOP_CONFIG = {
  shopName: "Monochrome",
  currency: "RM",

  // Path or URL to a DuitNow / PayNow / bank QR image, e.g. "assets/qr.png".
  // Leave empty to show a demo placeholder.
  paymentQr: "",
  payee: "Monochrome",

  // After "I've paid" the customer fills in where to post their order.
  // endpoint: a URL that receives the order as JSON (Formspree, a Google Apps Script web app,
  // your own server…). Empty = nothing is sent, the details only show on their order card.
  shipping: {
    endpoint: "",
    note: "We post within 2 working days. Keep your tracking code.",
    // Tracking (section 3). trackUrl: a URL that answers GET ?code=XXXX with JSON like
    //   { "found": true, "status": "posted", "updated": "2026-11-13T10:00:00Z", "courier": "J&T", "parcel": "JT123456" }
    // where status is one of the step ids below. Empty = demo tracking that moves forward every
    // minute for orders placed in this browser (so you can see it work).
    trackUrl: "",
    steps: [
      { id: "placed",    name: "Order placed",      note: "We've got your order." },
      { id: "paid",      name: "Payment confirmed", note: "We checked your payment." },
      { id: "packed",    name: "Packed",            note: "Folded and bagged." },
      { id: "posted",    name: "Posted",            note: "On its way to you." },
      { id: "delivered", name: "Delivered",         note: "Enjoy. Doesn't fit? Send it back." },
    ],
    states: ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
             "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu",
             "Kuala Lumpur", "Labuan", "Putrajaya"],
  },

  // Garment types (the category tabs). icon = tee | shirt | hoodie | pants (drawn in app.js).
  // measure = which body measurement the size chips show. price = base price.
  items: [
    { id: "tee",    name: "Tee",    plural: "Tees",    note: "heavy cotton", price: 39, icon: "tee",    measure: "chest" },
    { id: "shirt",  name: "Shirt",  plural: "Shirts",  note: "oxford, long sleeve", price: 79, icon: "shirt", measure: "chest" },
    { id: "hoodie", name: "Hoodie", plural: "Hoodies", note: "brushed fleece", price: 99, icon: "hoodie", measure: "chest" },
    { id: "pants",  name: "Pants",  plural: "Pants",   note: "elastic waist", price: 89, icon: "pants", measure: "waist" },
  ],

  // Greyscale, to match the ink art.
  colours: [
    { id: "ink",      name: "Black",    hex: "#141414" },
    { id: "charcoal", name: "Charcoal", hex: "#4a4a4a" },
    { id: "stone",    name: "Grey",     hex: "#a3a3a3" },
    { id: "paper",    name: "White",    hex: "#f7f7f5" },
  ],

  // Body measurements in cm.
  sizes: [
    { id: "XS", chest: 86,  waist: 68 },
    { id: "S",  chest: 92,  waist: 74 },
    { id: "M",  chest: 98,  waist: 80 },
    { id: "L",  chest: 104, waist: 86 },
    { id: "XL", chest: 110, waist: 92 },
  ],

  fits: [
    { id: "regular",   name: "Regular",   note: "true to size" },
    { id: "oversized", name: "Oversized", note: "good for hiding" },
    { id: "slim",      name: "Slim",      note: "closer to body" },
  ],

  // tops: true = not available on pants.
  prints: [
    { id: "plain",  name: "Plain",       note: "nothing on it",     price: 0 },
    { id: "pocket", name: "Pocket logo", note: "tiny, left chest",  price: 5 },
    { id: "back",   name: "Back print",  note: "“just browsing”",   price: 10, tops: true },
  ],

  perPage: 6,   // product cards per page

  // The catalogue: one card each. garment = an item id above; fit / print default to
  // "regular" / "plain"; colours = colour ids it comes in (first one shows on the card).
  // Price = item price + print price, unless you set price here. tag = small badge.
  // hidden: true = not shown in the shop yet (delete the line to bring it back; a tab with
  // nothing in it disappears too).
  // seed = [x, y] (0–1) a point on the garment in the art, used when tinting it to another
  // colour (default [0.42, 0.6], the torso; set it when the middle isn't the garment).
  // sex = "male" (always worn by Ren), "female" (always Mio) or "unisex" (default: whoever
  // "Worn by" is set to).
  products: [
    { id: "baggy-collar",  name: "Baggy Collar Shirt",   garment: "tee",    fit: "oversized", sex: "male", colours: ["ink", "charcoal", "stone", "paper"], tag: "Bestseller" },
    { id: "tee-over",      name: "Oversized Tee",        garment: "tee",    fit: "oversized", colours: ["ink", "stone", "paper"], tag: "Mio's pick" },
    { id: "tee-slim",      name: "Slim Tee",             garment: "tee",    fit: "slim", sex: "female", colours: ["charcoal", "ink", "paper"] },
    { id: "tee-pocket",    name: "Pocket Logo Tee",      garment: "tee",    print: "pocket", colours: ["paper", "ink", "stone"] },
    { id: "tee-browse",    name: "Just Browsing Tee",    garment: "tee",    fit: "oversized", print: "back", colours: ["paper", "ink"], tag: "New" },
    { id: "shirt-oxford",  name: "Oxford Shirt",         garment: "shirt",  colours: ["paper", "ink", "stone"] },
    { id: "shirt-over",    name: "Oversized Shirt",      garment: "shirt",  fit: "oversized", colours: ["paper", "charcoal"] },
    { id: "shirt-long-baggy", name: "Long Baggy Shirt",  garment: "shirt",  fit: "oversized", colours: ["paper", "ink"] },
    { id: "cardigan",      name: "Cardigan",             garment: "shirt",  fit: "oversized", colours: ["stone", "ink", "charcoal"], seed: [0.33, 0.55] },
    { id: "hoodie-fleece", name: "Fleece Hoodie",        garment: "hoodie", colours: ["ink", "charcoal", "stone", "paper"], tag: "Bestseller" },
    { id: "hoodie-over",   name: "Oversized Hoodie",     garment: "hoodie", fit: "oversized", sex: "male", colours: ["ink", "charcoal", "stone"], tag: "Hide mode" },
    { id: "half-zip",      name: "Half Zipper",          garment: "hoodie", sex: "male", colours: ["paper", "ink", "charcoal"], tag: "New" },
    { id: "hoodie-pocket", name: "Pocket Logo Hoodie",   garment: "hoodie", print: "pocket", hidden: true, colours: ["ink", "stone", "paper"] },
    { id: "pants-wide",    name: "Wide Pants",           garment: "pants",  hidden: true, colours: ["ink", "charcoal", "stone"] },
    { id: "pants-xwide",   name: "Extra Wide Pants",     garment: "pants",  hidden: true, fit: "oversized", colours: ["ink", "charcoal"] },
    { id: "pants-slim",    name: "Slim Pants",           garment: "pants",  hidden: true, fit: "slim", colours: ["ink", "charcoal"] },
  ],

  // Who wears the clothes on the cards ("Worn by" switch). First one is the default.
  // Art: assets/wear/<model>/<product id>-<colour>.jpg, e.g. assets/wear/ren/hoodie-over-ink.jpg
  // Missing? It tries <product id>.jpg, then <garment>-<colour>.jpg, then <garment>.jpg,
  // then falls back to the drawn garment icon. Add art whenever, nothing breaks.
  models: [
    { id: "mio", name: "Mio", sex: "female" },
    { id: "ren", name: "Ren", sex: "male" },
  ],

  // Reviews on the home page. These are SAMPLE reviews so the section has something in it:
  // replace them with real customers' words (and remove the ones you can't back up) before launch.
  // rating: 1-5. piece: what they bought.
  reviews: [
    { name: "Aina",   piece: "Oversized Tee",     rating: 5, text: "Heavier than I expected and the black stays black after washing. Exactly the fit in the picture." },
    { name: "Daniel", piece: "Fleece Hoodie",     rating: 5, text: "Soft inside, no logo shouting. I own it in two colours now." },
    { name: "Sofea",  piece: "Slim Tee",          rating: 4, text: "Good cut and quick delivery. Sized up once because I like it loose, and the size guide helped." },
    { name: "Hakim",  piece: "Oxford Shirt",      rating: 5, text: "Crisp white that actually looks expensive. Comes folded in a bag, no fuss." },
    { name: "Mei Ling", piece: "Cardigan",        rating: 5, text: "Nobody asked if I needed help. 10/10 shopping experience." },
    { name: "Irfan",  piece: "Half Zipper",       rating: 4, text: "Nice weight for aircon offices. The tracking page made it easy to know when to expect it." },
  ],

  // Character art: <art.mio or art.ren><pose><ext>, blink frames as <pose>-blink<ext>.
  // Lines and the conversation live in hero.js. art.wear = the catalogue art above.
  art: { ext: ".jpg", mio: "assets/mio/", ren: "assets/ren/", wear: "assets/wear/" },
};
