import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DATA_FOLDER = path.join(__dirname, "data");

// In-memory document chunks cache
let cachedChunks = null;

function getSourceName(sourcePath) {
  const lower = sourcePath.toLowerCase();
  if (lower.includes("legal_information_guidance")) {
    return "Legal Information Guidance";
  }
  if (lower.includes("emergency_safety_guidance")) {
    return "Emergency Safety Guidance";
  }
  if (lower.includes("women_safety_resources")) {
    return "Government Safety Resources";
  }
  return "Knowledge Base";
}

// Load and chunk documents from data/
function loadAndSplitDocuments() {
  if (cachedChunks) return cachedChunks;

  const chunks = [];
  const chunkSize = 1000;
  const chunkOverlap = 200;

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".txt")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const sourceName = getSourceName(fullPath);

        // Split into overlapping chunks
        for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
          const chunkText = content.slice(i, i + chunkSize).trim();
          if (chunkText.length > 50) {
            chunks.push({
              content: chunkText,
              source: sourceName,
              file: entry.name,
              embedding: null,
            });
          }
          if (i + chunkSize >= content.length) break;
        }
      }
    }
  }

  walkDir(DATA_FOLDER);
  cachedChunks = chunks;
  return chunks;
}

// Cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Keyword-based fallback scoring
function keywordScore(query, text) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const lowerText = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lowerText.includes(term)) score += 1;
  }
  return score;
}

// Main RAG search and answer generation
export async function askBot(question, history = []) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      answer:
        "⚠️ **Google Gemini API Key is missing.** Please set the `GOOGLE_API_KEY` environment variable in your `.env` or deployment settings.",
      sources: [],
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const chunks = loadAndSplitDocuments();

  if (!chunks || chunks.length === 0) {
    return {
      answer: "I could not find relevant information in my current knowledge base.",
      sources: [],
    };
  }

  // Build recent conversation history
  const recentHistory = (history || []).slice(-6);
  const historyText = recentHistory
    .map(
      (msg) =>
        `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n");

  const searchQuery = historyText
    ? `${historyText}\nCurrent question: ${question}`
    : question;

  let topChunks = [];

  // Attempt vector embedding retrieval
  try {
    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    // Ensure all chunks have embeddings computed
    for (const chunk of chunks) {
      if (!chunk.embedding) {
        const res = await embeddingModel.embedContent(chunk.content);
        chunk.embedding = res.embedding.values;
      }
    }

    // Embed the search query
    const queryRes = await embeddingModel.embedContent(searchQuery);
    const queryEmbedding = queryRes.embedding.values;

    // Calculate similarity scores
    const scored = chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    topChunks = scored.slice(0, 3).map((item) => item.chunk);
  } catch (embedError) {
    console.warn("Embedding search failed, using keyword fallback:", embedError.message);
    // Keyword fallback retrieval
    const scored = chunks.map((chunk) => ({
      chunk,
      score: keywordScore(searchQuery, chunk.content),
    }));
    scored.sort((a, b) => b.score - a.score);
    topChunks = scored.slice(0, 3).map((item) => item.chunk);
  }

  // Combine retrieved knowledge base context
  const context = topChunks.map((c) => c.content).join("\n\n");

  // RAG Prompt with strict safety guidelines
  const prompt = `
CONVERSATION HISTORY:
${historyText || "No previous conversation."}

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
${context}

USER QUESTION:
${question}

Answer using normal Markdown formatting.

Use:
- **bold** for important numbers or terms
- numbered lists when giving steps
- short paragraphs for explanations

Do NOT escape Markdown characters.
Do NOT write \\*\\*.
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0,
      },
    });

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Unique sources list
    const seenSources = new Set();
    const sources = [];
    for (const chunk of topChunks) {
      if (chunk.source && !seenSources.has(chunk.source)) {
        seenSources.add(chunk.source);
        sources.push({ name: chunk.source });
      }
    }

    return {
      answer,
      sources,
    };
  } catch (modelError) {
    console.error("Gemini model error:", modelError);
    return {
      answer: `⚠️ **AI Service Error:** ${modelError.message || "Failed to generate response."} Please verify your \`GOOGLE_API_KEY\`.`,
      sources: [],
    };
  }
}
