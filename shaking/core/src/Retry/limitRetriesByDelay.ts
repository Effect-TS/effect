import * as O from "../Option"
import { pipe } from "../Pipe"

import type { RetryPolicy } from "./RetryPolicy"

/**
 * Add an upperbound to a policy such that once the given time-delay
 * amount *per try* has been reached or exceeded, the policy will stop
 * retrying and fail.
 *
 * @since 0.1.0
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
