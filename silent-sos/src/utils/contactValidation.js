/**
 * @file contactValidation.js
 * @description Comprehensive contact validation, sanitization, and duplicate detection
 * ensuring robust emergency contact management across Silent SOS.
 */

/**
 * Standard phone regex allowing optional leading '+' and 7 to 15 digits.
 * Compatible with international E.164 and local cellular formats.
 */
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/**
 * Standard email format regex.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Strip spaces, dashes, brackets, and periods from a phone string,
 * retaining only digits and an optional leading '+'.
 * @param {string} phone
 * @returns {string} Sanitized phone number
 */
export const sanitizePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
};

/**
 * Check if a sanitized phone number has a realistic pattern.
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone) => {
  const sanitized = sanitizePhoneNumber(phone);
  if (!sanitized) return false;
  if (!PHONE_REGEX.test(sanitized)) return false;

  // Reject obvious dummy repetitive sequences like "00000000" or "11111111"
  const digits = sanitized.replace('+', '');
  const allSameDigit = digits.split('').every(d => d === digits[0]);
  if (allSameDigit && digits.length >= 7) return false;

  return true;
};

/**
 * Validate contact full name.
 * @param {string} name
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'Contact name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters.' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Name cannot exceed 50 characters.' };
  }
  return { isValid: true };
};

/**
 * Validate email address (optional field, but if provided must be valid).
 * @param {string} email
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return { isValid: true }; // Email is optional
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true };
};

/**
 * Check if contact's phone already exists in the contacts list.
 * @param {string} phone - Sanitized or raw phone
 * @param {Array<Object>} existingContacts - List of existing contacts
 * @param {string|null} [excludeContactId=null] - ID to exclude (when editing)
 * @returns {boolean} True if duplicate exists
 */
export const isDuplicatePhone = (phone, existingContacts = [], excludeContactId = null) => {
  const target = sanitizePhoneNumber(phone);
  if (!target) return false;

  return existingContacts.some(c => {
    if (excludeContactId && c.id === excludeContactId) return false;
    return sanitizePhoneNumber(c.phone) === target;
  });
};

/**
 * Comprehensive validation function for contact creation and updates.
 * @param {Object} formData
 * @param {string} formData.name
 * @param {string} formData.phone
 * @param {string} [formData.email]
 * @param {Array<Object>} existingContacts
 * @param {string|null} [editingContactId=null]
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitized: { name: string, phone: string, email: string } }}
 */
export const validateContactForm = (formData, existingContacts = [], editingContactId = null) => {
  const errors = {};
  const rawName = formData.name || '';
  const rawPhone = formData.phone || '';
  const rawEmail = formData.email || '';

  // Validate Name
  const nameValidation = validateName(rawName);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  }

  // Validate Phone
  if (!rawPhone.trim()) {
    errors.phone = 'Phone number is required for SMS emergency alerts.';
  } else if (!isValidPhoneNumber(rawPhone)) {
    errors.phone = 'Enter a valid phone number (at least 7 digits with country code).';
  } else if (isDuplicatePhone(rawPhone, existingContacts, editingContactId)) {
    errors.phone = 'A contact with this phone number already exists.';
  }

  // Validate Email
  const emailValidation = validateEmail(rawEmail);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: rawName.trim(),
      phone: sanitizePhoneNumber(rawPhone),
      email: rawEmail.trim(),
    },
  };
};

/**
 * Format a phone number into readable grouped chunks for UI display.
 * @param {string} phone
 * @returns {string} Formatted phone number
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';
  const sanitized = sanitizePhoneNumber(phone);
  // US/Canada format: +1 (XXX) XXX-XXXX
  if (sanitized.startsWith('+1') && sanitized.length === 12) {
    const area = sanitized.slice(2, 5);
    const mid = sanitized.slice(5, 8);
    const end = sanitized.slice(8, 12);
    return `+1 (${area}) ${mid}-${end}`;
  }
  // Standard 10-digit without +1: (XXX) XXX-XXXX
  if (!sanitized.startsWith('+') && sanitized.length === 10) {
    const area = sanitized.slice(0, 3);
    const mid = sanitized.slice(3, 6);
    const end = sanitized.slice(6, 10);
    return `(${area}) ${mid}-${end}`;
  }
  // Generic grouping for readability: chunk every 3-4 digits
  return sanitized.replace(/(\d{3,4})(?=\d)/g, '$1 ');
};
