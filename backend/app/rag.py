import os
from dotenv import load_dotenv

from langchain_chroma import Chroma
from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI
)

load_dotenv()

CHROMA_FOLDER = "chroma_db"


# Connect to the same embedding model used during ingestion
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001"
)


# Connect to ChromaDB
vectorstore = Chroma(
    persist_directory=CHROMA_FOLDER,
    embedding_function=embeddings
)


# Connect to Gemini
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)


def get_source_name(source):

    source = source.lower()

    if "legal_information_guidance" in source:
        return "Legal Information Guidance"

    if "emergency_safety_guidance" in source:
        return "Emergency Safety Guidance"

    if "women_safety_resources" in source:
        return "Government Safety Resources"

    return "Knowledge Base"


def ask_bot(question, history=None):

    # Search the knowledge base
        # Prepare recent conversation history
    history = history or []

    recent_history = history[-6:]

    history_text = "\n".join(
        f"{'User' if message['role'] == 'user' else 'Assistant'}: {message['content']}"
        for message in recent_history
    )

    # Use conversation history together with the current question
    search_query = (
        f"{history_text}\nCurrent question: {question}"
        if history_text
        else question
    )

    # Search the knowledge base
    results = vectorstore.similarity_search_with_score(
        search_query,
        k=3
    )

    # If no documents are found
    if not results:
        return {
            "answer": (
                "I could not find relevant information "
                "in my current knowledge base."
            ),
            "sources": []
        }

    # Extract documents
    documents = [
        document
        for document, score in results
    ]

    # Combine retrieved information
    context = "\n\n".join(
        document.page_content
        for document in documents
    )

    # Prompt for Gemini
    prompt = f"""
    CONVERSATION HISTORY:
    {history_text or "No previous conversation."}

You are a Women Safety and Support Resource Assistant.

Your job is to answer the user's question using ONLY
the information provided in the knowledge base.

IMPORTANT SAFETY RULES:

1. Use the knowledge base as your primary source.
2. Do not invent information.
3. Do not invent emergency numbers.
4. Do not invent organizations.
5. Do not invent laws.
6. Do not invent legal procedures.
7. Do not invent government schemes or services.
8. If the requested information is not available
   in the knowledge base, clearly say that you do
   not have that information.
9. Keep answers clear, respectful and supportive.
10. If someone may be in immediate danger, provide
    concise safety-focused guidance using only
    information available in the knowledge base.
11. Do not ask for unnecessary personal information.
12. Do not claim that information is officially
    verified unless the knowledge base explicitly
    provides that information.

KNOWLEDGE BASE:
{context}

USER QUESTION:
{question}

Answer using normal Markdown formatting.

Use:
- **bold** for important numbers or terms
- numbered lists when giving steps
- short paragraphs for explanations

Do NOT escape Markdown characters.
Do NOT write \\*\\*.
"""

    # Ask Gemini
    response = llm.invoke(prompt)

    # Collect unique, user-friendly source names
    sources = []
    seen_sources = set()

    for document in documents:

        raw_source = document.metadata.get(
            "source",
            ""
        )

        source_name = get_source_name(raw_source)

        if source_name not in seen_sources:

            seen_sources.add(source_name)

            sources.append({
                "name": source_name
            })

    return {
        "answer": response.content,
        "sources": sources
    }