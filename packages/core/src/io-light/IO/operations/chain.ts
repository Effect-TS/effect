import type { IO } from "../definition"
import { FlatMap } from "../definition"

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/IO flatMap
 */
export function chain_<A, B>(self: IO<A>, f: (a: A) => IO<B>): IO<B> {
  return new FlatMap(self, f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => IO<B>) {
  return (self: IO<A>): IO<B> => self.flatMap(f)
}
