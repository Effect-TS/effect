// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as HS from "../../../../Has"
import type * as C from "../core"
import * as AccessEffect from "./accessEffect"

export function accessServiceEffect<A extends HS.AnyService>(
  s: HS.Tag<A>
): <R, E, B>(f: (a: A) => T.Effect<R, E, B>) => C.Stream<HS.Has<A> & R, E, B> {
  return (f) => AccessEffect.accessEffect((r: HS.Has<A>) => f(r[s.key]))
}
