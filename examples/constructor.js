import BatchGpt from "batch-gpt";
import OpenAI from "openai";
import dotenv from "dotenv";

// setup
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const batchGpt = new BatchGpt({
  openai,
  retryCount: 2,
  enableModeration: true,
  moderationThreshold: 0.0001,
});

// prompt
const messages = [
  {
    role: "user",
    content: "Is self defense manslaughter?",
  },
];
const [err, response, statusHistory] = await batchGpt.request({
  messages,
  ensureJson: false,
  verbose: true,
});

//use response
if (!err) {
  console.log(err, response, statusHistory);
}
