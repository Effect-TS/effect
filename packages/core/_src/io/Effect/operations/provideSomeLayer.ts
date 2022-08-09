/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideSomeLayer
 * @tsplus pipeable effect/core/io/Effect provideSomeLayer
 */
export function provideSomeLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R1 | Exclude<R, A1>, E | E1, A> =>
    // @ts-expect-error
    self.provideLayer(
      Layer.environment<Exclude<R, A1>>().merge(layer)
    )
}
