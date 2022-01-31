import type { Layer } from "../../Layer/definition"
import { build } from "../../Layer/memoMap"
import { use_ } from "../../Managed/operations/use"
import type { Effect } from "../definition"

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @ets fluent ets/Effect provideLayer
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Effect<A, E1, A1>,
  layer: Layer<R, E, A>,
  __etsTrace?: string
): Effect<R, E | E1, A1> {
  return use_(build(layer), (r) => self.provideEnvironment(r))
}

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @ets_data_first provideLayer_
 */
export function provideLayer<R, E, A>(layer: Layer<R, E, A>, __etsTrace?: string) {
  return <E1, A1>(self: Effect<A, E1, A1>) => provideLayer_(self, layer)
}
