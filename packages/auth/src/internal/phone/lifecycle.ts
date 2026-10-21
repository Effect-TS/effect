import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { Locale } from "../../Schema.ts"
import { makeAuthStrategy } from "../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../auth/defaults.ts"
import { hasCommitScope } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { lifecycleEvent, LifecycleEventId, lifecycleSnapshotEffect } from "../hooks/models.ts"
import { LoginIdentifier } from "../identity/models.ts"
import type { AuthInvocation } from "../operations/context.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { makeRequestBinding, RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import { readProofCommit } from "../proofs/dispatch.ts"
import { ProofBinding, ProofPurpose, ProofReference, ProofRequestId, ProofRequestReceipt } from "../proofs/models.ts"
import { makeProofModule } from "../proofs/module.ts"
import type { ProofPolicy } from "../proofs/policy.ts"
import { defaultProofPolicy } from "../proofs/policy.ts"
import { assessAuthentication } from "../sessions/assurance.ts"
import { AuthenticationAuthority } from "../sessions/authenticationAuthority.ts"
import { SessionInvalidationWindow, sessionInvalidationWindow } from "../sessions/invalidation.ts"
import { type AuthenticationEvidence, AuthenticationFlowId, AuthenticationRequirement } from "../sessions/models.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { phoneAdmission, phoneAttemptAdmission, phoneDigest } from "./admission.ts"
import { makePhoneClaims } from "./claims.ts"
import { deliveryLayer } from "./delivery.ts"
import { phoneActionFailure, phoneFailure } from "./failure.ts"
import {
  type PhoneActionAuthorization,
  PhoneActionChallenge,
  PhoneActionRequired,
  PhoneCommandId,
  PhoneConfigurationError,
  PhoneLifecycleAction,
  PhoneLifecycleFailure,
  PhoneLifecyclePolicy
} from "./lifecycleModels.ts"
import { PhoneCredentialSnapshot, PhoneNumber, PhoneOtpRejected, PhoneOtpUnavailable } from "./models.ts"
import { PhoneActionEvidence } from "./phoneActionEvidence.ts"
import { defaultPhoneAdmissionLayer } from "./phoneAdmission.ts"
import { PhoneDeliveryEligibility } from "./phoneDeliveryEligibility.ts"
import { PhonePersistence } from "./phonePersistence.ts"
const Code = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))
const ActionProof = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))

const fields = {
  action: PhoneLifecycleAction,
  flowId: RequestBindingFlowId,
  commandId: PhoneCommandId,
  phoneNumber: PhoneNumber,
  sourcePhoneNumber: Schema.optionalKey(PhoneNumber)
}

const Start = Schema.Struct({
  ...fields,
  requestId: ProofRequestId,
  locale: Locale,
  requestBinding: Schema.optionalKey(RequestBindingCredential)
})

const Bound = Schema.Struct({ ...fields, requestBinding: RequestBindingCredential })

const CompleteInput = Schema.Struct({
  ...Bound.fields,
  reference: ProofReference,
  code: Code,
  actionProof: Schema.optionalKey(ActionProof)
})

const Challenge = Schema.Struct({
  ...ProofRequestReceipt.fields,
  flowId: RequestBindingFlowId,
  actionChallenge: Schema.NullOr(PhoneActionChallenge)
})

/** @internal */
export const defaultPhoneLifecyclePolicy: PhoneLifecyclePolicy = {
  maximumEvidenceAgeMillis: 300_000,
  requireImmediateInvalidation: false
}

/** @internal */
export const makePhoneLifecycle = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
    readonly policy?: ProofPolicy
    readonly digits?: 6 | 7 | 8 | 9 | 10
    readonly lifecycle?: PhoneLifecyclePolicy
  }
) => {
  const SessionClaims = makePhoneClaims<Id, Claims>(moduleId)

  const { sessions } = options,
    policy = Object.freeze({ ...(options.lifecycle ?? defaultPhoneLifecyclePolicy) }),
    binding = makeRequestBinding(moduleId, "phone-lifecycle")

  const proof = makeProofModule(`${moduleId}/lifecycle`, {
    purpose: ProofPurpose.make("phone-lifecycle"),
    binding: ProofBinding,
    channel: "sms",
    template: "phone-lifecycle",
    secret: { _tag: "NumericCode", digits: options.digits ?? 6 },
    policy: options.policy ?? defaultProofPolicy
  })

  const Result = Schema.Union([
    Schema.TaggedStruct("Registered", { completion: sessions.CompletionResult }),
    Schema.TaggedStruct("Updated", { invalidation: SessionInvalidationWindow })
  ])

  const admitRequest = Effect.fn("PhoneLifecycle.admitRequest")(function*() {
    if (!(yield* phoneAdmission(moduleId, "request"))) return yield* PhoneOtpRejected.make({})
  })

  const Begin = makeOperation(`${moduleId}/begin`, {
    payload: Start,
    authorize: admitRequest,
    success: Challenge,
    error: PhoneLifecycleFailure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  const CompleteLifecycle = makeOperation(`${moduleId}/complete-lifecycle`, {
    payload: CompleteInput,
    authorize: () => phoneAttemptAdmission(moduleId),
    success: Result,
    error: PhoneLifecycleFailure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const Cancel = makeOperation(`${moduleId}/cancel-lifecycle`, {
    payload: Bound,
    success: Schema.Void,
    error: PhoneLifecycleFailure,
    access: "any",
    exposure: "public",
    replay: "idempotent",
    credentials: true
  })

  const noAmbient = Effect.gen(function*() {
    if (yield* hasCommitScope) return yield* PhoneOtpUnavailable.make({})
  })

  const capture = Effect.fn("PhoneLifecycle.capture")(function*(
    input: typeof Bound.Type,
    invocation: AuthInvocation
  ) {
    yield* noAmbient
    if (
      input.action === "register"
        ? invocation._tag !== "Guest" || input.sourcePhoneNumber !== undefined
        : invocation._tag !== "Authenticated" ||
          (input.action === "change"
            ? input.sourcePhoneNumber === undefined
            : input.sourcePhoneNumber !== undefined)
    ) {
      return yield* PhoneOtpRejected.make({})
    }

    const verified = yield* (yield* binding.RequestBinding)
      .verify(input.flowId, input.requestBinding)
      .pipe(Effect.mapError(phoneFailure))

    const target = yield* (yield* PhonePersistence).target({
      moduleId,
      action: input.action,
      phoneNumber: input.phoneNumber,
      ...(invocation._tag === "Authenticated" ? { subjectId: invocation.subjectId } : {}),
      ...(input.sourcePhoneNumber === undefined
        ? {}
        : { sourcePhoneNumber: input.sourcePhoneNumber })
    })

    const contextDigest = yield* phoneDigest([
      "effect-auth/phone-lifecycle/v1",
      moduleId,
      input.action,
      input.flowId,
      input.commandId,
      verified.verifier,
      input.phoneNumber,
      input.sourcePhoneNumber ?? "",
      target.custody?.custodyRevision ?? "",
      target.source?.custodyRevision ?? "",
      target.revision?.subjectId ?? "",
      target.revision?.securityRevision ?? ""
    ])

    const base = {
      flowId: input.flowId,
      contextDigest,
      identifier: LoginIdentifier.make({ namespace: "phone", value: input.phoneNumber })
    }

    const proofBinding: ProofBinding = target.revision === null || input.action === "register"
      ? { _tag: "Identifier", ...base }
      : {
        _tag: input.action === "change" ? "IdentifierChange" : "Subject",
        ...base,
        revision: target.revision
      }

    const challenge: PhoneActionChallenge | null = input.action === "register" || target.revision === null
      ? null
      : {
        moduleId,
        action: input.action,
        commandId: input.commandId,
        flowId: AuthenticationFlowId.make(input.flowId),
        phoneNumber: input.phoneNumber,
        ...(input.sourcePhoneNumber === undefined
          ? {}
          : { sourcePhoneNumber: input.sourcePhoneNumber }),
        revision: target.revision,
        bindingDigest: contextDigest
      }

    return { target, binding: proofBinding, challenge }
  })

  const request = Effect.fn("PhoneLifecycle.request")(function*(
    input: typeof Start.Type,
    invocation: AuthInvocation,
    credential: typeof RequestBindingCredential.Type
  ) {
    const current = yield* capture({ ...input, requestBinding: credential }, invocation)
    const allowed = yield* (yield* PhoneDeliveryEligibility).allowed(input.phoneNumber)

    const dispatch = yield* (yield* proof.Proofs)
      .prepareIssue({
        requestId: input.requestId,
        binding: current.binding,
        locale: input.locale,
        eligible: current.target.eligible && allowed
      })
      .pipe(Effect.flatMap(readProofCommit), Effect.mapError(phoneFailure))

    yield* dispatch.schedule.pipe(Effect.mapError(phoneFailure))

    return { ...dispatch.receipt, flowId: input.flowId, actionChallenge: current.challenge }
  })

  const configurationLayer = Layer.effectDiscard(
    Effect.gen(function*() {
      yield* Schema.decodeEffect(PhoneLifecyclePolicy)(policy).pipe(
        Effect.mapError(() => PhoneConfigurationError.make({}))
      )
      const strategy = yield* sessions.SessionStrategy

      if (
        policy.requireImmediateInvalidation &&
        (strategy.capabilities.subjectInvalidation !== "immediate" ||
          strategy.capabilities.positiveCacheMillis > 0)
      ) {
        return yield* PhoneConfigurationError.make({})
      }
    })
  )

  const handlersLayer = Layer.mergeAll(
    Begin.credentialHandlerLayer(
      Effect.fn("PhoneLifecycle.begin")(function*(input, invocation) {
        yield* noAmbient

        const issued = input.requestBinding === undefined
          ? yield* (yield* binding.RequestBinding)
            .issue(input.flowId)
            .pipe(Effect.mapError(phoneFailure))
          : undefined

        const command = issued?.credentialCommands.find(
          (value) => value._tag === "Issue" && value.slot === "request-binding"
        )

        const requestBinding = input.requestBinding ?? (command?._tag === "Issue" ? command.credential : undefined)

        if (requestBinding === undefined) return yield* PhoneOtpUnavailable.make({})

        return {
          value: yield* request(input, invocation, requestBinding),
          credentialCommands: issued?.credentialCommands ?? []
        }
      })
    ),
    CompleteLifecycle.credentialHandlerLayer(
      Effect.fn("PhoneLifecycle.complete")(function*(input, invocation) {
        const current = yield* capture(input, invocation)
        const strategy = yield* sessions.SessionStrategy

        const proofs = yield* proof.Proofs

        const redemption = yield* proofs
          .planRedeem({
            binding: current.binding,
            reference: input.reference,
            credential: input.code
          })
          .pipe(Effect.mapError(phoneFailure))

        if (!current.target.eligible) return yield* PhoneOtpRejected.make({})
        let authorization: PhoneActionAuthorization | undefined

        if (input.action !== "register") {
          if (current.challenge === null) return yield* PhoneActionRequired.make({})

          const verified = yield* (yield* PhoneActionEvidence).verify({
            invocation,
            challenge: current.challenge,
            ...(input.actionProof === undefined ? {} : { proof: input.actionProof })
          })

          const evidence = verified.evidence

          const actionRequirement = yield* Schema.decodeEffect(
            Schema.toCodecIso(AuthenticationRequirement)
          )(
            Schema.encodeSync(Schema.toCodecIso(AuthenticationRequirement))(verified.requirement)
          ).pipe(Effect.mapError(phoneActionFailure))

          if (
            evidence.flowId !== current.challenge.flowId ||
            evidence.bindingDigest !== current.challenge.bindingDigest ||
            evidence.revision.subjectId !== current.challenge.revision.subjectId ||
            evidence.revision.securityRevision !== current.challenge.revision.securityRevision
          ) {
            return yield* PhoneActionRequired.make({})
          }

          const requirement = yield* (yield* AuthenticationAuthority)
            .requirements(evidence)
            .pipe(Effect.mapError(phoneActionFailure))

          const assessment = yield* assessAuthentication(evidence, {
            ...requirement,
            maximumAgeMillis: Math.min(
              policy.maximumEvidenceAgeMillis,
              requirement.maximumAgeMillis
            )
          }).pipe(Effect.mapError(phoneActionFailure))

          if (!assessment.satisfied) return yield* PhoneActionRequired.make({})

          const actionAssessment = yield* assessAuthentication(evidence, {
            ...actionRequirement,
            maximumAgeMillis: Math.min(
              policy.maximumEvidenceAgeMillis,
              actionRequirement.maximumAgeMillis
            )
          }).pipe(Effect.mapError(phoneActionFailure))

          if (!actionAssessment.satisfied) return yield* PhoneActionRequired.make({})
          authorization = {
            challenge: current.challenge,
            evidence,
            requirement,
            actionRequirement
          }
        }

        const now = yield* DateTime.now
        const hooks = yield* LifecycleHooks

        const snapshot = yield* lifecycleSnapshotEffect({
          action: input.action === "register" ? "registration" : "identifier-change",
          operation: `${moduleId}/${input.action}`,
          method: "phone-otp",
          identifiers: [current.binding.identifier],
          ...(current.target.revision === null
            ? {}
            : { subjectId: current.target.revision.subjectId })
        }).pipe(Effect.orDie)

        yield* hooks.before(snapshot)

        const decision = yield* (yield* PhonePersistence)
          .mutate(
            {
              moduleId,
              action: input.action,
              commandId: input.commandId,
              target: current.target,
              policy,
              redemption,
              ...(authorization === undefined ? {} : { authorization })
            },
            (decision, journal) => {
              if (decision._tag === "Accepted") {
                journal.stage(
                  lifecycleEvent({
                    id: LifecycleEventId.make(`phone/${moduleId}/${input.commandId}`),
                    occurredAtMillis: now.epochMilliseconds,
                    snapshot: { ...snapshot, subjectId: decision.credential.revision.subjectId }
                  })
                )
              }

              return journal.prepare(decision)
            }
          )
          .pipe(
            Effect.flatMap((receipt) => receipt.read),
            Effect.mapError(phoneFailure)
          )

        if (decision._tag !== "Accepted") return yield* PhoneOtpRejected.make({})
        if (input.action !== "register") {
          return {
            value: {
              _tag: "Updated" as const,
              invalidation: sessionInvalidationWindow(
                "identifier-change",
                strategy.capabilities,
                strategy.policy
              )
            },
            credentialCommands: [{ _tag: "Clear" as const, slot: "request-binding" as const }]
          }
        }

        const credential = decision.credential,
          evidence: AuthenticationEvidence = {
            flowId: AuthenticationFlowId.make(input.flowId),
            bindingDigest: current.binding.contextDigest,
            revision: credential.revision,
            proofs: [
              {
                method: "phone-otp",
                credentialId: credential.credentialId,
                factors: ["possession"],
                userVerified: false,
                phishingResistant: false,
                verifiedAt: now
              }
            ]
          }

        const claimCredential = yield* Schema.encodeEffect(
          Schema.toCodecJson(PhoneCredentialSnapshot)
        )(credential).pipe(
          Effect.flatMap(Schema.decodeEffect(Schema.toCodecJson(PhoneCredentialSnapshot))),
          Effect.mapError(phoneFailure)
        )

        const claims = yield* (yield* SessionClaims).resolve({
          subjectId: credential.revision.subjectId,
          credential: claimCredential
        })

        const established = yield* (yield* sessions.AuthenticationCompletion)
          .prepare({ evidence, requirement: credential.requirement, claims })
          .pipe(
            Effect.flatMap((receipt) => receipt.read),
            Effect.mapError(phoneFailure)
          )

        return {
          value: { _tag: "Registered" as const, completion: established.value },
          credentialCommands: [
            ...established.credentialCommands,
            { _tag: "Clear" as const, slot: "request-binding" as const }
          ]
        }
      })
    ),
    Cancel.credentialHandlerLayer(
      Effect.fn("PhoneLifecycle.cancel")(function*(input, invocation) {
        const current = yield* capture(input, invocation)

        yield* (yield* proof.Proofs)
          .cancel(current.binding)
          .pipe(Effect.flatMap(readProofCommit), Effect.mapError(phoneFailure))

        return {
          value: undefined,
          credentialCommands: [{ _tag: "Clear" as const, slot: "request-binding" as const }]
        }
      })
    )
  ).pipe(Layer.provide(configurationLayer))

  const layer = handlersLayer.pipe(
    Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
    Layer.provide(defaultLayer(proof.Proofs, proof.smsLayer.pipe(Layer.provide(deliveryLayer)))),
    Layer.provide(hooksLayer)
  )

  const methods = {
    begin: Begin.invoke,
    completeLifecycle: CompleteLifecycle.invoke,
    cancelLifecycle: Cancel.invoke
  }

  return Object.freeze({
    SessionClaims,
    binding,
    proof,
    Result,
    layer,
    handlersLayer,
    operations: { Begin, CompleteLifecycle, Cancel },
    group: operationGroup(Begin, CompleteLifecycle, Cancel),
    strategy: makeAuthStrategy(
      methods,
      layer.pipe(
        Layer.merge(Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom)),
        Layer.provideMerge(defaultPhoneAdmissionLayer)
      ),
      { completion: true }
    )
  })
}
