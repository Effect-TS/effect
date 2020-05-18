import * as O from "../Option"

import { RetryStatus } from "./RetryStatus"

/**
 * Initial, default retry status. Exported mostly to allow user code
 * to test their handlers and retry policies.
 */
export const defaultRetryStatus: RetryStatus = {
  iterNumber: 0,
  cumulativeDelay: 0,
  previousDelay: O.none
}
