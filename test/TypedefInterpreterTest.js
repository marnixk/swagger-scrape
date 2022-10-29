import jsdoc from "jsdoc-api";
import {TypedefInterpreter} from "../src/TypedefInterpreter.js";
import asserts from "assert";

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

describe("The typedef interpreter", () => {

   it("should just work for normal types", () => {

       const modelJsdoc = jsdoc.explainSync({
           files: "./test/TypedefInterpreterTest.js"
       });

       const model = {
           name: "TestDefinition",
           jsDoc: modelJsdoc
       };

       const interp = new TypedefInterpreter();
       const output = interp.jsdocToSwagger(model);

       asserts.ok(!!output);

   });


});
