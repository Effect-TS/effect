/* adapted from https://github.com/gcanti/retry-ts */

import * as T from "../Effect"
import { Exit } from "../Exit"
import { flow } from "../Function"
import { pipe } from "../Function"
import { getFunctionMonoid, Monoid } from "../Monoid"
import * as O from "../Option"
import { ordNumber } from "../Ord"
import { getJoinSemigroup } from "../Semigroup"

export function applyAndDelay(
  policy: RetryPolicy,
  status: RetryStatus
): T.Async<RetryStatus> {
  const newStatus = applyPolicy(policy, status)
  return pipe(
    newStatus.previousDelay,
    O.fold(
      () => T.pure(newStatus),
      (millis) => T.delay(T.pure(newStatus), millis)
    )
  )
}

/**
 * Apply policy on status to see what the decision would be.
 */
export function applyPolicy(policy: RetryPolicy, status: RetryStatus): RetryStatus {
  const previousDelay = policy(status)
  return {
    iterNumber: status.iterNumber + 1,
    cumulativeDelay: status.cumulativeDelay + O.getOrElse(() => 0)(previousDelay),
    previousDelay
  }
}

/**
 * Set a time-upperbound for any delays that may be directed by the
 * given policy. This function does not terminate the retrying. The policy
 * capDelay(maxDelay, exponentialBackoff(n))` will never stop retrying. It
 * will reach a state where it retries forever with a delay of `maxDelay`
 * between each one. To get termination you need to use one of the
 * 'limitRetries' function variants.
 */
export function capDelay(maxDelay: number, policy: RetryPolicy): RetryPolicy {
  return (status) =>
    pipe(
      status,
      policy,
      O.map((delay) => Math.min(maxDelay, delay))
    )
}

/**
 * Constant delay with unlimited retries
 */
export function constantDelay(delay: number): RetryPolicy {
  return () => O.some(delay)
}

/**
 * Initial, default retry status. Exported mostly to allow user code
 * to test their handlers and retry policies.
 */
export const defaultRetryStatus: RetryStatus =
  /*#__PURE__*/
  (() => ({
    iterNumber: 0,
    cumulativeDelay: 0,
    previousDelay: O.none
  }))()

/**
 * Grow delay exponentially each iteration.
 * Each delay will increase by a factor of two.
 */
export function exponentialBackoff(delay: number): RetryPolicy {
  return (status) => O.some(delay * Math.pow(2, status.iterNumber))
}

/**
 * Retry immediately, but only up to `i` times.
 */
export function limitRetries(i: number): RetryPolicy {
  return (status) => (status.iterNumber >= i ? O.none : O.some(0))
}

/**
 * Add an upperbound to a policy such that once the given time-delay
 * amount *per try* has been reached or exceeded, the policy will stop
 * retrying and fail.
 */
export function limitRetriesByDelay(
  maxDelay: number,
  policy: RetryPolicy
): RetryPolicy {
  return (status) =>
    pipe(
      status,
      policy,
      O.filter((delay) => delay < maxDelay)
    )
}

/**
 * 'RetryPolicy' is a 'Monoid'. You can collapse multiple strategies into one using 'concat'.
 * The semantics of this combination are as follows:
 *
 * 1. If either policy returns 'None', the combined policy returns
 * 'None'. This can be used to inhibit after a number of retries,
 * for example.
 *
 * 2. If both policies return a delay, the larger delay will be used.
 * This is quite natural when combining multiple policies to achieve a
 * certain effect.
 *
 * @example
 * import { monoidRetryPolicy, exponentialBackoff, limitRetries } from '@matechs/core/Retry'
 *
 * // One can easily define an exponential backoff policy with a limited
 * // number of retries:
 * export const limitedBackoff = monoidRetryPolicy.concat(exponentialBackoff(50), limitRetries(5))
 */
export const monoidRetryPolicy: Monoid<RetryPolicy> =
  /*#__PURE__*/
  (() =>
    getFunctionMonoid(
      O.getApplyMonoid({
        ...getJoinSemigroup(ordNumber),
        empty: 0
      })
    )<RetryStatus>())()

export function retrying<RP, EP, S, R, E, A, R2, E2>(
  policy: T.AsyncRE<RP, EP, RetryPolicy>,
  action: (status: RetryStatus) => T.Effect<S, R, E, A>,
  check: (ex: Exit<E, A>) => T.AsyncRE<R2, E2, boolean>
): T.AsyncRE<R & R2 & RP, E | E2 | EP, A> {
  const go = (status: RetryStatus): T.AsyncRE<R & R2 & RP, E | E2 | EP, A> =>
    pipe(
      status,
      flow(action, T.result),
      T.chain((a) =>
        pipe(
          check(a),
          T.chain((shouldRetry) =>
            shouldRetry
              ? pipe(
                  policy,
                  T.chain((p) => applyAndDelay(p, status)),
                  T.chain((status) =>
                    pipe(
                      status.previousDelay,
                      O.fold(
                        () => T.completed(a),
                        () => go(status)
                      )
                    )
                  )
                )
              : T.completed(a)
          )
        )
      )
    )

  return go(defaultRetryStatus)
}

/**
 * A `RetryPolicy` is a function that takes an `RetryStatus` and
 * possibly returns a delay in milliseconds. Iteration numbers start
 * at zero and increase by one on each retry. A *None* return value from
 * the function implies we have reached the retry limit.
 */
export interface RetryPolicy {
  (status: RetryStatus): O.Option<number>
}

export interface RetryStatus {
  /** Iteration number, where `0` is the first try */
  iterNumber: number
  /** Delay incurred so far from retries */
  cumulativeDelay: number
  /** Latest attempt's delay. Will always be `none` on first run. */
  previousDelay: O.Option<number>
}

function withPolicy(
  policy: RetryPolicy
): <S, R, E, A>(_: T.Effect<S, R, E, A>) => T.AsyncRE<R, E, A> {
  return (_) =>
    retrying(
      T.pure(policy),
      () => _,
      (ex) => T.pure(ex._tag !== "Done")
    )
}

function withPolicy_<S, R, E, A>(
  policy: RetryPolicy,
  _: T.Effect<S, R, E, A>
): T.AsyncRE<R, E, A> {
  return retrying(
    T.pure(policy),
    () => _,
    (ex) => T.pure(ex._tag !== "Done")
  )
}

function withPolicyM<S1, R1, E1>(
  policy: T.Effect<S1, R1, E1, RetryPolicy>
): <S, R, E, A>(_: T.Effect<S, R, E, A>) => T.AsyncRE<R & R1, E | E1, A> {
  return (_) =>
    retrying(
      policy,
      () => _,
      (ex) => T.pure(ex._tag !== "Done")
    )
}

function withPolicyM_<S1, R1, E1, S, R, E, A>(
  policy: T.Effect<S1, R1, E1, RetryPolicy>,
  _: T.Effect<S, R, E, A>
): T.AsyncRE<R & R1, E | E1, A> {
  return retrying(
    policy,
    () => _,
    (ex) => T.pure(ex._tag !== "Done")
  )
}

export {
  withPolicy as with,
  withPolicy_ as with_,
  withPolicyM as withM,
  withPolicyM_ as withM_
}
