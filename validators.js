export function validateRequestParameters({
  messages,
  minTokens,
  validateJson,
  image_model,
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

  if (image_model !== null && typeof image_model !== "string") {
    throw new Error(
      "Invalid 'image_model' parameter. It should be a 'dall-e-2', 'dall-e-3' or null."
    );
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

export function validateParallelParameters({
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
