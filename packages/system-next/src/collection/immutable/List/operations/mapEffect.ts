import { Effect } from "../../../../io/Effect/definition"
import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Effectfully maps the elements of this list.
 *
 * @tsplus fluent ets/List mapEffect
 */
export function mapEffect_<A, R, E, B>(
  self: List<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, List<B>> {
  return Effect.suspendSucceed(() => {
    const builder = MutableList.emptyPushable<B>()

    return Effect.forEachDiscard(self, (a) =>
      f(a).map((b) => {
        builder.push(b)
      })
    ).map(() => builder)
  })
}

/**
 * Effectfully maps the elements of this list.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (self: List<A>): Effect<R, E, List<B>> => self.mapEffect(f)
}
