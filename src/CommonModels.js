/**
 * @typedef Route
 *
 * @property {string|string[]} path - the path to the route
 * @property {'GET'|'POST'|'HEAD'|'OPTIONS'|'PUT'|'DELETE'} method - the method used for the route
 * @property {function} handle - the function that is executed when the endpoint is invoked.
 */


/**
 * @typedef Endpoint
 *
 * @property {object} jsDoc - the jsdoc blob that belongs to the endpoint definition
 * @property {string} docId - a unique document identifier
 * @property {string} path - the path to the endpoint
 * @property {string} method - the method of the endpoint (get, post, put etc.)
 */


/**
 * @typedef AppInfo
 *
 * @property {string} version - the version number of the current API implementation
 * @property {string} title - the title of the API
 * @property {string} description - short description of the API
 * @property {string[]} common - set of file references that contain common Models
 */


/**
 * @typedef ModelDefinition
 *
 * @property {string} name - the name of the model
 * @property {object} jsDoc - the jsdoc blob belonging to a model description
 *
 */
