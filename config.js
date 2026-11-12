// Shop settings. Edit this file — no build step needed.
window.SHOP_CONFIG = {
  shopName: "Monochrome",
  currency: "RM",

  // Path or URL to a DuitNow / PayNow / bank QR image, e.g. "assets/qr.png".
  // Leave empty to show a demo placeholder.
  paymentQr: "",
  payee: "Monochrome",

  // What's on the rack. icon = tee | shirt | hoodie | pants (drawn in app.js).
  // measure = which body measurement the size chips show.
  items: [
    { id: "tee",    name: "Tee",    note: "heavy cotton", price: 39, icon: "tee",    measure: "chest" },
    { id: "shirt",  name: "Shirt",  note: "oxford, long sleeve", price: 79, icon: "shirt", measure: "chest" },
    { id: "hoodie", name: "Hoodie", note: "brushed fleece", price: 99, icon: "hoodie", measure: "chest" },
    { id: "pants",  name: "Pants",  note: "wide leg, elastic", price: 89, icon: "pants", measure: "waist" },
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

  // Mio's art: <folder><pose><ext>, blink frames as <pose>-blink<ext>.
  // Her lines and the conversation live in mio.js.
  art: { folder: "assets/", ext: ".jpg" },
};
