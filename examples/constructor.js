// import BatchGpt from "batch-gpt";
import { BatchGpt, verboseType } from "../BatchGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

// setup
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const batchGpt = new BatchGpt({
  openai,
  retryCount: 2,
});

// prompt
const messages = [
  {
    role: "user",
    content: "Tell me a joke",
  },
];

(async () => {
  const [err, response, statusHistory] = await batchGpt.request({
    messages,
    validateJson: false,
    verbose: verboseType.NONE,
  });

  // use response
  if (!err) {
    console.log(response.content);
    console.log("statusHistory", statusHistory);
  }
})();
