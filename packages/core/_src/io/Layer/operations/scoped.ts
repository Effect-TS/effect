/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static effect/core/io/Layer.Ops scoped
 */
export function scoped<T, R, E, T1 extends T>(
  tag: Tag<T>,
  effect: LazyArg<Effect<R, E, T1>>,
  __tsplusTrace?: string
): Layer<Exclude<R, Scope>, E, T> {
  return Layer.scopedEnvironment(Effect.suspendSucceed(effect).map((service) => Env(tag, service)))
}
