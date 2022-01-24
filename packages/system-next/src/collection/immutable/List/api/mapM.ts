import type { Effect } from "../../../../io/Effect/definition"
import { forEachDiscard_ } from "../../../../io/Effect/operations/excl-forEach"
import { map_ } from "../../../../io/Effect/operations/map"
import { suspendSucceed } from "../../../../io/Effect/operations/suspendSucceed"
import * as List from "../core"

/**
 * Effectfully maps the elements of this list.
 */
export function mapM_<A, R, E, B>(
  self: List.List<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, List.List<B>> {
  return suspendSucceed(() => {
    const builder = List.emptyPushable<B>()

    return map_(
      forEachDiscard_(self, (a) =>
        map_(f(a), (b) => {
          List.push_(builder, b)
        })
      ),
      () => builder
    )
  })
}

/**
 * Effectfully maps the elements of this list.
 *
 * @ets_data_first mapM_
 */
export function mapM<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: List.List<A>) => Effect<R, E, List.List<B>> {
  return (self) => mapM_(self, f)
}
