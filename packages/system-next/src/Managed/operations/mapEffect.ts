// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffect_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => T.Effect<R2, E2, B>,
  __trace?: string
): Managed<R & R2, E | E2, B> {
  return managedApply(
    T.chain_(self.effect, ({ tuple: [fin, a] }) =>
      T.map_(f(a), (_) => Tp.tuple(fin, _), __trace)
    )
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R2, E2, B>(
  f: (a: A) => T.Effect<R2, E2, B>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>) => mapEffect_(self, f, __trace)
}
