// The assistant page: Mio and Ren's chat (hero.js) needs a few things from the shop.
// Here there is no shop on the page, so this works out prices itself and sends the visitor to
// the catalogue page to open her pick (catalogue.html?pick=...) or remembers the size she helped with.
(() => {
  "use strict";

  const { cfg, byId, money } = window.Mono;

  const products = cfg.products.filter((p) => !p.hidden).map((p) => {
    const item = byId(cfg.items, p.garment);
    const q = { fit: "regular", print: "plain", ...p, item };
    q.price = p.price ?? item.price + byId(cfg.prints, q.print).price;
    return q;
  });
  const findProduct = (piece) =>
    byId(products, piece.product)
    || products.find((p) => p.garment === piece.garment && p.fit === (piece.fit || "regular") && p.print === (piece.print || "plain"))
    || products.find((p) => p.garment === piece.garment)
    || products[0];

  window.Shop = {
    cfg, money,
    describe: (piece) => ({ price: findProduct(piece).price }),
    setParts(parts) {
      if (parts.size) try { localStorage.setItem("monochrome-size", parts.size); } catch { /* private mode */ }
    },
    prefill(piece) {
      location.href = `catalogue.html?pick=${encodeURIComponent(JSON.stringify(piece))}`;
    },
  };
})();
