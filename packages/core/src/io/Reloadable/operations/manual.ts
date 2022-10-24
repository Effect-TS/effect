import {
  ReloadableInternal,
  reloadableTag
} from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"
import * as Context from "@fp-ts/data/Context"

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service.
 *
 * @tsplus static effect/core/io/Reloadable.Ops manual
 * @category constructors
 * @since 1.0.0
 */
export function manual<In, E, Out>(
  outTag: Context.Tag<Out>,
  layer: Layer<In, E, Out>
): Layer<In, E, Reloadable<Out>> {
  return Layer.scoped(
    reloadableTag(outTag),
    Do(($) => {
      const input = $(Effect.environment<In>())
      const ref = $(ScopedRef.fromAcquire(layer.build.map(Context.unsafeGet(outTag))))
      const reload = ref.set(layer.build.map(Context.unsafeGet(outTag))).provideEnvironment(input)
      return new ReloadableInternal<Out>(ref, reload)
    })
  )
}
