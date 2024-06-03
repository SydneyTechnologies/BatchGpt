// This is an in house library for interfacing with the chatgpt api

// Imports
import PQueue from "p-queue";
import * as utils from "./utils.js";
import {
  validateParallelParameters,
  validateRequestParameters,
} from "./validators.js";

export const VerboseType = {
  NONE: "NONE", // log nothing
  INFO: "INFO", // log everything except warnings and errors
  DEBUG: "DEBUG", // log all steps including warnings and errors
};

export const CallType = {
  IMAGE: "IMAGE",
  REGULAR: "REGULAR",
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
    verbose = VerboseType.DEBUG,
    temperature = 1,
    concurrency = 1,
    minTokens = null,
    validateJson = false,
    minResponseTime = null,
    model = "gpt-3.5-turbo",
    image_model = null,
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
    this.image_model = image_model;
    this.temperature = temperature;
    this.validateJson = validateJson;
    this.minResponseTime = minResponseTime;
    this.moderationEnable = moderationEnable;
    this.moderationThreshold = moderationThreshold;
  }

  /**
   *  getToken function, calculates the tokens recieved from the gpt api
   *  @param {string} response passed into this function should the raw response from the chatgpt api
   *  @return {number} returns the number of tokens recieved from the api as a number
   */
  getToken(response) {
    try {
      const token = response.usage.completion_tokens;
      const result = parseInt(token);
      return result;
    } catch (e) {
      return 0;
    }
  }

  /**
   * ModerationApi function, sends a request to the moderation api to perform sentiment analysis on the input
   * @param {string} input
   * @return {Array<Object>} returns an array of two objects, the first object is the safe input, the second object is the moderation result
   */
  async moderationApi(input) {
    const moderation = await this.openai.moderations.create({ input });
    const moderationResult = moderation.results[0];

    const flaggedCategories = Object.keys(moderationResult.categories).filter(
      (category) =>
        Number(moderationResult.category_scores[category]) >=
        // eslint-disable-next-line comma-dangle
        this.moderationThreshold
    );
    const safeInput = {
      flagged: moderationResult.flagged,
      categories: flaggedCategories,
    };

    return [safeInput, moderationResult];
  }

  evaluateReponse(callType, response) {
    switch (callType) {
      case CallType.REGULAR:
        return response.choices[0].message;
      case CallType.IMAGE:
        // eslint-disable-next-line no-case-declarations
        const result = response.data[0].url;
        return result;
      default:
        return response.choices[0].message;
    }
  }

  /**
   * Sends a request to the ChatGPT API, allowing two approaches: regular GPT prompting or GPT function calling.
   *
   * @param {Array<{role: string, content: string}>} messages - List of prompt messages to send to the API.
   * @param {number | null} timeout - Maximum time allowed for the request. Default is 5 minutes (300,000 milliseconds). Set to null for no timeout.
   * @param {number | null} minTokens - Minimum number of tokens a response should have to be regarded as valid. Default is null.
   * @param {number | null} minResponseTime - Minimum time a response should take to be considered valid. Default is null.
   * @param {"NONE" | "INFO" | "DEBUG"} verbose - Verbosity setting for the request. Default is "NONE".
   * @param {string} image_model - Specify image model to use for image generation. Default is "dall-e-3".
   * @param {number} retryCount - Number of retries for the request. Default is 0 if not specified.
   * @param {number | function(): number} retryDelay - Delay between retries for the request. Default is 0.
   * @param {boolean} validateJson - Ensures that the response is valid JSON. Default is true.
   * @return {Array} - [error, response, statusHistory]
   *   - error: Indicates if the response failed (contains an error message describing the issue).
   *   - response: Object containing the response from the API and time_per_token to generate that response.
   *   - statusHistory: Array of objects containing the status of each attempted request and its result.
   */
  async request({
    messages,
    timeout = this.timeout,
    verbose = this.verbose,
    minTokens = this.minTokens,
    retryCount = this.retryCount,
    retryDelay = this.retryDelay,
    image_model = this.image_model,
    validateJson = this.validateJson,
    minResponseTime = this.minResponseTime,
  }) {
    let callType = CallType.REGULAR;
    let error = null;
    let gptResponse = null;
    let retryAttempt = -1;
    const statusHistory = [];

    // instantiate logger
    const logger = new utils.Logger({ verbose });
    const logInfo = logger.log.bind(logger);
    const logWarn = logger.warn.bind(logger);
    const logError = logger.error.bind(logger);

    logInfo("Initializing request");

    // analyze set parameters
    validateRequestParameters({
      messages,
      timeout,
      verbose,
      minTokens,
      retryCount,
      retryDelay,
      image_model,
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
    if (this.image_model) {
      logWarn("Image model set to ", this.image_model);
    }

    // Instantiate a queue object
    const queue = new PQueue({ timeout, throwOnTimeout: true });
    let moderation;
    let safeInput;
    let moderationResult = null;

    if (this.moderationEnable) {
      logInfo("Enable moderation: true");
      logInfo("Moderation threshold: ", this.moderationThreshold);
      logInfo("Analyzing user prompt...");

      moderation = await this.moderationApi(messages[0].content);
      safeInput = moderation[0];
      moderationResult = moderation[1];
      logInfo("Moderation result recieved\n", moderationResult);
    }
    if (safeInput) {
      if (safeInput.flagged || safeInput.categories.length > 0) {
        const moderationError = `Prompt was flagged for ${safeInput.categories.join(
          ", "
        )}`;
        logError(moderationError);
        return [moderationError, null, null];
      }
    }

    if (image_model) {
      callType = CallType.IMAGE;
    } else {
      callType = CallType.REGULAR;
    }
    logInfo("Call type: ", callType);

    // while loop for retrying requests
    while (retryAttempt < retryCount) {
      let start;
      let end;
      let requestFn;
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

        // Decide how to call openai api based on the callType
        switch (callType) {
          case CallType.REGULAR:
            requestFn = this.openai.chat.completions.create({
              messages,
              model: this.model,
              temperature: this.temperature,
            });
            break;
          case CallType.IMAGE:
            logInfo("Generating image");
            logInfo("Image model: ", this.image_model);
            logInfo("Prompt: ", messages[1].content);
            requestFn = this.openai.images.generate({
              model: this.image_model,
              prompt: messages[1].content,
              // size: "1024*1024",
              n: 1,
            });
            break;
        }
        const response = await queue.add(async () => requestFn);

        end = Date.now();
        // Check if response is undefined due to timeout
        if (response === undefined) throw new Error("Request timed out");

        // get response content from the api
        responseContent = this.evaluateReponse(callType, response);
        logInfo("Response content", responseContent);

        if (callType === CallType.REGULAR) {
          // Check if response is empty or valid JSON
          if (validateJson && !utils.isJson(responseContent.content)) {
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

        let time_per_token;
        // if all checks pass, log status history and break out of while loop
        if ((tokens === 0) | (tokens === null)) {
          time_per_token = "Unknown";
        } else {
          time_per_token = Math.round(responseTime / tokens);
        }
        gptResponse = {
          moderation: moderationResult,
          content:
            (responseContent.content
              ? responseContent.content
              : responseContent) || null,
          rawContent: JSON.stringify(response, null, 4),
          time_per_token,
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
          moderation: moderationResult,
          content: responseContent.content || responseContent,
          time_per_token: null,
        };

        end = Date.now();
        // if any one of the try block fails, log the status history and retry the request
        error = e.message;
        statusHistory.push({
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
    logError("Error:", error);
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
   *  @return {Array} - An array containing three elements: [errors, responses, rawResponses].
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
    validateParallelParameters({
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
      const promise = async () => {
        const fn = this.request.bind(this);
        const response = fn({
          messages: [{ role: "user", content: message.prompt }],
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

    logInfo("Error:", errors);
    logInfo("Response:", responses);

    return finalResults;
  }
}
