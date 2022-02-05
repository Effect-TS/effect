// ets_tracing: off

import * as core from "../../../../Effect/core.js"
import type { Effect } from "../../../../Effect/effect.js"
import * as forEach from "../../../../Effect/excl-forEach.js"
import * as coreMap from "../../../../Effect/map.js"
import * as List from "../core.js"

/**
 * Effectfully maps the elements of this list.
 */
export function mapM_<A, R, E, B>(
  self: List.List<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, List.List<B>> {
  return core.suspend(() => {
    const builder = List.emptyPushable<B>()

    return coreMap.map_(
      forEach.forEachUnit_(self, (a) =>
        coreMap.map_(f(a), (b) => {
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
