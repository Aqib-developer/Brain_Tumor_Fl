
import express from "express";
import pool from "../db/db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    return res.json({
      message: "Welcome to your dashboard!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Dashboard error:", error.message);

    return res.status(500).json({
      message: "An internal server error occurred.",
    });
  }
});

export default router;
