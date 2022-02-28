import { IO } from "../definition"

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/IO map
 */
export function map_<A, B>(self: IO<A>, f: (a: A) => B) {
  return self.flatMap((a) => IO.succeed(f(a)))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: IO<A>) => self.map(f)
}
