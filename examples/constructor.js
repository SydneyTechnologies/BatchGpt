// import ChatGpt from "ChatGpt";
import ChatGpt from "../ChatGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

// setup
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai, retryCount: 2 });

// prompt
const messages = [
  {
    role: "user",
    content: "What is my name?",
  },
];
const [err, response, statusHistory] = await chatGpt.request({
  messages,
  ensureJson: false,
});

//use response
if (!err) {
  // Do something with response
  console.log(err, typeof err);

  console.log(response);

  console.log(response);
}
