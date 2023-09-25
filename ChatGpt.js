// This is an in house library for interfacing with the chatgpt api

// Imports
import PQueue from "p-queue";

class Logger {
  // set up helper functions
  /**
   *  logger, helps log information to the console based on the verbose setting
   *  @param {boolean} verbose setting for logging to the console
   */
  constructor({ verbose = true }) {
    this.verbose = verbose;
  }

  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
}
class ChatGpt {
  /**
   *  ChatGpt class constructor. This class is used to interface with the chatgpt api, and setup default values for the api
   *  @param  openai Openai object to interface with the api
   *  @param {string}  model This is the model that will be initialized for the api
   *  @param {number}  temperature This temperature set for the model read more in the openai documentation. Default is 1.
   *  @param {number} noRetries Number of retries per request. Default is 1
   *  @param {number} retryDelay How long to wait before retrying a request. Default is 1000ms (value in milliseconds)
   *  @param {number} concurrency For parallel requests, how many requests to send at once. Default is 1
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 15000ms (value in milliseconds)
   *  @param {boolean} verbose If true, will log all requests and responses to the console. Default is false
   */
  constructor({
    openai,
    model,
    temperature = 1,
    noRetries = 1,
    retryDelay = 1000,
    concurrency = 1,
    timeout = 15000,
    verbose = false,
  }) {
    this.openai = openai;
    this.model = model;
    this.temperature = temperature;
    this.noRetries = noRetries;
    this.retryDelay = retryDelay;
    this.concurrency = concurrency;
    this.timeout = timeout;
    this.verbose = verbose;
  }

  /**
   *  isJson function, checks if a string is valid JSON
   *  @param {string} str potential JSON string to check
   */
  isJson = (str) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  /**
   *  fromJsonToObject function, converts a JSON string to a Javascript object
   *  @param {string} jsonString JSON string
   *  @returns {Object} returns a Javascript object
   */
  fromJsonToObject = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      this.logger("Input string is an Invalid JSON string");
      throw new Error("Input string is an Invalid JSON string");
    }
  };

  /**
   *  delay function, delays the execution of the next function call by the specified time
   *  @param {number} time time in milliseconds to delay
   */
  delay = async (time) => {
    await new Promise((resolve) => setTimeout(resolve, time));
  };

  /**
   *  getToken function, calculates the tokens recieved from the gpt api
   *  @param {string} response passed into this function should the raw response from the chatgpt api
   *  @returns {number} returns the number of tokens recieved from the api as a number
   */
  getToken = (response) => {
    const token = response.usage.completion_tokens;
    return parseInt(token);
  };

  /**
   *  Sends a function call prone request to the chatgpt api
   *  @param {[{role: string, content: string}]} messages This is a list of prompt messages to send to the api
   *  @param {number} noRetries This is the number of retries for the request. Default is what is set in the constructor for the class. If not set it is 1
   *  @param {[Object]} functions This defines list of function signatures for gpt function calling approach.
   *  @param {number} retryDelay This is the delay between retries for the request. Default is what is set in the constructor for the class. If not set it is 1000ms
   *  @param {boolean} verbose This is the verbose setting for the request. Default is what is set in the constructor for the class. If not set it is false
   *  @param {number} minResponseTime This sets a minimum time a response should take for it to be regarded as a valid response. Default is 3000ms
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 15000ms (value in milliseconds)
   *  @returns {Array} [error, response, statusHistory]. error tells us if the response failed or not (it contains an error message, which states what went wrong). response is an object containing the response from the api. statusHistory is an array of objects containing the status of each attempted request and the result of the request
   */
  async FunctionCall({
    messages,
    functions,
    verbose = this.verbose,
    minResponseTime = 3000,
    noRetries = this.noRetries,
    timeout = this.timeout,
    retryDelay = this.retryDelay,
  }) {
    let error = null;
    let gptResponse = null;
    let retryCount = 0;
    let statusHistory = [];

    // instantiate logger
    const logger = new Logger({ verbose });
    const log = logger.log.bind(logger);
    // Instantiate a queue object
    const queue = new PQueue({
      timeout,
    });

    // while loop for retrying requests
    while (retryCount < noRetries) {
      let start, end;
      retryCount++;

      try {
        // Log request
        log("Sending request to chatgpt api");
        // Start timer
        start = Date.now();
        const response = await queue.add(async () =>
          this.openai.chat.completions.create({
            messages,
            functions,
            model: this.model,
            temperature: this.temperature,
          })
        );

        // return response;

        end = Date.now();

        // Check if response is undefined due to timeout
        if (response === undefined) throw new Error("Request timed out");

        // get response content from the api
        const responseContent = response.choices[0].message;
        log("GOT A RESPONSE");
        // log("RESPONSE CONTENT");
        // log(responseContent);

        // Check if response is a function call
        if (!responseContent.function_call) {
          log("Not a function call");
          throw new Error("Not a function call");
        }

        // Check if response is empty or valid JSON
        const fnCallArguments = this.fromJsonToObject(
          responseContent.function_call.arguments
        );
        if (Object.keys(fnCallArguments).length === 0) {
          log("Empty response");
          throw new Error("Empty response");
        }

        const responseTime = end - start;

        // Check if request completed in a valid response time
        if (responseTime <= minResponseTime)
          throw new Error(
            `Response is unreliable. Response Time ${responseTime} < minResponseTime ${minResponseTime}`
          );
        // if all checks pass, log status history and break out of while loop
        gptResponse = {
          content: fnCallArguments,
          time_per_token: Math.round(responseTime / this.getToken(response)),
        };
        statusHistory.push({
          status: "success",
          response: gptResponse,
          responseTime,
        });

        log(`Received response in ${end - start} milliseconds`);
        console.log(
          "gptResponse",
          gptResponse,
          "statusHistory",
          statusHistory,
          "error",
          error
        );

        break;
      } catch (e) {
        log("ERROR");
        log(e);
        end = Date.now();
        // if any one of the try block fails, log the status history and retry the request
        error = e.message;
        statusHistory.push({
          status: "failure",
          response: error,
          responseTime: end - start,
        });

        // if retryDelay is set, wait for the specified time before retrying the request
        retryDelay > 0 && (await this.delay(retryDelay));
        retryDelay > 0 &&
          log(`Waiting for ${retryDelay} milliseconds before retrying`);
      }
    }

    return [error, gptResponse, statusHistory];
    // resolve([error, gptResponse, statusHistory]);
  }

  /**
   *  Sends a regular request to the chatgpt api
   *  @param {[{role: string, content: string}]} messages This is a list of prompt messages to send to the api
   *  @param {number} noRetries This is the number of retries for the request. Default is what is set in the constructor for the class. If not set it is 1
   *  @param {number} retryDelay This is the delay between retries for the request. Default is what is set in the constructor for the class. If not set it is 1000ms
   *  @param {verbose} verbose This is the verbose setting for the request. Default is what is set in the constructor for the class. If not set it is false
   *  @param {number} minResponseTime This sets a minimum time a response should take for it to be regarded as a valid response. Default is 3000ms
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 15000ms (value in milliseconds)
   *  @returns {Array} [error, response, statusHistory]. error tells us if the response failed or not (it contains an error message, which states what went wrong). response is an object containing the response from the api. statusHistory is an array of objects containing the status of each attempted request and the result of the request
   */

  async GptCall({
    verbose,
    messages,
    noRetries,
    retryDelay,
    timeout = this.timeout,
    minResponseTime = 3000,
  }) {
    // setting up required variables for logging and requests
    let error = null;
    let gptResponse = null;
    let retryCount = 0;
    let statusHistory = [];

    // instantiate logger
    const logger = new Logger({ verbose });
    const log = logger.log.bind(logger);
    // Instantiate a queue object
    const queue = new PQueue({
      timeout,
    });

    // while loop for retrying requests
    while (retryCount < noRetries) {
      let start, end;
      retryCount++;

      try {
        // Log request
        log("Sending request to chatgpt api");
        // Start timer
        start = Date.now();
        const response = await queue.add(
          this.openai.chat.completions.create({
            messages,
            model: this.model,
            temperature: this.temperature,
          })
        );
        end = Date.now();

        // Check if response is undefined due to timeout
        if (response === undefined) throw new Error("Request timed out");

        // Get response content from the api
        const responseContent = response.choices[0].message;
        log("GOT A RESPONSE");
        // log("RESPONSE CONTENT");
        // log(responseContent);

        // Check if response is empty or valid JSON
        if (!this.isJson(responseContent)) {
          log("Empty response");
          throw new Error("Empty response");
        }

        const responseTime = end - start;

        // Check if request completed in a valid response time
        if (responseTime <= minResponseTime)
          throw new Error(
            `Response is unreliable. Response Time ${responseTime} < minResponseTime ${minResponseTime}`
          );

        // if all checks pass, log status history and break out of while loop
        gptResponse = {
          content: responseContent,
          time_per_token: Math.round(responseTime / this.getToken(response)),
        };
        statusHistory.push({
          status: "success",
          response: gptResponse,
          responseTime,
        });

        // log(`Received response in ${end - start} milliseconds`);
        break;
      } catch (e) {
        log("ERROR");
        log(e);
        end = Date.now();
        // if any one of the try block fails, log the status history and retry the request
        error = e.message;
        statusHistory.push({
          status: "failure",
          response: error,
          responseTime: end - start,
        });

        // if retryDelay is set, wait for the specified time before retrying the request
        retryDelay > 0 && (await this.delay(retryDelay));
        retryDelay > 0 &&
          logger(`Waiting for ${retryDelay} milliseconds before retrying`);
      }
    }

    return [error, gptResponse, statusHistory];
  }

  /**
   *  Sends parallel requests to the chatgpt api (using either function calling or regular gpt prompting)
   *  @param {Array} messageObjList This is a list of prompt messages to send to the api, (each message object contains a prompt, an optional functionSignature property and an optional priority number property)
   *  @param {number} concurrency For parallel requests, how many requests to send at once. Default is what is set in the constructor for the class. If not set it is 1
   *  @param {number} noRetries This is the number of retries for the request. Default is what is set in the constructor for the class. If not set it is 1
   *  @param {number} retryDelay This is the delay between retries for the request. Default is what is set in the constructor for the class. If not set it is 1000ms
   *  @param {verbose} verbose This is the verbose setting for the request. Default is what is set in the constructor for the class. If not set it is false
   *  @param {number} minResponseTime This sets a minimum time a response should take for it to be regarded as a valid response. Default is 3000ms
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 15000ms (value in milliseconds)
   *  @returns {Array} [error, response, statusHistory]. error tells us if the response failed or not (it contains an error message, which states what went wrong). response is an object containing the response from the api. statusHistory is an array of objects containing the status of each attempted request and the result of the request
   */
  async Parallel({
    messageObjList,
    verbose = this.verbose,
    minResponseTime = 3000,
    timeout = this.timeout,
    noRetries = this.noRetries,
    retryDelay = this.retryDelay,
    concurrency = this.concurrency,
  }) {
    // instantiate logger
    const logger = new Logger({ verbose });
    const log = logger.log.bind(logger);

    // generate a list of promises for each request from the messageObjList
    log("Generating promises for each request");
    const requests = messageObjList.map((message) => {
      let promise;
      if (message.functionSignature) {
        promise = async () => {
          const fn = this.FunctionCall.bind(this);
          const response = fn({
            messages: [{ role: "user", content: message.prompt }],
            functions: [message.functionSignature],
            verbose,
            minResponseTime,
            timeout,
            noRetries,
            retryDelay,
          });
          return response;
        };
      } else {
        promise = this.GptCall({
          messages: [{ role: "user", content: message.prompt }],
          verbose,
          minResponseTime,
          timeout,
          noRetries,
          retryDelay,
        });
      }

      return { promise, priority: message?.priority || 0 };
    });

    // Instantiate a queue object
    const queue = new PQueue({
      concurrency,
      timeout,
    });
    // add each request to the queue
    log("Adding promise to queue");
    // debugger;
    const promises = requests.map(({ promise, priority }) => {
      // debugger;
      const request = queue.add(
        async () => {
          // debugger;
          const value = promise();
          return value;
        },
        { priority }
      );
      return request;
    });

    // wait for all requests to complete
    debugger;
    const results = await Promise.all(promises);
    log("All requests completed");
    return results;
  }
}

export default ChatGpt;
