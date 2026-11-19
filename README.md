# Roam V0.2: encrypted group trip planner

Features: multiple holidays per shared group account, maps, dates, activities, budgets, expense splits, encrypted synchronisation.

## Run locally (offline mode)

From the `trip-planner` directory:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 and select **Continue offline on this device**. Offline mode is **not encrypted** and is not shared.

## Set up genuine shared accounts (Cloudflare Worker + D1)

1. Create a free Cloudflare account. Install Node.js if necessary.
2. From `trip-planner/worker` run `npx wrangler login`.
3. Run `npx wrangler d1 create roam-groups`. Copy its `database_id` into `worker/wrangler.toml`.
4. Run `npx wrangler d1 execute roam-groups --remote --file=schema.sql`.
5. Replace `ALLOWED_ORIGIN` in `wrangler.toml` with your website's exact origin, without a trailing slash. For local testing, use `http://localhost:8000` instead.
6. Run `npx wrangler deploy`. Copy the Worker URL.
7. Set `window.ROAM_API_URL` in `trip-planner/config.js` to that Worker URL.
8. Publish the static files `index.html` and `config.js` to GitHub Pages, or serve locally with Python. **Do not upload the worker folder as your website's public content.**
9. Open the site, choose a group name and a strong codeword, confirm it and create the group. Other friends choose **Unlock existing group** with the same name and codeword.

Cloudflare's free tier has usage limits. Verify current Cloudflare D1 and Workers pricing before public launch.

## Security and operational limitations

- Shared data is encrypted in the browser with AES-GCM. A PBKDF2-SHA256 key derivation uses 310,000 iterations and a per-group random salt. The codeword is not transmitted to the server.
- The server stores a derived authentication proof, which acts as a reusable bearer secret. **This is a prototype, not a security-audited authentication system.** A compromised proof can allow encrypted data to be overwritten, even without decrypting it. No rate limiting, account recovery, or abuse protection is included.
- A shared codeword cannot identify individual users. Anyone with it has full access, including destructive edits. Use only with trusted group members.
- A stolen encrypted database may permit offline guessing of weak codewords. Use a long, unique, randomly generated passphrase.
- No password reset or recovery is possible. Export backups and keep the codeword safe.
- The app uses optimistic revision checks: simultaneous edits may cause a conflict rather than automatic merging. Export your changes before reloading. It checks for remote changes when the browser window regains focus.
- Offline mode uses unencrypted browser localStorage. Do not treat it as a secure group account. Offline plans are not automatically moved into a group account.
- Group data is limited to approximately 1 MB per save; map searches use public Nominatim with rate restrictions. HTTPS is required for browser cryptography except on localhost.
- For public production use, add per-member authentication, rate limiting, audit logs, robust sync/merge, encrypted backup and recovery, and independent security review.
