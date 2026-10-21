import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { Email, Locale, TokenDigest } from "../../Schema.ts"
import { hasCommitScope, type PreparedCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { HookDenied, lifecycleEventEffect, LifecycleEventId, lifecycleSnapshotEffect } from "../hooks/models.ts"
import { LoginIdentifier } from "../identity/models.ts"
import type { AuthInvocation } from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import type { makeRequestBinding } from "../operations/requestBinding.ts"
import { RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import { proofRequestAdmission } from "../proofs/admission.ts"
import { readProofCommit } from "../proofs/dispatch.ts"
import type { ProofBinding } from "../proofs/models.ts"
import { ProofReference, ProofRequestId, ProofRequestReceipt } from "../proofs/models.ts"
import type { makeProofModule } from "../proofs/module.ts"
import { assessAuthentication, snapshotAuthenticationEvidence } from "../sessions/assurance.ts"
import { SessionInvalidationWindow, sessionInvalidationWindow } from "../sessions/invalidation.ts"
import { AuthenticationFlowId } from "../sessions/models.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { type EmailActionAuthorization, EmailActionEvidence } from "./emailActionEvidence.ts"
import { EmailAddressPersistence, type EmailAddressTarget } from "./emailAddressPersistence.ts"
import {
  EmailActionRequired,
  emailCompletionFailure,
  EmailConfigurationError,
  EmailMethodUnsupported,
  EmailRejected,
  EmailUnavailable
} from "./errors.ts"
import { type EmailAction, EmailActionChallenge, EmailCommandId } from "./models.ts"
import { snapshotEmailCredential, snapshotEmailRequirement, snapshotEmailRevision } from "./snapshot.ts"

const BoundedId = Schema.NonEmptyString.check(Schema.isMaxLength(256))
const Secret = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))

const base = {
  flowId: RequestBindingFlowId,
  requestBinding: RequestBindingCredential,
  commandId: EmailCommandId,
  email: Schema.String.check(Schema.isMaxLength(320)).pipe(Schema.decodeTo(Email)),
  sourceCredentialId: Schema.optionalKey(BoundedId)
}

const BindingInput = Schema.Struct(base)

const RequestInput = Schema.Struct({
  ...base,
  requestId: ProofRequestId,
  locale: Locale
})

const CompleteInput = Schema.Struct({
  ...base,
  reference: ProofReference,
  secret: Secret,
  actionProof: Schema.optionalKey(Secret)
})

const ChangeRequest = Schema.Struct({ ...RequestInput.fields, sourceCredentialId: BoundedId })
const ChangeComplete = Schema.Struct({ ...CompleteInput.fields, sourceCredentialId: BoundedId })
const Success = Schema.Struct({ invalidation: Schema.optionalKey(SessionInvalidationWindow) })

const Failure = Schema.Union([
  EmailRejected,
  EmailUnavailable,
  EmailActionRequired,
  EmailMethodUnsupported,
  HookDenied
])

type Failure = typeof Failure.Type
const tuple = Schema.fromJsonString(Schema.Array(Schema.String))

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* EmailMethodUnsupported.make({})
})

const Configuration = Schema.Struct({
  /** Freshness cap for adding or replacing addresses. Existing-identifier confirmation uses application policy. */
  maximumEvidenceAgeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300_000 })),
  requireImmediateInvalidation: Schema.Boolean
})

export type EmailAddressPolicy = typeof Configuration.Type

export interface AddressModule<Id extends string> {
  readonly moduleId: Id
  readonly kind: "addresses"
}

/** @internal */
export const makeEmailAddresses = <
  const Id extends string,
  const VerifyId extends string,
  const ChangeId extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  binding: ReturnType<typeof makeRequestBinding<Id, "email-entry">>,
  verifyProof: ReturnType<typeof makeProofModule<VerifyId, typeof ProofBinding>>,
  changeProof: ReturnType<typeof makeProofModule<ChangeId, typeof ProofBinding>>,
  sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>,
  configuration: EmailAddressPolicy
) => {
  const capturedPolicy = { ...configuration }

  type Result = AuthOperationResult<typeof Success.Type | { readonly _tag: "Rejected" }>
  type Plan = {
    readonly commit: Effect.Effect<
      PreparedCommit<Result>,
      EmailUnavailable,
      EmailAddressPersistence
    >
  }

  const Addresses = Context.Service<
    AddressModule<Id>,
    {
      readonly request: (
        action: EmailAction,
        invocation: AuthInvocation,
        input: typeof RequestInput.Type
      ) => Effect.Effect<ProofRequestReceipt, Failure>
      readonly planComplete: (
        action: EmailAction,
        invocation: AuthInvocation,
        input: typeof CompleteInput.Type
      ) => Effect.Effect<Plan, Failure>
    }
  >(`@effect/auth/email/${moduleId}/Addresses`)

  const layer = Layer.effect(
    Addresses,
    Effect.gen(function*() {
      const policy = yield* Schema.decodeEffect(Configuration)(capturedPolicy).pipe(
        Effect.mapError(() => EmailConfigurationError.make({}))
      )

      const strategy = yield* sessions.SessionStrategy

      if (
        policy.requireImmediateInvalidation &&
        (strategy.capabilities.subjectInvalidation !== "immediate" ||
          strategy.capabilities.positiveCacheMillis > 0)
      ) {
        return yield* EmailConfigurationError.make({})
      }

      const binder = yield* binding.RequestBinding
      const persistence = yield* EmailAddressPersistence
      const actionAuthority = yield* EmailActionEvidence
      const verify = yield* verifyProof.Proofs
      const change = yield* changeProof.Proofs
      const digestService = yield* Digest.Digest
      const random = yield* SecureRandom.SecureRandom
      const hooks = yield* LifecycleHooks

      const digest = Effect.fnUntraced(
        function*(parts: ReadonlyArray<string>) {
          const message = yield* Schema.encodeEffect(tuple)(parts)

          return TokenDigest.make(
            Base64Url.encode(yield* digestService.digest(Digest.sha256, new TextEncoder().encode(message)))
          )
        },
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
      )

      const bound = Effect.fn("EmailAddresses.binding")(function*(
        action: EmailAction,
        invocation: AuthInvocation,
        request: typeof BindingInput.Type
      ) {
        if (invocation._tag !== "Authenticated") return yield* EmailRejected.make({})
        if (action === "change-address" && request.sourceCredentialId === undefined) {
          return yield* EmailRejected.make({})
        }

        const privateBinding = yield* binder
          .verify(request.flowId, request.requestBinding)
          .pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error._tag === "RequestBindingInvalid"
                    ? EmailRejected.make({})
                    : EmailUnavailable.make({}))
              )
            )
          )

        const identifier = Object.freeze(
          LoginIdentifier.make({ namespace: "email", value: request.email })
        )

        const current = yield* persistence.target({
          moduleId,
          subjectId: invocation.subjectId,
          target: identifier,
          ...(request.sourceCredentialId === undefined
            ? {}
            : { sourceCredentialId: request.sourceCredentialId })
        })

        const captured: EmailAddressTarget = Object.freeze({
          revision: snapshotEmailRevision(current.revision),
          eligible: current.eligible,
          ...(current.targetIdentifierRevision === undefined
            ? {}
            : { targetIdentifierRevision: current.targetIdentifierRevision }),
          ...(current.source === undefined
            ? {}
            : { source: yield* snapshotEmailCredential(current.source) })
        })

        if (
          captured.revision.subjectId !== invocation.subjectId ||
          (action === "change-address" &&
            (captured.source === undefined ||
              captured.source.credentialId !== request.sourceCredentialId ||
              captured.source.revision.subjectId !== invocation.subjectId ||
              captured.source.revision.securityRevision !== captured.revision.securityRevision))
        ) {
          return yield* EmailRejected.make({})
        }

        const actionDigest = yield* digest([
          "effect-auth/email-action/v1",
          moduleId,
          action,
          request.commandId,
          captured.revision.subjectId,
          captured.revision.securityRevision,
          captured.source?.credentialId ?? "",
          captured.source?.identifier.value ?? "",
          identifier.value,
          captured.targetIdentifierRevision ?? "",
          ...[...captured.revision.credentials]
            .sort((a, b) => a.credentialId < b.credentialId ? -1 : a.credentialId > b.credentialId ? 1 : 0)
            .flatMap((item) => [item.credentialId, item.revision])
        ])

        const decoded = EmailActionChallenge.make({
          moduleId,
          action,
          commandId: request.commandId,
          revision: captured.revision,
          target: identifier,
          ...(captured.targetIdentifierRevision === undefined
            ? {}
            : { targetIdentifierRevision: captured.targetIdentifierRevision }),
          ...(captured.source === undefined
            ? {}
            : { sourceCredentialId: captured.source.credentialId }),
          bindingDigest: actionDigest
        })

        const challenge = Object.freeze({
          ...decoded,
          revision: snapshotEmailRevision(decoded.revision),
          target: Object.freeze(LoginIdentifier.make(decoded.target))
        })

        const contextDigest = yield* digest([
          "effect-auth/email-address-proof/v1",
          moduleId,
          action,
          request.flowId,
          privateBinding.verifier,
          actionDigest
        ])

        const proofBinding: ProofBinding = {
          _tag: "IdentifierChange",
          identifier,
          revision: captured.revision,
          flowId: request.flowId,
          contextDigest
        }

        return { captured, identifier, challenge, binding: proofBinding }
      })

      const authorize = Effect.fn("EmailAddresses.authorize")(function*(
        invocation: AuthInvocation,
        request: typeof CompleteInput.Type,
        challenge: EmailActionChallenge
      ) {
        const grant = yield* actionAuthority.verify({
          invocation,
          challenge,
          ...(request.actionProof === undefined ? {} : { proof: request.actionProof })
        })

        const raw = yield* snapshotAuthenticationEvidence(grant.evidence).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailActionRequired.make({}))))
        )

        const evidence = { ...raw, revision: snapshotEmailRevision(raw.revision) }

        if (
          evidence.flowId !== AuthenticationFlowId.make(challenge.commandId) ||
          evidence.bindingDigest !== challenge.bindingDigest ||
          evidence.revision.subjectId !== challenge.revision.subjectId ||
          evidence.revision.securityRevision !== challenge.revision.securityRevision ||
          challenge.revision.credentials.some(
            (expected) =>
              !evidence.revision.credentials.some(
                (actual) =>
                  expected.credentialId === actual.credentialId &&
                  expected.revision === actual.revision
              )
          )
        ) {
          return yield* EmailActionRequired.make({})
        }

        const requirement = yield* snapshotEmailRequirement({
          ...grant.requirement,
          maximumAgeMillis: challenge.action === "verify-address" &&
              challenge.targetIdentifierRevision !== undefined
            ? grant.requirement.maximumAgeMillis
            : Math.min(policy.maximumEvidenceAgeMillis, grant.requirement.maximumAgeMillis)
        })

        if (
          !(yield* assessAuthentication(evidence, requirement).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailActionRequired.make({}))))
          )).satisfied
        ) {
          return yield* EmailActionRequired.make({})
        }

        return Object.freeze({
          challenge,
          evidence,
          requirement
        }) satisfies EmailActionAuthorization
      })

      return Addresses.of({
        request: Effect.fn("EmailAddresses.request")(function*(action, invocation, input) {
          yield* noAmbient()
          const current = yield* bound(action, invocation, input)

          const proofs = action === "verify-address" ? verify : change

          const dispatch = yield* proofs
            .prepareIssue({
              requestId: input.requestId,
              binding: current.binding,
              locale: input.locale,
              eligible: current.captured.eligible
            })
            .pipe(
              Effect.flatMap(readProofCommit),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
            )

          yield* dispatch.schedule.pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
          )

          return dispatch.receipt
        }),
        planComplete: Effect.fn("EmailAddresses.planComplete")(
          function*(action, invocation, input) {
            yield* noAmbient()
            const current = yield* bound(action, invocation, input)
            const proofs = action === "verify-address" ? verify : change

            const redemption = yield* proofs
              .planRedeem({
                reference: input.reference,
                credential: input.secret,
                binding: current.binding
              })
              .pipe(
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
              )

            const authorization = yield* authorize(invocation, input, current.challenge)

            const invalidation = action === "verify-address" && current.captured.targetIdentifierRevision !== undefined
              ? undefined
              : sessionInvalidationWindow(
                "identifier-change",
                strategy.capabilities,
                strategy.policy
              )

            const snapshot = yield* lifecycleSnapshotEffect({
              action: "identifier-change",
              operation: `${moduleId}/${action}`,
              method: "email-code",
              subjectId: current.captured.revision.subjectId,
              identifiers: [
                ...(action === "change-address" && current.captured.source
                  ? [current.captured.source.identifier]
                  : []),
                current.identifier
              ]
            }).pipe(Effect.orDie)

            yield* hooks.before(snapshot)

            const bytes = yield* random
              .randomBytes(32)
              .pipe(
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
              )

            const event = yield* lifecycleEventEffect({
              id: LifecycleEventId.make(Base64Url.encode(bytes)),
              occurredAtMillis: DateTime.toEpochMillis(yield* DateTime.now),
              snapshot
            }).pipe(Effect.orDie)

            const mutation = Object.freeze({
              moduleId,
              commandId: input.commandId,
              target: current.identifier,
              captured: current.captured,
              authorization,
              redemption,
              ...(invalidation === undefined ? {} : { invalidation })
            })

            const prepare = (
              decision: "changed" | "rejected",
              journal: Parameters<
                Parameters<EmailAddressPersistence["Service"]["changeWithProof"]>[1]
              >[1]
            ) => {
              if (decision === "changed") journal.stage(event)

              return journal.prepare<Result>({
                value: decision === "changed"
                  ? invalidation === undefined
                    ? {}
                    : { invalidation }
                  : { _tag: "Rejected" },
                credentialCommands: decision === "changed"
                  ? [
                    ...(invalidation === undefined
                      ? []
                      : [{ _tag: "Clear" as const, slot: "session" as const }]),
                    { _tag: "Clear", slot: "pending-proof" },
                    { _tag: "Clear", slot: "request-binding" }
                  ]
                  : []
              })
            }

            const commit = Effect.gen(function*() {
              const owner = yield* EmailAddressPersistence

              return yield* action === "verify-address"
                ? owner.verifyWithProof(mutation, prepare)
                : owner.changeWithProof(mutation, prepare)
            })

            return Object.freeze({ commit })
          }
        )
      })
    })
  )

  const makeOperations = <
    const Mode extends "verify" | "change",
    const Schemas extends {
      readonly request: typeof RequestInput | typeof ChangeRequest
      readonly complete: typeof CompleteInput | typeof ChangeComplete
    }
  >(
    mode: Mode,
    schemas: Schemas
  ) => {
    const action = mode === "verify" ? "verify-address" : "change-address"

    const admitRequest = proofRequestAdmission(`${moduleId}/address/${mode}`).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
    )

    const Request = makeOperation(`${moduleId}/address/${mode}/request`, {
      authorize: () => admitRequest,
      payload: schemas.request,
      success: ProofRequestReceipt,
      error: Failure,
      access: "authenticated",
      exposure: "public",
      replay: "non-idempotent"
    })

    const Complete = makeOperation(`${moduleId}/address/${mode}/complete`, {
      payload: schemas.complete,
      success: Success,
      error: Failure,
      access: "authenticated",
      exposure: "public",
      replay: "single-use",
      credentials: true
    })

    const handlersLayer = Layer.mergeAll(
      Request.handlerLayer(
        Effect.fn("EmailAddresses.Request")(function*(input, invocation) {
          return yield* (yield* Addresses).request(action, invocation, input)
        })
      ),
      Complete.credentialHandlerLayer(
        Effect.fn("EmailAddresses.Complete")(function*(input, invocation) {
          const plan = yield* (yield* Addresses).planComplete(action, invocation, input)
          const receipt = yield* plan.commit

          const result = yield* receipt.read.pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
          )

          if ("_tag" in result.value) return yield* EmailRejected.make({})

          return { value: result.value, credentialCommands: result.credentialCommands }
        })
      )
    )

    return Object.freeze({
      operations: { Request, Complete },
      handlersLayer,
      group: operationGroup(Request, Complete)
    })
  }

  const verify = makeOperations("verify", {
    request: RequestInput,
    complete: CompleteInput
  })

  const change = makeOperations("change", {
    request: ChangeRequest,
    complete: ChangeComplete
  })

  return Object.freeze({
    Addresses,
    layer,
    verify,
    change,
    verifyProof,
    changeProof
  })
}
