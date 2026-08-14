// Shared dictionary helpers, used by both the content script and the popup.
// Exposes a single global: window.ClearSkies
(function () {
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildTermRegex(terms) {
    const sorted = [...terms].sort((a, b) => b.jargon.length - a.jargon.length);
    const pattern = sorted.map((t) => escapeRegExp(t.jargon)).join("|");
    return new RegExp(`\\b(${pattern})\\b`, "gi");
  }

  function buildPlainRegex(terms) {
    const sorted = [...terms].sort((a, b) => b.plain.length - a.plain.length);
    const pattern = sorted.map((t) => escapeRegExp(t.plain)).join("|");
    return new RegExp(`\\b(${pattern})\\b`, "gi");
  }

  function findJargonAt(dictionary, matchedText) {
    const lower = matchedText.toLowerCase();
    return dictionary.terms.find((t) => t.jargon.toLowerCase() === lower);
  }

  function findPlainAt(dictionary, matchedText) {
    const lower = matchedText.toLowerCase();
    return dictionary.terms.find((t) => t.plain.toLowerCase() === lower);
  }

  function matchCase(sample, replacement) {
    if (sample[0] && sample[0] === sample[0].toUpperCase() && sample[0] !== sample[0].toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Rewrites plain English into corporate jargon, plus some inflated filler.
  function corporateify(text, dictionary) {
    if (!text || !text.trim()) return text;

    const plainRegex = buildPlainRegex(dictionary.terms);
    let result = text.replace(plainRegex, (match) => {
      const entry = findPlainAt(dictionary, match);
      if (!entry) return match;
      return matchCase(match, entry.jargon);
    });

    // Sprinkle in an opener for flavor.
    if (dictionary.openers && dictionary.openers.length) {
      result = `${pick(dictionary.openers)} ${result}`;
    }

    // Inject a filler phrase before the final sentence, if there's room.
    if (dictionary.fillers && dictionary.fillers.length) {
      const sentences = result.split(/(?<=[.!?])\s+/);
      const filler = pick(dictionary.fillers);
      const injected = filler.charAt(0).toUpperCase() + filler.slice(1) + ", " + sentences[sentences.length - 1].charAt(0).toLowerCase() + sentences[sentences.length - 1].slice(1);
      sentences[sentences.length - 1] = injected;
      result = sentences.join(" ");
    }

    return result;
  }

  window.ClearSkies = {
    buildTermRegex,
    findJargonAt,
    corporateify,
  };
})();
