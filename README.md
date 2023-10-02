# GPT LIBRARY DOCS

# ChatGpt Documentation

The `ChatGpt` class is a JavaScript class designed to facilitate interactions with the ChatGPT API provided by OpenAI. It allows users to send requests to the API using either traditional prompting or function calling, and it includes options for managing request retries, timeouts, and concurrency. Below is a detailed documentation of the `ChatGpt` class and its methods.

If you would like a quick example of how to make use of this library then the example below should be a great start. We are sending a simple prompt without functional calling syntax

```js
import ChatGpt from "ChatGpt";
import OpenAI from "openai";

// setup
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai, retryCount: 2 });

// prompt
const messages = [
  {
    role: "user",
    content:
      "Generate a script for a social media video showcasing our company culture",
  },
];
const [err, response] = await chatGpt.request({ messages });

//use response
if (!err) {
  // Do something with response
}
```

For more advanced usage of the library for things like, concurrent requests, request timeouts, onResponse callbacks and function calling prompting then below is shows how to setup the gptClass for your needs.

# ChatGpt Class

The starting point is the ChatGpt class, to utilize most of the features of this library we have to go through the parameters for constructing a ChatGpt class instance. Below is a list of all the parameters that can be set for the class, there is however only one required parameter which is the openai object.

### Parameters

Below is a list of all the parameters that can be set in the constructor of the ChatGpt class. The only required parameter that needs to be set is the openai object.

| Parameters  | Default              | Description                                                                                                  | Required |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| openai      |                      | Openai object to interface with the api                                                                      | Yes      |
| model       | "gpt-3.5-turbo-0613" | This is the model that will be initialized for the api                                                       | No       |
| temperature | 1                    | This temperature set for the model read more in the openai documentation.                                    | No       |
| retryCount  | 0                    | Number of retries per request.                                                                               | No       |
| retryDelay  | null                 | How long to wait before retrying a request. It could be a function `(count)=>{ count + 500}`. (Milliseconds) | No       |
| timemout    | 5 x 60 x 1000        | Max time a request can take before, it is rejected                                                           | No       |
| concurrency | 1                    | For parallel requests, how many operations should run at a time                                              | No       |
| verbose     | false                | If true, will log all requests and responses to the console.                                                 | No       |

### Simple example

```js
import ChatGpt from "ChatGpt";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai });
```

### Advanced example

```js
import ChatGpt from "ChatGpt";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({
  openai,
  temperature: 1.2,
  retryCount: 2,
  retryDelay: (count) => count * 500,
  timeout: 20 * 1000,
  concurrency: 2,
  verbose: true,
});

// the chatGpt object is set to run two requests in parallel. If any of the requests fail initially it will attempt to retry the
// request at most two times, however the request must resolve under 20 seconds if not they fail. Retry delay is set to a value that is dependent on the current try number of the request
```

## `request` method

The `request` method that actually sends a request to the openai api for chatgpt. The function is capable of using both function calling syntax and regular prompting.

### Parameters

Below is a list of all the parameters that can be set for the request function. Note that setting things that already setup in the constructor for the class will lead to an override for this specific request.

| Parameters      | Default       | Description                                                                                                  | Required |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| messages        |               | This is a list of prompt messages to send to the api                                                         | Yes      |
| functions       | null          | This defines list of function signatures for gpt function calling approach.                                  | No       |
| retryCount      | 0             | Number of retries per request.                                                                               | No       |
| retryDelay      | null          | How long to wait before retrying a request. It could be a function `(count)=>{ count + 500}`. (Milliseconds) | No       |
| timemout        | 5 x 60 x 1000 | Max time a request can take before, it is rejected . (Milliseconds)                                          | No       |
| minResponseTime | 5 x 60 x 1000 | This sets a minimum time a response should take for it to be regarded as a valid response. (Milliseconds)    | No       |
| minTokens       | null          | This sets a minimum number of tokens a response should have for it to be regarded as a valid response        | No       |
| verbose         | false         | If true, will log all requests and responses to the console.                                                 | No       |

### return

The function returns an array of objects in the same positional order as shown below

| return        | type                 | Description                                                                                                                                                               |
| ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| error         | `<string>` or `null` | This is a list of prompt messages to send to the api                                                                                                                      |
| response      | `<object>`           | This is the response gotten from the GPT api, it is an object with a content and time_per_token property `{content:"", time_per_token:0}`                                 |
| statusHistory | Array`<object>`      | Array of the results of all the retries for a specific request. Each individual object has this structure `{status:"failure", response: "Timed out", responseTime: 2002}` |

### Simple example

```js
// Note this is partial code showing only the relevant portions for this section
const chatGpt = new ChatGpt({ openai });
const messages = [
  {
    role: "user",
    content:
      "Generate a script for a social media video showcasing our company culture",
  },
];
const [err, response] = await chatGpt.request({ messages });
```

### Advanced example

```js
const chatGpt = new ChatGpt({ openai });

const functionSignature = {
  name: "translate_to_french",
  description: `Translates any english word to french`,
  parameters: {
    type: "string",
    properties: {
      french: {
        type: "string",
        description: "Hello, how are you? to French.",
      },
    },
  },
  required: ["french"],
};
const [error, response, statusHistory] = await chatGpt.request({
  messages: [
    {
      role: "user",
      content: 'Translate the following text: "Hello, how are you?" to French.',
    },
  ],
  functions: [functionSignature],
  retryCount: 1,
  timeout: 2 * 60 * 1000,
  minTokens: 10,
  retryDelay: (count) => count,
  verbose: true,
});

// This example shows how to make use of the request function, using function calling syntax. This is determined by specifiy a functions list in the parameters. We set the request to be retried only once it the initial request fails. We have also set the timemout for the request to 2 mins, it the request takes longer then the request is rejected and retried if (the retry count has not be exceeded). We have also set that open recieving a response that response must contain above 10 tokens to be considered a valid response.
```

## `parallel` method

The `Parallel` method sends parallel requests to the ChatGpt API, allowing for concurrent processing of multiple requests. It accepts parameters for configuring the parallel requests, such as message objects, concurrency, and callback function for handling results. It returns an array containing error information, the aggregated API responses, and raw responses for each parallel request.

### Parameters

Below is a list of all the parameters that can be set for the parallel function. Note that setting things that already setup in the constructor for the class will lead to an override for these specific requests.

| Parameters      | Default       | Description                                                                                                    | Required |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| messageObjList  |               | This is a list of messages objects needed to construct the correct api request                                 | Yes      |
| concurrency     | 1             | For parallel requests, how many operations should run at a time                                                | No       |
| retryCount      | 0             | Number of retries per request.                                                                                 | No       |
| retryDelay      | null          | How long to wait before retrying a request. It could be a function `(count)=>{ count + 500}` . (Milliseconds)  | No       |
| timemout        | 5 x 60 x 1000 | Max time a request can take before, it is rejected. (Milliseconds)                                             | No       |
| minResponseTime | 5 x 60 x 1000 | This sets a minimum time a response should take for it to be regarded as a valid response. (Milliseconds)      | No       |
| minTokens       | null          | This sets a minimum number of tokens a response should have for it to be regarded as a valid response          | No       |
| verbose         | false         | If true, will log all requests and responses to the console.                                                   | No       |
| onResponse      | null          | This is a callback function that is called when a request has been completed. `(response, index, prompt)=>{ }` | No       |

### return

The function returns an array of objects in the same positional order as shown below

| return      | type                       | Description                                                                                                                |
| ----------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| error       | Array `<string>` or `null` | This is a list requests that errored out an errorList                                                                      |
| response    | Array `<object>`           | This is an arrary of all the response content objects for each request                                                     |
| rawResponse | `any`                      | This is an array containing the raw results of each request. Basically an array of the return type of the request function |

### Simple example

```jsx
// Sending parallel requests using the Parallel method
const messageObjList = [
  { prompt: "Translate 'apple' to Spanish.", priority: 1 },
  { prompt: "Translate 'cat' to French.", priority: 2 },
  { prompt: "Translate 'dog' to German.", priority: 3 }, // the highest priority is executed first
];

await chatGpt.Parallel({
  messageObjList,
  concurrency: 3,
});
```

### Advanced example

```js
import ChatGpt from "./ChatGpt.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const chatGpt = new ChatGpt({ openai, verbose: false, timeout: 8000 });

// List of translation tasks to be processed in parallel
const translationTasks = [
  { text: "Hello", language: "es", priority: 1 }, // Translate 'Hello' to Spanish
  { text: "Bonjour", language: "de", priority: 2 }, // Translate 'Bonjour' to German
  { text: "Ciao", language: "fr", priority: 0 }, // Translate 'Ciao' to French
];

async function main() {
  try {
    // Perform parallel tasks with dynamic retryDelay
    await chatGpt.parallel({
      messageObjList: translationTasks.map((task) => {
        return {
          prompt: `Translate '${task.text}' to ${task.language}. Your response should be in the following valid JSON structure: { "word": ".." , "fromLanguage": ".." , translation: "..", toLanguage: ".."}`,
          priority: task.priority,
        };
      }),
      concurrency: 3,
      retryCount: 3, // Retry each task 3 times on failure
      retryDelay: (value) => value * 1000, // Retry delay in milliseconds
      onResponse: (result) => {
        console.log("result\n", result[1]);
      },
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the main function
main();
```
