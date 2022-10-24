import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Retreives the `Random` service from the environment and uses it to run the
 * specified workflow.
 *
 * @tsplus static effect/core/io/Effect.Ops randomWith
 * @category getters
 * @since 1.0.0
 */
export function randomWith<R, E, A>(f: (random: Random) => Effect<R, E, A>): Effect<R, E, A> {
  return DefaultServices.currentServices.getWith((services) =>
    f(pipe(services, Context.get(Random.Tag)))
  )
}
