export function validateRequestParameters({
  model,
  prompt,
  messages,
  minTokens,
  validateJson,
  imageModel,
  minResponseTime,
  timeout,
  retryCount,
  retryDelay,
}) {
  // Validate model
  if (typeof model !== "string") {
    throw new Error("Invalid 'model' parameter. It should be a string.");
  }
  // we have to have either a prompt or messages
  if (!prompt && !messages) {
    throw new Error("Either 'prompt' or 'messages' parameter is required.");
  }
  // if prompt is provided, it should be a string or array
  if (prompt && typeof prompt !== "string" && !Array.isArray(prompt)) {
    throw new Error("Invalid 'prompt' parameter. It should be a string.");
  }
  // if messages is provided, it should be a non-empty array
  if (messages && (!Array.isArray(messages) || messages.length === 0)) {
    throw new Error(
      "Invalid 'messages' parameter. It should be a non-empty array."
    );
  }

  if (minTokens && typeof minTokens !== "number") {
    throw new Error(
      "Invalid 'minTokens' parameter. It should be a number or null."
    );
  }

  if (imageModel && typeof imageModel !== "string") {
    throw new Error(
      "Invalid 'imageModel' parameter. It should be a 'dall-e-2', 'dall-e-3' or null."
    );
  }

  if (validateJson && typeof validateJson !== "boolean") {
    throw new Error(
      "Invalid 'validateJson' parameter. It should be a boolean value."
    );
  }

  if (minResponseTime && typeof minResponseTime !== "number") {
    throw new Error(
      "Invalid 'minResponseTime' parameter. It should be a number or null."
    );
  }

  if (timeout && (typeof timeout !== "number" || timeout <= 0)) {
    throw new Error(
      "Invalid 'timeout' parameter. It should be a number greater than zero or null."
    );
  }

  if (retryCount && (typeof retryCount !== "number" || retryCount < 0)) {
    throw new Error(
      "Invalid 'retryCount' parameter. It should be a non-negative number or null."
    );
  }

  if (
    retryDelay &&
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

export function validateParallelParameters({
  model,
  messageList,
  onResponse,
  minResponseTime,
  imageModel,
  minTokens,
  timeout,
  retryCount,
  retryDelay,
  concurrency,
}) {
  // Validate model
  if (typeof model !== "string") {
    throw new Error("Invalid 'model' parameter. It should be a string.");
  }

  if (imageModel && typeof imageModel !== "string") {
    throw new Error(
      "Invalid 'imageModel' parameter. It should be a 'dall-e-2', 'dall-e-3' or null."
    );
  }
  // Validate messageList
  if (!Array.isArray(messageList) || messageList.length === 0) {
    throw new Error(
      "messageList must be a non-empty array of message objects."
    );
  }

  // Validate onResponse callback
  if (onResponse && typeof onResponse !== "function") {
    throw new Error("onResponse must be a function.");
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
