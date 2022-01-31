import { Effect } from "../../../../io/Effect/definition"
import { List } from "../definition"

/**
 * Filters this list by the specified effectful predicate, retaining all elements for
 * which the predicate evaluates to true.
 *
 * @ets fluent ets/List filterEffect
 */
export function filterEffect_<R, E, A>(
  self: List<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, List<A>> {
  return Effect.suspendSucceed(() => {
    let dest: Effect<R, E, List<A>> = Effect.succeedNow(List.empty<A>())

    for (const a of self) {
      dest = dest.zipWith(f(a), (d, b) => (b ? d.append(a) : d))
    }

    return dest
  })
}

/**
 * Filters this list by the specified effectful predicate, retaining all elements for
 * which the predicate evaluates to true.
 *
 * @ets_data_first filterEffect_
 */
export function filterEffect<R, E, A>(f: (a: A) => Effect<R, E, boolean>) {
  return (self: List<A>): Effect<R, E, List<A>> => self.filterEffect(f)
}
