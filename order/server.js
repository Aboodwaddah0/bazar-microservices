const express=require('express');
const axios=require('axios');
const app=express();
const fs = require('fs');

let order=[];
app.post('/purchase/:id',async(req,res)=>
    {
 const id=req.params.id;
try
{

const info= await axios.get(`http://localhost:3001/info/${id}`);
const book=info.data;
 if (book.quantity <= 0)
      return res.status(400).json({ message: ' out of stock' });

 await axios.put(`http://localhost:3001/update/${id}`, {
      quantity: book.quantity - 1 });

  res.json({ message: `Bought book: ${book.title}`, newQuantity: book.quantity - 1 });
}


catch (err) {
    res.status(500).json({ error: 'Error processing purchase' });
  }
   });
    app.listen(3002, () => console.log(' Order Server running on port 3002'));