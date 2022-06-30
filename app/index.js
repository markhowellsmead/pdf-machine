const app = express();

app.get("/", (request, response) => {
  res.send("Hello World");
});
