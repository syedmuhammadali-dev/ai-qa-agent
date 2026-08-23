// Fixture only — deliberately uses eval() and a CORS wildcard to verify detection.
const express = require("express");
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.post("/run", (req, res) => {
  const result = eval(req.body.expression);
  res.json({ result });
});

module.exports = app;
