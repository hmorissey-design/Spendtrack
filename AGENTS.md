# AGENTS.md

## Project Deployment & Monetization Context
Key decisions and hosting/monetization strategies for ExpenseTrack are documented in [`DEPLOYMENT_NOTES.md`](./DEPLOYMENT_NOTES.md).

* **Hosting:** GitHub source connected to Vercel or Google Cloud Run.
* **DNS:** DreamHost CNAME record (`app.yourdomain.com`).
* **Monetization & Taxes:** Lemon Squeezy as Merchant of Record (handles Canadian GST/HST and global VAT).
* **PWA:** Web-based PWA distribution bypassing app store API compliance requirements.
