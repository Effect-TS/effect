import type { Layer } from "../Layer/core"
import { use_ } from "../Managed/core"
import type { Effect } from "./effect"
import { provideSome_ } from "./provideSome"

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer<R, E, A>(layer: Layer<R, E, A>) {
  return <R1, E1, A1>(eff: Effect<R1 & A, E1, A1>): Effect<R & R1, E | E1, A1> =>
    use_(layer.build, (p) => provideSome_(eff, (r: R & R1) => ({ ...r, ...p })))
}

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer_<R, E, A, R1, E1, A1>(
  eff: Effect<R1 & A, E1, A1>,
  layer: Layer<R, E, A>
): Effect<R & R1, E | E1, A1> {
  return provideSomeLayer_(eff, layer)
}
