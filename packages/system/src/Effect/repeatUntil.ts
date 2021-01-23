import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM<A, R1, E1>(f: (a: A) => Effect<R1, E1, boolean>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    repeatUntilM_(self, f)
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>
): Effect<R & R1, E | E1, A> {
  return chain_(self, (a) =>
    chain_(f(a), (b) => (b ? succeed(a) : repeatUntilM(f)(self)))
  )
}

/**
 * Repeats this effect until its error satisfies the specified predicate.
 */
export function repeatUntil<A>(f: (a: A) => boolean) {
  return <R, E>(self: Effect<R, E, A>) => repeatUntil_(self, f)
}

/**
 * Repeats this effect until its error satisfies the specified predicate.
 */
export function repeatUntil_<R, E, A>(self: Effect<R, E, A>, f: (a: A) => boolean) {
  return repeatUntilM_(self, (a) => succeed(f(a)))
}
