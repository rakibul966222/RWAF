import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    } catch (error) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error);
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing. Push notifications will not work.");
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    if (!admin.apps.length) {
      return res.status(503).json({ 
        error: "Push notification service is currently unavailable.",
        details: "Firebase Admin is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT in environment variables."
      });
    }
    await admin.messaging().subscribeToTopic(token, "all");
    res.status(200).json({ success: true, message: "Subscribed to topic: all" });
  } catch (error: any) {
    console.error("Subscription error:", error);
    res.status(500).json({ error: "Failed to subscribe", details: error.message });
  }
}
