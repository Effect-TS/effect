import type { Option } from "@fp-ts/data/Option"

/**
 * Runs the generator returning the first value of the generator.
 *
 * @tsplus getter effect/core/testing/Gen runHead
 * @category destructors
 * @since 1.0.0
 */
export function runHead<R, A>(self: Gen<R, A>): Effect<R, never, Option<A>> {
  return self.sample.collectSome.map((sample) => sample.value).runHead
}
