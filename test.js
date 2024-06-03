import { BatchGpt } from "./lib/BatchGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

// load environment variables
dotenv.config();

// setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const batchGpt = new BatchGpt({ openai });

// prompt
async function main() {
  const messages = [{ role: "user", content: "Tell me a joke" }];
  const [err, response] = await batchGpt.request({ messages });

  // use response
  if (!err) {
    // Do something with response
    console.log(response.content);
  }
}
main();
