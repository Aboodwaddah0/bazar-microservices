const express = require('express');
const axios = require('axios');


const app = express();
app.use(express.json());


const CATALOG_REPLICAS = [
  "http://localhost:3001",
  "http://localhost:3003"
];

// Handle purchase requests (Write operation)
app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;

  try {
    // Fetch book information from a catalog replica
    const info = await axios.get(`http://localhost:3001/info/${id}`);
    const book = info.data;

    // Check if the book is out of stock
    if (book.quantity <= 0) {
      return res.status(400).json({ message: 'out of stock' });
    }


    for (const catalog of CATALOG_REPLICAS) {
      await axios.put(`${catalog}/update/${id}`, {
        set_quantity: book.quantity - 1
      });
    }

    await axios.post(`http://localhost:3000/invalidate/${id}`);


    res.json({
      message: `Bought book: ${book.title}`,
      newQuantity: book.quantity - 1
    });

  } catch (err) {
  
    console.error("ORDER ERROR >>>>>>>>>>>>>>");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Response Data:", err.response.data);
    } else if (err.request) {
      console.error("No response received");
    } else {
      console.error("Error Message:", err.message);
    }

    res.status(500).json({ error: 'Error processing purchase' });
  }
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, () =>
  console.log(`Order Server running on port ${PORT}`)
);
