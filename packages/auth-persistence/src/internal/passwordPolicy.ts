import type { LoginIdentifier } from "@effect/auth/Identity"
import { AuthenticationClock } from "@effect/auth/Operations"
import {
  type PasswordAction,
  type PasswordCredentialSnapshot,
  type PasswordMutationInput,
  PasswordUnavailable,
  snapshotPasswordCredential,
  snapshotPasswordRequirement,
  snapshotPasswordRevision
} from "@effect/auth/Password"
import type { ProofRedemptionPlan } from "@effect/auth/Proofs"
import {
  type AuthenticationEvidence,
  type AuthenticationRequirement,
  type SecurityRevision,
  snapshotAuthenticationEvidence
} from "@effect/auth/Sessions"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"

import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyProofPersistenceMapping } from "./models/proofModel.ts"

const unavailable = () => PasswordUnavailable.make({})

/** @internal */
export const samePasswordIdentifier = (left: LoginIdentifier, right: LoginIdentifier) =>
  left.namespace === right.namespace && left.value === right.value

/** @internal */
export const samePasswordCredential = (
  left: PasswordCredentialSnapshot,
  right: PasswordCredentialSnapshot
) =>
  left.moduleId === right.moduleId &&
  left.revision.subjectId === right.revision.subjectId &&
  left.revision.securityRevision === right.revision.securityRevision &&
  left.credentialId === right.credentialId &&
  left.credentialRevision === right.credentialRevision &&
  left.verifierVersion === right.verifierVersion &&
  left.normalization === right.normalization &&
  left.identifierVerifiedAtMillis === right.identifierVerifiedAtMillis &&
  left.revision.credentials.length === right.revision.credentials.length &&
  left.revision.credentials.every((entry) =>
    right.revision.credentials.some(
      (other) => other.credentialId === entry.credentialId && other.revision === entry.revision
    )
  ) &&
  left.identifierBindingRevision === right.identifierBindingRevision &&
  samePasswordIdentifier(left.identifier, right.identifier) &&
  Redacted.value(left.verifier) === Redacted.value(right.verifier)

/** @internal */
export const passwordEvidenceSatisfiedAt = Effect.fnUntraced(function*(
  evidence: AuthenticationEvidence,
  requirement: AuthenticationRequirement,
  now: number
): Effect.fn.Return<boolean> {
  const { futureToleranceMillis } = yield* AuthenticationClock

  if (evidence.proofs.length > 64 || evidence.revision.credentials.length > 64) return false
  const revisions = new Map<string, string>()

  for (const item of evidence.revision.credentials) {
    if (revisions.has(item.credentialId)) return false
    revisions.set(item.credentialId, item.revision)
  }
  if (evidence.proofs.some((proof) => !revisions.has(proof.credentialId))) return false
  if (
    evidence.proofs.some(
      (proof) => DateTime.toEpochMillis(proof.verifiedAt) - now > futureToleranceMillis
    )
  ) {
    return false
  }

  const eligible = evidence.proofs.filter((proof) => {
    const age = Math.max(0, now - DateTime.toEpochMillis(proof.verifiedAt))

    return age < requirement.maximumAgeMillis
  })

  const factors = new Set(eligible.flatMap((proof) => proof.factors))
  const credentials = new Set(eligible.map((proof) => proof.credentialId))

  return requirement.alternatives.some(
    (alternative) =>
      alternative.factors.every((factor) => factors.has(factor)) &&
      credentials.size >= alternative.minimumCredentials &&
      eligible.some(
        (proof) =>
          (!alternative.userVerified || proof.userVerified) &&
          (!alternative.phishingResistant || proof.phishingResistant)
      )
  )
})

/** @internal */
export const snapshotPasswordMutation = Effect.fnUntraced(
  function*(input: PasswordMutationInput) {
    const expectedRevision = snapshotPasswordRevision(input.expectedRevision)

    const evidence = yield* snapshotAuthenticationEvidence(input.authorization.evidence).pipe(
      Effect.mapError(unavailable)
    )

    const requirement = yield* snapshotPasswordRequirement(input.authorization.requirement)

    const credential = input.credential === undefined
      ? undefined
      : yield* snapshotPasswordCredential(input.credential)

    return Object.freeze({
      ...input,
      expectedRevision,
      replacement: Object.freeze({
        verifier: Redacted.make(Redacted.value(input.replacement.verifier)),
        normalization: input.replacement.normalization
      }),
      invalidation: Object.freeze({ ...input.invalidation }),
      ...(credential === undefined ? {} : { credential }),
      authorization: Object.freeze({
        challenge: Object.freeze({
          ...input.authorization.challenge,
          revision: snapshotPasswordRevision(input.authorization.challenge.revision)
        }),
        evidence,
        requirement
      })
    })
  }
)

/** @internal */
export const passwordProofRedemptionMatches = (
  input: PasswordMutationInput & { readonly redemption: ProofRedemptionPlan }
) => {
  const completion = input.redemption.input
  const binding = completion.binding

  if (
    completion.moduleId !== `${input.moduleId}/reset` ||
    completion.purpose !== "password-reset" ||
    binding._tag !== "Subject" ||
    input.credential === undefined ||
    binding.revision.subjectId !== input.expectedRevision.subjectId ||
    binding.revision.securityRevision !== input.expectedRevision.securityRevision ||
    !samePasswordIdentifier(binding.identifier, input.credential.identifier)
  ) {
    return false
  }

  const expected = [...input.expectedRevision.credentials].sort((left, right) =>
    left.credentialId.localeCompare(right.credentialId)
  )

  const actual = [...binding.revision.credentials].sort((left, right) =>
    left.credentialId.localeCompare(right.credentialId)
  )

  return (
    expected.length === actual.length &&
    expected.every(
      (item, index) =>
        item.credentialId === actual[index]!.credentialId &&
        item.revision === actual[index]!.revision
    )
  )
}

/** @internal */
export interface PasswordWorkflowPolicy {
  readonly allocateCredentialId?: Effect.Effect<string, PersistenceMappingError>
  readonly allocateCredentialIdSync?: () => string
  readonly allocateRevision?: Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly allocateRevisionSync?: () => SecurityRevision
  readonly subject: {
    readonly nextSecurityRevision?: (
      current: SecurityRevision
    ) => Effect.Effect<SecurityRevision, PersistenceMappingError>
    readonly nextSecurityRevisionSync?: (current: SecurityRevision) => SecurityRevision
  }
  readonly sessionInvalidation: "same-authority-immediate" | "original-absolute-expiry"
}

/** @internal */
export interface PasswordWorkflowOptions {
  readonly mode: "interactive" | "synchronous"
  readonly locking: boolean
  readonly coordinated?: boolean
  readonly standaloneGuard: Effect.Effect<void, PasswordUnavailable>
  readonly proof?: AnyProofPersistenceMapping
}

/** @internal */
export const allocatePasswordValue = <A>(
  mode: PasswordWorkflowOptions["mode"],
  asynchronous: Effect.Effect<A, PersistenceMappingError> | undefined,
  synchronous: (() => A) | undefined
): Effect.Effect<A, PasswordUnavailable | PersistenceMappingError> =>
  mode !== "synchronous" && asynchronous !== undefined
    ? asynchronous
    : synchronous === undefined
    ? Effect.fail(unavailable())
    : Effect.try({
      try: synchronous,
      catch: (cause) => PersistenceMappingError.make({ operation: "mapping", cause })
    })

/** @internal */
export const allocatePasswordNextSecurityRevision = (
  policy: PasswordWorkflowPolicy,
  mode: PasswordWorkflowOptions["mode"],
  current: SecurityRevision
) =>
  allocatePasswordValue(
    mode,
    policy.subject.nextSecurityRevision?.(current) ?? policy.allocateRevision,
    policy.subject.nextSecurityRevisionSync === undefined
      ? policy.allocateRevisionSync
      : () => policy.subject.nextSecurityRevisionSync!(current)
  )

/** @internal */
export const passwordMutationEvidenceMatches = (input: PasswordMutationInput) =>
  !input.expectedRevision.credentials.some(
    (expected) =>
      !input.authorization.evidence.revision.credentials.some(
        (actual) => actual.credentialId === expected.credentialId && actual.revision === expected.revision
      )
  )

/** @internal */
export const validatePasswordMutation = Effect.fnUntraced(function*(
  policy: PasswordWorkflowPolicy,
  input: PasswordMutationInput,
  action: PasswordAction,
  current: Pick<
    PasswordMutationRead,
    "subject" | "identifierCurrent" | "credentials" | "snapshot" | "requirement"
  >,
  now: number
) {
  if (
    current.subject === undefined ||
    !current.subject.active ||
    current.subject.securityRevision !== input.expectedRevision.securityRevision
  ) {
    return undefined
  }
  const { challenge, evidence } = input.authorization

  if (
    challenge.moduleId !== input.moduleId ||
    challenge.action !== action ||
    challenge.commandId !== input.commandId ||
    challenge.revision.subjectId !== input.expectedRevision.subjectId ||
    challenge.revision.securityRevision !== input.expectedRevision.securityRevision ||
    (evidence.flowId as string) !== (input.commandId as string) ||
    evidence.bindingDigest !== challenge.bindingDigest ||
    evidence.revision.subjectId !== input.expectedRevision.subjectId ||
    evidence.revision.securityRevision !== input.expectedRevision.securityRevision ||
    (action === "add-password" &&
      (input.credential !== undefined || challenge.targetCredentialId !== undefined))
  ) {
    return undefined
  }
  if (!passwordMutationEvidenceMatches(input)) return undefined
  if (input.credential !== undefined && !current.identifierCurrent) return undefined

  const expected = new Map(
    [...input.expectedRevision.credentials, ...evidence.revision.credentials].map((item) => [
      item.credentialId,
      item
    ])
  )

  if (current.credentials.length !== expected.size) return undefined
  for (const credential of current.credentials) {
    const wanted = expected.get(credential.credentialId)

    if (wanted === undefined || credential.revision !== wanted.revision || !credential.active) {
      return undefined
    }
    expected.delete(wanted.credentialId)
  }
  if (expected.size !== 0) return undefined
  if (input.credential !== undefined) {
    const snapshot = yield* current.snapshot

    if (snapshot === undefined || !samePasswordCredential(snapshot, input.credential)) {
      return undefined
    }
  }
  const requirement = yield* current.requirement

  if (
    !(yield* passwordEvidenceSatisfiedAt(evidence, input.authorization.requirement, now)) ||
    !(yield* passwordEvidenceSatisfiedAt(evidence, requirement, now))
  ) {
    return undefined
  }
  if (
    input.invalidation.existingSessions === "immediate" &&
    policy.sessionInvalidation !== "same-authority-immediate"
  ) {
    return undefined
  }

  return now
})

/**
 * Decoded subject-first snapshot used only for this action's policy decision.
 *
 * @internal
 */
export interface PasswordMutationRead {
  readonly subject:
    | { readonly active: boolean; readonly securityRevision: SecurityRevision }
    | undefined
  readonly identifierCurrent: boolean
  readonly credentials: ReadonlyArray<{
    readonly credentialId: string
    readonly revision: SecurityRevision
    readonly active: boolean
  }>
  readonly snapshot: Effect.Effect<
    PasswordCredentialSnapshot | undefined,
    PasswordUnavailable | PersistenceMappingError
  >
  readonly requirement: Effect.Effect<
    AuthenticationRequirement,
    PasswordUnavailable | PersistenceMappingError
  >
}
