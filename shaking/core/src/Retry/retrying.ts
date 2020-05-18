import * as T from "../Effect"
import { Exit } from "../Exit"
import { flow } from "../Function"
import * as O from "../Option"
import { pipe } from "../Pipe"

import { RetryPolicy } from "./RetryPolicy"
import { RetryStatus } from "./RetryStatus"
import { applyAndDelay } from "./applyAndDelay"
import { defaultRetryStatus } from "./defaultRetryStatus"

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
