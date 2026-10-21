import * as Schema from "effect/Schema"

import type { SessionCapabilities } from "./models.ts"
import type { SessionPolicy } from "./policy.ts"

export const SessionInvalidationTrigger = Schema.Literals([
  "password-reset",
  "factor-reset",
  "credential-change",
  "subject-disable",
  "subject-delete",
  "identifier-change",
  "all-session-revocation"
])

export type SessionInvalidationTrigger = typeof SessionInvalidationTrigger.Type

export const SessionInvalidationWindow = Schema.Struct({
  trigger: SessionInvalidationTrigger,
  existingSessions: Schema.Literals(["immediate", "cache-expiry", "original-absolute-expiry"]),
  maximumExposureMillis: Schema.Natural,
  oldAuthenticationEvidence: Schema.Literal("rejected")
})

export type SessionInvalidationWindow = typeof SessionInvalidationWindow.Type

/**
 * Report only AFTER the consumer commits the mutation and security-revision bump
 * in the same authority. Disable/delete also prevent fresh issuance; a reset
 * permits fresh verification using the replacement credential. Pure stateless
 * renewal preserves each old token's absolute bound and may replay until then.
 */
export const sessionInvalidationWindow = (
  trigger: SessionInvalidationTrigger,
  capabilities: SessionCapabilities,
  policy: SessionPolicy
): SessionInvalidationWindow => ({
  trigger,
  existingSessions: capabilities.subjectInvalidation === "immediate"
    ? capabilities.positiveCacheMillis === 0
      ? "immediate"
      : "cache-expiry"
    : "original-absolute-expiry",
  maximumExposureMillis: capabilities.subjectInvalidation === "immediate"
    ? capabilities.positiveCacheMillis
    : policy.maximumIssuedAbsoluteLifetimeMillis,
  oldAuthenticationEvidence: "rejected"
})
