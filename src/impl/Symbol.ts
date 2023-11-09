/**
 * @since 2.0.0
 */

import * as equivalence from "./Equivalence.js"
import * as predicate from "./Predicate.js"

/**
 * Tests if a value is a `symbol`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isSymbol } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isSymbol(Symbol.for("a")), true)
 * assert.deepStrictEqual(isSymbol("a"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isSymbol: (u: unknown) => u is symbol = predicate.isSymbol

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<symbol> = equivalence.symbol
