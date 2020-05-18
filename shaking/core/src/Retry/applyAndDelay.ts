import * as T from "../Effect"
import * as O from "../Option"
import { pipe } from "../Pipe"

import { RetryPolicy } from "./RetryPolicy"
import { RetryStatus } from "./RetryStatus"
import { applyPolicy } from "./applyPolicy"

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
