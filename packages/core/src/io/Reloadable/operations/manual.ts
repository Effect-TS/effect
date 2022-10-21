import { ReloadableInternal } from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service.
 *
 * @tsplus static effect/core/io/Reloadable.Ops manual
 */
export function manual<In, E, Out>(
  outTag: Tag<Out>,
  layer: Layer<In, E, Out>
): Layer<In, E, Reloadable<Out>> {
  return Layer.scoped(
    outTag.reloadable,
    Do(($) => {
      const input = $(Effect.environment<In>())
      const ref = $(ScopedRef.fromAcquire(layer.build.map((env) => env.unsafeGet(outTag))))
      const reload = ref.set(layer.build.map((env) => env.unsafeGet(outTag)))
        .provideEnvironment(input)
      return new ReloadableInternal<Out>(ref, reload)
    })
  )
}
