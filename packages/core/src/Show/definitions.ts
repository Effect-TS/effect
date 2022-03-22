// ets_tracing: off

import type { HKT } from "../PreludeV2/index.js"

/**
 * `Show[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Show<A> {
  readonly show: (x: A) => string
}

export interface ShowF extends HKT {
  readonly type: Show<this["A"]>
}

/**
 * Creates Show[A] from equals & compare functions
 */
export function makeShow<A>(show: (x: A) => string): Show<A> {
  return {
    show
  }
}
