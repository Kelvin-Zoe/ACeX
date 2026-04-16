import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// Note: You need to provide FIREBASE_SERVICE_ACCOUNT as a JSON string in your environment variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found. Server-side Firestore updates will fail.");
}

const db = admin.apps.length ? admin.firestore() : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Paystack Initialize Transaction
  app.post("/api/paystack/initialize", async (req, res) => {
    const { email, amount, metadata } = req.body;
    
    try {
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount: amount * 100, // Paystack expects amount in kobo
          metadata,
          callback_url: `${process.env.APP_URL}/profile`
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Paystack Initialize Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to initialize transaction" });
    }
  });

  // Paystack Verify Transaction
  app.get("/api/paystack/verify/:reference", async (req, res) => {
    const { reference } = req.params;

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const data = response.data.data;

      if (data.status === "success" && db) {
        const userId = data.metadata.userId;
        const amount = data.amount / 100;

        // Update user balance in Firestore
        const userRef = db.collection("users").doc(userId);
        await db.runTransaction(async (t) => {
          const doc = await t.get(userRef);
          if (doc.exists) {
            const currentBalance = doc.data()?.walletBalance || 0;
            t.update(userRef, { walletBalance: currentBalance + amount });
          }
        });

        res.json({ status: "success", amount });
      } else {
        res.json({ status: "failed", message: data.gateway_response });
      }
    } catch (error: any) {
      console.error("Paystack Verify Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to verify transaction" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
