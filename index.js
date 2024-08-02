const express = require("express");
const cors = require('cors');
require("dotenv").config();
const db = require("./database")
const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    return res.send(200);
  } else {
    if (process.env.NODE_ENV != "test") {
      console.log(req.originalUrl);
    }
    return next();
  }
});


app.use(
    cors({
      origin: [
        "http://localhost:4200"
      ],
    })
  );

db.connect();
  
const port = process.env.PORT || 5000;

app.listen(port, () => {
  if (process.env.NODE_ENV != "test") {
    console.log(`Server up and running on port ${port} !`);
  }
});