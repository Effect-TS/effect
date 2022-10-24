import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Lazily constructs a layer from the specified value.
 *
 * @tsplus static effect/core/io/Layer.Ops sync
 * @category constructors
 * @since 1.0.0
 */
export function sync<T>(tag: Context.Tag<T>): (resource: LazyArg<T>) => Layer<never, never, T> {
  return (resource) =>
    Layer.fromEffectEnvironment(Effect.sync(pipe(
      Context.empty(),
      Context.add(tag)(resource())
    )))
}
