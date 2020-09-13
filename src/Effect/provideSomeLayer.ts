import type { Layer } from "../Layer/core"
import { use_ } from "../Managed/core"
import type { Effect } from "./effect"
import { provideSome_ } from "./provideSome"

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer<S, R, E, A>(layer: Layer<S, R, E, A>) {
  return <S1, R1, E1, A1>(
    eff: Effect<S1, R1 & A, E1, A1>
  ): Effect<S | S1, R & R1, E | E1, A1> =>
    use_(layer.build, (p) => provideSome_(eff, (r: R & R1) => ({ ...r, ...p })))
}

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer_<S, R, E, A, S1, R1, E1, A1>(
  eff: Effect<S1, R1 & A, E1, A1>,
  layer: Layer<S, R, E, A>
): Effect<S | S1, R & R1, E | E1, A1> {
  return provideSomeLayer_(eff, layer)
}
