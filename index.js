const express = require("express");
const cors = require('cors');
require("dotenv").config();
const db = require("./database")
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { v4:uuidv4 } = require("uuid");
const { validate:uuidValidate} = require("uuid");

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
    const user = await db.User.findOne({where: {username},raw: true});
    return user;
  } catch (error) {
    console.error('Error querying user:', error);
    throw error;
  }
}

async function findProduct(id) {
  try{
    const product = await db.Product.findOne({where: {
      id
    },raw: true});
    return product;
  } catch (error) {
    console.error('Error querying product:', error);
    throw error;
  }
}

function isProductExistInOrder(product_id,order) {
  let isExist = false
  let q = undefined
  for (let i = 0; i < order.length; i++) {
    if (order[i].product_id == product_id) {
      isExist = true;
      q=order[i].product_quantity
      break; // This will exit the loop
    }
  }
  return {isExist,q};
}

app.post("/register", async(req, res) => {
  try{
    const { username, password } = req.body;
    if (!username || !password){
      return res.status(400).send("Invalid payload");
    }

    const user = await findUser(username);
    if(user.length){
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

app.post("/product", authentication, async(req,res) => {
  try{
    const { name, description, quantity } = req.body;
    if(!name || !quantity){
      return res.status(401).send("Invalid product information.");
    }

    const product = await db.Product.findOne({where: {
      name,
    },raw: true});

    if(product.length){
      return res.status(401).send("Product with this name already exists.")
    }

    await db.Product.create({
      name,
      description,
      quantity
    })

    return res.status(201).send("New Product added.");
  }
  catch(error){
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
});

app.put("/product", authentication, async(req,res) => {
  try{
    const { id, description, quantity } = req.body;
    if(!id  || !(quantity || description)){
      return res.status(401).send("Invalid product information.");
    }
    const product = await findProduct(id);
    if(!product){
      return res.status(401).send("Product does not exists.")
    }

    let updates= {};
    if(description){
      updates["description"] = description
    }
    if(quantity){
      updates["quantity"] = quantity
    }
    await db.Product.update(updates, 
    {
      where : {
        id
      }
    })

    return res.status(200).send("Product updated.");
  }
  catch(error){
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
});

app.delete("/product", authentication, async(req,res) => {
  try{
    const { id }= req.query;
    if(!id){
      return res.status(401).send("Invalid product information.");
    }
    const product = await findProduct(id);
    if(!product){
      return res.status(401).send("Product does not exists.")
    }

    await db.Product.destroy(
    {
      where : {
        id
      }
    })

    return res.status(200).send("Product deleted.");
  }
  catch(error){
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
});

app.post("/order", authentication, async(req,res) => {
  try{
    const { user_id,products } = req.body;
    if(!products){
      return res.status(401).send("Invalid order information.");
    }

    let id_array = []; 
    for(var key in products){
      id_array.push(Number(key));
    }

    const productsInDB = await db.Product.findAll({where: {
      id: id_array,
    },raw: true});

    if(productsInDB.length != id_array.length){
      return res.status(401).send("Product id does not exist")
    }

    productsToBeAdded = []
    filterted_id_array = []
    const o_id = uuidv4();
    productsInDB.forEach( async (p) => {
      if(p.quantity >0  && p.quantity-products[p.id]>=0){
        productsToBeAdded.push({
          order_id: o_id,
          user_id,
          product_id: p.id,
          product_quantity: products[p.id]
        });

        await db.Product.update({
          quantity: p.quantity-products[p.id]
        },{
          where: {
            id: p.id
          }
        })
      }
    })

    await db.Order.bulkCreate(productsToBeAdded)

    return res.status(201).send("New Order added.");
  }
  catch(error){
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
});

app.put("/order", authentication, async(req,res) => {
  try{
    const { order_id, products } = req.body;
    if(!order_id || !products || !uuidValidate(order_id)){
      return res.status(401).send("Invalid 0rder information.");
    }
    const order = await db.Order.findAll({where: {order_id},raw : true});
    if(!order.length){
      return res.status(401).send("Order does not exists.")
    }

    let id_array = []; 
    for(var key in products){
      id_array.push(Number(key));
    }

    const productsInDB = await db.Product.findAll({where: {
      id: id_array,
    },raw: true});

    if(productsInDB.length != id_array.length){
      return res.status(401).send("Product id does not exist")
    }

    const productsInDB_obj = {}
    productsInDB.forEach( (p) => {
      productsInDB_obj[p.id] = p.quantity;
    })
    let productsToBeAdded = []
    id_array.forEach( async(product_id) => {
      const {isExist, q} = isProductExistInOrder(product_id,order)
      
      if(productsInDB_obj[product_id] >0  && productsInDB_obj[product_id]-products[product_id]>=0){

        if(!isExist){
          productsToBeAdded.push({
            order_id: order_id,
            product_id: product_id,
            product_quantity: products[product_id]
          });
        }
        else{
          await db.Order.update({
            product_quantity: products[product_id]
          },{
            where: {
              product_id,
              order_id
            }
          });
        }

        await db.Product.update({
          quantity: productsInDB_obj[product_id]+(q-products[product_id])
        },{
          where: {
            id: product_id
          }
        })
      }
    }
    );

    await db.Order.bulkCreate(productsToBeAdded);

    return res.status(200).send("Order updated");
  }
  catch(error){
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
});

app.delete("/order", authentication, async(req,res) => {
  try{
    const { order_id }= req.query;
    if(!order_id){
      return res.status(401).send("Invalid Order id.");
    }
    const product = await db.Order.findAll({where:{order_id}});
    if(!product.length){
      return res.status(401).send("Order does not exists.")
    }

    product.forEach( async(p) => {
      const q = await db.Product.findOne({
        where:{
          id:p.id,
        },
        attributes:['quantity']
      })
      await db.Product.update({
        quantity: q+p.product_quantity
      },{
        where: {
          id: p.product_id
        }
      });
    });

    await db.Order.destroy(
    {
      where : {
        order_id
      }
    })

    return res.status(200).send("Order deleted.");
  }
  catch(error){
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
});


// this api is just for the task #2(External API Integration). i am using contast locations as dummy exampe for task. can scale for each user differently.
app.get('/shipping',authentication, async (req,res) => {
  const url = 'https://api.aftership.com/tracking/2024-04/trackings';
  const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: '{"tracking":{"slug":"{slug}","title":"Title Name","smses":["+18555072509","+18555072501"],"emails":["email@yourdomain.com","another_email@yourdomain.com"],"order_id":"ID 1234","language":"en","pickup_note":"Reach out to our staffs when you arrive our stores for shipment pickup","origin_city":"Beijing","order_number":"1234","origin_state":"Beijing","order_id_path":"http://www.aftership.com/order_id=1234","custom_fields":{"product_name":"iPhone Case","product_price":"USD19.99"},"delivery_type":"pickup_at_store","tracking_number":"123456789","pickup_location":"Flagship Store","destination_city":"New York City","destination_state":"New York","origin_postal_code":"065001","origin_country_iso3":"CHN","origin_raw_location":"Lihong Gardon 4A 2301, Chaoyang District, Beijing, BJ, 065001, CHN, China","destination_postal_code":"10001","destination_country_iso3":"USA","destination_raw_location":"13th Street, New York, NY, 10011, USA, United States","order_promised_delivery_date":"2019-05-20"}}'
  };

try {
    const response = await fetch(url, options);
    const data = await response.json();
    res.status(200).send(data);
  } catch (error) {
    console.log("Error: ",error);
    return res.status(500).send("Internal Server Error");
  }
})