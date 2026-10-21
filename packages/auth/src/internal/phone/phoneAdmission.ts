import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import * as Schema from "effect/Schema"

import { defaultLayer } from "../auth/defaults.ts"
import { boundedMemoryRateLimiter, localRateLimiter } from "../auth/rateLimiter.ts"
import { PhoneAdmissionPolicy, PhoneConfigurationError } from "./lifecycleModels.ts"
import { PhoneOtpUnavailable } from "./models.ts"

export const defaultPhoneAdmissionPolicy: PhoneAdmissionPolicy = {
  windowMillis: 60_000,
  networkRequests: 10,
  networkAttempts: 100,
  maximumMessages: 10
}

/** Charge every network request/attempt and each request's global message budget,
 * including suppressed recipients. No replay receipts or refunds. Defaults use
 * bounded process-local token buckets that retain active entries and fail closed
 * at capacity; supply a shared RateLimiterStore across replicas. The global message
 * budget is always process-local. */
export class PhoneAdmission extends Context.Service<
  PhoneAdmission,
  {
    readonly admit: (input: {
      readonly moduleId: string
      readonly action: "request" | "attempt"
      readonly networkKey: string
    }) => Effect.Effect<boolean, PhoneOtpUnavailable>
  }
>()("@effect/auth/PhoneAdmission") {
  static readonly layer = (options: PhoneAdmissionPolicy = defaultPhoneAdmissionPolicy) =>
    Layer.effect(
      this,
      Effect.gen(function*() {
        const policy = yield* Schema.decodeEffect(PhoneAdmissionPolicy)(options).pipe(
          Effect.mapError(() => PhoneConfigurationError.make({}))
        )

        const shared = yield* RateLimiter.RateLimiter
        const local = yield* localRateLimiter("reject")

        const consume = (
          bucket: "network" | "messages",
          key: ReadonlyArray<string>,
          limit: number
        ) =>
          (bucket === "messages" ? local : shared).consume({
            key: JSON.stringify(["effect-auth/phone", ...key]),
            algorithm: "token-bucket",
            limit,
            window: Duration.millis(policy.windowMillis),
            onExceeded: "fail"
          })

        return PhoneAdmission.of({
          admit: Effect.fnUntraced(
            function*({ moduleId, action, networkKey }) {
              yield* consume(
                "network",
                [moduleId, "network", action, networkKey],
                action === "request" ? policy.networkRequests : policy.networkAttempts
              )
              if (action === "request") {
                yield* consume("messages", [moduleId, "messages"], policy.maximumMessages)
              }

              return true
            },
            Effect.catchCause((cause) =>
              cause.reasons.every(
                  (reason) => Cause.isFailReason(reason) && reason.error.reason._tag === "RateLimitExceeded"
                )
                ? Effect.succeed(false)
                : Effect.failCause(Cause.map(cause, () => PhoneOtpUnavailable.make({})))
            )
          )
        })
      })
    ).pipe(Layer.provide(boundedMemoryRateLimiter("reject")))
}

/** @internal */
export const defaultPhoneAdmissionLayer = defaultLayer(PhoneAdmission, PhoneAdmission.layer())
