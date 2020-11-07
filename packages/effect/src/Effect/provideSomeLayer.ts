import * as L from "../Layer"
import { use_ } from "../Managed/core"
import { provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer<R, E, A>(layer: L.Layer<R, E, A>) {
  return <R1, E1, A1>(self: Effect<R1 & A, E1, A1>): Effect<R & R1, E | E1, A1> =>
    provideLayer_(self, layer["+++"](L.identity()))
}

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer_<R, E, A, R1, E1, A1>(
  eff: Effect<R1 & A, E1, A1>,
  layer: L.Layer<R, E, A>
): Effect<R & R1, E | E1, A1> {
  return provideSomeLayer(layer)(eff)
}

/**
 * Provides a layer to the given effect
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Effect<A, E1, A1>,
  layer: L.Layer<R, E, A>
): Effect<R, E | E1, A1> {
  return use_(L.build(layer), (p) => provideAll_(self, p))
}

/**
 * Provides a layer to the given effect
 */
export function provideLayer<R, E, A, E1, A1>(layer: L.Layer<R, E, A>) {
  return (self: Effect<A, E1, A1>) => provideLayer_(self, layer)
}
