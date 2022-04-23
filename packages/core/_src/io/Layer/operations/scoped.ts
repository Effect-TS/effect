/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static ets/Layer/Ops scoped
 */
export function scoped<T>(tag: Tag<T>) {
  return <R, E>(
    effect: LazyArg<Effect<R & Has<Scope>, E, T>>,
    __tsplusTrace?: string
  ): Layer<R, E, Has<T>> =>
    Layer.scopedEnvironment(Effect.suspendSucceed(effect).map((service) => Env(tag, service))).setKey(tag.id);
}
