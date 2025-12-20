import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function showBooks() {
  const db = await open({
    filename: "./catalog.db",
    driver: sqlite3.Database,
  });

  const books = await db.all("SELECT * FROM books");

  console.log("Books in catalog:");
  books.forEach(book => {
    console.log(`${book.id}: ${book.title} - ${book.quantity} pcs - $${book.price}`);
  });

  await db.close();
}

showBooks().catch(console.error);
