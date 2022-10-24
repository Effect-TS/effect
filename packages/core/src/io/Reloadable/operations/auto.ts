import { reloadableTag } from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to the
 * provided schedule.
 *
 * @tsplus static effect/core/io/Reloadable.Ops auto
 * @category constructors
 * @since 1.0.0
 */
export function auto<In, E, Out, State, Env, Out2>(
  outTag: Context.Tag<Out>,
  layer: Layer<In, E, Out>,
  policy: Schedule<State, Env, In, Out2>
): Layer<Env | In, E, Reloadable<Out>> {
  return Layer.scoped(
    reloadableTag(outTag),
    Do(($) => {
      const context = $(Reloadable.manual(outTag, layer).build)
      const reloadable = pipe(context, Context.unsafeGet(reloadableTag(outTag)))
      $(Effect.acquireRelease(
        reloadable.reload.ignoreLogged.schedule(policy).forkDaemon,
        (fiber) => fiber.interrupt
      ))
      return reloadable
    })
  )
}
