/**
 * Browser guard for @effect-native/libcrsql.
 * This package is Node.js-only and provides paths to native binaries.
 * @since 0.16.300
 */
// Importing in browser environments is not supported.

const msg = "@effect-native/libcrsql is Node.js-only (native binaries). Browser is not supported."
throw new Error(msg)
