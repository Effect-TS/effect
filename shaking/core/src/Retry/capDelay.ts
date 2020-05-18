import * as O from "../Option"
import { pipe } from "../Pipe"

import { RetryPolicy } from "./RetryPolicy"

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
