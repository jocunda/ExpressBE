const { Router } = require("express");
const jwt = require("jsonwebtoken");

const router = Router();
const db = require("../database/database");

router.get("/items", async (request, response) => {
  const token = request.session.token;

  if (!token) return response.sendStatus(401);

  try {
    const [userDB] = await db
      .promise()
      .query("SELECT username, email FROM users WHERE username = ?", [
        username,
      ]);
    const user = {
      username: userDB[0].username,
      email: userDB[0].email,
    };
    response.status(200).send(user);
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
