import {
  type EmailAction,
  type EmailAddressMutation,
  type EmailAddressTarget,
  EmailUnavailable,
  snapshotEmailCredential,
  snapshotEmailRequirement,
  snapshotEmailRevision
} from "@effect/auth/Email"
import type { LoginIdentifier } from "@effect/auth/Identity"
import {
  type AuthenticationRequirement,
  type AuthenticationRevision,
  type SecurityRevision,
  snapshotAuthenticationEvidence
} from "@effect/auth/Sessions"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"

import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyEmailAddressMapping } from "./models/emailModel.ts"
import { passwordEvidenceSatisfiedAt } from "./passwordPolicy.ts"

const unavailable = () => EmailUnavailable.make({})

const sameIdentifier = (left: LoginIdentifier, right: LoginIdentifier) =>
  left.namespace === right.namespace && left.value === right.value

/** @internal */
export type EmailWorkflowPolicy =
  & Pick<
    AnyEmailAddressMapping,
    | "allocateCredentialId"
    | "allocateCredentialIdSync"
    | "allocateRevision"
    | "allocateRevisionSync"
    | "sessionInvalidation"
    | "isIdentifierConflict"
    | "isCredentialConflict"
  >
  & {
    readonly subject: Pick<
      AnyEmailAddressMapping["subject"],
      "nextSecurityRevision" | "nextSecurityRevisionSync"
    >
  }

/** @internal */
export const sameEmailRevision = (left: AuthenticationRevision, right: AuthenticationRevision) => {
  if (
    left.subjectId !== right.subjectId ||
    left.securityRevision !== right.securityRevision ||
    left.credentials.length !== right.credentials.length
  ) {
    return false
  }

  const expected = [...left.credentials].sort((a, b) => a.credentialId.localeCompare(b.credentialId))

  const actual = [...right.credentials].sort((a, b) => a.credentialId.localeCompare(b.credentialId))

  return expected.every(
    (item, index) =>
      item.credentialId === actual[index]!.credentialId &&
      item.revision === actual[index]!.revision
  )
}

/** @internal */
export const emailActionModule = (moduleId: string, action: EmailAction) =>
  `${moduleId}/${action === "verify-address" ? "verify-address" : "change-address"}`

/** @internal */
export const emailActionPurpose = (action: EmailAction) =>
  action === "verify-address" ? "email-address-verification" : "email-address-change"

/** @internal */
export const emailRedemptionMatches = (input: EmailAddressMutation, action: EmailAction) => {
  const completion = input.redemption.input
  const binding = completion.binding

  return (
    completion.moduleId === emailActionModule(input.moduleId, action) &&
    completion.purpose === emailActionPurpose(action) &&
    binding._tag === "IdentifierChange" &&
    sameIdentifier(binding.identifier, input.target) &&
    sameEmailRevision(binding.revision, input.captured.revision)
  )
}

/** @internal */
export const snapshotEmailMutation = Effect.fnUntraced(
  function*(input: EmailAddressMutation) {
    const evidence = yield* snapshotAuthenticationEvidence(input.authorization.evidence).pipe(
      Effect.mapError(unavailable)
    )

    const requirement = yield* snapshotEmailRequirement(input.authorization.requirement)

    const source = input.captured.source === undefined
      ? undefined
      : yield* snapshotEmailCredential(input.captured.source)

    return Object.freeze({
      ...input,
      target: Object.freeze({ ...input.target }),
      ...(input.invalidation === undefined
        ? {}
        : { invalidation: Object.freeze({ ...input.invalidation }) }),
      captured: Object.freeze({
        eligible: input.captured.eligible,
        revision: snapshotEmailRevision(input.captured.revision),
        ...(input.captured.targetIdentifierRevision === undefined
          ? {}
          : { targetIdentifierRevision: input.captured.targetIdentifierRevision }),
        ...(source === undefined ? {} : { source })
      }),
      authorization: Object.freeze({
        challenge: Object.freeze({
          ...input.authorization.challenge,
          target: Object.freeze({ ...input.authorization.challenge.target }),
          revision: snapshotEmailRevision(input.authorization.challenge.revision)
        }),
        evidence,
        requirement
      })
    })
  }
)

/** @internal */
export const validateEmailMutation = Effect.fnUntraced(
  function*(
    policy: EmailWorkflowPolicy,
    input: EmailAddressMutation,
    action: EmailAction,
    current: Pick<EmailMutationRead, "target" | "requirement"> | undefined,
    now: number
  ) {
    const confirmsExisting = action === "verify-address" && input.captured.targetIdentifierRevision !== undefined

    if (
      !input.captured.eligible ||
      !emailRedemptionMatches(input, action) ||
      input.authorization.challenge.moduleId !== input.moduleId ||
      input.authorization.challenge.action !== action ||
      input.authorization.challenge.commandId !== input.commandId ||
      !sameIdentifier(input.authorization.challenge.target, input.target) ||
      input.authorization.challenge.sourceCredentialId !== input.captured.source?.credentialId ||
      !sameEmailRevision(input.authorization.challenge.revision, input.captured.revision) ||
      input.authorization.challenge.targetIdentifierRevision !==
        input.captured.targetIdentifierRevision ||
      (input.authorization.evidence.flowId as string) !== (input.commandId as string) ||
      input.authorization.evidence.bindingDigest !== input.authorization.challenge.bindingDigest ||
      !sameEmailRevision(input.authorization.evidence.revision, input.captured.revision) ||
      (action === "verify-address" && input.captured.source !== undefined) ||
      (action === "change-address" && input.captured.source === undefined) ||
      confirmsExisting !== (input.invalidation === undefined) ||
      (input.invalidation?.existingSessions === "immediate" &&
        policy.sessionInvalidation !== "same-authority-immediate")
    ) {
      return false
    }

    if (
      current === undefined ||
      !current.target.eligible ||
      !sameEmailRevision(current.target.revision, input.captured.revision) ||
      current.target.targetIdentifierRevision !== input.captured.targetIdentifierRevision ||
      (input.captured.source !== undefined &&
        (current.target.source === undefined ||
          current.target.source.identifierRevision !== input.captured.source.identifierRevision ||
          current.target.source.credentialRevision !== input.captured.source.credentialRevision ||
          !sameIdentifier(current.target.source.identifier, input.captured.source.identifier)))
    ) {
      return false
    }

    const currentRequirement = yield* current.requirement

    // Address custody retains strict future-proof rejection.
    if (
      input.authorization.evidence.proofs.some(
        (proof) => DateTime.toEpochMillis(proof.verifiedAt) > now
      )
    ) {
      return false
    }

    return (
      (yield* passwordEvidenceSatisfiedAt(
        input.authorization.evidence,
        input.authorization.requirement,
        now
      )) &&
      (yield* passwordEvidenceSatisfiedAt(input.authorization.evidence, currentRequirement, now))
    )
  }
)

/** @internal */
export const allocateEmailValue = <A>(
  mode: "interactive" | "synchronous",
  asynchronous: Effect.Effect<A, PersistenceMappingError> | undefined,
  synchronous: (() => A) | undefined
) => {
  if (mode === "synchronous") {
    return synchronous === undefined
      ? Effect.fail(unavailable())
      : Effect.try({
        try: synchronous,
        catch: (cause) => PersistenceMappingError.make({ operation: "mapping", cause })
      })
  }
  if (asynchronous !== undefined) return asynchronous

  return synchronous === undefined
    ? Effect.fail(unavailable())
    : Effect.try({
      try: synchronous,
      catch: (cause) => PersistenceMappingError.make({ operation: "mapping", cause })
    })
}

/** @internal */
export const allocateEmailSecurityRevision = (
  mapping: EmailWorkflowPolicy,
  mode: "interactive" | "synchronous",
  current: SecurityRevision
) => {
  if (mode === "synchronous") {
    return mapping.subject.nextSecurityRevisionSync === undefined
      ? Effect.fail(unavailable())
      : Effect.try({
        try: () => mapping.subject.nextSecurityRevisionSync!(current),
        catch: (cause) => PersistenceMappingError.make({ operation: "mapping", cause })
      })
  }
  if (mapping.subject.nextSecurityRevision !== undefined) {
    return mapping.subject.nextSecurityRevision(current)
  }
  if (mapping.subject.nextSecurityRevisionSync !== undefined) {
    return Effect.try({
      try: () => mapping.subject.nextSecurityRevisionSync!(current),
      catch: (cause) => PersistenceMappingError.make({ operation: "mapping", cause })
    })
  }

  return Effect.fail(unavailable())
}

/** @internal */
export interface EmailMutationRead {
  readonly target: EmailAddressTarget
  readonly requirement: Effect.Effect<
    AuthenticationRequirement,
    EmailUnavailable | PersistenceMappingError
  >
}
