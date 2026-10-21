import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RateLimiter from "effect/persistence/RateLimiter"

import { defaultLayer } from "../auth/defaults.ts"
import { boundedMemoryRateLimiter, localRateLimiter } from "../auth/rateLimiter.ts"
import type { ProofAbuseScope } from "./abuse.ts"
import { ProofIngressDenied, ProofUnavailable } from "./errors.ts"
import type { ProofAbusePolicy, ProofBudget } from "./policy.ts"

/** Every schema-valid issue/candidate attempt spends action, identifier and
 * known-subject token buckets, including unknown targets, suppressed issuance and
 * malformed candidate secrets. Host ingress separately limits malformed requests.
 * No refunds.
 * Defaults retain up to 10,000 active buckets and fail closed at capacity. Supply
 * a shared RateLimiterStore for coordination across replicas and restarts; action
 * buckets are always process-local. */
export class ProofLimiter extends Context.Service<
  ProofLimiter,
  {
    readonly check: (input: {
      readonly kind: "issue" | "attempt"
      readonly scope: ProofAbuseScope
      readonly policy: ProofAbusePolicy
    }) => Effect.Effect<void, ProofIngressDenied | ProofUnavailable>
  }
>()("@effect/auth/ProofLimiter") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function*() {
      const shared = yield* RateLimiter.RateLimiter
      const local = yield* localRateLimiter("reject")

      const consume = (
        bucket: "action" | "identifier" | "subject",
        key: ReadonlyArray<string>,
        budget: ProofBudget
      ) =>
        (bucket === "action" ? local : shared)
          .consume({
            key: JSON.stringify(["effect-auth/proof", ...key]),
            algorithm: "token-bucket",
            limit: budget.limit,
            window: Duration.millis(budget.windowMillis),
            onExceeded: "fail"
          })
          .pipe(
            Effect.asVoid,
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error.reason._tag === "RateLimitExceeded"
                    ? ProofIngressDenied.make({})
                    : ProofUnavailable.make({}))
              )
            )
          )

      return ProofLimiter.of({
        check: Effect.fn("ProofLimiter.check")(function*({ kind, scope, policy }) {
          const base = [scope.moduleId, scope.purpose, kind]

          yield* consume(
            "action",
            [...base, "action"],
            kind === "issue" ? policy.actionIssues : policy.actionAttempts
          )
          yield* consume(
            "identifier",
            [...base, "identifier", scope.identifier.namespace, scope.identifier.value],
            kind === "issue" ? policy.issues : policy.attempts
          )
          if (scope.subjectId !== undefined) {
            yield* consume(
              "subject",
              [...base, "subject", scope.subjectId],
              kind === "issue" ? policy.subjectIssues : policy.subjectAttempts
            )
          }
        })
      })
    })
  ).pipe(Layer.provide(boundedMemoryRateLimiter("reject")))
}

/** @internal */
export const defaultProofLimiterLayer = defaultLayer(ProofLimiter, ProofLimiter.layer)
