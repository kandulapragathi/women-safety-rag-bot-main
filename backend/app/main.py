from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.rag import ask_bot


app = FastAPI(
    title="Women Safety & Support Resource Bot",
    description="RAG-based women safety resource assistant",
    version="1.0.0"
)


# Allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []


@app.get("/")
def home():
    return {
        "message": "Women Safety & Support Resource Bot API is running"
    }


@app.post("/chat")
def chat(request: ChatRequest):

    history = [message.model_dump() for message in request.history]

    result = ask_bot(request.question, history)
    
    return result