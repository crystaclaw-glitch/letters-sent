# Letters That Were Never Sent

A cinematic, single-page storytelling experience built with plain HTML, CSS,
JavaScript and GSAP. No build step, no framework, no Bootstrap.

## Structure

```
assets/
  images/   background.jpg, envelope_closed.png, envelope_open.png,
            envelope_open_with_paper.png, paper.png,
            postage_stamp1.png, postage_stamp2.png
  audio/    background_music.m4a, paper_slide.m4a, pencil_write.m4a
  data/     README.txt  ← the three letters, parsed at runtime
css/        style.css
js/         letters.js, envelopes.js, handwriting.js, main.js
index.html
```

## Editing the letters

Open `assets/data/README.txt` and edit the text between the
`===== LETTER N =====` dividers. Nothing in the code hardcodes letter
content — add, remove, or rewrite letters there and the site adapts
automatically (the "Choose a Letter" screen always shows the first three
letters found in the file).

## Running locally

Because the page `fetch()`es `assets/data/README.txt`, it needs to be
served over HTTP rather than opened as a `file://` path. Any static
server works, for example:

```
npx serve .
# or
python3 -m http.server 8080
```

## Deploying to Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare Pages, create a new project from that repository.
3. Build command: (leave blank)
4. Build output directory: `/` (repository root)

No other configuration is required — everything is static and uses
relative paths.
