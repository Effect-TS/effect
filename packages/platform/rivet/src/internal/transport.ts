/** @internal */
import { PersistenceError } from "effect/cluster/ClusterError"
import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

/**
 * The fields RivetKit sets on the error a failed action call rejects with.
 *
 * @internal
 */
export interface RivetErrorFields {
  readonly group?: unknown
  readonly code?: unknown
}

// Rivet codes that mean the action did not run, or ran on an actor that is
// going away. A persisted request is deduplicated by its request id, so these
// are safe to retry for it. `ups.consumer_closed` ("the operation may have
// executed") is the code a caller sees when the node dies mid-action.
const retryableCodes = new Set([
  "actor.stopping",
  "actor.starting",
  "actor.not_found",
  "actor.dropped_reply",
  "ups.consumer_closed"
])

/**
 * Whether a failed action call may be retried for an idempotent request.
 *
 * @internal
 */
export const isRetryable = (error: PersistenceError): boolean => {
  const cause = error.cause as RivetErrorFields | null | undefined
  if (typeof cause !== "object" || cause === null) return false
  if (cause.group === "guard") return true
  return retryableCodes.has(`${String(cause.group)}.${String(cause.code)}`)
}

/**
 * The Cloudflare bounded retry policy: a few quick attempts, then the caller
 * sees the typed error.
 *
 * @internal
 */
export const boundedRetry: Schedule.Schedule<unknown> = Schedule.max([
  Schedule.exponential(100, 2),
  Schedule.recurs(4)
])

/**
 * Calls one action on an entity actor. A rejection becomes a
 * `PersistenceError` carrying the RivetKit error as its cause. With `retry`,
 * the call is retried while the error is retryable; only pass it for
 * idempotent calls.
 *
 * @internal
 */
export const callActor = <A>(options: {
  readonly call: () => Promise<A>
  readonly retry?: Schedule.Schedule<unknown, PersistenceError> | undefined
}): Effect.Effect<A, PersistenceError> => {
  const attempt = Effect.tryPromise({
    try: options.call,
    catch: (cause) => new PersistenceError({ cause })
  })
  return options.retry === undefined
    ? attempt
    : Effect.retry(attempt, { schedule: options.retry, while: isRetryable })
}
