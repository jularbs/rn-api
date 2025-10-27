// Thin wrapper around formidable's firstValues to make mocking reliable in tests
// Using require to match formidable's CommonJS export shape
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { firstValues } = require("formidable/src/helpers/firstValues.js");

export { firstValues };
