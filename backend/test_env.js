import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const apiKey = process.env.GOOGLE_API_KEY;
if (apiKey) {
  console.log("✅ Google Gemini API key found successfully!");
  console.log(`Key prefix: ${apiKey.substring(0, 6)}... (length: ${apiKey.length})`);
} else {
  console.log("❌ Google Gemini API key not found in .env file.");
}
