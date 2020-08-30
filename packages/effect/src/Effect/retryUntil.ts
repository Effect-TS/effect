import { pipe } from "../Function"
import { catchAll } from "./catchAll"
import { chain, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM<E, S1, R1, E1>(f: (a: E) => Effect<S1, R1, E1, boolean>) {
  return <S, R, A>(self: Effect<S, R, E, A>): Effect<S | S1, R & R1, E | E1, A> =>
    retryUntilM_(self, f)
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM_<S, R, E, A, S1, R1, E1>(
  self: Effect<S, R, E, A>,
  f: (a: E) => Effect<S1, R1, E1, boolean>
): Effect<S | S1, R & R1, E | E1, A> {
  return pipe(
    self,
    catchAll((e) =>
      pipe(
        f(e),
        chain((b) => (b ? fail(e) : retryUntilM_(self, f)))
      )
    )
  )
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export function retryUntil<E>(f: (a: E) => boolean) {
  return <S, R, A>(self: Effect<S, R, E, A>) => retryUntil_(self, f)
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export function retryUntil_<S, R, E, A>(
  self: Effect<S, R, E, A>,
  f: (a: E) => boolean
) {
  return retryUntilM_(self, (a) => succeed(f(a)))
}
