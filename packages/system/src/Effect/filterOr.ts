import type { Predicate, Refinement } from "../Function"
import { flow } from "../Function"
import { chain_, succeed } from "./core"
import { die } from "./die"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie<A, B extends A>(
  p: Refinement<A, B>,
  dieWith: (a: A) => unknown
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, B>
export function filterOrDie<A>(
  p: Predicate<A>,
  dieWith: (a: A) => unknown
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDie<A>(p: Predicate<A>, dieWith: (a: A) => unknown) {
  return <R, E>(fa: Effect<R, E, A>): Effect<R, E, A> => filterOrDie_(fa, p, dieWith)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  dieWith: (a: A) => unknown
): Effect<R, E, B>
export function filterOrDie_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  dieWith: (a: A) => unknown
): Effect<R, E, A>
export function filterOrDie_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  dieWith: (a: A) => unknown
) {
  return filterOrElse_(fa, p, flow(dieWith, die))
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail<A, B extends A, E1>(
  p: Refinement<A, B>,
  failWith: (a: A) => E1
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E | E1, B>
export function filterOrFail<A, E1>(
  p: Predicate<A>,
  failWith: (a: A) => E1
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E | E1, A>
export function filterOrFail<A, E1>(p: Predicate<A>, failWith: (a: A) => E1) {
  return <R, E>(fa: Effect<R, E, A>): Effect<R, E | E1, A> =>
    filterOrFail_(fa, p, failWith)
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, E1, A, B extends A>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  failWith: (a: A) => E1
): Effect<R, E | E1, B>
export function filterOrFail_<R, E, E1, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  failWith: (a: A) => E1
): Effect<R, E | E1, A>
export function filterOrFail_<R, E, E1, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  failWith: (a: A) => E1
) {
  return filterOrElse_(fa, p, flow(failWith, fail))
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse<A, B extends A, R2, E2, A2>(
  p: Refinement<A, B>,
  or: (a: A) => Effect<R2, E2, A2>
): <R, E>(fa: Effect<R, E, A>) => Effect<R & R2, E | E2, B | A2>
export function filterOrElse<A, R2, E2, A2>(
  p: Predicate<A>,
  or: (a: A) => Effect<R2, E2, A2>
): <R, E>(fa: Effect<R, E, A>) => Effect<R & R2, E | E2, A | A2>
export function filterOrElse<A, R2, E2, A2>(
  p: Predicate<A>,
  or: (a: A) => Effect<R2, E2, A2>
) {
  return <R, E>(fa: Effect<R, E, A>) =>
    chain_(fa, (a): Effect<R2, E2, A | A2> => (p(a) ? succeed(a) : or(a)))
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  or: (a: A) => Effect<R2, E2, A2>
): Effect<R & R2, E | E2, B | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  or: (a: A) => Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  or: (a: A) => Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A | A2> {
  return chain_(fa, (a): Effect<R2, E2, A | A2> => (p(a) ? succeed(a) : or(a)))
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 */
export function filterOrDieMessage<A, B extends A>(
  p: Refinement<A, B>,
  message: (a: A) => string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, B>
export function filterOrDieMessage<A>(
  p: Predicate<A>,
  message: (a: A) => string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDieMessage<A>(p: Predicate<A>, message: (a: A) => string) {
  return <R, E>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    filterOrDieMessage_(fa, p, message)
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  message: (a: A) => string
): Effect<R, E, B>
export function filterOrDieMessage_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  message: (a: A) => string
): Effect<R, E, A>
export function filterOrDieMessage_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  message: (a: A) => string
) {
  return filterOrDie_(fa, p, (a) => new Error(message(a)))
}
