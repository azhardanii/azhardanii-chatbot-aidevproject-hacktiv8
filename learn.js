import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config()

const geminiKey = process.env.GEMINI_API_KEY

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({
    apiKey: geminiKey
});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

main();