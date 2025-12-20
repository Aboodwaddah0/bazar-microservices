const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Maximum number of items allowed in the cache
const MAX_CACHE_SIZE = 3;

// List of Catalog Service replicas (Replication)
const CATALOG_REPLICAS = [
  "http://localhost:3001",
  "http://localhost:3003"
];

// List of Order Service replicas (Replication)
const ORDER_REPLICAS = [
  "http://localhost:3002",
  "http://localhost:3004"
];

// Indexes used for Round Robin load balancing
let catalogIndex = 0;
let orderIndex = 0;

// Select next Catalog replica using Round Robin
function nextCatalog() {
  const url = CATALOG_REPLICAS[catalogIndex];
  catalogIndex = (catalogIndex + 1) % CATALOG_REPLICAS.length;
  return url;
}

// Select next Order replica using Round Robin
function nextOrder() {
  const url = ORDER_REPLICAS[orderIndex];
  orderIndex = (orderIndex + 1) % ORDER_REPLICAS.length;
  return url;
}

// In-memory cache 
const cache = new Map();

// Update cache using LRU (Least Recently Used) policy
function updateCache(key, value) {

  if (cache.has(key)) {
    cache.delete(key);
  }
  // Insert the new item
  cache.set(key, value);

  // Evict least recently used item if cache exceeds max size
  if (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    console.log("LRU Evicting book", oldestKey);
    cache.delete(oldestKey);
  }
}


// Search books by topic (Read-only request)
app.get("/search/:topic", async (req, res) => {
  try {
    // Forward request to one of the catalog replicas
    const catalog = nextCatalog();
    const r = await axios.get(`${catalog}/search/${req.params.topic}`);
    res.json(r.data);
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

// Get book information by ID (Cached request)
app.get("/info/:id", async (req, res) => {
  const id = req.params.id;

  if (cache.has(id)) {
    console.log("CACHE HIT");
    return res.json(cache.get(id));
  }

  try {
    // Cache miss: forward request to a catalog replica
    const catalog = nextCatalog();
    console.log("CACHE MISS →", catalog);

    const r = await axios.get(`${catalog}/info/${id}`);

    // Store response in cache
    updateCache(id, r.data);
    res.json(r.data);
  } catch {
    res.status(500).json({ error: "Info failed" });
  }
});

// Purchase request (Write operation)
// Forwarded to one of the Order Service replicas
app.post("/purchase/:id", async (req, res) => {
  try {
    const order = nextOrder();
    const r = await axios.post(`${order}/purchase/${req.params.id}`);
    res.json(r.data);
  } catch {
    res.status(500).json({ error: "Purchase failed" });
  }
});

// Cache invalidation endpoint
// Called by Order Service after a write operation
app.post("/invalidate/:id", (req, res) => {
  const id = req.params.id;

  // Remove item from cache if it exists
  if (cache.has(id)) {
    console.log("Cache invalidated for book", id);
    cache.delete(id);
  }

  res.json({ success: true });
});

// Start Frontend server
app.listen(3000, () =>
  console.log("Frontend running on port 3000")
);
