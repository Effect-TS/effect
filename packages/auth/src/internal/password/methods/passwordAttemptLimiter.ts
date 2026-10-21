import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import * as Schema from "effect/Schema"

import { defaultLayer } from "../../auth/defaults.ts"
import { boundedMemoryRateLimiter, localRateLimiter } from "../../auth/rateLimiter.ts"
import { PasswordRejected, PasswordUnavailable } from "./errors.ts"
import { PasswordAttemptPolicy } from "./policy.ts"

// Rejecting at capacity keeps active brute-force buckets; the action bucket,
// checked first, bounds how quickly new identifier keys can arrive.
const rateLimiterLayer = boundedMemoryRateLimiter("reject")

/** Password admission independent of credential persistence and KDF concurrency.
 * Each successful check consumes one token without refunds, including when later
 * password work fails. Buckets refill one token per windowMillis / limit; this
 * permits an initial burst and differs from a rolling-window attempt count.
 * Callers supply stable, server-derived keys and validated password policy.
 */
export class PasswordAttemptLimiter extends Context.Service<
  PasswordAttemptLimiter,
  {
    readonly check: (input: {
      readonly moduleId: string
      readonly action: "sign-in" | "change"
      readonly scope: "action" | "identifier" | "subject"
      readonly key: string
      readonly budget: { readonly limit: number; readonly windowMillis: number }
    }) => Effect.Effect<void, PasswordRejected | PasswordUnavailable>
  }
>()("@effect/auth/PasswordAttemptLimiter") {
  /** Uses a supplied Effect RateLimiter or RateLimiterStore before its default.
   * Default state is process-local, resets with the runtime, and holds at most
   * 10,000 keys. Entries become eligible for cleanup after a full refill window
   * without a check, including rejected checks; budget changes retain the longer
   * expiry. New-key pressure triggers cleanup. Active buckets are never evicted;
   * a full store fails with PasswordUnavailable. No cleanup fiber runs. Supply
   * shared storage for limits coordinated across servers; the action bucket is
   * always process-local.
   */
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.RateLimiter
      const local = yield* localRateLimiter("reject")

      return PasswordAttemptLimiter.of({
        check: Effect.fnUntraced(function*({ moduleId, action, scope, key, budget }) {
          const policy = yield* Schema.decodeEffect(PasswordAttemptPolicy.fields.identifier)(
            budget
          ).pipe(Effect.mapError(() => PasswordUnavailable.make({})))

          yield* (scope === "action" ? local : limiter)
            .consume({
              key: `effect-auth:password-attempt:${JSON.stringify([moduleId, action, scope, key])}`,
              algorithm: "token-bucket",
              limit: policy.limit,
              window: Duration.millis(policy.windowMillis),
              tokens: 1,
              onExceeded: "fail"
            })
            .pipe(
              Effect.catchCause((cause) =>
                Effect.failCause(
                  Cause.map(cause, (error) =>
                    error.reason._tag === "RateLimitExceeded"
                      ? PasswordRejected.make({})
                      : PasswordUnavailable.make({}))
                )
              )
            )
        })
      })
    })
  ).pipe(Layer.provide(rateLimiterLayer))
}

/** @internal */
export const defaultPasswordAttemptLimiterLayer = defaultLayer(
  PasswordAttemptLimiter,
  PasswordAttemptLimiter.layer
)
