import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import { Email, Locale, type SubjectId, TokenDigest } from "../../Schema.ts"
import { makeAuthStrategy } from "../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../auth/defaults.ts"
import { hasCommitScope, type PreparedCommit } from "../hooks/commit.ts"
import { HookDenied } from "../hooks/models.ts"
import { LoginIdentifier } from "../identity/models.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import {
  makeRequestBinding,
  RequestBindingCredential,
  RequestBindingFlowId,
  RequestBindingPublic
} from "../operations/requestBinding.ts"
import { proofRequestAdmission } from "../proofs/admission.ts"
import type { ProofSecretPolicy } from "../proofs/crypto.ts"
import { readProofCommit } from "../proofs/dispatch.ts"
import { defaultIngressLayer } from "../proofs/hostIngressLimiter.ts"
import { ProofBinding, ProofPurpose, ProofReference, ProofRequestId, ProofRequestReceipt } from "../proofs/models.ts"
import { makeProofModule } from "../proofs/module.ts"
import type { ProofPolicy } from "../proofs/policy.ts"
import type { AuthenticationEvidence } from "../sessions/models.ts"
import { AuthenticationFlowId } from "../sessions/models.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { type EmailAddressPolicy, makeEmailAddresses } from "./addresses.ts"
import { EmailReturnTargets } from "./emailReturnTargets.ts"
import { EmailSignInTargets } from "./emailSignInTargets.ts"
import {
  EmailActionRequired,
  emailCompletionFailure,
  EmailConfigurationError,
  EmailMethodUnsupported,
  EmailRejected,
  EmailUnavailable
} from "./errors.ts"
import { type EmailCredentialSnapshot, SafeReturnTarget } from "./models.ts"
import { makeEmailRegistration } from "./registration.ts"
import { snapshotEmailCredential } from "./snapshot.ts"

const EmailInput = Schema.String.check(Schema.isMaxLength(320)).pipe(Schema.decodeTo(Email))
const Secret = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))
const FlowInput = { flowId: RequestBindingFlowId, requestBinding: RequestBindingCredential }

const SignInBase = {
  ...FlowInput,
  email: EmailInput,
  returnTarget: Schema.String.check(Schema.isMaxLength(2048))
}

const SignInBindingInput = Schema.Struct(SignInBase)

const RequestInput = Schema.Struct({
  ...SignInBase,
  requestId: ProofRequestId,
  locale: Locale
})

const CompleteInput = Schema.Struct({ ...SignInBase, reference: ProofReference, secret: Secret })

const Failure = Schema.Union([
  EmailRejected,
  EmailUnavailable,
  EmailActionRequired,
  EmailMethodUnsupported,
  HookDenied
])

type Failure = typeof Failure.Type

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* EmailMethodUnsupported.make({})
})

const read = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
  )

const tupleCodec = Schema.fromJsonString(Schema.Array(Schema.String))

export interface EmailModule<Id extends string, Kind extends string, Claims> {
  readonly moduleId: Id
  readonly kind: Kind
  readonly claims: Types.Invariant<Claims>
}

/** Separate capability Layers keep sign-in-only installations free of registration,
 * address mutation and notification dependencies. Proof/session authorities remain
 * consumer-owned; this factory installs no storage or implicit mail sender.
 */
export interface EmailProofOptions<Mode extends "code" | "link"> {
  readonly url?: string
  readonly secret: {
    readonly code: Extract<ProofSecretPolicy, { readonly _tag: "NumericCode" }>
    readonly link: Extract<ProofSecretPolicy, { readonly _tag: "Token" }>
  }[Mode]
  readonly policy: ProofPolicy
}

/** @internal */
export const makeEmailSignInModule = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  const Mode extends "code" | "link"
>(
  moduleId: Id,
  options: {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
    readonly mode: Mode
    readonly proof: EmailProofOptions<Mode>
  }
) => {
  const sessions = options.sessions
  const binding = makeRequestBinding(moduleId, "email-entry")

  /** Supply application session claims for the verified email's subject. */
  const SessionClaims = Context.Service<
    EmailModule<Id, "claims", Claims["Type"]>,
    {
      readonly resolve: (input: {
        readonly subjectId: SubjectId
        readonly credential: EmailCredentialSnapshot
      }) => Effect.Effect<Claims["Type"], EmailUnavailable>
    }
  >(`@effect/auth/email/${moduleId}/Claims`)

  const Begin = makeOperation(`${moduleId}/flow/begin`, {
    payload: Schema.Struct({ flowId: RequestBindingFlowId }),
    success: RequestBindingPublic,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  const beginLayer = Begin.credentialHandlerLayer(
    Effect.fn("Email.Begin")(function*(request) {
      yield* noAmbient()

      return yield* (yield* binding.RequestBinding)
        .issue(request.flowId)
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
    })
  )

  const makeSignIn = <const Mode extends "code" | "link">(mode: Mode) => {
    const proof = makeProofModule(`${moduleId}/${mode}-sign-in`, {
      ...options.proof,
      purpose: ProofPurpose.make(
        mode === "code" ? "email-code-sign-in" : "email-magic-link-sign-in"
      ),
      binding: ProofBinding,
      channel: "email"
    })

    const CompletionResult = Schema.Struct({
      completion: sessions.CompletionResult,
      returnTarget: SafeReturnTarget
    })

    const SignIn = Context.Service<
      EmailModule<Id, `${Mode}-sign-in`, Claims["Type"]>,
      {
        readonly request: (
          input: typeof RequestInput.Type
        ) => Effect.Effect<ProofRequestReceipt, Failure>
        readonly complete: (
          input: typeof CompleteInput.Type
        ) => Effect.Effect<AuthOperationResult<typeof CompletionResult.Type>, Failure>
      }
    >(`@effect/auth/email/${moduleId}/${mode}/SignIn`)

    const layer = Layer.effect(
      SignIn,
      Effect.gen(function*() {
        if (
          !Schema.is(Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._:/-]{1,128}$/)))(moduleId)
        ) {
          return yield* EmailConfigurationError.make({})
        }
        const binder = yield* binding.RequestBinding
        const targets = yield* EmailSignInTargets
        const returns = yield* EmailReturnTargets
        const proofs = yield* proof.Proofs
        const claims = yield* SessionClaims
        const completion = yield* sessions.AuthenticationCompletion
        const digestService = yield* Digest.Digest

        const bound = Effect.fn("Email.signInBinding")(function*(
          request: typeof SignInBindingInput.Type
        ) {
          const verified = yield* binder
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

          const returnTarget = yield* returns.resolve(request.returnTarget)
          const identifier = LoginIdentifier.make({ namespace: "email", value: request.email })
          const candidate = yield* targets.lookup({ moduleId, identifier })
          let target: Option.Option<EmailCredentialSnapshot> = Option.none()

          if (Option.isSome(candidate)) {
            const snapshot = yield* snapshotEmailCredential(candidate.value)

            if (
              snapshot.moduleId === moduleId &&
              snapshot.identifier.namespace === "email" &&
              snapshot.identifier.value === identifier.value &&
              snapshot.revision.credentials.some(
                (item) =>
                  item.credentialId === snapshot.credentialId &&
                  item.revision === snapshot.credentialRevision
              )
            ) {
              target = Option.some(snapshot)
            }
          }

          const message = yield* Schema.encodeEffect(tupleCodec)([
            "effect-auth/email-sign-in/v1",
            moduleId,
            mode,
            request.flowId,
            verified.verifier,
            identifier.value,
            returnTarget
          ]).pipe(Effect.mapError(() => EmailUnavailable.make({})))

          const bytes = yield* digestService
            .digest(Digest.sha256, new TextEncoder().encode(message))
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
            )

          const base = {
            flowId: request.flowId,
            contextDigest: TokenDigest.make(Base64Url.encode(bytes)),
            identifier
          }

          const proofBinding: ProofBinding = Option.isSome(target)
            ? { _tag: "Subject", ...base, revision: target.value.revision }
            : { _tag: "Identifier", ...base }

          return { target, binding: proofBinding, returnTarget }
        })

        return SignIn.of({
          request: Effect.fn("Email.signInRequest")(function*(request) {
            yield* noAmbient()
            const current = yield* bound(request)

            const dispatch = yield* proofs
              .prepareIssue({
                requestId: request.requestId,
                binding: current.binding,
                locale: request.locale,
                eligible: Option.isSome(current.target)
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
          complete: Effect.fn("Email.signInComplete")(function*(request) {
            yield* noAmbient()
            const current = yield* bound(request)

            // Verification starts here. Never timestamp the
            // later claims/crypto/session work, or refresh the captured semantic revision.
            const verifiedAt = yield* DateTime.now

            const consumed = yield* proofs
              .prepareRedeem({
                binding: current.binding,
                reference: request.reference,
                credential: request.secret
              })
              .pipe(
                Effect.flatMap(readProofCommit),
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
              )

            if (consumed !== "redeemed" || Option.isNone(current.target)) {
              return yield* EmailRejected.make({})
            }

            const evidence: AuthenticationEvidence = {
              flowId: AuthenticationFlowId.make(request.flowId),
              bindingDigest: current.binding.contextDigest,
              revision: current.target.value.revision,
              proofs: [
                {
                  method: mode === "code" ? "email-code" : "magic-link",
                  credentialId: current.target.value.credentialId,
                  factors: ["possession"],
                  userVerified: false,
                  phishingResistant: false,
                  verifiedAt
                }
              ]
            }

            const credential = yield* snapshotEmailCredential(current.target.value)

            const applicationClaims = yield* claims.resolve({
              subjectId: credential.revision.subjectId,
              credential
            })

            // Proof consumption has committed. Session failure burns this proof and
            // requires a fresh request; no cross-owner atomicity is claimed here.
            const established = yield* completion
              .prepare({
                evidence,
                requirement: current.target.value.requirement,
                claims: applicationClaims
              })
              .pipe(
                Effect.flatMap(read),
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
              )

            return {
              value: { completion: established.value, returnTarget: current.returnTarget },
              credentialCommands: [
                ...established.credentialCommands,
                { _tag: "Clear", slot: "request-binding" }
              ]
            }
          })
        })
      })
    )

    const admitRequest = proofRequestAdmission(`${moduleId}/${mode}/sign-in`).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
    )

    const Request = makeOperation(`${moduleId}/${mode}/sign-in/request`, {
      authorize: () => admitRequest,
      payload: RequestInput,
      success: ProofRequestReceipt,
      error: Failure,
      access: "any",
      exposure: "public",
      replay: "non-idempotent"
    })

    const Complete = makeOperation(`${moduleId}/${mode}/sign-in/complete`, {
      payload: CompleteInput,
      success: CompletionResult,
      error: Failure,
      access: "any",
      exposure: "public",
      replay: "single-use",
      credentials: true
    })

    const handlersLayer = Layer.mergeAll(
      Request.handlerLayer(
        Effect.fn("Email.Request")(function*(input) {
          return yield* (yield* SignIn).request(input)
        })
      ),
      Complete.credentialHandlerLayer(
        Effect.fn("Email.Complete")(function*(input) {
          return yield* (yield* SignIn).complete(input)
        })
      )
    )

    return Object.freeze({
      strategy: makeAuthStrategy(
        {
          beginSignIn: Begin.invoke,
          signIn: Request.invoke,
          completeSignIn: Complete.invoke
        },
        Layer.merge(beginLayer, handlersLayer).pipe(
          Layer.provide(defaultLayer(SignIn, layer)),
          Layer.provide(defaultLayer(proof.Proofs, proof.emailLayer)),
          Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
          Layer.provide(hooksLayer),
          Layer.merge(defaultIngressLayer)
        ),
        { completion: true }
      ),
      SignIn,
      layer,
      proof,
      operations: { Request, Complete },
      handlersLayer
    })
  }

  return Object.freeze({
    ...makeSignIn(options.mode),
    binding,
    Begin,
    beginLayer,
    SessionClaims
  })
}

/** Explicit contracts for applications assembling multiple email capabilities together. */
export const makeEmailAccountModule = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
    readonly code: {
      readonly secret: Extract<ProofSecretPolicy, { readonly _tag: "NumericCode" }>
      readonly policy: ProofPolicy
    }
  }
) => {
  const sessions = options.sessions
  const code = makeEmailSignInModule(moduleId, { sessions, mode: "code", proof: options.code })
  const { binding, Begin, beginLayer, SessionClaims } = code

  const registrationProof = makeProofModule(`${moduleId}/registration`, {
    ...options.code,
    purpose: ProofPurpose.make("email-code-registration"),
    binding: ProofBinding,
    channel: "email"
  })

  const verifyProof = makeProofModule(`${moduleId}/verify-address`, {
    ...options.code,
    purpose: ProofPurpose.make("email-address-verification"),
    binding: ProofBinding,
    channel: "email"
  })

  const changeProof = makeProofModule(`${moduleId}/change-address`, {
    ...options.code,
    purpose: ProofPurpose.make("email-address-change"),
    binding: ProofBinding,
    channel: "email"
  })

  const registration = <Registration extends Schema.Codec<unknown, unknown, unknown, unknown>>(
    codec: Registration
  ) => {
    const module = makeEmailRegistration(moduleId, codec, registrationProof, binding)

    return Object.freeze({
      ...module,
      strategy: makeAuthStrategy(
        {
          beginRegistration: Begin.invoke,
          register: module.operations.Request.invoke,
          completeRegistration: module.operations.Complete.invoke
        },
        Layer.merge(beginLayer, module.handlersLayer).pipe(
          Layer.provide(defaultLayer(module.Registrations, module.layer)),
          Layer.provide(defaultLayer(registrationProof.Proofs, registrationProof.emailLayer)),
          Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
          Layer.provide(hooksLayer),
          Layer.merge(defaultIngressLayer)
        )
      )
    })
  }

  const addresses = (policy: EmailAddressPolicy) => {
    const module = makeEmailAddresses(
      moduleId,
      binding,
      verifyProof,
      changeProof,
      sessions,
      policy
    )

    return Object.freeze({
      ...module,
      persistence: Object.freeze({ kind: "email" as const, moduleId, addresses: true as const }),
      strategy: makeAuthStrategy(
        {
          beginEmailAddress: Begin.invoke,
          requestEmailVerification: module.verify.operations.Request.invoke,
          completeEmailVerification: module.verify.operations.Complete.invoke,
          requestEmailChange: module.change.operations.Request.invoke,
          completeEmailChange: module.change.operations.Complete.invoke
        },
        Layer.mergeAll(beginLayer, module.verify.handlersLayer, module.change.handlersLayer).pipe(
          Layer.provide(defaultLayer(module.Addresses, module.layer)),
          Layer.provide([
            defaultLayer(verifyProof.Proofs, verifyProof.emailLayer),
            defaultLayer(changeProof.Proofs, changeProof.emailLayer)
          ]),
          Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
          Layer.provide(hooksLayer),
          Layer.merge(defaultIngressLayer)
        )
      )
    })
  }

  return Object.freeze({
    binding,
    Begin,
    beginLayer,
    SessionClaims,
    registration,
    addresses
  })
}

/** Explicit contracts for hosts exposing code, link and account operations together. */
export const makeEmailMethod = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: Parameters<typeof makeEmailAccountModule<Id, SessionId, Claims>>[1] & {
    readonly link: { readonly policy: ProofPolicy; readonly url: string }
  }
) => {
  const accounts = makeEmailAccountModule<Id, SessionId, Claims>(moduleId, options)

  const code = makeEmailSignInModule<Id, SessionId, Claims, "code">(moduleId, {
    sessions: options.sessions,
    mode: "code",
    proof: options.code
  })

  const link = makeEmailSignInModule<Id, SessionId, Claims, "link">(moduleId, {
    sessions: options.sessions,
    mode: "link",
    proof: { ...options.link, secret: { _tag: "Token" } }
  })

  return Object.freeze({
    ...accounts,
    code,
    link,
    group: operationGroup(
      accounts.Begin,
      ...Object.values(code.operations),
      ...Object.values(link.operations)
    )
  })
}
