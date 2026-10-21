import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { ProofConfigurationError } from "./errors.ts"

const Positive = Schema.Int.check(Schema.isGreaterThan(0))
const Millis = Positive.check(Schema.isLessThanOrEqualTo(2592000000))

export const ProofBudget = Schema.Struct({
  limit: Positive.check(Schema.isLessThanOrEqualTo(1000000)),
  windowMillis: Millis
})

export type ProofBudget = typeof ProofBudget.Type

export const ProofAbusePolicy = Schema.Struct({
  /** Charge every issue request, including suppression and repeated requests. */
  issues: ProofBudget,
  attempts: ProofBudget,
  /** Shared subject buckets are independent of code, flow and request IDs. */
  subjectIssues: ProofBudget,
  subjectAttempts: ProofBudget,
  /** Global issuance limit; host ingress separately covers every request and network. */
  actionIssues: ProofBudget,
  /** Attempt limits also cover unknown subjects and rotating identifiers. */
  actionAttempts: ProofBudget,
  resendCooldownMillis: Schema.Natural
})

export type ProofAbusePolicy = typeof ProofAbusePolicy.Type

export const ProofPolicy = Schema.Struct({
  lifetimeMillis: Millis,
  maximumFailedAttempts: Positive.check(Schema.isLessThanOrEqualTo(100)),
  abuse: ProofAbusePolicy
})

export type ProofPolicy = typeof ProofPolicy.Type

export const validateProofPolicy = Effect.fnUntraced(function*(input: ProofPolicy) {
  const policy = yield* Schema.decodeEffect(ProofPolicy)(input).pipe(
    Effect.mapError(() => ProofConfigurationError.make({ reason: "policy" }))
  )

  if (policy.abuse.resendCooldownMillis >= policy.lifetimeMillis) {
    return yield* ProofConfigurationError.make({ reason: "policy" })
  }

  return Object.freeze({
    ...policy,
    abuse: Object.freeze({
      ...policy.abuse,
      issues: Object.freeze(policy.abuse.issues),
      attempts: Object.freeze(policy.abuse.attempts),
      subjectIssues: Object.freeze(policy.abuse.subjectIssues),
      subjectAttempts: Object.freeze(policy.abuse.subjectAttempts),
      actionIssues: Object.freeze(policy.abuse.actionIssues),
      actionAttempts: Object.freeze(policy.abuse.actionAttempts)
    })
  })
})

/** Default proof lifetimes and abuse limits. Enforcement remains server-side. */
export const defaultProofPolicy: ProofPolicy = {
  lifetimeMillis: 300_000,
  maximumFailedAttempts: 5,
  abuse: {
    issues: { limit: 5, windowMillis: 3_600_000 },
    attempts: { limit: 10, windowMillis: 300_000 },
    subjectIssues: { limit: 5, windowMillis: 3_600_000 },
    subjectAttempts: { limit: 10, windowMillis: 300_000 },
    actionIssues: { limit: 1000, windowMillis: 3_600_000 },
    actionAttempts: { limit: 1000, windowMillis: 300_000 },
    resendCooldownMillis: 30_000
  }
}
