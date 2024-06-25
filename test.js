/* eslint-disable quotes */
import { BatchGpt, logLevels } from "./lib/BatchGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

// load environment variables
dotenv.config();

// setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const batchGpt = new BatchGpt({
  openai,
  logLevel: logLevels.DEBUG,
});

async function main() {
  // GENERATE IMAGES
  // const [error, response] = await batchGpt.generateImage({
  //   prompt: "A painting of a beautiful sunset over the ocean",
  // });

  // GET IMAGE DESCRIPTION
  // const [error, response] = await batchGpt.generateImageDescription({
  //   image:
  //     "https://plus.unsplash.com/premium_photo-1661765778256-169bf5e561a6?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  //   level: "low",
  // });

  // GET IMAGE TAGS
  const [error, response] = await batchGpt.generateImageTags({
    image:
      "https://plus.unsplash.com/premium_photo-1661765778256-169bf5e561a6?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    searchTermCount: 1,
    randomness: 10,
  });

  if (!error) {
    console.log("Images generated successfully");
    console.log(response);
  }
}

main();
