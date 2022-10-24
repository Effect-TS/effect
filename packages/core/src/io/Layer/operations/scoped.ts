import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static effect/core/io/Layer.Ops scoped
 * @category constructors
 * @since 1.0.0
 */
export function scoped<T, R, E, T1 extends T>(
  tag: Context.Tag<T>,
  effect: Effect<R, E, T1>
): Layer<Exclude<R, Scope>, E, T> {
  return Layer.scopedEnvironment(
    effect.map((service) =>
      pipe(
        Context.empty(),
        Context.add(tag)(service)
      )
    )
  )
}
