// ets_tracing: off

import { instance } from "../Prelude/index.js"
import type { Associative } from "./definition.js"

export function makeAssociative<A>(f: (x: A, y: A) => A): Associative<A> {
  return instance({
    combine: f
  })
}

export * from "./definition.js"
