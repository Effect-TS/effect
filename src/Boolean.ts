/**
 * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
 * It includes functions for basic boolean operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
import * as equivalence from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { dual } from "./Function.js"
import * as order from "./Order.js"
import * as predicate from "./Predicate.js"

/**
 * Tests if a value is a `boolean`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isBoolean } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(isBoolean(true), true)
 * assert.deepStrictEqual(isBoolean("true"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isBoolean: (input: unknown) => input is boolean = predicate.isBoolean

/**
 * This function returns the result of either of the given functions depending on the value of the boolean parameter.
 * It is useful when you have to run one of two functions depending on the boolean value.
 *
 * @param value - the boolean value that decides which function will be executed.
 * @param onFalse - a lazy evaluation function that will be executed when the `value` is `false`.
 * @param onTrue - a lazy evaluation function that will be executed when the `value` is `true`.
 *
 * @example
 * import * as B from "effect/Boolean"
 *
 * assert.deepStrictEqual(B.match(true, { onFalse: () => "It's false!", onTrue: () => "It's true!" }), "It's true!")
 *
 * @category pattern matching
 * @since 2.0.0
 */
export const match: {
  <A, B = A>(options: {
    readonly onFalse: LazyArg<A>
    readonly onTrue: LazyArg<B>
  }): (value: boolean) => A | B
  <A, B>(value: boolean, options: {
    readonly onFalse: LazyArg<A>
    readonly onTrue: LazyArg<B>
  }): A | B
} = dual(2, <A, B>(value: boolean, options: {
  readonly onFalse: LazyArg<A>
  readonly onTrue: LazyArg<B>
}): A | B => value ? options.onTrue() : options.onFalse())

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<boolean> = equivalence.boolean

/**
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<boolean> = order.boolean

/**
 * Negates the given boolean: `!self`
 *
 * @example
 * import { not } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(not(true), false)
 * assert.deepStrictEqual(not(false), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const not = (self: boolean): boolean => !self

/**
 * Combines two boolean using AND: `self && that`.
 *
 * @example
 * import { and } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(and(true, true), true)
 * assert.deepStrictEqual(and(true, false), false)
 * assert.deepStrictEqual(and(false, true), false)
 * assert.deepStrictEqual(and(false, false), false)
 *
 * @category combinators
 * @since 2.0.0
 */
export const and: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self: boolean, that: boolean): boolean => self && that)

/**
 * Combines two boolean using NAND: `!(self && that)`.
 *
 * @example
 * import { nand } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(nand(true, true), false)
 * assert.deepStrictEqual(nand(true, false), true)
 * assert.deepStrictEqual(nand(false, true), true)
 * assert.deepStrictEqual(nand(false, false), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const nand: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self: boolean, that: boolean): boolean => !(self && that))

/**
 * Combines two boolean using OR: `self || that`.
 *
 * @example
 * import { or } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(or(true, true), true)
 * assert.deepStrictEqual(or(true, false), true)
 * assert.deepStrictEqual(or(false, true), true)
 * assert.deepStrictEqual(or(false, false), false)
 *
 * @category combinators
 * @since 2.0.0
 */
export const or: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self: boolean, that: boolean): boolean => self || that)

/**
 * Combines two booleans using NOR: `!(self || that)`.
 *
 * @example
 * import { nor } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(nor(true, true), false)
 * assert.deepStrictEqual(nor(true, false), false)
 * assert.deepStrictEqual(nor(false, true), false)
 * assert.deepStrictEqual(nor(false, false), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const nor: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self: boolean, that: boolean): boolean => !(self || that))

/**
 * Combines two booleans using XOR: `(!self && that) || (self && !that)`.
 *
 * @example
 * import { xor } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(xor(true, true), false)
 * assert.deepStrictEqual(xor(true, false), true)
 * assert.deepStrictEqual(xor(false, true), true)
 * assert.deepStrictEqual(xor(false, false), false)
 *
 * @category combinators
 * @since 2.0.0
 */
export const xor: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self: boolean, that: boolean): boolean => (!self && that) || (self && !that))

/**
 * Combines two booleans using EQV (aka XNOR): `!xor(self, that)`.
 *
 * @example
 * import { eqv } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(eqv(true, true), true)
 * assert.deepStrictEqual(eqv(true, false), false)
 * assert.deepStrictEqual(eqv(false, true), false)
 * assert.deepStrictEqual(eqv(false, false), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const eqv: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self: boolean, that: boolean): boolean => !xor(self, that))

/**
 * Combines two booleans using an implication: `(!self || that)`.
 *
 * @example
 * import { implies } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(implies(true, true), true)
 * assert.deepStrictEqual(implies(true, false), false)
 * assert.deepStrictEqual(implies(false, true), true)
 * assert.deepStrictEqual(implies(false, false), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const implies: {
  (that: boolean): (self: boolean) => boolean
  (self: boolean, that: boolean): boolean
} = dual(2, (self, that) => self ? that : true)

/**
 * This utility function is used to check if all the elements in a collection of boolean values are `true`.
 *
 * @param collection - An iterable collection of booleans.
 *
 * @example
 * import { every } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(every([true, true, true]), true)
 * assert.deepStrictEqual(every([true, false, true]), false)
 *
 * @since 2.0.0
 */
export const every = (collection: Iterable<boolean>): boolean => {
  for (const b of collection) {
    if (!b) {
      return false
    }
  }
  return true
}

/**
 * This utility function is used to check if at least one of the elements in a collection of boolean values is `true`.
 *
 * @param collection - An iterable collection of booleans.
 *
 * @example
 * import { some } from 'effect/Boolean'
 *
 * assert.deepStrictEqual(some([true, false, true]), true)
 * assert.deepStrictEqual(some([false, false, false]), false)
 *
 * @since 2.0.0
 */
export const some = (collection: Iterable<boolean>): boolean => {
  for (const b of collection) {
    if (b) {
      return true
    }
  }
  return false
}
