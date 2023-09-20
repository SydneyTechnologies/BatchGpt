import ChatGpt from "./ChatGpt.js";
import Configuration from "openai";
import OpenAIApi from "openai";
import dotenv from "dotenv";

dotenv.config();

const businessName = "Al Farooj Restaurant";
const gmbKey = "Arabic restaurant";
const placeCountry = "Copenhagen, Denmark";
const keywords = "family friendly, 24/7 Open, Vegan Options";

const configuration = new Configuration({ apiKey: process.env.API_KEY });
const openai = new OpenAIApi(configuration);

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

const chatGpt = new ChatGpt({ openai, verbose: true });
const messages = [
  {
    role: "user",
    content: `For an "About" section, write a headline for "${gmbKey}" business based in "${placeCountry}" called "${businessName}". The headline should be less than 10 words. In the headline, give a glimpse of what the business is. Also provide a paragraph in no less than 40 words. Mention the mission, aims and goals the business has. Make sure to include these keywords "${keywords}" in the content. Don't use the word "About".`,
  },
];
const functions = [funcSignature];
const [error, gptResponse, statusHistory] = await chatGpt.FunctionCall({
  messages,
  functions,
  noRetries: 2,
  retryDelay: 2000,
});

console.log("error", error);
console.log("gptResponse", gptResponse);
console.log("statusHistory", statusHistory);
