# BatchGPT Docs

# BatchGpt Documentation

The `BatchGpt` class is a JavaScript class designed to facilitate interactions with the ChatGPT API provided by OpenAI. It allows users to send requests to the API using either traditional prompting or function calling, and it includes options for managing request retries, timeouts, and concurrency. Below is a detailed documentation of the `BatchGpt` class and its methods.

If you would like a quick example of how to make use of this library then the example below should be a great start. For more examples visit the [examples](https://github.com/SydneyTechnologies/GptLibrary/blob/master/examples) folder on the respository.

```js
import { BatchGpt } from "batch-gpt";
import OpenAI from "openai";

// setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const batchGpt = new BatchGpt({ openai });

// prompt
const messages = [{ role: "user", content: "Tell me a joke" }];
const [err, response] = await batchGpt.request({ messages });

// use response
if (!err) {
  // Do something with response
  console.log(response.content);
}

// output
// Sure, here's one for you:
// Why don't scientists trust atoms?
// Because they make up everything!
```

For more advanced utilization of the library, such as handling concurrent requests, setting request timeouts, utilizing onResponse callbacks, and making function calls, please refer to the documentation below. It provides detailed instructions on configuring the BatchGpt class to suit your specific requirements.

# BatchGpt Class

The starting point is the BatchGpt class, to utilize most of the features of this library we have to go through the parameters for constructing a BatchGpt class instance.

### Parameters

Below is a list of all the parameters that can be set in the constructor of the BatchGpt class. The only required parameter that needs to be set is the openai object.

| Parameters          | Default         | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Required |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| openai              |                 | An instance of the OpenAI API client used to interface with the API services. It's required for making requests to OpenAI's models.                                                                                                                                                                                                                                                                                       | Yes      |
| model               | "gpt-3.5-turbo" | The specific language model to be initialized for API interactions. The default is "gpt-3.5-turbo," but you can specify other models supported by OpenAI if needed.                                                                                                                                                                                                                                                       | No       |
| temperature         | 1               | A parameter controlling the randomness of the model's responses. Higher values (e.g., 1.0) make the output more random, while lower values (e.g., 0.2) make it more focused and deterministic. For further details, refer to the [OpenAI documentation](https://platform.openai.com/docs/api-reference/chat).                                                                                                             | No       |
| validateJson        | false           | Validates if the response recieved is a valid JSON.                                                                                                                                                                                                                                                                                                                                                                       | No       |
| retryCount          | 0               | The number of times a failed request will be retried before giving up. If set to 0, no retries will be attempted.                                                                                                                                                                                                                                                                                                         | No       |
| retryDelay          | null            | The delay in milliseconds before attempting a retry. It can be either a fixed delay (e.g., 500) or a function that dynamically adjusts the delay based on the retry count (e.g., `(retryCount) => retryCount * 500`).                                                                                                                                                                                                     | No       |
| timeout             | 5 \* 60 \* 1000 | The maximum time in milliseconds that a request can take before being rejected. If a response isn't received within this time frame, the request will be considered as failed.                                                                                                                                                                                                                                            | No       |
| moderationEnable    | false           | When set to true, enables sentiment analysis using OpenAI's [Moderation API](https://platform.openai.com/docs/guides/moderation/overview) on the provided prompt. If the prompt is flagged or matches the specified moderation criteria (controlled by `moderationThreshold`), the request will be rejected. It should be used in conjunction with the `moderationThreshold` parameter.                                   | No       |
| moderationThreshold | null            | The moderationThreshold is compared against the category scores returned from OpenAI's [Moderation API](https://platform.openai.com/docs/guides/moderation/overview). If the scores exceed this threshold, the prompt will be flagged and rejected.                                                                                                                                                                       | No       |
| concurrency         | 1               | Specifies how many parallel operations should be executed simultaneously. This parameter controls the level of concurrency for making requests to the OpenAI API.                                                                                                                                                                                                                                                         | No       |
| verbose             | "NONE"          | Controls the level of logging. Possible values are "NONE" (no logging), "INFO" (basic information logging), and "DEBUG" (detailed debug logging). Default is "NONE." If set to "INFO" or "DEBUG," the library will log requests and responses to the console, providing detailed information about each API interaction. This parameter helps in understanding the flow of requests and responses for debugging purposes. | No       |

### Simple Constructor Example

```js
import BatchGpt from "batch-gpt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const batchGpt = new BatchGpt({ openai });
```

### Advanced Constructor example

```js
import { BatchGpt, verboseType } from "batch-gpt";
import OpenAI from "openai";

// Initialize OpenAI API client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a BatchGpt instance with custom configuration
const batchGpt = new BatchGpt({
  openai, // Required: OpenAI API client object
  temperature: 1.2, // Optional: Controls randomness of the model's output (default is 1.0)
  retryCount: 2, // Optional: Number of retries for failed requests (default is 0)
  retryDelay: (count) => count * 500, // Optional: Delay function for retries based on attempt count
  timeout: 20 * 1000, // Optional: Maximum time for a request to complete, in milliseconds (default is 5 minutes)
  concurrency: 2, // Optional: Number of parallel requests to send (default is 1)
  verbose: verboseType.DEBUG, // Optional: Logging level ("NONE", "INFO", or "DEBUG")
  moderationEnable: true, // Optional: Enable content moderation using OpenAI's Moderation API
  moderationThreshold: 0.5, // Optional: Threshold for content moderation (default is null)
});

// The batchGpt object is configured to run two requests in parallel. If any request fails, it will be retried up to two times.
// Each request must resolve within 20 seconds; otherwise, it will be rejected. Retry delay increases with each attempt.
// Requests made using this BatchGpt instance will undergo moderation checks through OpenAI's Moderation API.
```

## `request` function

The `request` function that actually sends a request to the OpenAI api for ChatgGPT. The function is capable of using both function calling syntax and regular prompting.

### Parameters

Below is a list of all the parameters that can be set for the `request` function. Note that setting things that are already setup in the constructor for the class will lead to an override for this specific request.

| Parameters      | Default         | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Required |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| messages        |                 | A list of prompt messages to be sent to the API.                                                                                                                                                                                                                                                                                                                                                                          | Yes      |
| functions       | null            | An optional list of function signatures for GPT function calling approach.                                                                                                                                                                                                                                                                                                                                                | No       |
| retryCount      | 0               | Number of retry attempts per request in case of failure.                                                                                                                                                                                                                                                                                                                                                                  | No       |
| retryDelay      | null            | Time interval (in milliseconds) to wait before retrying a failed request. Can be a function `(count) => count * 500`. Null for no delay.                                                                                                                                                                                                                                                                                  | No       |
| validateJson    | false           | If set to true, validates the response to ensure it is in a proper JSON format. Applicable for both regular requests and function calls. Set to false for default GPT behavior.                                                                                                                                                                                                                                           | No       |
| timeout         | 5 \* 60 \* 1000 | Maximum time (in milliseconds) a request can take before being rejected.                                                                                                                                                                                                                                                                                                                                                  | No       |
| minResponseTime | 5 \* 60 \* 1000 | Minimum time (in milliseconds) a response should take to be regarded as valid.                                                                                                                                                                                                                                                                                                                                            | No       |
| minTokens       | null            | Minimum number of tokens a response should have to be considered valid. Set to null for no minimum requirement.                                                                                                                                                                                                                                                                                                           | No       |
| verbose         | "NONE"          | Controls the level of logging. Possible values are "NONE" (no logging), "INFO" (basic information logging), and "DEBUG" (detailed debug logging). Default is "NONE." If set to "INFO" or "DEBUG," the library will log requests and responses to the console, providing detailed information about each API interaction. This parameter helps in understanding the flow of requests and responses for debugging purposes. | No       |

**Explanation:**

**validateJson (boolean):** When set to true, this parameter enables the validation of responses to ensure they are in a proper JSON format. This validation is applicable for both regular requests and function calls. If the response is not in a valid JSON format and `validateJson` is set to true, an error will be raised. Setting it to false allows responses in any format without validation.

### Return

The function yields an array of objects arranged as follows:

| Return          | Type                                                              | Description                                                                                                                                    |
| --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `error`         | `<string>` \| `null`                                              | Describes any errors encountered during the API request process. If no errors occur, this is `null`.                                           |
| `response`      | `{content:string, time_per_token: number}`                        | Contains the response received from the GPT API for the given request.                                                                         |
| `statusHistory` | `Array<{moderation: object, status: string,  response: object }>` | An array detailing the outcomes of all attempts made for a specific request, including moderation results if any, status,response information. |

### Simple example

```js
// Assuming we continue for the Simple Constructor Example
const messages = [{ role: "user", content: "YOUR PROMPT" }];
const [err, response] = await batchGpt.request({ messages });
```

### Advanced example

```js
// Assuming we continue for the Simple Constructor Example

const functions = [
  {
    functionSignature: {
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
    },
    callback: async ({ location }) => {
      return {
        location: "Albuquerque",
        temperature: "72",
        unit: "fahrenheit",
        forecast: ["sunny", "windy"],
      };
    },
  },
];

const [error, response, statusHistory] = await batchGpt.request({
  messages: [{ role: "user", content: `What is the weather in Albuquerque?` }],
  functions,
  verbose: true,
  validateJson: true,
});

console.log(error, response, statusHistory);
```

## `parallel` function

The `parallel` function is a powerful tool that enables the concurrent processing of multiple requests by sending them simultaneously to the ChatGpt API. It accepts a set of configurable parameters, including message objects, concurrency settings, and a callback function for result handling.

### Parameters

Below is a list of all the parameters that can be set for the parallel function. Note that setting things that already setup in the constructor for the class will lead to an override for these specific requests.

| Parameters      | Default         | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Required |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| messageList     |                 | List of message objects required to construct the correct API request.                                                                                                                                                                                                                                                                                                                                                    | Yes      |
| concurrency     | 1               | Number of simultaneous operations for parallel requests.                                                                                                                                                                                                                                                                                                                                                                  | No       |
| retryCount      | 0               | Number of retry attempts per request in case of failure.                                                                                                                                                                                                                                                                                                                                                                  | No       |
| retryDelay      | null            | Time interval (in milliseconds) to wait before retrying a failed request. Can be a function `(count) => count * 500`. Null for no delay.                                                                                                                                                                                                                                                                                  | No       |
| timeout         | 5 \* 60 \* 1000 | Maximum time (in milliseconds) a request can take before being rejected.                                                                                                                                                                                                                                                                                                                                                  | No       |
| minResponseTime | 5 \* 60 \* 1000 | Minimum time (in milliseconds) a response should take to be regarded as valid.                                                                                                                                                                                                                                                                                                                                            | No       |
| minTokens       | null            | Minimum number of tokens a response should have to be considered valid. Set to null for no minimum requirement.                                                                                                                                                                                                                                                                                                           | No       |
| onResponse      | null            | Callback function called after a request is completed. `(response, index, prompt) => {}`                                                                                                                                                                                                                                                                                                                                  | No       |
| verbose         | "NONE"          | Controls the level of logging. Possible values are "NONE" (no logging), "INFO" (basic information logging), and "DEBUG" (detailed debug logging). Default is "NONE." If set to "INFO" or "DEBUG," the library will log requests and responses to the console, providing detailed information about each API interaction. This parameter helps in understanding the flow of requests and responses for debugging purposes. | No       |

**Explanation:**

**messageList:** `Array<{prompt: string, functions: Array<{functionSignature: object, callback: any}>, validateJson: boolean}>`

The messageList parameter is an array of objects that contains the prompts to be sent to a the BatchGpt parallel function. However each object that constitutes a message require the following attributes which help configure how that request will be processed.

1.  prompt: This is the prompt sent to ChatGPT api
2.  functions: This is an array of type `{functionSignature: object, callback: any}`, when this value is not null, this indicates a function call and helps configure to prompt to use ChatGPT's function calling syntax. The functionSignature specificies the signature of the function and the callback is the function to be called ChatGPT decides to call the function.
3.  validateJson: Validates if the response recieved is a valid.

### Return

The function returns an array of objects in the same positional order as shown below

| return       | type                                               | Description                                                                                                                |
| ------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| errors       | `Array<string>` \| `null`                          | This is a list requests that errored out an errorList                                                                      |
| responses    | `Array<{content: string, time_per_token: number}>` | This is an arrary of all the response content objects for each request                                                     |
| rawResponses | `Array<object>`                                    | This is an array containing the raw results of each request. Basically an array of the return type of the request function |

### Simple example

```js
// Assuming we continue for the Simple Constructor Example

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
// Assuming we continue for the Simple Constructor Example

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
