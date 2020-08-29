import type { Ordering } from "../Ordering"
import type { Bounded } from "./definition"

/**
 * Creates Bounded[A] from equals & compare functions
 */
export function makeBounded<A>(
  equals: (y: A) => (x: A) => boolean,
  compare: (y: A) => (x: A) => Ordering,
  top: A,
  bottom: A
): Bounded<A> {
  return {
    compare,
    equals,
    bottom,
    top
  }
}
