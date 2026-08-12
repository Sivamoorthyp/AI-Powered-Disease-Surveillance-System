# 🦠 AI Disease Surveillance System

An AI-powered disease surveillance platform for monitoring disease cases, identifying potential hotspots, analyzing disease trends, and providing accessible health information through an intelligent AI assistant.

---

## 📌 Overview

The **AI Disease Surveillance System** is designed to improve disease monitoring and outbreak awareness by combining disease reporting, AI-powered analysis, geographical visualization, and analytics into a single platform.

The system enables healthcare workers and authorized users to report disease cases while providing dashboards and interactive visualizations for monitoring disease activity across different regions.

---

## 🎯 Problem Statement

Traditional disease surveillance can face several challenges:

* Delayed disease reporting
* Fragmented health information
* Difficulty identifying disease hotspots
* Manual analysis of disease data
* Limited regional disease visualization
* Lack of accessible health information

These challenges can make it difficult to identify disease trends and potential outbreaks at an early stage.

---

## 💡 Proposed Solution

The system provides a centralized platform for collecting, analyzing, and visualizing disease-related information.

```text
Disease Reports
       ↓
Data Collection
       ↓
Backend REST API
       ↓
PostgreSQL Database
       ↓
AI + Data Analysis
       ↓
Disease Statistics
       ↓
Dashboard + Heatmap
       ↓
Disease Monitoring
```

---

## ✨ Features

### 🦠 Disease Surveillance

* Disease case reporting
* Disease-wise case tracking
* Region-wise case monitoring
* Historical disease data
* Disease trend analysis
* Case statistics

### 🗺️ Disease Heatmap

Interactive geographical visualization for monitoring disease activity.

* Location-based disease cases
* Disease hotspots
* Region-wise statistics
* Geographical disease distribution
* Identification of high-risk areas

### 📊 Analytics Dashboard

The dashboard provides:

* Total cases
* Active cases
* Recovered cases
* Disease-wise statistics
* Region-wise statistics
* Disease trends
* Case growth

### 🤖 AI-Powered Health Assistant

The integrated AI assistant helps users with general health and disease-related information.

It can provide:

* Disease information
* Symptom-related information
* Preventive measures
* Health awareness
* General health-related answers

> **Note:** The AI assistant provides general health information and is not a replacement for professional medical diagnosis or treatment.

### 👨‍⚕️ Healthcare Worker Reporting

Healthcare workers can submit disease-related reports through the platform.

* Disease reporting
* Case information
* Location information
* Report management
* Disease monitoring

### 🌐 Multilingual Support

The system is designed to provide health-related information in multiple languages, improving accessibility for users from different linguistic backgrounds.

### 🔐 Security

* Authentication
* Authorization
* Secure API communication
* Protected sensitive information
* Controlled access to administrative data

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │        Users         │
                    │                      │
                    │ Healthcare Workers   │
                    │ Hospitals / Admin    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │      Dashboard       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FastAPI         │
                    │      REST API        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌────────────┐  ┌───────────┐  ┌────────────┐
        │ PostgreSQL │  │ AI / LLM  │  │ Analytics  │
        │  Database  │  │   Layer   │  │   Engine   │
        └────────────┘  └───────────┘  └────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Disease Intelligence │
                    │      Dashboard       │
                    └──────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* JavaScript
* HTML5
* CSS3
* Tailwind CSS
* Interactive Maps
* Data Visualization

### Backend

* Python
* FastAPI
* REST APIs

### Database

* PostgreSQL

### AI

* Groq API
* Large Language Models
* AI-powered health information

### Tools

* Git
* GitHub
* VS Code
* Postman

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/AI-Disease-Surveillance.git

cd AI-Disease-Surveillance
```

### Backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

### Frontend

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🔑 Environment Variables

Create a `.env` file:

```env
DATABASE_URL=your_postgresql_connection_string
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_secret_key
```

Do not upload `.env` to GitHub.

Add it to `.gitignore`:

```text
.env
venv/
node_modules/
__pycache__/
```

---

## 🔄 Disease Reporting Workflow

```text
Healthcare Worker / Hospital
             ↓
       Submit Report
             ↓
        Data Validation
             ↓
         REST API
             ↓
      PostgreSQL Database
             ↓
       Data Processing
             ↓
    ┌────────┴────────┐
    ↓                 ↓
Analytics          AI Analysis
    ↓                 ↓
    └────────┬────────┘
             ↓
      Admin Dashboard
             ↓
     Heatmap + Analytics
             ↓
      Disease Monitoring
```

---

## 🤖 AI Workflow

```text
User
  ↓
Health / Disease Query
  ↓
React Frontend
  ↓
FastAPI Backend
  ↓
AI Model
  ↓
Response Processing
  ↓
Health Information
  ↓
User
```

---

## 🌍 Impact

The system can help:

* 🏥 Hospitals monitor disease activity.
* 👨‍⚕️ Healthcare workers report disease cases.
* 🏛️ Authorities identify potential disease hotspots.
* 📊 Decision-makers analyze disease trends.
* 👥 Citizens access general health information.
* 🌐 Communities access multilingual health information.

---

## 🔮 Future Enhancements

* Predictive disease outbreak detection
* Machine-learning-based disease forecasting
* Real-time outbreak alerts
* Mobile application
* Additional regional languages
* Integration with healthcare data sources
* Automated notifications
* Advanced epidemiological analytics
* IoT-based health monitoring
* AI-based disease risk prediction

---

## 📄 License

This project is developed for **educational, research, and hackathon purposes**.

---

## ⚠️ Disclaimer

This platform is intended for disease surveillance, health awareness, and informational purposes.

Information provided by the AI system should not be considered a substitute for diagnosis, treatment, or professional medical advice from a qualified healthcare professional.
