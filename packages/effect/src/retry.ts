import * as T from "./effect";
import { option as O, pipeable as P, function as F } from "fp-ts";
import {
  applyPolicy,
  defaultRetryStatus,
  RetryPolicy,
  RetryStatus
} from "retry-ts";
import { Exit } from "./original/exit";

export function applyAndDelay(
  policy: RetryPolicy,
  status: RetryStatus
): T.UIO<RetryStatus> {
  const newStatus = applyPolicy(policy, status);
  return P.pipe(
    newStatus.previousDelay,
    O.fold(
      () => T.pure(newStatus),
      millis => T.delay(T.pure(newStatus), millis)
    )
  );
}

export function retrying<R, E, A, R2, E2>(
  policy: RetryPolicy,
  action: (status: RetryStatus) => T.Effect<R, E, A>,
  check: (ex: Exit<E, A>) => T.Effect<R2, E2, boolean>
): T.Effect<R & R2, E | E2, A> {
  const go = (status: RetryStatus): T.Effect<R & R2, E | E2, A> =>
    P.pipe(
      status,
      F.flow(action, T.result),
      T.chain(a =>
        P.pipe(
          check(a),
          T.chain(shouldRetry =>
            shouldRetry
              ? P.pipe(
                  applyAndDelay(policy, status),
                  T.chain(status =>
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
