// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as HS from "../../../../Has"
import type * as C from "../core"
import * as AccessEffect from "./accessEffect"

export function accessServiceEffect_<R, E, A, B>(
  s: HS.Tag<A>,
  f: (a: A) => T.Effect<R, E, B>
): C.Stream<HS.Has<A> & R, E, B> {
  return AccessEffect.accessEffect((r: HS.Has<A>) => f(r[s.key as any]))
}

export function accessServiceEffect<R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) {
  return (s: HS.Tag<A>) => accessServiceEffect_(s, f)
}
