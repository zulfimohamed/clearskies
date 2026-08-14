# ClearSkies

A Chrome extension that translates corporate jargon on any page — and, in reverse, translates your plain English into corporate jargon.

## What it does

- **Decode mode** — runs on any webpage, underlines known buzzwords/jargon, and shows the plain-English meaning on hover. The extension badge shows how many jargon terms were found on the page. Toggle it on/off per-site from the popup.
- **Corporate-ify mode** — select any text on a page and right-click → "Corporate-ify this" for an instant insufferable-consultant-speak rewrite, shown in a floating card with a Copy button. Or open the popup, paste text, and hit "Corporate-ify."

No accounts, no tracking, no build step required.

### AI mode (optional)

By default, Corporate-ify uses fast, local dictionary substitution — no network calls, no setup. If you want funnier, more context-aware rewrites, open the popup and flip on "✨ Use AI." Two providers are supported:

- **Claude (Anthropic)** — paste in your own [Anthropic API key](https://console.anthropic.com/settings/keys).
- **OpenRouter (open-source models)** — paste in your own [OpenRouter API key](https://openrouter.ai/keys) and optionally a model slug from [openrouter.ai/models](https://openrouter.ai/models) (e.g. `meta-llama/llama-3.3-70b-instruct`, `mistralai/mistral-small`, `deepseek/deepseek-chat`); leave it blank to use the Llama 3.3 70B default.

Whichever provider you pick, your key and text are sent directly from your browser to that provider's API — never through us — and the key is stored only in `chrome.storage.local` on your device. See [PRIVACY.md](./PRIVACY.md) for details. If AI mode is off, no key is set, or the request fails, Corporate-ify falls back to dictionary mode automatically.

## Load it locally (unpacked)

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this folder
4. Visit any page with some corporate writing on it, or right-click selected text to try Corporate-ify

## Project structure

```
manifest.json            Manifest V3 config
dictionary.json          Jargon ↔ plain-English dictionary (terms, fillers, openers)
shared/corporateify.js   Shared matching/rewrite logic used by content script, popup, and background
content/                 Decode mode: scans and highlights the page
popup/                   Extension popup: per-site toggle, Corporate-ify box, AI settings
background/              Service worker: context menu, badge updates, AI Corporate-ify calls
icons/                   16/48/128px extension icons
scripts/package.sh       Builds a Chrome Web Store-ready zip into dist/
```

## Extending the dictionary

Add entries to `dictionary.json`'s `terms` array as `{ "jargon": "...", "plain": "..." }` pairs. Decode mode matches on `jargon`; Corporate-ify matches on `plain` and substitutes `jargon`.

## Packaging for the Chrome Web Store

```
./scripts/package.sh
```

This produces `dist/clearskies-v<version>.zip` containing only the files the extension needs (no README, git metadata, or dev scripts). Upload that zip at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
