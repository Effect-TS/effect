import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import { Locale } from "../../Schema.ts"
import { defaultLayer } from "../auth/defaults.ts"
import { type CommitJournal, hasCommitScope, prepareCommit, type PreparedCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import {
  HookDenied,
  type LifecycleAction,
  lifecycleEventEffect,
  LifecycleEventId,
  lifecycleSnapshotEffect
} from "../hooks/models.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { CleanupLimit, CleanupResult } from "../persistence/cleanup.ts"
import { reportAuthFailure } from "../shared/diagnostics.ts"
import { proofAbuseScope } from "./abuse.ts"
import { makeProofCrypto, proofKeysFor, type ProofSecretPolicy, validateProofBinding } from "./crypto.ts"
import type { ProofDelivery, ProofDeliveryMessage } from "./delivery.ts"
import { type PreparedProofDispatch, type ProofIssuePlan, readProofCommit } from "./dispatch.ts"
import { EmailProofDelivery, emailProofDeliveryLayer } from "./emailProofDelivery.ts"
import {
  ProofCapabilityUnsupported,
  ProofConfigurationError,
  ProofError,
  ProofInvalid,
  ProofUnavailable
} from "./errors.ts"
import {
  type ProofBinding,
  ProofDeliveryId,
  ProofId,
  type ProofIssueRecord,
  ProofPurpose,
  type ProofRedemptionDecision,
  ProofReference,
  ProofRequestId,
  ProofRequestReceipt
} from "./models.ts"
import { type ProofPolicy, validateProofPolicy } from "./policy.ts"
import { ProofDispatchScheduler } from "./proofDispatchScheduler.ts"
import { defaultProofLimiterLayer, ProofLimiter } from "./proofLimiter.ts"
import { ProofPersistence } from "./proofPersistence.ts"
import type { ProofRedemptionPlan } from "./redemption.ts"
import { SmsProofDelivery } from "./smsProofDelivery.ts"

export interface ProofModule<Id extends string, Binding> {
  readonly moduleId: Id
  readonly _tag: "effect-auth/ProofModule"
  readonly binding: Types.Invariant<Binding>
}

const Credential = Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* ProofCapabilityUnsupported.make({})
})

/**
 * Snapshot owned configuration data without evaluating application codecs or validating it.
 *
 * @internal
 */
export const snapshotProofConfiguration = <
  Configuration extends {
    readonly secret: ProofSecretPolicy
    readonly policy: ProofPolicy
  }
>(
  input: Configuration
) =>
  Object.freeze({
    ...input,
    secret: Object.freeze({ ...input.secret }),
    policy: Object.freeze({
      ...input.policy,
      abuse: Object.freeze({
        ...input.policy?.abuse,
        issues: Object.freeze({ ...input.policy?.abuse?.issues }),
        attempts: Object.freeze({ ...input.policy?.abuse?.attempts }),
        subjectIssues: Object.freeze({ ...input.policy?.abuse?.subjectIssues }),
        subjectAttempts: Object.freeze({ ...input.policy?.abuse?.subjectAttempts }),
        actionIssues: Object.freeze({ ...input.policy?.abuse?.actionIssues }),
        actionAttempts: Object.freeze({ ...input.policy?.abuse?.actionAttempts })
      })
    })
  })

/** Each module has one fixed purpose and a schema that makes required binding fields mandatory.
 * Consumer codec extensions are not implicit authority: bind every extra relevant
 * field into contextDigest. Canonical proof bytes include only the declared core binding.
 */
export const makeProofModule = <
  const Id extends string,
  Binding extends Schema.Codec<ProofBinding, unknown, unknown, unknown>,
  const Secret extends ProofSecretPolicy = ProofSecretPolicy
>(
  moduleId: Id,
  input: {
    readonly purpose: ProofPurpose
    readonly binding: Binding
    readonly channel: "email" | "sms"
    readonly template?: string
    readonly url?: string
    readonly secret: Secret
    readonly policy: ProofPolicy
  }
) => {
  const options = snapshotProofConfiguration({
    ...input,
    template: input.template ?? input.purpose
  })

  const BindingCodec: Schema.Codec<
    Binding["Type"],
    Binding["Encoded"],
    Binding["DecodingServices"],
    Binding["EncodingServices"]
  > = options.binding

  type BindingValue = Binding["Type"]

  const RequestInput = Schema.Struct({
    requestId: ProofRequestId,
    binding: BindingCodec,
    locale: Locale,
    eligible: Schema.Boolean
  })

  const RedeemInput = Schema.Struct({
    reference: ProofReference,
    binding: BindingCodec,
    credential: Credential
  })

  type IssueInput = typeof RequestInput.Type
  type Failure = ProofError | HookDenied
  type Service = {
    readonly planIssue: (input: IssueInput) => Effect.Effect<ProofIssuePlan, Failure>
    readonly prepareIssue: (
      input: IssueInput
    ) => Effect.Effect<PreparedCommit<PreparedProofDispatch>, Failure>
    readonly planRedeem: (
      input: typeof RedeemInput.Type
    ) => Effect.Effect<ProofRedemptionPlan, Failure>
    readonly prepareRedeem: (
      input: typeof RedeemInput.Type
    ) => Effect.Effect<PreparedCommit<ProofRedemptionDecision>, Failure>
    readonly cancel: (binding: BindingValue) => Effect.Effect<PreparedCommit<void>, Failure>
    readonly cleanup: (limit: number) => Effect.Effect<PreparedCommit<CleanupResult>, Failure>
  }

  const Proofs = Context.Service<ProofModule<Id, BindingValue>, Service>(
    `@effect/auth/proofs/${moduleId}`
  )

  const makeLayer = <DeliveryId>(
    deliveryKey: Context.Key<DeliveryId, ProofDelivery>,
    channel: "email" | "sms"
  ) =>
    Layer.effect(
      Proofs,
      Effect.gen(function*() {
        yield* Schema.decodeEffect(ProofPurpose)(options.purpose).pipe(
          Effect.mapError(() => ProofConfigurationError.make({ reason: "binding" }))
        )
        if (
          channel !== options.channel ||
          !Schema.is(Schema.NonEmptyString.check(Schema.isMaxLength(256)))(moduleId) ||
          !Schema.is(Schema.NonEmptyString.check(Schema.isMaxLength(128)))(options.template)
        ) {
          return yield* ProofConfigurationError.make({ reason: "delivery" })
        }
        const policy = yield* validateProofPolicy(options.policy)
        const delivery = yield* deliveryKey

        const crypto = yield* makeProofCrypto(
          moduleId,
          options.purpose,
          options.secret,
          yield* proofKeysFor(options.secret)
        )

        const store = yield* ProofPersistence
        const scheduler = yield* ProofDispatchScheduler
        const limiter = yield* ProofLimiter
        const hooks = yield* LifecycleHooks

        const services = yield* Effect.context<
          Binding["DecodingServices"] | Binding["EncodingServices"]
        >()

        const bindingCodec = Schema.toCodecIso(BindingCodec)

        const projectBinding = (value: BindingValue) =>
          Schema.encodeEffect(bindingCodec)(value).pipe(
            Effect.flatMap(Schema.decodeEffect(bindingCodec)),
            Effect.provide(services),
            Effect.flatMap(validateProofBinding),
            Effect.mapError(() => ProofInvalid.make({}))
          )

        const eventFor = Effect.fn("Proofs.eventFor")(function*(
          action: LifecycleAction,
          binding: ProofBinding
        ) {
          const snapshot = yield* lifecycleSnapshotEffect({
            action,
            operation: `${moduleId}/${action}`,
            identifiers: [binding.identifier],
            ...(binding._tag === "Identifier" ? {} : { subjectId: binding.revision.subjectId })
          }).pipe(Effect.orDie)

          yield* hooks.before(snapshot)

          return yield* lifecycleEventEffect({
            id: LifecycleEventId.make(Redacted.value(yield* crypto.generateOpaque())),
            occurredAtMillis: DateTime.toEpochMillis(yield* DateTime.now),
            snapshot
          }).pipe(Effect.orDie)
        })

        const planIssue = Effect.fn("Proofs.planIssue")(function*(
          request: IssueInput
        ): Effect.fn.Return<ProofIssuePlan, Failure> {
          const binding = yield* projectBinding(request.binding)

          const eligible = yield* Schema.decodeEffect(Schema.Boolean)(request.eligible).pipe(
            Effect.mapError(() => ProofInvalid.make({}))
          )

          const locale = yield* Schema.decodeEffect(Locale)(request.locale).pipe(
            Effect.mapError(() => ProofInvalid.make({}))
          )

          const requestId = yield* Schema.decodeEffect(ProofRequestId)(request.requestId).pipe(
            Effect.mapError(() => ProofInvalid.make({}))
          )

          const admitted = yield* limiter
            .check({
              kind: "issue",
              scope: proofAbuseScope(moduleId, options.purpose, binding),
              policy: policy.abuse
            })
            .pipe(
              Effect.as(true),
              Effect.catchCause((cause) =>
                cause.reasons.every(
                    (reason) => Cause.isFailReason(reason) && reason.error._tag === "ProofIngressDenied"
                  )
                  ? Effect.succeed(false)
                  : Effect.failCause(cause)
              )
            )

          const proofId = ProofId.make(Redacted.value(yield* crypto.generateOpaque()))

          const reference = Object.freeze({
            proofId,
            purpose: options.purpose,
            keyId: crypto.activeKeyId
          })

          const before = yield* eventFor("proof-request", binding).pipe(Effect.exit)

          if (
            before._tag === "Failure" &&
            !before.cause.reasons.every(
              (reason) =>
                Cause.isFailReason(reason) &&
                reason.error._tag === "HookDenied" &&
                reason.error.reason !== "unavailable"
            )
          ) {
            return yield* Effect.failCause(
              Cause.map(before.cause, () => ProofUnavailable.make({}))
            )
          }
          const secret = yield* crypto.generate()
          const verifier = yield* crypto.digest(proofId, binding, secret, crypto.activeKeyId)

          if (verifier === undefined) return yield* ProofUnavailable.make({})

          const record: ProofIssueRecord = {
            moduleId,
            purpose: options.purpose,
            proofId,
            binding,
            verifier
          }

          // Allocate both once guards before the synchronous owner callback. The
          // message is installed only for a confirmed issued result; no receipt can
          // expose scheduling until its physical owner has committed.
          let message: ProofDeliveryMessage | undefined

          const work = yield* Effect.cached(
            Effect.suspend(() => message === undefined ? Effect.void : delivery.send(message)).pipe(
              Effect.asVoid,
              Effect.catchCause((cause) =>
                reportAuthFailure("proof-delivery", cause).pipe(
                  Effect.andThen(
                    Cause.hasInterrupts(cause)
                      ? Effect.failCause(
                        Cause.fromReasons<never>(cause.reasons.filter(Cause.isInterruptReason))
                      )
                      : Effect.void
                  )
                )
              ),
              Effect.withTracerEnabled(false)
            )
          )

          const schedule = yield* Effect.cached(scheduler.schedule(work))

          const commit = yield* Effect.cached(
            store.issue(
              {
                record,
                lifetimeMillis: policy.lifetimeMillis,
                resendCooldownMillis: policy.abuse.resendCooldownMillis,
                eligible: eligible && admitted && before._tag === "Success"
              },
              prepareCommit((decision, journal) =>
                Result.gen(function*() {
                  if (decision._tag === "Issued") {
                    if (
                      before._tag !== "Success" ||
                      !admitted ||
                      !eligible ||
                      decision.record.proofId !== proofId ||
                      decision.record.moduleId !== moduleId ||
                      decision.record.purpose !== options.purpose ||
                      decision.record.verifier.digest !== verifier.digest ||
                      decision.record.verifier.keyId !== verifier.keyId ||
                      decision.record.expiresAtMillis - decision.record.issuedAtMillis !==
                        policy.lifetimeMillis ||
                      JSON.stringify(decision.record.binding) !== JSON.stringify(binding)
                    ) {
                      return yield* Result.fail(ProofUnavailable.make({}))
                    }
                    journal.stage(before.value)
                    message = Object.freeze({
                      deliveryId: ProofDeliveryId.make(proofId),
                      purpose: options.purpose,
                      reference,
                      recipient: Object.freeze(binding.identifier),
                      secret,
                      format: crypto.format,
                      expiresAtMillis: decision.record.expiresAtMillis,
                      template: options.template,
                      locale
                    })
                  }

                  return journal.prepare(
                    Object.freeze({
                      receipt: Object.freeze({ requestId, reference }),
                      // Suppression uses the same scheduler boundary with a no-op task.
                      schedule: noAmbient().pipe(Effect.andThen(schedule))
                    })
                  )
                })
              )
            )
          )

          return { commit }
        })

        const planRedeem = Effect.fn("Proofs.planRedeem")(function*(
          request: typeof RedeemInput.Type
        ): Effect.fn.Return<ProofRedemptionPlan, Failure> {
          const binding = yield* projectBinding(request.binding)

          yield* limiter.check({
            kind: "attempt",
            scope: proofAbuseScope(moduleId, options.purpose, binding),
            policy: policy.abuse
          })
          const event = yield* eventFor("proof-verification", binding)

          const candidate = request.reference.purpose === options.purpose
            ? yield* crypto.digest(
              request.reference.proofId,
              binding,
              request.credential,
              request.reference.keyId
            )
            : undefined

          return Object.freeze({
            input: Object.freeze({
              moduleId,
              purpose: options.purpose,
              proofId: request.reference.proofId,
              binding,
              maximumFailedAttempts: policy.maximumFailedAttempts,
              ...(candidate === undefined ? {} : { candidate })
            }),
            prepare: <A>(
              decision: ProofRedemptionDecision,
              journal: CommitJournal,
              project: (decision: ProofRedemptionDecision) => A
            ) => {
              const value = project(decision)

              if (decision === "redeemed") journal.stage(event)

              return journal.prepare(value)
            }
          })
        })

        return Proofs.of({
          planIssue,
          prepareIssue: (request) => planIssue(request).pipe(Effect.flatMap((plan) => plan.commit)),
          planRedeem,
          prepareRedeem: (request) =>
            planRedeem(request).pipe(
              Effect.flatMap((plan) =>
                store.redeem(plan.input, (decision, journal) => plan.prepare(decision, journal, (value) => value))
              )
            ),
          cancel: Effect.fn("Proofs.cancel")(function*(input) {
            const binding = yield* projectBinding(input)

            return yield* store.cancel(
              { moduleId, purpose: options.purpose, binding },
              (_, journal) => journal.prepare(undefined)
            )
          }),
          cleanup: Effect.fn("Proofs.cleanup")(function*(input) {
            const limit = yield* Schema.decodeEffect(CleanupLimit)(input).pipe(
              Effect.mapError(() => ProofInvalid.make({}))
            )

            return yield* store.cleanup({ moduleId, limit }, (decision, journal) => journal.prepare(decision))
          })
        })
      })
    ).pipe(
      Layer.provide(defaultLayer(ProofDispatchScheduler, ProofDispatchScheduler.layer)),
      Layer.provide(defaultProofLimiterLayer)
    )

  const emailLayer = makeLayer(EmailProofDelivery, "email").pipe(
    Layer.provide(emailProofDeliveryLayer(options))
  )

  const smsLayer = makeLayer(SmsProofDelivery, "sms")
  const errors = Schema.Union([ProofError, HookDenied])

  const Request = makeOperation(`${moduleId}/request`, {
    payload: RequestInput,
    success: ProofRequestReceipt,
    error: errors,
    access: "system",
    replay: "non-idempotent"
  })

  const Redeem = makeOperation(`${moduleId}/redeem`, {
    payload: RedeemInput,
    success: Schema.Void,
    error: errors,
    access: "system",
    replay: "single-use"
  })

  const Cancel = makeOperation(`${moduleId}/cancel`, {
    payload: Schema.Struct({ binding: BindingCodec }),
    success: Schema.Void,
    error: errors,
    access: "system",
    replay: "idempotent"
  })

  const Cleanup = makeOperation(`${moduleId}/cleanup`, {
    payload: Schema.Struct({ limit: CleanupLimit }),
    success: CleanupResult,
    error: errors,
    access: "system",
    replay: "idempotent"
  })

  const handlersLayer = Layer.mergeAll(
    Request.handlerLayer(
      Effect.fn("ProofOperation.request")(function*(input) {
        yield* noAmbient()
        const dispatch = yield* readProofCommit(yield* (yield* Proofs).prepareIssue(input))

        yield* dispatch.schedule

        return dispatch.receipt
      })
    ),
    Redeem.handlerLayer(
      Effect.fn("ProofOperation.redeem")(function*(input) {
        yield* noAmbient()
        const decision = yield* readProofCommit(yield* (yield* Proofs).prepareRedeem(input))

        if (decision === "rejected") return yield* ProofInvalid.make({})
      })
    ),
    Cancel.handlerLayer(
      Effect.fn("ProofOperation.cancel")(function*(input) {
        yield* noAmbient()

        return yield* readProofCommit(yield* (yield* Proofs).cancel(input.binding))
      })
    ),
    Cleanup.handlerLayer(
      Effect.fn("ProofOperation.cleanup")(function*(input) {
        yield* noAmbient()

        return yield* readProofCommit(yield* (yield* Proofs).cleanup(input.limit))
      })
    )
  )

  const operations = { Request, Redeem, Cancel, Cleanup }

  return Object.freeze({
    Proofs,
    emailLayer,
    smsLayer,
    handlersLayer,
    operations,
    group: operationGroup(...Object.values(operations))
  })
}
