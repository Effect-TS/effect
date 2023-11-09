/**
 * @since 2.0.0
 */
import type { Equivalence } from "./exports/Equivalence.js"
import { Hash } from "./exports/Hash.js"
import { hasProperty } from "./exports/Predicate.js"

import type { Equal } from "./exports/Equal.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const symbol: unique symbol = Symbol.for("effect/Equal")

/**
 * @since 2.0.0
 * @category equality
 */
export function equals<B>(that: B): <A>(self: A) => boolean
export function equals<A, B>(self: A, that: B): boolean
export function equals(): any {
  if (arguments.length === 1) {
    return (self: unknown) => compareBoth(self, arguments[0])
  }
  return compareBoth(arguments[0], arguments[1])
}

function compareBoth(self: unknown, that: unknown) {
  if (self === that) {
    return true
  }
  const selfType = typeof self
  if (selfType !== typeof that) {
    return false
  }
  if (
    (selfType === "object" || selfType === "function") &&
    self !== null &&
    that !== null
  ) {
    if (isEqual(self) && isEqual(that)) {
      return Hash.hash(self) === Hash.hash(that) && self[symbol](that)
    }
  }
  return false
}

/**
 * @since 2.0.0
 * @category guards
 */
export const isEqual = (u: unknown): u is Equal => hasProperty(u, symbol)

/**
 * @since 2.0.0
 * @category instances
 */
export const equivalence: <A>() => Equivalence<A> = () => (self, that) => equals(self, that)
