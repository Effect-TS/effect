/**
 * Constructs a `Layer` that passes along the specified environment as an
 * output.
 *
 * @tsplus static ets/Layer/Ops environment
 */
export function environment<R>(): Layer<R, never, R> {
  return Layer.fromRawEffect(Effect.environment<R>());
}
