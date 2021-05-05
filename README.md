# Swagger Scraper

The purpose of this module is to generate Swagger documentation from the JSDoc tags you have annotated your endpoint handlers with. It is able to interpret complex types as well.

Feedback is welcome. 

## How to initialise

You'll need an ExpressJS application. Find the point at which you have initialised the endpoints.

Required packages:

* express-list-endpoints: ^4.0.0
* swagger-ui-express: ^4.0.2

The following code will initialise the swagger documentation endpoints:

	let appInfo = {
	    version: "1.0.0",
	    title: "Project Title",
	    description: "Project Description",
	    common: [
	    	/* files that contains jsdoc common across the endpoints */
	    ]
	};

	
	// assumed: app = the express js application instance

	// include this dependency
	const swaggerScrape = require('swagger-scrape');

	// grab all endpoint information of endpoints registered with express js
	let swaggerEndpoints = swaggerScrape.scrapeEndpoints("./", app);

	// conver the endpoint information to a swagger document
	let swaggerDoc = swaggerScrape.toSwaggerJson(appInfo, "hostname", "/application-context", swaggerEndpoints);

	// expose the swagger ui based on the swagger doc at '/api-docs'.
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));


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
	module.exports = function(req, resp) {

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

### Complex Types

When you specify a type name that is not a primitive, the swagger scraper uses the same file to try and find a constant of the name specified as the type name that was annotated with a `@model` jsdoc tag. 

Fields inside the constant definition can be annotated with:

* `@type {name}`; the type of this parameter
* `@required`; if the parameter is required.


Find a nested model definition below:

	/**
	 * @model
	 */
	const AddressModel = {

	    /**
	     * @type {string}
	     */
	    street : '',

	    /**
	     * @type {number}
	     */
	    zipcode: 1010

	}

	/**
	 * @model
	 *
	 * This is the empty response model
	 */
	const ExpectedModel = {

	    /**
	     * @type {number}
	     * @required
	     */
	    age : 0,

	    /**
	     * @type {string}
	     * @required
	     */
	    name: null,

	    /**
	     * @type {string[]}
	     */
	    lastNames : null,

	    /**
	     * @type {AddressModel}
	     */
	    address: null


	};


Notice how you can specify arrays by appending the typename with `[]`.

Also note how the `AddressModel` is another complex type. The scraper recursively resolves them in the same document.

You can also use the `@typedef` notation described here: 

* https://jsdoc.app/tags-typedef.html


## Hinting at where the documentation lives

Oftentimes when initialising endpoints into ExpressJS, you simply refer to a variable that is a closure or function with the signature:

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

The filename parameter is relative to the basepath passed into the scrapeEndpoints function (`./` in our example). 
There is an optional parameter called `<id-name>`. If you have a file that has more than one handler inside it, you can specify the `@id <id-name>` it will go looking for. Otherwise it will find the first `@swagger` annotated jsdoc block.

An example of this would be:


	module.exports = {

		/**
		 * @id showProfile
		 * @swagger
		 * This bit of documentation is specific to the actionFunction method
		 */
		function actionFunction(req, resp) {
			
		}

		/**
		 * @id anotherAction
		 * @swagger
		 * This bit of documentation is specific to the other method
		 */
		function actionFunction2(req, resp) {
			
		}


	}


