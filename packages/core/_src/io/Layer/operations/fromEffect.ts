/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static effect/core/io/Layer.Ops fromEffect
 */
export function fromEffect<T, R, E, T1 extends T>(tag: Tag<T>, effect: LazyArg<Effect<R, E, T1>>): Layer<R, E, T> {
  return Layer.fromEffectEnvironment(Effect.suspendSucceed(effect).map((service) => Env(tag, service)))
}
