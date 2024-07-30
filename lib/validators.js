import Joi from "joi";

const requestOptionsSchema = Joi.object({
  model: Joi.string(),
  messages: Joi.array().allow(null),
  minTokens: Joi.number().allow(null),
  validateJson: Joi.boolean().allow(null),
  timeout: Joi.number().allow(null).min(0),
  minResponseTime: Joi.number().allow(null),
  retryCount: Joi.number().allow(null).min(0),
});

const imageDescriptionSchema = Joi.object({
  characterCount: Joi.number().required(),
  requestOptions: requestOptionsSchema.allow(null),
  image: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
});

const imageTagsSchema = Joi.object({
  randomness: Joi.number()
    .allow(null)
    .min(Joi.ref("searchTermCount"))
    .default(Joi.ref("searchTermCount")),
  context: Joi.string().allow(null),
  searchTermCount: Joi.number().min(1).default(1),
  requestOptions: requestOptionsSchema.allow(null),
  image: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
}).custom((value, helpers) => {
  if (value.context && value.image) {
    return helpers.error("context and image cannot be used together");
  }
});

const parallelParametersSchema = Joi.object({
  messageList: Joi.array().required(),
  concurrency: Joi.number().required().min(1),
  requestOptions: requestOptionsSchema.allow(null),
});

const requestParametersSchema = Joi.object({
  prompt: Joi.alternatives()
    .try(Joi.string(), Joi.array())
    .allow(null)
    .required(),
  imageOptions: Joi.object().required(),
  requestOptions: requestOptionsSchema.allow(null),
});

export function validateRequestParameters({
  prompt,
  imageOptions,
  requestOptions,
}) {
  const { error } = requestParametersSchema.validate({
    prompt,
    requestOptions,
    imageOptions,
  });

  if (error) {
    throw error;
  }
}

export function validateParallelParameters({
  concurrency,
  requestOptions,
  messages: messageList,
}) {
  const { error } = parallelParametersSchema.validate({
    messageList,
    concurrency,
    requestOptions,
  });

  if (error) {
    throw error;
  }
}

export function validateImageDescriptionParameters({
  image,
  characterCount,
  requestOptions,
}) {
  const { error } = imageDescriptionSchema.validate({
    image,
    characterCount,
    requestOptions,
  });

  if (error) {
    throw error;
  }
}

export function validateImageTagsParameters({
  image,
  context,
  randomness,
  requestOptions,
  searchTermCount,
}) {
  const { error } = imageTagsSchema.validate({
    image,
    context,
    randomness,
    requestOptions,
    searchTermCount,
  });

  if (error) {
    throw error;
  }
}
