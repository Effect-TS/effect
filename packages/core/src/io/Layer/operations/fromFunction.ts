import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Constructs a layer from the environment using the specified function.
 *
 * @tsplus static effect/core/io/Layer.Ops fromFunction
 * @category conversions
 * @since 1.0.0
 */
export function fromFunction<A, B>(
  tagA: Context.Tag<A>,
  tagB: Context.Tag<B>,
  f: (a: A) => B
): Layer<A, never, B> {
  return Layer.fromEffectEnvironment(
    Effect.serviceWith(tagA, (a) => pipe(Context.empty(), Context.add(tagB)(f(a))))
  )
}
