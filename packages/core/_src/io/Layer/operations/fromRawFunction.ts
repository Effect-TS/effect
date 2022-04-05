/**
 * Creates a layer from a function.
 *
 * @tsplus static ets/Layer/Ops fromRawFunction
 */
export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return Layer.fromRawEffect(Effect.environmentWith(f));
}
