// ets_tracing: off

import * as O from "../../Option"
import type { Effect } from "../definition"
import { IOverrideForkScope } from "../definition"
import { forkScopeWith } from "./forkScopeWith"

export type Grafter = <R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
) => Effect<R, E, A>

export function transplant<R, E, A>(
  f: (grafter: Grafter) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return forkScopeWith(
    (scope) => f((eff, __trace) => new IOverrideForkScope(eff, O.some(scope), __trace)),
    __trace
  )
}
