// ets_tracing: off

import { instance } from "../Prelude/index.js"
import type { Closure } from "./definition.js"

export function makeClosure<A>(f: (x: A, y: A) => A): Closure<A> {
  return instance({
    combine: f
  })
}
