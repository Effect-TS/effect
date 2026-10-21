import * as EffectArray from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as Types from "effect/Types"

import { TokenDigest } from "../../Schema.ts"
import { hooksLayer } from "../auth/defaults.ts"
import { hasCommitScope, type PreparedCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import type { HookDenied } from "../hooks/models.ts"
import { lifecycleEventEffect, LifecycleEventId, lifecycleSnapshotEffect } from "../hooks/models.ts"
import { AuthenticationClock } from "../operations/clock.ts"
import {
  type AssuranceRequirement,
  AuthenticationAssurance,
  type AuthInvocation,
  requireAssurance,
  requireAuthenticated
} from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { CleanupLimit } from "../persistence/cleanup.ts"
import { reportAuthDiagnostic, reportAuthFailure, withoutObservability } from "../shared/diagnostics.ts"
import {
  assessAuthentication,
  combineAuthenticationEvidence,
  snapshotAuthenticationEvidence,
  snapshotSessionAuthenticationProvenance
} from "./assurance.ts"
import { AuthenticationAuthority } from "./authenticationAuthority.ts"
import { makeSessionContract } from "./contract.ts"
import { makeSessionSecrets, makeSessionSigningCodec, SessionSigningKeys, sessionSigningKeysLayer } from "./crypto.ts"
import type { SessionError } from "./errors.ts"
import {
  SessionCapabilityUnsupported,
  SessionConfigurationError,
  SessionInvalid,
  SessionRenewalTooEarly,
  SessionSignOutUnavailable,
  SessionStepUpInvalid,
  SessionUnavailable
} from "./errors.ts"
import { sessionInvalidationWindow } from "./invalidation.ts"
import { CurrentSessionInvocation, SessionVerificationCapture } from "./invocation.ts"
import {
  AuthenticationEvidence,
  AuthenticationFlowId,
  AuthenticationRequirement,
  type PendingConsumption,
  SecurityRevision,
  SessionAuthenticationProvenance,
  type SessionCapabilities,
  SessionCredentialVersion,
  SessionGuard,
  SessionId,
  type SessionInspection,
  SessionMetadata,
  type SessionSource
} from "./models.ts"
import type { PendingAuthentication as PendingPort, PendingAuthenticationSnapshot } from "./pendingAuthentication.ts"
import type {
  SessionCleanup as CleanupPort,
  SessionRepository as RepositoryPort,
  SignedSessionValidity as ValidityPort,
  StatefulSessionPersistence as PersistencePort
} from "./persistence.ts"
import {
  type SessionPolicy,
  stateAssistedCapabilities,
  statefulCapabilities,
  statelessCapabilities,
  validateSessionPolicy,
  validateSessionTimeline
} from "./policy.ts"
import {
  type SessionStepUpCompletionPlan,
  SessionStepUpIntent,
  type SessionStepUpPersistence as StepUpPort,
  SessionStepUpProfile,
  type SessionStepUpProfileId,
  type SessionStepUpReplacement,
  SessionStepUpRequirement,
  type SessionStepUpSnapshot,
  type StepUpPending
} from "./sessionStepUpPersistence.ts"

export interface ModuleService<Id extends string, Kind extends string, Claims> {
  readonly moduleId: Id
  readonly kind: Kind
  readonly claims: Types.Invariant<Claims>
}

const reportAuthorityFailure = (error: SessionError) =>
  reportAuthDiagnostic(
    "session-authority",
    error._tag === "StaleAuthentication"
      ? "authority-rejected"
      : error._tag === "SessionUnavailable"
      ? "unavailable"
      : "rejected"
  )

const reportSignOutFailure = <A, E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<A, E, R>
) =>
  effect.pipe(
    Effect.tapCause((cause) =>
      Cause.hasInterrupts(cause)
        ? Effect.void
        : reportAuthFailure(
          "session-sign-out",
          Cause.fromReasons(
            cause.reasons.filter(
              (reason) =>
                Cause.isDieReason(reason) ||
                (Cause.isFailReason(reason) &&
                  reason.error._tag !== "SessionInvalid" &&
                  (reason.error._tag !== "HookDenied" ||
                    Schema.is(Schema.Struct({ reason: Schema.Literal("unavailable") }))(
                      reason.error
                    )))
            )
          )
        )
    )
  )

/** Stable module IDs isolate service keys and signed/digested credential namespaces. */
export type CompletionLayer<
  Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  R = never
> = Layer.Layer<
  ModuleService<Id, "completion", Claims["Type"]>,
  SessionConfigurationError,
  | ModuleService<Id, "strategy", Claims["Type"]>
  | SecureRandom.SecureRandom
  | Digest.Digest
  | AuthenticationAuthority
  | Exclude<Claims["DecodingServices"], Scope.Scope>
  | Exclude<Claims["EncodingServices"], Scope.Scope>
  | Exclude<R, Scope.Scope>
>

export const makeSessionModule = <
  const Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  claims: Claims,
  contract?: ReturnType<typeof makeSessionContract<Id, Claims>>
) => {
  const { Session, CompletionResult, operations, group, stepUpOperations, stepUpGroup } =
    contract?.moduleId === moduleId && contract.Session.fields.claims === claims
      ? contract
      : makeSessionContract(moduleId, claims)

  const ClaimsCodec: Schema.Codec<
    Claims["Type"],
    Claims["Encoded"],
    Claims["DecodingServices"],
    Claims["EncodingServices"]
  > = Session.fields.claims

  type Session = typeof Session.Type
  type CompletionResult = typeof CompletionResult.Type
  type SignOutResult = typeof operations.SignOut.rpc.successSchema.Type
  type Failure = SessionError | HookDenied
  type Prepared<A, R = never> = Effect.Effect<PreparedCommit<AuthOperationResult<A>>, Failure, R>
  type Issuance = {
    readonly evidence: AuthenticationEvidence
    readonly claims: Claims["Type"]
    readonly pending?: PendingConsumption
    /** Trusted capture from the method authority; commit still rechecks current policy. */
    readonly requirement: AuthenticationRequirement
  }

  type Inspection = SessionInspection<Claims["Type"]>
  type Strategy = {
    readonly policy: SessionPolicy
    readonly capabilities: SessionCapabilities
    /** @effect-expect-leaking AuthenticationAuthority -- fresh issuance alone needs identity authority; verification does not. */
    readonly prepareEstablish: (input: Issuance) => Prepared<Session, AuthenticationAuthority>
    /**
     * Trusted browser-login completion, never a public caller's session assertion.
     * The caller must persist an inspected source and confirm terminal consumption
     * of its bound handoff before calling once outside any commit scope; unknown
     * outcomes never authorize issuance.
     * Preserve source assurance and proof revisions/times, using a fresh flow/binding.
     * Initial expiry is capped by the source; after issuance the sessions renew and
     * revoke independently, subject to their shared subject/credential authority.
     * @effect-expect-leaking AuthenticationAuthority -- handoff issuance rechecks current authority.
     */
    readonly prepareHandoff: (input: {
      readonly source: Inspection
      readonly flowId: AuthenticationFlowId
      readonly bindingDigest: TokenDigest
    }) => Prepared<Session, AuthenticationAuthority>
    /** Trusted method-only source from one authoritative read; never a public RPC value. */
    readonly inspect: (
      credential: Redacted.Redacted<string>
    ) => Effect.Effect<SessionSource<Claims["Type"]>, Failure>
    /** Standalone renewal returns after any storage commit and lifecycle delivery.
     * A signed renewal without storage changes needs no commit receipt. */
    readonly renew: (
      credential: Redacted.Redacted<string>
    ) => Effect.Effect<AuthOperationResult<Session>, Failure>
    readonly signOut: (
      credential: Redacted.Redacted<string>
    ) => Effect.Effect<AuthOperationResult<SignOutResult>, Failure>
    readonly list: (
      input: Parameters<RepositoryPort["list"]>[0]
    ) => Effect.Effect<Effect.Success<ReturnType<RepositoryPort["list"]>>, Failure>
    readonly revoke: (session: Session, sessionId: SessionId) => Effect.Effect<void, Failure>
    readonly revokeAll: (session: Session) => Effect.Effect<void, Failure>
  }

  const SessionStrategy = Context.Service<ModuleService<Id, "strategy", Claims["Type"]>, Strategy>(
    `@effect/auth/sessions/${moduleId}/Strategy`
  )

  // This tag is deliberately not returned by the module: no public precommit signer.
  const StepUpPlanner = Context.Service<
    ModuleService<Id, "step-up-planner", Claims["Type"]>,
    {
      readonly plan: (
        source: SessionSource<Claims["Type"]>,
        evidence: AuthenticationEvidence,
        assurance: AuthenticationAssurance
      ) => Effect.Effect<
        {
          readonly replacement: SessionStepUpReplacement<Claims["Type"]>
          readonly credential: Redacted.Redacted<string>
        },
        Failure
      >
    }
  >(`@effect/auth/sessions/${moduleId}/StepUpPlanner`)

  const SessionStepUpPersistence = Context.Service<
    ModuleService<Id, "step-up-persistence", Claims["Type"]>,
    StepUpPort<Claims["Type"]>
  >(`@effect/auth/sessions/${moduleId}/StepUpPersistence`)

  const StatefulSessionPersistence = Context.Service<
    ModuleService<Id, "persistence", Claims["Type"]>,
    PersistencePort<Claims["Type"]>
  >(`@effect/auth/sessions/${moduleId}/Persistence`)

  const SessionRepository = Context.Service<
    ModuleService<Id, "repository", Claims["Type"]>,
    RepositoryPort
  >(`@effect/auth/sessions/${moduleId}/Repository`)

  const SessionCleanup = Context.Service<ModuleService<Id, "cleanup", Claims["Type"]>, CleanupPort>(
    `@effect/auth/sessions/${moduleId}/Cleanup`
  )

  const SignedSessionValidity = Context.Service<
    ModuleService<Id, "validity", Claims["Type"]>,
    ValidityPort
  >(`@effect/auth/sessions/${moduleId}/Validity`)

  const PendingAuthentication = Context.Service<
    ModuleService<Id, "pending", Claims["Type"]>,
    PendingPort<Claims["Type"]>
  >(`@effect/auth/sessions/${moduleId}/Pending`)

  const unsupported = (capability: string) => Effect.fail(SessionCapabilityUnsupported.make({ capability }))

  const checkNoAmbientCommit = Effect.fnUntraced(function*() {
    if (yield* hasCommitScope) {
      return yield* SessionCapabilityUnsupported.make({
        capability: "public-operation-inside-transaction; use prepared completion"
      })
    }
  })

  const checkRenewalDue = (session: SessionMetadata, now: DateTime.Utc, policy: SessionPolicy) => {
    const retryAt = DateTime.add(session.issuedAt, { milliseconds: policy.renewalIntervalMillis })

    return DateTime.toEpochMillis(now) < DateTime.toEpochMillis(retryAt)
      ? Effect.fail(SessionRenewalTooEarly.make({ retryAt }))
      : Effect.void
  }

  const readCommitted = <A>(receipt: PreparedCommit<A>) =>
    receipt.read.pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
    )

  const prepareHooks = Effect.fn("Session.prepareHooks")(function*(
    action: "sign-in" | "session-creation" | "sign-out",
    session?: Pick<SessionMetadata, "subjectId" | "assurance">
  ) {
    const hooks = yield* LifecycleHooks
    const secrets = yield* makeSessionSecrets(moduleId)

    const snapshot = yield* lifecycleSnapshotEffect({
      action,
      operation: `${moduleId}/session`,
      ...(session === undefined
        ? {}
        : { subjectId: session.subjectId, method: session.assurance.method }),
      identifiers: []
    }).pipe(Effect.orDie)

    yield* hooks.before(snapshot)
    const id = yield* secrets.generate()

    return yield* lifecycleEventEffect({
      id: LifecycleEventId.make(Redacted.value(id)),
      occurredAtMillis: DateTime.toEpochMillis(yield* DateTime.now),
      snapshot
    }).pipe(Effect.orDie)
  })

  // Detach mutable date/collection declarations as well as projecting declared fields.
  // Work from the Type view so consumer wire transformations are not replayed.
  const publicSessionCodec = Schema.toCodecJson(Schema.toType(Session))

  const projectSession = (session: Session) =>
    Schema.encodeEffect(publicSessionCodec)(session).pipe(
      Effect.flatMap(Schema.decodeEffect(publicSessionCodec)),
      Effect.mapError(() => SessionInvalid.make({}))
    )

  const issue = (
    session: Session,
    credential: Redacted.Redacted<string>
  ): AuthOperationResult<Session> => ({
    value: Schema.decodeSync(publicSessionCodec)(Schema.encodeSync(publicSessionCodec)(session)),
    credentialCommands: [
      {
        _tag: "Issue",
        slot: "session",
        credential,
        expiresAtMillis: DateTime.toEpochMillis(session.expiresAt)
      }
    ]
  })

  const inspectProvenance = Effect.fn("Session.inspectProvenance")(function*(
    session: Session,
    input: SessionAuthenticationProvenance,
    version: SessionCredentialVersion
  ) {
    const provenance = yield* snapshotSessionAuthenticationProvenance(input).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    const credentialVersion = yield* Schema.decodeEffect(SessionCredentialVersion)(version).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    const original = provenance.evidence
    const publicProofs = session.assurance.evidence
    const ordinals = new Map<string, number>()
    const revisions = new Set(original.revision.credentials.map((item) => item.credentialId))

    if (
      revisions.size !== original.revision.credentials.length ||
      original.proofs.some((proof) => !revisions.has(proof.credentialId))
    ) {
      return yield* SessionInvalid.make({})
    }
    for (const proof of original.proofs) {
      if (!ordinals.has(proof.credentialId)) ordinals.set(proof.credentialId, ordinals.size)
    }
    if (
      session.subjectId !== original.revision.subjectId ||
      session.securityRevision !== original.revision.securityRevision ||
      publicProofs === undefined ||
      publicProofs.length !== original.proofs.length ||
      original.proofs.some((proof, index) => {
        const actual = publicProofs[index]

        return (
          actual.method !== proof.method ||
          actual.credentialOrdinal !== ordinals.get(proof.credentialId) ||
          actual.userVerified !== proof.userVerified ||
          actual.phishingResistant !== proof.phishingResistant ||
          DateTime.toEpochMillis(actual.verifiedAt) !== DateTime.toEpochMillis(proof.verifiedAt) ||
          actual.factors.length !== proof.factors.length ||
          actual.factors.some((factor, i) => factor !== proof.factors[i])
        )
      })
    ) {
      return yield* SessionInvalid.make({})
    }

    return Object.freeze({ session, provenance, credentialVersion })
  })

  const prepareHandoffIssuance = Effect.fn("Session.prepareHandoffIssuance")(function*(
    input: Parameters<Strategy["prepareHandoff"]>[0]
  ) {
    yield* checkNoAmbientCommit()

    const detached = yield* snapshotInspection(input.source).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    const source = yield* inspectProvenance(
      detached.session,
      detached.provenance,
      detached.credentialVersion
    )

    const original = source.provenance.evidence

    if (input.flowId === original.flowId || input.bindingDigest === original.bindingDigest) {
      return yield* SessionInvalid.make({})
    }

    const authority = yield* AuthenticationAuthority

    const requirement = yield* authority
      .requirements(original)
      .pipe(Effect.tapError(reportAuthorityFailure))

    return {
      issuance: {
        requirement,
        evidence: {
          ...original,
          flowId: input.flowId,
          bindingDigest: input.bindingDigest
        },
        claims: source.session.claims
      },
      source: source.session
    }
  })

  const prepareIssuance = Effect.fn("Session.prepareIssuance")(function*(
    input: Issuance,
    policy: SessionPolicy,
    source?: Session
  ) {
    const evidence = yield* snapshotAuthenticationEvidence(input.evidence)

    const requirement = yield* Schema.decodeEffect(AuthenticationRequirement)(
      input.requirement
    ).pipe(Effect.mapError(() => SessionInvalid.make({})))

    const assessed = yield* assessAuthentication(evidence, requirement).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    if (!assessed.satisfied) return yield* SessionInvalid.make({})

    // Current policy assesses the original proofs; it does not rewrite their
    // historical assurance or advance authenticatedAt when an older proof ages out.
    const assurance = source === undefined ? assessed.assurance : AuthenticationAssurance.make(source.assurance)

    const now = yield* DateTime.now

    const absoluteExpiresAt = DateTime.makeUnsafe(
      Math.min(
        DateTime.toEpochMillis(assurance.authenticatedAt) + policy.absoluteLifetimeMillis,
        source === undefined ? Infinity : DateTime.toEpochMillis(source.absoluteExpiresAt)
      )
    )

    const session = {
      subjectId: evidence.revision.subjectId,
      securityRevision: evidence.revision.securityRevision,
      assurance,
      issuedAt: DateTime.makeUnsafe(
        Math.max(
          DateTime.toEpochMillis(now),
          ...evidence.proofs.map((proof) => DateTime.toEpochMillis(proof.verifiedAt)),
          source === undefined ? -Infinity : DateTime.toEpochMillis(source.issuedAt)
        )
      ),
      expiresAt: DateTime.makeUnsafe(
        Math.min(
          DateTime.toEpochMillis(absoluteExpiresAt),
          DateTime.toEpochMillis(now) + policy.idleLifetimeMillis,
          // The existing commit-time expiry guard also checks source liveness.
          source === undefined ? Infinity : DateTime.toEpochMillis(source.expiresAt)
        )
      ),
      absoluteExpiresAt,
      claims: input.claims
    }

    yield* validateSessionTimeline(session, policy)

    return { evidence, session }
  })

  const replacementSession = Effect.fn("Session.replacementSession")(function*(
    source: Session,
    evidence: AuthenticationEvidence,
    assurance: AuthenticationAssurance,
    policy: SessionPolicy,
    sessionId: SessionId
  ) {
    const now = yield* DateTime.now

    const session = yield* projectSession({
      ...source,
      sessionId,
      subjectId: evidence.revision.subjectId,
      securityRevision: evidence.revision.securityRevision,
      // A successful step-up dates authentication from its newly satisfied profile.
      // The source absolute expiry and each retained proof timestamp stay unchanged.
      assurance: AuthenticationAssurance.make(assurance),
      issuedAt: DateTime.makeUnsafe(
        Math.max(
          DateTime.toEpochMillis(now),
          DateTime.toEpochMillis(source.issuedAt),
          ...evidence.proofs.map((proof) => DateTime.toEpochMillis(proof.verifiedAt))
        )
      ),
      expiresAt: DateTime.makeUnsafe(
        Math.min(
          DateTime.toEpochMillis(source.absoluteExpiresAt),
          DateTime.toEpochMillis(now) + policy.idleLifetimeMillis
        )
      )
    })

    yield* validateSessionTimeline(source, policy)
    yield* validateSessionTimeline(session, policy)

    return session
  })

  const statefulLayer = (configured: SessionPolicy) =>
    Layer.effectContext(
      Effect.gen(function*() {
        const policy = yield* validateSessionPolicy(configured, statefulCapabilities)

        const withClockPolicy = Effect.provideService(
          AuthenticationClock,
          yield* AuthenticationClock
        )

        const store = yield* StatefulSessionPersistence
        const repository = yield* SessionRepository
        const secrets = yield* makeSessionSecrets(moduleId)

        const services = (yield* Effect.context<
          | Claims["EncodingServices"]
          | Claims["DecodingServices"]
          | LifecycleHooks
          | SecureRandom.SecureRandom
          | Digest.Digest
        >()).pipe(
          withoutObservability,
          Context.omit(CurrentSessionInvocation, SessionVerificationCapture)
        )

        const validate = (session: Session) =>
          projectSession(session).pipe(
            Effect.provide(services),
            Effect.flatMap((value) => validateSessionTimeline(value, policy).pipe(Effect.as(value))),
            withClockPolicy
          )

        const inspect = Effect.fn("StatefulSession.inspect")(function*(
          credential: Redacted.Redacted<string>
        ) {
          const checkedAt = yield* DateTime.now
          const digest = yield* secrets.digest(credential, "bearer")
          const record = yield* store.verify({ digest, now: yield* DateTime.now })

          const inspection = yield* inspectProvenance(
            yield* validate(record),
            record.provenance,
            record.credentialVersion
          )

          const source = Object.freeze({
            inspection,
            guard: Object.freeze({ _tag: "Stateful" as const, digest })
          })

          yield* captureVerification(credential, source, checkedAt)

          return source
        })

        const prepareEstablish = Effect.fn("StatefulSession.prepareEstablish")(function*(
          input: Issuance,
          source?: Session
        ) {
          const planned = yield* prepareIssuance(input, policy, source)
          const credential = yield* secrets.generate()
          const digest = yield* secrets.digest(credential, "bearer")

          const base = {
            ...planned.session,
            digest,
            provenance: yield* snapshotSessionAuthenticationProvenance({
              evidence: planned.evidence
            }),
            credentialVersion: SessionCredentialVersion.make(
              Redacted.value(yield* secrets.generate())
            )
          }

          yield* validateSessionTimeline(base, policy)
          const event = yield* prepareHooks("sign-in", base).pipe(Effect.provide(services))

          const creation = yield* prepareHooks("session-creation", base).pipe(
            Effect.provide(services)
          )

          yield* validateSessionTimeline(base, policy)
          const commitNow = yield* DateTime.now

          return yield* store
            .establish(
              {
                session: base,
                evidence: planned.evidence,
                ...(source === undefined ? {} : { handoffSourceSessionId: source.sessionId }),
                ...(input.pending === undefined ? {} : { pending: input.pending }),
                now: commitNow
              },
              (record, journal) => {
                journal.stage(event)
                journal.stage(creation)

                return journal.prepare(issue(record, credential))
              }
            )
            .pipe(Effect.tapError(reportAuthorityFailure))
        }, withClockPolicy)

        const strategy = SessionStrategy.of({
          policy,
          capabilities: {
            ...statefulCapabilities,
            positiveCacheMillis: policy.positiveCacheMillis ?? 0
          },
          inspect,
          prepareEstablish: (input) => prepareEstablish(input),
          prepareHandoff: Effect.fn("StatefulSession.prepareHandoff")(function*(input) {
            const handoff = yield* prepareHandoffIssuance(input)

            return yield* prepareEstablish(handoff.issuance, handoff.source)
          }),
          renew: Effect.fn("StatefulSession.renew")(function*(
            credential: Redacted.Redacted<string>
          ) {
            yield* checkNoAmbientCommit()
            const digest = yield* secrets.digest(credential, "bearer")
            const now = yield* DateTime.now
            const record = yield* store.verify({ digest, now })

            const inspected = yield* inspectProvenance(
              yield* validate(record),
              record.provenance,
              record.credentialVersion
            )

            const session = inspected.session

            yield* checkRenewalDue(session, now, policy)
            const next = yield* secrets.generate()
            const nextDigest = yield* secrets.digest(next, "bearer")

            const nextCredentialVersion = SessionCredentialVersion.make(
              Redacted.value(yield* secrets.generate())
            )

            const event = yield* prepareHooks("session-creation", session).pipe(
              Effect.provide(services)
            )

            yield* validateSessionTimeline(session, policy)
            const commitNow = yield* DateTime.now

            const nextExpiresAt = DateTime.makeUnsafe(
              Math.min(
                DateTime.toEpochMillis(session.absoluteExpiresAt),
                DateTime.toEpochMillis(now) + policy.idleLifetimeMillis
              )
            )

            const receipt = yield* store.rotate(
              {
                record,
                nextDigest,
                nextCredentialVersion,
                nextExpiresAt,
                now: commitNow
              },
              (rotated, journal) => {
                journal.stage(event)

                return journal.prepare(issue(rotated, next))
              }
            )

            return yield* readCommitted(receipt)
          }, withClockPolicy),
          signOut: Effect.fn("StatefulSession.signOut")(function*(
            credential: Redacted.Redacted<string>
          ) {
            const result = yield* Effect.gen(function*() {
              const digest = yield* secrets.digest(credential, "bearer")
              const event = yield* prepareHooks("sign-out").pipe(Effect.provide(services))

              const receipt = yield* store.revokeDigest(digest, (revoked, journal) => {
                journal.stage(event)

                return journal.prepare({
                  clearCredential: true as const,
                  invalidation: revoked ? ("revoked" as const) : ("already-invalid" as const)
                })
              })

              return yield* readCommitted(receipt)
            }).pipe(reportSignOutFailure, Effect.exit)

            if (result._tag === "Failure" && Cause.hasInterrupts(result.cause)) {
              return yield* Effect.failCause(result.cause)
            }

            return {
              value: result._tag === "Failure"
                ? result.cause.reasons.every(
                    (reason) => Cause.isFailReason(reason) && reason.error._tag === "SessionInvalid"
                  )
                  ? { clearCredential: true as const, invalidation: "already-invalid" as const }
                  : SessionSignOutUnavailable.make({ clearCredential: true })
                : result.value,
              credentialCommands: [{ _tag: "Clear" as const, slot: "session" as const }]
            }
          }),
          list: repository.list,
          revoke: Effect.fn("StatefulSession.revoke")(function*(session, sessionId) {
            const event = yield* prepareHooks("sign-out", session).pipe(Effect.provide(services))

            return yield* readCommitted(
              yield* store.revoke(
                {
                  subjectId: session.subjectId,
                  sessionId
                },
                (_, journal) => {
                  journal.stage(event)

                  return journal.prepare(undefined)
                }
              )
            )
          }),
          revokeAll: Effect.fn("StatefulSession.revokeAll")(function*(session) {
            const event = yield* prepareHooks("sign-out", session).pipe(Effect.provide(services))

            return yield* readCommitted(
              yield* store.revokeAll(
                {
                  subjectId: session.subjectId,
                  expectedSecurityRevision: session.securityRevision
                },
                (_, journal) => {
                  journal.stage(event)

                  return journal.prepare(undefined)
                }
              )
            )
          })
        })

        const plan = Effect.fn("StatefulSession.planStepUpReplacement")(function*(
          source: SessionSource<Claims["Type"]>,
          evidence: AuthenticationEvidence,
          assurance: AuthenticationAssurance
        ) {
          if (source.guard._tag !== "Stateful") return yield* SessionStepUpInvalid.make({})
          const credential = yield* secrets.generate()
          const nextDigest = yield* secrets.digest(credential, "bearer")

          const session = yield* replacementSession(
            source.inspection.session,
            evidence,
            assurance,
            policy,
            source.inspection.session.sessionId
          )

          const inspection = yield* inspectProvenance(
            session,
            { evidence },
            SessionCredentialVersion.make(Redacted.value(yield* secrets.generate()))
          )

          return {
            credential,
            replacement: Object.freeze({
              _tag: "Stateful" as const,
              inspection,
              expectedDigest: source.guard.digest,
              nextDigest
            })
          }
        }, withClockPolicy)

        return Context.make(SessionStrategy, strategy).pipe(Context.add(StepUpPlanner, { plan }))
      })
    )

  const signedLayer = <Mode extends "stateless" | "state-assisted">(
    configured: SessionPolicy,
    mode: Mode
  ) => {
    const layer = Layer.effectContext(
      Effect.gen(function*() {
        const validity = mode === "state-assisted"
          ? Option.some(yield* SignedSessionValidity)
          : Option.none<ValidityPort>()

        const capabilities = {
          ...(Option.isSome(validity) ? stateAssistedCapabilities : statelessCapabilities),
          positiveCacheMillis: configured.positiveCacheMillis ?? 0
        }

        const policy = yield* validateSessionPolicy(configured, capabilities)
        const clockPolicy = yield* AuthenticationClock

        const withClockPolicy = Effect.provideService(AuthenticationClock, clockPolicy)

        const hooks = yield* LifecycleHooks
        const secrets = yield* makeSessionSecrets(moduleId)

        const services = (yield* Effect.context<
          | Claims["EncodingServices"]
          | Claims["DecodingServices"]
          | LifecycleHooks
          | SecureRandom.SecureRandom
          | Digest.Digest
        >()).pipe(
          withoutObservability,
          Context.omit(CurrentSessionInvocation, SessionVerificationCapture)
        )

        const Envelope = Schema.Struct({
          version: Schema.Literal(2),
          moduleId: Schema.Literal(moduleId),
          issuer: Schema.String,
          audience: Schema.String,
          generation: Schema.Natural,
          session: Session,
          provenance: SessionAuthenticationProvenance,
          credentialVersion: SessionCredentialVersion
        })

        const signing = yield* makeSessionSigningCodec(
          Envelope,
          yield* SessionSigningKeys,
          policy.maximumTokenBytes
        )

        const encode = (inspection: Inspection) =>
          signing.encode({
            version: 2,
            moduleId,
            issuer: policy.issuer,
            audience: policy.audience,
            generation: policy.generation,
            ...inspection
          })

        const inspectToken = Effect.fn("SignedSession.inspectToken")(function*(
          credential: Redacted.Redacted<string>
        ) {
          const envelope = yield* signing.decode(credential)

          if (
            envelope.issuer !== policy.issuer ||
            envelope.audience !== policy.audience ||
            envelope.generation !== policy.generation
          ) {
            return yield* SessionInvalid.make({})
          }
          yield* validateSessionTimeline(envelope.session, policy)

          return yield* inspectProvenance(
            yield* projectSession(envelope.session),
            envelope.provenance,
            envelope.credentialVersion
          )
        }, withClockPolicy)

        const inspect = Effect.fn("SignedSession.inspect")(function*(
          credential: Redacted.Redacted<string>
        ) {
          const checkedAt = yield* DateTime.now
          const inspection = yield* inspectToken(credential)

          if (Option.isSome(validity)) {
            yield* validity.value
              .verify(inspection.session, yield* DateTime.now)
              .pipe(Effect.tapError(reportAuthorityFailure))
          }
          // Validity reads and codec work may outlast a live token's expiry.
          yield* validateSessionTimeline(inspection.session, policy)

          const source = Object.freeze({
            inspection,
            guard: Object.freeze(
              Option.isSome(validity)
                ? { _tag: "StateAssistedSigned" as const }
                : { _tag: "StatelessSigned" as const }
            )
          })

          yield* captureVerification(credential, source, checkedAt)

          return source
        }, withClockPolicy)

        const prepareEstablish = Effect.fn("SignedSession.prepareEstablish")(function*(
          input: Issuance,
          source?: Session
        ) {
          const planned = yield* prepareIssuance(input, policy, source)
          const authority = yield* AuthenticationAuthority

          const session: Session = {
            ...planned.session,
            sessionId: SessionId.make(Redacted.value(yield* secrets.generate()))
          }

          if (session.sessionId === source?.sessionId) return yield* SessionInvalid.make({})
          yield* validateSessionTimeline(session, policy)

          const provenance = yield* snapshotSessionAuthenticationProvenance({
            evidence: planned.evidence
          })

          const credentialVersion = SessionCredentialVersion.make(
            Redacted.value(yield* secrets.generate())
          )

          const credential = yield* encode({ session, provenance, credentialVersion })
          const event = yield* prepareHooks("sign-in", session).pipe(Effect.provide(services))

          const creation = yield* prepareHooks("session-creation", session).pipe(
            Effect.provide(services)
          )

          yield* validateSessionTimeline(session, policy)

          return yield* authority
            .approve(
              {
                evidence: planned.evidence,
                ...(input.pending === undefined ? {} : { pending: input.pending }),
                now: yield* DateTime.now,
                issuedAt: session.issuedAt,
                expiresAt: session.expiresAt,
                absoluteExpiresAt: session.absoluteExpiresAt
              },
              (_, journal) => {
                journal.stage(event)
                journal.stage(creation)

                return journal.prepare(issue(session, credential))
              }
            )
            .pipe(Effect.tapError(reportAuthorityFailure))
        }, withClockPolicy)

        const strategy = SessionStrategy.of({
          policy,
          capabilities,
          inspect,
          prepareEstablish: (input) => prepareEstablish(input),
          prepareHandoff: Effect.fn("SignedSession.prepareHandoff")(function*(input) {
            const handoff = yield* prepareHandoffIssuance(input)

            return yield* prepareEstablish(handoff.issuance, handoff.source)
          }),
          renew: Effect.fn("SignedSession.renew")(function*(
            credential: Redacted.Redacted<string>
          ) {
            yield* checkNoAmbientCommit()
            const source = (yield* inspect(credential)).inspection
            const session = source.session
            const now = yield* DateTime.now

            yield* checkRenewalDue(session, now, policy)

            const renewed = {
              ...session,
              issuedAt: now,
              expiresAt: DateTime.makeUnsafe(
                Math.min(
                  DateTime.toEpochMillis(session.absoluteExpiresAt),
                  DateTime.toEpochMillis(now) + policy.idleLifetimeMillis
                )
              )
            }

            const next = yield* encode({
              session: renewed,
              provenance: source.provenance,
              credentialVersion: SessionCredentialVersion.make(
                Redacted.value(yield* secrets.generate())
              )
            })

            const event = yield* prepareHooks("session-creation", renewed).pipe(
              Effect.provide(services)
            )

            yield* validateSessionTimeline(session, policy)
            yield* validateSessionTimeline(renewed, policy)
            // Signing grants no new authority; preserve the original absolute bound.
            const result = issue(renewed, next)

            yield* hooks.after(event)

            return result
          }, withClockPolicy),
          signOut: Effect.fn("SignedSession.signOut")(function*(
            credential: Redacted.Redacted<string>
          ) {
            yield* checkNoAmbientCommit()

            const outcome = yield* Effect.gen(function*() {
              const event = yield* prepareHooks("sign-out").pipe(Effect.provide(services))

              if (Option.isSome(validity)) {
                const session = (yield* inspectToken(credential)).session

                const receipt = yield* validity.value.revoke(
                  {
                    subjectId: session.subjectId,
                    sessionId: session.sessionId,
                    absoluteExpiresAt: session.absoluteExpiresAt
                  },
                  (_, journal) => {
                    journal.stage(event)

                    return journal.prepare({
                      clearCredential: true as const,
                      invalidation: "revoked" as const
                    })
                  }
                )

                return yield* readCommitted(receipt)
              }

              yield* hooks.after(event)

              return { clearCredential: true as const, invalidation: "client-only" as const }
            }).pipe(reportSignOutFailure, Effect.exit)

            if (outcome._tag === "Failure" && Cause.hasInterrupts(outcome.cause)) {
              return yield* Effect.failCause(outcome.cause)
            }

            const value: SignOutResult = outcome._tag === "Failure"
              ? outcome.cause.reasons.every(
                  (reason) => Cause.isFailReason(reason) && reason.error._tag === "SessionInvalid"
                )
                ? { clearCredential: true, invalidation: "already-invalid" }
                : SessionSignOutUnavailable.make({ clearCredential: true })
              : outcome.value

            return {
              value,
              credentialCommands: [{ _tag: "Clear" as const, slot: "session" as const }]
            }
          }),
          list: () => unsupported("session-listing"),
          revoke: Effect.fn("SignedSession.revoke")(function*(session, sessionId) {
            if (Option.isNone(validity)) return yield* unsupported("per-session-revocation")
            const event = yield* prepareHooks("sign-out", session).pipe(Effect.provide(services))

            return yield* readCommitted(
              yield* validity.value.revoke(
                {
                  subjectId: session.subjectId,
                  sessionId,
                  // The target may have been issued by an ahead clock.
                  absoluteExpiresAt: DateTime.add(yield* DateTime.now, {
                    milliseconds: policy.maximumIssuedAbsoluteLifetimeMillis +
                      clockPolicy.futureToleranceMillis
                  })
                },
                (_, journal) => {
                  journal.stage(event)

                  return journal.prepare(undefined)
                }
              )
            )
          }),
          revokeAll: Effect.fn("SignedSession.revokeAll")(function*(session) {
            if (Option.isNone(validity)) return yield* unsupported("subject-invalidation")
            const event = yield* prepareHooks("sign-out", session).pipe(Effect.provide(services))

            return yield* readCommitted(
              yield* validity.value.revokeAll(
                {
                  subjectId: session.subjectId,
                  expectedSecurityRevision: session.securityRevision
                },
                (_, journal) => {
                  journal.stage(event)

                  return journal.prepare(undefined)
                }
              )
            )
          })
        })

        const plan = Effect.fn("SignedSession.planStepUpReplacement")(function*(
          source: SessionSource<Claims["Type"]>,
          evidence: AuthenticationEvidence,
          assurance: AuthenticationAssurance
        ) {
          const expectedTag = Option.isSome(validity) ? "StateAssistedSigned" : "StatelessSigned"

          if (source.guard._tag !== expectedTag) return yield* SessionStepUpInvalid.make({})

          const session = yield* replacementSession(
            source.inspection.session,
            evidence,
            assurance,
            policy,
            SessionId.make(Redacted.value(yield* secrets.generate()))
          )

          const inspection = yield* inspectProvenance(
            session,
            { evidence },
            SessionCredentialVersion.make(Redacted.value(yield* secrets.generate()))
          )

          const credential = yield* encode(inspection)

          const replacement: SessionStepUpReplacement<Claims["Type"]> = Option.isSome(validity)
            ? Object.freeze({
              _tag: "StateAssistedSigned",
              inspection,
              tombstoneSessionId: source.inspection.session.sessionId,
              tombstoneUntil: source.inspection.session.absoluteExpiresAt
            })
            : Object.freeze({ _tag: "StatelessSigned", inspection })

          return { credential, replacement }
        }, withClockPolicy)

        return Context.make(SessionStrategy, strategy).pipe(Context.add(StepUpPlanner, { plan }))
      })
    )

    const provided = layer.pipe(Layer.provide(sessionSigningKeysLayer))

    // Mode is the literal selected by the two public constructors below.
    return provided as Layer.Layer<
      Layer.Success<typeof provided>,
      Layer.Error<typeof provided>,
      | Exclude<
        Layer.Services<typeof provided>,
        Context.Service.Identifier<typeof SignedSessionValidity>
      >
      | (Mode extends "state-assisted" ? Context.Service.Identifier<typeof SignedSessionValidity>
        : never)
    >
  }

  const statelessLayer = (policy: SessionPolicy) => signedLayer(policy, "stateless")

  const stateAssistedLayer = (policy: SessionPolicy) => signedLayer(policy, "state-assisted")

  const AuthenticationCompletion = Context.Service<
    ModuleService<Id, "completion", Claims["Type"]>,
    {
      readonly prepare: (input: Issuance) => Prepared<CompletionResult>
      /** Internal-only lookup authenticated by the private pending bearer. No claims
       * or normal session authority; final preparePending still rechecks/consumes. */
      readonly inspectPending: (
        credential: Redacted.Redacted<string>
      ) => Effect.Effect<PendingAuthenticationSnapshot<Claims["Type"]>, Failure>
      /** Charge a rejected additional factor without caller-supplied binding data.
       * Read the returned receipt before reporting the rejection to its caller. */
      readonly rejectPendingCredential: (
        credential: Redacted.Redacted<string>
      ) => Effect.Effect<PreparedCommit<{ readonly _tag: "Rejected" }>, Failure>
      /** Only method implementations call this after independently verifying the next proof. */
      readonly preparePending: (input: {
        readonly pending: PendingAuthenticationSnapshot<Claims["Type"]>
        readonly additional: AuthenticationEvidence
      }) => Prepared<CompletionResult>
    }
  >(`@effect/auth/sessions/${moduleId}/Completion`)

  type PendingConfiguration = {
    readonly pendingLifetimeMillis: number
    readonly attemptLimit: number
  }

  const makeCompletionLayer = <R>(
    inputConfiguration: PendingConfiguration | undefined,
    pending: Effect.Effect<Option.Option<PendingPort<Claims["Type"]>>, never, R>
  ): CompletionLayer<Id, Claims, R> =>
    Layer.effect(
      AuthenticationCompletion,
      Effect.gen(function*() {
        const configuration = inputConfiguration === undefined
          ? undefined
          : Object.freeze(
            yield* Schema.decodeEffect(
              Schema.Struct({
                pendingLifetimeMillis: Schema.Int.check(
                  Schema.isBetween({ minimum: 1, maximum: 900000 })
                ),
                attemptLimit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))
              })
            )(inputConfiguration).pipe(
              Effect.catchCause((cause) =>
                Effect.failCause(
                  Cause.map(cause, () => SessionConfigurationError.make({ reason: "pending-authentication" }))
                )
              )
            )
          )

        const pendingPort = yield* pending

        const withClockPolicy = Effect.provideService(
          AuthenticationClock,
          yield* AuthenticationClock
        )

        const strategy = yield* SessionStrategy
        const authority = yield* AuthenticationAuthority
        const secrets = yield* makeSessionSecrets(moduleId)

        const claimServices = (yield* Effect.context<
          Claims["DecodingServices"] | Claims["EncodingServices"]
        >()).pipe(
          withoutObservability,
          Context.omit(CurrentSessionInvocation, SessionVerificationCapture)
        )

        const codec = Schema.toCodecIso(ClaimsCodec)

        const projectClaims = (value: Claims["Type"]) =>
          Schema.encodeEffect(codec)(value).pipe(
            Effect.flatMap(Schema.decodeEffect(codec)),
            Effect.provide(claimServices),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionInvalid.make({}))))
          )

        const completed = (
          receipt: PreparedCommit<AuthOperationResult<Session>>
        ): PreparedCommit<AuthOperationResult<CompletionResult>> => ({
          _tag: "PreparedCommit",
          read: receipt.read.pipe(
            Effect.map(({ value, credentialCommands }) => ({
              value: { _tag: "Authenticated" as const, session: value },
              credentialCommands
            }))
          )
        })

        const prepare: (input: Issuance) => Prepared<CompletionResult> = Effect.fn(
          "AuthenticationCompletion.prepare"
        )(function*(input: Issuance) {
          input = { ...input, evidence: yield* snapshotAuthenticationEvidence(input.evidence) }
          const checkedClaims = yield* projectClaims(input.claims)

          const requirement = yield* Schema.decodeEffect(AuthenticationRequirement)(
            input.requirement
          ).pipe(Effect.mapError(() => SessionInvalid.make({})))

          const assessed = yield* assessAuthentication(input.evidence, requirement).pipe(
            Effect.mapError(() => SessionInvalid.make({}))
          )

          if (assessed.satisfied) {
            return completed(
              yield* strategy
                .prepareEstablish({ ...input, requirement, claims: checkedClaims })
                .pipe(Effect.provideService(AuthenticationAuthority, authority))
            )
          }
          if (
            input.pending !== undefined ||
            configuration === undefined ||
            Option.isNone(pendingPort)
          ) {
            return yield* SessionCapabilityUnsupported.make({
              capability: "required-additional-authentication"
            })
          }
          const now = yield* DateTime.now

          const expiresAt = DateTime.makeUnsafe(
            Math.min(
              DateTime.toEpochMillis(now) + configuration.pendingLifetimeMillis,
              DateTime.toEpochMillis(assessed.assurance.authenticatedAt) +
                requirement.maximumAgeMillis,
              input.evidence.completionExpiresAt === undefined
                ? Infinity
                : DateTime.toEpochMillis(input.evidence.completionExpiresAt)
            )
          )

          const credential = yield* secrets.generate()
          const digest = yield* secrets.digest(credential, "pending")

          return yield* pendingPort.value.create(
            {
              digest,
              evidence: input.evidence,
              claims: checkedClaims,
              expiresAt,
              attemptLimit: configuration.attemptLimit
            },
            now,
            (record, journal) =>
              journal.prepare({
                value: { _tag: "PendingAuthentication" as const, expiresAt: record.expiresAt },
                credentialCommands: [
                  {
                    _tag: "Issue" as const,
                    slot: "pending-proof" as const,
                    credential,
                    expiresAtMillis: DateTime.toEpochMillis(record.expiresAt)
                  }
                ]
              })
          )
        }, withClockPolicy)

        const pendingCodec = Schema.toCodecJson(
          Schema.toType(
            Schema.Struct({
              record: Schema.Struct({
                digest: TokenDigest,
                version: SecurityRevision,
                evidence: AuthenticationEvidence,
                expiresAt: Schema.DateTimeUtcFromMillis,
                attemptLimit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })),
                claims: ClaimsCodec
              }),
              requirement: AuthenticationRequirement
            })
          )
        )

        const inspectPending = Effect.fn("AuthenticationCompletion.inspectPending")(function*(
          credential: Redacted.Redacted<string>
        ) {
          if (Option.isNone(pendingPort)) {
            return yield* SessionCapabilityUnsupported.make({
              capability: "pending-authentication"
            })
          }
          const digest = yield* secrets.digest(credential, "pending")
          const captured = yield* pendingPort.value.read({ digest, now: yield* DateTime.now })

          const snapshot = yield* Schema.encodeEffect(pendingCodec)(captured).pipe(
            Effect.flatMap(Schema.decodeEffect(pendingCodec)),
            Effect.provide(claimServices),
            Effect.map(freezeGraph),
            Effect.mapError(() => SessionInvalid.make({}))
          )

          if (snapshot.record.digest !== digest) return yield* SessionInvalid.make({})

          return snapshot
        })

        return AuthenticationCompletion.of({
          prepare,
          inspectPending,
          rejectPendingCredential: Effect.fn("AuthenticationCompletion.rejectPendingCredential")(
            function*(credential) {
              if (Option.isNone(pendingPort)) {
                return yield* SessionCapabilityUnsupported.make({
                  capability: "pending-authentication"
                })
              }
              const digest = yield* secrets.digest(credential, "pending")

              return yield* pendingPort.value.reject(
                { digest, now: yield* DateTime.now },
                (decision, journal) => journal.prepare(decision)
              )
            }
          ),
          preparePending: Effect.fn("AuthenticationCompletion.preparePending")(function*(input) {
            if (Option.isNone(pendingPort)) {
              return yield* SessionCapabilityUnsupported.make({
                capability: "pending-authentication"
              })
            }
            const { record, requirement } = input.pending
            const digest = record.digest

            const evidence = yield* combineAuthenticationEvidence(
              record.evidence,
              input.additional
            )

            const receipt = yield* prepare({
              evidence,
              claims: record.claims,
              requirement,
              pending: {
                digest,
                bindingDigest: evidence.bindingDigest,
                flowId: evidence.flowId,
                version: record.version
              }
            })

            return {
              _tag: "PreparedCommit" as const,
              read: receipt.read.pipe(
                Effect.map((result) => ({
                  value: result.value,
                  credentialCommands: [
                    ...result.credentialCommands,
                    { _tag: "Clear" as const, slot: "pending-proof" as const }
                  ]
                }))
              )
            }
          })
        })
      })
    )

  function completionLayer(): CompletionLayer<Id, Claims>
  function completionLayer(
    configuration: PendingConfiguration
  ): CompletionLayer<Id, Claims, ModuleService<Id, "pending", Claims["Type"]>>
  function completionLayer(configuration?: PendingConfiguration) {
    const captured = configuration === undefined ? undefined : Object.freeze({ ...configuration })

    return makeCompletionLayer(
      captured,
      captured === undefined
        ? Effect.serviceOption(PendingAuthentication)
        : Effect.map(PendingAuthentication, Option.some)
    )
  }

  const SessionStepUp = Context.Service<
    ModuleService<Id, "step-up", Claims["Type"]>,
    {
      readonly prepareBegin: (input: {
        readonly source: SessionSource<Claims["Type"]>
        readonly profileId: SessionStepUpProfileId
      }) => Prepared<StepUpPending>
      readonly inspect: (
        credential: Redacted.Redacted<string>
      ) => Effect.Effect<SessionStepUpSnapshot, Failure>
      readonly rejectCredential: (
        credential: Redacted.Redacted<string>
      ) => Effect.Effect<PreparedCommit<{ readonly _tag: "Rejected" }>, Failure>
      readonly prepareComplete: (input: {
        readonly source: SessionSource<Claims["Type"]>
        readonly pending: SessionStepUpSnapshot
        readonly additional: AuthenticationEvidence
      }) => Prepared<Session>
    }
  >(`@effect/auth/sessions/${moduleId}/StepUp`)

  const freezeInstant = (input: DateTime.Utc) => {
    const copy = DateTime.makeUnsafe(DateTime.toEpochMillis(input))

    Object.freeze(DateTime.toPartsUtc(copy))

    return Object.freeze(copy)
  }

  const snapshotRequirement = (input: AuthenticationRequirement) =>
    Object.freeze({
      ...input,
      alternatives: Object.freeze(
        EffectArray.map(input.alternatives, (alternative) =>
          Object.freeze({
            ...alternative,
            factors: Object.freeze([...alternative.factors])
          }))
      )
    })

  const boundedRequirement = (input: AuthenticationRequirement) =>
    Array.isArray(input?.alternatives) &&
    input.alternatives.length > 0 &&
    input.alternatives.length <= 16 &&
    input.alternatives.every(
      (alternative) => Array.isArray(alternative?.factors) && alternative.factors.length <= 3
    )

  const readRequirement = (input: AuthenticationRequirement) =>
    boundedRequirement(input)
      ? Schema.decodeEffect(SessionStepUpRequirement)(input).pipe(
        Effect.map(snapshotRequirement),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )
      : Effect.fail(SessionUnavailable.make({}))

  const intentCodec = Schema.toCodecJson(Schema.toType(SessionStepUpIntent))

  const snapshotIntent = Effect.fnUntraced(function*(
    input: SessionStepUpIntent
  ) {
    if (
      !Array.isArray(input?.revision?.credentials) ||
      input.revision.credentials.length > 64 ||
      !boundedRequirement(input?.requirement)
    ) {
      return yield* SessionStepUpInvalid.make({})
    }

    const value = yield* Schema.encodeEffect(intentCodec)(input).pipe(
      Effect.flatMap(Schema.decodeEffect(intentCodec)),
      Effect.mapError(() => SessionStepUpInvalid.make({}))
    )

    return Object.freeze({
      ...value,
      revision: Object.freeze({
        ...value.revision,
        credentials: Object.freeze(
          value.revision.credentials.map((item) => Object.freeze({ ...item }))
        )
      }),
      requirement: snapshotRequirement(value.requirement),
      sourceAuthenticatedAt: freezeInstant(value.sourceAuthenticatedAt),
      sourceExpiresAt: freezeInstant(value.sourceExpiresAt),
      sourceAbsoluteExpiresAt: freezeInstant(value.sourceAbsoluteExpiresAt),
      expiresAt: freezeInstant(value.expiresAt)
    })
  })

  const inspectionCodec = Schema.toCodecJson(
    Schema.toType(
      Schema.Struct({
        session: Session,
        provenance: SessionAuthenticationProvenance,
        credentialVersion: SessionCredentialVersion
      })
    )
  )

  const sourceCodec = Schema.toCodecJson(
    Schema.toType(
      Schema.Struct({
        inspection: Schema.Struct({
          session: Session,
          provenance: SessionAuthenticationProvenance,
          credentialVersion: SessionCredentialVersion
        }),
        guard: SessionGuard
      })
    )
  )

  const invocationCodec = Schema.fromJsonString(sourceCodec)

  // Keep the complete detached private source, but project only the fields each
  // reader consumes. Public reads never need to decode the private proof graph.
  const capturedMetadataCodec = Schema.fromJsonString(
    Schema.toCodecJson(
      Schema.toType(Schema.Struct({ inspection: Schema.Struct({ session: SessionMetadata }) }))
    )
  )

  const capturedSessionCodec = Schema.fromJsonString(
    Schema.toCodecJson(
      Schema.toType(Schema.Struct({ inspection: Schema.Struct({ session: Session }) }))
    )
  )

  const captureVerification = Effect.fnUntraced(function*(
    credential: Redacted.Redacted<string>,
    value: SessionSource<Claims["Type"]>,
    checkedAt: DateTime.Utc
  ) {
    const capture = yield* Effect.serviceOption(SessionVerificationCapture)

    if (Option.isNone(capture)) return

    const inspection = yield* Schema.encodeEffect(invocationCodec)(value).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    const detached = yield* Schema.decodeEffect(capturedMetadataCodec)(inspection).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    const session = detached.inspection.session

    capture.value.capture({
      moduleId,
      credential,
      subjectId: session.subjectId,
      sessionId: session.sessionId,
      assurance: freezeGraph(session.assurance),
      checkedAtMillis: DateTime.toEpochMillis(checkedAt),
      expiresAtMillis: DateTime.toEpochMillis(session.expiresAt),
      absoluteExpiresAtMillis: DateTime.toEpochMillis(session.absoluteExpiresAt),
      source: inspection
    })
  })

  /** Private source evidence from the verification that admitted this exact action.
   * Outside that action, inspect the credential afresh. Explicit inspection and
   * public verification remain fresh; persistence rechecks mutation authority at commit. */
  const inspectInvocation = Effect.fn("Session.inspectInvocation")(function*(
    invocation: AuthInvocation,
    credential: Redacted.Redacted<string>
  ) {
    const strategy = yield* SessionStrategy
    const current = yield* Effect.serviceOption(CurrentSessionInvocation)

    const source = Option.isSome(current) &&
        current.value.isActive() &&
        current.value.invocation === invocation &&
        invocation._tag === "Authenticated"
      ? Option.getOrUndefined(EffectArray.findLast(current.value.sessions, (session) =>
        session.moduleId === moduleId &&
        session.subjectId === invocation.subjectId &&
        session.sessionId === invocation.sessionId &&
        Redacted.value(session.credential) === Redacted.value(credential)))
      : undefined

    if (source === undefined) return yield* strategy.inspect(credential)

    const inspection = yield* Schema.decodeEffect(invocationCodec)(source.source).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    yield* validateSessionTimeline(inspection.inspection.session, strategy.policy)

    return freezeGraph(inspection)
  })

  const capturedSession = Effect.fn("Session.capturedSession")(function*(
    credential: Redacted.Redacted<string>
  ) {
    const strategy = yield* SessionStrategy
    const capture = yield* Effect.serviceOption(SessionVerificationCapture)

    const stored = Option.isSome(capture) && capture.value.isActive()
      ? Option.getOrUndefined(EffectArray.findLast(capture.value.sessions, (item) =>
        item.moduleId === moduleId &&
        Redacted.value(item.credential) === Redacted.value(credential)))
      : undefined

    if (stored === undefined) {
      return Option.none<{ readonly session: Session; readonly checkedAt: DateTime.Utc }>()
    }

    const source = yield* Schema.decodeEffect(capturedSessionCodec)(stored.source).pipe(
      Effect.mapError(() => SessionInvalid.make({}))
    )

    yield* validateSessionTimeline(source.inspection.session, strategy.policy)

    return Option.some({
      session: source.inspection.session,
      checkedAt: DateTime.makeUnsafe(stored.checkedAtMillis)
    })
  })

  // Only detached schema Type values reach this helper. DateTime caches must be
  // materialized before freezing; consumer collections are detached by the codec.
  const freezeGraph = <A>(value: A): A => {
    if (Predicate.isObject(value)) {
      if (DateTime.isDateTime(value) && DateTime.isUtc(value)) {
        Object.freeze(DateTime.toPartsUtc(value))
        Object.freeze(value)
      } else if (
        Array.isArray(value) ||
        Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null ||
        Schema.is(AuthenticationAssurance)(value)
      ) {
        for (const child of Object.values(value)) freezeGraph(child)
        Object.freeze(value)
      }
      // Consumer typed arrays, collections and opaque class instances stay valid
      // Type values. Detachment, not Object.freeze, isolates their mutable storage.
    }

    return value
  }

  const snapshotInspection = (input: Inspection) =>
    Schema.encodeEffect(inspectionCodec)(input).pipe(
      Effect.flatMap(Schema.decodeEffect(inspectionCodec)),
      Effect.map(freezeGraph),
      Effect.mapError(() => SessionStepUpInvalid.make({}))
    )

  const snapshotSource = (input: SessionSource<Claims["Type"]>) =>
    Schema.encodeEffect(sourceCodec)(input).pipe(
      Effect.flatMap(Schema.decodeEffect(sourceCodec)),
      Effect.map(freezeGraph),
      Effect.mapError(() => SessionStepUpInvalid.make({}))
    )

  const requirementEncoding = Schema.encodeSync(Schema.fromJsonString(AuthenticationRequirement))

  const profileEncoding = Schema.encodeSync(
    Schema.fromJsonString(
      Schema.Tuple([
        Schema.Literal("effect-auth/session-step-up/profile/v1"),
        Schema.String,
        SessionStepUpProfile
      ])
    )
  )

  /** Configuration is decoded and detached before asynchronous hashing or Layer building. */
  const stepUpLayer = (configured: ReadonlyArray<SessionStepUpProfile>) => {
    const decoded = Schema.decodeResult(
      Schema.Array(SessionStepUpProfile).check(Schema.isMinLength(1), Schema.isMaxLength(64))
    )(
      Array.isArray(configured) &&
        configured.length <= 64 &&
        configured.every((profile) => boundedRequirement(profile?.requirement))
        ? configured
        : []
    )

    const profiles = Result.isSuccess(decoded)
      ? Object.freeze(
        decoded.success.map((profile) =>
          Object.freeze({
            ...profile,
            requirement: snapshotRequirement(profile.requirement)
          })
        )
      )
      : undefined

    return Layer.effect(
      SessionStepUp,
      Effect.gen(function*() {
        if (
          profiles === undefined ||
          new Set(profiles.map((profile) => profile.profileId)).size !== profiles.length
        ) {
          return yield* SessionConfigurationError.make({ reason: "step-up" })
        }
        const store = yield* SessionStepUpPersistence

        const withClockPolicy = Effect.provideService(
          AuthenticationClock,
          yield* AuthenticationClock
        )

        const strategy = yield* SessionStrategy
        const planner = yield* StepUpPlanner
        const random = yield* SecureRandom.SecureRandom
        const digestService = yield* Digest.Digest
        const secrets = yield* makeSessionSecrets(moduleId)

        const hooks = Context.make(LifecycleHooks, yield* LifecycleHooks).pipe(
          Context.add(SecureRandom.SecureRandom, random),
          Context.add(Digest.Digest, digestService)
        )

        const registry = new Map<
          SessionStepUpProfileId,
          { readonly profile: SessionStepUpProfile; readonly digest: TokenDigest }
        >()

        for (const profile of profiles) {
          const bytes = new TextEncoder().encode(
            profileEncoding(["effect-auth/session-step-up/profile/v1", moduleId, profile])
          )

          const digest = yield* digestService
            .digest(Digest.sha256, bytes)
            .pipe(
              Effect.catchDefect(() => Effect.fail(SessionUnavailable.make({}))),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
            )

          registry.set(
            profile.profileId,
            Object.freeze({ profile, digest: TokenDigest.make(Base64Url.encode(digest)) })
          )
        }

        const assess = (
          evidence: AuthenticationEvidence,
          requirement: AuthenticationRequirement,
          now: DateTime.Utc
        ) =>
          assessAuthentication(evidence, requirement, now).pipe(
            withClockPolicy,
            Effect.catchTag("SessionConfigurationError", () => Effect.fail(SessionUnavailable.make({})))
          )

        const digestCredential = (credential: Redacted.Redacted<string>) =>
          secrets
            .digest(credential, "step-up")
            .pipe(
              Effect.catchCause((cause) =>
                Effect.failCause(
                  Cause.map(cause, (error) => error._tag === "SessionInvalid" ? SessionStepUpInvalid.make({}) : error)
                )
              )
            )

        const inspect = Effect.fn("SessionStepUp.inspect")(function*(
          credential: Redacted.Redacted<string>
        ) {
          const digest = yield* digestCredential(credential)
          const captured = yield* store.read({ digest, now: yield* DateTime.now })
          const intent = yield* snapshotIntent(captured.intent)
          const requirement = yield* readRequirement(captured.requirement)
          const configured = registry.get(intent.profileId)
          const now = DateTime.toEpochMillis(yield* DateTime.now)

          if (
            intent.digest !== digest ||
            configured === undefined ||
            intent.profileGeneration !== configured.profile.generation ||
            intent.profileDigest !== configured.digest ||
            requirementEncoding(intent.requirement) !==
              requirementEncoding(configured.profile.requirement) ||
            intent.attemptLimit !== configured.profile.attemptLimit ||
            now >= DateTime.toEpochMillis(intent.expiresAt) ||
            DateTime.toEpochMillis(intent.expiresAt) >
              DateTime.toEpochMillis(intent.sourceExpiresAt) ||
            DateTime.toEpochMillis(intent.sourceExpiresAt) >
              DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt)
          ) {
            return yield* SessionStepUpInvalid.make({})
          }

          return Object.freeze({ intent, requirement })
        })

        const matchSource = (
          intent: SessionStepUpIntent,
          source: SessionSource<Claims["Type"]>
        ) => {
          const { session, credentialVersion, provenance } = source.inspection
          const revision = provenance.evidence.revision

          const sameRevisions = revision.credentials.length === intent.revision.credentials.length &&
            revision.credentials.every((item) =>
              intent.revision.credentials.some(
                (expected) =>
                  expected.credentialId === item.credentialId &&
                  expected.revision === item.revision
              )
            )

          return (
            intent.sourceKind === source.guard._tag &&
            intent.sourceSessionId === session.sessionId &&
            intent.sourceCredentialVersion === credentialVersion &&
            intent.revision.subjectId === revision.subjectId &&
            intent.revision.securityRevision === revision.securityRevision &&
            sameRevisions &&
            DateTime.toEpochMillis(intent.sourceAuthenticatedAt) ===
              DateTime.toEpochMillis(session.assurance.authenticatedAt) &&
            DateTime.toEpochMillis(intent.sourceExpiresAt) ===
              DateTime.toEpochMillis(session.expiresAt) &&
            DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt) ===
              DateTime.toEpochMillis(session.absoluteExpiresAt)
          )
        }

        return SessionStepUp.of({
          prepareBegin: Effect.fn("SessionStepUp.prepareBegin")(function*(input) {
            const configured = registry.get(input.profileId)

            if (configured === undefined) return yield* SessionStepUpInvalid.make({})
            const source = yield* snapshotSource(input.source)
            const evidence = source.inspection.provenance.evidence
            const credential = yield* secrets.generate()
            const digest = yield* digestCredential(credential)

            const bindingDigest = yield* secrets.digest(
              yield* secrets.generate(),
              "step-up-binding"
            )

            const flowId = AuthenticationFlowId.make(Redacted.value(yield* secrets.generate()))
            const now = yield* DateTime.now
            const session = source.inspection.session

            yield* validateSessionTimeline(session, strategy.policy)

            const expiresAt = freezeInstant(
              DateTime.makeUnsafe(
                Math.min(
                  DateTime.toEpochMillis(now) + configured.profile.lifetimeMillis,
                  DateTime.toEpochMillis(session.expiresAt),
                  DateTime.toEpochMillis(session.absoluteExpiresAt)
                )
              )
            )

            const intent: Omit<SessionStepUpIntent, "version"> = Object.freeze({
              _tag: "SessionStepUpIntent",
              digest,
              flowId,
              bindingDigest,
              revision: evidence.revision,
              sourceKind: source.guard._tag,
              sourceSessionId: session.sessionId,
              sourceCredentialVersion: source.inspection.credentialVersion,
              sourceAuthenticatedAt: freezeInstant(session.assurance.authenticatedAt),
              sourceExpiresAt: freezeInstant(session.expiresAt),
              sourceAbsoluteExpiresAt: freezeInstant(session.absoluteExpiresAt),
              profileId: configured.profile.profileId,
              profileGeneration: configured.profile.generation,
              profileDigest: configured.digest,
              requirement: configured.profile.requirement,
              expiresAt,
              attemptLimit: configured.profile.attemptLimit
            })

            return yield* store.create(intent, now, (_, journal) =>
              journal.prepare({
                value: { _tag: "StepUpPending" as const, profileId: intent.profileId, expiresAt },
                credentialCommands: [
                  {
                    _tag: "Issue" as const,
                    slot: "session-step-up" as const,
                    credential,
                    expiresAtMillis: DateTime.toEpochMillis(expiresAt)
                  }
                ]
              }))
          }, withClockPolicy),
          inspect,
          rejectCredential: Effect.fn("SessionStepUp.rejectCredential")(function*(credential) {
            const digest = yield* digestCredential(credential)

            return yield* store.reject(
              { digest, now: yield* DateTime.now },
              (decision, journal) => journal.prepare(decision)
            )
          }),
          prepareComplete: Effect.fn("SessionStepUp.prepareComplete")(function*(input) {
            const additional = yield* snapshotAuthenticationEvidence(input.additional)
            const intent = yield* snapshotIntent(input.pending.intent)
            const requirement = yield* readRequirement(input.pending.requirement)
            const source = yield* snapshotSource(input.source)

            if (!matchSource(intent, source)) return yield* SessionStepUpInvalid.make({})
            const original = source.inspection.provenance.evidence

            const evidence = yield* snapshotAuthenticationEvidence(
              yield* combineAuthenticationEvidence(
                {
                  ...original,
                  flowId: intent.flowId,
                  bindingDigest: intent.bindingDigest
                },
                additional
              ).pipe(
                Effect.catchTag("PendingAuthenticationInvalid", () => Effect.fail(SessionStepUpInvalid.make({})))
              )
            )

            const now = yield* DateTime.now
            const base = yield* assess(evidence, requirement, now)
            const profile = yield* assess(evidence, intent.requirement, now)

            if (!base.satisfied || !profile.satisfied) return yield* SessionStepUpInvalid.make({})

            const generated = yield* planner.plan(
              source,
              evidence,
              AuthenticationAssurance.make({
                ...base.assurance,
                authenticatedAt: profile.assurance.authenticatedAt
              })
            )

            const replacement = Object.freeze({
              ...generated.replacement,
              inspection: yield* snapshotInspection(generated.replacement.inspection)
            })

            // Retain a separate private output graph: a consumer owner cannot alter
            // the credential's paired public value through its persistence plan.
            const output = yield* snapshotInspection(generated.replacement.inspection)
            const planned = { credential: generated.credential, replacement }

            if (planned.replacement._tag !== intent.sourceKind) {
              return yield* SessionStepUpInvalid.make({})
            }

            const event = yield* prepareHooks(
              "session-creation",
              planned.replacement.inspection.session
            ).pipe(Effect.provide(hooks))

            // The committing owner rechecks source, revisions and both policies
            // after hooks, against its final clock. Preserve this original snapshot.
            yield* validateSessionTimeline(planned.replacement.inspection.session, strategy.policy)

            if (
              DateTime.toEpochMillis(yield* DateTime.now) >=
                DateTime.toEpochMillis(intent.expiresAt)
            ) {
              return yield* SessionStepUpInvalid.make({})
            }

            const plan: SessionStepUpCompletionPlan<Claims["Type"]> = Object.freeze({
              intent,
              source,
              evidence,
              baseRequirement: requirement,
              profileRequirement: intent.requirement,
              now: freezeInstant(now),
              replacement: planned.replacement
            })

            return yield* store.complete(plan, (_, journal) => {
              const result = issue(output.session, planned.credential)

              journal.stage(event)

              return journal.prepare({
                ...result,
                credentialCommands: [
                  ...result.credentialCommands,
                  { _tag: "Clear" as const, slot: "session-step-up" as const }
                ]
              })
            })
          }, withClockPolicy)
        })
      })
    )
  }

  const { Begin: StepUpBegin, Complete: StepUpComplete, Reject: StepUpReject } = stepUpOperations

  const stepUpHandlersLayer = Layer.mergeAll(
    StepUpBegin.credentialHandlerLayer(
      Effect.fn("SessionStepUp.Begin")(function*(input, context) {
        yield* checkNoAmbientCommit()
        const caller = yield* requireAuthenticated(context)
        const source = yield* inspectInvocation(context, input.sourceCredential)

        if (
          caller.subjectId !== source.inspection.session.subjectId ||
          caller.sessionId !== source.inspection.session.sessionId
        ) {
          return yield* SessionStepUpInvalid.make({})
        }

        return yield* readCommitted(
          yield* (yield* SessionStepUp).prepareBegin({ source, profileId: input.profileId })
        )
      })
    ),
    StepUpComplete.credentialHandlerLayer(
      Effect.fn("SessionStepUp.Complete")(function*(input, context) {
        yield* checkNoAmbientCommit()
        const stepUp = yield* SessionStepUp
        const source = yield* inspectInvocation(context, input.sourceCredential)
        const pending = yield* stepUp.inspect(input.stepUpCredential)

        return yield* readCommitted(
          yield* stepUp.prepareComplete({ source, pending, additional: input.additional })
        )
      })
    ),
    StepUpReject.handlerLayer(
      Effect.fn("SessionStepUp.Reject")(function*(input) {
        yield* checkNoAmbientCommit()

        return yield* readCommitted(
          yield* (yield* SessionStepUp).rejectCredential(input.stepUpCredential)
        )
      })
    )
  )

  const {
    Complete,
    CompletePending,
    RejectPending,
    Capabilities,
    Verify,
    Renew,
    SignOut,
    List,
    Revoke,
    RevokeAll
  } = operations

  const capabilitiesHandlerLayer = Capabilities.handlerLayer(
    Effect.fn("Session.Capabilities")(function*() {
      return (yield* SessionStrategy).capabilities
    })
  )

  /** Verification, renewal and sign-out need no authentication-completion authority. */
  const sessionHandlersLayer = Layer.mergeAll(
    Verify.handlerLayer(
      Effect.fn("Session.Verify")(function*(input) {
        return (yield* (yield* SessionStrategy).inspect(input.credential)).inspection.session
      })
    ),
    Renew.credentialHandlerLayer(
      Effect.fn("Session.Renew")(function*(input) {
        yield* checkNoAmbientCommit()

        return yield* (yield* SessionStrategy).renew(input.credential)
      })
    ),
    SignOut.credentialHandlerLayer(
      Effect.fn("Session.SignOut")(function*(input) {
        yield* checkNoAmbientCommit()

        return yield* (yield* SessionStrategy).signOut(input.credential)
      })
    )
  )

  const handlersLayer = (management: AssuranceRequirement) => {
    management = Object.freeze({
      ...management,
      ...(management.factors === undefined
        ? {}
        : { factors: Object.freeze([...management.factors]) })
    })

    return Layer.mergeAll(
      capabilitiesHandlerLayer,
      Complete.credentialHandlerLayer(
        Effect.fn("Session.Complete")(function*(input) {
          yield* checkNoAmbientCommit()

          return yield* readCommitted(yield* (yield* AuthenticationCompletion).prepare(input))
        })
      ),
      CompletePending.credentialHandlerLayer(
        Effect.fn("Session.CompletePending")(function*(input) {
          yield* checkNoAmbientCommit()

          const completion = yield* AuthenticationCompletion
          const pending = yield* completion.inspectPending(input.credential)

          return yield* readCommitted(
            yield* completion.preparePending({ pending, additional: input.additional })
          )
        })
      ),
      RejectPending.handlerLayer(
        Effect.fn("Session.RejectPending")(function*(input) {
          yield* checkNoAmbientCommit()

          return yield* readCommitted(
            yield* (yield* AuthenticationCompletion).rejectPendingCredential(input.credential)
          )
        })
      ),
      sessionHandlersLayer,
      List.handlerLayer(
        Effect.fn("Session.List")(function*(input, context) {
          const caller = yield* requireAuthenticated(context)
          const strategy = yield* SessionStrategy
          const session = (yield* inspectInvocation(context, input.credential)).inspection.session

          if (session.subjectId !== caller.subjectId) return yield* SessionInvalid.make({})

          return yield* strategy.list({
            ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
            limit: input.limit,
            subjectId: session.subjectId,
            now: yield* DateTime.now
          })
        })
      ),
      Revoke.handlerLayer(
        Effect.fn("Session.Revoke")(function*(input, context) {
          yield* checkNoAmbientCommit()
          const caller = yield* requireAssurance(context, management)
          const strategy = yield* SessionStrategy
          const session = (yield* inspectInvocation(context, input.credential)).inspection.session

          if (session.subjectId !== caller.subjectId) return yield* SessionInvalid.make({})

          return yield* strategy.revoke(session, input.sessionId)
        })
      ),
      RevokeAll.handlerLayer(
        Effect.fn("Session.RevokeAll")(function*(input, context) {
          yield* checkNoAmbientCommit()
          const caller = yield* requireAssurance(context, management)
          const strategy = yield* SessionStrategy
          const session = (yield* inspectInvocation(context, input.credential)).inspection.session

          if (session.subjectId !== caller.subjectId) return yield* SessionInvalid.make({})
          yield* strategy.revokeAll(session)

          return sessionInvalidationWindow(
            "all-session-revocation",
            strategy.capabilities,
            strategy.policy
          )
        })
      )
    )
  }

  return Object.freeze({
    moduleId,
    claims,
    /** Stateful sessions and authentication completion with application crypto and default hooks. */
    layer: (policy: SessionPolicy) =>
      completionLayer().pipe(Layer.provideMerge(statefulLayer(policy)), Layer.provide(hooksLayer)),
    Session,
    CompletionResult,
    SessionStrategy,
    inspectInvocation,
    capturedSession,
    SessionStepUp,
    SessionStepUpPersistence,
    stepUpLayer,
    stepUpHandlersLayer,
    stepUpOperations,
    stepUpGroup,
    AuthenticationCompletion,
    StatefulSessionPersistence,
    SessionRepository,
    SessionCleanup,
    cleanup: Effect.fn("Sessions.cleanup")(function*(input: { readonly limit: CleanupLimit }) {
      yield* checkNoAmbientCommit()

      const limit = yield* Schema.decodeEffect(CleanupLimit)(input.limit).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )

      const maintenance = yield* Effect.serviceOption(SessionCleanup)

      if (Option.isNone(maintenance)) return yield* unsupported("session-cleanup")

      return yield* maintenance.value.cleanup({ limit })
    }),
    SignedSessionValidity,
    PendingAuthentication,
    statefulLayer,
    statelessLayer,
    stateAssistedLayer,
    completionLayer,
    capabilitiesHandlerLayer,
    sessionHandlersLayer,
    handlersLayer,
    operations,
    group
  })
}
