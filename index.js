const express = require("express");
const session = require("express-session");
require("dotenv").config();

const app = express();
const PORT = 4001;

//routes
const authRoute = require("./src/routes/auth");
const itemsRoute = require("./src/routes/items");
const inventoriesRoute = require("./src/routes/inventories");

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,UPDATE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  next();
});

//send data type to server
const oneDay = 24 * 60 * 60 * 1000;
const maxAge = 2 * oneDay;

app.use(express.json());
app.use(express.urlencoded());
app.use(
  session({
    name: "connect",
    secret:
      "40052b8c1de87b7bd00f1f124a75fa14c78245a2b267c708488eabcc43f0075a249a8afd256a91572d694c9f20b440b3315fdf1ae096d4c88bcbfe8c6f6852c5",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: maxAge,
    },
  })
);

app.use((request, response, next) => {
  console.log(`${request.method}:${request.url}`);
  next();
});

app.use("/api/auth", authRoute);
app.use("/api/items", itemsRoute);
app.use("/api/inventories", inventoriesRoute);

app.listen(PORT, () => console.log(`Running Express Server on Port ${PORT}!`));
