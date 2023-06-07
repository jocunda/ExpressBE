const { Router } = require("express");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");

const router = Router();
const db = require("../database/database");

router.post("/login", async (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    return response
      .status(400)
      .json({ message: "Username and password are required!" });
  }

  try {
    const [userDB] = await db
      .promise()
      .query("SELECT * FROM users WHERE username = ?", [username]);

    if (!userDB.length)
      return response
        .status(400)
        .json({ message: "Email or password does not match!" });

    if (userDB[0].password !== password)
      return response
        .status(400)
        .json({ message: "Email or password does not match!" });

    const jwtToken = jwt.sign(
      { user: userDB[0].username },
      process.env.JWT_SECRET
    );

    userDB[0].password = undefined;

    request.session.token = jwtToken;
    response.json({
      message: "Welcome Back!",
      user: userDB[0].username,
      // token: jwtToken,
      // expiration: "",
    });
  } catch (err) {
    console.log("Error: ", err);
    response.status(500).json({ message: "Internal Server Error" });
  }
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

router.get("/username", async (request, response) => {
  console.log("Inside user check middleware");
  const token = request.session.token;

  if (!token) return response.sendStatus(401);

  const results = await db.promise().query(`SELECT * FROM USERS`);
  console.log(results[0]);
  response.status(200).send(results[0]);
});

module.exports = router;
