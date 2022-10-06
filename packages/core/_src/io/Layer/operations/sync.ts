/**
 * Lazily constructs a layer from the specified value.
 *
 * @tsplus static effect/core/io/Layer.Ops sync
 */
export function sync<T>(tag: Tag<T>): (resource: LazyArg<T>) => Layer<never, never, T> {
  return (resource) => Layer.fromEffectEnvironment(Effect.sync(Env(tag, resource())))
}
