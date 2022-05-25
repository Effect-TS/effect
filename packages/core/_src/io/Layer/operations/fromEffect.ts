/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static ets/Layer/Ops fromEffect
 */
export function fromEffect<T>(tag: Tag<T>) {
  return <R, E>(effect: LazyArg<Effect<R, E, T>>): Layer<R, E, Has<T>> =>
    Layer.fromEffectEnvironment(Effect.suspendSucceed(effect).map((service) => Env(tag, service)))
}
