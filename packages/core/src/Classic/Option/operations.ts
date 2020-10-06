import * as O from "@effect-ts/system/Option"

import type { Equal } from "../Equal"

export function getEqual<A>(E: Equal<A>): Equal<O.Option<A>> {
  return {
    equals: (y) => (x) =>
      x === y ||
      (O.isNone(x) ? O.isNone(y) : O.isNone(y) ? false : E.equals(y.value)(x.value))
  }
}
