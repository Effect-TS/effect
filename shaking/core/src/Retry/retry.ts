import { option as O, pipeable as P, function as F } from "fp-ts"
import {
  applyPolicy,
  defaultRetryStatus,
  RetryPolicy,
  RetryStatus,
  capDelay,
  constantDelay,
  exponentialBackoff,
  limitRetries,
  limitRetriesByDelay,
  monoidRetryPolicy
} from "retry-ts"

import {
  Async,
  pure,
  delay,
  AsyncRE,
  Effect,
  chain,
  result,
  completed
} from "../Effect"
import { Exit } from "../Exit"

export function applyAndDelay(
  policy: RetryPolicy,
  status: RetryStatus
): Async<RetryStatus> {
  const newStatus = applyPolicy(policy, status)
  return P.pipe(
    newStatus.previousDelay,
    O.fold(
      () => pure(newStatus),
      (millis) => delay(pure(newStatus), millis)
    )
  )
}

export function retrying<RP, EP, S, R, E, A, R2, E2>(
  policy: AsyncRE<RP, EP, RetryPolicy>,
  action: (status: RetryStatus) => Effect<S, R, E, A>,
  check: (ex: Exit<E, A>) => AsyncRE<R2, E2, boolean>
): AsyncRE<R & R2 & RP, E | E2 | EP, A> {
  const go = (status: RetryStatus): AsyncRE<R & R2 & RP, E | E2 | EP, A> =>
    P.pipe(
      status,
      F.flow(action, result),
      chain((a) =>
        P.pipe(
          check(a),
          chain((shouldRetry) =>
            shouldRetry
              ? P.pipe(
                  policy,
                  chain((p) => applyAndDelay(p, status)),
                  chain((status) =>
                    P.pipe(
                      status.previousDelay,
                      O.fold(
                        () => completed(a),
                        () => go(status)
                      )
                    )
                  )
                )
              : completed(a)
          )
        )
      )
    )

  return go(defaultRetryStatus)
}

export {
  applyPolicy,
  defaultRetryStatus,
  RetryPolicy,
  RetryStatus,
  capDelay,
  constantDelay,
  exponentialBackoff,
  limitRetries,
  limitRetriesByDelay,
  monoidRetryPolicy
}
