import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Firebase Server Instance
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);

// Middleware for parsing raw JSON body to verify webhook signature
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// API Route: Lemon Squeezy Webhook Receiver
app.post("/api/lemon-squeezy-webhook", async (req: any, res: any) => {
  try {
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || 'CoverdaleCancun';
    const signature = req.headers["x-signature"];

    // Validate Signature if secret is configured
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac("sha256", webhookSecret);
      const digest = Buffer.from(hmac.update(req.rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(Array.isArray(signature) ? signature[0] : signature, "utf8");

      if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
        console.warn("⚠️ Invalid Lemon Squeezy Webhook Signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const payload = req.body;
    const meta = payload?.meta || {};
    const eventName = meta.event_name;
    const data = payload?.data || {};
    const attributes = data.attributes || {};

    // Get customer email from attributes
    const rawEmail = attributes.user_email || attributes.customer_email || attributes.order_user_email;
    if (!rawEmail) {
      console.log(`ℹ️ Webhook event '${eventName}' received without user email.`);
      return res.status(200).json({ status: "ignored_no_email" });
    }

    const email = String(rawEmail).toLowerCase().trim();
    const isCancelled = eventName === "subscription_cancelled" || eventName === "subscription_expired";
    const status = isCancelled ? "cancelled" : "active";
    
    // Determine plan tier (monthly vs yearly)
    const variantName = String(attributes.variant_name || "").toLowerCase();
    const itemName = String(attributes.first_order_item?.variant_name || "").toLowerCase();
    const tier = (variantName.includes("monthly") || itemName.includes("monthly")) ? "monthly" : "yearly";

    console.log(`⚡ Processing Lemon Squeezy Webhook: '${eventName}' for ${email} (Status: ${status}, Tier: ${tier})`);

    // Store in Firestore: subscriptions/{email}
    const subRef = doc(db, "subscriptions", email);
    await setDoc(subRef, {
      email,
      status,
      tier,
      eventName: eventName || "order_created",
      orderId: String(data.id || attributes.order_id || ""),
      updatedAt: Date.now(),
    }, { merge: true });

    return res.status(200).json({ success: true, email, status, tier });
  } catch (error: any) {
    console.error("❌ Error handling Lemon Squeezy Webhook:", error);
    return res.status(500).json({ error: "Internal server error processing webhook" });
  }
});

// API Route: Direct Email Subscription Lookup (Restore PRO Status)
app.post("/api/check-subscription-email", async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const subRef = doc(db, "subscriptions", normalizedEmail);
    const snap = await getDoc(subRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.status === "active") {
        return res.status(200).json({
          found: true,
          isSubscribed: true,
          tier: data.tier || "yearly",
          email: normalizedEmail,
          updatedAt: data.updatedAt
        });
      }
    }

    return res.status(200).json({
      found: false,
      isSubscribed: false,
      email: normalizedEmail
    });
  } catch (error: any) {
    console.error("❌ Error checking subscription by email:", error);
    return res.status(500).json({ error: "Failed to query subscription status" });
  }
});

// Vite Middleware & Static File Handling
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 LooseBudget Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
