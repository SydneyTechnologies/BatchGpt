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

/**
 * Logger class for logging information, warnings, and errors to the console based on the specified verbosity level.
 * @param {string} verbose - Verbosity level, one of "NONE", "INFO", or "DEBUG".
 */
export class Logger {
  constructor({ verbose = "NONE" }) {
    this.verbose = verbose;
    this.ERROR = "\x1b[31m";
    this.WARN = "\x1b[33m";
    this.INFO = "\x1b[0m";
  }

  /**
   * Gets the current date and time in a formatted string.
   * @return {string} Formatted date and time string.
   */
  getDate() {
    const currentDateTime = new Date();
    const month = currentDateTime.getMonth() + 1;
    const day = currentDateTime.getDate();
    const year = currentDateTime.getFullYear();
    const hours = currentDateTime.getHours();
    const minutes = currentDateTime.getMinutes();
    const seconds = currentDateTime.getSeconds();

    const formattedDate = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
    return formattedDate;
  }

  /**
   * Logs information to the console if verbosity level is INFO or DEBUG.
   * @param {...any} args - The data to be logged.
   */
  log(...args) {
    if (this.verbose === "INFO" || this.verbose === "DEBUG") {
      console.log(`${this.INFO}[${this.getDate()}] INFO:`, ...args);
    }
  }

  /**
   * Logs errors to the console if verbosity level is DEBUG.
   * @param {...any} args - The data to be logged as an error.
   */
  error(...args) {
    if (this.verbose === "DEBUG") {
      console.log(`${this.ERROR}[${this.getDate()}] ERROR:`, ...args);
    }
  }

  /**
   * Logs warnings to the console if verbosity level is DEBUG.
   * @param {...any} args - The data to be logged as a warning.
   */
  warn(...args) {
    if (this.verbose === "DEBUG") {
      console.log(`${this.WARN}[${this.getDate()}] WARN:`, ...args);
    }
  }
}
