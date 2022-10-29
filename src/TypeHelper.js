
/**
 * Known primitive types
 * @type {string[]}
 */
const PrimitiveTypes = ['number', 'boolean', 'integer', 'string', 'object', 'file'];

/**
 * @returns {boolean} true if the type name we found is not a known primitive type
 */
export function isComplexType(typeName) {
    const cleanTypeName = typeName.toLowerCase();
    return !PrimitiveTypes.includes(cleanTypeName);
}
