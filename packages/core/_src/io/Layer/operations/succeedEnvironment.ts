/**
 * Constructs a layer from the specified value, which must return one or more
 * services.
 *
 * @tsplus static ets/Layer/Ops succeedEnvironment
 */
export function succeedEnvironment<A>(a: LazyArg<Env<A>>): Layer<unknown, never, A> {
  return Layer.fromEffectEnvironment(Effect.succeed(a))
}
