import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { askBot } from "./rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check / root endpoint
app.get(["/", "/api", "/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    message: "Women Safety & Support Resource Bot API is running (Node.js)",
    hasApiKey: Boolean(process.env.GOOGLE_API_KEY),
  });
});

// Chat endpoint (supports both /chat and /api/chat for flexible routing)
app.post(["/chat", "/api/chat"], async (req, res) => {
  try {
    const { question, history } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        answer: "Please provide a valid question.",
        sources: [],
      });
    }

    const result = await askBot(question.trim(), history || []);
    return res.json(result);
  } catch (error) {
    console.error("Server error handling /chat:", error);
    return res.status(500).json({
      answer: `⚠️ Internal server error: ${error.message}`,
      sources: [],
    });
  }
});

// Start listening if run directly (node server.js)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(
      `Gemini API Key configured: ${process.env.GOOGLE_API_KEY ? "YES" : "NO (set GOOGLE_API_KEY in .env)"}`
    );
  });
}

export default app;
