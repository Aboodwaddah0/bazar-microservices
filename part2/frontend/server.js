const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());


const CATALOG_REPLICAS = [
  "http://localhost:3001",
  "http://localhost:3003"
];


const ORDER_REPLICAS = [
  "http://localhost:3002",
  "http://localhost:3004"
];


let catalogIndex = 0;
let orderIndex = 0;

// select next Catalog replica 
function nextCatalog() {
  const url = CATALOG_REPLICAS[catalogIndex];
  catalogIndex = (catalogIndex + 1) % CATALOG_REPLICAS.length;
  return url;
}

// select next Order replica 
function nextOrder() {
  const url = ORDER_REPLICAS[orderIndex];
  orderIndex = (orderIndex + 1) % ORDER_REPLICAS.length;
  return url;
}

// in memory cache
const cache = new Map();

// update cache using LRU eviction policy
function updateCache(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);

  if (cache.size > 3) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

// read only request (load balanced)
app.get("/search/:topic", async (req, res) => {
  const catalog = nextCatalog();
  const r = await axios.get(`${catalog}/search/${req.params.topic}`);
  res.json(r.data);
});


// cached read request
app.get("/info/:id", async (req, res) => {
  const id = req.params.id;
const start = Date.now();
  if (cache.has(id)) {
     const duration = Date.now() - start;
   console.log(`CACHE HIT | Book ${id} | Time = ${duration} ms`);
    return res.json(cache.get(id)); // cache hit
  }
    console.log("CACHE MISS for book", id);
  const catalog = nextCatalog();
  const r = await axios.get(`${catalog}/info/${id}`);
  updateCache(id, r.data); 
  const duration = Date.now() - start;
  console.log(`CACHE MISS | Book ${id} | Time = ${duration} ms`);// cache miss
  res.json(r.data);
});


// write request forwarded to order replica
app.post("/purchase/:id", async (req, res) => {
  try {
    const order = nextOrder();
    const r = await axios.post(`${order}/purchase/${req.params.id}`);
    res.json(r.data);
  } catch (err) {
    if (err.response) {

      return res.status(err.response.status).json(err.response.data);
    }
    res.status(500).json({ error: "Purchase failed" });
  }
});


// cache invalidation after write operation
app.post("/invalidate/:id", (req, res) => {
  const id = req.params.id;

  if (cache.has(id)) {
    console.log("CACHE INVALIDATED for book", id);
    cache.delete(id);
  } else {
    console.log("INVALIDATE received, but book not in cache", id);
  }

  res.json({ success: true });
});

// start Frontend service
app.listen(3000, () =>
  console.log("Frontend running on port 3000")
);
