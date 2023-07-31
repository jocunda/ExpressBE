const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const db = require("../database/database");

//auth route
router.use((request, response, next) => {
  console.log("Inside items check middleware");
  const token = request.session.token;

  if (!token) return response.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
    if (err) {
      console.log(err);
      return response.sendStatus(403);
    }
    request.user = decodedToken.user;
    next();
  });
});

router.get("/itemlist", async (request, response) => {
  const token = request.session.token;

  if (!token) return response.sendStatus(401);

  try {
    const results = await db.query("SELECT * FROM items");
    response.status(200).send(results[0]);
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:itemId", async (request, response) => {
  const token = request.session.token;
  const { itemId } = request.params;

  if (!token) return response.sendStatus(401);

  try {
    const [item] = await db.query(`SELECT * FROM items WHERE id = ?`, [itemId]);

    response.status(200).json(item[0]);
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/addItem", async (request, response) => {
  const token = request.session.token;
  if (!token) return response.sendStatus(401);

  const { value, code, description } = request.body;
  if (!value || !code) {
    return response
      .status(400)
      .json({ message: "Name and code of Item is required!" });
  }

  try {
    const [rows] = await db.query(`SELECT id FROM items WHERE value = ?`, [
      value,
    ]);

    if (rows.length > 0) {
      return response
        .status(409)
        .json({ message: "Item with the same value already exists!" });
    }

    let itemId;
    do {
      itemId = uuidv4();
      try {
        await db.query(
          `INSERT INTO items (id, value, code, description) VALUES (?, ?, ?, ?)`,
          [itemId, value, code, description]
        );
      } catch (err) {
        // If the insertion results in a duplicate itemId (primary key violation), generate a new itemId
        if (err.code === "ER_DUP_ENTRY") {
          itemId = null; // Set it to null to loop and try again
        } else {
          throw err; // Throw other errors for proper error handling
        }
      }
    } while (!itemId);

    response.json({ message: "Item added successfully" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Failed to add item" });
  }
});

module.exports = router;
