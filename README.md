NeuroScan
Privacy-Preserving Brain Tumor Classification Using Federated Learning
NeuroScan is a final-year research project that combines offline federated learning experiments with a web-based brain MRI classification platform. It compares centralized and federated DenseNet121 models, provides an authenticated interface for running inference on MRI images, and presents previously generated research evaluations.
Research prototype only. NeuroScan is not a medical device and must not be used for diagnosis, treatment decisions, or patient care. Model scores are uncalibrated probabilities, not clinical certainty.

Project Team
Member	Responsibility
M. Farzam Ameer	Machine learning pipelines, dataset processing, DenseNet121 training, federated learning experiments, model evaluation, and FastAPI inference service
M. Aqib Javed	MERN-inspired web application: React frontend, Node.js/Express backend, authentication, PostgreSQL integration, and application workflows


Key Features
- Four-class MRI classification: No Tumor, Meningioma, Glioma, and Pituitary.
- Three inference choices: centralized DenseNet121, federated IID DenseNet121, and federated Non-IID DenseNet121.
- Federated learning research: offline simulation of four hospital clients, with FedAvg aggregation and IID/Non-IID data-partitioning experiments.
- MRI analysis interface: image upload, model selection, class probabilities, and prediction results.
- Authenticated accounts: session-based login and registration, with email OTP verification and password recovery support when SMTP is configured.
- Prediction history: records and retrieves predictions using PostgreSQL.
- Research dashboard: displays available model evaluation metrics, confusion matrices, ROC curves, and federated experiment plots exported from the training notebooks.
- Inference-only deployment: pretrained weights are loaded for prediction; model training is performed separately, offline.
Technology Stack
Layer	Technologies
Frontend	React, Vite, JavaScript, CSS
Backend API	Node.js, Express.js
Database	PostgreSQL
Authentication	Express sessions, PostgreSQL session store, email OTP workflows
ML framework	Python, PyTorch, torchvision
Inference API	FastAPI, Uvicorn
Model architecture	DenseNet121
Federated learning	Offline FedAvg simulation (IID and Non-IID experiments)


Note: The web app follows a MERN-style architecture, but uses PostgreSQL instead of MongoDB.
System Architecture
              React + Vite frontend
                       |
                 HTTP / API
                       |
               Node.js + Express
                  /          \
                 /            \
      PostgreSQL database   FastAPI inference
      (users, sessions,       (PyTorch CPU/GPU)
       prediction history)          |
                           Trained DenseNet121
                           model checkpoints
The FastAPI service loads saved model weights and returns the predicted class and probabilities. The Express backend handles web authentication, coordinates prediction requests, and stores prediction metadata. The Research page reads previously exported evaluation artifacts; it does not generate new model-performance measurements during inference.
Repository Layout
NeuroScan_Integrated/
├── frontend/                 # React/Vite UI
├── backend/                  # Express API and PostgreSQL integration
│   ├── db/
│   │   └── migrations/       # Database migrations, including email OTP
│   ├── routes/
│   └── services/
├── inference_service/        # FastAPI and DenseNet121 inference
├── NeuroScan_ML_Assets/
│   ├── models/               # Saved PyTorch checkpoints (if distributed)
│   └── results/              # Exported metrics, plots, and reports
├── scripts/                  # Optional result-import utilities
└── compose.yaml              # Optional container configuration
The exact contents of NeuroScan_ML_Assets depend on which checkpoints and research exports are available locally. Large weights, medical images, and datasets may be excluded from the public repository.
Getting Started (Windows / PowerShell)
Prerequisites
- Node.js and npm
- Python 3.11
- PostgreSQL (configured with a NeuroScan database and application role)
- Saved DenseNet121 checkpoint files under NeuroScan_ML_Assets/models/
1. Clone and open the project
git clone <YOUR-REPOSITORY-URL>
cd <YOUR-REPOSITORY-FOLDER>\NeuroScan_Integrated
Replace the placeholders with your GitHub repository URL and local folder name. If the repository root is already NeuroScan_Integrated, skip that final path segment.
2. Configure PostgreSQL and environment variables
Create a PostgreSQL database and application user, and apply the database schema used by the Express backend. Run the OTP migration in backend/db/migrations/001_email_otp.sql after the core tables have been created.
Create backend/.env using backend/.env.example as a starting point, where available:
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=neuroscan_db
DB_USER=neuroscan_app
DB_PASSWORD=YOUR_DATABASE_PASSWORD
SESSION_SECRET=YOUR_LONG_RANDOM_SESSION_SECRET
CLIENT_ORIGINS=http://localhost:5173
FASTAPI_URL=http://127.0.0.1:8000
NODE_ENV=development

# Optional: required to send registration and password-reset OTPs
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=YOUR_SENDER_EMAIL
SMTP_PASS=YOUR_GMAIL_APP_PASSWORD
MAIL_FROM=YOUR_SENDER_EMAIL
OTP_SECRET=YOUR_LONG_RANDOM_OTP_SECRET
Use a Google App Password (not your normal Gmail password) if using Gmail SMTP. Keep secrets in your local .env; never commit this file to GitHub.
For the frontend, configure frontend/.env if required by your setup:
VITE_DEMO_MODE=false
3. Start the FastAPI inference service
In terminal 1:
cd inference_service
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000
If py is not recognized, create the environment using the full path to your Python 3.11 executable. Confirm model availability at http://127.0.0.1:8000/health and see the interactive API at http://127.0.0.1:8000/docs.
4. Start the Express backend
In terminal 2, from the project root:
cd backend
npm install
npm run dev
The backend runs at http://localhost:5000 by default.
5. Start the React frontend
In terminal 3, from the project root:
cd frontend
npm install
npm run dev
Open http://localhost:5173. Keep all three terminal sessions running while using the application.
Research Workflow
1. Prepare and split the labeled MRI dataset.
2. Train and evaluate a centralized DenseNet121 model.
3. Simulate four participating hospital clients and train federated models using FedAvg under IID and Non-IID partitions.
4. Export checkpoints, classification reports, confusion matrices, ROC curves, and round-wise plots.
5. Load the saved checkpoints in FastAPI for inference, and display exported evaluations in the Research page.
Class index mapping used by the inference service:
Index	Class
0	No Tumor
1	Meningioma
2	Glioma
3	Pituitary


The inference pipeline uses RGB conversion, 224 × 224 resizing, and ImageNet normalization. These settings must match the original evaluation pipeline to reproduce notebook results.
Research result files
The application expects exported model-specific results under NeuroScan_ML_Assets/results/federated/, typically in these directories:
results/federated/
├── Centralized/
│   ├── test_metrics.json
│   ├── test_confusion_matrix.png
│   └── test_roc_curves.png
├── IID/
│   ├── test_metrics.json
│   ├── test_confusion_matrix.png
│   └── test_roc_curves.png
├── NON_IID_Dirichlet/
│   ├── test_metrics.json
│   ├── test_confusion_matrix.png
│   └── test_roc_curves.png
├── final_model_comparison.png
└── federated_validation_f1_by_round.png
Where datasets or reports are not included in the public repository, provide them separately only when redistribution rights and privacy requirements allow it.
Security and Privacy Notes
- Session-protected routes restrict access to application features and user-specific history.
- Uploaded images are processed in memory by the inference service; avoid logging, publishing, or committing identifiable MRI data.
- Keep .env, SMTP credentials, database passwords, OTP secrets, and session secrets out of version control.
- Email OTP verifies access to an email inbox; it does not prove that an address belongs to a particular real-world identity.
- The federated setup is an offline simulation. It should not be described as a live cross-hospital deployment or as a guarantee of clinical privacy.
- Model outputs require independent external validation before any real-world clinical use.
Project Status
NeuroScan supports the end-to-end prototype workflow of authenticated MRI upload, inference using saved checkpoints, result display, and database-backed prediction history. The availability of email delivery and research visualizations depends on correctly configuring SMTP and including the exported result files.
Contributors
M. Farzam Ameer — ML pipelines, federated learning research, model training/evaluation, and FastAPI integration.
M. Aqib Javed — MERN-inspired web application, React UI, Express APIs, authentication, and PostgreSQL integration.
Developed as a two-member final-year project for academic research and demonstration.