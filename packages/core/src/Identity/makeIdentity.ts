// ets_tracing: off

import type { Identity } from "./definition.js"

/**
 * Creates a new `Identity`
 */
export function makeIdentity<A>(identity: A, op: (x: A, y: A) => A): Identity<A> {
  return {
    _Closure: "Closure",
    _Associative: "Associative",
    combine: op,
    identity
  }
}

export * from "./definition.js"
