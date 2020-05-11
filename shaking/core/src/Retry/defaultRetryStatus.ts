import type { RetryStatus } from "./RetryStatus"

/**
 * Initial, default retry status. Exported mostly to allow user code
 * to test their handlers and retry policies.
 *
 * @since 0.1.0
 */
export const defaultRetryStatus: RetryStatus = {
  iterNumber: 0,
  cumulativeDelay: 0,
  previousDelay: O.none
}
