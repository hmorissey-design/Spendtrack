# 🚀 LooseBudget (`loosebudget.com`) - Production Deployment, Subscription & PWA Roadmap

> **Note for Future Reference:** This document details the step-by-step rollout plan for launching LooseBudget on `loosebudget.com`, including the 35-day free trial, subscription plans, PWA phone installation, and DreamHost domain setup.

---

## 📅 Step-by-Step Rollout Order

### **Step 1: Domain & Hosting Setup (`loosebudget.com`)**
1. **Host Frontend:** Deploy code to **Vercel** or **Google Cloud Run** connected directly to your GitHub repo.
2. **DreamHost DNS Configuration:**
   * **Option A (Main Domain):** Set up `A` / `CNAME` records in DreamHost for `loosebudget.com` pointing to Vercel/Cloud Run.
   * **Option B (App Subdomain - Recommended for web + app structure):** Set `app.loosebudget.com` via `CNAME` pointing to Vercel (`cname.vercel-dns.com`).
3. **Verify SSL:** Ensure HTTPS is active (Vercel automatically issues free SSL certificates).

---

## 🔒 Step 2: Authentication & 35-Day Free Trial Logic
1. **Firebase / Auth Provider Integration:**
   * Users register when first opening the app (e.g., Email/Password or Google Sign-In).
2. **Persistent Login Sessions:**
   * Store JWT / auth tokens in persistent storage (IndexedDB / LocalStorage) so users **stay logged in indefinitely** on their phone unless they explicitly log out or change devices.
3. **35-Day Trial Engine:**
   * On registration, set `trialStartDate = now()`.
   * Grant 35 full days of access (allows user to track 1 full calendar month + perform end-of-month savings reconciliation).
   * Display a subtle banner showing trial status (e.g., "Trial: 22 days left").

---

## 💳 Step 3: Subscription & Billing Integration (Lemon Squeezy)
1. **Configure Merchant of Record (Lemon Squeezy):**
   * Set up products & tax settings (handles GST/HST/VAT automatically).
   * **Tier Options:**
     * **Monthly Subscription** (e.g., $4.99/mo)
     * **Yearly Subscription** (e.g., $39.99/yr)
     * **Lifetime License** (e.g., $99 one-time)
2. **Post-Trial Paywall Gate:**
   * When `currentDate > trialStartDate + 35 days` and `user.isSubscribed === false`, show the subscription modal.
3. **Webhook Sync:**
   * Connect Lemon Squeezy webhooks to mark `user.isSubscribed = true` in Firestore/Database upon purchase.

---

## 📱 Step 4: Phone App Experience (PWA & Installation)
1. **Web-Based PWA Distribution:**
   * Users navigate to `loosebudget.com` (or `app.loosebudget.com`) on iOS Safari or Android Chrome.
2. **Install Prompt:**
   * Android Chrome shows the **"Install App"** prompt directly or via the app's in-ui **Install App** button.
   * iOS Safari users tap **Share → Add to Home Screen**.
3. **Standalone App Feel:**
   * Opens full-screen without browser URL bars, works offline, and keeps the user signed in continuously.

---

## 📋 Execution Checklist

- [ ] Connect GitHub repo to Vercel / Cloud Run
- [ ] Configure DreamHost DNS for `loosebudget.com` / `app.loosebudget.com`
- [ ] Enable Firebase Auth / Persistent Session token storage
- [ ] Implement 35-day trial expiration counter & database field
- [ ] Set up Lemon Squeezy subscription products (Monthly, Annual, Lifetime)
- [ ] Add post-trial Paywall overlay triggered on Day 36
- [ ] Test PWA "Add to Home Screen" & offline caching on iOS and Android

---

## ❓ Frequently Asked Questions

### **Is "Add to Home Screen" the same as the "Install App" button in the app?**
**Yes, conceptually they achieve the exact same result!**

* **On Android / Chrome:** When the browser supports PWA installation, clicking the in-app **Install App** button triggers Chrome's native install dialog. Accepting it creates a standalone app icon on the Android home screen/app drawer.
* **On iOS / Safari (iPhone/iPad):** Apple restricts websites from automatically triggering an install modal with code. The in-app **Install App** button on iPhone opens a clean guide instructing the user to tap Safari's **Share** icon and select **"Add to Home Screen"**.
* **Result in both cases:** The app runs as a **standalone, full-screen app** without browser address bars, loads quickly from offline cache, and keeps user credentials saved across app launches.

