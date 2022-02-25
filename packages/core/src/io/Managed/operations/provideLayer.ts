import type { Layer } from "../../Layer/definition"
import { build } from "../../Layer/memoMap"
import { Managed } from "../definition"

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @tsplus fluent ets/Managed provideLayer
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Managed<A, E1, A1>,
  layer: Layer<R, E, A>,
  __tsplusTrace?: string
): Managed<R, E | E1, A1> {
  return Managed.suspend(() => build(layer).flatMap((r) => self.provideEnvironment(r)))
}

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @ets_data_first provideLayer_
 */
export function provideLayer<R, E, A>(layer: Layer<R, E, A>, __tsplusTrace?: string) {
  return <E1, A1>(self: Managed<A, E1, A1>) => provideLayer_(self, layer)
}
