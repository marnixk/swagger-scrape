import {LambdaRouteProvider} from "../src/LambdaRouteProvider.js";
import asserts from "assert";

const endpoints = {
    get: {
        '/test': () => {},
        '/test2': () => {}
    },
    GET: {
        '/test5': () => {}
    },
    post: {
        '/test3': () => {}
    },
    unknown: {
        '/test4': () => {}
    }
};

describe("Extracting endpoints from LambdaRouteProvider", () => {


    it('should extract the endpoints regardless of case', () => {

        const provider = new LambdaRouteProvider(endpoints);
        const routes = provider.scrapeRoutes();

        asserts.ok(routes.length === 5);
        asserts.ok(routes.find(el => el.path === '/test5').method === 'get');
    });

})
