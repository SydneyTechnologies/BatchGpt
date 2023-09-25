import PQueue from "p-queue";
import Configuration from "openai";
import OpenAIApi from "openai";
import dotenv from "dotenv";

dotenv.config();
const configuration = new Configuration({ apiKey: process.env.API_KEY });
const openai = new OpenAIApi(configuration);
// Create a queue with concurrency of 5 and a timeout of 1100 milliseconds
const queue = new PQueue({ concurrency: 2, timeout: 1100 });

async function FunctionCall(entry) {
  const queue = new PQueue({ timeout: 500 });
  console.log("Sending request to chatgpt api");

  try {
    const response = await queue.add(async () =>
      openai.chat.completions.create({
        messages: [{ role: "user", content: "What is LLM" }],
        model: "gpt-3.5-turbo",
      })
    );
  } catch (e) {
    console.log("error", e);
  }

  return entry;
}
const requestOne = async () => {
  // Simulate an asynchronous operation
  console.log("starting requestOne");
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 900);
  });
  return "Result from requestOne";
};

// Create a request generator
function requestGenerator(count) {
  const promise = FunctionCall;
  let requestsList = [];
  for (let i = 0; i < count; i++) {
    requestsList.push(promise);
    // requestsList.push(requestOne);
  }

  return requestsList;
}

const tasks = requestGenerator(5);

// Add all the tasks to the queue
const promises = tasks.map((task) => queue.add(async () => task("test")));
Promise.all(promises).then(() => {
  console.log("All requests completed");
});
