/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static effect/core/io/Layer.Ops fromEffect
 */
export function fromEffect<T>(
  tag: Tag<T>
): <R, E>(effect: Effect<R, E, T>) => Layer<R, E, T> {
  return (effect) => Layer.fromEffectEnvironment(effect.map((service) => Env(tag, service)))
}
