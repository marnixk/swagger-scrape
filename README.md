# Swagger Scraper

The purpose of this module is to generate Swagger documentation from the JSDoc tags you have annotated your endpoint handlers with. It is able to interpret complex types as well. 

Your code will look like this:


	/**
	 * @swagger
	 *
	 * Just put the complete description here. It is the description that is shown when you click into a 
	 * swagger endpoint in the interface.
	 *
	 * @summary This is the short text shown right next to the endpoint name
	 * @tag TestEndpoint
	 *
	 * @param req       the request object
	 * @param resp      the reponse object
	 *
	 * @param pathParameter {number} (path) part of the url
	 * @param queryParam	{string} (query) part of the requestquery (?queryParam=blaat)
	 * @param headerParam	{string} (header) expected header value from request headers
	 * @param bodyModel 	{ExpectedModel} (body) This is a complex type parameter that has a proper type hint.
	 *
	 * @response 403    You cannot go here.
	 * @response 200    {ExpectedModel} all is well, information is returned in complex type.
	 */
	export function yourEndpointHandlerFunction(req, resp) {

		// your code here.

	};


Feedback is welcome. 

**NOTE:** If you're looking for the CommonJS implementation, use the latest from the `1.x` version range. 



## How to initialise

The following code will initialise the swagger documentation endpoints, convert them to a Swagger JSON Spec and write them to a file called `swagger.json`.
	
	import fs from 'fs';
	import {SwaggerScraper, LambdaRouteProvider} from "swagger-scrape";

	let appInfo = {
	    version: "1.0.0",
	    title: "Project Title",
	    description: "Project Description",
	    common: [
	    	/* files that contains jsdoc common across the endpoints */
	    	"./src/CommonModels.js"
	    ]
	};

    const lambdaRouteProvider = new LambdaRouteProvider(Endpoints);
    const scraper = new SwaggerScraper(lambdaRouteProvider);

    const swaggerJson = scraper.toSwaggerJson(appInfo, "localhost");
    const output = JSON.stringify(swaggerJson, null, 4);

    fs.writeFileSync('./swagger.json', output);

After creating the `swagger.json` file you could turn it into a static HTML by calling `redoc-cli`.

	$ redoc-cli bundle swagger.json -o your-file.html

Now you have generated a complete Swagger HTML file. 

If you do not have `redoc` installed, please install it by running:

	$ npm install -g redoc

Read on if you'd like to get more detailed information about how to properly use this module. If you're more code-inclined have a look at the code in `test/SwaggerScraperTest.js`.

### Finding endpoints through RouteProviders

A route provider is a class that has a function called `scrapeRoutes` which returns an array of `Route` objects. They have the following definition:

	/**
	 * @typedef Route
	 *
	 * @property {string|string[]} path - the path to the route
	 * @property {string} method - the method used for the route
	 * @property {function} handle - the function that is executed when the endpoint is invoked.
	 */

Out-of-the-box there are two existing RouteProvider implementations you can use:

* `ExpressRouteProvider`: will find all registered endpoints for a ExpressJS `app` instance. To use, initialise it as follows: `new ExpressRouteProvider(app)` and feed it to the `SwaggerScraper`, it will now generate a Swagger Spec for endpoints annotated with swagger jsdocs.

* `LambdaRouteProvider`: will find all registered endpoints from a map with the following structure -- assumed to be available in the `Endpoints` variable in the example above:


	const Endpoints = {
	    post: {
	        '/test/:customerId': () => { /* @fileHint: test/actions/TestActions.js::test; */ },
	    },

	    get: {
	        '/test2': () => {},
	        '/test3': () => { /* @fileHint: test/actions/TestActions.js::test3; */ },
	        '/test4': () => { /* @fileHint: test/actions/TestActions.js::test2 */ }
	    }
	};


### How to initialise an ExpressJS application


You'll need an ExpressJS application. Find the point at which you have initialised the endpoints.

Required packages:

* swagger-ui-express: ^4.0.2

In addition to the example above, you can feed the Swagger JSON back into your ExpressJS app instance by exposing it as an endpoint as follows:

	// expose the swagger ui based on the swagger doc at '/api-docs'.
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJson));

This is assuming `swaggerUi` is an import for `swagger-ui-express`

## Annotating your code

What follows is a completely annotated function that produces a proper swagger document:


	/**
	 * @swagger
	 *
	 * Just put the complete description here. It is the description that is shown when you click into a 
	 * swagger endpoint in the interface.
	 *
	 * @summary This is the short text shown right next to the endpoint name
	 * @tag TestEndpoint
	 *
	 * @param req       the request object
	 * @param resp      the reponse object
	 *
	 * @param pathParameter {number} (path) part of the url
	 * @param queryParam	{string} (query) part of the requestquery (?queryParam=blaat)
	 * @param headerParam	{string} (header) expected header value from request headers
	 * @param bodyModel 	{ExpectedModel} (body) This is a complex type parameter that has a proper type hint.
	 *
	 * @response 403    You cannot go here.
	 * @response 200    {ExpectedModel} all is well, information is returned in complex type.
	 */
	export function yourEndpointHandlerFunction(req, resp) {

		// your code here.

	};



### Basics

To indicate that this jsdoc pertains to swagger documentation, add the `@swagger` tag.

You can organise your swagger endpoints into different categories by specifying one or more `@tag`.

Specify a short summary by adding the `@summary` tag. 

### Parameters

Parameters have the following notation:

	@param <name> (query|path|header|body) {type} description

You can add an asterisk in front of the parameter type to indicate that it is required, like: 
	
	@param myParam *(query) {string} a required parameter

If you do not specify a type, `string` is assumed.

The following primitive types are supported:

* number
* boolean
* integer
* string
* object
* file 

Anything else is considered to be a complex type and has additional logic to retrieve information for.

### Response

Specifying a swagger response can be done by using the following notation:

	@response <statusCode> {type} description

If no type is specified `string` is assumed. You can specify a complex type here as well.

### Complex Types: `@typedef`

When you specify a type name that is not a primitive, the swagger scraper uses either:

* the same file; or 
* files specified in the `appInfo.common` array. 

.. to try and find a @typedef with the name referenced by the jsdoc tag.

To better understand how `@typedef` works, read this:

* https://jsdoc.app/tags-typedef.html

Some simple examples can be found below:


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
	 * @property {number} statusCode - status code
	 */

	/**
	 * @typedef {ResponseModel} DetailedResponseModel
	 *
	 * @property {string} additionalField - the additional information
	 */



## Hinting at where the documentation lives

A lot of the time, when initialising endpoints, you simply refer to a variable that is a closure or function with a signature similar to:

	function(req, resp) {}

Given the dynamic nature of Javascript, we cannot easily discover what file the function handler lives in (something we need to know if we would like JSdoc to parse a file). So, for that reason the `@fileHint` mechanism was introduced. 

Inside your function, hint at where the handler actually lives:

	app.get('/profile', (req, resp) => {
		/* @fileHint: src/controllers/MyProfile.js::showProfile; */
		return MyProfile.actionFunction(req, resp);
	});

or:

	app.get('/profile', (req, resp) => {
		/* @fileHint: src/controllers/MyProfile.js; */
		return MyProfile.actionFunction(req, resp);
	});


The notation for filehint is as follows:

	/* @fileHint: <filename>(::<id-name>); */

The filename parameter is relative to the basepath passed into the SwaggerScraper class' basePath (`./` by default). 

There is an optional parameter called `<id-name>`. If you have a file that has more than one handler inside it, you can specify the `@id <id-name>` it will go looking for. Otherwise it will find the first `@swagger` annotated jsdoc block.

An example of this would be:


	/**
	 * @id showProfile
	 * @swagger
	 *
	 * This bit of documentation is specific to the actionFunction method
	 */
	export function actionFunction(req, resp) {
		
	}

	/**
	 * @id anotherAction
	 * @swagger
	 *
	 * This bit of documentation is specific to the other method
	 */
	export function actionFunction2(req, resp) {
		
	}




