# Micro Expression Recognition System

<div align="center">

Real Time AI Powered Micro Expression Recognition Platform for Investigative Interviewing

Built using React, FastAPI, OpenCV, ResNet50, LSTM and PostgreSQL

---

Architecture • Documentation • AI Pipeline • Real Time Inference • Enterprise Dashboard

</div>

---

# Overview

Micro Expression Recognition System is a full stack artificial intelligence platform designed to detect involuntary facial micro expressions from live camera streams and uploaded videos.

The system combines computer vision, deep learning and modern web technologies to provide real time facial analysis through an interactive dashboard while simultaneously visualizing the complete inference pipeline.

Unlike conventional facial emotion recognition systems, this platform demonstrates every stage of processing including face detection, preprocessing, feature extraction, temporal modeling and classification, making the entire AI workflow transparent during execution.

---

# Key Features

### Real Time Analysis

- Live webcam processing
- Video upload support
- Continuous inference
- Emotion recognition
- Confidence estimation
- FPS monitoring

### AI Pipeline Visualization

- Frame extraction
- Face detection
- Image preprocessing
- Feature extraction
- Sequence modeling
- Emotion prediction
- Confidence scoring

### Dashboard

- Live camera
- Bounding box overlay
- Prediction timeline
- Processing pipeline
- Session analytics
- Reports

### Reporting

- Emotion timeline
- Session history
- PDF reports
- CSV export
- Prediction logs

---

# System Architecture

```
User
 │
 ▼
React Frontend
 │
 ▼
Authentication Layer
 │
 ▼
REST API + WebSocket
 │
 ▼
FastAPI Backend
 │
 ▼
OpenCV Processing Engine
 │
 ▼
MTCNN Face Detection
 │
 ▼
CLAHE Enhancement
 │
 ▼
ResNet50 Feature Extraction
 │
 ▼
Sequence Buffer
 │
 ▼
Stacked LSTM
 │
 ▼
Emotion Classification
 │
 ▼
Database
 │
 ▼
Dashboard + Reports
```

---

# Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python |
| Computer Vision | OpenCV, MTCNN |
| Deep Learning | ResNet50, LSTM |
| Authentication | JWT |
| Database | PostgreSQL / SQLite |
| Deployment | Docker Ready |

---

# Project Structure

```
micro-expression-recognition/

├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── contexts/
│   └── assets/
│
├── backend/
│   ├── api/
│   ├── controllers/
│   ├── services/
│   ├── authentication/
│   ├── middleware/
│   ├── preprocessing/
│   ├── models/
│   │   ├── cnn/
│   │   ├── lstm/
│   │   ├── mtcnn/
│   │   └── classifier/
│   ├── database/
│   ├── uploads/
│   ├── reports/
│   ├── logs/
│   └── main.py
│
├── docs/
├── trained_models/
├── tests/
└── README.md
```

---

# AI Pipeline

The prediction workflow follows the sequence below.

```
Live Camera

↓

Frame Capture

↓

Face Detection

↓

Image Enhancement

↓

Face Alignment

↓

Feature Extraction

↓

Temporal Buffer

↓

LSTM Inference

↓

Emotion Prediction

↓

Confidence Score

↓

Dashboard

↓

Database

↓

Report Generation
```

---

# Frontend Architecture

```
Pages

├── Dashboard
├── Live Analysis
├── Reports
├── History
├── Settings
└── Authentication

↓

Components

↓

API Layer

↓

State Management

↓

WebSocket Communication
```

---

# Backend Architecture

```
FastAPI

↓

Authentication

↓

Controllers

↓

Business Services

↓

Inference Engine

↓

Database Layer

↓

Storage

↓

Report Service
```

---

# Database Schema

### Users

| Field | Type |
|------|------|
| id | UUID |
| name | String |
| email | String |
| password | Hash |
| role | String |

---

### Sessions

| Field | Type |
|------|------|
| id | UUID |
| user_id | UUID |
| source | String |
| duration | Integer |
| created_at | Timestamp |

---

### Predictions

| Field | Type |
|------|------|
| id | UUID |
| session_id | UUID |
| emotion | String |
| confidence | Float |
| timestamp | Timestamp |

---

# REST API

## Authentication

```
POST /api/auth/login

POST /api/auth/register

POST /api/auth/logout
```

## Analysis

```
POST /api/analyze/frame

POST /api/analyze/video
```

## Reports

```
GET /api/reports

GET /api/reports/{id}
```

---

# Local Development

## Frontend

```bash
npm install

npm run dev
```

## Backend

```bash
pip install -r requirements.txt

uvicorn app.main:app --reload
```

---

# Future Roadmap

- Vision Transformer Integration
- TensorRT Optimization
- Docker Deployment
- Kubernetes Support
- Multi Face Tracking
- Cloud Inference
- Edge Device Deployment
- Mobile Application

---

# License

MIT License

---

<div align="center">

Designed and Developed for Real Time AI Powered Micro Expression Recognition

</div>
