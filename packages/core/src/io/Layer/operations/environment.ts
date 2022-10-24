/**
 * Constructs a `Layer` that passes along the specified environment as an
 * output.
 *
 * @tsplus static effect/core/io/Layer.Ops environment
 * @category constructors
 * @since 1.0.0
 */
export function environment<R>(): Layer<R, never, R> {
  return Layer.fromEffectEnvironment(Effect.environment<R>())
}
