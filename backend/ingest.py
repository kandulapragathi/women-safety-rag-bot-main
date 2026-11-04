import os
from dotenv import load_dotenv

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

load_dotenv()

DATA_FOLDER = "data"
CHROMA_FOLDER = "chroma_db"


def load_documents():
    documents = []

    for root, dirs, files in os.walk(DATA_FOLDER):

        for file in files:

            file_path = os.path.join(root, file)

            if file.lower().endswith(".pdf"):
                print(f"Loading PDF: {file_path}")

                loader = PyPDFLoader(file_path)
                docs = loader.load()

                documents.extend(docs)

            elif file.lower().endswith(".txt"):
                print(f"Loading TXT: {file_path}")

                loader = TextLoader(
                    file_path,
                    encoding="utf-8"
                )

                docs = loader.load()

                documents.extend(docs)

    return documents


def main():

    print("Starting document ingestion...")

    documents = load_documents()

    print(
        f"Total documents/pages loaded: {len(documents)}"
    )

    if not documents:

        print("No PDF or TXT files found.")

        return

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(documents)

    print(
        f"Total chunks created: {len(chunks)}"
    )

    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001"
    )

    print("Creating vector database...")

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_FOLDER
    )

    print("RAG knowledge base created successfully!")


if __name__ == "__main__":
    main()