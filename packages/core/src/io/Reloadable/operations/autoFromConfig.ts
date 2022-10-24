import { reloadableTag } from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to a
 * schedule, which is extracted from the input to the layer.
 *
 * @tsplus static effect/core/io/Reloadable.Ops autoFromConfig
 * @category constructors
 * @since 1.0.0
 */
export function autoFromConfig<In, E, Out, State, R, Out2>(
  outTag: Context.Tag<Out>,
  layer: Layer<In, E, Out>,
  scheduleFromConfig: (context: Context.Context<In>) => Schedule<State, R, In, Out2>
): Layer<R | In, E, Reloadable<Out>> {
  return Layer.scoped(
    reloadableTag(outTag),
    Do(($) => {
      const input = $(Effect.environment<In>())
      const policy = scheduleFromConfig(input)
      const env = $(Reloadable.auto(outTag, layer, policy).build)
      return pipe(env, Context.unsafeGet(reloadableTag(outTag)))
    })
  )
}
