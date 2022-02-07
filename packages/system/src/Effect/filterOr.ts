// ets_tracing: off

import { RuntimeError } from "../Cause/index.js"
import type { Predicate, Refinement } from "../Function/index.js"
import { pipe } from "../Function/index.js"
import { chain_, succeed, suspend } from "./core.js"
import { die } from "./die.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @ets_data_first filterOrDie_
 */
export function filterOrDie<A, B extends A>(
  p: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, B>
export function filterOrDie<A>(
  p: Predicate<A>,
  dieWith: (a: A) => unknown,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDie<A>(p: Predicate<A>, dieWith: unknown, __trace?: string) {
  return <R, E>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    filterOrDie_(fa, p, dieWith as (a: A) => unknown, __trace)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown,
  __trace?: string
): Effect<R, E, B>
export function filterOrDie_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  dieWith: (a: A) => unknown,
  __trace?: string
): Effect<R, E, A>
export function filterOrDie_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  dieWith: unknown,
  __trace?: string
) {
  return filterOrElse_(
    fa,
    p,
    (x) => pipe(x, dieWith as (a: A) => unknown, die),
    __trace
  )
}

/**
 * Fails with `failWith` if the predicate fails.
 *
 * @ets_data_first filterOrFail_
 */
export function filterOrFail<A, B extends A, E1>(
  p: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E | E1, B>
export function filterOrFail<A, E1>(
  p: Predicate<A>,
  failWith: (a: A) => E1,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E | E1, A>
export function filterOrFail<A, E1>(
  p: Predicate<A>,
  failWith: unknown,
  __trace?: string
) {
  return <R, E>(fa: Effect<R, E, A>): Effect<R, E | E1, A> =>
    filterOrFail_(fa, p, failWith as (a: A) => E1, __trace)
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, E1, A, B extends A>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1,
  __trace?: string
): Effect<R, E | E1, B>
export function filterOrFail_<R, E, E1, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  failWith: (a: A) => E1,
  __trace?: string
): Effect<R, E | E1, A>
export function filterOrFail_<R, E, E1, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  failWith: unknown,
  __trace?: string
) {
  return filterOrElse_(fa, p, (x) => pipe(x, failWith as (a: A) => E1, fail), __trace)
}

/**
 * Applies `or` if the predicate fails.
 *
 * @ets_data_first filterOrElse_
 */
export function filterOrElse<A, B extends A, R2, E2, A2>(
  p: Refinement<A, B>,
  or: (a: Exclude<A, B>) => Effect<R2, E2, A2>,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R & R2, E | E2, B | A2>
export function filterOrElse<A, R2, E2, A2>(
  p: Predicate<A>,
  or: (a: A) => Effect<R2, E2, A2>,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R & R2, E | E2, A | A2>
export function filterOrElse<A, R2, E2, A2>(
  p: Predicate<A>,
  or: unknown,
  __trace?: string
) {
  return <R, E>(fa: Effect<R, E, A>) =>
    filterOrElse_(fa, p, or as (a: A) => Effect<R2, E2, A2>, __trace)
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  or: (a: Exclude<A, B>) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, B | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  or: (a: A) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  or: unknown,
  __trace?: string
): Effect<R & R2, E | E2, A | A2> {
  return chain_(
    fa,
    (a): Effect<R2, E2, A | A2> =>
      p(a)
        ? succeed(a, __trace)
        : suspend(() => (or as (a: A) => Effect<R2, E2, A2>)(a), __trace)
  )
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 *
 * @ets_data_first filterOrDieMessage_
 */
export function filterOrDieMessage<A, B extends A>(
  p: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, B>
export function filterOrDieMessage<A>(
  p: Predicate<A>,
  message: (a: A) => string,
  __trace?: string
): <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDieMessage<A>(
  p: Predicate<A>,
  message: unknown,
  __trace?: string
) {
  return <R, E>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    filterOrDieMessage_(fa, p, message as (a: A) => string, __trace)
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: Effect<R, E, A>,
  p: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string,
  __trace?: string
): Effect<R, E, B>
export function filterOrDieMessage_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  message: (a: A) => string,
  __trace?: string
): Effect<R, E, A>
export function filterOrDieMessage_<R, E, A>(
  fa: Effect<R, E, A>,
  p: Predicate<A>,
  message: unknown,
  __trace?: string
) {
  return filterOrDie_(
    fa,
    p,
    (a) => new RuntimeError((message as (a: A) => string)(a)),
    __trace
  )
}
