import type { IO } from "../definition"

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @tsplus fluent ets/IO tap
 */
export function tap_<A>(self: IO<A>, f: (a: A) => IO<any>): IO<A> {
  return self.flatMap((a) => f(a).map(() => a))
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @ets_data_first tap_
 */
export function tap<A>(f: (a: A) => IO<any>) {
  return (self: IO<A>): IO<A> => self.tap(f)
}
