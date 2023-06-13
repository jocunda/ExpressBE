const { Router } = require("express");
const jwt = require("jsonwebtoken");

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
    //save token
    request.session.token = jwtToken;

    response.json({
      message: "Welcome Back!",
      user: userDB[0].username,
    });
  } catch (err) {
    console.log("Error: ", err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/register", async (request, response) => {
  const { username, password, email } = request.body;

  if (!username || !password || !email) {
    return response
      .status(400)
      .json({ message: "Username, email and password are required!" });
  }

  try {
    const [rows] = await db
      .promise()
      .query(`SELECT * FROM USERS WHERE username = ? OR email=?`, [
        username,
        email,
      ]);

    if (rows.length > 0) {
      const existingUser = rows.find(
        (row) => row.username === username || row.email === email
      );
      if (existingUser.username === username) {
        return response
          .status(400)
          .json({ message: "Username already exists!" });
      }
      if (existingUser.email === email) {
        return response.status(400).json({ message: "Email already exists!" });
      }
    }

    await db
      .promise()
      .query(`INSERT INTO USERS (username, password, email) VALUES (?, ?, ?)`, [
        username,
        password,
        email,
      ]);
    response.json({ message: "Created User" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/changePassword", async (request, response) => {
  const token = request.session.token;
  if (!token) return response.sendStatus(401);

  const { oldPassword, newPassword, confirmNewPassword, username } =
    request.body;
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    return response
      .status(400)
      .json({ message: "Current password and new password are required!" });
  }

  if (oldPassword == newPassword) {
    return response.status(400).json({
      message: "New password cannot be the same as current password.",
    });
  }

  if (newPassword !== confirmNewPassword) {
    return response.status(400).json({ message: "New passwords do not match" });
  }

  try {
    const [rows] = await db
      .promise()
      .query(`SELECT password FROM users WHERE username = ?`, [username]);

    if (rows.length === 0) {
      return response.status(404).json({ message: "User not found" });
    }

    const savedPassword = rows[0].password;

    // Compare the oldPassword with the savedPassword in the database
    if (oldPassword !== savedPassword) {
      return response.status(400).json({ message: "Invalid old password" });
    }

    await db
      .promise()
      .query(`UPDATE users SET password = ? WHERE username = ?`, [
        newPassword,
        username,
      ]);
    response.json({ message: "Password changed successfully" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Failed to change password" });
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
