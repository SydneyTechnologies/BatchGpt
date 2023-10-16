// This is an in house library for interfacing with the chatgpt api

// Imports
import PQueue from "p-queue";
// UTILITY FUNCTIONS
/**
 *  delay function, delays the execution of the next function call by the specified time
 *  @param {number} time time in milliseconds to delay
 */
const delay = async (time) => {
  await new Promise((resolve) => setTimeout(resolve, time));
};

/**
 *  isJson function, checks if a string is valid JSON
 *  @param {string} str potential JSON string to check
 */
const isJson = (str) => {
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
const fromJsonToObject = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    this.logger("Input string is an Invalid JSON string");
    throw new Error("Input string is an Invalid JSON string");
  }
};
class Logger {
  // set up helper functions
  /**
   *  logger, helps log information to the console based on the verbose setting
   *  @param {boolean} verbose setting for logging to the console
   */
  constructor({ verbose = true }) {
    this.verbose = verbose;
  }

  log(...args) {
    if (this.verbose) {
      console.log(...args);
    }
  }
}
class BatchGpt {
  /**
   *  ChatGpt class constructor. This class is used to interface with the chatgpt api, and setup default values for the api
   *  @param  openai Openai object to interface with the api
   *  @param {string} model This is the model that will be initialized for the api
   *  @param {number} temperature This temperature set for the model read more in the openai documentation. Default is 1.
   *  @param {number} retryCount Number of retries per request. Default is 0
   *  @param {number || function(): number} retryDelay How long to wait before retrying a request. Default is 0 (value in milliseconds). It could also be a function that returns a number
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 5 minutes (300,000 milliseconds), set to null if you do not wish to timeout.
   *  @param {number} concurrency For parallel requests, how many operations should run at a time, default is 1
   *  @param {boolean} verbose If true, will log all requests and responses to the console. Default is false
   *  @param {boolean} enableModeration If true, will enable moderation for the api. Default is false
   *  @param {number} moderationThreshold This is the threshold for the moderation api. Default is 0.2
   */
  constructor({
    openai,
    model = "gpt-3.5-turbo",
    temperature = 1,
    retryCount = 0,
    retryDelay = 0,
    concurrency = 1,
    timeout = 5 * 60 * 1000,
    verbose = false,
    enableModeration = false,
    moderationThreshold = 0.2,
  }) {
    this.model = model;
    this.openai = openai;
    this.timeout = timeout;
    this.verbose = verbose;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
    this.concurrency = concurrency;
    this.temperature = temperature;
    this.enableModeration = enableModeration;
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

  async ModerationApi(input) {
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

  /**
   *  Sends a request to the chatgpt api (using either function calling or regular gpt prompting) specifying the function signature means use functiona calling, otherwise the function uses regular gpt prompting
   *  @param {[{role: string, content: string}]} messages This is a list of prompt messages to send to the api
   *  @param {number} retryCount This is the number of retries for the request. Default is what is set in the constructor for the class. If not set it is 0
   *  @param {[Object]} functions This defines list of function signatures for gpt function calling approach.
   *  @param @param {number || function(): number} retryDelay This is the delay between retries for the request. Default is what is set in the constructor for the class. Default is 0
   *  @param {boolean} verbose This is the verbose setting for the request. Default is what is set in the constructor for the class. If not set it is false
   *  @param {number} minResponseTime This sets a minimum time a response should take for it to be regarded as a valid response. Default is 3000ms
   *  @param {number} minTokens This sets a minimum number of tokens a response should have for it to be regarded as a valid response. Default is 10
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 15000ms (value in milliseconds), set to null if you do not wish to timeout.
   *  @param {boolean} ensureJson This ensures that the response is valid JSON. Default is true
   *  @returns {Array} [error, response, statusHistory]. error tells us if the response failed or not (it contains an error message, which states what went wrong). response is an object containing the response from the api. statusHistory is an array of objects containing the status of each attempted request and the result of the request
   */
  async request({
    messages,
    minTokens = null,
    functions = null,
    ensureJson = false,
    minResponseTime = null,
    timeout = this.timeout,
    verbose = this.verbose,
    retryCount = this.retryCount,
    retryDelay = this.retryDelay,
  }) {
    let error = null;
    let gptResponse = null;
    let retryAttempt = -1;
    let statusHistory = [];

    // instantiate logger
    const logger = new Logger({ verbose });
    const log = logger.log.bind(logger);
    // Instantiate a queue object
    const queue = new PQueue({ timeout, throwOnTimeout: true });
    let moderation,
      safeInput,
      moderationResult = null;

    if (this.enableModeration) {
      moderation = await this.ModerationApi(messages[0].content);
      safeInput = moderation[0];
      moderationResult = moderation[1];
      // log("Moderation Result", moderationResult);
    }

    if (safeInput?.flagged || safeInput?.categories.length > 0) {
      const moderationError = `ERROR: Prompt was flagged for ${safeInput.categories.join(
        ", "
      )}`;
      log(moderationError);
      return [moderationError, null, null];
    }

    // while loop for retrying requests
    while (retryAttempt < retryCount) {
      let start, end;
      retryAttempt++;
      error = null;

      try {
        // Log request
        log("Sending request to chatgpt api");
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
        const responseContent = response.choices[0].message;
        log("RESPONSE RECEIVED");
        log(responseContent);

        // function calling can be used in two ways, the first way is (to get a forced JSON response from chatGPT)
        // the next way is to allow chat gpt to call an external function
        let fnCallArguments = null;
        let fnResponse = null;
        if (functions) {
          // if call is invoked as a function call
          if (!responseContent.function_call) {
            log("Not a function call");
            throw new Error("Not a function call");
          }

          // if the call is a function call then we need to know which function to call
          const functionCallName = responseContent.function_call.name;
          const functionMap = this.generateFunctionMap(functions);

          log("function map", functionMap);

          // Check if response is empty or valid JSON
          fnCallArguments = fromJsonToObject(
            responseContent.function_call.arguments
          );
          if (Object.keys(fnCallArguments).length === 0) {
            log("Empty response");
            throw new Error("Empty response");
          }

          // call the function if it exists and if ensureJSON is false
          if (!ensureJson && functionMap[functionCallName]) {
            const fn = functionMap[functionCallName];
            fnResponse = await fn(fnCallArguments);
          }
        } else {
          // if call is invoked as a regular gpt prompt
          // Check if response is empty or valid JSON
          if (ensureJson && !isJson(responseContent.content)) {
            log("Invalid JSON response");
            log("Empty response");
            throw new Error("Empty response");
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
          status: "success",
          response: gptResponse,
          responseTime,
          tokens,
        });

        log(`Received response in ${end - start} milliseconds`);

        break;
      } catch (e) {
        // call on error function if set

        log("ERROR", e.message);
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
            log(`Waiting for ${retryDelay} milliseconds before retrying`);
            await delay(retryDelay);
          }
        } else if (retryAttempt < retryCount) {
          const retryDelayValue = retryDelay(retryAttempt);
          log(`Waiting for ${retryDelayValue} milliseconds before retrying`);
          await delay(retryDelayValue);
        }
      }
    }

    return [error, gptResponse, statusHistory];
  }

  /**
   *  Sends parallel requests to the chatgpt api (using either function calling or regular gpt prompting)
   *  @param {Array} messageList This is a list of prompt messages to send to the api, (each message object contains a prompt, an optional functionSignature property and an optional priority number property)
   *  @param {number} concurrency For parallel requests, how many requests to send at once. Default is what is set in the constructor for the class. If not set it is 1
   *  @param {number} retryCount This is the number of retries for the request. Default is what is set in the constructor for the class. If not set it is 0
   *  @param {number} retryDelay This is the delay between retries for the request. Default is what is set in the constructor for the class. If not set it is 1000ms
   *  @param {verbose} verbose This is the verbose setting for the request. Default is what is set in the constructor for the class. If not set it is false
   *  @param {number} minResponseTime This sets a minimum time a response should take for it to be regarded as a valid response. Default is 3000ms
   *  @param {number} timeout Max time a request can take before, it is rejected Default is 15000ms (value in milliseconds)
   *  @param {function} onResponse This is a callback function that is called when a request has been completed.
   *  @returns {Array} [error, response, statusHistory]. error tells us if the response failed or not (it contains an error message, which states what went wrong). response is an object containing the response from the api. statusHistory is an array of objects containing the status of each attempted request and the result of the request
   */
  async parallel({
    messageList,
    onResponse = null,
    verbose = this.verbose,
    minResponseTime = null,
    timeout = this.timeout,
    retryCount = this.retryCount,
    retryDelay = this.retryDelay,
    concurrency = this.concurrency,
  }) {
    // instantiate logger
    const logger = new Logger({ verbose });
    const log = logger.log.bind(logger);

    // generate a list of promises for each request from the messageList
    log("Generating promises for each request");
    const requests = messageList.map((message) => {
      let promise;

      promise = async () => {
        const fn = this.request.bind(this);
        const response = fn({
          messages: [{ role: "user", content: message.prompt }],
          functions: message.functions ? [message.functions] : null,
          verbose,
          minResponseTime,
          timeout,
          retryCount,
          retryDelay,
          ensureJson: message.ensureJson,
        });
        return response;
      };

      return promise;
    });

    log(requests);

    // Instantiate a queue object
    const queue = new PQueue({
      concurrency,
    });

    queue.on("completed", ([response, index, prompt]) => {
      onResponse && onResponse(response, index, prompt);
    });

    // add each request to the queue
    log("Adding promise to queue");
    const promises = requests.map((promise, index) => {
      const request = queue.add(async () => {
        const value = await promise();
        return [value, index, messageList[index].prompt];
      });

      return request;
    });

    const results = await Promise.all(promises);

    log("All requests completed");
    // Initialize result variables
    let error = null;
    const errorList = [];
    const response = [];
    const rawResponse = results.map((result) => result[0]);

    // Extract response and error information
    results.forEach((result) => {
      const [currentError, currentResponse] = result[0];
      response.push(currentResponse);

      if (currentError !== null) {
        errorList.push(currentError);
      }
    });

    // Determine overall error status
    error = errorList.length ? errorList : null;

    // Create the final results array
    const finalResults = [error, response, rawResponse];

    return finalResults;
  }
}

export default BatchGpt;
