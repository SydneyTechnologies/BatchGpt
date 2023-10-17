# BatchGPT Docs

# BatchGpt Documentation

The `BatchGpt` class is a JavaScript class designed to facilitate interactions with the ChatGPT API provided by OpenAI. It allows users to send requests to the API using either traditional prompting or function calling, and it includes options for managing request retries, timeouts, and concurrency. Below is a detailed documentation of the `BatchGpt` class and its methods.

If you would like a quick example of how to make use of this library then the example below should be a great start. For more examples visit the [examples](https://github.com/SydneyTechnologies/GptLibrary/blob/master/examples) folder on this respository.

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

// setup
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const batchGpt = new BatchGpt({ openai, retryCount: 2 });

// prompt
const messages = [
  {
    role: "user",
    content:
      "Generate a script for a social media video showcasing our company culture",
  },
];
const [err, response] = await batchGpt.request({ messages });

// use response
if (!err) {
  // Do something with response
  console.log(response);
}
```

For more advanced usage of the library for things like, concurrent requests, request timeouts, onResponse callbacks and function calling then the documentation below shows how to setup the BatchGpt class for your needs.

# BatchGpt Class

The starting point is the BatchGpt class, to utilize most of the features of this library we have to go through the parameters for constructing a BatchGpt class instance.

### Parameters

Below is a list of all the parameters that can be set in the constructor of the BatchGpt class. The only required parameter that needs to be set is the openai object.

| Parameters          | Default         | Description                                                                                                                                                                                                                                                                                                                                                                               | Required |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| openai              |                 | OpenAI object to interface with the api.                                                                                                                                                                                                                                                                                                                                                  | Yes      |
| model               | "gpt-3.5-turbo" | This is the model that will be initialized for the api.                                                                                                                                                                                                                                                                                                                                   | No       |
| temperature         | 1               | This temperature set for the large language model. If you wish to read more, visit the [OpenAI documentation](https://platform.openai.com/docs/api-reference/chat/create).                                                                                                                                                                                                                | No       |
| retryCount          | 0               | Number of retries per request.                                                                                                                                                                                                                                                                                                                                                            | No       |
| retryDelay          | null            | How many milliseconds to wait before retrying a request, alternatively it could be a function `(retryCount)=>{ retryCount + 500 }`.                                                                                                                                                                                                                                                       | No       |
| timeout             | 5 \* 60 \* 1000 | Maximum time in milliseconds a request can take before it is rejected.                                                                                                                                                                                                                                                                                                                    | No       |
| moderationEnable    | false           | Setting this value to true enables a sentimental analysis using OpenAI's [Moderation API](https://platform.openai.com/docs/guides/moderation/overview) on the provided prompt. If the prompt is flagged or is within the specified criteria as per the moderationThreshold, then the request is rejected. This parameter should be used in hand with the `moderationThreshold` parameter. | No       |
| moderationThreshold | null            | Sets the threshold value required to flag a prompt. The moderationThreshold is compared against the category scores returned from OpenAI's [Moderation API](https://platform.openai.com/docs/guides/moderation/overview).                                                                                                                                                                 | No       |
| concurrency         | 1               | For parallel requests, how many operations should run at a time.                                                                                                                                                                                                                                                                                                                          | No       |
| verbose             | false           | If true, will log all requests and responses to the console.                                                                                                                                                                                                                                                                                                                              | No       |

### Simple example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "my api key",
});

const batchGpt = new BatchGpt({ openai });
```

### Advanced example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "my api key",
});

const batchGpt = new BatchGpt({
  openai,
  temperature: 1.2,
  retryCount: 2,
  retryDelay: (count) => count * 500,
  timeout: 20 * 1000,
  concurrency: 2,
  verbose: true,
  moderationEnable: true,
});

// the batchGpt object is set to run two requests in parallel. If any of the requests fail it will attempt to retry the
// request at most two times, however the request must resolve under 20 seconds if not, the request is rejected. Retry delay is set to a value that is dependent on the current attempt number of the request.
// Request made using the class object will be subject to a pre-check of the prompt through the OpenAI's Moderation API
```

## `request` function

The `request` function that actually sends a request to the OpenAI api for chatgpt. The function is capable of using both function calling syntax and regular prompting.

### Parameters

Below is a list of all the parameters that can be set for the `request` function. Note that setting things that are already setup in the constructor for the class will lead to an override for this specific request.

| Parameters      | Default         | Description                                                                                                                                        | Required |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| messages        |                 | This is a list of prompt messages to send to the api                                                                                               | Yes      |
| functions       | null            | This defines list of function signatures for gpt function calling approach.                                                                        | No       |
| retryCount      | 0               | Number of retries per request.                                                                                                                     | No       |
| retryDelay      | null            | How long to wait before retrying a request. It could be a function `(count)=>{ count + 500}`. (Milliseconds)                                       | No       |
| ensureJson      | false           | Force the response to returned in JSON. It will force a JSON on regular requests and functionCall requests. Set to false for default GPT behaviour | No       |
| timemout        | 5 \* 60 \* 1000 | Max time a request can take before, it is rejected . (Milliseconds)                                                                                | No       |
| minResponseTime | 5 \* 60 \* 1000 | This sets a minimum time a response should take for it to be regarded as a valid response. (Milliseconds)                                          | No       |
| minTokens       | null            | This sets a minimum number of tokens a response should have for it to be regarded as a valid response                                              | No       |
| verbose         | false           | If true, will log all requests and responses to the console.                                                                                       | No       |

### ensureJson parameter

This forces the GPT model to produce a JSON response, this however may cause the request to fail (ChatGPT may be unable to provide a JSON response). It should only be used in two cases

1. When you wish to get the parameters generated by chatgpt as specified in the function signature of a function call
2. If you have specifically included in your prompt for chatgpt to provide a response as a valid JSON

otherwise ensureJson should be left at its default configuration, which is false.

### return

The function returns an array of objects in the same positional order as shown below

| return        | type                 | Description                                                     |
| ------------- | -------------------- | --------------------------------------------------------------- |
| error         | `<string>` or `null` | This is a list of prompt messages to send to the api            |
| response      | `<object>`           | This is the response gotten from the GPT api                    |
| statusHistory | `Array<object>`      | Array of the results of all the attempts for a specific request |

### return example

```js
{

  //ERROR
  error: null,


  //RESPONSE
  response: {
    content:
      "I'm sorry, but I don't have access to personal information about individuals unless it has been shared with me in the course of our conversation. I am an AI language model and I prioritize user privacy and data protection.",
    time_per_token: 38,
  },


  //STATUS HISTORY
  statusHistory: [
    {
      moderation: null,
      status: "success",
      response: {
        content:
          "I'm sorry, but I don't have access to personal information about individuals unless it has been shared with me in the course of our conversation. I am an AI language model and I prioritize user privacy and data protection.",
        time_per_token: 38,
      },
      responseTime: 1690,
      tokens: 44,
    },
  ],
};


```

### Simple example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "my api key",
});

const batchGpt = new BatchGpt({ openai });
const messages = [
  {
    role: "user",
    content:
      "Generate a script for a social media video showcasing our company culture",
  },
];
const [err, response] = await batchGpt.request({ messages });
```

### Advanced example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "my api key",
});

const batchGpt = new BatchGpt({ openai });

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

const [error, response, statusHistory] = await batchGpt.request({
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
```

## `parallel` method

The `Parallel` method sends parallel requests to the ChatGpt API, allowing for concurrent processing of multiple requests. It accepts parameters for configuring the parallel requests, such as message objects, concurrency, and callback function for handling results. It returns an array containing error information, the aggregated API responses, and raw responses for each parallel request.

### Parameters

Below is a list of all the parameters that can be set for the parallel function. Note that setting things that already setup in the constructor for the class will lead to an override for these specific requests.

| Parameters      | Default         | Description                                                                                                    | Required |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| messageList     |                 | This is a list of messages objects needed to construct the correct api request                                 | Yes      |
| concurrency     | 1               | For parallel requests, how many operations should run at a time                                                | No       |
| retryCount      | 0               | Number of retries per request.                                                                                 | No       |
| retryDelay      | null            | How long to wait before retrying a request. It could be a function `(count)=>{ count + 500}` . (Milliseconds)  | No       |
| timemout        | 5 \* 60 \* 1000 | Max time a request can take before, it is rejected. (Milliseconds)                                             | No       |
| minResponseTime | 5 \* 60 \* 1000 | This sets a minimum time a response should take for it to be regarded as a valid response. (Milliseconds)      | No       |
| minTokens       | null            | This sets a minimum number of tokens a response should have for it to be regarded as a valid response          | No       |
| verbose         | false           | If true, will log all requests and responses to the console.                                                   | No       |
| onResponse      | null            | This is a callback function that is called when a request has been completed. `(response, index, prompt)=>{ }` | No       |

## messageList example

```js
const messageList = [
  {
    prompt: "...",
    functions: [
      { functionSignature: "...", function: function () {} },
      { functionSignature: "...", function: function () {} },
    ],
    ensureJson: true,
  },
];
```

### return

The function returns an array of objects in the same positional order as shown below

| return       | type                      | Description                                                                                                                |
| ------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| errors       | `Array<string>` or `null` | This is a list requests that errored out an errorList                                                                      |
| responses    | `Array<object>`           | This is an arrary of all the response content objects for each request                                                     |
| rawResponses | `Array<object>`           | This is an array containing the raw results of each request. Basically an array of the return type of the request function |

### return example

```js
{

  //ERRORS
  error: null,


  //RESPONSES
  responses: [
  { content: 'manzana', time_per_token: 346 },
  { content: 'chat', time_per_token: 90 },
  { content: 'Hund', time_per_token: 504 }
]


  //RAW RESPONSES
  rawResponses: [
  [ null, { content: 'manzana', time_per_token: 346 }, [ [Object] ] ],
  [ null, { content: 'chat', time_per_token: 90 }, [ [Object] ]],
  [ null, { content: 'Hund', time_per_token: 504 }, [ [Object] ] ]
  ]
};

```

### Simple example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "my api key",
});

const batchGpt = new BatchGpt({ openai });

// Sending parallel requests using the Parallel method
const messageObjList = [
  { prompt: "Translate 'apple' to Spanish." },
  { prompt: "Translate 'cat' to French." },
  { prompt: "Translate 'dog' to German." }, // the highest priority is executed first
];

await batchGpt.parallel({
  messageObjList,
  concurrency: 3,
});
```

### Advanced example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "my api key",
});

const batchGpt = new BatchGpt({ openai, verbose: false, timeout: 8000 });

// List of translation tasks to be processed in parallel
const translationTasks = [
  { text: "Hello", language: "es" }, // Translate 'Hello' to Spanish
  { text: "Bonjour", language: "de" }, // Translate 'Bonjour' to German
  { text: "Ciao", language: "fr" }, // Translate 'Ciao' to French
];

async function main() {
  try {
    // Perform parallel tasks with dynamic retryDelay
    await batchGpt.parallel({
      messageList: translationTasks.map((task) => {
        return {
          prompt: `Translate '${task.text}' to ${task.language}. Your response should be in the following valid JSON structure: { "word": ".." , "fromLanguage": ".." , translation: "..", toLanguage: ".."}`,
        };
      }),
      concurrency: 3,
      retryCount: 3, // Retry each task 3 times on failure
      retryDelay: (value) => value * 1000, // Retry delay in milliseconds
      onResponse: (result) => {
        // return the response
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
