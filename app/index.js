const express = require("express");

const PORT = Number(process.env.PORT) || 8080;
const app = express();

app.get("/", (request, response) => {
  response.send("Hello World");
});

app.listen(PORT, () => console.log(`node-hello-world listening to ${PORT}!`));
