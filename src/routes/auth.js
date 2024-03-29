const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const db = require("../database/database");
const { hashPassword, comparePassword } = require("../utils/saltHelper");

router.post("/login", async (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    return response
      .status(400)
      .json({ message: "Username and password are required!" });
  }

  try {
    const [userDB] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (!userDB.length)
      return response
        .status(400)
        .json({ message: "Email or password does not match!" });

    const passValid = comparePassword(password, userDB[0].password);
    if (!passValid)
      return response
        .status(400)
        .json({ message: "Email or password does not match!" });

    const jwtToken = jwt.sign(
      { user: userDB[0].username },
      process.env.JWT_SECRET
    );

    userDB[0].password = undefined;
    //save token and username
    request.session.token = jwtToken;
    request.session.user = userDB[0].username;

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
    const [rows] = await db.query(
      `SELECT * FROM users WHERE username = ? OR email=?`,
      [username, email]
    );

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
    const hashedPassword = hashPassword(password);

    let userId;
    do {
      userId = uuidv4();
      try {
        await db.query(
          `INSERT INTO users (username, password, email, id) VALUES (?, ?, ?, ?)`,
          [username, hashedPassword, email, userId]
        );
      } catch (err) {
        // If the insertion results in a duplicate userId (primary key violation), generate a new userId
        if (err.code === "ER_DUP_ENTRY") {
          userId = null; // Set it to null to loop and try again
        } else {
          throw err; // Throw other errors for proper error handling
        }
      }
    } while (!userId);

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
    const [rows] = await db.query(
      `SELECT password FROM users WHERE username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return response.status(404).json({ message: "User not found" });
    }

    const savedPassword = rows[0].password;

    // Compare the oldPassword with the savedPassword in the database
    if (oldPassword !== savedPassword) {
      return response.status(400).json({ message: "Invalid old password" });
    }

    await db.query(`UPDATE users SET password = ? WHERE username = ?`, [
      newPassword,
      username,
    ]);
    response.json({ message: "Password changed successfully" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Failed to change password" });
  }
});

router.delete("/logout", async (request, response) => {
  response.clearCookie("connect");
  if (request.session) {
    request.session.destroy((error) => {
      if (error) {
        res.status(400).send("Error to log out");
      } else {
        response.json({ message: "Good Bye!" });
      }
    });
  }
});

router.get("/username", async (request, response) => {
  console.log("Inside user check middleware");
  const username = request.session.user;
  const token = request.session.token;

  if (!token) return response.sendStatus(401);

  try {
    const [userDB] = await db.query(
      "SELECT username, email FROM users WHERE username = ?",
      [username]
    );
    const user = {
      username: userDB[0].username,
      email: userDB[0].email,
    };
    response.status(200).send(user);
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
  //leftjoin table employee
});

module.exports = router;
