# monochrome

A small black-and-white clothing shop. Pick your clothes, pay by QR, show your number.

- **Section 1, Mio:** the shy shopkeeper greets you in a speech bubble, and you reply with buttons: *What's good?* (two quick questions, then she picks a piece; "I'll take that" fills it in below), *What is this place?*, *Help me find my size* (pick your chest measurement and she sets your size), *I'll just browse*. You can poke her.
- **Section 2, Shop:** an online-store style catalogue: product cards 6 per page with page buttons, category tabs (Tees / Shirts / Hoodies / Pants), sort by price, colour dots on each card, and a **Worn by** switch (Mio / Ren) that swaps who's wearing the clothes. Tap a card for the quick view (colour, size, quantity, *Add to bag*). Then pay by QR and get a pickup card to show at the counter. Mio peeks over the bag card once `assets/mio/peek.jpg` exists.

- **Section 3, Track:** enter the code from the receipt (e.g. `1311-K7QP`) to see the parcel's progress: Order placed → Payment confirmed → Packed → Posted → Delivered. After paying, customers fill in a posting address and get a receipt modal with the code. Without `shipping.trackUrl` in config.js it runs a demo that advances every minute for orders placed in the same browser. The receipt says the code will be emailed, but **no email is sent**.

Black-and-white manga style to match Mio's ink art. Same template as [kopi-introvert](https://github.com/amemeee/kopi-introvert). A portfolio project.

## Run it

Static files, no build step. Serve the folder (opening `index.html` directly mostly works too):

```sh
npx serve .
# or: python -m http.server
```

## Files

| File | What's in it |
|---|---|
| [hero.js](hero.js) | Section 1: Mio's lines and conversation (`STEPS`), poses, typing, pokes. **Edit her lines here.** |
| [app.js](app.js) | Section 2: product cards, paging, quick view, bag / QR / pickup card, peeking Mio |
| [config.js](config.js) | Shop name, currency, items, **products**, models, colours, sizes, fits, prints, payment QR |
| [styles.css](styles.css) | Black-and-white manga look |
| `assets/mio/`, `assets/ren/` | Character poses |

## Mio's art

Poses live in `assets/mio/` as `<pose>.jpg`:
`idle`, `waiting`, `greet`, `ask`, `think`, `happy`, `flustered`.

`suggest` (holding up a folded shirt or hoodie) isn't drawn yet. Until `assets/mio/suggest.jpg` exists she uses `ask` instead (see `FALLBACK` in hero.js).

Blinking: add `<pose>-blink.jpg` (same image, eyes closed) and she'll blink in that pose automatically.

`peek.jpg` (optional, wide 2:1): her head and hands peeking over a table edge drawn at 75% height. She rises over the bag card when you scroll to it, and comments when you add pieces.

Keep every pose at the same size and framing (1024×1024, white background) so swaps don't jump.

## Ren's art

On desktop (1000px and wider) Ren stands left of Mio. He chimes in after some of her lines (the `ren: { t, pose }` field on a step in hero.js) and has his own poke lines. Phones show only Mio.

Poses live in `assets/ren/`: `idle`, `show` (adjusting his tie). `react`, `flustered` and `happy` aren't drawn yet, so `react` and `flustered` use `idle` and `happy` uses `show` (`REN_FALLBACK` in hero.js). `<pose>-blink.jpg` makes him blink. Same framing as Mio: 1024×1024, white background.

## Catalogue

Everything is in [config.js](config.js):

- **products:** one card each: name, garment, fit, print, the colours it comes in, an optional tag badge. Price = item price + print price unless set. `perPage` sets cards per page (6).
- **items:** Tee, Shirt, Hoodie, Pants (base price, category tab, `measure: "chest"` or `"waist"` for sizes)
- **colours:** Black, Charcoal, Grey, White
- **sizes:** XS–XL with body chest and waist in cm
- **fits:** Regular, Oversized, Slim
- **prints:** Plain, Pocket logo (+RM 5), Back print “just browsing” (+RM 10, tops only)
- **models:** who can wear the clothes on the cards (Mio, Ren)

## Clothes art (Worn by)

Cards show the drawn garment icon until there's art. Put pictures in `assets/wear/<model>/`; the first one found is used:

1. `<product id>-<colour>.jpg`, e.g. `assets/wear/ren/hoodie-over-ink.jpg`
2. `<product id>.jpg`
3. `<garment>-<colour>.jpg`, e.g. `assets/wear/mio/tee-paper.jpg` (covers every tee in white)
4. `<garment>.jpg`

If a product has art in only one colour, picking another colour tints the garment automatically (flood-fills the clothing from a point on the torso, so skin, hair and outlines stay). It works best on a dark garment drawn in black or charcoal; a white garment can't be recoloured, and it needs the site served over http (not opened as a file). Drawn art in the exact colour always wins.

Cards are 4:5 and crop to the top, so 1024×1024 upper-body art works. Adding a new character = add it to `models` and draw a folder.
