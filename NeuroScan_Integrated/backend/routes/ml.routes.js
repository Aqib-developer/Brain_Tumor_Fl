
import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

const FASTAPI_URL =
  process.env.FASTAPI_URL || "http://127.0.0.1:8000";

// Store the MRI temporarily in memory.
// Do not save uploaded images to a public folder.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG and PNG images are allowed.")
      );
    }

    cb(null, true);
  },
});

// Check Express -> FastAPI connection
router.get("/status", requireAuth, async (req, res) => {
  try {
    const response = await fetch(
      `${FASTAPI_URL}/openapi.json`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`FastAPI returned ${response.status}`);
    }

    const data = await response.json();

    return res.json({
      connected: true,
      message: "Express successfully connected to FastAPI",
      service: data.info?.title,
      available_endpoints: Object.keys(data.paths || {}),
    });
  } catch (error) {
    return res.status(503).json({
      connected: false,
      message: "Cannot connect to FastAPI",
      error: error.message,
    });
  }
});

// Upload MRI and get real prediction
router.post(
  "/predict",
  requireAuth,
  (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload an MRI image.",
        });
      }

      const modelKey = req.body.model_key || "IID";

      const allowedModels = ["IID", "NON_IID", "CENTRAL"];

      if (!allowedModels.includes(modelKey)) {
        return res.status(400).json({
          message: "Invalid AI model selected.",
        });
      }

      // Prepare the image for FastAPI
      const formData = new FormData();

      const imageBlob = new Blob(
        [req.file.buffer],
        { type: req.file.mimetype }
      );

      formData.append(
        "image",
        imageBlob,
        req.file.originalname
      );

      formData.append("model_key", modelKey);

      // Support FastAPI implementations that read
      // model_key from either a query parameter or form.
      const url = new URL(
        `${FASTAPI_URL.replace(/\/$/, "")}/predict`
      );
      url.searchParams.set("model_key", modelKey);

      // Call the trained DenseNet121 model
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(120000),
      });

      const result = await response.json();

      if (!response.ok) {
        return res.status(502).json({
          message: "FastAPI prediction failed.",
          detail: result.detail || result,
        });
      }

      // Return real AI prediction to React
      return res.json({
        success: true,
        prediction: result,
      });
    } catch (error) {
      console.error("MRI prediction error:", error);

      return res.status(503).json({
        success: false,
        message: "Unable to process MRI prediction.",
        error: error.message,
      });
    }
  }
);

export default router;
