import { Layer } from "../Layer"

import { Effect } from "./effect"

/**
 * Provides a layer to the given effect
 */
export const provideSomeLayer = <S, R, E, A>(layer: Layer<S, R, E, A>) => <
  S1,
  R1,
  E1,
  A1
>(
  eff: Effect<S1, R1 & A, E1, A1>
): Effect<S | S1, R & R1, E | E1, A1> => layer.use(eff)

/**
 * Provides a layer to the given effect
 */
export const provideSomeLayer_ = <S, R, E, A, S1, R1, E1, A1>(
  eff: Effect<S1, R1 & A, E1, A1>,
  layer: Layer<S, R, E, A>
): Effect<S | S1, R & R1, E | E1, A1> => layer.use(eff)
