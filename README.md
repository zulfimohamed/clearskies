# ClearSkies

A Chrome extension that translates corporate jargon on any page — and, in reverse, translates your plain English into corporate jargon.

## What it does

- **Decode mode** — runs on any webpage, underlines known buzzwords/jargon, and shows the plain-English meaning on hover. The extension badge shows how many jargon terms were found on the page.
- **Turbulence mode** — same jargon detection as Decode, louder presentation: each match shakes as it scrolls into view, and a floating "seatbelt sign" badge in the corner reports local jargon density (Light chop → Moderate turbulence → Severe turbulence — brace for impact) as you scroll. Optionally dings once (a synthesized chime, off by default) if a page hits severe.
- **Corporate-ify mode** — select any text on a page and right-click → "Corporate-ify this" for an instant insufferable-consultant-speak rewrite, shown in a floating card with a Copy button. Or open the popup, paste text, and hit "Corporate-ify."

Decode and Turbulence are mutually exclusive per site — switch between Off / Decode / Turbulence from the popup.

No accounts, no tracking, no build step required.

### AI mode (optional)

By default, Corporate-ify uses fast, local dictionary substitution — no network calls, no setup. If you want funnier, more context-aware rewrites, open the popup and flip on "✨ Use AI." Four providers are supported, each with their own key stored separately so switching back and forth never loses one:

- **Claude (Anthropic)** — paste in your own [Anthropic API key](https://console.anthropic.com/settings/keys).
- **OpenRouter (open-source models)** — paste in your own [OpenRouter API key](https://openrouter.ai/keys) and optionally a model slug from [openrouter.ai/models](https://openrouter.ai/models) (e.g. `meta-llama/llama-3.3-70b-instruct`, `mistralai/mistral-small`, `deepseek/deepseek-chat`); leave it blank to use the Llama 3.3 70B default.
- **OpenAI** — paste in your own [OpenAI API key](https://platform.openai.com/api-keys); optional model field defaults to `gpt-4o-mini`.
- **Gemini (Google)** — paste in your own [Gemini API key](https://aistudio.google.com/apikey); optional model field defaults to `gemini-2.0-flash`.

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
content/                 Decode/Turbulence rendering: scans, highlights, shakes, seatbelt badge
popup/                   Extension popup: per-site mode switch, Corporate-ify box, AI settings
background/              Service worker: context menu, badge updates, AI Corporate-ify calls
icons/                   16/48/128px extension icons
scripts/package.sh       Builds a Chrome Web Store-ready zip into dist/
site/                    Static privacy policy + landing page, deployed via Cloudflare Workers
wrangler.toml            Config for deploying site/ as a static Worker (Cloudflare)
```

## Extending the dictionary

Add entries to `dictionary.json`'s `terms` array as `{ "jargon": "...", "plain": "..." }` pairs. Decode mode matches on `jargon`; Corporate-ify matches on `plain` and substitutes `jargon`.

## Packaging for the Chrome Web Store

```
./scripts/package.sh
```

This produces `dist/clearskies-v<version>.zip` containing only the files the extension needs (no README, git metadata, or dev scripts). Upload that zip at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Hosting the privacy policy page

The Chrome Web Store requires a privacy policy URL for extensions with broad host permissions (this one has `<all_urls>`). `site/` is a plain static page (`index.html` + `privacy.html`, built from [PRIVACY.md](./PRIVACY.md)) with no build step, deployed via Cloudflare Workers' static asset hosting:

```
npx wrangler deploy
```

`wrangler.toml` points it at `./site` — no `main` script needed, Wrangler serves the directory as-is. Paste the resulting `*.workers.dev` URL (or a custom domain) into the Chrome Web Store listing's privacy policy field.
