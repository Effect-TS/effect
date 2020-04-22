import * as T from "./effect";
import { option as O, pipeable as P, function as F } from "fp-ts";
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
} from "retry-ts";
import { Exit } from "./original/exit";

export function applyAndDelay(policy: RetryPolicy, status: RetryStatus): T.Async<RetryStatus> {
  const newStatus = applyPolicy(policy, status);
  return P.pipe(
    newStatus.previousDelay,
    O.fold(
      () => T.pure(newStatus),
      (millis) => T.delay(T.pure(newStatus), millis)
    )
  );
}

export function retrying<RP, EP, S, R, E, A, R2, E2>(
  policy: T.AsyncRE<RP, EP, RetryPolicy>,
  action: (status: RetryStatus) => T.Effect<S, R, E, A>,
  check: (ex: Exit<E, A>) => T.AsyncRE<R2, E2, boolean>
): T.AsyncRE<R & R2 & RP, E | E2 | EP, A> {
  const go = (status: RetryStatus): T.AsyncRE<R & R2 & RP, E | E2 | EP, A> =>
    P.pipe(
      status,
      F.flow(action, T.result),
      T.chain((a) =>
        P.pipe(
          check(a),
          T.chain((shouldRetry) =>
            shouldRetry
              ? P.pipe(
                  policy,
                  T.chain((p) => applyAndDelay(p, status)),
                  T.chain((status) =>
                    P.pipe(
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
    );

  return go(defaultRetryStatus);
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
};
