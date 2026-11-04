# Women Safety & Support Resource Bot

An AI-powered Women Safety and Support Resource Chatbot built using Retrieval-Augmented Generation (RAG). It provides information about women's safety, emergency guidance, government support resources, and legal information using a locally stored knowledge base.

The application combines a FastAPI backend with a modern React interface and Google's Gemini AI model to retrieve relevant information and generate helpful responses.

## Features

- **AI-powered chatbot:** Answers questions related to women's safety, emergency assistance, privacy, government resources, and legal guidance.
- **Retrieval-Augmented Generation (RAG):** Retrieves relevant information from a predefined knowledge base before generating responses.
- **Knowledge-based answers:** Uses ChromaDB vector search and Gemini embeddings to find relevant information.
- **Emergency assistance:** Displays emergency contact information, including 112 and the Women Helpline 181.
- **Nearby support finder:** Helps users find nearby police stations, hospitals, and women support centers through Google Maps.
- **Emergency calling:** Provides a direct emergency calling option through the device.
- **Source identification:** Displays the knowledge-base categories used to generate chatbot answers.
- **Conversation history:** Maintains recent conversation context to support follow-up questions.
- **Responsive interface:** Provides a user-friendly chatbot interface with loading indicators, suggested questions, and formatted AI responses.

## How It Works

The Women Safety RAG Bot uses a Retrieval-Augmented Generation architecture to provide context-based answers.

1. **Knowledge Base:** Safety guidance, government resources, and legal information are stored as TXT and PDF documents.
2. **Document Loading:** The ingestion pipeline loads documents from the backend data directory.
3. **Text Chunking:** Documents are divided into smaller chunks using RecursiveCharacterTextSplitter with a chunk size of 1000 characters and 200-character overlap.
4. **Embeddings:** Google Gemini Embeddings (`gemini-embedding-001`) converts document chunks into vector representations.
5. **Vector Database:** Chunks and embeddings are stored in ChromaDB.
6. **Retrieval:** When a user asks a question, the system retrieves the top 3 relevant document chunks using similarity search.
7. **AI Generation:** Retrieved information and recent conversation history are passed to Gemini 2.5 Flash to generate a contextual response.
8. **Response Display:** The generated answer and its knowledge-base sources are returned through FastAPI and displayed in the React frontend.

### RAG Architecture Flow

```text
User Question
      |
      v
React Chat Interface
      |
      v
FastAPI Backend
      |
      v
Question + Conversation History
      |
      v
Gemini Embeddings
      |
      v
ChromaDB Similarity Search
      |
      v
Retrieve Top 3 Relevant Chunks
      |
      v
Knowledge Base Context
      |
      v
Gemini 2.5 Flash
      |
      v
Generate Contextual Answer
      |
      v
Return Answer + Sources
      |
      v
Display Response in React UI
```

## Project Structure

```text
women-safety-rag-bot/
|
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── rag.py
│   │
│   ├── data/
│   │   ├── emergency/
│   │   │   └── emergency_safety_guidance.txt
│   │   │
│   │   ├── government/
│   │   │   └── women_safety_resources.txt
│   │   │
│   │   └── legal/
│   │       └── legal_information_guidance.txt
│   │
│   ├── chroma_db/
│   ├── ingest.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

The `chroma_db/` directory is generated automatically when the knowledge base is processed and is not committed to GitHub.

## Technologies Used

| Category | Technologies |
|---|---|
| Frontend | React.js, HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| AI Model | Google Gemini 2.5 Flash |
| Embeddings | Gemini Embedding 001 |
| RAG Framework | LangChain |
| Vector Database | ChromaDB |
| Document Processing | PyPDF, TextLoader |
| Text Splitting | RecursiveCharacterTextSplitter |
| API Communication | Axios |
| Development Tools | VS Code, Git, GitHub |

## Installation and Setup

### Requirements

- Python 3.10 or newer
- Node.js and npm
- Google Gemini API key
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/kandulapragathi/women-safety-rag-bot.git
```

Navigate into the project:

```bash
cd women-safety-rag-bot
```

### 2. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\Activate.ps1
```

Install the required Python packages:

```bash
python -m pip install fastapi uvicorn python-dotenv langchain-community langchain-text-splitters langchain-chroma langchain-google-genai pypdf
```

### 3. Configure the Gemini API Key

Create a `.env` file inside the `backend/` directory.

Add your Google Gemini API key:

```env
GOOGLE_API_KEY=your_google_api_key
```

Get your API key from:

https://aistudio.google.com/apikey

Keep your `.env` file private. Never upload API keys to GitHub.

### 4. Build the RAG Knowledge Base

Make sure you are inside the backend directory.

Run:

```bash
python ingest.py
```

This process:

- Loads TXT and PDF documents.
- Splits documents into smaller chunks.
- Generates Gemini embeddings.
- Stores the document vectors in ChromaDB.

The vector database is created in `backend/chroma_db/`.

### 5. Start the Backend Server

Run:

```bash
python -m uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 6. Start the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install Node.js dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

Keep both backend and frontend servers running while using the application.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Checks backend server status |
| POST | `/chat` | Accepts user questions and conversation history and returns AI-generated answers with sources |

### Example Chat Request

```json
{
  "question": "What should I do in an emergency?",
  "history": []
}
```

## Knowledge Base Categories

The chatbot currently uses three main knowledge-base categories:

**1. Emergency Safety Guidance**
- Emergency assistance information.
- Personal safety guidance.
- Emergency response information.

**2. Government Women Safety Resources**
- Women safety support resources.
- Government assistance information.
- Available support services.

**3. Legal Information and Guidance**
- Women's legal rights information.
- Legal awareness.
- Guidance related to women's safety.

## Usage

1. Start the backend and frontend servers.
2. Open the chatbot in your browser.
3. Ask questions about women's safety and support resources.
4. Select suggested questions or enter your own question.
5. Receive AI-generated responses based on retrieved knowledge-base information.
6. View the sources used for the response.
7. Use emergency assistance options to find nearby police stations, hospitals, and support centers.

Example questions:

- What is the women helpline number?
- What should I do in an emergency?
- How can I protect my privacy?
- What government resources are available for women?
- What legal support is available for women?

## Configuration

| Setting | Configuration |
|---|---|
| AI Model | `gemini-2.5-flash` |
| Embedding Model | `gemini-embedding-001` |
| Vector Database | ChromaDB |
| Retrieval Count | Top 3 relevant chunks |
| Chunk Size | 1000 characters |
| Chunk Overlap | 200 characters |
| API Framework | FastAPI |
| Frontend Development Server | Vite |

## Limitations

- Responses depend on the information available in the knowledge base.
- The chatbot may not answer questions outside its stored documents.
- Gemini API access and internet connectivity are required for AI responses and embedding generation.
- Nearby support discovery requires browser location permission.
- The current application is configured for local development.
- The chatbot is an informational support tool and does not replace emergency services, qualified legal advice, or professional assistance.
- Users should verify important legal and government information with the relevant official authorities.

## Future Enhancements

- Expand the knowledge base with additional verified government resources.
- Add multilingual chatbot support.
- Improve document retrieval and response accuracy.
- Add more emergency support resources.
- Implement secure conversation storage.
- Deploy the application for public access.

## Author

**Kandula Pragathi**

GitHub: https://github.com/kandulapragathi

 Project Repository

https://github.com/kandulapragathi/women-safety-rag-bot

---

Women Safety & Support Resource Bot — Using AI and RAG to make safety information more accessible.
