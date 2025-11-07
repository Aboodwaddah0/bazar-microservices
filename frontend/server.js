import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const CATALOG_URL = "http://localhost:3001";
const ORDER_URL = "http://localhost:3002";

// GET /search/:topic -> proxy to catalog search
app.get("/search/:topic", async (req, res) => {
  try {
    const topic = encodeURIComponent(req.params.topic);
    const r = await axios.get(`${CATALOG_URL}/search/${topic}`);
    res.json(r.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to get search results" });
  }
});

// GET /info/:id -> proxy to catalog info
app.get("/info/:id", async (req, res) => {
  try {
    const r = await axios.get(`${CATALOG_URL}/info/${req.params.id}`);
    res.json(r.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to get item info" });
  }
});

// POST /purchase/:id -> frontend forwards to order service
app.post("/purchase/:id", async (req, res) => {
  try {
    const r = await axios.post(`${ORDER_URL}/purchase/${req.params.id}`);
    res.json(r.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: "Purchase failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frontend Service running on port ${PORT}`));
