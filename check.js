import ChatGpt from "./ChatGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai });

const functionSignature = {
  name: "get_current_weather",
  description: "Get the current weather in a given location",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city and state, e.g. San Francisco, CA",
      },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["location"],
  },
};

const [error, response, statusHistory] = await chatGpt.request({
  messages: [
    {
      role: "user",
      content: `What is the weather in Albuquerque?`,
    },
  ],
  functions: [
    {
      functionSignature,
      function: async ({ location }) => {
        return {
          location: "Albuquerque",
          temperature: "72",
          unit: "fahrenheit",
          forecast: ["sunny", "windy"],
        };
      },
    },
  ],
  ensureJson: true,
  retryCount: 1,
  timeout: 2 * 60 * 1000,
  minTokens: 10,
  retryDelay: (count) => count,
  verbose: true,
});

console.log(error, response, statusHistory);

// This example shows how to make use of the request function, using function calling syntax. This is determined by specifiy a functions list in the parameters. We set the request to be retried only once it the initial request fails. We have also set the timemout for the request to 2 mins, it the request takes longer then the request is rejected and retried if (the retry count has not be exceeded). We have also set that open recieving a response that response must contain above 10 tokens to be considered a valid response.
