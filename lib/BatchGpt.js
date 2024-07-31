//@ts-check
import pino from "pino";
import PQueue from "p-queue";
import * as utils from "./utils.js";
import { logLevels } from "./constants.js";
import * as validator from "./validators.js";

// JSDOC TYPES FOR BATCHGPT

/**
 * This is a basic request object that can be used to send a request to the OpenAI API
 * It allows for the user to specify the prompt and any additional options that they would like to pass to the API
 * @typedef {Object} RequestOptions
 * @property {string} [model] - The model that the user would like to use for the request
 * @property { number } [minTokens] - The minimum number of tokens that the response should have
 * @property { number } [minResponseTime] - The minimum amount of time that the request should take
 * @property { number } [retryCount] - The number of times that the request should be retried if it fails
 * @property { number } [timeout] - The maximum amount of time that the request can take before timing out
 * @property { boolean } [validateJson] - A boolean that specifies whether the response should be validated as JSON
 * @property { function |  number } [retryDelay] - The amount of time that the request should wait before retrying
 * @property {Array<Object.<string, *>>} [messages] - An array of message objects that will be sent to the API
 */

/**
 * @typedef {Object} ImageOptions
 * @property {string} [size] - The size of the image that should be generated
 * @property {string} [imageModel] - The model that should be used for image generation
 */

/**
 * @typedef {Object} BatchGptOptions
 * @property {Object} openai - An instance of the OpenAI class
 * @property {number} [temperature=1] - The temperature of the model
 * @property {number} [logLevel="info"] - The level of logging that should be used
 * @property {string} [model="gpt-3.5-turbo"] - The model that should be used for the request
 * @property {string | null} [imageModel=null] - The model that should be used for image generation
 * @property {number} [retryDelay=0] - The amount of time that the request should wait before retrying
 * @property {number} [retryCount=0] - The number of times that the request should be retried if it fails
 * @property {number | null} [minTokens=null] - The minimum number of tokens that the response should have
 * @property {number | null} [minResponseTime=null] - The minimum amount of time that the request should take
 * @property {boolean} [moderation=false] - A boolean that specifies whether the response should be moderated
 * @property {number} [timeout=300000] - The maximum amount of time that the request can take before timing out
 * @property {boolean} [validateJson=false] - A boolean that specifies whether the response should be validated as JSON
 */

/**
 * @typedef {Object} BatchGptResponse
 * @property {string | null} error - The error message that caused the request to fail
 * @property {Object | null} response - The response object that was returned in the response
 * @property {number | null} tokens - The number of tokens that were returned in the response
 * @property { number | null } timePerToken - The amount of time that each token took to return
 * @property {Object | null} moderation - The moderation object that was returned in the response
 * @property { number | null } responseTime - The amount of time that the response took to return
 */

/**
 * @typedef {Object} BatchGptRequestObject
 * @property {string | null | Array<Object.<string, *>>} [prompt] - The prompt to send to OpenAI's Model
 * @property {RequestOptions} [requestOptions] - The options that should be used to send the request, you can potential pass the message with the requestOptions instead of using the prompt parameter
 * @property {ImageOptions} [imageOptions] - The options that should be used to send the request
 */

/** 
 * @typedef {Object} BatchGptParallelRequest
 * @property {Array<string | {content: string, requestOptions: RequestOptions}>} messages - The messages that should be used to send the requests
 * @property {number} concurrency - The number of requests that should be sent in parallel
 * @property {RequestOptions} [requestOptions] - The options that should be used to send the request
 * /

/**
 * @typedef {Object} BatchGptImageTagRequest
 * @property {string | Buffer | null} [image] - The image that should be used to generate the tags
 * @property {number} [randomness=1] - The randomness of the response
 * @property {string | null} [context] - The context that should be used to generate the tags
 * @property {number} [searchTermCount=1] - The number of search terms that should be generated
 * @property {RequestOptions} [requestOptions] - The options that should be used to send the request
 */

/**
 * @typedef {Object} BatchGptImageDescriptionRequest
 * @property {string | Buffer | null} [image] - The image that should be used to generate the description
 * @property {number} [characterCount=200] - The number of characters that the description should have
 * @property {RequestOptions} [requestOptions] - The options that should be used to send the request
 */

/**
 * BatchGpt is a Javascript class designed to facilitate batch processing using GPT models.
 * This library allows you to efficiently handle multiple requests and process them in batches, optimizing performance and resource usage.
 * @class BatchGpt
 * @param {BatchGptOptions} options - The options that should be used to initialize the BatchGpt class
 */

export class BatchGpt {
  constructor({
    openai,
    retryCount = 0,
    retryDelay = 0,
    temperature = 1,
    minTokens = null,
    imageModel = null,
    moderation = false,
    validateJson = false,
    minResponseTime = null,
    model = "gpt-3.5-turbo",
    timeout = 300000,
    logLevel = logLevels.INFO,
    moderationThreshold = 0.5,
  }) {
    this.model = model;
    this.openai = openai;
    this.timeout = timeout;
    this.logLevel = logLevel;
    this.minTokens = minTokens;
    this.imageModel = imageModel;
    this.retryDelay = retryDelay;
    this.retryCount = retryCount;
    this.moderation = moderation;
    this.temperature = temperature;
    this.validateJson = validateJson;
    this.minResponseTime = minResponseTime;
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
   * This function is used to send a single request to the OpenAI API
   * @memberof BatchGpt
   * @param {BatchGptRequestObject} options - The options that should be used to send the request
   * @returns {Promise<[string | null, BatchGptResponse | null, Array<BatchGptResponse> | null]>} - A promise that resolves to an array containing the error message, the response object, and the history of the responses that were returned after the request completed (resolved or otherwise)
   */
  async request({ prompt = null, requestOptions = {}, imageOptions = {} }) {
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

    const { imageModel = this.imageModel, size = null } = imageOptions;

    let error = null;
    let response = null;
    let retryAttempt = 0;
    let gptResponse = null;
    const responseHistory = [];

    this.logger.info(`Initializing request to OpenAI's (${model}) model`);

    validator.validateRequestParameters({
      prompt,
      requestOptions,
      imageOptions,
    });

    if (validateJson) {
      this.logger.warn(
        "validateJson set to true, on regular gpt prompting may result in an Invalid JSON error.\n" +
          "Ensure that your prompt tells ChatGPT to return a valid JSON response.\n" +
          "NOTE: This warning is not applicable for image generation requests." +
          "If you are generating images, you cannot specify a JSON response."
      );
    }

    if (this.moderation && !this.moderationThreshold) {
      this.logger.error(
        "Moderation is enabled, moderationThreshold should also be set"
      );
    }

    // Instantiate a queue object
    const queue = new PQueue({
      timeout: timeout,
      throwOnTimeout: true,
    });
    let safeInput;
    let moderation;
    let moderationResult = null;

    // Ideally if the user passes a string as prompt then we should turn that prompt into a message object
    // If the user passes messages however, we should use that
    if (prompt) {
      messages = [{ role: "user", content: prompt }];
    }

    if (messages && messages.length === 1) {
      const message = messages ? messages[0].content : prompt;
      if (this.moderation) {
        this.logger.info(
          `Moderation is enabled, sending request to moderation API, Threshold set to ${this.moderationThreshold}`
        );

        moderation = await this.moderationApi(message);
        safeInput = moderation[0];
        moderationResult = moderation[1];
        this.logger.info("Moderation result received", moderationResult);
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

    while (retryAttempt <= retryCount) {
      let start;
      let end;
      error = null;
      let requestFn;
      retryAttempt++;

      // Start timer
      start = Date.now();

      try {
        this.logger.info(
          `Sending request to (${model}) [attempt: ${retryAttempt + 1}]`
        );

        if (!imageModel) {
          requestFn = this.openai.chat.completions.create({
            messages,
            model: model,
            temperature: this.temperature,
          });
        } else {
          this.logger.info(`Generating image with ${imageModel}`);

          const imageGenerationOptions = {
            model: imageModel,
            prompt: messages ? messages[messages.length - 1].content : prompt,
            n: 1,
          };

          if (size) {
            imageGenerationOptions["size"] = size;
          }

          requestFn = this.openai.images.generate(imageGenerationOptions);
        }

        response = await queue.add(async () => requestFn);

        this.logger.debug(`Response: ${JSON.stringify(response, null, 2)}`);

        end = Date.now();
        if (response === undefined) throw new Error("Request timed out");

        // Check if response is empty or valid JSON
        if (
          !imageModel &&
          !imageModel &&
          validateJson &&
          !utils.isJson(response.choices[0].message.content)
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
        if (tokens === 0) {
          timePerToken = null;
        } else {
          timePerToken = Math.round(responseTime / tokens);
        }
        gptResponse = {
          tokens,
          response,
          error: null,
          responseTime,
          timePerToken,
          moderation: moderationResult,
        };
        responseHistory.push(gptResponse);

        break;
      } catch (e) {
        end = Date.now();
        gptResponse = {
          error: e.message,
          moderation: moderationResult,
          response,
          tokens: null,
          responseTime: end - start,
          timePerToken: null,
        };

        error = e.message;
        this.logger.error(error);
        responseHistory.push(gptResponse);

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
   * This function is used to send multiple requests to the OpenAI API in parallel
   * @memberof BatchGpt
   * @param {BatchGptParallelRequest} options - The options that should be used to send the requests
   * @returns {Promise<Array<[string | null, BatchGptResponse | null, Array<BatchGptResponse> | null]>>} - A promise that resolves to an array containing the response objects that were returned after the requests completed (resolved or otherwise)
   */
  async parallel({ messages, concurrency, requestOptions = {} }) {
    validator.validateParallelParameters({
      messages,
      concurrency,
      requestOptions,
    });

    // generate a list of promises for each request from the messageList
    const requests = messages.map((message) => {
      const prompt = typeof message === "string" ? message : message.content;
      const options = typeof message === "string" ? {} : message.requestOptions;

      const createRequest = async () => {
        const fn = this.request.bind(this);
        const requestOptions = {
          messages: [{ role: "user", content: prompt }],
          ...options,
        };
        const response = await fn({ requestOptions });
        return response;
      };
      this.logger.info(`messages: ${JSON.stringify(messages, null, 2)}`);

      return createRequest;
    });

    // Instantiate a queue object
    const queue = new PQueue({
      concurrency,
    });

    const promises = requests.map((promise) => {
      const request = queue.add(async () => await promise());
      return request;
    });

    const results = await Promise.all(promises);

    this.logger.info("All requests completed");
    return results;
  }

  /**
   * This function is used to generate a description for an image
   * @memberof BatchGpt
   * @param {BatchGptImageDescriptionRequest} options - The options that should be used to generate the image description
   * @returns {Promise<[string | null, BatchGptResponse | null, Array<BatchGptResponse> | null]>} - A promise that resolves to an array containing the error message, the response object, and the history of the responses that were returned after the request completed (resolved or otherwise)
   */
  async imageDescription({ image, characterCount = 200, requestOptions = {} }) {
    validator.validateImageDescriptionParameters({
      image,
      characterCount,
      requestOptions,
    });

    this.logger.info(
      `Generating image description with ${characterCount} characters`
    );

    const url = utils.getBase64Image(image);

    return await this.request({
      prompt: [
        {
          type: "text",
          text: `Generate a description for the image below with ${characterCount} characters.`,
        },
        {
          type: "image_url",
          image_url: {
            url,
          },
        },
      ],
      requestOptions: { model: "gpt-4o", ...requestOptions },
    });
  }

  /**
   * This function is used to generate tags for an image
   * @memberof BatchGpt
   * @param {BatchGptImageTagRequest} options - The options that should be used to generate the image tags
   * @returns {Promise<[string | null, BatchGptResponse | null, Array<BatchGptResponse> | null]>} - A promise that resolves to an array containing the error message, the response object, and the history of the responses that were returned after the request completed (resolved or otherwise)
   */
  async generateImageTags({
    context = null,
    image = null,
    randomness = 1,
    searchTermCount = 1,
    requestOptions = {},
  }) {
    validator.validateImageTagsParameters({
      image,
      context,
      randomness,
      requestOptions,
      searchTermCount,
    });

    this.logger.info("Generating image tags");
    this.logger.info(`Context: ${JSON.stringify(context, null, 2)}`);
    this.logger.info(`Number of search terms: ${searchTermCount}`);
    this.logger.info(`Randomness: ${randomness}`);

    // first we want to generate search terms for the context (if provided it is the source of truth)

    const contentPrompt = [
      `Imagine creating a webpage focused on: ${context}`,
      `Generate ${randomness} key search term${
        searchTermCount > 1 ? "s" : ""
      } that capture the essence of the context provided.`,
      "Each term can be a single word or two words long and should be relevant for finding images on the Unsplash API.",
      "Ensure these terms avoid unknown nouns and accurately represent the context.",
      `From the generated list, choose ${searchTermCount} search terms.`,
      "Your response should only include a JSON object in the following structure:",
      '{ "searchTerms": ["term1", ...] }',
      "Do not list the terms as text; only return the JSON object.",
      `ONLY PROVIDE ${searchTermCount} SEARCH TERMS IN THE JSON OBJECT`,
    ].join("\n");

    const imagePrompt = [
      `Generate ${randomness} key search term${
        searchTermCount > 1 ? "s" : ""
      } that capture the essence of the image provided below.`,
      "Each term can be a single word or two words long and should be relevant for finding images on the Unsplash API.",
      "Ensure these terms avoid unknown nouns and accurately represent the image.",
      `From the generated list of search terms, respond with ${searchTermCount} search term${
        searchTermCount > 1 ? "s" : ""
      } randomly.`,
      "Your response should only include a JSON object in the following structure:",
      '{ "searchTerms": ["term1", ...] }',
      "Do not list the terms as text; only return the JSON object.",
      `ONLY PROVIDE ${searchTermCount} SEARCH TERMS IN THE JSON OBJECT`,
    ].join("\n");

    if (context) {
      return await this.request({ prompt: contentPrompt, requestOptions });
    }
    const url = utils.getBase64Image(image);

    this.logger.info(imagePrompt);

    return await this.request({
      prompt: [
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
      ],
      requestOptions: { model: "gpt-4o", ...requestOptions },
    });
  }
}
