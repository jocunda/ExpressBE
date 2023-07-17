const express = require("express");
const jwt = require("jsonwebtoken");

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
    const results = await db.promise().query("SELECT * FROM ITEMS");
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
    const [item] = await db
      .promise()
      .query(`SELECT * FROM ITEMS WHERE id = ?`, [itemId]);

    response.status(200).json(item[0]);
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
