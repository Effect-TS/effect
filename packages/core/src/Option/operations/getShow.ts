// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Show } from "../../Show"

export function getShow<A>(S: Show<A>): Show<O.Option<A>> {
  return {
    show: (ma) => (O.isNone(ma) ? "none" : `some(${S.show(ma.value)})`)
  }
}
