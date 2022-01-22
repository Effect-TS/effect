// ets_tracing: off

import type { Closure } from "./definition.js"

export function makeClosure<A>(f: (x: A, y: A) => A): Closure<A> {
  return {
    _Closure: "Closure",
    combine: f
  }
}
