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

// async function main() {
//   const messages = [
//     "Create an image iphone 16",
//     "Create an image of a water bottle beside the Eiffel Tower.",
//     "Create an image of kyrptonian Crocodile",
//   ];
//   const [res1, res2, res3] = await batchGpt.parallel({
//     messageList: messages,
//     requestOptions: {
//       imageModel: "dall-e-3",
//     },
//   });

//   console.log(res1, res2, res3);
// }

async function main() {
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `What’s in this image? generate search terms that can easily capture the essense of the image and provide the result as a JSON object
          as expressed below
          { searchTerms: [“term1”, “term2”, “term3”] } 
           `,
        },
        {
          type: "image_url",
          image_url: {
            url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
          },
        },
      ],
    },
  ];
  const [error, response] = await batchGpt.request({
    requestOptions: {
      messages,
      model: "gpt-4o",
    },
  });

  if (!error) {
    console.log(response);
  }
}
main();
