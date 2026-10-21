import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import type { SubjectId } from "../../../Schema.ts"
import { Email, Locale } from "../../../Schema.ts"
import { makeAuthStrategy } from "../../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../../auth/defaults.ts"
import { hasCommitScope, type PreparedCommit } from "../../hooks/commit.ts"
import { LifecycleHooks } from "../../hooks/lifecycleHooks.ts"
import { HookDenied, lifecycleEvent, lifecycleSnapshot } from "../../hooks/models.ts"
import { LoginIdentifier } from "../../identity/models.ts"
import type { AuthInvocation } from "../../operations/context.ts"
import type { AuthOperationResult } from "../../operations/credentials.ts"
import { makeOperation, operationGroup } from "../../operations/operation.ts"
import { proofRequestAdmission } from "../../proofs/admission.ts"
import type { ProofSecretPolicy } from "../../proofs/crypto.ts"
import { readProofCommit } from "../../proofs/dispatch.ts"
import { defaultIngressLayer } from "../../proofs/hostIngressLimiter.ts"
import { ProofBinding, ProofPurpose, ProofReference, ProofRequestId, ProofRequestReceipt } from "../../proofs/models.ts"
import { makeProofModule } from "../../proofs/module.ts"
import type { ProofPolicy } from "../../proofs/policy.ts"
import type { ProofRedemptionPlan } from "../../proofs/redemption.ts"
import { assessAuthentication, snapshotAuthenticationEvidence } from "../../sessions/assurance.ts"
import { AuthenticationAuthority } from "../../sessions/authenticationAuthority.ts"
import { SessionInvalidationWindow, sessionInvalidationWindow } from "../../sessions/invalidation.ts"
import type { AuthenticationEvidence } from "../../sessions/models.ts"
import { AuthenticationFlowId } from "../../sessions/models.ts"
import type { makeSessionModule } from "../../sessions/module.ts"
import { newPasswordLayer } from "../defaults.ts"
import { NewPasswordRejected, PasswordCheckUnavailable } from "../errors.ts"
import { NewPasswordCheck } from "../newPasswordCheck.ts"
import { PasswordHashing } from "../passwordHashing.ts"
import { PasswordSignInInput } from "./contracts.ts"
import {
  PasswordActionRequired,
  PasswordMethodConfigurationError,
  PasswordMethodUnsupported,
  PasswordRejected,
  PasswordUnavailable
} from "./errors.ts"
import {
  type PasswordAction,
  type PasswordActionAuthorization,
  PasswordActionChallenge,
  PasswordCommandId,
  type PasswordCredentialSnapshot,
  type PasswordReplacement
} from "./models.ts"
import { PasswordActionEvidence } from "./passwordActionEvidence.ts"
import { defaultPasswordAttemptLimiterLayer, PasswordAttemptLimiter } from "./passwordAttemptLimiter.ts"
import { type PasswordMutationInput, PasswordPersistence, type PreparePasswordCommit } from "./passwordPersistence.ts"
import { type PasswordMethodPolicy, snapshotPasswordMethodPolicy, validatePasswordMethodPolicy } from "./policy.ts"
import { makePasswordPreparation } from "./preparation.ts"
import { makePasswordSignIn, type PasswordSignInOptions } from "./signIn.ts"
import { snapshotPasswordCredential, snapshotPasswordRequirement, snapshotPasswordRevision } from "./snapshot.ts"
import { passwordCompletionFailure } from "./verification.ts"

export interface MethodService<Id extends string, Kind extends string> {
  readonly moduleId: Id
  readonly kind: Kind
}

const BoundedEmail = Schema.String.check(Schema.isMaxLength(320)).pipe(Schema.decodeTo(Email))
const Password = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(65536)))
const OpaqueProof = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))
const FlowId = AuthenticationFlowId.check(Schema.isMaxLength(256))

const RegisterResult = Schema.TaggedStruct("RegistrationAccepted", {})

export type PasswordRegistrationDecision =
  | { readonly _tag: "Created"; readonly subjectId: SubjectId }
  | { readonly _tag: "Suppressed" }

const MutationResult = Schema.Struct({ invalidation: SessionInvalidationWindow })
const Status = Schema.Struct({ hasPassword: Schema.Boolean })

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* PasswordMethodUnsupported.make({})
})

const read = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
  )

/** Public email/password method. Trusted claims/provisioning/action capabilities
 * are explicit; no product account model, implicit login or MFA bypass is supplied.
 */
const makePasswordWithManagement = <
  const Id extends string,
  const SessionModuleId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  Registration extends Schema.Codec<unknown, unknown, unknown, unknown>,
  const Secret extends ProofSecretPolicy = ProofSecretPolicy
>(
  moduleId: Id,
  input: {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionModuleId, Claims>>
    readonly registration: Registration
    readonly policy: PasswordMethodPolicy
    readonly reset: {
      readonly secret: Secret
      readonly url?: string
      readonly policy: ProofPolicy
    }
  }
) => {
  const sessions = input.sessions

  const RegistrationCodec: Schema.Codec<
    Registration["Type"],
    Registration["Encoded"],
    Registration["DecodingServices"],
    Registration["EncodingServices"]
  > = input.registration

  const policyInput = snapshotPasswordMethodPolicy(input.policy)

  const reset = makeProofModule(`${moduleId}/reset`, {
    ...input.reset,
    purpose: ProofPurpose.make("password-reset"),
    binding: ProofBinding,
    channel: "email"
  })

  type Completion = typeof sessions.CompletionResult.Type

  const RegistrationAuthority = Context.Service<
    MethodService<Id, "registration"> & {
      readonly registration: Types.Invariant<Registration["Type"]>
    },
    {
      /** Join synchronous application provisioning, the unverified identifier and
       * create-if-absent password under one owner. Provision idempotently by requestId.
       * Never adopt or replace an existing login; suppress retries uniformly without
       * exposing the subject or comparing salted verifiers for password equality.
       */
      readonly register: <A>(
        input: {
          readonly moduleId: string
          readonly requestId: string
          readonly identifier: LoginIdentifier
          readonly registration: Registration["Type"]
          readonly replacement: PasswordReplacement
        },
        prepare: PreparePasswordCommit<PasswordRegistrationDecision, A>
      ) => Effect.Effect<PreparedCommit<A>, PasswordUnavailable>
    }
  >(`@effect/auth/password/${moduleId}/RegistrationAuthority`)

  /** Supply application session claims for the verified password's subject. */
  const SessionClaims = Context.Service<
    MethodService<Id, "claims"> & { readonly claims: Types.Invariant<Claims["Type"]> },
    {
      readonly resolve: (input: {
        readonly subjectId: SubjectId
        readonly credential: PasswordCredentialSnapshot
      }) => Effect.Effect<Claims["Type"], PasswordUnavailable>
    }
  >(`@effect/auth/password/${moduleId}/Claims`)

  const RegisterInput = Schema.Struct({
    requestId: PasswordCommandId,
    email: BoundedEmail,
    newPassword: Password,
    registration: RegistrationCodec
  })

  const SignInInput = Schema.Struct({ flowId: FlowId, ...PasswordSignInInput.fields })

  const ActionInput = {
    commandId: PasswordCommandId,
    newPassword: Password,
    actionProof: Schema.optionalKey(OpaqueProof)
  }

  const AddInput = Schema.Struct(ActionInput)

  const ChangeInput = Schema.Struct({
    ...ActionInput,
    currentPassword: Schema.optionalKey(Password)
  })

  const ResetBase = { flowId: FlowId, email: BoundedEmail }

  const RequestResetInput = Schema.Struct({
    ...ResetBase,
    requestId: ProofRequestId,
    locale: Locale
  })

  const CompleteResetInput = Schema.Struct({
    ...ResetBase,
    ...ActionInput,
    reference: ProofReference,
    secret: OpaqueProof
  })

  const Failure = Schema.Union([
    PasswordRejected,
    PasswordUnavailable,
    PasswordActionRequired,
    PasswordMethodUnsupported,
    NewPasswordRejected,
    PasswordCheckUnavailable,
    HookDenied
  ])

  type Failure = typeof Failure.Type
  type MutationValue = AuthOperationResult<
    typeof MutationResult.Type | { readonly _tag: "Rejected" }
  >
  type Mutation = {
    readonly input: PasswordMutationInput
    readonly prepare: PreparePasswordCommit<"changed" | "rejected", MutationValue>
  }
  type Plan<A, Owner = PasswordPersistence> = {
    readonly commit: Effect.Effect<PreparedCommit<A>, Failure, Owner>
  }

  const Passwords = Context.Service<
    MethodService<Id, "method"> & {
      readonly claims: Types.Invariant<Claims["Type"]>
      readonly registration: Types.Invariant<Registration["Type"]>
    },
    {
      readonly planRegister: (
        input: typeof RegisterInput.Type
      ) => Effect.Effect<
        Plan<typeof RegisterResult.Type, typeof RegistrationAuthority.Identifier>,
        Failure
      >
      readonly signIn: (
        input: typeof SignInInput.Type
      ) => Effect.Effect<AuthOperationResult<Completion>, Failure>
      readonly planAdd: (
        invocation: AuthInvocation,
        input: typeof AddInput.Type
      ) => Effect.Effect<Plan<MutationValue>, Failure>
      readonly planChange: (
        invocation: AuthInvocation,
        input: typeof ChangeInput.Type
      ) => Effect.Effect<Plan<MutationValue>, Failure>
      readonly requestReset: (
        input: typeof RequestResetInput.Type
      ) => Effect.Effect<ProofRequestReceipt, Failure>
      readonly planReset: (
        invocation: AuthInvocation,
        input: typeof CompleteResetInput.Type
      ) => Effect.Effect<Plan<MutationValue>, Failure>
      readonly status: (invocation: AuthInvocation) => Effect.Effect<typeof Status.Type, Failure>
    }
  >(`@effect/auth/password/${moduleId}/Method`)

  const layer = Layer.effect(
    Passwords,
    Effect.gen(function*() {
      if (!Schema.is(Schema.NonEmptyString.check(Schema.isMaxLength(128)))(moduleId)) {
        return yield* PasswordMethodConfigurationError.make({})
      }
      const policy = yield* validatePasswordMethodPolicy(policyInput)

      const strategy = yield* sessions.SessionStrategy

      if (
        policy.requireImmediateInvalidation &&
        (strategy.capabilities.subjectInvalidation !== "immediate" ||
          strategy.capabilities.positiveCacheMillis > 0)
      ) {
        return yield* PasswordMethodConfigurationError.make({})
      }
      const store = yield* PasswordPersistence
      const limiter = yield* PasswordAttemptLimiter
      const hasher = yield* PasswordHashing
      const checker = yield* NewPasswordCheck
      const actionEvidence = yield* PasswordActionEvidence
      const claims = yield* SessionClaims
      const authority = yield* AuthenticationAuthority
      const completion = yield* sessions.AuthenticationCompletion
      const proofs = yield* reset.Proofs
      const hooks = yield* LifecycleHooks
      const digestService = yield* Digest.Digest
      const random = yield* SecureRandom.SecureRandom

      const services = yield* Effect.context<
        Registration["DecodingServices"] | Registration["EncodingServices"]
      >()

      const registrationCodec = Schema.toCodecIso(RegistrationCodec)

      const preparationServices = Context.make(PasswordPersistence, store).pipe(
        Context.add(PasswordAttemptLimiter, limiter),
        Context.add(PasswordHashing, hasher),
        Context.add(NewPasswordCheck, checker),
        Context.add(AuthenticationAuthority, authority),
        Context.add(LifecycleHooks, hooks),
        Context.add(Digest.Digest, digestService),
        Context.add(SecureRandom.SecureRandom, random)
      )

      const preparation = makePasswordPreparation({ moduleId, policy })

      const shared = {
        identifier: preparation.identifier,
        digest: (...args: Parameters<typeof preparation.digest>) =>
          preparation.digest(...args).pipe(Effect.provide(preparationServices)),
        newReplacement: (...args: Parameters<typeof preparation.newReplacement>) =>
          preparation.newReplacement(...args).pipe(Effect.provide(preparationServices)),
        event: (...args: Parameters<typeof preparation.event>) =>
          preparation.event(...args).pipe(Effect.provide(preparationServices)),
        verifyPassword: (...args: Parameters<typeof preparation.verifyPassword>) =>
          preparation.verifyPassword(...args).pipe(Effect.provide(preparationServices))
      }

      const { digest, identifier, newReplacement, event, verifyPassword } = shared

      const recoveryBinding = Effect.fn("Passwords.recoveryBinding")(function*(request: {
        readonly flowId: AuthenticationFlowId
        readonly email: Email
      }) {
        const id = identifier(request.email)

        const target = yield* store
          .recoveryTarget({ moduleId, identifier: id })
          .pipe(
            Effect.flatMap((value) =>
              Option.isNone(value)
                ? Effect.succeed(Option.none<PasswordCredentialSnapshot>())
                : snapshotPasswordCredential(value.value).pipe(Effect.map(Option.some))
            )
          )

        const base = {
          flowId: request.flowId,
          contextDigest: yield* digest([
            "effect-auth/password-reset/v1",
            moduleId,
            request.flowId,
            request.email
          ]),
          identifier: id
        }

        if (Option.isNone(target)) {
          return { binding: { _tag: "Identifier" as const, ...base }, target }
        }
        if (
          target.value.identifierVerifiedAtMillis === undefined ||
          target.value.identifier.value !== request.email ||
          target.value.identifier.namespace !== "email" ||
          target.value.moduleId !== moduleId
        ) {
          return yield* PasswordUnavailable.make({})
        }

        return {
          binding: { _tag: "Subject" as const, ...base, revision: target.value.revision },
          target
        }
      })

      const planMutation = Effect.fn("Passwords.planMutation")(function*(
        action: PasswordAction,
        invocation: AuthInvocation,
        request: typeof AddInput.Type,
        expectedRevision: AuthenticationEvidence["revision"],
        credential?: PasswordCredentialSnapshot,
        currentPasswordEvidence?: AuthenticationEvidence,
        recovery?: ProofRedemptionPlan
      ): Effect.fn.Return<Mutation, Failure> {
        expectedRevision = snapshotPasswordRevision(expectedRevision)

        const replacement = yield* newReplacement(
          request.newPassword,
          credential?.identifier.value as Email | undefined
        )

        const privateBinding = yield* digest([
          "effect-auth/password-action/v1",
          moduleId,
          action,
          request.commandId,
          expectedRevision.subjectId,
          expectedRevision.securityRevision,
          credential?.credentialId ?? "",
          ...[...expectedRevision.credentials]
            .sort((a, b) => a.credentialId < b.credentialId ? -1 : a.credentialId > b.credentialId ? 1 : 0)
            .flatMap((item) => [item.credentialId, item.revision]),
          replacement.normalization,
          Redacted.value(replacement.verifier)
        ])

        const validatedChallenge = PasswordActionChallenge.make({
          moduleId,
          action,
          commandId: request.commandId,
          revision: expectedRevision,
          ...(credential === undefined ? {} : { targetCredentialId: credential.credentialId }),
          bindingDigest: privateBinding
        })

        const challenge = Object.freeze({
          ...validatedChallenge,
          revision: snapshotPasswordRevision(validatedChallenge.revision)
        })

        const granted = yield* actionEvidence.verify({
          challenge,
          invocation,
          ...(request.actionProof === undefined ? {} : { proof: request.actionProof }),
          ...(currentPasswordEvidence === undefined ? {} : { currentPasswordEvidence }),
          ...(recovery === undefined ? {} : { recovery: recovery.input })
        })

        const evidenceValue = yield* snapshotAuthenticationEvidence(granted.evidence).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordActionRequired.make({}))))
        )

        const evidence = {
          ...evidenceValue,
          revision: snapshotPasswordRevision(evidenceValue.revision)
        }

        if (
          evidence.flowId !== AuthenticationFlowId.make(request.commandId) ||
          evidence.bindingDigest !== privateBinding ||
          evidence.revision.subjectId !== expectedRevision.subjectId ||
          evidence.revision.securityRevision !== expectedRevision.securityRevision ||
          expectedRevision.credentials.some(
            (item) =>
              !evidence.revision.credentials.some(
                (verified) =>
                  verified.credentialId === item.credentialId &&
                  verified.revision === item.revision
              )
          )
        ) {
          return yield* PasswordActionRequired.make({})
        }

        const requirement = yield* snapshotPasswordRequirement({
          ...granted.requirement,
          maximumAgeMillis: Math.min(
            granted.requirement.maximumAgeMillis,
            policy.maximumEvidenceAgeMillis
          )
        })

        if (
          !(yield* assessAuthentication(evidence, requirement).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordActionRequired.make({}))))
          )).satisfied
        ) {
          return yield* PasswordActionRequired.make({})
        }
        const authorization: PasswordActionAuthorization = { challenge, evidence, requirement }

        const invalidation = sessionInvalidationWindow(
          action === "reset-password" ? "password-reset" : "credential-change",
          strategy.capabilities,
          strategy.policy
        )

        const changed = yield* event(
          "credential-change",
          credential?.identifier ??
            LoginIdentifier.make({ namespace: "subject", value: expectedRevision.subjectId }),
          expectedRevision.subjectId
        )

        return {
          input: {
            moduleId,
            commandId: request.commandId,
            expectedRevision,
            ...(credential === undefined ? {} : { credential }),
            replacement,
            authorization,
            invalidation
          },
          prepare: (decision, journal) => {
            if (decision === "changed") journal.stage(changed)

            // Rejection is a committed VALUE until the caller reads the root receipt.
            return journal.prepare({
              value: decision === "changed" ? { invalidation } : { _tag: "Rejected" as const },
              credentialCommands: decision === "changed"
                ? [
                  { _tag: "Clear" as const, slot: "session" as const },
                  { _tag: "Clear" as const, slot: "pending-proof" as const }
                ]
                : []
            })
          }
        }
      })

      return Passwords.of({
        planRegister: Effect.fn("Passwords.planRegister")(function*(request) {
          yield* noAmbient()

          const data = yield* Schema.encodeEffect(registrationCodec)(request.registration).pipe(
            Effect.flatMap(Schema.decodeEffect(registrationCodec)),
            Effect.provide(services),
            Effect.mapError(() => PasswordRejected.make({}))
          )

          const replacement = yield* newReplacement(request.newPassword, request.email)
          const id = identifier(request.email)
          const created = yield* event("registration", id)

          const commit = Effect.gen(function*() {
            const owner = yield* RegistrationAuthority

            return yield* owner.register(
              {
                moduleId,
                requestId: request.requestId,
                identifier: id,
                registration: data,
                replacement
              },
              (decision, journal) => {
                if (decision._tag === "Created") {
                  journal.stage(
                    lifecycleEvent({
                      ...created,
                      snapshot: lifecycleSnapshot({
                        ...created.snapshot,
                        subjectId: decision.subjectId
                      })
                    })
                  )
                }

                return journal.prepare({ _tag: "RegistrationAccepted" as const })
              }
            )
          })

          return { commit }
        }),
        signIn: Effect.fn("Passwords.signIn")(function*(request) {
          const verified = yield* verifyPassword(request, "sign-in")

          const credential = yield* snapshotPasswordCredential(verified.credential)

          const values = yield* claims.resolve({
            subjectId: credential.revision.subjectId,
            credential
          })

          // Session issuance rechecks the authority captured before verification.
          return yield* completion
            .prepare({
              evidence: verified.evidence,
              requirement: verified.requirement,
              claims: values
            })
            .pipe(
              Effect.flatMap(read),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, passwordCompletionFailure)))
            )
        }),
        planAdd: Effect.fn("Passwords.planAdd")(function*(invocation, request) {
          yield* noAmbient()
          if (invocation._tag !== "Authenticated") return yield* PasswordRejected.make({})
          const caller = invocation
          const existing = yield* store.readForSubject({ moduleId, subjectId: caller.subjectId })

          if (Option.isSome(existing)) return yield* PasswordRejected.make({})

          const revision = snapshotPasswordRevision(
            yield* authority.capture(caller.subjectId, []).pipe(
              Effect.map((capture) => capture.revision),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, passwordCompletionFailure)))
            )
          )

          const plan = yield* planMutation("add-password", invocation, request, revision)

          const commit = Effect.gen(function*() {
            const owner = yield* PasswordPersistence

            return yield* owner.addIfAbsent(plan.input, plan.prepare)
          })

          return { commit }
        }),
        planChange: Effect.fn("Passwords.planChange")(function*(invocation, request) {
          yield* noAmbient()
          if (invocation._tag !== "Authenticated") return yield* PasswordRejected.make({})
          const caller = invocation
          const existing = yield* store.readForSubject({ moduleId, subjectId: caller.subjectId })

          if (Option.isNone(existing)) return yield* PasswordRejected.make({})

          const verified = request.currentPassword === undefined
            ? undefined
            : yield* verifyPassword(
              {
                flowId: AuthenticationFlowId.make(request.commandId),
                email: existing.value.identifier.value as Email,
                password: request.currentPassword
              },
              "change",
              caller.subjectId
            )

          const credential = verified?.credential ?? (yield* snapshotPasswordCredential(existing.value))

          const revision = verified?.evidence.revision ?? credential.revision

          const plan = yield* planMutation(
            "change-password",
            invocation,
            request,
            revision,
            credential,
            verified?.evidence
          )

          const commit = Effect.gen(function*() {
            const owner = yield* PasswordPersistence

            return yield* owner.replaceIfCurrent(plan.input, plan.prepare)
          })

          return { commit }
        }),
        requestReset: Effect.fn("Passwords.requestReset")(function*(request) {
          yield* noAmbient()
          const bound = yield* recoveryBinding(request)

          const dispatch = yield* proofs
            .prepareIssue({
              requestId: request.requestId,
              binding: bound.binding,
              locale: request.locale,
              eligible: Option.isSome(bound.target)
            })
            .pipe(
              Effect.flatMap(readProofCommit),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
            )

          yield* dispatch.schedule.pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
          )

          return dispatch.receipt
        }),
        planReset: Effect.fn("Passwords.planReset")(function*(invocation, request) {
          yield* noAmbient()
          const bound = yield* recoveryBinding(request)

          const proof = yield* proofs
            .planRedeem({
              reference: request.reference,
              binding: bound.binding,
              credential: request.secret
            })
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, passwordCompletionFailure)))
            )

          if (Option.isNone(bound.target)) return yield* PasswordRejected.make({})

          const plan = yield* planMutation(
            "reset-password",
            invocation,
            request,
            bound.target.value.revision,
            bound.target.value,
            undefined,
            proof
          )

          const commit = Effect.gen(function*() {
            const owner = yield* PasswordPersistence

            return yield* owner.resetWithProof({ ...plan.input, redemption: proof }, plan.prepare)
          })

          return { commit }
        }),
        status: Effect.fn("Passwords.status")(function*(invocation) {
          if (invocation._tag !== "Authenticated") return yield* PasswordRejected.make({})
          const caller = invocation

          return {
            hasPassword: Option.isSome(
              yield* store.readForSubject({ moduleId, subjectId: caller.subjectId })
            )
          }
        })
      })
    })
  ).pipe(Layer.provide(defaultPasswordAttemptLimiterLayer))

  const Register = makeOperation(`${moduleId}/register`, {
    payload: RegisterInput,
    success: RegisterResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "idempotent"
  })

  const SignIn = makeOperation(`${moduleId}/sign-in`, {
    payload: SignInInput,
    success: sessions.CompletionResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  const AddPassword = makeOperation(`${moduleId}/add-password`, {
    payload: AddInput,
    success: MutationResult,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const ChangePassword = makeOperation(`${moduleId}/change-password`, {
    payload: ChangeInput,
    success: MutationResult,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const RequestReset = makeOperation(`${moduleId}/request-reset`, {
    authorize: () =>
      proofRequestAdmission(`${moduleId}/reset`).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, passwordCompletionFailure)))
      ),
    payload: RequestResetInput,
    success: ProofRequestReceipt,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent"
  })

  const CompleteReset = makeOperation(`${moduleId}/complete-reset`, {
    payload: CompleteResetInput,
    success: MutationResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const PasswordStatus = makeOperation(`${moduleId}/status`, {
    payload: Schema.Void,
    success: Status,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "read-only"
  })

  const mutationResult = (
    result: MutationValue
  ): Effect.Effect<AuthOperationResult<typeof MutationResult.Type>, PasswordRejected> =>
    "invalidation" in result.value
      ? Effect.succeed({ value: result.value, credentialCommands: result.credentialCommands })
      : Effect.fail(PasswordRejected.make({}))

  const handlersLayer = Layer.mergeAll(
    Register.handlerLayer(
      Effect.fn("PasswordOperation.register")(function*(request) {
        return yield* read(yield* (yield* (yield* Passwords).planRegister(request)).commit)
      })
    ),
    SignIn.credentialHandlerLayer(
      Effect.fn("PasswordOperation.signIn")(function*(request) {
        return yield* (yield* Passwords).signIn(request)
      })
    ),
    AddPassword.credentialHandlerLayer(
      Effect.fn("PasswordOperation.add")(function*(request, invocation) {
        return yield* read(
          yield* (yield* (yield* Passwords).planAdd(invocation, request)).commit
        ).pipe(Effect.flatMap(mutationResult))
      })
    ),
    ChangePassword.credentialHandlerLayer(
      Effect.fn("PasswordOperation.change")(function*(request, invocation) {
        return yield* read(
          yield* (yield* (yield* Passwords).planChange(invocation, request)).commit
        ).pipe(Effect.flatMap(mutationResult))
      })
    ),
    RequestReset.handlerLayer(
      Effect.fn("PasswordOperation.requestReset")(function*(request) {
        return yield* (yield* Passwords).requestReset(request)
      })
    ),
    CompleteReset.credentialHandlerLayer(
      Effect.fn("PasswordOperation.reset")(function*(request, invocation) {
        return yield* read(
          yield* (yield* (yield* Passwords).planReset(invocation, request)).commit
        ).pipe(Effect.flatMap(mutationResult))
      })
    ),
    PasswordStatus.handlerLayer(
      Effect.fn("PasswordOperation.status")(function*(_, invocation) {
        return yield* (yield* Passwords).status(invocation)
      })
    )
  )

  const operations = {
    Register,
    SignIn,
    AddPassword,
    ChangePassword,
    RequestReset,
    CompleteReset,
    PasswordStatus
  }

  return Object.freeze({
    persistence: Object.freeze({ kind: "password" as const, moduleId, management: true as const }),
    strategy: makeAuthStrategy(
      {
        signIn: Effect.fn("Passwords.signInRequest")(function*(
          invocation: AuthInvocation,
          request: Omit<typeof SignInInput.Encoded, "flowId">
        ) {
          const random = yield* SecureRandom.SecureRandom

          const flowId = yield* random
            .uuidV4()
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
            )

          return yield* SignIn.invoke(invocation, { ...request, flowId })
        }),
        register: Register.invoke,
        addPassword: AddPassword.invoke,
        changePassword: ChangePassword.invoke,
        requestReset: RequestReset.invoke,
        completeReset: CompleteReset.invoke,
        passwordStatus: PasswordStatus.invoke
      },
      handlersLayer.pipe(
        Layer.provide(defaultLayer(Passwords, layer)),
        Layer.provide(defaultLayer(reset.Proofs, reset.emailLayer)),
        Layer.provide([newPasswordLayer, hooksLayer]),
        Layer.merge(Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom)),
        Layer.merge(defaultIngressLayer)
      ),
      { completion: true }
    ),
    Passwords,
    RegistrationAuthority,
    SessionClaims,
    layer,
    handlersLayer,
    operations,
    reset,
    group: operationGroup(...Object.values(operations))
  })
}

export function makePasswordMethod<
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  Registration extends Schema.Codec<unknown, unknown, unknown, unknown>,
  const Secret extends ProofSecretPolicy = ProofSecretPolicy
>(
  moduleId: Id,
  options: Parameters<
    typeof makePasswordWithManagement<Id, SessionId, Claims, Registration, Secret>
  >[1]
): ReturnType<typeof makePasswordWithManagement<Id, SessionId, Claims, Registration, Secret>>

export function makePasswordMethod<
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: PasswordSignInOptions<SessionId, Claims>
): ReturnType<typeof makePasswordSignIn<Id, SessionId, Claims>>

export function makePasswordMethod<
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  Registration extends Schema.Codec<unknown, unknown, unknown, unknown>,
  const Secret extends ProofSecretPolicy = ProofSecretPolicy
>(
  moduleId: Id,
  options:
    | PasswordSignInOptions<SessionId, Claims>
    | Parameters<typeof makePasswordWithManagement<Id, SessionId, Claims, Registration, Secret>>[1]
) {
  return "registration" in options
    ? makePasswordWithManagement(moduleId, options)
    : makePasswordSignIn(moduleId, options)
}
