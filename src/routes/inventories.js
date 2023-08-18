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

router.get("/inventorieslist/:itemId", async (request, response) => {
  const token = request.session.token;
  const { itemId } = request.params;

  if (!token) return response.sendStatus(401);

  try {
    const results = await db.query(
      `SELECT 
      inv.id, inv.no, inv.memo, inv.qty, inv.photoId,
      item.id AS itemId, item.value AS itemValue,
      pos.targetId AS positionTargetId, pos.createdById AS positionCreatedById, emp.name AS employeeName,
      pos.preOwnerId AS positionPreOwnerId, pos.startDate AS positionStartDate
      FROM expressjs.inventories inv 
      LEFT JOIN expressjs.items item ON inv.itemId=item.id
      LEFT JOIN expressjs.positions pos ON inv.positionId=pos.id
      LEFT JOIN expressjs.employees emp ON pos.createdById=emp.id
      WHERE itemId = ?`,
      [itemId]
    );
    response.status(200).send(results[0]);
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

// router.get("/:itemId", async (request, response) => {
//   const token = request.session.token;
//   const { itemId } = request.params;

//   if (!token) return response.sendStatus(401);

//   try {
//     const [item] = await db.query(`SELECT * FROM items WHERE id = ?`, [itemId]);

//     response.status(200).json(item[0]);
//   } catch (err) {
//     console.log(err);
//     response.status(500).json({ message: "Internal Server Error" });
//   }
// });

router.post("/addInventory", async (request, response) => {
  const token = request.session.token;
  if (!token) return response.sendStatus(401);

  const { code, quantity, memo, itemId } = request.body;
  if (!code || !quantity || !itemId) {
    return response
      .status(400)
      .json({ message: "Code, quantity and itemId of Inventory is required!" });
  }

  try {
    const [rows] = await db.query(`SELECT * FROM inventories WHERE no = ?`, [
      code,
    ]);

    if (rows.length > 0) {
      return response
        .status(409)
        .json({ message: "Inventory with the same code already exists!" });
    }

    let inventoryId;
    do {
      inventoryId = uuidv4();
      try {
        await db.query(
          `INSERT INTO inventories (id, no, qty, memo, itemId) VALUES (?, ?, ?, ?, ?)`,
          [inventoryId, code, quantity, memo, itemId]
        );

        //to update deleteable inside item
        await db.query(`
          UPDATE items as leftItems, 
          (
            SELECT a.id,
              CASE
                WHEN count(b.id)= 0 THEN true
                ELSE false
              END as deleteable 
            FROM items as a 
            LEFT JOIN inventories as b 
            ON a.id = b.itemId
            GROUP BY a.id
          ) as rightItems 
          SET leftItems.deleteable = rightItems.deleteable 
          WHERE leftItems.id = rightItems.id;
        `);
      } catch (err) {
        // If the insertion results in a duplicate itemId (primary key violation), generate a new itemId
        if (err.code === "ER_DUP_ENTRY") {
          inventoryId = null; // Set it to null to loop and try again
        } else {
          throw err; // Throw other errors for proper error handling
        }
      }
    } while (!inventoryId);

    response.json({ message: "Inventory added successfully" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Failed to add inventory" });
  }
});

module.exports = router;
