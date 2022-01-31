// ets_tracing: off

import "../Operator/index.js"

/**
 * `Hash[A]` provides a way to hash a value
 */
export interface Hash<A> {
  readonly hash: (x: A) => number
}

export function makeHash<A>(hash: (x: A) => number): Hash<A> {
  return { hash }
}
