// import BatchGpt from "batch-gpt";
import { BatchGpt, verboseType } from "../BatchGpt.js";

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new BatchGpt({ openai });

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

(async () => {
  const [error, response, statusHistory] = await chatGpt.request({
    messages: [
      {
        role: "user",
        content: "What is the weather in New Jersey?",
      },
    ],
    functions: [
      {
        functionSignature,
        callback: async ({ location }) => {
          return {
            location,
            temperature: "72",
            unit: "fahrenheit",
            forecast: ["sunny", "windy"],
          };
        },
      },
    ],
    validateJson: true,
    retryCount: 1,
    timeout: 2 * 60 * 1000,
    minTokens: 10,
    retryDelay: (count) => count,
    verbose: verboseType.INFO,
  });

  console.log(error, response, statusHistory);
})();

// This example shows how to make use of the request function, using function calling syntax. This is determined by specifiy a functions list in the parameters. We set the request to be retried only once it the initial request fails. We have also set the timemout for the request to 2 mins, it the request takes longer then the request is rejected and retried if (the retry count has not be exceeded). We have also set that open recieving a response that response must contain above 10 tokens to be considered a valid response.
// This example also show how ensureJson is used. If ensureJson is set to true then the ChatGpt is forced to try and return a json object. If the response is not a json object then the ChatGpt will try to parse the response as a json object. If the response is not a json object then the ChatGpt will return an error.
