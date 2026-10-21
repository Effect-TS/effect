import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

import { Locale, TokenDigest } from "../../Schema.ts"
import { makeAuthStrategy } from "../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../auth/defaults.ts"
import { hasCommitScope } from "../hooks/commit.ts"
import { HookDenied } from "../hooks/models.ts"
import { LoginIdentifier } from "../identity/models.ts"
import type { AuthInvocation } from "../operations/context.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { makeRequestBinding, RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import { readProofCommit } from "../proofs/dispatch.ts"
import { ProofBinding, ProofPurpose, ProofRequestId, ProofRequestReceipt } from "../proofs/models.ts"
import { makeProofModule } from "../proofs/module.ts"
import type { ProofPolicy } from "../proofs/policy.ts"
import { defaultProofPolicy } from "../proofs/policy.ts"
import { type AuthenticationEvidence, AuthenticationFlowId } from "../sessions/models.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { phoneAdmission, phoneAttemptAdmission } from "./admission.ts"
import { makePhoneClaims } from "./claims.ts"
import { deliveryLayer } from "./delivery.ts"
import { phoneFailure } from "./failure.ts"
import {
  PhoneCredentialSnapshot,
  PhoneNumber,
  PhoneOtpComplete,
  PhoneOtpRejected,
  PhoneOtpUnavailable
} from "./models.ts"
import { defaultPhoneAdmissionLayer } from "./phoneAdmission.ts"
import { PhoneDeliveryEligibility } from "./phoneDeliveryEligibility.ts"
import { PhoneSignInTargets } from "./phoneSignInTargets.ts"

const Start = Schema.Struct({
  flowId: RequestBindingFlowId,
  requestId: ProofRequestId,
  phoneNumber: PhoneNumber,
  locale: Locale,
  requestBinding: Schema.optionalKey(RequestBindingCredential)
})

const Challenge = Schema.Struct({ ...ProofRequestReceipt.fields, flowId: RequestBindingFlowId })
const Failure = Schema.Union([PhoneOtpRejected, PhoneOtpUnavailable, HookDenied])
const tuple = Schema.fromJsonString(Schema.Array(Schema.String))

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* PhoneOtpUnavailable.make({})
})

/** Existing-account SMS sign-in. Verification consumes its proof before session
 * issuance; failure after consumption requires a fresh code. No distributed
 * atomicity or implicit account linking is claimed.
 */
export const makePhoneOtp = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
    readonly policy?: ProofPolicy
    readonly digits?: 6 | 7 | 8 | 9 | 10
  }
) => {
  const { sessions } = options
  const binding = makeRequestBinding(moduleId, "phone-otp-sign-in")

  const proof = makeProofModule(`${moduleId}/sign-in`, {
    purpose: ProofPurpose.make("phone-otp-sign-in"),
    binding: ProofBinding,
    channel: "sms",
    template: "phone-otp-sign-in",
    secret: { _tag: "NumericCode", digits: options.digits ?? 6 },
    policy: options.policy ?? defaultProofPolicy
  })

  const SessionClaims = makePhoneClaims<Id, Claims>(moduleId)

  const capture = Effect.fn("PhoneOtp.capture")(function*(request: {
    readonly flowId: RequestBindingFlowId
    readonly phoneNumber: PhoneNumber
    readonly requestBinding: typeof RequestBindingCredential.Type
  }) {
    const verified = yield* (yield* binding.RequestBinding)
      .verify(request.flowId, request.requestBinding)
      .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure))))

    const candidate = yield* (yield* PhoneSignInTargets).lookup({
      moduleId,
      phoneNumber: request.phoneNumber
    })

    let target: Option.Option<PhoneCredentialSnapshot> = Option.none()

    if (Option.isSome(candidate)) {
      const codec = Schema.toCodecJson(PhoneCredentialSnapshot)

      const snapshot = yield* Schema.encodeEffect(codec)(candidate.value).pipe(
        Effect.flatMap(Schema.decodeEffect(codec)),
        Effect.mapError(phoneFailure)
      )

      if (
        snapshot.moduleId === moduleId &&
        snapshot.phoneNumber === request.phoneNumber &&
        snapshot.verifiedAtMillis <= DateTime.toEpochMillis(yield* DateTime.now) &&
        snapshot.revision.credentials.some(
          (value) =>
            value.credentialId === snapshot.credentialId &&
            value.revision === snapshot.credentialRevision
        )
      ) {
        target = Option.some(snapshot)
      }
    }

    const encoded = yield* Schema.encodeEffect(tuple)([
      "effect-auth/phone-otp-sign-in/v1",
      moduleId,
      request.flowId,
      verified.verifier,
      request.phoneNumber,
      Option.isSome(target) ? target.value.custodyRevision : ""
    ]).pipe(Effect.mapError(phoneFailure))

    const digest = yield* (yield* Digest.Digest)
      .digest(Digest.sha256, new TextEncoder().encode(encoded))
      .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure))))

    const base = {
      flowId: request.flowId,
      contextDigest: TokenDigest.make(Base64Url.encode(digest)),
      identifier: LoginIdentifier.make({ namespace: "phone", value: request.phoneNumber })
    }

    const proofBinding: ProofBinding = Option.isSome(target)
      ? { _tag: "Subject", ...base, revision: target.value.revision }
      : { _tag: "Identifier", ...base }

    return { target, binding: proofBinding }
  })

  const admitSignIn = Effect.fn("PhoneOtp.admitRequest")(function*() {
    if (!(yield* phoneAdmission(moduleId, "request"))) return yield* PhoneOtpRejected.make({})
  })

  const SignIn = makeOperation(`${moduleId}/sign-in`, {
    payload: Start,
    authorize: admitSignIn,
    success: Challenge,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  const Complete = makeOperation(`${moduleId}/complete`, {
    payload: PhoneOtpComplete,
    authorize: () => phoneAttemptAdmission(moduleId),
    success: sessions.CompletionResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const handlersLayer = Layer.mergeAll(
    SignIn.credentialHandlerLayer(
      Effect.fn("PhoneOtp.signIn")(function*(input, invocation) {
        yield* noAmbient()
        if (invocation._tag !== "Guest") return yield* PhoneOtpRejected.make({})

        const issued = input.requestBinding === undefined
          ? yield* (yield* binding.RequestBinding)
            .issue(input.flowId)
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure)))
            )
          : undefined

        const command = issued?.credentialCommands.find(
          (value) => value._tag === "Issue" && value.slot === "request-binding"
        )

        const requestBinding = input.requestBinding ?? (command?._tag === "Issue" ? command.credential : undefined)

        if (requestBinding === undefined) return yield* PhoneOtpUnavailable.make({})
        const current = yield* capture({ ...input, requestBinding })
        const eligible = yield* (yield* PhoneDeliveryEligibility).allowed(input.phoneNumber)

        const dispatch = yield* (yield* proof.Proofs)
          .prepareIssue({
            requestId: input.requestId,
            binding: current.binding,
            locale: input.locale,
            eligible: Option.isSome(current.target) && eligible
          })
          .pipe(
            Effect.flatMap(readProofCommit),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure)))
          )

        yield* dispatch.schedule.pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure)))
        )

        return {
          value: { ...dispatch.receipt, flowId: input.flowId },
          credentialCommands: issued?.credentialCommands ?? []
        }
      })
    ),
    Complete.credentialHandlerLayer(
      Effect.fn("PhoneOtp.completeSignIn")(function*(input, invocation) {
        yield* noAmbient()
        if (invocation._tag !== "Guest") return yield* PhoneOtpRejected.make({})
        const current = yield* capture(input)
        const verifiedAt = yield* DateTime.now
        const proofs = yield* proof.Proofs

        const consumed = yield* proofs
          .prepareRedeem({
            binding: current.binding,
            reference: input.reference,
            credential: input.code
          })
          .pipe(
            Effect.flatMap(readProofCommit),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure)))
          )

        if (consumed !== "redeemed" || Option.isNone(current.target)) {
          return yield* PhoneOtpRejected.make({})
        }

        const evidence: AuthenticationEvidence = {
          flowId: AuthenticationFlowId.make(input.flowId),
          bindingDigest: current.binding.contextDigest,
          revision: current.target.value.revision,
          proofs: [
            {
              method: "phone-otp",
              credentialId: current.target.value.credentialId,
              factors: ["possession"],
              userVerified: false,
              phishingResistant: false,
              verifiedAt
            }
          ]
        }

        const claimCredential = yield* Schema.encodeEffect(
          Schema.toCodecJson(PhoneCredentialSnapshot)
        )(current.target.value).pipe(
          Effect.flatMap(Schema.decodeEffect(Schema.toCodecJson(PhoneCredentialSnapshot))),
          Effect.mapError(phoneFailure)
        )

        const claims = yield* (yield* SessionClaims).resolve({
          subjectId: claimCredential.revision.subjectId,
          credential: claimCredential
        })

        const established = yield* (yield* sessions.AuthenticationCompletion)
          .prepare({ evidence, requirement: current.target.value.requirement, claims })
          .pipe(
            Effect.flatMap((receipt) => receipt.read),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure)))
          )

        return {
          value: established.value,
          credentialCommands: [
            ...established.credentialCommands,
            { _tag: "Clear" as const, slot: "request-binding" as const }
          ]
        }
      })
    )
  )

  const layer = handlersLayer.pipe(
    Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
    Layer.provide(defaultLayer(proof.Proofs, proof.smsLayer.pipe(Layer.provide(deliveryLayer)))),
    Layer.provide(hooksLayer)
  )

  return Object.freeze({
    persistence: { kind: "phone" as const, moduleId, lifecycle: false as const },
    SessionClaims,
    binding,
    proof,
    layer,
    handlersLayer,
    operations: { SignIn, Complete },
    group: operationGroup(SignIn, Complete),
    strategy: makeAuthStrategy(
      {
        signIn: Effect.fn("PhoneOtp.signInRequest")(function*(
          invocation: AuthInvocation,
          input: { readonly phoneNumber: string; readonly locale?: string }
        ) {
          const random = yield* SecureRandom.SecureRandom

          const flowId = yield* random
            .uuidV4()
            .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure))))

          const requestId = yield* random
            .uuidV4()
            .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, phoneFailure))))

          return yield* SignIn.invoke(invocation, {
            ...input,
            flowId,
            requestId,
            locale: input.locale ?? "en"
          })
        }),
        completeSignIn: Complete.invoke
      },
      layer.pipe(
        Layer.merge(Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom)),
        Layer.provideMerge(defaultPhoneAdmissionLayer)
      ),
      { completion: true }
    )
  })
}
