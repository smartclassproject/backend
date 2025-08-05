/**
 * Utility functions for consistent API responses
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response data
 */
const sendResponse = (res, statusCode, data) => {
  
  const response = {
    success: true,
    ...data
  };
  
  res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Error} error - Error object (optional)
 */
const sendError = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && {
      error: error.message,
      stack: error.stack
    })
  };
  
  res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination information
 * @param {string} message - Optional message
 */
const sendPaginatedResponse = (res, data, pagination, message = null) => {
  const response = {
    success: true,
    data,
    pagination,
    ...(message && { message })
  };
  
  res.status(200).json(response);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
const sendValidationError = (res, errors) => {
  const response = {
    success: false,
    message: 'Validation failed',
    errors: errors.map(error => ({
      field: error.path || error.field,
      message: error.msg || error.message,
      value: error.value
    }))
  };
  
  res.status(400).json(response);
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Name of the resource that was not found
 */
const sendNotFound = (res, resource = 'Resource') => {
  const response = {
    success: false,
    message: `${resource} not found`
  };
  
  res.status(404).json(response);
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message (optional)
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
  const response = {
    success: false,
    message
  };
  
  res.status(401).json(response);
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message (optional)
 */
const sendForbidden = (res, message = 'Access denied') => {
  const response = {
    success: false,
    message
  };
  
  res.status(403).json(response);
};

module.exports = {
  sendResponse,
  sendError,
  sendPaginatedResponse,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden
};