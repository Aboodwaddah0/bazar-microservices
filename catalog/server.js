import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// open connection to SQLite database
const dbPromise = open({
  filename: "./catalog.db",
  driver: sqlite3.Database,
});

async function initDB() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      title TEXT,
      quantity INTEGER,
      price REAL,
      topic TEXT
    )
  `);
}
initDB();

async function seedDB() {
  const db = await dbPromise;
  const count = await db.get("SELECT COUNT(*) as c FROM books");
  if (count.c === 0) {
    await db.run("INSERT INTO books (title, quantity, price, topic) VALUES (?, ?, ?, ?)", "How to get a good grade in DOS in 40 minutes a day", 5, 20, "distributed systems");
    await db.run("INSERT INTO books (title, quantity, price, topic) VALUES (?, ?, ?, ?)", "RPCs for Noobs", 5, 25, "distributed systems");
    await db.run("INSERT INTO books (title, quantity, price, topic) VALUES (?, ?, ?, ?)", "Xen and the Art of Surviving Undergraduate School", 5, 15, "undergraduate school");
    await db.run("INSERT INTO books (title, quantity, price, topic) VALUES (?, ?, ?, ?)", "Cooking for the Impatient Undergrad", 5, 12, "undergraduate school");
  }
}
seedDB();



const app = express();
app.use(express.json());

// /search/:topic
app.get("/search/:topic", async (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic).toLowerCase();
    const db = await dbPromise;
    const items = await db.all(
      "SELECT id, title FROM books WHERE LOWER(topic) = ?",
      topic
    );
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});


// /info/:id
app.get("/info/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = await dbPromise;
    const item = await db.get("SELECT * FROM books WHERE id = ?", id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});


// /update/:id

// Body: { quantity_delta: -1 }  OR { price: 60 }  OR { set_quantity: 10 }

app.put("/update/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { quantity_delta, price, set_quantity } = req.body || {};
    const db = await dbPromise;

    const item = await db.get("SELECT * FROM books WHERE id = ?", id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    let newQuantity = item.quantity;

    if (typeof quantity_delta === "number") {
      newQuantity += quantity_delta;
      if (newQuantity < 0) return res.status(400).json({ error: "Not enough stock" });
    }

    if (typeof set_quantity === "number") newQuantity = set_quantity;

    const newPrice = typeof price === "number" ? price : item.price;

    await db.run("UPDATE books SET quantity = ?, price = ? WHERE id = ?", newQuantity, newPrice, id);

    const updated = await db.get("SELECT * FROM books WHERE id = ?", id);
    res.json({ success: true, item: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});


const PORT = process.env.PORT || 3001;

(async () => {
  await initDB();
  await seedDB();
  app.listen(PORT, () => console.log(`Catalog Service running on port ${PORT}`));
})();

     
