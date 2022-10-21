/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to the
 * provided schedule.
 *
 * @tsplus static effect/core/io/Reloadable.Ops auto
 */
export function auto<In, E, Out, State, Env, Out2>(
  outTag: Tag<Out>,
  layer: Layer<In, E, Out>,
  policy: Schedule<State, Env, In, Out2>
): Layer<Env | In, E, Reloadable<Out>> {
  return Layer.scoped(
    outTag.reloadable,
    Do(($) => {
      const env = $(Reloadable.manual(outTag, layer).build)
      const reloadable = env.unsafeGet(outTag.reloadable)
      $(Effect.acquireRelease(
        reloadable.reload.ignoreLogged.schedule(policy).forkDaemon,
        (fiber) => fiber.interrupt
      ))
      return reloadable
    })
  )
}
