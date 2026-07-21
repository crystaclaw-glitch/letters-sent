/* =========================================================================
   letters.js
   Fetches assets/data/README.txt and splits it into individual letters.
   Nothing about letter content is ever hardcoded here — this file only
   knows the SHAPE of the format (a "===== LETTER N =====" divider),
   never the words themselves.
   ========================================================================= */

/**
 * Loads assets/data/README.txt and parses it into an array of
 * { title: "LETTER 1", body: "..." } objects.
 * @returns {Promise<Array<{title: string, body: string}>>}
 */
async function loadLetters() {
  const response = await fetch('assets/data/README.txt');
  const raw = await response.text();
  return parseLetters(raw);
}

/**
 * Splits raw README text on divider blocks like:
 * =========================
 * LETTER 1
 * =========================
 * ... content ...
 */
function parseLetters(raw) {
  // Normalise line endings
  const text = raw.replace(/\r\n/g, '\n');

  // A divider block: a line of === , a title line, a line of ===
  const dividerRegex = /={5,}\s*\n\s*([^\n]+?)\s*\n\s*={5,}\s*\n/g;

  const matches = [...text.matchAll(dividerRegex)];
  const letters = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const title = current[1].trim();
    const contentStart = current.index + current[0].length;
    const contentEnd = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
    let body = text.slice(contentStart, contentEnd).trim();

    // Strip simple markdown bold markers (**Text**) left over in the source,
    // since the letter is presented as plain handwriting, not markdown.
    body = body.replace(/\*\*(.+?)\*\*/g, '$1');

    letters.push({ title, body });
  }

  return letters;
}
