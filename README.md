# ClearSkies

A Chrome extension that translates corporate jargon on any page — and, in reverse, translates your plain English into corporate jargon.

## What it does

- **Decode mode** — runs on any webpage, underlines known buzzwords/jargon, and shows the plain-English meaning on hover. The extension badge shows how many jargon terms were found on the page. Toggle it on/off per-site from the popup.
- **Corporate-ify mode** — select any text on a page and right-click → "Corporate-ify this" for an instant insufferable-consultant-speak rewrite, shown in a floating card with a Copy button. Or open the popup, paste text, and hit "Corporate-ify."

No accounts, no tracking, no build step required.

## Load it locally (unpacked)

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this folder
4. Visit any page with some corporate writing on it, or right-click selected text to try Corporate-ify

## Project structure

```
manifest.json           Manifest V3 config
dictionary.json          Jargon ↔ plain-English dictionary (terms, fillers, openers)
shared/corporateify.js   Shared matching/rewrite logic used by content script + popup
content/                 Decode mode: scans and highlights the page
popup/                   Extension popup: per-site toggle + Corporate-ify box
background/              Service worker: context menu + badge updates
icons/                   16/48/128px extension icons
```

## Extending the dictionary

Add entries to `dictionary.json`'s `terms` array as `{ "jargon": "...", "plain": "..." }` pairs. Decode mode matches on `jargon`; Corporate-ify matches on `plain` and substitutes `jargon`.
