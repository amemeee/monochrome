# monochrome

A small black-and-white clothing shop. Pick your clothes, pay by QR, show your number.

- **Section 1, Mio:** the shy shopkeeper greets you in a speech bubble, and you reply with buttons: *What's good?* (two quick questions, then she picks a piece; "I'll take that" fills it in below), *What is this place?*, *Help me find my size* (pick your chest measurement and she sets your size), *I'll just browse*. You can poke her.
- **Section 2, Shop:** pick item, colour, size, fit and print, set the quantity, and add as many pieces as you like. Then pay by QR and get a pickup card to show at the counter. Mio peeks over the bag card once `assets/peek.jpg` exists.

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
| [mio.js](mio.js) | Section 1: Mio's lines and conversation (`STEPS`), poses, typing, pokes. **Edit her lines here.** |
| [app.js](app.js) | Section 2: garment icons, the shop builder, bag / QR / pickup card, peeking Mio |
| [config.js](config.js) | Shop name, currency, items and prices, colours, sizes, fits, prints, payment QR |
| [styles.css](styles.css) | Black-and-white manga look |
| `assets/` | Mio's poses |

## Mio's art

Poses live in `assets/` as `<pose>.jpg`:
`idle`, `waiting`, `greet`, `ask`, `think`, `happy`, `flustered`.

`suggest` (holding up a folded shirt or hoodie) isn't drawn yet. Until `assets/suggest.jpg` exists she uses `ask` instead (see `FALLBACK` in mio.js).

Blinking: add `<pose>-blink.jpg` (same image, eyes closed) and she'll blink in that pose automatically.

`peek.jpg` (optional, wide 2:1): her head and hands peeking over a table edge drawn at 75% height. She rises over the bag card when you scroll to it, and comments when you add pieces.

Keep every pose at the same size and framing (1024×1024, white background) so swaps don't jump.

## Catalogue

Everything is in [config.js](config.js):

- **items:** Tee, Shirt, Hoodie, Pants (with `measure: "chest"` or `"waist"` for the size chips)
- **colours:** Black, Charcoal, Grey, White
- **sizes:** XS–XL with body chest and waist in cm
- **fits:** Regular, Oversized, Slim
- **prints:** Plain, Pocket logo (+RM 5), Back print “just browsing” (+RM 10, tops only)
