// import ChatGpt from "ChatGpt";
import ChatGpt from "../ChatGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

// setup
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai });

// Sending parallel requests using the Parallel method
const messageList = [
  { prompt: "Translate 'apple' to Spanish." },
  { prompt: "Translate 'cat' to French." },
  { prompt: "Translate 'dog' to German." }, // the highest priority is executed first
];

const [error, response, rawResponse] = await chatGpt.parallel({
  messageList,
  concurrency: 3,
  verbose: true,
});

console.log(error, response, rawResponse);
