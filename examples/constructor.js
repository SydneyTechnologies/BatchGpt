import BatchGpt from "batch-gpt";
import OpenAI from "openai";
import dotenv from "dotenv";

// setup
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const batchGpt = new BatchGpt({ openai, retryCount: 2 });

// prompt
const messages = [
  {
    role: "user",
    content: "What is my name?",
  },
];
const [err, response, statusHistory] = await batchGpt.request({
  messages,
  ensureJson: true,
  verbose: true,
});

//use response
if (!err) {
  console.log(err, response, statusHistory);
}
