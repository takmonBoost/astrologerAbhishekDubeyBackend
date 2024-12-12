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
const initiatePayment = async (paymentData) => {
  try {
    const response = await fetch(`/api/initiate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();
    if (response.ok) {
      window.location.href = result.paymentUrl;
    } else {
      console.error('Error initiating payment:', result.error);
    }
  } catch (error) {
    console.error('API call failed:', error);
  }
};


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});