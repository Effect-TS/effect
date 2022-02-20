import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter ets/Effect some
 */
export function some<R, E, A>(
  self: Effect<R, E, Option<A>>,
  __etsTrace?: string
): Effect<R, Option<E>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Option.some(e)),
    (option) => option.fold(Effect.fail(Option.none), Effect.succeedNow)
  )
}
