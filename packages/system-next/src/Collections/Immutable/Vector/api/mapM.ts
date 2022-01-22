import type { Effect } from "../../../../Effect/definition"
import { forEachDiscard_ } from "../../../../Effect/operations/excl-forEach"
import { map_ } from "../../../../Effect/operations/map"
import { suspendSucceed } from "../../../../Effect/operations/suspendSucceed"
import * as V from "../core"

/**
 * Effectfully maps the elements of this list.
 */
export function mapM_<A, R, E, B>(
  self: V.Vector<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, V.Vector<B>> {
  return suspendSucceed(() => {
    const builder = V.emptyPushable<B>()

    return map_(
      forEachDiscard_(self, (a) =>
        map_(f(a), (b) => {
          V.push_(builder, b)
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
): (self: V.Vector<A>) => Effect<R, E, V.Vector<B>> {
  return (self) => mapM_(self, f)
}
