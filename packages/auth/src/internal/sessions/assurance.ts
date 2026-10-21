import * as Array from "effect/Array"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { AuthenticationClock } from "../operations/clock.ts"
import { AuthenticationAssurance } from "../operations/context.ts"
import { PendingAuthenticationInvalid, SessionConfigurationError, StaleAuthentication } from "./errors.ts"
import { AuthenticationEvidence, AuthenticationRequirement, SessionAuthenticationProvenance } from "./models.ts"

const evidenceCodec = Schema.toCodecIso(AuthenticationEvidence)

const snapshotInstant = (value: DateTime.Utc) => {
  const instant = DateTime.makeUnsafe(DateTime.toEpochMillis(value))

  // DateTime.Utc caches parts lazily; populate before freezing the detached instant.
  Object.freeze(DateTime.toPartsUtc(instant))

  return Object.freeze(instant)
}

export const snapshotAuthenticationEvidence = Effect.fnUntraced(
  function*(evidence: AuthenticationEvidence) {
    // Bound Type input before schema projection allocates a detached proof graph.
    if (evidence.proofs.length > 64 || evidence.revision.credentials.length > 64) {
      return yield* StaleAuthentication.make({})
    }

    const projected = yield* Schema.encodeEffect(evidenceCodec)(evidence).pipe(
      Effect.flatMap(Schema.decodeEffect(evidenceCodec)),
      Effect.mapError(() => StaleAuthentication.make({}))
    )

    return Object.freeze({
      ...projected,
      revision: Object.freeze({
        ...projected.revision,
        credentials: Object.freeze(
          projected.revision.credentials.map((item) => Object.freeze({ ...item }))
        )
      }),
      proofs: Object.freeze(
        Array.map(projected.proofs, (proof) =>
          Object.freeze({
            ...proof,
            factors: Object.freeze([...proof.factors]),
            verifiedAt: snapshotInstant(proof.verifiedAt)
          }))
      ),
      ...(projected.completionExpiresAt === undefined
        ? {}
        : { completionExpiresAt: snapshotInstant(projected.completionExpiresAt) })
    })
  }
)

export const snapshotSessionAuthenticationProvenance = Effect.fnUntraced(function*(
  input: SessionAuthenticationProvenance
): Effect.fn.Return<SessionAuthenticationProvenance, StaleAuthentication> {
  if (input?.evidence?.proofs?.length > 64 || input?.evidence?.revision?.credentials?.length > 64) {
    return yield* StaleAuthentication.make({})
  }

  const projected = yield* Schema.decodeEffect(Schema.toType(SessionAuthenticationProvenance))(
    input
  ).pipe(Effect.mapError(() => StaleAuthentication.make({})))

  const ids = new Set(input.evidence.revision.credentials.map((item) => item.credentialId))

  if (
    ids.size !== input.evidence.revision.credentials.length ||
    input.evidence.proofs.some((proof) => !ids.has(proof.credentialId))
  ) {
    return yield* StaleAuthentication.make({})
  }

  const { revision, flowId, bindingDigest, proofs } = projected.evidence

  return Object.freeze({
    evidence: yield* snapshotAuthenticationEvidence({ revision, flowId, bindingDigest, proofs })
  })
})

/** Assess once at the supplied owner clock; ordinary callers use the current clock. */
export const assessAuthentication = Effect.fnUntraced(function*(
  input: AuthenticationEvidence,
  configured: AuthenticationRequirement,
  at?: DateTime.Utc
) {
  if (input.proofs.length > 64 || input.revision.credentials.length > 64) {
    return yield* StaleAuthentication.make({})
  }

  const evidence = yield* Schema.decodeEffect(Schema.toType(AuthenticationEvidence))(input).pipe(
    Effect.mapError(() => StaleAuthentication.make({}))
  )

  const requirement = yield* Schema.decodeEffect(AuthenticationRequirement)(configured).pipe(
    Effect.mapError(() => SessionConfigurationError.make({ reason: "pending-authentication" }))
  )

  const revisions = new Map<string, string>()

  for (const revision of evidence.revision.credentials) {
    if (revisions.has(revision.credentialId)) return yield* StaleAuthentication.make({})
    revisions.set(revision.credentialId, revision.revision)
  }
  if (evidence.proofs.some((proof) => !revisions.has(proof.credentialId))) {
    return yield* StaleAuthentication.make({})
  }
  const now = DateTime.toEpochMillis(at ?? (yield* DateTime.now))
  const { futureToleranceMillis } = yield* AuthenticationClock

  if (
    evidence.completionExpiresAt !== undefined &&
    now >= DateTime.toEpochMillis(evidence.completionExpiresAt)
  ) {
    return yield* StaleAuthentication.make({})
  }

  for (const proof of evidence.proofs) {
    if (DateTime.toEpochMillis(proof.verifiedAt) - now > futureToleranceMillis) {
      return yield* StaleAuthentication.make({})
    }
  }

  const fresh = evidence.proofs.filter(
    (proof) => Math.max(0, now - DateTime.toEpochMillis(proof.verifiedAt)) < requirement.maximumAgeMillis
  )

  if (fresh.length === 0) return yield* StaleAuthentication.make({})
  const factors = [...new Set(fresh.flatMap((proof) => proof.factors))]
  const credentials = new Set(fresh.map((proof) => proof.credentialId))

  const satisfied = requirement.alternatives.some(
    (alternative) =>
      alternative.factors.every((factor) => factors.includes(factor)) &&
      credentials.size >= alternative.minimumCredentials &&
      fresh.some(
        (proof) =>
          (!alternative.userVerified || proof.userVerified) &&
          (!alternative.phishingResistant || proof.phishingResistant)
      )
  )

  const first = fresh[0]

  const authenticatedAt = fresh.reduce(
    (oldest, proof) =>
      DateTime.toEpochMillis(proof.verifiedAt) < DateTime.toEpochMillis(oldest)
        ? proof.verifiedAt
        : oldest,
    first.verifiedAt
  )

  const ordinals = new Map<string, number>()

  for (const proof of evidence.proofs) {
    if (!ordinals.has(proof.credentialId)) ordinals.set(proof.credentialId, ordinals.size)
  }
  if (ordinals.size > 64) return yield* StaleAuthentication.make({})

  return {
    satisfied,
    assurance: AuthenticationAssurance.make({
      method: first.method,
      factors,
      authenticatedAt,
      evidence: Array.map(
        evidence.proofs,
        ({ method, credentialId, factors, userVerified, phishingResistant, verifiedAt }) => ({
          method,
          credentialOrdinal: ordinals.get(credentialId)!,
          factors,
          userVerified,
          phishingResistant,
          verifiedAt
        })
      )
    })
  }
})

/** Never refresh original proof timestamps or the revision captured before primary verification. */
export const combineAuthenticationEvidence = (
  original: AuthenticationEvidence,
  additional: AuthenticationEvidence
): Effect.Effect<AuthenticationEvidence, PendingAuthenticationInvalid> => {
  if (
    original.flowId !== additional.flowId ||
    original.bindingDigest !== additional.bindingDigest ||
    original.revision.subjectId !== additional.revision.subjectId ||
    original.revision.securityRevision !== additional.revision.securityRevision
  ) {
    return Effect.fail(PendingAuthenticationInvalid.make({}))
  }

  const revisions = new Map(
    original.revision.credentials.map((credential) => [credential.credentialId, credential])
  )

  for (const credential of additional.revision.credentials) {
    const previous = revisions.get(credential.credentialId)

    if (previous !== undefined && previous.revision !== credential.revision) {
      return Effect.fail(PendingAuthenticationInvalid.make({}))
    }
    revisions.set(credential.credentialId, credential)
  }

  const deadline = Math.min(
    original.completionExpiresAt === undefined
      ? Infinity
      : DateTime.toEpochMillis(original.completionExpiresAt),
    additional.completionExpiresAt === undefined
      ? Infinity
      : DateTime.toEpochMillis(additional.completionExpiresAt)
  )

  return Effect.succeed({
    ...original,
    ...(deadline === Infinity ? {} : { completionExpiresAt: DateTime.makeUnsafe(deadline) }),
    revision: { ...original.revision, credentials: [...revisions.values()] },
    proofs: [...original.proofs, ...additional.proofs]
  })
}
