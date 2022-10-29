import assert from 'assert';
import {isComplexType} from "../src/TypeHelper.js";

describe("Testing typehelper", () => {

    it('should detect primitive types properly', function () {

        assert.ok(!isComplexType('number'));
        assert.ok(!isComplexType("Number"));
        assert.ok(!isComplexType(" number   "));

    });

})
