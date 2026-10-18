import dotenv from "dotenv";
import express from "express";
import pool from "./db/db.js";
import authRoutes from "./routes/auth.routes.js";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import dashboardRoutes from "./routes/dashboard.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import predictionRoutes from "./routes/prediction.routes.js";
import researchRoutes from "./routes/research.routes.js";
import cors from "cors";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("./.env", import.meta.url));
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  throw new Error(`Cannot load backend .env: ${envResult.error.message}`);
}
const SESSION_SECRET = process.env.SESSION_SECRET?.trim();
if (!SESSION_SECRET) throw new Error("SESSION_SECRET is missing from backend/.env");
console.log("Session secret loaded successfully:", true);

const app = express();
const PORT = Number(process.env.PORT) || 5000;
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Local HTTP development only
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(express.json({ limit: "1mb" }));

// Existing endpoints are kept intact.
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ml", mlRoutes);

// New production-style routes for authenticated inference, saved history and research exports.
app.use("/api/predictions", predictionRoutes);
app.use("/api/research", researchRoutes);

app.get("/", (_req, res) => res.send("Register/Login API is running!"));
app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT version() AS server_version,
             current_database() AS database_name,
             inet_server_port() AS server_port
    `);
    res.json({
      message: "Database connection successful",
      database: result.rows[0].database_name,
      version: result.rows[0].server_version,
      port: result.rows[0].server_port,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// Always respond with JSON for multer upload errors.
app.use((error, _req, res, _next) => {
  console.error("NeuroScan API error:", error.message);
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Maximum MRI image size is 10 MB" });
  if (error.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ message: "Upload exactly one file in the image field" });
  res.status(500).json({ message: "An internal server error occurred." });
});
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
