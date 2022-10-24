import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static effect/core/io/Layer.Ops fromEffect
 * @category conversions
 * @since 1.0.0
 */
export function fromEffect<T>(
  tag: Context.Tag<T>
) {
  return <R, E>(effect: Effect<R, E, T>): Layer<R, E, T> =>
    Layer.fromEffectEnvironment(effect.map((service) =>
      pipe(
        Context.empty(),
        Context.add(tag)(service)
      )
    ))
}
