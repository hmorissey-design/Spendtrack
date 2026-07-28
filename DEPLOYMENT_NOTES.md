# 🚀 ExpenseTrack - Production Deployment & Monetization Roadmap

> **Note for Future Reference:** This file records our strategic decisions regarding hosting, domain setup, global tax compliance (GST/HST), and monetization when you are ready to launch publicly.

---

## 📌 1. Hosting Architecture & Domain Setup

### **Where code lives:**
* **GitHub Repository:** Primary source code host and automated deployment trigger.
* **Hosting Provider (Vercel or Cloud Run):**
  * **Vercel (Recommended for frontend/PWA):** Zero-maintenance, free tier, automatic SSL, direct GitHub sync.
  * **Google Cloud Run:** Scale-to-zero container hosting, 2 million free requests/month, excellent reliability.

### **DreamHost Domain & DNS Integration:**
* **Recommended approach (CNAME Subdomain):**
  * In DreamHost DNS, add a `CNAME` record pointing `app.yourdomain.com` directly to Vercel (`cname.vercel-dns.com`) or Cloud Run.
  * **Why:** Running directly on your subdomain preserves full **PWA capabilities** (offline caching, "Add to Home Screen" prompt, service workers) and SSL security without URL masking or broken iframe headers.

---

## 💳 2. Monetization & Tax Compliance (GST/HST & Global VAT)

### **Merchant of Record (MoR): Lemon Squeezy**
* **Why Lemon Squeezy:** Acts as the official Merchant of Record.
* **Tax Automation:** Automatically calculates, collects, and remits local taxes worldwide—including Canadian GST/HST, state sales taxes, and European VAT.
* **Billing Models Supported:**
  * One-time lifetime purchase key
  * Monthly or annual recurring subscriptions
* **Implementation:** Embed a simple Lemon Squeezy checkout popup/overlay or redirect user to a secure payment page upon sign-up.

---

## 📱 3. Platform & Compliance Notes

* **AI Studio `.ai.studio` URL:**
  * Perfect for previewing and prototyping.
  * Preview sharing has a 100-user limit, so public production traffic should run on Vercel or Cloud Run with your own domain.
* **Google Play Android Target API Warning:**
  * **Does NOT affect your app** if distributed as a web-based Progressive Web App (PWA) accessed via browser.
  * Only applies if uploading compiled `.apk` / `.aab` bundles directly to the Google Play Store console.

---

## ✅ 4. Quick Execution Checklist (When Ready)

1. [ ] **Deploy Repo:** Connect your GitHub repo to a Vercel project or Google Cloud Run.
2. [ ] **Setup DNS:** In DreamHost, set up a `CNAME` record (`app.yourdomain.com`).
3. [ ] **Setup Lemon Squeezy:** Create your product/subscription in Lemon Squeezy and copy the checkout link/script into the app.
4. [ ] **Verify PWA:** Confirm manifest, service worker, and install prompt function smoothly on the custom domain.
