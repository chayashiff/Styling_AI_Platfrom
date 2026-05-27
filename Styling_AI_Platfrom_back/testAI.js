import "dotenv/config";
import Groq from "groq-sdk";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey || apiKey.trim() === "") {
  console.error("Groq API call failed:");
  console.error("GROQ_API_KEY is missing. Add your API key to the .env file.");
  process.exit(1);
}

const groq = new Groq({ apiKey });
const terminal = readline.createInterface({ input, output });

try {
  const userQuestion = await terminal.question("Write your question for Groq: ");

  if (!userQuestion.trim()) {
    throw new Error("Question is empty. Please write a question and try again.");
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: userQuestion,
      },
    ],
  });
  const response = completion.choices[0]?.message?.content;

  console.log(" response:", response);
} catch (error) {
  console.error("Groq API call failed:");
  console.error(error.message);
  process.exit(1);
} finally {
  terminal.close();
}
