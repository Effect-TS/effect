import { Monoid, getFunctionMonoid } from "../Monoid"
import { getApplyMonoid } from "../Option"
import { ordNumber } from "../Ord"
import { getJoinSemigroup } from "../Semigroup"

import type { RetryPolicy } from "./RetryPolicy"
import type { RetryStatus } from "./RetryStatus"

/**
 * 'RetryPolicy' is a 'Monoid'. You can collapse multiple strategies into one using 'concat'.
 * The semantics of this combination are as follows:
 *
 * 1. If either policy returns 'None', the combined policy returns
 * 'None'. This can be used to inhibit after a number of retries,
 * for example.
 *
 * 2. If both policies return a delay, the larger delay will be used.
 * This is quite natural when combining multiple policies to achieve a
 * certain effect.
 *
 * @example
 * import { monoidRetryPolicy, exponentialBackoff, limitRetries } from 'retry-ts'
 *
 * // One can easily define an exponential backoff policy with a limited
 * // number of retries:
 * export const limitedBackoff = monoidRetryPolicy.concat(exponentialBackoff(50), limitRetries(5))
 *
 * @since 0.1.0
 */
export const monoidRetryPolicy: Monoid<RetryPolicy> = getFunctionMonoid(
  getApplyMonoid({
    ...getJoinSemigroup(ordNumber),
    empty: 0
  })
)<RetryStatus>()
