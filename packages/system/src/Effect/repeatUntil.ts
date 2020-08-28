import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM<A, S1, R1, E1>(f: (a: A) => Effect<S1, R1, E1, boolean>) {
  return <S, R, E>(self: Effect<S, R, E, A>): Effect<S | S1, R & R1, E | E1, A> =>
    repeatUntilM_(self, f)
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<S, R, E, A, S1, R1, E1>(
  self: Effect<S, R, E, A>,
  f: (a: A) => Effect<S1, R1, E1, boolean>
): Effect<S | S1, R & R1, E | E1, A> {
  return chain_(self, (a) =>
    chain_(f(a), (b) => (b ? succeed(a) : repeatUntilM(f)(self)))
  )
}

/**
 * Repeats this effect until its error satisfies the specified predicate.
 */
export function repeatUntil<A>(f: (a: A) => boolean) {
  return <S, R, E>(self: Effect<S, R, E, A>) => repeatUntil_(self, f)
}

/**
 * Repeats this effect until its error satisfies the specified predicate.
 */
export function repeatUntil_<S, R, E, A>(
  self: Effect<S, R, E, A>,
  f: (a: A) => boolean
) {
  return repeatUntilM_(self, (a) => succeed(f(a)))
}
