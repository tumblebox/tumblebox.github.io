# Developer website

Static pages Google Play and ad networks need:

| File | Why |
|---|---|
| `index.html` | Developer website listed in Play Console; support contact |
| `privacy.html` | Privacy policy URL (required for any app with ads or analytics; also used in the MAX consent flow) |
| `app-ads.txt` | Lets ad networks verify they may sell our inventory. Missing = much less demand |

## Hosting

GitHub Pages can't serve from a private repo on the free plan, so deploy this folder somewhere else:

- **Cloudflare Pages** (recommended): connect this repo, set the root directory to `site`, with no build command. Free, and custom domains are easy.
- Or copy the folder into a separate **public** `yalla-games/yalla-games.github.io` repo.

Point the custom domain (e.g. `yallagames.<tld>`) at it, then set that URL as the *Website* in Play Console.
`app-ads.txt` has to be at the root of that exact domain.

## Before publishing

- Replace every `TODO` in `privacy.html` (contact email, effective date, legal name).
- The privacy policy is a starting draft, not legal advice. Check it against the SDKs actually shipped and the Data safety form.
