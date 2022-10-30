
/**
 * @typedef Subtype
 *
 * @property {number} integer - the number to store
 */

/**
 * @typedef TestDefinition
 *
 * @property {string} text - the text
 * @property {string[]} lines - the lines
 * @property {Subtype} subtype - complex subtypes
 * @property {Subtype[]} subtypeArray - complex subtypes
 */

/**
 * @typedef ResponseModel
 *
 * @property {string} message - the message to return
 * @property {number} status_code - status code
 */

/**
 * @typedef {ResponseModel} DetailedResponseModel
 *
 * @property {string} additionalField - the additional information
 */
