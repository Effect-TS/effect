import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Retreives the `Clock` service from the environment and uses it to run the
 * specified effect.
 *
 * @tsplus static effect/core/io/Effect.Ops clockWith
 * @category getters
 * @since 1.0.0
 */
export function clockWith<R, E, A>(f: (clock: Clock) => Effect<R, E, A>): Effect<R, E, A> {
  return DefaultServices.currentServices.getWith((services) =>
    f(pipe(services, Context.get(Clock.Tag)))
  )
}
