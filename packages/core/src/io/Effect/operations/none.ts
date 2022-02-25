import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter ets/Effect none
 */
export function none<R, E, A>(
  self: Effect<R, E, Option<A>>,
  __tsplusTrace?: string
): Effect<R, Option<E>, void> {
  return self.foldEffect(
    (e) => Effect.fail(Option.some(e)),
    (option) =>
      option.fold(Effect.succeedNow(undefined), () => Effect.fail(Option.none))
  )
}
