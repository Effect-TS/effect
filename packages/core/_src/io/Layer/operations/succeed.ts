/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static effect/core/io/Layer.Ops succeed
 */
export function succeed<T>(tag: Tag<T>, resource: LazyArg<T>): Layer<never, never, T> {
  return Layer.fromEffectEnvironment(Effect.succeed(Env(tag, resource())))
}
