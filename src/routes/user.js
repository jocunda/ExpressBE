const { Router } = require("express");
const jwt = require("jsonwebtoken");

const router = Router();
const db = require("../database/database");

//auth route
router.use((request, response, next) => {
  console.log("Inside user check middleware");
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

router.post("/register", async (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    return response
      .status(400)
      .json({ message: "Username and password are required!" });
  }

  try {
    const [rows] = await db
      .promise()
      .query(`SELECT * FROM USERS WHERE username = ?`, [username]);

    if (rows.length > 0) {
      return response.status(400).json({ message: "Username already exists!" });
    }

    await db
      .promise()
      .query(`INSERT INTO USERS (username, password) VALUES (?, ?)`, [
        username,
        password,
      ]);

    response.status(201).json({ message: "Created User" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", async (request, response) => {
  const results = await db.promise().query(`SELECT * FROM USERS`);
  console.log(results[0]);
  response.status(200).send(results[0]);
});

module.exports = router;
