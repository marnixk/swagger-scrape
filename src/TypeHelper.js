
/**
 * Known primitive types
 * @type {string[]}
 */
const PrimitiveTypes = ['number', 'boolean', 'integer', 'string', 'object', 'file'];

/**
 * @returns {boolean} true if the type name we found is not a known primitive type
 */
export function isComplexType(typeName) {
    const cleanTypeName = typeName.toLowerCase().trim();
    return !PrimitiveTypes.includes(cleanTypeName);
}

/**
 * Get tags from under a jsdoc node with a certain title
 *
 * @param node  the jsdoc node to query
 * @param title the tag type we're looking for
 * @returns {object[]} an array of tag information
 * @private
 */
export function getTagsWithTitle(node, title) {
    if (!node) {
        return null;
    }

    // filter out all tags that have a title `title`.
    return node?.tags?.filter((tags) => {
        return tags.title === title;
    }) ?? null;
}
