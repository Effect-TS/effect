import * as Tp from "../../../collection/immutable/Tuple"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @ets fluent ets/Managed mapEffect
 */
export function mapEffect_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R2, E2, B>,
  __etsTrace?: string
): Managed<R & R2, E | E2, B> {
  return Managed(
    self.effect.flatMap(({ tuple: [fin, a] }) => f(a).map((_) => Tp.tuple(fin, _)))
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R2, E2, B>(
  f: (a: A) => Effect<R2, E2, B>,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>) => mapEffect_(self, f)
}
