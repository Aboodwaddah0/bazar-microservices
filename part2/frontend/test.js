const axios = require("axios");

async function test(n) {
  let total = 0;

  for (let i = 0; i < n; i++) {
    const start = Date.now();
    await axios.get("http://localhost:3000/info/1");
    total += Date.now() - start;
    console.log(total);
  }

  console.log("Average response time:", total / n, "ms");
}



test(10);