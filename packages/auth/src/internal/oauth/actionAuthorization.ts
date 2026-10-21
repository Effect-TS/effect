import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"

import { AuthenticationClock } from "../operations/clock.ts"
import type { AuthInvocation } from "../operations/context.ts"
import { assessAuthentication } from "../sessions/assurance.ts"
import { AuthenticationEvidence, AuthenticationFlowId, type AuthenticationRequirement } from "../sessions/models.ts"
import { type OAuthActionChallenge, OAuthActionRequired, type OAuthActionSource } from "./accountsModels.ts"

/**
 * The application returns real private evidence. Public assurance ordinals never
 * become credential IDs. A retained authorization keeps this original deadline.
 *
 * @internal
 */
export const authorizeOAuthEvidence = Effect.fnUntraced(function*(
  invocation: AuthInvocation,
  challenge: Pick<OAuthActionChallenge, "revision" | "flowId" | "bindingDigest">,
  grant: {
    readonly source: OAuthActionSource
    readonly evidence: AuthenticationEvidence
    readonly requirement: AuthenticationRequirement
  },
  maximumAgeMillis: number
) {
  const now = DateTime.toEpochMillis(yield* DateTime.now)
  const { futureToleranceMillis } = yield* AuthenticationClock

  const requirement = {
    ...grant.requirement,
    maximumAgeMillis: Math.min(maximumAgeMillis, grant.requirement.maximumAgeMillis)
  }

  const evidence = grant.evidence
  const expected = challenge.revision

  if (
    invocation._tag !== "Authenticated" ||
    invocation.subjectId !== expected.subjectId ||
    evidence.flowId !== AuthenticationFlowId.make(challenge.flowId) ||
    evidence.bindingDigest !== challenge.bindingDigest ||
    evidence.revision.subjectId !== expected.subjectId ||
    evidence.revision.securityRevision !== expected.securityRevision ||
    new Set(expected.credentials.map((value) => value.credentialId)).size !==
      expected.credentials.length ||
    evidence.revision.credentials.length !== expected.credentials.length ||
    expected.credentials.some(
      (a) =>
        !evidence.revision.credentials.some(
          (b) => a.credentialId === b.credentialId && a.revision === b.revision
        )
    )
  ) {
    return yield* OAuthActionRequired.make({})
  }

  let validUntilMillis = now + requirement.maximumAgeMillis

  if (grant.source._tag === "Session") {
    const authenticatedAt = DateTime.toEpochMillis(grant.source.authenticatedAt)

    if (
      invocation.sessionId !== grant.source.sessionId ||
      DateTime.toEpochMillis(invocation.assurance.authenticatedAt) !== authenticatedAt ||
      authenticatedAt - now > futureToleranceMillis ||
      Math.max(0, now - authenticatedAt) >= requirement.maximumAgeMillis
    ) {
      return yield* OAuthActionRequired.make({})
    }
    validUntilMillis = Math.min(validUntilMillis, authenticatedAt + requirement.maximumAgeMillis)
  }
  if (
    evidence.proofs.some(
      (proof) => DateTime.toEpochMillis(proof.verifiedAt) - now > futureToleranceMillis
    )
  ) {
    return yield* OAuthActionRequired.make({})
  }

  // A step-up can retain older, unused provenance. Only fresh proofs may satisfy
  // this action; preserve their timestamps and the complete captured revision.
  const [first, ...rest] = evidence.proofs.filter(
    (proof) => Math.max(0, now - DateTime.toEpochMillis(proof.verifiedAt)) < requirement.maximumAgeMillis
  )

  if (first === undefined) return yield* OAuthActionRequired.make({})
  const accepted = AuthenticationEvidence.make({ ...evidence, proofs: [first, ...rest] })

  for (const proof of accepted.proofs) {
    validUntilMillis = Math.min(
      validUntilMillis,
      DateTime.toEpochMillis(proof.verifiedAt) + requirement.maximumAgeMillis
    )
  }

  if (
    validUntilMillis <= now ||
    !(yield* assessAuthentication(accepted, requirement).pipe(
      Effect.mapError(() => OAuthActionRequired.make({}))
    )).satisfied
  ) {
    return yield* OAuthActionRequired.make({})
  }

  return { source: grant.source, evidence: accepted, requirement, validUntilMillis }
})
