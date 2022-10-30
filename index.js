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

export {SwaggerScraper} from './src/SwaggerScraper.js';
export {LambdaRouteProvider} from './src/LambdaRouteProvider.js';
export {ExpressRouteProvider} from './src/ExpressRouteProvider.js';
