# Privacy

ClearSkies doesn't have a backend, accounts, or analytics. Specifically:

- **Decode mode** reads the text of pages you visit locally, in your browser, to find jargon terms. Nothing is sent anywhere.
- **Corporate-ify (dictionary mode, default)** runs entirely locally using the bundled `dictionary.json`. Nothing is sent anywhere.
- **Corporate-ify (AI mode, opt-in)** — if you turn this on and enter your own Anthropic API key, the text you choose to Corporate-ify is sent directly from your browser to Anthropic's API (`api.anthropic.com`) to generate the rewrite. It does not pass through any ClearSkies server, because there isn't one.
- **Your API key** is stored only in `chrome.storage.local` on your device and is never transmitted anywhere except as an authentication header on requests you initiate to Anthropic's API. Treat it like any other credential — use a key with a spending limit you're comfortable with.
- The **on/off toggle** for Decode mode is stored per-site in `chrome.storage.local` so your preference persists. This never leaves your device.

No data is collected, sold, or shared by ClearSkies.
