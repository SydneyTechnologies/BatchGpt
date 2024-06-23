// UTILITY FUNCTIONS
/**
 *  delay function, delays the execution of the next function call by the specified time
 *  @param {number} time time in milliseconds to delay
 */
export const delay = async (time) => {
  await new Promise((resolve) => setTimeout(resolve, time));
};

/**
 *  isJson function, checks if a string is valid JSON
 *  @param {string} str potential JSON string to check
 */
export function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 *  fromJsonToObject function, converts a JSON string to a Javascript object
 *  @param {string} jsonString JSON string
 *  @return {Object} returns a Javascript object
 */
export function fromJsonToObject(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Input string is an Invalid JSON string");
  }
}

export function getPrompt(message) {
  if (typeof message === "string") {
    return message;
  } else if (typeof message === "object") {
    return message;
  }
}
