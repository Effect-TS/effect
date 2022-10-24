import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static effect/core/io/Layer.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<T>(tag: Context.Tag<T>): (resource: T) => Layer<never, never, T> {
  return (resource) =>
    Layer.fromEffectEnvironment(Effect.succeed(pipe(
      Context.empty(),
      Context.add(tag)(resource)
    )))
}
