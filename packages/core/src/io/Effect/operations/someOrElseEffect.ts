import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus fluent ets/Effect someOrElseEffect
 */
export function someOrElseEffect_<R, E, A, R2, E2, B>(
  self: Effect<R, E, Option<A>>,
  orElse: LazyArg<Effect<R2, E2, B>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | B> {
  return (self as Effect<R, E, Option<A | B>>).flatMap((option) =>
    option.map(Effect.succeedNow).getOrElse(orElse)
  )
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseEffect_
 */
export function someOrElseEffect<R2, E2, B>(
  orElse: Effect<R2, E2, B>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, Option<A>>): Effect<R & R2, E | E2, A | B> =>
    self.someOrElseEffect(orElse)
}
