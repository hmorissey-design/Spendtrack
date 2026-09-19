var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "loosebudget-5edf8",
  appId: "1:410589318670:web:a4f3dc80c87e6d86e9365f",
  apiKey: "AIzaSyAivYrsocXyLbqxa3ZC0UhTPRRAk0ul89I",
  authDomain: "loosebudget-5edf8.firebaseapp.com",
  storageBucket: "loosebudget-5edf8.firebasestorage.app",
  messagingSenderId: "410589318670"
};

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var firebaseApp = !(0, import_app.getApps)().length ? (0, import_app.initializeApp)(firebase_applet_config_default) : (0, import_app.getApp)();
var db = (0, import_firestore.getFirestore)(firebaseApp);
app.use(import_express.default.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.post("/api/lemon-squeezy-webhook", async (req, res) => {
  try {
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "CoverdaleCancun";
    const signature = req.headers["x-signature"];
    if (webhookSecret && signature) {
      const hmac = import_crypto.default.createHmac("sha256", webhookSecret);
      const digest = Buffer.from(hmac.update(req.rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(Array.isArray(signature) ? signature[0] : signature, "utf8");
      if (digest.length !== signatureBuffer.length || !import_crypto.default.timingSafeEqual(digest, signatureBuffer)) {
        console.warn("\u26A0\uFE0F Invalid Lemon Squeezy Webhook Signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }
    const payload = req.body;
    const meta = payload?.meta || {};
    const eventName = meta.event_name;
    const data = payload?.data || {};
    const attributes = data.attributes || {};
    const rawEmail = attributes.user_email || attributes.customer_email || attributes.order_user_email;
    if (!rawEmail) {
      console.log(`\u2139\uFE0F Webhook event '${eventName}' received without user email.`);
      return res.status(200).json({ status: "ignored_no_email" });
    }
    const email = String(rawEmail).toLowerCase().trim();
    const isCancelled = eventName === "subscription_cancelled" || eventName === "subscription_expired";
    const status = isCancelled ? "cancelled" : "active";
    const variantName = String(attributes.variant_name || "").toLowerCase();
    const itemName = String(attributes.first_order_item?.variant_name || "").toLowerCase();
    const tier = variantName.includes("monthly") || itemName.includes("monthly") ? "monthly" : "yearly";
    console.log(`\u26A1 Processing Lemon Squeezy Webhook: '${eventName}' for ${email} (Status: ${status}, Tier: ${tier})`);
    const subRef = (0, import_firestore.doc)(db, "subscriptions", email);
    await (0, import_firestore.setDoc)(subRef, {
      email,
      status,
      tier,
      eventName: eventName || "order_created",
      orderId: String(data.id || attributes.order_id || ""),
      updatedAt: Date.now()
    }, { merge: true });
    return res.status(200).json({ success: true, email, status, tier });
  } catch (error) {
    console.error("\u274C Error handling Lemon Squeezy Webhook:", error);
    return res.status(500).json({ error: "Internal server error processing webhook" });
  }
});
app.post("/api/check-subscription-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const subRef = (0, import_firestore.doc)(db, "subscriptions", normalizedEmail);
    const snap = await (0, import_firestore.getDoc)(subRef);
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
  } catch (error) {
    console.error("\u274C Error checking subscription by email:", error);
    return res.status(500).json({ error: "Failed to query subscription status" });
  }
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} LooseBudget Server running on http://0.0.0.0:${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map
