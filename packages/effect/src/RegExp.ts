/**
 * This module provides utility functions for working with RegExp in TypeScript.
 *
 * @since 2.0.0
 */

/**
 * Escapes special characters in a regular expression pattern.
 *
 * @example
 * import { RegExp } from "effect"
 *
 * assert.deepStrictEqual(RegExp.escape("a*b"), "a\\*b")
 *
 * @since 2.0.0
 */
export const escape = (string: string): string => string.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")
