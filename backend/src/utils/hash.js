const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt with 12 salt rounds
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plain text password against stored hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
