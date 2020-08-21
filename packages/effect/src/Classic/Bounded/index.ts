import type { Ord } from "../Ord"
import type { Ordering } from "../Ordering"

export { BoundedURI } from "../../Modules"

export interface Bounded<A> extends Ord<A> {
  readonly top: A
  readonly bottom: A
}

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
