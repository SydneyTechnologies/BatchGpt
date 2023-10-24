import BatchGpt from "batch-gpt";
import OpenAI from "openai";
import dotenv from "dotenv";

// setup
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const batchGpt = new BatchGpt({ openai });

// Sending parallel requests using the Parallel method
const messageList = [
  { prompt: "Translate 'apple' to Spanish." },
  { prompt: "Translate 'cat' to French." },
  { prompt: "Translate 'dog' to German." },
];

(async () => {
  const [error, response, rawResponse] = await batchGpt.parallel({
    messageList,
    concurrency: 3,
    verbose: true,
  });
  console.log(error, response, rawResponse);
})();
