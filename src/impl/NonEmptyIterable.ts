import type { NonEmptyIterable } from "../NonEmptyIterable.js"

/**
 * @category symbol
 * @since 2.0.0
 */
export declare const nonEmpty: unique symbol

/**
 * @category getters
 * @since 2.0.0
 */
export const unprepend = <A>(self: NonEmptyIterable<A>): [A, Iterator<A>] => {
  const iterator = self[Symbol.iterator]()
  const next = iterator.next()
  if (next.done) {
    throw new Error("BUG: NonEmptyIterator should not be empty")
  }
  return [next.value, iterator]
}
