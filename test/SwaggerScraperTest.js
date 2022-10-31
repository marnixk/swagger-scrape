import fs from 'fs';
import {SwaggerScraper, LambdaRouteProvider} from "../index.js";


const Endpoints = {
    post: {
        '/test/:customerId': () => { /* @fileHint: test/actions/TestActions.js::test; */ },
    },

    get: {
        // shouldn't crash when no file hint present
        '/test2': () => {},

        // shouldn't crash when can't find the file hint
        '/test3': () => { /* @fileHint: test/actions/TestActions.js::test3; */ },

        // shouldn't crash when invalid file hint
        '/test4': () => { /* @fileHint: test/actions/TestActions.js::test2 */ }

    }
};


describe("Swagger Scraper", () => {

    it("Should work end-to-end", () => {

        const lambdaRouteProvider = new LambdaRouteProvider(Endpoints);
        const scraper = new SwaggerScraper(lambdaRouteProvider);

        const appInfo = {
            version: "1.0.1",
            title: "Swagger Scraper Test",
            description: "An end to end test for the module",
            common: [
                "./test/CommonTestModels.js"
            ]
        };

        const swaggerJson = scraper.toSwaggerJson(appInfo, "localhost");
        const output = JSON.stringify(swaggerJson, null, 4);

        fs.writeFileSync('./swagger-test.json', output);

    });

});
