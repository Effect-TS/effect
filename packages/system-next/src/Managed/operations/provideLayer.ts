import type { Layer } from "../../Layer/definition"
import { build } from "../../Layer/memoMap"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { provideEnvironment_ } from "./provideEnvironment"
import { suspend } from "./suspend"

/**
 * Provides a layer to the effect, which translates it to another level.
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Managed<A, E1, A1>,
  layer: Layer<R, E, A>,
  __trace?: string
): Managed<R, E | E1, A1> {
  return suspend(() => chain_(build(layer), (r) => provideEnvironment_(self, r)))
}

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @ets_data_first provideLayer_
 */
export function provideLayer<R, E, A>(layer: Layer<R, E, A>, __trace?: string) {
  return <E1, A1>(self: Managed<A, E1, A1>) => provideLayer_(self, layer, __trace)
}
