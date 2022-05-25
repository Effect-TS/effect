/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static ets/Layer/Ops succeed
 */
export function succeed<T>(tag: Tag<T>) {
  return (resource: LazyArg<T>): Layer<unknown, never, Has<T>> =>
    Layer.fromEffectEnvironment(Effect.succeed(Env(tag, resource())))
}
