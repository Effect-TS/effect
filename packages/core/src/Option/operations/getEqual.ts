// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Equal } from "../../Equal/index.js"

export function getEqual<A>(E: Equal<A>): Equal<O.Option<A>> {
  return {
    equals: (x, y) =>
      x === y ||
      (O.isNone(x) ? O.isNone(y) : O.isNone(y) ? false : E.equals(x.value, y.value))
  }
}
