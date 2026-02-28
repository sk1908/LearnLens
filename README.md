# 📚 LearnLens — Adaptive AI Micro-Tutor

<p align="center">
  <strong>Transform lecture PDFs into personalized quizzes with Socratic hints, mastery tracking, and spaced repetition — all running 100% locally on AMD hardware.</strong>
</p>

---

## 🎯 Problem

Students passively read notes but lack personalized, immediate feedback. Tutors are expensive, and AI chatbots like ChatGPT require paid APIs and upload your data to the cloud. **LearnLens** solves this by providing a free, private, AI-powered learning companion that runs entirely on your local machine.

## ✨ Solution — MVP Features

- **📄 PDF Upload & Processing** — Drop any lecture PDF; AI automatically parses, chunks, and extracts topics
- **🧠 AI Quiz Generation** — Generates MCQ + short-answer questions from your actual study material
- **💡 3-Level Socratic Hints** — Guides thinking without giving away answers (vague → specific → near-complete)
- **📊 Mastery Dashboard** — Topic radar chart, XP, streaks, accuracy, and spaced repetition review queue
- **🎮 Gamification** — XP system, levels, daily streaks, confetti celebrations
- **🔒 100% Private** — All processing local via Ollama; zero cloud uploads, zero API costs

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Framer Motion, Recharts, React Dropzone |
| Backend | FastAPI (Python 3.11), SQLAlchemy |
| Database | SQLite + ChromaDB (vector DB) |
| LLM | Mistral-7B-Instruct (quantized, via Ollama) |
| Embeddings | all-MiniLM-L6-v2 (sentence-transformers) |
| PDF Parsing | PyMuPDF |

## 🚀 Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com/) installed and running

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/team/learnlens && cd learnlens

# 2. Pull the LLM model
ollama pull mistral

# 3. Start the backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 4. Start the frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## 📁 Project Structure

```
LearnLens/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── models/database.py   # SQLAlchemy models
│   ├── services/
│   │   ├── pdf_service.py   # PDF parsing + chunking
│   │   ├── embedding.py     # Sentence-transformer embeddings
│   │   ├── llm_service.py   # Ollama LLM wrapper
│   │   └── quiz_engine.py   # SM-2 scheduler, XP system
│   └── routers/
│       ├── documents.py     # Upload, list, delete PDFs
│       ├── quizzes.py       # Generate, answer, hint APIs
│       └── progress.py      # Dashboard, stats, review queue
├── frontend/
│   ├── src/
│   │   ├── pages/           # Landing, Upload, Quiz, Dashboard
│   │   ├── components/      # Navbar
│   │   ├── utils/api.js     # API client
│   │   └── index.css        # Design system
│   └── index.html
└── README.md
```

## 👥 Team

- Karthik
- Neeraj
- Aniket

## 📝 License

MIT

---

*Built for AMD Slingshot Hackathon 2026 🚀*
