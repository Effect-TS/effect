import type { List } from "../../../collection/immutable/List"
import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 *
 * @tsplus getter ets/Effect head
 */
export function head<R, E, A>(
  self: Effect<R, E, List<A>>,
  __etsTrace?: string
): Effect<R, Option<E>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Option.some(e)),
    (list) => list.first.fold(Effect.fail(Option.none), Effect.succeedNow)
  )
}
