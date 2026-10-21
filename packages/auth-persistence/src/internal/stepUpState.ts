import { AuthenticationAssurance, AuthenticationClock } from "@effect/auth/Operations"
import {
  AuthenticationEvidence,
  AuthenticationProof,
  SessionMetadata,
  type SessionStepUpCompletionPlan,
  SessionStepUpIntent,
  SessionStepUpInvalid,
  SessionStepUpRequirement,
  SessionUnavailable
} from "@effect/auth/Sessions"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { assessSessionAt, sameSessionRevision } from "./sessionNativeState.ts"

/** @internal */
export const stepUpIntentCodec = Schema.fromJsonString(SessionStepUpIntent)
const BoundedSnapshot = Schema.String.check(Schema.isMaxLength(131072))

/** @internal */
export const encodeStepUpIntent = (intent: SessionStepUpIntent) =>
  Schema.encodeEffect(stepUpIntentCodec)(intent).pipe(
    Effect.flatMap(Schema.decodeEffect(BoundedSnapshot)),
    Effect.mapError(() => SessionUnavailable.make({}))
  )

/** @internal */
export const decodeStepUpIntent = (snapshot: string) =>
  Schema.decodeEffect(BoundedSnapshot)(snapshot).pipe(
    Effect.flatMap(Schema.decodeEffect(stepUpIntentCodec)),
    Effect.mapError(() => SessionUnavailable.make({}))
  )

/** @internal */
export const stepUpIntentLive = Effect.fnUntraced(function*(
  intent: Omit<SessionStepUpIntent, "version">,
  kind: SessionStepUpIntent["sourceKind"],
  now: DateTime.Utc
): Effect.fn.Return<boolean> {
  const { futureToleranceMillis } = yield* AuthenticationClock

  const n = DateTime.toEpochMillis(now),
    authenticated = DateTime.toEpochMillis(intent.sourceAuthenticatedAt),
    idle = DateTime.toEpochMillis(intent.sourceExpiresAt),
    absolute = DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt),
    expires = DateTime.toEpochMillis(intent.expiresAt)

  return (
    intent.sourceKind === kind &&
    authenticated - n <= futureToleranceMillis &&
    authenticated < idle &&
    n < expires &&
    expires <= idle &&
    idle <= absolute
  )
})

const evidenceEncoding = Schema.encodeSync(Schema.fromJsonString(AuthenticationEvidence))
const requirementEncoding = Schema.encodeSync(Schema.fromJsonString(SessionStepUpRequirement))
const proofEncoding = Schema.encodeSync(Schema.fromJsonString(Schema.Array(AuthenticationProof)))

const assuranceEncoding = Schema.encodeSync(
  Schema.fromJsonString(SessionMetadata.fields.assurance)
)

/**
 * Validate core-owned plans before driver allocation/SQL expansion. No bearer or Claims decoding.
 *
 * @internal
 */
export const validateStepUpPlan = Effect.fnUntraced(function*<Claims>(
  plan: SessionStepUpCompletionPlan<Claims>
) {
  const { intent, source, replacement, evidence } = plan
  const original = source.inspection
  const issuedAt = DateTime.toEpochMillis(replacement.inspection.session.issuedAt)

  if (
    issuedAt < DateTime.toEpochMillis(original.session.issuedAt) ||
    evidence.proofs.some((proof) => DateTime.toEpochMillis(proof.verifiedAt) > issuedAt) ||
    issuedAt >= DateTime.toEpochMillis(replacement.inspection.session.expiresAt)
  ) {
    return yield* SessionStepUpInvalid.make({})
  }
  if (
    requirementEncoding(plan.profileRequirement) !== requirementEncoding(intent.requirement) ||
    replacement.inspection.session.subjectId !== evidence.revision.subjectId ||
    replacement.inspection.session.securityRevision !== evidence.revision.securityRevision ||
    intent.revision.credentials.some(
      (item) =>
        !evidence.revision.credentials.some(
          (actual) => actual.credentialId === item.credentialId && actual.revision === item.revision
        )
    )
  ) {
    return yield* SessionStepUpInvalid.make({})
  }
  if (
    intent.sourceKind !== source.guard._tag ||
    intent.sourceKind !== replacement._tag ||
    intent.sourceSessionId !== original.session.sessionId ||
    intent.sourceCredentialVersion !== original.credentialVersion ||
    !sameSessionRevision(intent.revision, original.provenance.evidence.revision) ||
    intent.revision.subjectId !== evidence.revision.subjectId ||
    intent.revision.securityRevision !== evidence.revision.securityRevision ||
    intent.flowId !== evidence.flowId ||
    intent.bindingDigest !== evidence.bindingDigest ||
    DateTime.toEpochMillis(intent.sourceAuthenticatedAt) !==
      DateTime.toEpochMillis(original.session.assurance.authenticatedAt) ||
    DateTime.toEpochMillis(intent.sourceExpiresAt) !==
      DateTime.toEpochMillis(original.session.expiresAt) ||
    DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt) !==
      DateTime.toEpochMillis(original.session.absoluteExpiresAt) ||
    DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt) !==
      DateTime.toEpochMillis(replacement.inspection.session.absoluteExpiresAt) ||
    evidenceEncoding(replacement.inspection.provenance.evidence) !== evidenceEncoding(evidence) ||
    proofEncoding(evidence.proofs.slice(0, original.provenance.evidence.proofs.length)) !==
      proofEncoding(original.provenance.evidence.proofs)
  ) {
    return yield* SessionStepUpInvalid.make({})
  }
  if (
    replacement._tag === "Stateful" &&
    (source.guard._tag !== "Stateful" ||
      source.guard.digest !== replacement.expectedDigest ||
      replacement.inspection.session.sessionId !== intent.sourceSessionId)
  ) {
    return yield* SessionStepUpInvalid.make({})
  }
  if (
    replacement._tag === "StateAssistedSigned" &&
    (replacement.tombstoneSessionId !== intent.sourceSessionId ||
      DateTime.toEpochMillis(replacement.tombstoneUntil) !==
        DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt))
  ) {
    return yield* SessionStepUpInvalid.make({})
  }
  if (
    replacement._tag !== "Stateful" &&
    replacement.inspection.session.sessionId === intent.sourceSessionId
  ) {
    return yield* SessionStepUpInvalid.make({})
  }

  const at = DateTime.toEpochMillis(plan.now)
  const base = yield* assessSessionAt(evidence, plan.baseRequirement, at)

  const profile = yield* assessSessionAt(evidence, plan.profileRequirement, at)

  // Freshness can change metadata at commit; validate the exact preparation snapshot here.
  if (
    !base.satisfied ||
    !profile.satisfied ||
    assuranceEncoding(
        AuthenticationAssurance.make({
          ...base.assurance,
          authenticatedAt: profile.assurance.authenticatedAt
        })
      ) !== assuranceEncoding(replacement.inspection.session.assurance)
  ) {
    return yield* SessionStepUpInvalid.make({})
  }
})
