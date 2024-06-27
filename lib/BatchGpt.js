// This is an in house library for interfacing with the chatgpt api

// Imports
import PQueue from "p-queue";
import pino from "pino";
import * as utils from "./utils.js";
import { fileTypeFromBuffer } from "file-type";

import {
  validateParallelParameters,
  validateRequestParameters,
  validateGenerateImageParameters,
} from "./validators.js";

export const logLevels = {
  TRACE: "trace",
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "fatal",
};

export const detailLevels = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};
// JSDoc Type Definitions

/**
 * @typedef {Object} BatchGptConfigOptions
 * @property {OpenAI} openai - OpenAI object used to interface with the API.
 * @property {string} model - The model to be initialized for API requests.
 * @property {number} timeout - Maximum time a request can take before being rejected. Default is 5 minutes (300,000 milliseconds). Set to null to disable timeout.
 * @property {number} minResponseTime - Minimum time a response should take to be considered valid. Default is null.
 * @property {number} minTokens - Minimum number of tokens a response should have to be regarded as valid. Default is null.
 * @property {number} retryCount - Number of retries per request. Default is 0.
 * @property {number} temperature - The temperature parameter for the model (read more in OpenAI documentation). Default is 1.
 * @property {number} concurrency - Number of parallel operations allowed for parallel requests. Default is 1.
 * @property {boolean} validateJson - Performs a check to ensure that the response is valid JSON.
 * Default is false. IS NOT APPLICABLE FOR IMAGE GENERATION REQUESTS.
 * @property {boolean} moderation - If true, enables moderation for the model interactions (read more in the OpenAI documentation). Default is false.
 * @property {number} moderationThreshold - The threshold for the moderation API. Default is 0.5.
 * @property {"trace" | "debug" | "info" | "warn" | "error" | "fatal"} logLevel - The logging level to set. Default is "info".
 * @property {number | function(): number} retryDelay - Delay Time in milliseconds before retrying a request. Default is 0 milliseconds. Can be a number or a function returning a number.
 * @property {string} imageModel - Specify image model to use for image generation. Default is "dall-e-3".
 **/

/**
 * @typedef {Object} SingleRequestOptions
 * @property {Array<{role: string, content: string}>} messages - List of messages to send to the OpenAI's API.
 * @property {number | null} timeout - Maximum time allowed for the request. Default is 5 minutes (300,000 milliseconds). Set to null for no timeout.
 * @property {number | null} minTokens - Minimum number of tokens a response should have to be regarded as valid. Default is null.
 * @property {number | null} minResponseTime - Minimum time a response should take to be considered valid. Default is null.
 * @property {string} imageModel - Specify image model to use for image generation. Default is null.
 * @property {number} retryCount - Number of retries for the request. Default is 0 if not specified.
 * @property {number | function(): number} retryDelay - Delay between retries for the request. Default is 0.
 * @property {string} model - The model to be initialized for API requests. Default is gpt-3.5-turbo.
 * @property {boolean} validateJson - Ensures that the response is valid JSON. Default is true.
 */

/**
 * @typedef {Object} ParallelRequestOptions
 * @property {number} concurrency - Number of parallel operations allowed for parallel requests. Default is 1.
 * @property {number | null} timeout - Maximum time allowed for the request. Default is 5 minutes (300,000 milliseconds). Set to null for no timeout.
 * @property {number | null} minTokens - Minimum number of tokens a response should have to be regarded as valid. Default is null.
 * @property {number | null} minResponseTime - Minimum time a response should take to be considered valid. Default is null.
 * @property {string} imageModel - Specify image model to use for image generation. Default is null.
 * @property {number} retryCount - Number of retries for the request. Default is 0 if not specified.
 * @property {number | function(): number} retryDelay - Delay between retries for the request. Default is 0.
 * @property {boolean} validateJson - Ensures that the response is valid JSON. Default is true.
 * @property {string} model - The model to be initialized for API requests. Default is gpt-3.5-turbo.
 * @property {function} onResponse - Callback function to handle the response from each request.
 */

/**
 * Generates an image based on the prompt provided.
 * @typedef {Object} GenerateImageOptions
 * @property {string} prompt - The prompt to generate the image.
 * @property {string} imageModel - The image model to use for generating the image. Default is "dall-e-3".
 * @property {string} dimesions - The dimensions of the image to generate. Must be one of 256x256, 512x512, or 1024x1024 for dall-e-2. Must be one of 1024x1024, 1792x1024, or 1024x1792 for dall-e-3 models.
 * @property {SingleRequestOptions} requestOptions - Parameters for the request.
 * */

/**
 * @typedef {Object} GenerateImageDescriptionOptions
 * @property {string | Buffer} image - The image to generate a description for.
 * @property {string} level - The level of detail for the description. Default is "medium".
 * @property {SingleRequestOptions} requestOptions - Parameters for the request.
 * */

/**
 * @typedef {Object} GenerateImageTagsOptions
 * @property {string} context - The context to generate tags for.
 * @property {string | Buffer} image - The image to generate tags for.
 * @property {number} searchTermCount - The number of search terms to generate. Default is 1.
 * @property {number} randomness - The randomness factor for generating search terms. Default is 1.
 * @property {SingleRequestOptions} requestOptions - Parameters for the request.
 * */

/**
 * @typedef {Object} RequestParams
 * @property {string} prompt - The prompt to send to the OpenAI API.
 * @property {SingleRequestOptions} requestOptions - Parameters for the request.
 */

/**
 * @typedef {Object} ParallelParams
 * @property {Array<string | {content: string, requestOptions: SingleRequestOptions}>} messageList - List of messages to send to the OpenAI API.
 * @property {ParallelRequestOptions} requestOptions - Parameters for the request.
 * 

/**
 * @typedef {Object} BatchGptResponse
 * @property {Object} moderation - The moderation result from the moderation API.
 * @property {Object} response - The response from the ChatGPT API.
 * @property {number} tokens - The number of tokens received from the ChatGPT API.
 * @property {number} responseTime - The time taken to receive the response.
 * @property {number} timePerToken - The time taken to generate each token.
 */

/**
 * @class BatchGpt
 * @classdesc BatchGpt class to interface with the ChatGPT API and set up default values for API requests.
 * @param {BatchGptConfigOptions} options - Options for the BatchGpt class.
 * @property {function} request - Sends a request to the ChatGPT API, allowing two approaches: regular GPT prompting or GPT function calling.
 * @property {function} parallel - Sends parallel requests to the ChatGPT API, handling various parameters to customize the request behavior.
 **/

export class BatchGpt {
  constructor({
    openai,
    retryCount = 0,
    retryDelay = 0,
    logLevel = logLevels.INFO,
    temperature = 1,
    concurrency = 1,
    minTokens = null,
    validateJson = false,
    minResponseTime = null,
    model = "gpt-3.5-turbo",
    imageModel = null,
    timeout = 5 * 60 * 1000,
    moderation = false,
    moderationThreshold = 0.5,
  }) {
    this.model = model;
    this.openai = openai;
    this.timeout = timeout;
    this.logLevel = logLevel;
    this.minTokens = minTokens;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
    this.concurrency = concurrency;
    this.imageModel = imageModel;
    this.temperature = temperature;
    this.validateJson = validateJson;
    this.minResponseTime = minResponseTime;
    this.moderation = moderation;
    this.moderationThreshold = moderationThreshold;

    this.logger = pino({
      level: this.logLevel,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
  }

  getToken(response) {
    try {
      const token = response.usage.completion_tokens;
      const result = parseInt(token);
      return result;
    } catch (e) {
      return 0;
    }
  }

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

  /**
   * Sends a request to the specified OpenAI API, allowing two approaches: regular GPT prompting or GPT function calling.
   * @param {RequestParams} requestParams - Parameters for the request.
   * @return {Array} An array containing three elements: [error, gptResponse, responseHistory].
   *             - {Error} error - Any error that occurred during the request, or null if successful.
   *             - {BatchGptResponse} gptResponse - The response from the OpenAI API for the last request, or null if there was an error.
   *             - {Array<BatchGptResponse>} responseHistory - Array of responses from previous requests.
   * */

  async request({ prompt = null, requestOptions = {}, imageOptions = {} }) {
    /* eslint-disable */
    let {
      messages = null,
      model = this.model,
      timeout = this.timeout,
      minTokens = this.minTokens,
      retryCount = this.retryCount,
      retryDelay = this.retryDelay,
      validateJson = this.validateJson,
      minResponseTime = this.minResponseTime,
    } = requestOptions;

    let { imageModel = this.imageModel, size = null } = imageOptions;

    let error = null;
    let gptResponse = null;
    let response = null;
    let retryAttempt = -1;
    const responseHistory = [];

    const activeModel = model;

    this.logger.info(`Initializing request to OpenAI's (${activeModel}) model`);

    // analyze set parameters
    validateRequestParameters({
      model,
      prompt,
      messages,
      timeout,
      minTokens,
      retryCount,
      retryDelay,
      imageModel,
      validateJson,
      minResponseTime,
    });

    // warn for conflicting parameters
    if (validateJson) {
      this.logger.warn(
        `validateJson set to true, on regular gpt prompting may result in an Invalid JSON error.\nEnsure that your prompt tells ChatGPT to return a valid JSON response.\nNOTE: This warning is not applicable for image generation requests. If you are generating images, you cannot specify a JSON response.`
      );
    }

    if (this.moderation && !this.moderationThreshold) {
      this.logger.error(
        "Moderation is enabled, moderationThreshold should also be set"
      );
    }
    // Instantiate a queue object
    const queue = new PQueue({ timeout, throwOnTimeout: true });
    let moderation;
    let safeInput;
    let moderationResult = null;
    messages = messages || [{ role: "user", content: prompt }];

    if (messages.length === 1) {
      const message = messages ? messages[0].content : prompt;
      if (this.moderation) {
        this.logger.info(
          `Moderation is enabled, sending request to moderation API, Threshold set to ${this.moderationThreshold}`
        );

        moderation = await this.moderationApi(message);
        safeInput = moderation[0];
        moderationResult = moderation[1];
        this.logger.info("Moderation result recieved", moderationResult);
      }
      if (safeInput) {
        if (safeInput.flagged || safeInput.categories.length > 0) {
          const moderationError = `Prompt was flagged for ${safeInput.categories.join(
            ", "
          )}`;
          this.logger.error(moderationError);
          return [moderationError, null, null];
        }
      }
    }

    this.logger.debug(
      `messages: ${messages ? JSON.stringify(messages, null, 2) : prompt}`
    );

    // while loop for retrying requests
    while (retryAttempt < retryCount) {
      let start;
      let end;
      let requestFn;
      retryAttempt++;
      error = null;

      try {
        this.logger.info(
          `Sending request to (${activeModel}) [attempt: ${retryAttempt + 1}]`
        );
        // Start timer
        start = Date.now();

        if (!imageModel) {
          requestFn = this.openai.chat.completions.create({
            messages,
            model: model,
            temperature: this.temperature,
          });
        } else {
          this.logger.info(`Generating image with ${imageModel}`);

          const dalleOptions = {
            model: imageModel,
            prompt: messages[0].content || prompt,
            n: 1,
          };

          if (size) {
            dalleOptions["size"] = size;
          }

          requestFn = this.openai.images.generate(dalleOptions);
        }

        response = await queue.add(async () => requestFn);

        this.logger.debug(`Response: ${JSON.stringify(response, null, 2)}`);

        end = Date.now();
        // Check if response is undefined due to timeout
        if (response === undefined) throw new Error("Request timed out");

        // Check if response is empty or valid JSON
        if (
          !imageModel &&
          validateJson &&
          !utils.isJson(response.choices[0].message.content) &&
          !imageModel
        ) {
          throw new Error("Invalid JSON response");
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

        let timePerToken;
        // if all checks pass, log status history and break out of while loop
        if ((tokens === 0) | (tokens === null)) {
          timePerToken = "Unknown";
        } else {
          timePerToken = Math.round(responseTime / tokens);
        }
        gptResponse = {
          error: null,
          moderation: moderationResult,
          response,
          tokens,
          responseTime,
          timePerToken,
        };
        responseHistory.push(gptResponse);

        break;
      } catch (e) {
        // even though the response failed we can still set it to the response content
        gptResponse = {
          error: e.message,
          moderation: moderationResult,
          response,
          tokens: null,
          responseTime: end - start,
          timePerToken: null,
        };

        end = Date.now();
        // if any one of the try block fails, log the status history and retry the request
        error = e.message;
        this.logger.error(error);
        responseHistory.push(gptResponse);

        // if retryDelay is set, wait for the specified time before retrying the request
        if (typeof retryDelay !== "function") {
          if (retryDelay > 0 && retryAttempt < retryCount) {
            this.logger.info(
              `Waiting for ${retryDelay} milliseconds before retrying`
            );
            await utils.delay(retryDelay);
          }
        } else if (retryAttempt < retryCount) {
          const retryDelayValue = retryDelay(retryAttempt);
          this.logger.info(
            `Waiting for ${retryDelayValue} milliseconds before retrying`
          );
          await utils.delay(retryDelayValue);
        }
      }
    }

    this.logger.info("Request completed");
    this.logger.debug(
      `Response History: \n${JSON.stringify(responseHistory, null, 2)}`
    );
    return [error, gptResponse, responseHistory];
  }

  /**
   * Sends parallel requests to the specified OpenAI API, handling various parameters to customize the request behavior.
   * @param {ParallelParams} parallelParams - Parameters for the parallel requests.
   * @return {Array} An array containing the responses from the parallel requests.
   **/
  async parallel({ messageList, requestOptions = {} }) {
    let {
      onResponse = null,
      model = this.model,
      timeout = this.timeout,
      minTokens = this.minTokens,
      retryCount = this.retryCount,
      retryDelay = this.retryDelay,
      concurrency = this.concurrency,
      minResponseTime = this.minResponseTime,
      imageModel = this.imageModel,
    } = requestOptions;
    // validate parameters
    validateParallelParameters({
      model,
      timeout,
      minTokens,
      retryCount,
      retryDelay,
      imageModel,
      onResponse,
      concurrency,
      messageList,
      minResponseTime,
    });

    function getMessages(message) {
      let messages = null;
      let requestOptions = {};

      if (typeof message === "string") {
        messages = [{ role: "user", content: message }];
      } else if (typeof message === "object") {
        messages = message?.content
          ? [{ role: "user", content: message.content }]
          : null;
        requestOptions = message?.requestOptions || {};
      }

      return { messages, requestOptions };
    }

    // generate a list of promises for each request from the messageList
    const requests = messageList.map((message) => {
      const { messages, requestOptions: options } = getMessages(message);

      const createRequest = async () => {
        const fn = this.request.bind(this);
        const request = {
          messages,
          ...(options.length > 0 ? options : requestOptions),
        };
        const response = await fn({ requestOptions: request });
        return response;
      };
      this.logger.info(`messages: ${JSON.stringify(messages, null, 2)}`);

      return createRequest;
    });

    // Instantiate a queue object
    const queue = new PQueue({
      concurrency,
    });

    queue.on("completed", ([response, index, prompt]) => {
      onResponse && onResponse(response, index, prompt);
    });

    const promises = requests.map((promise, index) => {
      const request = queue.add(async () => await promise());
      return request;
    });

    const results = await Promise.all(promises);

    this.logger.info("All requests completed");
    return results;
  }

  /**
   * Generates an image based on the prompt provided.
   * @param {GenerateImageOptions} options - Options for generating the image.
   * @return {Array} An array containing three elements: [error, gptResponse, responseHistory].
   *            - {Error} error - Any error that occurred during the request, or null if successful.
   *           - {BatchGptResponse} gptResponse - The response from the OpenAI API for the last request, or null if there was an error.
   *          - {Array<BatchGptResponse>} responseHistory - Array of responses from previous requests.
   * */

  async generateImage({
    prompt = null,
    imageModel = "dall-e-3",
    dimesions = null,
    requestOptions = {},
  }) {
    // remove messages from the request options
    if (requestOptions.messages) {
      delete requestOptions.messages;
    }
    if (requestOptions.imageModel) {
      delete requestOptions.imageModel;
    }

    requestOptions = { ...requestOptions, imageModel };

    validateGenerateImageParameters({ prompt, imageModel, dimesions });
    return await this.request({
      prompt,
      requestOptions,
      imageOptions: {
        imageModel,
        size: dimesions,
      },
    });
  }

  /**
   * Generates a description for an image based on the image provided.
   * @param {GenerateImageDescriptionOptions} options - Options for generating the image description.
   * @return {Array} An array containing three elements: [error, gptResponse, responseHistory].
   *           - {Error} error - Any error that occurred during the request, or null if successful.
   *         - {BatchGptResponse} gptResponse - The response from the OpenAI API for the last request, or null if there was an error.
   *       - {Array<BatchGptResponse>} responseHistory - Array of responses from previous requests.
   * */
  async generateImageDescription({
    image,
    level = detailLevels.MEDIUM,
    requestOptions = {},
  }) {
    let descriptionLength = 200;
    let url = null;
    if (level === detailLevels.LOW) {
      descriptionLength = 50;
    } else if (level === detailLevels.MEDIUM) {
      descriptionLength = 200;
    } else if (level === detailLevels.HIGH) {
      descriptionLength = 300;
    }

    this.logger.info(`Generating image description with ${level} detail`);

    // the image can be a link or an actual byte value for an image
    if (typeof image === "string") {
      url = image;
    } else {
      const extension = fileTypeFromBuffer(image).ext;
      const base64Image = Buffer.from(image).toString("base64");
      url = `data:image/${extension};base64,${base64Image}`;
    }

    this.logger.info("Switching to gpt4o for image description generation");
    this.logger.info(`Image URL: ${url}`);

    return await this.request({
      prompt: [
        {
          type: "text",
          text: `Generate a description for the image below with no more than ${descriptionLength} characters`,
        },
        {
          type: "image_url",
          image_url: {
            url: url,
          },
        },
      ],

      requestOptions: { model: "gpt-4o", ...requestOptions },
    });
  }

  /**
   * Generates tags to describe based on the context provided or the image provided.
   * @param {GenerateImageTagsOptions} options - Options for generating the image tags.
   * @return {Array} An array containing three elements: [error, gptResponse, responseHistory].
   *        - {Error} error - Any error that occurred during the request, or null if successful.
   *        - {BatchGptResponse} gptResponse - The response from the OpenAI API for the last request, or null if there was an error.
   *        - {Array<BatchGptResponse>} responseHistory - Array of responses from previous requests.
   * */
  async generateImageTags({
    context = null,
    image = null,
    searchTermCount = 1,
    randomness = 1,
    requestOptions = {},
  }) {
    this.logger.info("Generating image tags");
    this.logger.info(`Context: ${JSON.stringify(context, null, 2)}`);
    this.logger.info(`Search Term Count: ${searchTermCount}`);
    this.logger.info(`Randomness: ${randomness}`);

    this.logger.info("Switching to gpt4o for tag generation");

    // first we want to generate search terms for the context (if provided it is the source of truth)
    let prompt = null;
    let url = null;

    if (searchTermCount < 1) {
      throw new Error("searchTermCount must be greater than 0");
    }
    if (randomness < searchTermCount) {
      randomness = searchTermCount;
    }
    const contentPrompt = [
      `Imagine creating a webpage focused on: ${context}`,
      `Generate ${randomness} key search terms that capture the essence of the context provided.`,
      "Each term can be a single word or two words long and should be relevant for finding images on the Unsplash API.",
      "Ensure these terms avoid specific nouns and accurately represent the context.",
      `From the generated list, choose ${searchTermCount} search terms.`,
      "Your response should only include a JSON object in the following structure:",
      '{ "searchTerms": ["term1", ...] }',
      "Do not list the terms as text; only return the JSON object.",
      `ONLY PROVIDE ${searchTermCount} SEARCH TERMS IN THE JSON OBJECT`,
    ].join("\n");

    const imagePrompt = [
      `Generate ${randomness} key search terms that capture the essence of the image provided below.`,
      "Each term can be a single word or two words long and should be relevant for finding images on the Unsplash API.",
      "Ensure these terms avoid specific nouns and accurately represent the image.",
      `From the generated list of search terms, respond with ${searchTermCount} search term${
        searchTermCount > 1 ? "s" : ""
      } randomly.`,
      "Your response should only include a JSON object in the following structure:",
      '{ "searchTerms": ["term1", ...] }',
      "Do not list the terms as text; only return the JSON object.",
      `ONLY PROVIDE ${searchTermCount} SEARCH TERMS IN THE JSON OBJECT`,
    ].join("\n");

    if (context && !image) {
      prompt = contentPrompt;
    } else {
      if (typeof image === "string") {
        url = image;
      } else {
        const extension = fileTypeFromBuffer(image).ext;
        const base64Image = Buffer.from(image).toString("base64");
        url = `data:image/${extension};base64,${base64Image}`;
      }

      if (context) {
        prompt = [
          {
            type: "text",
            text: contentPrompt,
          },
          {
            type: "text",
            text: [
              "After creating those search terms, also check if the tags accurately represent the image below",
              "If not the provide the originally generated search terms",
              "Your response should only include a JSON object in the following structure:",
              '{ "searchTerms": ["term1", ...] }',
            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url,
            },
          },
        ];
      } else {
        prompt = [
          {
            type: "text",
            text: imagePrompt,
          },
          {
            type: "image_url",
            image_url: {
              url,
            },
          },
        ];
      }

      // delete messages if passed in the request options
      if (requestOptions.messages) {
        delete requestOptions.messages;
      }
      return await this.request({
        prompt,
        requestOptions: { model: "gpt-4o", ...requestOptions },
      });
    }
  }
}
