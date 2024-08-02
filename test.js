//@ts-check
import { OpenAI } from "openai";
import { BatchGpt } from "./lib/BatchGpt.js";
import { logLevels } from "./lib/constants.js";
import { config } from "dotenv";

config();

// TEST BATCH GPT METHODS

// AVAILABLE METHODS INCLUDE
// request,
// parallel,
// getImageDescription
// getImageTags

// Initialize the BatchGpt class

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const batchGpt = new BatchGpt({
  openai,
  model: "gpt-3.5-turbo",
  logLevel: logLevels.DEBUG,
});

// Test the request method
// batchGpt.request({ prompt: "Hi" }).then(([error, response]) => {
//   error;
//   if (response) console.log(response.response.choices[0].message.content);
// });

// // Test the parallel method
// batchGpt
//   .parallel({
//     concurrency: 2,
//     messages: [
//       "What is the capital of France?",
//       "What is the capital of Germany?",
//     ],
//   })
//   .then((result) => {
//     result.forEach(([err, response]) => {
//       err;
//       if (response) {
//         console.log(response.response.choices[0].message.content);
//       }
//     });
//   });

batchGpt
  .generateImageTags({
    image:
      "https://images.unsplash.com/photo-1511216113906-8f57bb83e776?q=80&w=2848&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    randomness: 50,
    searchTermCount: 5,
  })
  .then(([error, response]) => {
    if (response && !error) {
      console.log(response.response.choices[0].message.content);
    }
  });

// batchGpt
//   .imageDescription({
//     image:
//       "https://images.unsplash.com/photo-1511216113906-8f57bb83e776?q=80&w=2848&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
//   })
//   .then(([error, response]) => {
//     error;
//     console.log(response?.response.choices[0].message.content);
//   });
