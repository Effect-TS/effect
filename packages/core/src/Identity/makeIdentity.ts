// ets_tracing: off

import { instance } from "../Prelude/index.js"
import type { Identity } from "./definition.js"

/**
 * Creates a new `Identity`
 */
export function makeIdentity<A>(identity: A, op: (x: A, y: A) => A): Identity<A> {
  return instance({
    combine: op,
    identity
  })
}

export * from "./definition.js"
