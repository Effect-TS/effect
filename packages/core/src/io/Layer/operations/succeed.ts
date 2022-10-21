/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static effect/core/io/Layer.Ops succeed
 */
export function succeed<T>(tag: Tag<T>): (resource: T) => Layer<never, never, T> {
  return (resource) => Layer.fromEffectEnvironment(Effect.succeed(Env(tag, resource)))
}
