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
        const timestamp = new Date();
        await db.query(
          `INSERT INTO inventories (id, no, qty, memo, itemId, createdDate) VALUES (?, ?, ?, ?, ?, ?)`,
          [inventoryId, code, quantity, memo, itemId, timestamp]
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

router.delete("/delete/:inventoryId", async (request, response) => {
  const token = request.session.token;
  const { inventoryId } = request.params;

  if (!token) return response.sendStatus(401);

  try {
    const [inventory] = await db.query(
      `SELECT * FROM inventories WHERE id = ?`,
      [inventoryId]
    );

    if (inventory.length === 0) {
      // If the item doesn't exist, return a 404 Not Found status.
      return response.status(404).json({ message: "Inventory not found" });
    }

    await db.query(`DELETE FROM inventories WHERE id = ?`, [inventoryId]);
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
    response.json({ message: "Inventory deleted successfully" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/edit/:inventoryId", async (request, response) => {
  const token = request.session.token;
  const { inventoryId } = request.params;

  if (!token) return response.sendStatus(401);

  const { value, code, description } = request.body;
  if (!value || !code) {
    return response
      .status(400)
      .json({ message: "Name and code of Inventory is required!" });
  }

  try {
    const [currentItemRows] = await db.query(
      `SELECT * FROM items WHERE id = ?`,
      [itemId]
    );

    if (currentItemRows.length === 0) {
      return response.status(404).json({ message: "Item not found!" });
    }

    // Check for existing items with the same value and code but not the same item.
    const [existingRows] = await db.query(
      `SELECT * FROM items WHERE (value = ? OR code = ?) AND id <> ?`,
      [value, code, itemId]
    );

    if (existingRows.length > 0) {
      const existingItem = existingRows[0];
      if (existingItem.value === value) {
        return response
          .status(409)
          .json({ message: "Item with the same value already exists!" });
      }
      if (existingItem.code === code) {
        return response
          .status(409)
          .json({ message: "Item with the same code already exists!" });
      }
    }

    await db.query(
      `UPDATE items SET value=?, code=?, description=? WHERE id=?`,
      [value, code, description, itemId]
    );
    response.json({ message: "Item updated successfully" });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Failed to update item" });
  }
});

module.exports = router;
