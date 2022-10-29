import _ from "lodash";
import jsdoc from "jsdoc-api";
import {TypedefInterpreter} from "./TypedefInterpreter";
import {isComplexType} from "./TypeHelper";

/**
 * A list of valid request parameter types
 * @type {string[]}
 */
const ParameterTypes = ["(query)", "(path)", "(header)", "(body)"];


/**
 * Extract the text from a tag, if it's empty return an empty string.
 *
 * @param tag {array} the tag tp extract information from
 * @returns {string} the contents of the tag
 */
function getTagText(tag) {
    return _.isEmpty(tag) ? '' : tag[0].text.replace(/\n/g,  " ")
}



export class SwaggerScraper {

    /**
     * Instance with `scraper` function that is able to read endpoints,
     * so we can go and build swagger.json out of it.
     */
    routeProvider;

    /**
     * The base folder in which to find all the referenced files
     * @type string
     */
    baseFolder;

    /**
     * Initialise data-members
     *
     * @param routeProvider {object} the instance of a route provider
     * @param baseFolder {string} the base folder to associate file hint filenames with
     */
    constructor(routeProvider, baseFolder = "./") {
        if (!routeProvider) {
            throw new Error("`routeProvider` cannot be empty");
        }

        this.routeProvider = routeProvider;
        this.baseFolder = baseFolder;
    }


    /**
     * Convert a set of endpoint definitions into a swagger json document.
     *
     * @param info {AppInfo} application information in swagger format
     * @param host {string} the host this is based on
     *
     * @returns {object} an object structured like a swagger 2.0 document.
     */
    toSwaggerJson(info, host) {
        let models = [];
        const endpoints = this._scrapeEndpoints();
        const commonJsDoc = info.common ? jsdoc.explainSync({files: info.common}) : [];

        let paths = this._allEndpointsToSwagger(endpoints, models);
        let definitions = this._generateDefinitions(models, commonJsDoc) || [];

        return {
            swagger: "2.0",
            info: info,
            host: host,
            schemes: ['http', 'https'],
            basePath: basePath,
            consumes: ["application/json"],
            produces: ["application/json"],
            paths: paths,
            definitions: definitions
        };
    }


    /**
     * Scrape endpoints with the required swagger scraper syntax by using either a custom routeProvider
     * other using the default expressRoutes implementation.
     *
     * @private
     * @returns {[]}                an array of all endpoint information we found.
     */
    _scrapeEndpoints() {

        const endpoints = [];

        /** @type Route[] */
        const routeLayers = this.routeProvider.scrapeRoutes();

        // iterate over all route layers
        for (const routeLayer of routeLayers) {

            //
            //  Try to extract @fileHint from the function handler
            //
            let fileHint = this._extractFileHint(routeLayer.handle) || '';
            let docId = '';

            //
            //  If @fileHint of format <Filename>::<SwaggerId> extract swagger id.
            //
            if (fileHint.indexOf("::") !== -1) {
                let hintSplit = fileHint.split("::");

                if (hintSplit.length !== 2) {
                    throw new Error("File hint with document identifier should only contain 1 :: (for: " + fileHint + ")");
                }

                fileHint = hintSplit[0];
                docId = _.first(hintSplit[1].match(/^\w+/));
            }

            // make express js path matching with the swagger version
            const replacementPath =
                _.isArray(routeLayer.path)
                    ? routeLayer.path.map((x) => x.replace(/:(\w+)/g, "{$1}"))
                    : routeLayer.path.replace(/:(\w+)/g, "{$1}")
            ;

            endpoints.push({
                path: replacementPath,
                method: routeLayer.method,
                handler: routeLayer.handle,
                fileHint: fileHint,
                docId: docId,
                jsDoc: fileHint ? jsdoc.explainSync({files: this.baseFolder + fileHint}) : ''
            });
        }

        return endpoints;
    }


    /**
     * All the endpoints will get converted to a map
     *
     * @param endpoints {Endpoint[]} the endpoints to convert
     * @param models {ModelDefinition[]} a list of models to track
     *
     * @private
     */
    _allEndpointsToSwagger(endpoints, models) {
        let pathsMap = {};

        for (const endpoint of endpoints) {

            // make sure there is a map for the path
            if (!pathsMap[endpoint.path]) {
                pathsMap[endpoint.path] = {};
            }

            // add swagger information
            const swaggerEndpoint = this._endpointToSwagger(endpoint, models);
            if (swaggerEndpoint) {
                pathsMap[endpoint.path][endpoint.method] = swaggerEndpoint;
            }
        }

        return pathsMap;
    }

    /**
     * Interpret the javascript doc block for an endpoint and transform the
     * jsdoc information into a swagger spec json structure.
     *
     * @param endpoint {Endpoint} The endpoint to manipulate
     * @param models   {ModelDefinition[]} an array of model names we need to know about.
     * @private
     */
    _endpointToSwagger(endpoint, models) {

        const swaggerNode = this._getSwaggerDoc(endpoint.jsDoc, endpoint.docId) || {};

        let swagTag = this._getTagsWithTitle(swaggerNode, 'swagger');

        // the jsdoc block does not contain '@swagger'
        if (_.isEmpty(swagTag)) {
            return null;
        }

        const tagTags = this._getTagsWithTitle(swaggerNode, 'tag');
        const responseTags = this._getTagsWithTitle(swaggerNode, 'response');

        const path = _.isArray(endpoint.path) ? endpoint.path[0] : endpoint.path;
        const endpointId = endpoint.method + "_" + path.replace(/[^a-zA-Z]/g, '');

        return {
            id: endpointId,
            operationId: endpointId,
            summary: swaggerNode.summary,
            tags: tagTags.map((tag) => tag.text.trim()),
            description: getTagText(swagTag),
            parameters: this._parameterMap(endpoint.jsDoc, swaggerNode.params || [], models),
            responses: this._responseMap(endpoint.jsDoc, responseTags || [], models),
            deprecated: false
        };
    }


    /**
     * Extract the @fileHint comment from a function's contents.
     *
     * TODO: look at case-sensitivity for @fileHint annotation
     * TODO: look at ditching semi-colon requirement, or better messaging.
     *
     * @param func {Function} the function that we need to analyse
     * @returns {string|null}
     * @private
     */
    _extractFileHint(func)  {
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
    _getSwaggerDoc(jsDoc, id) {
        return jsDoc.find((el) => {

            const idRegexp = new RegExp(`@id ${id}\\s+`);

            return (
                el.kind === 'function' &&
                el.comment.indexOf('@swagger') !== -1 && (
                    id ? el.comment.match(idRegexp) !== null : true
                )
            );
        });
    }

    /**
     * Get tags from under a jsdoc node with a certain title
     *
     * @param node  the jsdoc node to query
     * @param title the tag type we're looking for
     * @returns {object[]} an array of tag information
     * @private
     */
    _getTagsWithTitle(node, title) {
        if (!node) {
            return null;
        }

        // filter out all tags that have a title `title`.
        return node.tags.filter((tags) => {
            return tags.title === title;
        });
    }

    /**
     * This method iterates over the "@response" tag array and is able to
     * turn it into a swagger shaped response document.
     *
     * These tags are formatted like:
     * @response <statusCode> {<typeName>} message
     *
     * @param jsDoc {object} the jsdoc blob to analyse
     * @param responses {object[]} all @response tags from a jsdoc block
     * @param models {ModelDefinition[]} a (mutable) list of complex models we need to know about.
     * @private
     */
    _responseMap(jsDoc, responses, models) {
        let map = {};

        for (const response of responses) {

            const split = response.text.split(/\s+/);
            let statusCode = split[0];
            let description = _.tail(split).join(" ").trim().replace("\n", " ");

            let endBracket = description.indexOf("}");

            let schemaStruct = null;
            if (endBracket !== -1 && description.startsWith("{")) {

                let typeName = description.substring(1, endBracket);
                description = description.substring(endBracket + 1).trim();

                const isArray = typeName.endsWith("[]");
                if (isArray) {
                    typeName = typeName.substring(0, typeName.length - "[]".length);
                }

                const isComplex = isComplexType(typeName);

                // make sure we scrape this model later.
                if (isComplex) {
                    models.push({
                        name: typeName,
                        jsDoc: jsDoc
                    });
                }

                if (isArray) {
                    schemaStruct = {
                        type: 'array',
                        items: (
                            isComplex? { "$ref" : "#/definitions/" + typeName }
                                : { "type" : typeName }
                        )
                    };

                } else {
                    schemaStruct = (
                        isComplex? { "$ref" : "#/definitions/" + typeName }
                            : { "type" : typeName }
                    );
                }
            }

            map[statusCode] = {
                description: description,
                schema: schemaStruct
            };

        }

        return map;
    }


    /**
     * Parse a parameter description. It extracts param types and type hints. If possible
     * the type hint is resolved from the same jsdoc.
     *
     * @param jsdoc {object} the jsdoc blob to analyse
     * @param param {object} a parameter tag
     * @returns {*}
     * @private
     */
    _parseDescription(jsdoc, param) {

        if (!param.description) {
            return null;
        }

        let foundParamType = null;
        let isRequired = false;

        // iterate over all parameter types
        for (const type of ParameterTypes) {

            let typeIdx = param.description.indexOf(type);

            if (typeIdx !== -1) {
                foundParamType = type.substring(1, type.length - 1);

                // required parameters have an asterisk before their type definition
                isRequired = (typeIdx !== 0 && param.description.charAt(typeIdx - 1) === '*');
            }

        }

        // nothing found? skip parameter.
        if (!foundParamType) {
            return null;
        }

        // description = raw description - param type description
        const description = (
            param.description.replace(
                (isRequired? "*" : "") + foundParamType,
                ""
            ).trim()
        );

        // get the typehint from the description.
        let array = false;
        let typeName = 'string';

        // found {word} style at start of description? extract it.
        if (param.type && param.type.names.length > 0) {
            typeName = param.type.names[0];

            // does the hint start with Array.< ? that means it's an array.
            if (typeName.startsWith("Array.<")) {
                array = true;
                typeName = typeName.substring("Array.<".length, typeName.length - 1);
            }

        }

        // return all we found.
        return {
            description: description.replace(/\n/g, " "),
            required: isRequired,
            array: array,
            complex: isComplexType(typeName),
            typeName: typeName,
            paramType: foundParamType,
        };
    }

    /**
     * Parse the set of parameters available on the jsDoc block and interpret them appropriately
     *
     * @param jsDoc {object} A parsed javascript doc block
     * @param params {object[]} an array of parameters
     * @param models {ModelDefinition[]} a list of model names
     * @private
     */
    _parameterMap(jsDoc, params, models) {

        return _.flatten(

            params.map((param) => {

                const paramInfo = this._parseDescription(jsDoc, param);

                if (!paramInfo) {
                    return [];
                }


                let schemaStruct;
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
    }


    /**
     * Generate the complex type definitions based on the jsdocs and model names
     * that have been added to the models array.
     *
     * @param models {ModelDefinition[]} an array with {name:, jsdoc:} structure
     * @param commonJsDoc {object[]} a set of common js doc blobs
     * @returns {object} with a complex type definition
     * @private
     */
    _generateDefinitions(models, commonJsDoc) {
        let map = {};

        const typedefInterpreter = this.newTypedefInterpreterInstance();

        // make sure to process them once
        const uniqModels = _.uniqBy(models, (m) => m.name);

        for (const model of uniqModels) {

            // convert to a set of definitions.
            const definitions = typedefInterpreter.jsdocToSwagger(model, commonJsDoc);

            for (const def of _.flatten([definitions])) {

                if (!def) {
                    continue;
                }

                map[def.title] = def;
            }
        }

        return map;
    }


    /**
     * @returns {TypedefInterpreter} a new instance of a typedef interpreter
     */
    newTypedefInterpreterInstance() {
        return new TypedefInterpreter();
    }


}
