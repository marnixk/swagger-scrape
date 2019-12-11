/*

     APL 2.0 license applies

     Author: Marnix Kok <marnix@xinsolutions.co.nz>

     ____                                       ____
    / ___|_      ____ _  __ _  __ _  ___ _ __  / ___|  ___ _ __ __ _ _ __   ___ _ __
    \___ \ \ /\ / / _` |/ _` |/ _` |/ _ \ '__| \___ \ / __| '__/ _` | '_ \ / _ \ '__|
     ___) \ V  V / (_| | (_| | (_| |  __/ |     ___) | (__| | | (_| | |_) |  __/ |
    |____/ \_/\_/ \__,_|\__, |\__, |\___|_|    |____/ \___|_|  \__,_| .__/ \___|_|
                        |___/ |___/                                 |_|


    Purpose:

        To generate a swagger document for a set of express endpoints that have been
        decorated with the appropriate tags.

*/

const _ = require('lodash');
const fs = require('fs');
const jsdoc = require('jsdoc-api');

function getFile(base, hint) {
    return fs.readFileSync(base + hint,{ encoding: 'utf8' });

}

function extractFileHint(func)  {
    let raw = func.toString();
    let start = raw.indexOf("@fileHint:");
    if (start === -1) {
        return null;
    }
    let nextSemiColon = raw.indexOf(";", start);
    let instr = raw.substring(start, nextSemiColon);
    let fileStart = instr.indexOf(":");

    return (
        instr
            .substring(fileStart + 1)
            .replace(/^\s+/, '')
            .replace(/\s+$/, '')
    );
}

function trim(str) {
    return (
        str
            .replace(/^\s+/, '')
            .replace(/\s+$/, '')
    );

}

/**
 * @returns {boolean} true if the typename is not a primitive
 */
function determineIsComplex(typeName) {
    return !(
        typeName == 'number' ||
        typeName == 'boolean' ||
        typeName == 'integer' ||
        typeName == 'string' ||
        typeName == 'object' ||
        typeName == 'file'
    );
}

let SwaggerScraper = _.extend(new function() {}, {


    /**
     * Is able to extract routes from the routing information in a routeContainer object
     * of express js application instance type.
     *
     * @param app       the exprerss js application instance.
     * @return a l;ist of route handlers
     */
    expressRoutes : function(app) {
        let stack = app._router.stack;
        let withRoute = _.filter(stack, (s) => { return !!s.route });
        let routeLayers = [];

        _.each(withRoute, (layer) => {
            let route = layer.route;
            let stack = layer.route.stack;

            // iterate over all route layers and gather their information
            _.each(stack || [], (routeLayer) => {
                let routeClone = _.clone(routeLayer);
                routeClone.path = route.path;
                routeLayers.push(routeClone);
            });
        });

        return routeLayers;
    },

    /**
     * Extract lambda routing information.
     *
     * @param endpointsMap      the endpoints map implementation
     * @returns {[]}            a simple
     */
    lambdaRoutes : function(endpointsMap) {

        let routes = [];
        const methods = _.keys(endpointsMap);

        _.each(methods, (method) => {
            const methodEndpoints = _.keys(endpointsMap[method]);

            _.each(methodEndpoints, (endpoint) => {
                routes.push({
                    path: endpoint,
                    method: method,
                    handle: endpointsMap[method][endpoint]
                });
            });
        });

        return routes;
    },


    /**
     * Scrape endpoints with the required swagger scraper syntax by using either a custom routeProvider
     * other using the default expressRoutes implementation.
     *
     * @param baseFolder            the base folder to associate file hint filenames with
     * @param routeContainer        the routeContainer to look inside of for routing information
     * @param routeProvider         the routeProvider extraction logic.
     * @returns {[]}                an array of all endpoint information we found.
     */
    scrapeEndpoints : function(baseFolder, routeContainer, routeProvider = SwaggerScraper.expressRoutes) {

        let endpoints = [];

        let routeLayers = routeProvider(routeContainer);

        // a route can have multiple methods associated with it
        _.each(routeLayers, (routeLayer) => {

            let fileHint = extractFileHint(routeLayer.handle) || '';
            let docId = '';

            if (fileHint.indexOf("::") !== -1) {
                let hintSplit = fileHint.split("::");

                if (hintSplit.length !== 2) {
                    throw new Error("File hint with document identifier should only contain 1 :: (for: " + fileHint + ")");
                }

                fileHint = hintSplit[0];
                docId = hintSplit[1];
            }

            endpoints.push({
                path: routeLayer.path,
                method: routeLayer.method,
                handler: routeLayer.handle,
                fileHint: fileHint,
                docId: docId,
                jsDoc: fileHint ? jsdoc.explainSync({files: baseFolder + fileHint}) : ''
            });
        });

        return endpoints;
    },


    /**
     * All the endpoints will get converted to a map
     * @param endpoints the endpoints to convert
     * @private
     */
    _allEndpointsToSwagger : function(endpoints, models) {
        let thiz = this;
        let pathsMap = {};

        _.each(endpoints, function(endpoint) {

            // make sure there is a map for the path
            if (!pathsMap[endpoint.path]) {
                pathsMap[endpoint.path] = {};
            }

            // add swagger information
            pathsMap[endpoint.path][endpoint.method] = thiz._endpointToSwagger(endpoint, models);
        });

        return pathsMap;
    },

    /**
     * Get the swagger comment node of a function description. If
     * the `id` parameter is specified, "@id <id>" should appear in the
     * comment block as well as the @swagger tag.
     *
     * @param jsDoc     is the JsDoc instance for the file
     * @param id        is empty or has a specific swagger id
     * @returns {*}     the node that first matches the description asked for
     * @private
     */
    _getSwaggerDoc : function(jsDoc, id) {
        return _.find(jsDoc, (el) => {
            
            const idRegexp = new RegExp(`@id ${id}\\s+`);

            return (
                el.kind === 'function' &&
                el.comment.indexOf('@swagger') !== -1 && (
                    id ? el.comment.match(idRegexp) !== null : true
                )
            );
        });
    },

    /**
     * Get tags from under a jsdoc node with a certain title
     *
     * @param node  the jsdoc node to query
     * @param title the tag type we're looking for
     * @returns {tags[]} an array of tag information
     * @private
     */
    _getTagsWithTitle : function(node, title) {
        if (!node) {
            return null;
        }

        return _.filter(node.tags, (tags) => {
            return tags.title === title;
        });
    },

    /**
     * This method iterates over the "@response" tag array and is able to
     * turn it into a swagger shaped response document.
     *
     * These tags are formatted like:
     * @response <statusCode> {<typeName>} message
     *
     * @param responses
     * @private
     */
    _responseMap : function(jsDoc, responses, models) {
        let map = {};
        _.each(responses, function(response) {
            let split = response.text.split(/\s+/);
            let code = split[0];
            let description = trim(_.tail(split).join(" ")).replace("\n", " ");

            let endBracket = description.indexOf("}");

            let schemaStruct = null;
            if (endBracket !== -1 && description.startsWith("{")) {

                let typeName = description.substring(1, endBracket);
                description = trim(description.substring(endBracket + 1));

                let array = typeName.endsWith("[]");
                if (array) {
                    typeName = typeName.substring(0, typeName.length - 2);
                }
                let complex = determineIsComplex(typeName);

                if (complex) {
                    models.push({
                        name: typeName,
                        jsDoc: jsDoc
                    });
                }

                if (array) {
                    schemaStruct = {
                        type: 'array',
                        items: (
                            complex? { "$ref" : "#/definitions/" + typeName }
                                   : { "type" : typeName }
                        )
                    }
                } else {
                    schemaStruct = (
                        complex? { "$ref" : "#/definitions/" + typeName }
                               : { "type" : typeName }
                    );
                }
            }

            map[code] = {
                description: description,
                schema: schemaStruct
            };
        });
        return map;
    },

    /**
     * Parse a parameter description. It extracts param types and type hints. If possible
     * the type hint is resolved from the same jsdoc.
     *
     * @param param
     * @returns {*}
     * @private
     */
    _parseDescription: function(jsdoc, param) {

        let types = ["(query)", "(path)", "(header)", "(body)"];

        if (!param.description) {
            return null;
        }

        let foundParamType = null;
        let required = false;

        _.each(types, function(type) {
            let typeIdx = param.description.indexOf(type);
            if (typeIdx !== -1) {
                foundParamType = type;

                // required parameters have an asterisk before their type definition
                required = (typeIdx !== 0 && param.description.charAt(typeIdx - 1) == '*');
            }

        });

        // nothing found? skip parameter.
        if (!foundParamType) {
            return null;
        }

        // description = raw description - param type description
        let description =
            trim(
                param.description.replace(
                    (required? "*" : "") + foundParamType,
                    ""
                )
            );

        // get rid of parentheses
        foundParamType = foundParamType.substring(1, foundParamType.length - 1);

        // get the typehint from the description.
        let array = false;
        let closingBracket = description.indexOf("}");
        let typeName = 'string';

        // found {word} style at start of description? extract it.
        if (param.type && param.type.names.length > 0) {
            typeName = param.type.names[0];

            // does the hint end in [] ? that means it's an array.
            if (typeName.startsWith("Array.<")) {
                array = true;
                typeName = typeName.substring("Array.<".length, typeName.length - 1);
            }

        }

        // return all we fond.
        return {
            description: description.replace(/\n/g, " "),
            required: required,
            array: array,
            complex: determineIsComplex(typeName),
            typeName: typeName,
            paramType: foundParamType,
        };
    },

    /**
     * Parse the set of parameters available on the jsDoc block and interpret them appropriately
     *
     * @param params    an array of parameters
     * @private
     */
    _parameterMap : function(jsDoc, params, models) {
        let thiz = this;
        return _.flatten(

            _.map(params, (param) => {

                let paramInfo = thiz._parseDescription(jsDoc, param);

                if (!paramInfo) {
                    return [];
                }

                let schemaStruct = null;
                if (paramInfo.array) {
                    schemaStruct = {
                        type: 'array',
                        items:
                            paramInfo.complex? { "$ref" : "#/definitions/" + paramInfo.typeName }
                                             : { "type" : paramInfo.typeName }
                    }
                } else {
                    schemaStruct = (
                        paramInfo.complex? { "$ref" : "#/definitions/" + paramInfo.typeName }
                                         : { "type" : paramInfo.typeName }
                    );
                }

                if (paramInfo.complex) {
                    models.push({
                        name: paramInfo.typeName,
                        jsDoc: jsDoc
                    });
                }

                return {
                    name: param.name,
                    in: paramInfo.paramType,
                    required: paramInfo.required,
                    description: paramInfo.description,
                    schema: schemaStruct
                };
            })
        );
    },

    /**
     * Transform a single endpoint information
     *
     * @param endpoint
     * @private
     */
    _endpointToSwagger : function(endpoint, models) {
        let emptyTag = {text: ''};
        let swaggerNode = this._getSwaggerDoc(endpoint.jsDoc, endpoint.docId) || {};
        let getText = (tag) => { return _.isEmpty(tag) ? '' : tag[0].text.replace(/\n/g,  " ") };

        let swagTag = this._getTagsWithTitle(swaggerNode, 'swagger');
        let tagTags = this._getTagsWithTitle(swaggerNode, 'tag');
        let responseTags = this._getTagsWithTitle(swaggerNode, 'response');
        let endpointId = endpoint.method + "_" + endpoint.path.replace(/[^a-zA-Z]/g, '');

        return {
            summary: swaggerNode.summary,
            tags: _.map(tagTags, function(tag){ return trim(tag.text); }),
            id: endpointId,
            description: getText(swagTag),
            operationId: "",
            parameters: this._parameterMap(endpoint.jsDoc, swaggerNode.params || [], models),
            responses: this._responseMap(endpoint.jsDoc, responseTags || [], models),
            deprecated: false
        }
    },


    /**
     * Transform an object with comments to a swagger definition
     *
     * @param model     the name of the model.
     * @returns {*}
     * @private
     */
    _transformObjectToDefinition: function(model) {
        let thiz = this;
        let results = [];

        // find all model definitions
        let mainDef = _.filter(model.jsDoc, (el) => (
            (el.comment || '').indexOf('@model') !== -1) &&
            el.name === model.name
        );

        if (mainDef.length === 0) {
            console.error("[SWAGGER]: Cannot find the definition for:", model.name);
            return null;
        }


        let elements = _.filter(model.jsDoc, (el) => {
            return el.longname.startsWith(model.name + ".") && el.kind === 'member'
        });


        let props = {};
        let reqProps = [];

        _.each(elements, (varEl) => {


            let array = false;
            let typeName = varEl.type.names[0];

            if (typeName.startsWith("Array.<")) {
                array = true;
                typeName = typeName.substring("Array.<".length, typeName.length - 1);
            }

            let complex = determineIsComplex(typeName);
            let typeSchema =
                complex? { "$ref" : "#/definitions/" + typeName }
                       : { "type" : typeName }
           ;

            if (array) {
                props[varEl.name] = {
                    type: 'array',
                    items: typeSchema
                }
            }
            else {
                props[varEl.name] = typeSchema;
            }

            // recurse find the complex sub item type
            if (complex) {
                let lookingForModel = {
                    name: typeName,
                    jsDoc: model.jsDoc
                };

                let subModels = thiz._transformObjectToDefinition(lookingForModel) || [];

                // add to results
                _.each(subModels, (addMe) => results.push(addMe));
            }

            // is it a required field?
            let reqTags = thiz._getTagsWithTitle(varEl, "required");
            if (reqTags.length > 0) {
                reqProps.push(varEl.name);
            }
        });


        results.push({
            type: "object",
            title: model.name,
            properties: props,
            required: reqProps
        });

        return results;
    },

    /**
     * Generate the complex type definitions based on the jsdocs and model names
     * that have been added to the models array.
     *
     * @param models    an array with {name:, jsdoc:} structure
     * @returns {null}
     * @private
     */
    _generateDefinitions : function(models) {
        let thiz = this;
        let map = {};

        _.each(models, (model) => {
            let definitions = thiz._transformObjectToDefinition(model);
            _.each(_.flatten([definitions]), (def) => {
                if (!def) {
                    return;
                }
                map[def.title] = def;
            })
        });

        return map;
    },

    /**
     * Convert a set of endpoint definitions into a swagger json document.
     *
     * @param info          application information in swagger format
     * @param host          the host this is based on
     * @param basePath      the base path of the application
     * @param endpoints     the endpoints that have been found in express js's routing layer.
     *
     * @returns {object} an object structured like a swagger 2.0 document.
     */
    toSwaggerJson : function(info, host, basePath, endpoints) {
        let models = [];
        let paths = this._allEndpointsToSwagger(endpoints, models);
        let definitions = this._generateDefinitions(models) || [];

        let swaggerJson = {
            swagger: "2.0",
            info: info,
            host: host,
            basePath: basePath,
            consumes: [ "application/json" ],
            produces: [ "application/json" ],
            paths: paths,
            definitions: definitions
        };

        return swaggerJson;
    }


});


module.exports = SwaggerScraper;
