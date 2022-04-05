/**
 * Constructs a layer from the environment using the specified function.
 *
 * @tsplus static ets/Layer/Ops fromFunction
 */
export function fromFunction<B>(service: Service<B>) {
  return <A>(f: (a: A) => B): Layer<A, never, Has<B>> => Layer.fromEffect(service)(Effect.environmentWith<A, B>(f));
}
