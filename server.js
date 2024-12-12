require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Utility function to create HMAC SHA256 signature
const createSignature = (data, key) => {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
};

// Helper function to generate X-VERIFY header
const generateXVerify = (payloadString) => {
  const key = process.env.SALT_KEY; // Salt Key from PhonePe dashboard
  const checksum = crypto.createHash("sha256").update(payloadString + key).digest("hex");
  return checksum + "###" + process.env.SALT_INDEX; // Append Salt Index
};

// Payment initiation endpoint
app.post("/initiate-payment", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    console.log("Initiating payment...");
    console.log("Request body:", req.body);

    // Create payment payload
    const payload = {
      merchantId: process.env.MERCHANT_ID,
      transactionId: `TXN_${Date.now()}`,
      amount: 15000, // Amount in paise
      currency: "INR",
      redirectUrl: process.env.REDIRECT_URL,
      callbackUrl: process.env.REDIRECT_URL,
    };

    console.log("Payment payload:", payload);

    // Generate X-VERIFY
    const payloadString = JSON.stringify(payload);
    const xVerify = generateXVerify(payloadString);

    console.log("Generated X-VERIFY:", xVerify);

    // Make request to PhonePe API
    const response = await fetch(process.env.PROD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
      },
      body: payloadString,
    });

    const responseText = await response.text();
    console.log("PhonePe Raw Response:", responseText);

    if (response.ok) {
      const result = JSON.parse(responseText);
      if (result.success) {
        console.log("Redirecting to Payment URL:", result.data.paymentUrl);
        res.json({ paymentUrl: result.data.paymentUrl });
      } else {
        console.error("PhonePe API error (not ok):", result.message || "Unknown error");
        res.status(400).json({ error: result.message || "Payment initiation failed" });
      }
    } else {
      console.error("PhonePe API error:", responseText);
      res.status(response.status).json({ error: "PhonePe API issue." });
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});