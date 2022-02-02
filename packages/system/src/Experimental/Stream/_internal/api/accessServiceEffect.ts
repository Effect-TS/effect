// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as HS from "../../../../Has/index.js"
import type * as C from "../core.js"
import * as AccessEffect from "./accessEffect.js"

export function accessServiceEffect<A>(
  s: HS.Tag<A>
): <R, E, B>(f: (a: A) => T.Effect<R, E, B>) => C.Stream<HS.Has<A> & R, E, B> {
  return (f) => AccessEffect.accessEffect((r: HS.Has<A>) => f(r[s.key]))
}
