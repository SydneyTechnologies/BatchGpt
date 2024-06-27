/* eslint-disable quotes */
import { BatchGpt, logLevels } from "./lib/BatchGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";

// load environment variables
dotenv.config();

// setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const batchGpt = new BatchGpt({
  openai,
  logLevel: logLevels.DEBUG,
  model: "gpt-4o",
});

async function main() {
  // GENERATE IMAGES
  // const [error, response] = await batchGpt.generateImage({
  //   prompt: "A dog playing in a park",
  // });

  // GET IMAGE DESCRIPTION
  // const [error, response] = await batchGpt.generateImageDescription({
  //   image:
  //     "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Lince_ib%C3%A9rico_%28Lynx_pardinus%29%2C_Almuradiel%2C_Ciudad_Real%2C_Espa%C3%B1a%2C_2021-12-19%2C_DD_07.jpg/1920px-Lince_ib%C3%A9rico_%28Lynx_pardinus%29%2C_Almuradiel%2C_Ciudad_Real%2C_Espa%C3%B1a%2C_2021-12-19%2C_DD_07.jpg",
  //   level: "low",
  // });

  // GET IMAGE TAGS

  const imageBuffer = fs.readFileSync("./pyramid.png");
  const [error, response] = await batchGpt.generateImageTags({
    // context: "valley",
    image: imageBuffer,
    searchTermCount: 5,
    requestOptions: {
      model: "gpt-4o",
    },
    // randomness: 10,
  });

  if (!error) {
    console.log("Images generated successfully");
    console.log(response);
  }
}

main();
