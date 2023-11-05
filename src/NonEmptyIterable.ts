/**
 * @since 2.0.0
 */

/**
 * @category symbol
 * @since 2.0.0
 */
export declare const nonEmpty: unique symbol

export * as NonEmptyIterable from "./NonEmptyIterable.js"

declare module "./NonEmptyIterable.js" {
  /**
   * @category model
   * @since 2.0.0
   */
  export interface NonEmptyIterable<A> extends Iterable<A> {
    readonly [nonEmpty]: A
  }
}

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
