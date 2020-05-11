import type { Option } from "../Option/Option"

/**
 * @since 0.1.0
 */
export interface RetryStatus {
  /** Iteration number, where `0` is the first try */
  iterNumber: number
  /** Delay incurred so far from retries */
  cumulativeDelay: number
  /** Latest attempt's delay. Will always be `none` on first run. */
  previousDelay: Option<number>
}
