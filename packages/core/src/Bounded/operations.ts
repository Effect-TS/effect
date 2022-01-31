// ets_tracing: off

import type { Ordering } from "../Ordering/index.js"
import type { Bounded } from "./definition.js"

/**
 * Creates Bounded[A] from equals & compare functions
 */
export function makeBounded<A>(
  compare: (x: A, y: A) => Ordering,
  top: A,
  bottom: A
): Bounded<A> {
  return {
    compare,
    bottom,
    top
  }
}
