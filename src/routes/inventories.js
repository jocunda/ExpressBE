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

router.get("/inventorieslist", async (request, response) => {
  const token = request.session.token;

  if (!token) return response.sendStatus(401);

  try {
    const results = await db.query(`SELECT 
inv.id, inv.no, inv.memo, inv.value, inv.photoId,
item.id, item.value,
pos.targetId, pos.createdById, emp.name,
pos.preOwnerId, pos.startDate
FROM inventories inv 
LEFT JOIN items item ON inv.itemId=item.id
LEFT JOIN positions pos ON inv.positionId=pos.id
LEFT JOIN employees emp ON pos.createdById=emp.id;`);
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

module.exports = router;
