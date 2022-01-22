// ets_tracing: off

import type { Inverse } from "./index.js"

export function makeInverse<A>(
  identity: A,
  combine: (x: A, y: A) => A,
  inverse: (x: A, y: A) => A
): Inverse<A> {
  return {
    _Closure: "Closure",
    _Associative: "Associative",
    combine,
    identity,
    inverse
  }
}
