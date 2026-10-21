import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import { Email, Locale, TokenDigest } from "../../Schema.ts"
import { hasCommitScope, type PreparedCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { HookDenied, lifecycleEventEffect, LifecycleEventId, lifecycleSnapshotEffect } from "../hooks/models.ts"
import { LoginIdentifier } from "../identity/models.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import type { makeRequestBinding } from "../operations/requestBinding.ts"
import { RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import { proofRequestAdmission } from "../proofs/admission.ts"
import { readProofCommit } from "../proofs/dispatch.ts"
import type { ProofBinding } from "../proofs/models.ts"
import { ProofReference, ProofRequestId, ProofRequestReceipt } from "../proofs/models.ts"
import type { makeProofModule } from "../proofs/module.ts"
import type { ProofRedemptionPlan } from "../proofs/redemption.ts"
import type { PrepareEmailCommit } from "./emailAddressPersistence.ts"
import { emailCompletionFailure, EmailMethodUnsupported, EmailRejected, EmailUnavailable } from "./errors.ts"
import { EmailCommandId, type EmailRegistrationDecision } from "./models.ts"

const Failure = Schema.Union([EmailRejected, EmailUnavailable, EmailMethodUnsupported, HookDenied])

type Failure = typeof Failure.Type

const Success = Schema.TaggedStruct("RegistrationAccepted", {})

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* EmailMethodUnsupported.make({})
})

const tuple = Schema.fromJsonString(Schema.Array(Schema.String))

export interface RegistrationModule<Id extends string, Kind extends string, Registration> {
  readonly moduleId: Id
  readonly kind: Kind
  readonly registration: Types.Invariant<Registration>
}

/** @internal */
export const makeEmailRegistration = <
  const Id extends string,
  const ProofModuleId extends string,
  Registration extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  registration: Registration,
  proof: ReturnType<typeof makeProofModule<ProofModuleId, typeof ProofBinding>>,
  binder: ReturnType<typeof makeRequestBinding<Id, "email-entry">>
) => {
  const RegistrationCodec: Schema.Codec<
    Registration["Type"],
    Registration["Encoded"],
    Registration["DecodingServices"],
    Registration["EncodingServices"]
  > = registration

  const base = {
    flowId: RequestBindingFlowId,
    requestBinding: RequestBindingCredential,
    email: Schema.String.check(Schema.isMaxLength(320)).pipe(Schema.decodeTo(Email)),
    registration: RegistrationCodec
  }

  const BindingInput = Schema.Struct(base)

  const RequestInput = Schema.Struct({
    ...base,
    requestId: ProofRequestId,
    locale: Locale
  })

  const CompleteInput = Schema.Struct({
    ...base,
    commandId: EmailCommandId,
    reference: ProofReference,
    secret: Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))
  })

  const RegistrationAuthority = Context.Service<
    RegistrationModule<Id, "authority", Registration["Type"]>,
    {
      /** Deterministic versioned digest of the entire validated application intent.
       * Snapshot data retained for the owner must not be mutated by this callback.
       * No raw JSON fingerprinting or consumer codec transformation replay is assumed.
       */
      readonly inspect: (input: {
        readonly identifier: LoginIdentifier
        readonly registration: Registration["Type"]
      }) => Effect.Effect<
        { readonly fingerprint: TokenDigest; readonly eligible: boolean },
        EmailUnavailable
      >
      /** One physical owner redeems the proof and synchronously creates the subject,
       * verified identifier and active email credential. Provision idempotently by
       * requestId; never adopt a prior subject or issue a session in this transaction.
       */
      readonly registerWithProof: <A>(
        input: {
          readonly moduleId: string
          readonly commandId: EmailCommandId
          /** Stable for this redeemed proof, independently of completion retries. */
          readonly requestId: string
          readonly identifier: LoginIdentifier
          readonly registration: Registration["Type"]
          readonly fingerprint: TokenDigest
          readonly redemption: ProofRedemptionPlan
        },
        prepare: PrepareEmailCommit<EmailRegistrationDecision, A>
      ) => Effect.Effect<PreparedCommit<A>, EmailUnavailable>
    }
  >(`@effect/auth/email/${moduleId}/RegistrationAuthority`)

  type Result = AuthOperationResult<typeof Success.Type | { readonly _tag: "Rejected" }>
  type Plan = {
    readonly commit: Effect.Effect<
      PreparedCommit<Result>,
      EmailUnavailable,
      typeof RegistrationAuthority.Identifier
    >
  }

  const Registrations = Context.Service<
    RegistrationModule<Id, "registration", Registration["Type"]>,
    {
      readonly request: (
        input: typeof RequestInput.Type
      ) => Effect.Effect<ProofRequestReceipt, Failure>
      readonly planComplete: (input: typeof CompleteInput.Type) => Effect.Effect<Plan, Failure>
    }
  >(`@effect/auth/email/${moduleId}/Registrations`)

  const layer = Layer.effect(
    Registrations,
    Effect.gen(function*() {
      const bindings = yield* binder.RequestBinding
      const proofs = yield* proof.Proofs
      const authority = yield* RegistrationAuthority
      const hooks = yield* LifecycleHooks
      const digestService = yield* Digest.Digest
      const random = yield* SecureRandom.SecureRandom

      const services = yield* Effect.context<
        Registration["DecodingServices"] | Registration["EncodingServices"]
      >()

      // Derive from Type so wire transformations are not replayed. JSON projection
      // detaches mutable built-ins (including DateTime); opaque declared Type values
      // without a derived JSON representation fail safely rather than share graphs.
      const dataCodec = Schema.toCodecJson(Schema.toType(RegistrationCodec))

      const snapshotData = (data: Registration["Type"]) =>
        Schema.encodeEffect(dataCodec)(data).pipe(
          Effect.flatMap(Schema.decodeEffect(dataCodec)),
          Effect.provide(services),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailRejected.make({}))))
        )

      const bound = Effect.fn("EmailRegistration.binding")(function*(
        input: typeof BindingInput.Type
      ) {
        const verified = yield* bindings
          .verify(input.flowId, input.requestBinding)
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
          LoginIdentifier.make({ namespace: "email", value: input.email })
        )

        const data = yield* snapshotData(input.registration)

        const inspected = yield* authority.inspect({
          identifier,
          registration: yield* snapshotData(data)
        })

        const fingerprint = yield* Schema.decodeEffect(TokenDigest.check(Schema.isMaxLength(256)))(
          inspected.fingerprint
        ).pipe(Effect.mapError(() => EmailUnavailable.make({})))

        const encoded = yield* Schema.encodeEffect(tuple)([
          "effect-auth/email-registration/v1",
          moduleId,
          input.flowId,
          verified.verifier,
          identifier.value,
          fingerprint
        ]).pipe(Effect.mapError(() => EmailUnavailable.make({})))

        const digest = yield* digestService
          .digest(Digest.sha256, new TextEncoder().encode(encoded))
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
          )

        const binding: ProofBinding = {
          _tag: "Identifier",
          identifier,
          flowId: input.flowId,
          contextDigest: TokenDigest.make(Base64Url.encode(digest))
        }

        return { data, identifier, fingerprint, eligible: inspected.eligible, binding }
      })

      return Registrations.of({
        request: Effect.fn("EmailRegistration.request")(function*(input) {
          yield* noAmbient()
          const current = yield* bound(input)

          const dispatch = yield* proofs
            .prepareIssue({
              requestId: input.requestId,
              binding: current.binding,
              locale: input.locale,
              eligible: current.eligible
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
        planComplete: Effect.fn("EmailRegistration.planComplete")(function*(input) {
          yield* noAmbient()
          const current = yield* bound(input)

          const redemption = yield* proofs
            .planRedeem({
              reference: input.reference,
              credential: input.secret,
              binding: current.binding
            })
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
            )

          const snapshot = yield* lifecycleSnapshotEffect({
            action: "registration",
            operation: `${moduleId}/email-registration`,
            method: "email-code",
            identifiers: [current.identifier]
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

          const commandId = input.commandId

          const commit = Effect.gen(function*() {
            const owner = yield* RegistrationAuthority

            return yield* owner.registerWithProof(
              {
                moduleId,
                commandId,
                requestId: `email-registration:${moduleId}:${input.reference.proofId}`,
                identifier: current.identifier,
                registration: current.data,
                fingerprint: current.fingerprint,
                redemption
              },
              (decision, journal) => {
                if (decision._tag === "Registered") journal.stage(event)

                return journal.prepare<Result>({
                  value: decision._tag === "Registered" ? { _tag: "RegistrationAccepted" } : decision,
                  credentialCommands: decision._tag === "Rejected"
                    ? []
                    : [{ _tag: "Clear", slot: "request-binding" }]
                })
              }
            )
          })

          return Object.freeze({ commit })
        })
      })
    })
  )

  const admitRequest = proofRequestAdmission(`${moduleId}/registration`).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, emailCompletionFailure)))
  )

  const Request = makeOperation(`${moduleId}/registration/request`, {
    authorize: () => admitRequest,
    payload: RequestInput,
    success: ProofRequestReceipt,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent"
  })

  const Complete = makeOperation(`${moduleId}/registration/complete`, {
    payload: CompleteInput,
    success: Success,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const handlersLayer = Layer.mergeAll(
    Request.handlerLayer(
      Effect.fn("EmailRegistration.Request")(function*(input) {
        return yield* (yield* Registrations).request(input)
      })
    ),
    Complete.credentialHandlerLayer(
      Effect.fn("EmailRegistration.Complete")(function*(input) {
        const plan = yield* (yield* Registrations).planComplete(input)
        const receipt = yield* plan.commit

        const result = yield* receipt.read.pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => EmailUnavailable.make({}))))
        )

        if (result.value._tag === "Rejected") return yield* EmailRejected.make({})

        return { value: result.value, credentialCommands: result.credentialCommands }
      })
    )
  )

  return Object.freeze({
    RegistrationAuthority,
    Registrations,
    layer,
    proof,
    handlersLayer,
    operations: { Request, Complete },
    group: operationGroup(Request, Complete)
  })
}
