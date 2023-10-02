import ChatGpt from "./ChatGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai, verbose: false, timeout: 8000 });

// List of translation tasks to be processed in parallel
const translationTasks = [
  { text: "Hello", language: "es", priority: 1 }, // Translate 'Hello' to Spanish
  { text: "Bonjour", language: "de", priority: 2 }, // Translate 'Bonjour' to German
  { text: "Ciao", language: "fr", priority: 0 }, // Translate 'Ciao' to French
];

async function main() {
  try {
    // Perform parallel tasks with dynamic retryDelay
    await chatGpt.parallel({
      messageObjList: translationTasks.map((task) => {
        return {
          prompt: `Translate '${task.text}' to ${task.language}. Your response should be in the following valid JSON structure: { "word": ".." , "fromLanguage": ".." , translation: "..", toLanguage: ".."}`,
          priority: task.priority,
        };
      }),
      concurrency: 3,
      retryCount: 3, // Retry each task 3 times on failure
      retryDelay: (value) => value * 1000, // Retry delay in milliseconds
      onResponse: (result) => {
        console.log("result\n", result[1]);
      },
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the main function
main();
