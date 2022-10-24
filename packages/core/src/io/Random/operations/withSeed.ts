import { LiveRandom } from "@effect/core/io/Random/operations/live"
import * as Context from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/io/Random.Ops withSeed
 * @category aspects
 * @since 1.0.0
 */
export function withSeed(seed: number) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.sync(new LiveRandom(seed)).flatMap((random) =>
      effect.apply(DefaultServices.currentServices.locallyWith(Context.add(Random.Tag)(random)))
    )
}
