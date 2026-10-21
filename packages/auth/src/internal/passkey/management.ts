import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { makeManagement as makePasskeyManagementContract } from "../../PasskeyContract.ts"
import { TokenDigest } from "../../Schema.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { lifecycleEvent, lifecycleEventEffect, LifecycleEventId } from "../hooks/models.ts"
import { LastSignInMethod } from "../identity/models.ts"
import type { AuthInvocation } from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { operationGroup } from "../operations/operation.ts"
import { assessAuthentication } from "../sessions/assurance.ts"
import { sessionInvalidationWindow } from "../sessions/invalidation.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { makePasskeyCeremony, passkeyNoAmbient, passkeyRateLimiterLayer, readPasskeyCommit } from "./actions.ts"
import type { PasskeyFailure } from "./errors.ts"
import {
  PasskeyActionRequired,
  PasskeyConfigurationError,
  PasskeyMethodUnsupported,
  PasskeyRejected,
  PasskeyUnavailable
} from "./errors.ts"
import type { PasskeyEnrolled, PasskeyRegistrationStarted } from "./models.ts"
import {
  PasskeyActionAuthorization,
  PasskeyActionChallenge,
  PasskeyBegin,
  PasskeyCredential,
  PasskeyCredentialSummary,
  PasskeyDescriptor,
  PasskeyEnrollmentSnapshot,
  PasskeyIssueDecision,
  PasskeyLabel,
  PasskeyModuleId,
  PasskeyProfile,
  PasskeyRemoved,
  PasskeyRevision,
  PasskeyUserHandle
} from "./models.ts"
import { PasskeyActionEvidence } from "./passkeyActionEvidence.ts"
import type { PasskeyConfig } from "./passkeyConfig.ts"
import { PasskeyCredentials } from "./passkeyCredentials.ts"
import { PasskeyManagementPersistence } from "./passkeyManagementPersistence.ts"
import { PasskeyPersistence } from "./passkeyPersistence.ts"
import { PasskeyManagementPolicy, type PasskeyMethodPolicy } from "./policy.ts"
import { snapshotPasskey, snapshotPasskeyResult, snapshotPasskeySync } from "./snapshot.ts"

const enrollmentDecision = Schema.Union([
  Schema.TaggedStruct("Enrolled", { credential: PasskeyCredentialSummary }),
  Schema.TaggedStruct("Rejected", {})
])

const removeInspection = Schema.Union([
  Schema.TaggedStruct("Target", { credential: PasskeyCredential }),
  Schema.TaggedStruct("Rejected", {})
])

const removeDecision = Schema.Union([
  Schema.TaggedStruct("Removed", { result: PasskeyRemoved }),
  Schema.TaggedStruct("Rejected", {}),
  Schema.TaggedStruct("LastSignInMethod", {})
])

const renameDecision = Schema.Union([
  Schema.TaggedStruct("Renamed", {
    credential: PasskeyCredentialSummary
  }),
  Schema.TaggedStruct("Rejected", {})
])

const subject = Effect.fnUntraced(function*(invocation: AuthInvocation) {
  yield* passkeyNoAmbient()
  if (invocation._tag !== "Authenticated") return yield* PasskeyRejected.make({})

  return invocation.subjectId
})

/** @internal */
export const makePasskeyManagement = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  source: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>,
  input: PasskeyManagementPolicy,
  sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
) => {
  const captured = Effect.fromResult(snapshotPasskeyResult(PasskeyManagementPolicy, input)).pipe(
    Effect.mapError(() => PasskeyConfigurationError.make({}))
  )

  const ceremony = makePasskeyCeremony(moduleId, source, "enrollment")

  const {
    BeginInput,
    CompleteInput,
    ListInput,
    RenameInput,
    RemoveInput,
    Failure,
    listResult,
    operations: { Begin, Complete, List, Rename, Remove }
  } = makePasskeyManagementContract(moduleId)

  type Failure = typeof Failure.Type

  const Management = Context.Service<
    { readonly moduleId: Id; readonly kind: "passkey-management" },
    {
      readonly begin: (
        invocation: AuthInvocation,
        input: typeof BeginInput.Type
      ) => Effect.Effect<
        AuthOperationResult<typeof PasskeyRegistrationStarted.Type>,
        PasskeyFailure
      >
      readonly complete: (
        invocation: AuthInvocation,
        input: typeof CompleteInput.Type
      ) => Effect.Effect<AuthOperationResult<typeof PasskeyEnrolled.Type>, PasskeyFailure>
      readonly list: (
        invocation: AuthInvocation,
        input: typeof ListInput.Type
      ) => Effect.Effect<typeof listResult.Type, PasskeyFailure>
      readonly rename: (
        invocation: AuthInvocation,
        input: typeof RenameInput.Type
      ) => Effect.Effect<
        { readonly credential: typeof PasskeyCredentialSummary.Type },
        PasskeyFailure
      >
      readonly remove: (
        invocation: AuthInvocation,
        input: typeof RemoveInput.Type
      ) => Effect.Effect<typeof PasskeyRemoved.Type, Failure>
    }
  >(`@effect/auth/PasskeyManagement/${moduleId.length}:${moduleId}`)

  const layer = Layer.effect(
    Management,
    Effect.gen(function*() {
      const policy = yield* captured,
        runtime = yield* ceremony.make,
        persistence = yield* PasskeyManagementPersistence,
        context = yield* PasskeyCredentials,
        ceremonies = yield* PasskeyPersistence,
        actions = yield* PasskeyActionEvidence,
        strategy = yield* sessions.SessionStrategy,
        digestSource = yield* Digest.Digest,
        hooks = yield* LifecycleHooks

      const invalidation = sessionInvalidationWindow(
        "credential-change",
        strategy.capabilities,
        strategy.policy
      )

      const digest = <S extends Schema.Codec<unknown, unknown, never, never>>(
        schema: S,
        value: S["Type"]
      ) =>
        Schema.encodeEffect(Schema.fromJsonString(Schema.toCodecJson(Schema.toType(schema))))(
          value
        ).pipe(
          Effect.flatMap((encoded) => digestSource.digest(Digest.sha256, new TextEncoder().encode(encoded))),
          Effect.map((bytes) => TokenDigest.make(Base64Url.encode(bytes))),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({})))),
          Effect.catchDefect(() => Effect.fail(PasskeyUnavailable.make({})))
        )

      const authorize = Effect.fn("PasskeyManagement.authorize")(function*(
        invocation: AuthInvocation,
        challenge: PasskeyActionChallenge,
        actionProof: typeof BeginInput.Type.actionProof
      ) {
        const answer = yield* actions.verify({
          invocation,
          challenge,
          ...(actionProof === undefined ? {} : { proof: actionProof })
        })

        const authorization = yield* snapshotPasskey(PasskeyActionAuthorization, {
          challenge,
          ...answer
        })

        const evidence = authorization.evidence,
          now = yield* DateTime.now

        if (
          String(evidence.flowId) !== String(challenge.flowId) ||
          evidence.bindingDigest !== challenge.bindingDigest ||
          evidence.revision.subjectId !== challenge.revision.subjectId ||
          evidence.revision.securityRevision !== challenge.revision.securityRevision ||
          challenge.revision.credentials.some(
            (original) =>
              !evidence.revision.credentials.some(
                (current) =>
                  current.credentialId === original.credentialId &&
                  current.revision === original.revision
              )
          )
        ) {
          return yield* PasskeyActionRequired.make({})
        }

        const assessment = yield* assessAuthentication(evidence, authorization.requirement).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyActionRequired.make({}))))
        )

        if (
          !assessment.satisfied ||
          evidence.proofs.some(
            (item) =>
              DateTime.toEpochMillis(now) - DateTime.toEpochMillis(item.verifiedAt) >
                policy.maximumEvidenceAgeMillis
          )
        ) {
          return yield* PasskeyActionRequired.make({})
        }

        return authorization
      })

      const eventInput = (
        operation: string,
        commandId: string,
        subjectId: typeof PasskeyCredential.Type.revision.subjectId,
        nowMillis: number
      ) => ({
        id: LifecycleEventId.make(`passkey/${moduleId}/${operation}/${commandId}`),
        occurredAtMillis: nowMillis,
        snapshot: {
          action: "credential-change" as const,
          operation: `${moduleId}/passkey/${operation}`,
          subjectId,
          method: "passkey",
          identifiers: []
        }
      })

      const event = (...args: Parameters<typeof eventInput>) => lifecycleEvent(eventInput(...args))

      const eventEffect = (...args: Parameters<typeof eventInput>) =>
        lifecycleEventEffect(eventInput(...args)).pipe(Effect.orDie)

      return Management.of({
        begin: Effect.fn("PasskeyManagement.begin")(
          function*(invocation, input) {
            input = yield* snapshotPasskey(Schema.toType(BeginInput), input)

            const subjectId = yield* subject(invocation),
              selected = yield* runtime.profile(input.profileId),
              captured = yield* context.listForSubject({
                moduleId,
                rpId: selected.rpId,
                subjectId
              })

            if (
              captured === undefined ||
              captured.revision.subjectId !== subjectId ||
              captured.credentials.length >= policy.maximumCredentials
            ) {
              return yield* PasskeyRejected.make({})
            }
            const fixedCapture = yield* snapshotPasskey(PasskeyEnrollmentSnapshot, captured)

            const userHandle = fixedCapture.userHandle ?? PasskeyUserHandle.make(yield* runtime.random())

            const challenge = yield* snapshotPasskey(PasskeyActionChallenge, {
              moduleId,
              action: "enroll-begin",
              commandId: input.commandId,
              flowId: input.flowId,
              revision: fixedCapture.revision,
              bindingDigest: yield* digest(
                Schema.Tuple([
                  PasskeyModuleId,
                  Schema.Literal("enrollment"),
                  Schema.Struct({ ...PasskeyBegin.fields, name: PasskeyLabel }),
                  PasskeyProfile,
                  PasskeyRevision,
                  PasskeyUserHandle,
                  Schema.Array(PasskeyDescriptor)
                ]),
                [
                  moduleId,
                  "enrollment",
                  input,
                  selected,
                  fixedCapture.revision,
                  userHandle,
                  fixedCapture.credentials
                ]
              )
            })

            const authorization = yield* authorize(invocation, challenge, input.actionProof)

            const draft = yield* runtime.prepareRegistration(
              input,
              {
                _tag: "Enrollment",
                revision: fixedCapture.revision,
                userHandle,
                name: input.name,
                authorization
              },
              fixedCapture.credentials
            )

            const issued = yield* readPasskeyCommit(
              yield* ceremonies.issue(
                { ceremony: draft.ceremony },
                (value, journal) => journal.prepare(snapshotPasskeySync(PasskeyIssueDecision, value))
              )
            )

            return yield* runtime.acceptRegistrationIssue(draft, issued)
          },
          Effect.provideService(PasskeyManagementPersistence, persistence)
        ),
        complete: Effect.fn("PasskeyManagement.complete")(
          function*(invocation, input) {
            input = yield* snapshotPasskey(Schema.toType(CompleteInput), input)

            const subjectId = yield* subject(invocation),
              inspected = yield* runtime.inspect(input)

            const original = inspected.ceremony.context

            if (original._tag !== "Enrollment" || original.revision.subjectId !== subjectId) {
              return yield* PasskeyRejected.make({})
            }

            const {
              access,
              ceremony: verifiedCeremony,
              verified
            } = yield* runtime.verifyRegistration(input, inspected)

            const authority = yield* PasskeyManagementPersistence
            const timestamp = DateTime.toEpochMillis(yield* DateTime.now)

            const result = yield* readPasskeyCommit(
              yield* authority.completeEnrollment(
                {
                  access,
                  ceremony: verifiedCeremony,
                  verified,
                  management: policy
                },
                (value, journal) => {
                  const projected = snapshotPasskeySync(enrollmentDecision, value)

                  if (projected._tag === "Enrolled") {
                    journal.stage(
                      event("enrollment", verifiedCeremony.commandId, subjectId, timestamp)
                    )
                  }

                  return journal.prepare(projected)
                }
              )
            )

            if (result._tag !== "Enrolled") return yield* PasskeyRejected.make({})

            return {
              value: { credential: result.credential },
              credentialCommands: [runtime.clear]
            }
          },
          Effect.provideService(PasskeyManagementPersistence, persistence)
        ),
        list: Effect.fn("PasskeyManagement.list")(function*(invocation, input) {
          const subjectId = yield* subject(invocation)
          const request = yield* snapshotPasskey(ListInput, input)

          return yield* snapshotPasskey(
            listResult,
            yield* persistence.list({ moduleId, subjectId, ...request })
          )
        }),
        rename: Effect.fn("PasskeyManagement.rename")(function*(invocation, input) {
          const subjectId = yield* subject(invocation),
            request = yield* snapshotPasskey(RenameInput, input),
            timestamp = DateTime.toEpochMillis(yield* DateTime.now)

          yield* hooks.before(
            (yield* eventEffect("rename", request.commandId, subjectId, timestamp)).snapshot
          )

          const result = yield* readPasskeyCommit(
            yield* persistence.rename(
              {
                moduleId,
                subjectId,
                ...request
              },
              (value, journal) => {
                const projected = snapshotPasskeySync(renameDecision, value)

                if (projected._tag === "Renamed") {
                  journal.stage(event("rename", request.commandId, subjectId, timestamp))
                }

                return journal.prepare(projected)
              }
            )
          )

          if (result._tag !== "Renamed" || result.credential.credentialId !== request.credentialId) {
            return yield* PasskeyRejected.make({})
          }

          return { credential: result.credential }
        }),
        remove: Effect.fn("PasskeyManagement.remove")(function*(invocation, input) {
          const subjectId = yield* subject(invocation)

          if (
            policy.requireImmediateInvalidation &&
            (strategy.capabilities.subjectInvalidation !== "immediate" ||
              strategy.capabilities.positiveCacheMillis > 0)
          ) {
            return yield* PasskeyMethodUnsupported.make({})
          }

          const request = yield* snapshotPasskey(Schema.toType(RemoveInput), input)

          const inspected = yield* snapshotPasskey(
            removeInspection,
            yield* persistence.inspectRemove({
              moduleId,
              subjectId,
              credentialId: request.credentialId
            })
          )

          if (inspected._tag === "Rejected") return yield* PasskeyRejected.make({})
          if (
            inspected.credential.revision.subjectId !== subjectId ||
            inspected.credential.credentialId !== request.credentialId
          ) {
            return yield* PasskeyRejected.make({})
          }

          const challenge = yield* snapshotPasskey(PasskeyActionChallenge, {
            moduleId,
            action: "remove",
            commandId: request.commandId,
            flowId: Schema.decodeSync(PasskeyBegin.fields.flowId)(request.commandId),
            revision: inspected.credential.revision,
            bindingDigest: yield* digest(
              Schema.Tuple([
                PasskeyModuleId,
                Schema.Literal("remove"),
                PasskeyBegin.fields.commandId,
                PasskeyCredential
              ]),
              [moduleId, "remove", request.commandId, inspected.credential]
            )
          })

          const authorization = yield* authorize(invocation, challenge, request.actionProof),
            timestamp = DateTime.toEpochMillis(yield* DateTime.now)

          yield* hooks.before(
            (yield* eventEffect("remove", request.commandId, subjectId, timestamp)).snapshot
          )

          const result = yield* readPasskeyCommit(
            yield* persistence.remove(
              {
                moduleId,
                commandId: request.commandId,
                credential: inspected.credential,
                authorization,
                management: policy,
                invalidation
              },
              (value, journal) => {
                const projected = snapshotPasskeySync(removeDecision, value)

                if (projected._tag === "Removed") {
                  journal.stage(event("remove", request.commandId, subjectId, timestamp))
                }

                return journal.prepare(projected)
              }
            )
          )

          if (result._tag === "LastSignInMethod") return yield* LastSignInMethod.make({})
          if (result._tag !== "Removed" || result.result.credentialId !== request.credentialId) {
            return yield* PasskeyRejected.make({})
          }

          return result.result
        })
      })
    })
  ).pipe(Layer.provide(passkeyRateLimiterLayer))

  return Object.freeze({
    Management,
    binding: ceremony.binding,
    layer,
    operations: Object.freeze({ Begin, Complete, List, Rename, Remove }),
    group: operationGroup(Begin, Complete, List, Rename, Remove),
    handlersLayer: Layer.mergeAll(
      Begin.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(Management, (service) => service.begin(invocation, input))
      ),
      Complete.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(Management, (service) => service.complete(invocation, input))
      ),
      List.handlerLayer((input, invocation) =>
        Effect.flatMap(Management, (service) => service.list(invocation, input))
      ),
      Rename.handlerLayer((input, invocation) =>
        Effect.flatMap(Management, (service) => service.rename(invocation, input))
      ),
      Remove.handlerLayer((input, invocation) =>
        Effect.flatMap(Management, (service) => service.remove(invocation, input))
      )
    )
  })
}
