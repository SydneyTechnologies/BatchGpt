// This is an in house library for interfacing with the chatgpt api

// Imports
import PQueue from "p-queue";
import * as utils from "./utils.js";

export const verboseType = {
  NONE: "NONE", // log nothing
  INFO: "INFO", // log everything except warnings and errors
  DEBUG: "DEBUG", // log all steps including warnings and errors
};

export class BatchGpt {
  /**
   * Constructs a BatchGPT object to interface with the ChatGPT API and sets up default values for API requests.
   * @param {object} openai OpenAI object used to interface with the API.
   * @param {string} model The model to be initialized for API requests.
   * @param {number} timeout Maximum time a request can take before being rejected. Default is 5 minutes (300,000 milliseconds). Set to null to disable timeout.
   * @param {number} minResponseTime Minimum time a response should take to be considered valid. Default is null.
   * @param {number} minTokens Minimum number of tokens a response should have to be regarded as valid. Default is null.
   * @param {number} retryCount Number of retries per request. Default is 0.
   * @param {number} temperature The temperature parameter for the model (read more in OpenAI documentation). Default is 1.
   * @param {number} concurrency Number of parallel operations allowed for parallel requests. Default is 1.
   * @param {boolean} validateJson Performs a check to ensure that the response is valid JSON. Default is false.
   * @param {boolean} moderationEnable If true, enables moderation for the API (read more in the OpenAI documentation). Default is false.
   * @param {number} moderationThreshold The threshold for the moderation API. Default is null.
   * @param {"NONE" | "INFO" | "DEBUG"} verbose Controls the level of logging. Default is NONE.
   * @param {number | function(): number} retryDelay Delay Time in milliseconds before retrying a request. Default is 0 milliseconds. Can be a number or a function returning a number.
   */

  constructor({
    openai,
    retryCount = 0,
    retryDelay = 0,
    verbose = false,
    temperature = 1,
    concurrency = 1,
    minTokens = null,
    validateJson = false,
    minResponseTime = null,
    model = "gpt-3.5-turbo",
    timeout = 5 * 60 * 1000,
    moderationEnable = false,
    moderationThreshold = null,
  }) {
    this.model = model;
    this.openai = openai;
    this.timeout = timeout;
    this.verbose = verbose;
    this.minTokens = minTokens;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
    this.concurrency = concurrency;
    this.temperature = temperature;
    this.validateJson = validateJson;
    this.minResponseTime = minResponseTime;
    this.moderationEnable = moderationEnable;
    this.moderationThreshold = moderationThreshold;
  }

  /**
   * generateFunctionMap function, generates a function map from a list of function signatures and their corresponding functions
   * @param {[{functionSignature: Object, callback: function}]} functions This is a list of function signatures and their corresponding functions
   * @returns {Object} returns a function map
   */
  generateFunctionMap(functions) {
    const functionMap = {};
    functions.forEach((functionObject) => {
      functionMap[functionObject.functionSignature.name] =
        functionObject.callback;
    });
    return functionMap;
  }
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
   * ModerationApi function, sends a request to the moderation api to perform sentiment analysis on the input
   * @param {string} input
   * @returns {Array<Object>} returns an array of two objects, the first object is the safe input, the second object is the moderation result
   */
  async moderationApi(input) {
    const moderation = await this.openai.moderations.create({ input });
    const moderationResult = moderation.results[0];

    const flaggedCategories = Object.keys(moderationResult.categories).filter(
      (category) =>
        Number(moderationResult.category_scores[category]) >=
        this.moderationThreshold
    );
    const safeInput = {
      flagged: moderationResult.flagged,
      categories: flaggedCategories,
    };

    return [safeInput, moderationResult];
  }

  validateRequestParameters({
    messages,
    minTokens,
    functions,
    validateJson,
    minResponseTime,
    timeout,
    verbose,
    retryCount,
    retryDelay,
  }) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error(
        "Invalid 'messages' parameter. It should be a non-empty array."
      );
    }

    if (minTokens !== null && typeof minTokens !== "number") {
      throw new Error(
        "Invalid 'minTokens' parameter. It should be a number or null."
      );
    }

    if (functions !== null && !Array.isArray(functions)) {
      throw new Error(
        "Invalid 'functions' parameter. It should be an array of objects."
      );
    }

    if (functions) {
      for (const funcObj of functions) {
        if (
          !funcObj ||
          typeof funcObj !== "object" ||
          !funcObj.functionSignature ||
          typeof funcObj.function !== "function"
        ) {
          throw new Error(
            "Invalid 'functions' parameter. Each object in the array should have 'functionSignature' and 'function' fields."
          );
        }
      }
    }

    if (typeof validateJson !== "boolean") {
      throw new Error(
        "Invalid 'validateJson' parameter. It should be a boolean value."
      );
    }

    if (minResponseTime !== null && typeof minResponseTime !== "number") {
      throw new Error(
        "Invalid 'minResponseTime' parameter. It should be a number or null."
      );
    }

    if (timeout !== null && (typeof timeout !== "number" || timeout <= 0)) {
      throw new Error(
        "Invalid 'timeout' parameter. It should be a number greater than zero or null."
      );
    }

    if (verbose !== "NONE" && verbose !== "INFO" && verbose !== "DEBUG") {
      throw new Error(
        "Invalid 'verbose' parameter. It should be one of 'NONE', 'INFO', or 'DEBUG'."
      );
    }

    if (
      retryCount !== null &&
      (typeof retryCount !== "number" || retryCount < 0)
    ) {
      throw new Error(
        "Invalid 'retryCount' parameter. It should be a non-negative number or null."
      );
    }

    if (
      retryDelay !== null &&
      typeof retryDelay !== "number" &&
      typeof retryDelay !== "function"
    ) {
      throw new Error(
        "Invalid 'retryDelay' parameter. It should be a number, null, or a function."
      );
    }

    // If retryDelay is a function, validate its signature
    if (typeof retryDelay === "function" && retryDelay.length !== 1) {
      throw new Error(
        "Invalid 'retryDelay' function signature. It should take one parameter (current value of retryCount)."
      );
    }

    // Validate other parameters as needed...

    // If all checks pass, return true
    return true;
  }

  validateParallelParameters({
    messageList,
    onResponse,
    verbose,
    minResponseTime,
    minTokens,
    timeout,
    retryCount,
    retryDelay,
    concurrency,
  }) {
    // Validate messageList
    if (!Array.isArray(messageList) || messageList.length === 0) {
      throw new Error(
        "messageList must be a non-empty array of message objects."
      );
    }

    // Validate onResponse callback
    if (typeof onResponse !== "function") {
      throw new Error("onResponse must be a function.");
    }

    // Validate verbose
    if (verbose !== "NONE" && verbose !== "INFO" && verbose !== "DEBUG") {
      throw new Error("verbose must be one of 'NONE', 'INFO', or 'DEBUG'.");
    }

    // Validate minResponseTime
    if (minResponseTime !== null && typeof minResponseTime !== "number") {
      throw new Error("minResponseTime must be a number or null.");
    }

    // Validate minTokens
    if (minTokens !== null && typeof minTokens !== "number") {
      throw new Error("minTokens must be a number or null.");
    }

    // Validate timeout
    if (timeout !== null && (typeof timeout !== "number" || timeout < 0)) {
      throw new Error("timeout must be a non-negative number or null.");
    }

    // Validate retryCount
    if (typeof retryCount !== "number" || retryCount < 0) {
      throw new Error("retryCount must be a non-negative number.");
    }

    // Validate retryDelay
    if (
      retryDelay !== null &&
      (typeof retryDelay !== "number" || retryDelay < 0)
    ) {
      throw new Error("retryDelay must be a non-negative number or null.");
    }

    // Validate concurrency
    if (typeof concurrency !== "number" || concurrency <= 0) {
      throw new Error("concurrency must be a positive number.");
    }

    // If all validations pass, return true or perform further logic
    return true;
  }

  /**
   * Sends a request to the ChatGPT API, allowing two approaches: regular GPT prompting or GPT function calling.
   *
   * @param {Array<{role: string, content: string}>} messages - List of prompt messages to send to the API.
   * @param {Array<{functionSignature: Object, callback: any}>} functions - List of function signatures and corresponding functions for GPT function calling approach.
   * @param {number | null} timeout - Maximum time allowed for the request. Default is 5 minutes (300,000 milliseconds). Set to null for no timeout.
   * @param {number | null} minTokens - Minimum number of tokens a response should have to be regarded as valid. Default is null.
   * @param {number | null} minResponseTime - Minimum time a response should take to be considered valid. Default is null.
   * @param {"NONE" | "INFO" | "DEBUG"} verbose - Verbosity setting for the request. Default is "NONE".
   * @param {number} retryCount - Number of retries for the request. Default is 0 if not specified.
   * @param {number | function(): number} retryDelay - Delay between retries for the request. Default is 0.
   * @param {boolean} validateJson - Ensures that the response is valid JSON. Default is true.
   * @returns {Array} - [error, response, statusHistory]
   *   - error: Indicates if the response failed (contains an error message describing the issue).
   *   - response: Object containing the response from the API and time_per_token to generate that response.
   *   - statusHistory: Array of objects containing the status of each attempted request and its result.
   */
  async request({
    messages,
    functions = null,
    timeout = this.timeout,
    verbose = this.verbose,
    minTokens = this.minTokens,
    retryCount = this.retryCount,
    retryDelay = this.retryDelay,
    validateJson = this.validateJson,
    minResponseTime = this.minResponseTime,
  }) {
    let error = null;
    let gptResponse = null;
    let retryAttempt = -1;
    let statusHistory = [];

    // instantiate logger
    const logger = new utils.Logger({ verbose });
    const logInfo = logger.log.bind(logger);
    const logWarn = logger.warn.bind(logger);
    const logError = logger.error.bind(logger);

    // analyze set parameters
    this.validateRequestParameters({
      messages,
      timeout,
      verbose,
      minTokens,
      functions,
      retryCount,
      retryDelay,
      validateJson,
      minResponseTime,
    });

    // warn for conflicting parameters
    if (validateJson) {
      logWarn(
        "validateJson set to true, on regular gpt prompting may result in an Invalid JSON error. Ensure that your prompt tells ChatGPT to return a valid JSON response"
      );
    }

    if (this.moderationEnable && !this.moderationThreshold) {
      logWarn("Moderation is enabled, moderationThreshold should also be set");
    }

    if (this.moderationThreshold && !this.moderationEnable) {
      logWarn(
        "Moderation threshold set but moderation is not enabled, moderation threshold will be ignored"
      );
    }

    if (validateJson && functions) {
      logWarn(
        "validateJson will nullify function calling and will cause only the parameters defined in the function call signature to be returned"
      );
    }
    // Instantiate a queue object
    const queue = new PQueue({ timeout, throwOnTimeout: true });
    let moderation,
      safeInput,
      moderationResult = null;

    if (this.moderationEnable) {
      logInfo("Enable moderation: true");
      logInfo("Moderation threshold: ", this.moderationThreshold);
      logInfo("Analyzing user prompt...");

      moderation = await this.moderationApi(messages[0].content);
      safeInput = moderation[0];
      moderationResult = moderation[1];
      logInfo(`Moderation result recieved\n`, moderationResult);
    }

    if (safeInput?.flagged || safeInput?.categories.length > 0) {
      const moderationError = `Prompt was flagged for ${safeInput.categories.join(
        ", "
      )}`;
      logError(moderationError);
      return [moderationError, null, null];
    }

    // while loop for retrying requests
    while (retryAttempt < retryCount) {
      let start, end;
      let responseContent = null;
      retryAttempt++;
      error = null;

      try {
        // Log request
        logInfo(
          `Sending request to chatgpt api [attempt: ${retryAttempt + 1}]`
        );
        // Start timer
        start = Date.now();

        const response = await queue.add(async () =>
          functions
            ? this.openai.chat.completions.create({
                messages,
                functions: functions.map((fn) => fn.functionSignature),
                model: this.model,
                temperature: this.temperature,
              })
            : this.openai.chat.completions.create({
                messages,
                model: this.model,
                temperature: this.temperature,
              })
        );

        end = Date.now();

        // Check if response is undefined due to timeout
        if (response === undefined) throw new Error("Request timed out");

        // get response content from the api
        responseContent = response.choices[0].message;

        // function calling can be used in two ways, the first way is (to get a forced JSON response from chatGPT)
        // the next way is to allow chat gpt to call an external function
        let fnCallArguments = null;
        let fnResponse = null;
        if (functions) {
          // if call is invoked as a function call
          if (!responseContent.function_call) {
            logError(
              "Input Indicates function call but GPT did not return one"
            );
            throw new Error("Not a function call");
          }

          // if the call is a function call then we need to know which function to call
          const functionCallName = responseContent.function_call.name;
          const functionMap = this.generateFunctionMap(functions);

          // Check if response is empty or valid JSON
          fnCallArguments = fromJsonToObject(
            responseContent.function_call.arguments
          );
          if (Object.keys(fnCallArguments).length === 0) {
            // logError("Recieved Empty response from function call arguments");
            throw new Error("Empty response");
          }

          // call the function if it exists and if ensureJSON is false
          if (!validateJson && functionMap[functionCallName]) {
            const fn = functionMap[functionCallName];
            fnResponse = await fn(fnCallArguments);
          }
        } else {
          // if call is invoked as a regular gpt prompt
          // Check if response is empty or valid JSON
          if (validateJson && !isJson(responseContent.content)) {
            // logError(
            //   "validateJson set to True but Invalid JSON response recieved. Check your prompt"
            // );
            throw new Error("Invalid JSON response");
          }
        }

        const responseTime = end - start;

        // Check if request completed in a valid response time
        if (minResponseTime && responseTime <= minResponseTime) {
          throw new Error(
            `Response is unreliable. Response Time ${responseTime} < minResponseTime ${minResponseTime}`
          );
        }

        const tokens = this.getToken(response);

        // Check if response has enough tokens
        if (minTokens && tokens <= minTokens) {
          throw new Error(
            `Response is unreliable. Tokens received ${tokens} < minTokens ${minTokens}}`
          );
        }
        // if all checks pass, log status history and break out of while loop
        gptResponse = {
          content: fnResponse || fnCallArguments || responseContent.content,
          time_per_token: Math.round(responseTime / tokens),
        };
        statusHistory.push({
          moderation: moderationResult,
          status: "success",
          response: gptResponse,
          responseTime,
          tokens,
        });

        logInfo(`Received response in ${end - start} milliseconds`);

        break;
      } catch (e) {
        // even though the response failed we can still set it to the response content
        gptResponse = {
          content: responseContent.content,
          time_per_token: null,
        };

        logError(e.message);
        end = Date.now();
        // if any one of the try block fails, log the status history and retry the request
        error = e.message;
        statusHistory.push({
          moderation: moderationResult,
          status: "failure",
          response: error,
          responseTime: end - start,
        });

        // if retryDelay is set, wait for the specified time before retrying the request
        if (typeof retryDelay !== "function") {
          if (retryDelay > 0 && retryAttempt < retryCount) {
            logInfo(`Waiting for ${retryDelay} milliseconds before retrying`);
            await utils.delay(retryDelay);
          }
        } else if (retryAttempt < retryCount) {
          const retryDelayValue = retryDelay(retryAttempt);
          logInfo(
            `Waiting for ${retryDelayValue} milliseconds before retrying`
          );
          await utils.delay(retryDelayValue);
        }
      }
    }

    logInfo("Request completed");
    logInfo("Error:", error);
    logInfo(
      "Response:\n",
      gptResponse.content,
      "\ntime_per_token:",
      gptResponse.time_per_token
    );
    logInfo("Status History:", statusHistory);
    return [error, gptResponse, statusHistory];
  }

  /**
   * Sends parallel requests to the ChatGPT API, handling various parameters to customize the request behavior.
   *  @param {Array<{prompt: string, functions: Array, validateJson: boolean}>} messageList This is a list of prompt messages to send to the api, (each message object contains a prompt, an optional functionSignature property and an optional priority number property)
   *  @param {number} concurrency For parallel requests, how many requests to send at once. Default is what is set in the constructor for the class. If not set it is 1
   *  @param {number} retryCount - Number of retries for the request. Default is 0 if not specified.
   *  @param {number | function(): number} retryDelay - Delay between retries for the request. Default is 0.
   *  @param {number | null} minTokens - Minimum number of tokens a response should have to be regarded as valid. Default is null.
   *  @param {"NONE" | "INFO" | "DEBUG"} verbose - Verbosity setting for the request. Default is "NONE".
   *  @param {number | null} minResponseTime - Minimum time a response should take to be considered valid. Default is null.
   *  @param {number | null} timeout - Maximum time allowed for the request. Default is 5 minutes (300,000 milliseconds). Set to null for no timeout.
   *  @param {function} onResponse This is a callback function that is called when a request has been completed.
   *  @returns {Array} - An array containing three elements: [errors, responses, rawResponses].
   *   - errors An array of errors containing an error message describing the issue.
   *   - responses: An array of objects containing the response from the API for each request.
   *   - rawResponses: An array of objects containing responses from the API for each request.
   */
  async parallel({
    messageList,
    onResponse = null,
    verbose = this.verbose,
    timeout = this.timeout,
    minTokens = this.minTokens,
    retryCount = this.retryCount,
    retryDelay = this.retryDelay,
    concurrency = this.concurrency,
    minResponseTime = this.minResponseTime,
  }) {
    // validate parameters
    this.validateParallelParameters({
      verbose,
      timeout,
      minTokens,
      retryCount,
      retryDelay,
      onResponse,
      concurrency,
      messageList,
      minResponseTime,
    });
    // instantiate logger
    const logger = new utils.Logger({ verbose });
    const logInfo = logger.log.bind(logger);

    // generate a list of promises for each request from the messageList
    logInfo("Generating promises for each request");
    const requests = messageList.map((message) => {
      let promise;

      promise = async () => {
        const fn = this.request.bind(this);
        const response = fn({
          messages: [{ role: "user", content: message.prompt }],
          functions: message.functions ? [message.functions] : null,
          verbose,
          minTokens,
          minResponseTime,
          timeout,
          retryCount,
          retryDelay,
          validateJson: message.validateJson,
        });
        return response;
      };

      return promise;
    });

    logInfo(requests);

    // Instantiate a queue object
    const queue = new PQueue({
      concurrency,
    });

    queue.on("completed", ([response, index, prompt]) => {
      onResponse && onResponse(response, index, prompt);
    });

    // add each request to the queue
    logInfo("Adding promise to queue");
    const promises = requests.map((promise, index) => {
      const request = queue.add(async () => {
        const value = await promise();
        return [value, index, messageList[index].prompt];
      });

      return request;
    });

    const results = await Promise.all(promises);

    logInfo("All requests completed");
    // Initialize result variables
    let errors = null;
    const errorList = [];
    const responses = [];
    const rawResponses = results.map((result) => result[0]);

    // Extract response and error information
    results.forEach((result) => {
      const [currentError, currentResponse] = result[0];
      responses.push(currentResponse);

      if (currentError !== null) {
        errorList.push(currentError);
      }
    });

    // Determine overall error status
    errors = errorList.length ? errorList : null;

    // Create the final results array
    const finalResults = [errors, responses, rawResponses];

    logInfo("Error:", error);
    logInfo("Response:", response);

    return finalResults;
  }
}

export default BatchGpt;
