/**
 * @since 2.0.0
 */
import type { Equivalence } from "./Equivalence.js"
import * as Hash from "./Hash.js"
import { hasProperty } from "./Predicate.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const symbol: unique symbol = Symbol.for("effect/Equal")

/**
 * @since 2.0.0
 * @category models
 */
export interface Equal extends Hash.Hash {
  [symbol](that: Equal): boolean
}

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
export const equivalence: <A>() => Equivalence<A> = () => equals
