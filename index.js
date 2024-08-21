const express = require("express");
const cors = require('cors');
require("dotenv").config();
const db = require("./database")
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");


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

app.use(bodyParser.json());

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

function authentication(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    console.log(err);
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function generateAccessToken(username) {
  return jwt.sign({ username: username }, process.env.TOKEN_SECRET, {
    expiresIn: "10d",
  });
}

async function findUser (username) {
  try{
    const user = await db.User.findOne({where: {username}});
    return user;
  } catch (error) {
    console.error('Error querying user:', error);
    throw error;
  }
}

app.post("/register", async(req, res) => {
  try{
    const { username, password } = req.body;
    if (!username || !password){
      return res.status(400).send(" Invalid payload");
    }

    const user = await findUser(username);
    if(user){
      return res.status(400).send("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const currentDate = new Date();
    const futureDate = new Date(currentDate);
    futureDate.setDate(currentDate.getDate() + 1);

    // Create a new user
    await db.User.create({
      username,
      password: hashedPassword,
      codeExpiresOn: futureDate,
      create_timestamp: new Date(),
      update_timestamp: new Date()
    });
    const token = generateAccessToken(username);
    res.status(201).send({
      message: "User registered successfully",
      token: token,
      username
    });
  }
  catch(err){
    console.log("Error: ", err);
    return res.status(500).send(" Internal Server Error");
  }
});

app.get("/login", async(req, res) => {
  const { username, password } = req.body;

  if (!username || !password){
    return res.status(401).send();
  }
  try {
    const user = await findUser(username);

    if (!user) {
      return res.status(401).send("Invalid username or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send("Invalid username or password.");
    }

    if (new Date() <= (user.codeExpiresOn)) {
      const token = generateAccessToken(username);
      return res.status(200).send({
        token: token,
      });
    }

    return res.status(200).send("Login successful.");
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).send("Internal Server Error.");
  }
});