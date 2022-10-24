import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus static effect/core/io/Layer.Aspects project
 * @tsplus pipeable effect/core/io/Layer project
 * @category mutations
 * @since 1.0.0
 */
export function project<A, B>(
  tagA: Context.Tag<A>,
  tagB: Context.Tag<B>,
  f: (a: A) => B
) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut | A>): Layer<RIn, E, B> =>
    self.map((environment) =>
      pipe(
        Context.empty(),
        Context.add(tagB)(f(pipe(environment, Context.unsafeGet(tagA))))
      )
    )
}
