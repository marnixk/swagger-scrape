/*
     _____                     _       __   ___       _                           _
    |_   _|   _ _ __   ___  __| | ___ / _| |_ _|_ __ | |_ ___ _ __ _ __  _ __ ___| |_ ___ _ __
      | || | | | '_ \ / _ \/ _` |/ _ \ |_   | || '_ \| __/ _ \ '__| '_ \| '__/ _ \ __/ _ \ '__|
      | || |_| | |_) |  __/ (_| |  __/  _|  | || | | | ||  __/ |  | |_) | | |  __/ ||  __/ |
      |_| \__, | .__/ \___|\__,_|\___|_|   |___|_| |_|\__\___|_|  | .__/|_|  \___|\__\___|_|
          |___/|_|                                                |_|


    Purpose:

        To analyse, interpreter and transform a @typedef jsdoc block into
        a swagger spec compatible json/pojo representation.

 */


import _ from "lodash";
import {getTagsWithTitle, isComplexType} from "./TypeHelper.js";

/**
 * Code that helps interpret jsdoc into swagger spec models.
 */
export class TypedefInterpreter {

    /**
     * Do transformation
     *
     * @param model The model to transform
     * @param commonJsDoc A set of common jsdoc tags
     * @returns {null|*[]}
     */
    jsdocToSwagger(model, commonJsDoc = []) {

        let results = [];

        const allJsDoc = _.flatten([model.jsDoc, commonJsDoc]);
        const mainDef = _.filter(allJsDoc, (el) => el && el.kind === 'typedef' && el.name === model.name);

        if (mainDef.length === 0) {
            console.error("[SWAGGER]: Cannot find the definition for:", model.name);
            return null;
        }

        const firstMainDef = mainDef[0];

        let props = {};
        let reqProps = [];

        // if it has properties add them.
        // TODO: can we extract this body into its own method
        for (const varEl of firstMainDef?.properties || []) {

            let array = false;
            let typeName = varEl.type ? varEl.type.names[0] : 'string'

            if (typeName.startsWith("[ 'Array' ].<")) {
                array = true;
                typeName = typeName.substring("[ 'Array' ].<".length, typeName.length - 1);
            }
            else if (typeName.startsWith("Array.<")) {
                array = true;
                typeName = typeName.substring("Array.<".length, typeName.length - 1);
            }

            let complex = isComplexType(typeName);
            let typeSchema =
                complex
                    ? {"$ref": "#/definitions/" + typeName, description: varEl.description}
                    : {"type": typeName, description: varEl.description}
            ;

            if (array) {
                props[varEl.name] = {
                    type: 'array',
                    items: typeSchema
                }
            } else {
                props[varEl.name] = typeSchema;
            }

            // recurse find the complex sub item type
            if (complex) {
                let lookingForModel = {
                    name: typeName,
                    jsDoc: model.jsDoc
                };

                // TODO: test whether submodels referring to itself causes infinite loopage
                let subModels = this.jsdocToSwagger(lookingForModel, allJsDoc) || [];

                // add to results if it doesn't exist yet.
                const knownModels = results.map(m => m.title);
                for (const addMe of subModels) {
                    if (knownModels.includes(addMe.title)) {
                        continue;
                    }

                    results.push(addMe);
                }
            }

            // is it a required field?
            let reqTags = getTagsWithTitle(varEl, "required");
            if (reqTags?.length > 0) {
                reqProps.push(varEl.name);
            }
        }

        const obj = {
            type: "object",
            title: model.name,
            properties: props,
            required: reqProps
        };

        if (firstMainDef.type && !_.isEmpty(firstMainDef.type.names)) {
            const parentTypeName = firstMainDef.type.names[0];
            const lookingForModel = { name: parentTypeName, jsDoc: model.jsDoc };
            const parentModel = this.jsdocToSwagger(lookingForModel, allJsDoc);

            if (_.isEmpty(parentModel)) {
                throw new Error("Could not find parent type " + parentTypeName + " for " + model.name);
            }
            parentModel.forEach(model => results.push(model));

            obj.allOf = [{
                "type" : parentTypeName,
                "$ref" : "#/definitions/" + parentTypeName
            }];
        }

        results.push(obj);

        return results;
    }

}
