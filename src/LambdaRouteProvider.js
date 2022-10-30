/*
     _                    _         _         ____             _         ____                 _     _
    | |    __ _ _ __ ___ | |__   __| | __ _  |  _ \ ___  _   _| |_ ___  |  _ \ _ __ _____   _(_) __| | ___ _ __
    | |   / _` | '_ ` _ \| '_ \ / _` |/ _` | | |_) / _ \| | | | __/ _ \ | |_) | '__/ _ \ \ / / |/ _` |/ _ \ '__|
    | |__| (_| | | | | | | |_) | (_| | (_| | |  _ < (_) | |_| | ||  __/ |  __/| | | (_) \ V /| | (_| |  __/ |
    |_____\__,_|_| |_| |_|_.__/ \__,_|\__,_| |_| \_\___/ \__,_|\__\___| |_|   |_|  \___/ \_/ |_|\__,_|\___|_|


    Purpose:

        The lambda route provider interprets a map of methods pointing at endpoint
        handlers and returns a list of Route objects.

 */

/**
 * @typedef LambdaEndpointsMap
 *
 * @property get - map of GET-endpoints
 * @property post - map of POST-endpoints
 * @property put - map of PUT-endpoints
 * @property delete - map of DELETE-endpoints
 * @property patch - map of DELETE-endpoints
 */


/**
 * This class is able to extract routes describes as per the company-wide lambda package.
 */
export class LambdaRouteProvider {

    /**
     * @type {LambdaEndpointsMap}
     */
    endpointsMap;

    /**
     * Initialise data-members.
     *
     * @param endpointsMap {LambdaEndpointsMap} a map of endpoints
     */
    constructor(endpointsMap) {
        this.endpointsMap = endpointsMap;
    }

    /**
     * Extract lambda routing information.
     *
     * @returns {Route[]} a list of route descriptions
     */
    scrapeRoutes() {

        let routes = [];
        const methods = Object.keys(this.endpointsMap);

        for (const method of methods) {

            const methodEndpoints = Object.keys(this.endpointsMap[method]);

            for (const endpoint of methodEndpoints) {

                routes.push({
                    path: endpoint,
                    method: method.toLowerCase(),
                    handle: this.endpointsMap[method][endpoint]
                });
            }

        }

        return routes;
    }


}
