import express from "express";
import fs from "fs/promises";
import path from "path";

const app = express();
app.use(express.json());

const DATA_FILE = path.join(process.cwd(), "catalog.json");

async function readCatalog() {
  const txt = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(txt);
}
async function writeCatalog(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// /search/:topic
app.get("/search/:topic", async (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic).toLowerCase();
    const catalog = await readCatalog();
    const items = catalog.filter(item => item.topic.toLowerCase() === topic)
      .map(({ id, title }) => ({ id, title }));
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
    const catalog = await readCatalog();
    const item = catalog.find(it => it.id === id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ title: item.title, quantity: item.quantity, price: item.price, topic: item.topic });
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
    const catalog = await readCatalog();
    const idx = catalog.findIndex(it => it.id === id);
    if (idx === -1) return res.status(404).json({ error: "Item not found" });

    if (typeof quantity_delta === "number") {
      catalog[idx].quantity += quantity_delta;
      if (catalog[idx].quantity < 0) {
        return res.status(400).json({ error: "Not enough stock" });
      }
    }
    if (typeof set_quantity === "number") {
      catalog[idx].quantity = set_quantity;
    }
    if (typeof price === "number") {
      catalog[idx].price = price;
    }

    await writeCatalog(catalog);
    res.json({ success: true, item: catalog[idx] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Catalog Service running on port ${PORT}`));
     
