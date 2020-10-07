import * as O from "@effect-ts/system/Option"

import type { Equal } from "../Equal"
import type { Show } from "../Show"

export function getEqual<A>(E: Equal<A>): Equal<O.Option<A>> {
  return {
    equals: (y) => (x) =>
      x === y ||
      (O.isNone(x) ? O.isNone(y) : O.isNone(y) ? false : E.equals(y.value)(x.value))
  }
}

export function getShow<A>(S: Show<A>): Show<O.Option<A>> {
  return {
    show: (ma) => (O.isNone(ma) ? "none" : `some(${S.show(ma.value)})`)
  }
}
