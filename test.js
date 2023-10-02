import util from "node:util";

import ChatGpt from "./ChatGpt.js";
// import Configuration from "openai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const businessName = "Al Farooj Restaurant";
const gmbKey = "Arabic restaurant";
const placeCountry = "Copenhagen, Denmark";
const keywords = "family friendly, 24/7 Open, Vegan Options";

const openai = new OpenAI({ apiKey: process.env.API_KEY });

const funcSignature = {
  name: "get_restaurant_content",
  description: `Provide the content for "${businessName}" website, "${gmbKey}" business based in "${placeCountry}"`,
  parameters: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description:
          "The headline should be less than 10 words. In the headline, give a glimpse of what the business is.",
      },
      paragraph: {
        type: "string",
        description: `Provide a paragraph in no less than 40 words. Mention the mission, aims and goals the business has. Make sure to include these keywords "${keywords}" in the content. Don't use the word "About".`,
      },
    },
  },
  required: ["headline", "paragraph"],
};

const chatGpt = new ChatGpt({
  openai,
  model: "gpt-3.5-turbo",
  verbose: false,
  timeout: 8000,
});
const messages = [
  {
    role: "user",
    content: `For an "About" section, write a headline for "${gmbKey}" business based in "${placeCountry}" called "${businessName}". The headline should be less than 10 words. In the headline, give a glimpse of what the business is. Also provide a paragraph in no less than 40 words. Mention the mission, aims and goals the business has. Make sure to include these keywords "${keywords}" in the content. Don't use the word "About". `,
  },
];
const functions = [funcSignature];
// const [error, gptResponse, statusHistory] = await chatGpt.FunctionCall({
//   messages,
//   functions,
//   noRetries: 2,
//   retryDelay: 2000,
// });

const newMessage = {
  prompt: `For an "About" section, write a headline for "${gmbKey}" business based in "${placeCountry}" called "${businessName}". The headline should be less than 10 words. In the headline, give a glimpse of what the business is. Also provide a paragraph in no less than 40 words. Mention the mission, aims and goals the business has. Make sure to include these keywords "${keywords}" in the content. Don't use the word "About".`,
  functionSignature: funcSignature,
  priority: 1,
};

const message = {
  prompt: `For an "About" section, write a headline for "${gmbKey}" business based in "${placeCountry}" called "${businessName}". The headline should be less than 10 words. In the headline, give a glimpse of what the business is. Also provide a paragraph in no less than 40 words. Mention the mission, aims and goals the business has. Make sure to include these keywords "${keywords}" in the content. Don't use the word "About".Your response should be in the following valid JSON structure:
  {
    "headline": "..",
    "paragraph": ".."
  }`,
  priority: 1,
};

const [error, response, rawResponse] = await chatGpt.parallel({
  messageObjList: [message],
  concurrency: 1,
  retryCount: 2,
  retryDelay: (value) => (value + 1) * 1000,
  verbose: true,
  timeout: 2000,
  onResponse: (result, i, prompt) => {
    // console.log("result\n", result[2]);
    // console.log(util.inspect(result, { depth: null, colors: true }));
  },
});

// console.log("error", util.inspect(error, { depth: null, colors: true }));
// console.log("response", util.inspect(response, { depth: null, colors: true }));
console.log(
  "rawresponse",
  util.inspect(rawResponse, { depth: null, colors: true })
);
