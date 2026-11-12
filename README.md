# Kolam · Dots & Loops

A calm, free rangoli puzzle for children and grown-ups. No ads, no accounts, no tracking.

- **Kolam levels**: every dot (pulli) holds one piece of the line. Tap a piece to turn it. When every strand meets its neighbour, the sikku kolam closes and fills with colour.
- **Rangoli pictures**: lotus, diya, peacock, hibiscus, pookalam, mor pankh, kalash, Ganesha and more, cut into tiles that you turn back into place.
- **Rangavalli mandalas**: round designs with 5- to 16-fold symmetry, made of rings that you turn until the petals line up.
- 2,000 numbered levels in ten chapters, from two dots to 11 x 11 weaves, then endless levels after that. Every level is generated from its number, so everyone sees the same level 37.
- Works offline and can be added to a phone home screen.

## Run it

It is plain HTML, CSS and JavaScript with no build step.

```bash
python3 -m http.server 8771
```

Then open http://localhost:8771.

## Files

- `index.html` – the game, level generator and screens
- `motifs.js` – the rangoli pictures, drawn as SVG in code
- `sw.js`, `manifest.webmanifest`, `icon*` – offline support and home-screen install

## Share a level

Add the level number to the link: `/#37`. Gallery pictures look like `/#g-peacock-4`, and mandalas like `/#m-8-4` (8 petals, 4 rings).

## License

MIT
