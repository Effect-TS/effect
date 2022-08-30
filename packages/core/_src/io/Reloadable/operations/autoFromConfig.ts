/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to a
 * schedule, which is extracted from the input to the layer.
 *
 * @tsplus static effect/core/io/Reloadable.Ops autoFromConfig
 */
export function autoFromConfig<In, E, Out, State, R, Out2>(
  outTag: Tag<Out>,
  reloadableTag: Tag<Reloadable<Out>>,
  layer: Layer<In, E, Out>,
  scheduleFromConfig: (env: Env<In>) => Schedule<State, R, In, Out2>
): Layer<R | In, E, Reloadable<Out>> {
  return Layer.scoped(
    reloadableTag,
    Do(($) => {
      const input = $(Effect.environment<In>())
      const policy = scheduleFromConfig(input)
      const env = $(Reloadable.auto(outTag, reloadableTag, layer, policy).build)
      return env.unsafeGet(reloadableTag)
    })
  )
}
