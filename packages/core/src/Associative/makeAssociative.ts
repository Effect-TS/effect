// ets_tracing: off

import type { Associative } from "./definition.js"

export function makeAssociative<A>(f: (x: A, y: A) => A): Associative<A> {
  return {
    _Associative: "Associative",
    _Closure: "Closure",
    combine: f
  }
}

export * from "./definition.js"
