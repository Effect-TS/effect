/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @tsplus fluent ets/Effect provideSomeLayer
 */
export function provideSomeLayer_<R, E, A, R1 extends Spreadable, E1, A1 extends Spreadable>(
  self: Effect<R, E, A>,
  layer: Layer<R1, E1, A1>,
  __tsplusTrace?: string
): Effect<R1 & Erase<R, A1>, E | E1, A> {
  return self.provideLayer(Layer.environment<R1>() + layer);
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @tsplus static ets/Effect/Aspects provideSomeLayer
 */
export const provideSomeLayer = Pipeable(provideSomeLayer_);
