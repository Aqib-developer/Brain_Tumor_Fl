"""NeuroScan inference-only service. No training or image persistence."""
import io
import os

from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock

import torch
import torch.nn as nn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from torchvision import models, transforms

ROOT = Path(__file__).resolve().parent.parent
MODEL_ROOT = Path(os.getenv("NEUROSCAN_MODEL_ROOT", str(ROOT / "NeuroScan_ML_Assets" / "models")))
CLASS_NAMES = ["no_tumor", "meningioma", "glioma", "pituitary"]
DISPLAY_NAMES = ["No Tumor", "Meningioma", "Glioma", "Pituitary"]
DEVICE = torch.device("cuda" if os.getenv("USE_CUDA", "false").lower() == "true" and torch.cuda.is_available() else "cpu")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MODEL_FILES = {
    "IID": ("Federated IID DenseNet121", MODEL_ROOT / "federated" / "IID" / "best_global_weights.pth"),
    "NON_IID": ("Federated Non-IID DenseNet121", MODEL_ROOT / "federated" / "NON_IID_Dirichlet" / "best_global_weights.pth"),
    "CENTRAL": ("Centralized DenseNet121", MODEL_ROOT / "densenet121_best.pth"),
}
PREPROCESS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
loaded_models = {}
model_errors = {}
load_lock = Lock()


def load_model(key: str):
    """Strict loading: refuse checkpoints that do not match DenseNet121 4-class weights."""
    if key not in MODEL_FILES:
        raise ValueError(f"Unknown model: {key}")
    if key in loaded_models:
        return loaded_models[key]
    with load_lock:
        if key in loaded_models:
            return loaded_models[key]
        name, file = MODEL_FILES[key]
        if not file.is_file():
            raise FileNotFoundError(f"Missing checkpoint: {file}")
        network = models.densenet121(weights=None)
        network.classifier = nn.Linear(network.classifier.in_features, 4)
        state_dict = torch.load(file, map_location="cpu", weights_only=True)
        # Notebook 06 saves the plain state_dict, not an optimizer checkpoint.
        if not isinstance(state_dict, dict):
            raise ValueError("Checkpoint is not a PyTorch state dictionary")
        network.load_state_dict(state_dict, strict=True)
        network.to(DEVICE).eval()
        loaded_models[key] = network
        model_errors.pop(key, None)
        print(f"Loaded {name} from {file} on {DEVICE}", flush=True)
        return network


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Validate every available model once so /models never falsely advertises one.
    for key in MODEL_FILES:
        try:
            load_model(key)
        except Exception as exc:
            model_errors[key] = str(exc)
            print(f"Not ready: {key}: {exc}", flush=True)
    yield
    loaded_models.clear()


app = FastAPI(title="NeuroScan MRI Inference", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": "ready" if loaded_models else "no_models_loaded",
        "device": str(DEVICE),
        "loaded_models": list(loaded_models),
        "model_directory": str(MODEL_ROOT),
    }


@app.get("/models")
def list_models():
    return {"models": [
        {"key": key, "name": name, "available": key in loaded_models,
         "error": model_errors.get(key) if key not in loaded_models else None}
        for key, (name, _) in MODEL_FILES.items()
    ]}


@app.post("/predict")
async def predict(image: UploadFile = File(...), model_key: str = Form("IID")):
    key = model_key.upper().strip()
    if key not in MODEL_FILES:
        raise HTTPException(status_code=400, detail="Invalid model_key")
    if key not in loaded_models:
        raise HTTPException(status_code=503, detail=f"Model {key} unavailable. Check /models and checkpoint path.")

    try:
        raw = await image.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await image.close()
    if not raw or len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be between 1 byte and 10 MB")
    try:
        with Image.open(io.BytesIO(raw)) as opened:
            if opened.format not in ("PNG", "JPEG"):
                raise ValueError("Only PNG and JPEG image files are accepted")
            opened.verify()
        with Image.open(io.BytesIO(raw)) as opened:
            # Apply orientation metadata consistently before RGB conversion.
            pil_image = ImageOps.exif_transpose(opened).convert("RGB")
            tensor = PREPROCESS(pil_image).unsqueeze(0).to(DEVICE)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=400, detail="Invalid or corrupted PNG/JPEG image") from exc
    finally:
        raw = b""  # No persistence of uploaded medical imagery.
    with torch.inference_mode():
        logits = loaded_models[key](tensor)
        probabilities = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()
    index = int(max(range(4), key=lambda i: probabilities[i]))
    return {
        "model_key": key,
        "model_name": MODEL_FILES[key][0],
        "predicted_class": index,
        "predicted_class_key": CLASS_NAMES[index],
        "predicted_class_name": DISPLAY_NAMES[index],
        "predicted_probability": float(probabilities[index]),
        "class_probabilities": {label: float(probabilities[i]) for i, label in enumerate(CLASS_NAMES)},
        "disclaimer": "Research prototype only. This is not a medical diagnosis.",
    }
