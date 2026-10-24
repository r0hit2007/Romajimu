/**
 * @file retry.js
 * @description Exponential backoff retry utility and promise timeout helper for resilient
 * API and network operations in Silent SOS.
 */

/**
 * Execute an asynchronous function with exponential backoff and jitter.
 * @template T
 * @param {() => Promise<T>} fn - Asynchronous operation to execute
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=800] - Initial delay in ms
 * @param {number} [options.maxDelayMs=5000] - Cap on delay duration
 * @param {number} [options.factor=2] - Exponential multiplier
 * @param {boolean} [options.jitter=true] - Randomize delay to reduce server collision
 * @param {(error: Error) => boolean} [options.shouldRetry] - Decider function
 * @param {(info: { attempt: number, delay: number, error: Error }) => void} [options.onRetry] - Progress callback
 * @returns {Promise<T>}
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelayMs = 800,
    maxDelayMs = 5000,
    factor = 2,
    jitter = true,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;

      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Compute exponential backoff delay with optional jitter
      let delay = Math.min(baseDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      if (jitter) {
        delay = Math.round(delay * (0.75 + Math.random() * 0.5));
      }

      onRetry({ attempt, delay, error });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Race a promise against a timeout timer.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} [timeoutMessage='Operation timed out']
 * @returns {Promise<T>}
 */
export const withTimeout = (promise, timeoutMs = 8000, timeoutMessage = 'Operation timed out') => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutMessage);
      err.name = 'TimeoutError';
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};
