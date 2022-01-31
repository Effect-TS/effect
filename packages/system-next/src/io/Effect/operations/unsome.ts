import * as O from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus fluent ets/Effect unsome
 */
export function unsome<R, E, A>(
  self: Effect<R, O.Option<E>, A>,
  __etsTrace?: string
): Effect<R, E, O.Option<A>> {
  return self.foldEffect(
    (e) => O.fold_(e, () => Effect.succeedNow(O.none), Effect.failNow),
    (a) => Effect.succeedNow(O.some(a))
  )
}
