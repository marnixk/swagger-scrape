/*
     _____                                ____             _         ____                 _     _
    | ____|_  ___ __  _ __ ___  ___ ___  |  _ \ ___  _   _| |_ ___  |  _ \ _ __ _____   _(_) __| | ___ _ __
    |  _| \ \/ / '_ \| '__/ _ \/ __/ __| | |_) / _ \| | | | __/ _ \ | |_) | '__/ _ \ \ / / |/ _` |/ _ \ '__|
    | |___ >  <| |_) | | |  __/\__ \__ \ |  _ < (_) | |_| | ||  __/ |  __/| | | (_) \ V /| | (_| |  __/ |
    |_____/_/\_\ .__/|_|  \___||___/___/ |_| \_\___/ \__,_|\__\___| |_|   |_|  \___/ \_/ |_|\__,_|\___|_|
               |_|

    Purpose:

        To provide a set of Route[] definitions based on an ExpressJS Application object.

 */

export class ExpressRouteProvider {

    app;

    /**
     * Initialise data-members
     *
     * @param app {object}
     */
    constructor(app) {
        this.app = app;
    }

    /**
     * Is able to extract routes from the routing information in a routeContainer object
     * of express js application instance type.
     *
     * @return {Route[]} a list of route handlers
     */
    scrapeRoutes() {
        let stack = this.app._router.stack;
        let withRoute = stack.filter((s) => { return !!s.route });

        let routeLayers = [];

        for (const layer of withRoute) {

            const {route} = layer;
            const {stack} = route;

            for (const routeLayer of (stack ?? [])) {

                let routeClone = {...routeLayer};
                routeClone.path = route.path;
                routeLayers.push(routeClone);

            }
        }

        return routeLayers;
    }

}
