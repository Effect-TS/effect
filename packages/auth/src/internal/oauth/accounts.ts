import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { hasCommitScope, prepareCommit, type PreparedCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { HookDenied, lifecycleEventEffect, LifecycleEventId, lifecycleSnapshotEffect } from "../hooks/models.ts"
import { IdentityConflict, LastSignInMethod } from "../identity/models.ts"
import { AuthenticationClock } from "../operations/clock.ts"
import { type AuthInvocation, requireAuthenticated } from "../operations/context.ts"
import { type AuthCredentialCommand, type AuthOperationResult, formPostBinding } from "../operations/credentials.ts"
import { AuthenticationRequired } from "../operations/errors.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { makeRequestBinding } from "../operations/requestBinding.ts"
import { CleanupResult } from "../persistence/cleanup.ts"
import { SessionInvalidationWindow, sessionInvalidationWindow } from "../sessions/invalidation.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { timeoutWithCause } from "../shared/timeout.ts"
import {
  OAuthAccountRevision,
  OAuthAccountsPolicy,
  OAuthActionAuthorization,
  OAuthActionChallenge,
  OAuthActionRequired,
  OAuthLinkAccess,
  OAuthLinkBegin,
  OAuthLinkComplete,
  OAuthLinkConsumeDecision,
  OAuthLinkDecision,
  OAuthLinkedAccount,
  OAuthLinkedAccountsList,
  OAuthLinkedAccountsListResult,
  OAuthLinkedAccountsRead,
  OAuthLinkFlow,
  OAuthLinkIntentContext,
  OAuthLinkIssueDecision,
  OAuthLinkResult,
  OAuthLinkTransactionContext,
  OAuthUnlink,
  OAuthUnlinkDecision,
  OAuthUnlinked
} from "./accountsModels.ts"
import { authorizeOAuthEvidence } from "./actionAuthorization.ts"
import { OAuthAccountsPersistence } from "./oauthAccountsPersistence.ts"
import { OAuthActionEvidence } from "./oauthActionEvidence.ts"
import { OAuthLinkTransactionProtector } from "./oauthLinkTransactionProtector.ts"
import { OAuthProtocol } from "./oauthProtocol.ts"
import { OAuthReturnTargets } from "./oauthReturnTargets.ts"
import { OAuthConfigurationError, OAuthMethodUnsupported, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import {
  OAuthCallbackResponse,
  OAuthCleanupInput,
  OAuthCredentialSnapshot,
  OAuthModuleId,
  OAuthProtocolConfiguration,
  OAuthProtocolPreparation,
  OAuthReturnTarget,
  OAuthSealedTransaction,
  OAuthSignInAuthorization,
  OAuthTransactionSecrets,
  OAuthVerifiedExternalIdentity
} from "./signInModels.ts"
import { makeOAuthSnapshot } from "./signInSnapshot.ts"

const Failure = Schema.Union([
  AuthenticationRequired,
  OAuthActionRequired,
  OAuthRejected,
  OAuthUnavailable,
  OAuthMethodUnsupported,
  IdentityConflict,
  LastSignInMethod,
  HookDenied
])

type Failure = typeof Failure.Type

const read = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
  )

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* OAuthMethodUnsupported.make({})
})

// Cancellation stays on this fiber and runs finalizers before returning.
// An owner that reached commit may still have committed; its receipt is discarded, never retried.
const bounded = <A, E, R>(effect: Effect.Effect<A, E, R>, millis: number) =>
  effect.pipe(Effect.interruptible, timeoutWithCause(millis))

const encoder = new TextEncoder()
const strings = Schema.fromJsonString(Schema.Array(Schema.String))
const intentJson = Schema.fromJsonString(OAuthLinkIntentContext)
const flowJson = Schema.fromJsonString(OAuthLinkFlow)
const credentialJson = Schema.fromJsonString(OAuthCredentialSnapshot)
const responseJson = Schema.fromJsonString(OAuthCallbackResponse)
const invalidationJson = Schema.fromJsonString(SessionInvalidationWindow)

const clearChanged: ReadonlyArray<AuthCredentialCommand> = Object.freeze([
  Object.freeze({ _tag: "Clear" as const, slot: "session" as const }),
  Object.freeze({ _tag: "Clear" as const, slot: "pending-proof" as const }),
  Object.freeze({ _tag: "Clear" as const, slot: "request-binding" as const })
])

const clearBinding: ReadonlyArray<AuthCredentialCommand> = Object.freeze([
  Object.freeze({ _tag: "Clear" as const, slot: "request-binding" as const })
])

export interface AccountsModule<Id extends string> {
  readonly moduleId: Id
  readonly kind: "oauth-accounts"
}

/**
 * Authenticated login inventory and account mutations; no Claims, registration, login completion
 * or connected-grant authority. Method eligibility and final action policy belong
 * to the same physical persistence authority as each mutation.
 *
 * @internal
 */
export const makeOAuthAccounts = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>,
  configuration: OAuthAccountsPolicy
) => {
  const binding = makeRequestBinding(moduleId, "oauth-link")

  const Accounts = Context.Service<
    AccountsModule<Id>,
    {
      readonly list: (
        invocation: AuthInvocation,
        input: OAuthLinkedAccountsList
      ) => Effect.Effect<
        OAuthLinkedAccountsListResult,
        AuthenticationRequired | OAuthUnavailable | OAuthMethodUnsupported
      >
      readonly begin: (
        invocation: AuthInvocation,
        input: typeof OAuthLinkBegin.Type
      ) => Effect.Effect<AuthOperationResult<typeof OAuthSignInAuthorization.Type>, Failure>
      readonly complete: (
        invocation: AuthInvocation,
        input: typeof OAuthLinkComplete.Type
      ) => Effect.Effect<AuthOperationResult<typeof OAuthLinkResult.Type>, Failure>
      readonly unlink: (
        invocation: AuthInvocation,
        input: typeof OAuthUnlink.Type
      ) => Effect.Effect<AuthOperationResult<typeof OAuthUnlinked.Type>, Failure>
      readonly cleanup: (limit: number) => Effect.Effect<CleanupResult, Failure>
    }
  >(`@effect/auth/oauth/${moduleId.length}:${moduleId}/Accounts`)

  const captured = Result.getOrUndefined(snapshotOAuthAccountsPolicy.result(configuration))

  const layer = Layer.effect(
    Accounts,
    Effect.gen(function*() {
      const id = yield* Schema.decodeEffect(OAuthModuleId)(moduleId).pipe(
        Effect.mapError(() => OAuthConfigurationError.make({ reason: "module" }))
      )

      if (captured === undefined) return yield* OAuthConfigurationError.make({ reason: "policy" })
      const policy = captured
      const { issue: issueBinding, verify: verifyBinding } = yield* binding.RequestBinding

      const {
        list: listRows,
        capture,
        issue,
        consume,
        link,
        readCredential,
        unlink,
        cleanup
      } = yield* OAuthAccountsPersistence

      const { verify: verifyAction } = yield* OAuthActionEvidence
      const { prepareAuthorization, exchangeVerifiedIdentity } = yield* OAuthProtocol
      const { resolve: resolveTarget } = yield* OAuthReturnTargets
      const { seal, open } = yield* OAuthLinkTransactionProtector
      const { before } = yield* LifecycleHooks
      const { randomBytes } = yield* SecureRandom.SecureRandom
      const { digest } = yield* Digest.Digest
      const strategy = yield* sessions.SessionStrategy
      const clockPolicy = yield* AuthenticationClock

      const invalidation = yield* snapshotSessionInvalidationWindow.effect(
        sessionInvalidationWindow("credential-change", strategy.capabilities, strategy.policy)
      )

      const expectedInvalidation = Schema.encodeSync(invalidationJson)(invalidation)

      const available = Effect.fnUntraced(function*(
        invocation: AuthInvocation
      ) {
        yield* noAmbient()
        const caller = yield* requireAuthenticated(invocation)

        return yield* snapshotOAuthLinkedAccountsRead_fields_invocation.effect(caller)
      })

      const hash = Effect.fnUntraced(function*(value: string) {
        const bytes = yield* digest(Digest.sha256, encoder.encode(value)).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

        return TokenDigest.make(Base64Url.encode(bytes))
      })

      const stateDigest = Effect.fnUntraced(function*(
        flowId: typeof OAuthLinkBegin.Type.flowId,
        provider: typeof OAuthLinkBegin.Type.provider,
        secret: Redacted.Redacted<string>
      ) {
        const raw = Redacted.value(secret)

        if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return yield* OAuthRejected.make({})
        const bytes = Result.getOrUndefined(Base64Url.decode(raw))

        if (bytes === undefined || bytes.length !== 32 || Base64Url.encode(bytes) !== raw) {
          bytes?.fill(0)

          return yield* OAuthRejected.make({})
        }
        bytes.fill(0)

        return yield* hash(
          Schema.encodeSync(strings)([
            "effect-auth/oauth-link-state/v1",
            id,
            String(policy.generation),
            provider,
            flowId,
            raw
          ])
        )
      })

      const challenge = Effect.fnUntraced(function*(
        action: typeof OAuthActionChallenge.Type.action,
        flowId: typeof OAuthActionChallenge.Type.flowId,
        revision: OAuthAccountRevision,
        intent: string
      ) {
        const intentDigest = yield* hash(intent)

        return yield* snapshotOAuthActionChallenge.effect({
          moduleId: id,
          action,
          flowId,
          revision,
          intentDigest,
          bindingDigest: yield* hash(
            Schema.encodeSync(strings)([
              "effect-auth/oauth-action/v1",
              id,
              action,
              flowId,
              intentDigest
            ])
          )
        })
      })

      const authorize = Effect.fn("OAuthAccounts.authorize")(function*(
        caller: OAuthLinkedAccountsRead["invocation"],
        expected: OAuthActionChallenge,
        proof: Redacted.Redacted<string> | undefined,
        maximumAgeMillis = policy.maximumEvidenceAgeMillis
      ) {
        const grant = yield* verifyAction({
          invocation: yield* snapshotOAuthLinkedAccountsRead_fields_invocation.effect(caller),
          challenge: yield* snapshotOAuthActionChallenge.effect(expected),
          ...(proof === undefined ? {} : { proof: Redacted.make(Redacted.value(proof)) })
        })

        const accepted = yield* authorizeOAuthEvidence(
          caller,
          expected,
          grant,
          Math.min(policy.maximumEvidenceAgeMillis, maximumAgeMillis)
        ).pipe(Effect.provideService(AuthenticationClock, clockPolicy))

        const authorization = yield* snapshotOAuthActionAuthorization.effect({
          challenge: expected,
          ...accepted
        })

        return authorization
      })

      const binderError = (error: { readonly _tag: string }) =>
        error._tag === "RequestBindingInvalid" ? OAuthRejected.make({}) : OAuthUnavailable.make({})

      const eventFor = Effect.fn("OAuthAccounts.event")(function*(
        action: "linking" | "credential-change",
        subjectId: OAuthAccountRevision["subjectId"]
      ) {
        const snapshot = yield* lifecycleSnapshotEffect({
          action,
          operation: `${moduleId}/accounts/${action === "linking" ? "link" : "unlink"}`,
          subjectId,
          method: "oauth",
          identifiers: []
        }).pipe(Effect.orDie)

        yield* before(snapshot)

        const bytes = yield* randomBytes(32).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

        const event = yield* lifecycleEventEffect({
          id: LifecycleEventId.make(Base64Url.encode(bytes)),
          occurredAtMillis: DateTime.toEpochMillis(yield* DateTime.now),
          snapshot
        }).pipe(Effect.orDie)

        bytes.fill(0)

        return event
      })

      const begin = Effect.fn("OAuthAccounts.begin")(function*(
        invocation: AuthInvocation,
        raw: typeof OAuthLinkBegin.Type
      ) {
        const caller = yield* available(invocation)
        const request = yield* snapshotOAuthLinkBegin.effect(raw)
        const found = yield* capture({ moduleId: id, subjectId: caller.subjectId })

        if (found === undefined) return yield* OAuthRejected.make({})
        const revision = yield* snapshotOAuthAccountRevision.effect(found)

        if (revision.subjectId !== caller.subjectId) return yield* OAuthUnavailable.make({})

        const target = yield* resolveTarget(request.returnTarget).pipe(
          Effect.flatMap((value) => snapshotOAuthReturnTarget.effect(value))
        )

        const issued = yield* issueBinding(request.flowId).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, binderError)))
        )

        const original = issued.credentialCommands[0]

        if (
          issued.credentialCommands.length !== 1 ||
          original?._tag !== "Issue" ||
          original.slot !== "request-binding" ||
          issued.value.flowId !== request.flowId ||
          original.expiresAtMillis !== issued.value.expiresAtMillis
        ) {
          return yield* OAuthUnavailable.make({})
        }

        const command = Object.freeze({
          _tag: "Issue" as const,
          slot: "request-binding" as const,
          credential: Redacted.make(Redacted.value(original.credential)),
          expiresAtMillis: original.expiresAtMillis
        })

        const binder = {
          ...(yield* verifyBinding(
            request.flowId,
            Redacted.make(Redacted.value(command.credential))
          ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, binderError)))))
        }

        if (binder.expiresAtMillis !== command.expiresAtMillis) {
          return yield* OAuthUnavailable.make({})
        }

        const prepared = yield* prepareAuthorization(
          Object.freeze({
            provider: request.provider,
            ...(request.callbackId === undefined ? {} : { callbackId: request.callbackId }),
            flowId: request.flowId,
            ...(request.prompt === undefined ? {} : { prompt: request.prompt }),
            ...(request.loginHint === undefined ? {} : { loginHint: request.loginHint })
          })
        ).pipe(Effect.flatMap((value) => snapshotOAuthProtocolPreparation.effect(value)))

        if (
          prepared.configuration.provider !== request.provider ||
          prepared.configuration.callbackId !== request.callbackId ||
          (prepared.configuration.protocol === "oidc") !==
            (prepared.secrets.oidcNonce !== undefined)
        ) {
          return yield* OAuthUnavailable.make({})
        }
        const now = DateTime.toEpochMillis(yield* DateTime.now)
        const expiresAtMillis = Math.min(now + policy.lifetimeMillis, binder.expiresAtMillis)

        if (expiresAtMillis <= now) return yield* OAuthRejected.make({})

        const intent = yield* snapshotOAuthLinkIntentContext.effect({
          ...prepared.configuration,
          ...(prepared.responseMode === undefined ? {} : { responseMode: prepared.responseMode }),
          namespace: "effect-auth/oauth-link-context/v1",
          moduleId: id,
          generation: policy.generation,
          flowId: request.flowId,
          revision,
          maximumEvidenceAgeMillis: policy.maximumEvidenceAgeMillis,
          returnTarget: target,
          stateDigest: yield* stateDigest(
            request.flowId,
            request.provider,
            prepared.secrets.state
          ).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
          ),
          requestBindingVerifier: binder.verifier,
          requestBindingExpiresAtMillis: binder.expiresAtMillis,
          issuedAtMillis: now,
          expiresAtMillis,
          exchangeTimeoutMillis: policy.exchangeTimeoutMillis
        })

        const authorization = yield* authorize(
          caller,
          yield* challenge(
            "link-begin",
            intent.flowId,
            revision,
            Schema.encodeSync(intentJson)(intent)
          ),
          request.actionProof
        )

        const context = yield* snapshotOAuthLinkTransactionContext.effect({
          ...intent,
          authorization
        })

        const sealed = yield* seal({
          context: yield* snapshotOAuthLinkTransactionContext.effect(context),
          secrets: yield* snapshotOAuthTransactionSecrets.effect(prepared.secrets)
        }).pipe(Effect.flatMap((value) => snapshotOAuthSealedTransaction.effect(value)))

        const flow = yield* snapshotOAuthLinkFlow.effect({
          context,
          sealed
        })

        const expected = Schema.encodeSync(flowJson)(flow)

        const receipt = yield* issue(
          yield* snapshotOAuthLinkFlow.effect(flow),
          prepareCommit((value, journal) =>
            Result.gen(function*() {
              const decision = snapshotOAuthLinkIssueDecision.sync(value)

              if (
                decision._tag === "Issued" &&
                Schema.encodeSync(flowJson)(decision.flow) !== expected
              ) {
                return yield* Result.fail(OAuthUnavailable.make({}))
              }

              return journal.prepare(decision._tag === "Issued")
            })
          )
        )

        if (!(yield* read(receipt))) return yield* OAuthRejected.make({})

        return {
          value: {
            flowId: request.flowId,
            authorizationUrl: prepared.authorizationUrl,
            expiresAtMillis
          },
          credentialCommands: [formPostBinding(command, prepared.responseMode)]
        }
      })

      const complete = Effect.fn("OAuthAccounts.complete")(function*(
        invocation: AuthInvocation,
        raw: typeof OAuthLinkComplete.Type
      ) {
        const authenticated = yield* available(invocation).pipe(
          Effect.catchTag("AuthenticationRequired", () => Effect.succeed(undefined))
        )

        const request = yield* snapshotOAuthLinkComplete.effect(raw)
        const response = request.response

        if (encoder.encode(Schema.encodeSync(responseJson)(response)).length > 16384) {
          return yield* OAuthRejected.make({})
        }

        const binder = {
          ...(yield* verifyBinding(request.flowId, request.requestBinding).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, binderError)))
          ))
        }

        const binding = {
          moduleId: id,
          generation: policy.generation,
          flowId: request.flowId,
          provider: request.provider,
          callbackId: request.callbackId,
          stateDigest: yield* stateDigest(request.flowId, request.provider, response.state),
          requestBindingVerifier: binder.verifier,
          requestBindingExpiresAtMillis: binder.expiresAtMillis,
          ...(response.issuer === undefined ? {} : { responseIssuer: response.issuer })
        }

        const access = yield* snapshotOAuthLinkAccess.effect(
          authenticated === undefined
            ? { ...binding, formPostSubject: true as const }
            : { ...binding, subjectId: authenticated.subjectId }
        )

        const consumed = yield* consume(
          access,
          (value, journal) => journal.prepare(snapshotOAuthLinkConsumeDecision.sync(value))
        ).pipe(Effect.flatMap(read))

        if (consumed._tag !== "Consumed") {
          if (authenticated === undefined) return yield* AuthenticationRequired.make({})

          return yield* OAuthRejected.make({})
        }
        const flow = yield* snapshotOAuthLinkFlow.effect(consumed.flow)
        const context = flow.context

        if (authenticated === undefined && context.responseMode !== "form_post") {
          return yield* AuthenticationRequired.make({})
        }

        const caller = authenticated ?? { subjectId: context.revision.subjectId }

        if (
          context.moduleId !== id ||
          context.generation !== policy.generation ||
          context.flowId !== request.flowId ||
          context.provider !== request.provider ||
          context.callbackId !== request.callbackId ||
          context.revision.subjectId !== caller.subjectId ||
          context.stateDigest !== access.stateDigest ||
          context.requestBindingVerifier !== binder.verifier ||
          context.requestBindingExpiresAtMillis !== binder.expiresAtMillis ||
          context.expiresAtMillis > binder.expiresAtMillis ||
          (context.responseIssuerMode === "required"
            ? response.issuer !== context.issuer
            : response.issuer !== undefined)
        ) {
          return yield* OAuthUnavailable.make({})
        }
        if (response._tag === "Error") {
          return {
            value: { _tag: "Cancelled" as const, returnTarget: context.returnTarget },
            credentialCommands: clearBinding
          }
        }
        if (DateTime.toEpochMillis(yield* DateTime.now) >= context.authorization.validUntilMillis) {
          return yield* OAuthActionRequired.make({})
        }

        const identity = yield* bounded(
          Effect.gen(function*() {
            const secrets = yield* open({ context, sealed: flow.sealed }).pipe(
              Effect.flatMap((value) => snapshotOAuthTransactionSecrets.effect(value))
            )

            if (
              (context.protocol === "oidc") !== (secrets.oidcNonce !== undefined) ||
              (yield* stateDigest(context.flowId, context.provider, secrets.state)) !==
                context.stateDigest ||
              Redacted.value(secrets.state) !== Redacted.value(response.state)
            ) {
              return yield* OAuthUnavailable.make({})
            }

            return yield* exchangeVerifiedIdentity({
              configuration: yield* snapshotOAuthProtocolConfiguration.effect(context),
              response,
              secrets,
              verificationStartedAt: yield* DateTime.now
            }).pipe(Effect.flatMap((value) => snapshotOAuthVerifiedExternalIdentity.effect(value)))
          }),
          context.exchangeTimeoutMillis
        ).pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) => error._tag === "TimeoutError" ? OAuthUnavailable.make({}) : error)
            )
          ),
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) => error._tag === "OAuthProtocolRejected" ? OAuthRejected.make({}) : error)
            )
          )
        )

        if (
          identity.identity.provider !== context.provider ||
          identity.identity.issuer !== context.issuer
        ) {
          return yield* OAuthRejected.make({})
        }
        const event = yield* eventFor("linking", caller.subjectId)

        const finished = yield* link(
          { flow, identity },
          prepareCommit((value, journal) =>
            Result.gen(function*() {
              const decision = snapshotOAuthLinkDecision.sync(value)

              if (decision._tag === "Linked") {
                const c = decision.credential

                if (
                  c.moduleId !== id ||
                  c.revision.subjectId !== caller.subjectId ||
                  c.identity.provider !== identity.identity.provider ||
                  c.identity.issuer !== identity.identity.issuer ||
                  c.identity.subject !== identity.identity.subject ||
                  c.revision.securityRevision !== context.revision.securityRevision ||
                  !c.revision.credentials.some(
                    (item) =>
                      item.credentialId === c.credentialId &&
                      item.revision === c.credentialRevision
                  ) ||
                  new Set(c.revision.credentials.map((item) => item.credentialId)).size !==
                    c.revision.credentials.length
                ) {
                  return yield* Result.fail(OAuthUnavailable.make({}))
                }
                if (decision.changed) journal.stage(event)
              }

              return journal.prepare(decision)
            })
          )
        ).pipe(Effect.flatMap(read))

        if (finished._tag === "Conflict") return yield* IdentityConflict.make({})
        if (finished._tag === "Rejected") return yield* OAuthRejected.make({})

        return {
          value: {
            _tag: "Linked" as const,
            changed: finished.changed,
            credentialId: finished.credential.credentialId,
            returnTarget: context.returnTarget
          },
          credentialCommands: clearBinding
        }
      })

      const remove = Effect.fn("OAuthAccounts.unlink")(function*(
        invocation: AuthInvocation,
        raw: typeof OAuthUnlink.Type
      ) {
        const caller = yield* available(invocation)
        const request = yield* snapshotOAuthUnlink.effect(raw)

        if (
          policy.requireImmediateInvalidation &&
          (invalidation.existingSessions !== "immediate" ||
            strategy.capabilities.positiveCacheMillis > 0)
        ) {
          return yield* OAuthMethodUnsupported.make({})
        }

        const found = yield* readCredential({
          moduleId: id,
          subjectId: caller.subjectId,
          credentialId: request.credentialId
        })

        if (found === undefined) return yield* OAuthRejected.make({})
        const credential = yield* snapshotOAuthCredentialSnapshot.effect(found)

        if (
          credential.moduleId !== id ||
          credential.credentialId !== request.credentialId ||
          credential.revision.subjectId !== caller.subjectId ||
          !credential.revision.credentials.some(
            (c) =>
              c.credentialId === credential.credentialId &&
              c.revision === credential.credentialRevision
          )
        ) {
          return yield* OAuthUnavailable.make({})
        }

        const authorization = yield* authorize(
          caller,
          yield* challenge(
            "unlink",
            OAuthActionChallenge.fields.flowId.make(request.commandId),
            credential.revision,
            Schema.encodeSync(credentialJson)(credential)
          ),
          request.actionProof
        )

        const event = yield* eventFor("credential-change", caller.subjectId)

        const receipt = yield* unlink(
          {
            credential: yield* snapshotOAuthCredentialSnapshot.effect(credential),
            authorization: yield* snapshotOAuthActionAuthorization.effect(authorization),
            invalidation: yield* snapshotSessionInvalidationWindow.effect(invalidation)
          },
          prepareCommit((value, journal) =>
            Result.gen(function*() {
              const decision = snapshotOAuthUnlinkDecision.sync(value)

              if (decision._tag === "Unlinked") {
                if (
                  decision.result.credentialId !== credential.credentialId ||
                  Schema.encodeSync(invalidationJson)(decision.result.invalidation) !==
                    expectedInvalidation
                ) {
                  return yield* Result.fail(OAuthUnavailable.make({}))
                }
                journal.stage(event)
              }

              return journal.prepare(decision)
            })
          )
        )

        const decision = yield* read(receipt)

        if (decision._tag === "Rejected") return yield* OAuthRejected.make({})
        if (decision._tag === "LastSignInMethod") return yield* LastSignInMethod.make({})

        return {
          value: decision.result,
          credentialCommands: clearChanged
        }
      })

      return Accounts.of({
        list: Effect.fn("OAuthAccounts.list")(function*(invocation, raw) {
          const caller = yield* available(invocation)
          const request = yield* snapshotOAuthLinkedAccountsList.effect(raw)

          const result = yield* listRows({ ...request, moduleId: id, invocation: caller }).pipe(
            Effect.flatMap((value) => snapshotOAuthLinkedAccountsListResult.effect(value))
          )

          if (
            result.items.length > request.limit ||
            new Set(result.items.map((item) => item.credentialId)).size !== result.items.length ||
            (result.cursor !== undefined && result.cursor === request.cursor)
          ) {
            return yield* OAuthUnavailable.make({})
          }

          // Explicit projection also excludes excess fields supplied by a replacement port.
          return {
            items: result.items.map(({ credentialId, provider, issuer, subject }) =>
              OAuthLinkedAccount.make({ credentialId, provider, issuer, subject })
            ),
            ...(result.cursor === undefined ? {} : { cursor: result.cursor })
          }
        }),
        begin,
        complete,
        unlink: remove,
        cleanup: Effect.fn("OAuthAccounts.cleanup")(function*(limit) {
          yield* noAmbient()

          const input = yield* snapshotOAuthCleanupInput.effect({
            moduleId: id,
            limit
          })

          const receipt = yield* cleanup(
            input,
            prepareCommit((value, journal) =>
              Result.gen(function*() {
                const result = snapshotCleanupResult.sync(value)

                if (result.removed > input.limit) {
                  return yield* Result.fail(OAuthUnavailable.make({}))
                }

                return journal.prepare(result)
              })
            )
          )

          return yield* read(receipt)
        })
      })
    })
  )

  const List = makeOperation(`${moduleId}/accounts/list`, {
    payload: OAuthLinkedAccountsList,
    success: OAuthLinkedAccountsListResult,
    error: Schema.Union([AuthenticationRequired, OAuthUnavailable, OAuthMethodUnsupported]),
    access: "authenticated",
    exposure: "public",
    replay: "read-only"
  })

  const Begin = makeOperation(`${moduleId}/accounts/link/begin`, {
    payload: OAuthLinkBegin,
    success: OAuthSignInAuthorization,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  // form_post completion carries the binding cookie. A guest reaches the handler,
  // which accepts only a form_post continuation whose sealed subject and binding
  // match. Begin, list, and unlink stay authenticated.
  const Complete = makeOperation(`${moduleId}/accounts/link/complete`, {
    payload: OAuthLinkComplete,
    success: OAuthLinkResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const Unlink = makeOperation(`${moduleId}/accounts/unlink`, {
    payload: OAuthUnlink,
    success: OAuthUnlinked,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const handlersLayer = Layer.mergeAll(
    List.handlerLayer(
      Effect.fn("OAuthAccounts.List")(function*(input, invocation) {
        return yield* (yield* Accounts).list(invocation, input)
      })
    ),
    Begin.credentialHandlerLayer(
      Effect.fn("OAuthAccounts.Link.Begin")(function*(input, invocation) {
        return yield* (yield* Accounts).begin(invocation, input)
      })
    ),
    Complete.credentialHandlerLayer(
      Effect.fn("OAuthAccounts.Link.Complete")(function*(input, invocation) {
        return yield* (yield* Accounts).complete(invocation, input)
      })
    ),
    Unlink.credentialHandlerLayer(
      Effect.fn("OAuthAccounts.Unlink")(function*(input, invocation) {
        return yield* (yield* Accounts).unlink(invocation, input)
      })
    )
  )

  return Object.freeze({
    Accounts,
    binding,
    layer,
    operations: Object.freeze({ List, Link: Object.freeze({ Begin, Complete }), Unlink }),
    handlersLayer,
    group: operationGroup(List, Begin, Complete, Unlink)
  })
}

const snapshotOAuthAccountsPolicy = makeOAuthSnapshot(OAuthAccountsPolicy)
const snapshotSessionInvalidationWindow = makeOAuthSnapshot(SessionInvalidationWindow)

const snapshotOAuthLinkedAccountsRead_fields_invocation = makeOAuthSnapshot(
  OAuthLinkedAccountsRead.fields.invocation
)

const snapshotOAuthActionChallenge = makeOAuthSnapshot(OAuthActionChallenge)
const snapshotOAuthActionAuthorization = makeOAuthSnapshot(OAuthActionAuthorization)
const snapshotOAuthLinkBegin = makeOAuthSnapshot(OAuthLinkBegin)
const snapshotOAuthAccountRevision = makeOAuthSnapshot(OAuthAccountRevision)
const snapshotOAuthReturnTarget = makeOAuthSnapshot(OAuthReturnTarget)
const snapshotOAuthProtocolPreparation = makeOAuthSnapshot(OAuthProtocolPreparation)
const snapshotOAuthLinkIntentContext = makeOAuthSnapshot(OAuthLinkIntentContext)
const snapshotOAuthLinkTransactionContext = makeOAuthSnapshot(OAuthLinkTransactionContext)
const snapshotOAuthTransactionSecrets = makeOAuthSnapshot(OAuthTransactionSecrets)
const snapshotOAuthSealedTransaction = makeOAuthSnapshot(OAuthSealedTransaction)
const snapshotOAuthLinkFlow = makeOAuthSnapshot(OAuthLinkFlow)
const snapshotOAuthLinkIssueDecision = makeOAuthSnapshot(OAuthLinkIssueDecision)
const snapshotOAuthLinkComplete = makeOAuthSnapshot(OAuthLinkComplete)
const snapshotOAuthLinkAccess = makeOAuthSnapshot(OAuthLinkAccess)
const snapshotOAuthLinkConsumeDecision = makeOAuthSnapshot(OAuthLinkConsumeDecision)
const snapshotOAuthProtocolConfiguration = makeOAuthSnapshot(OAuthProtocolConfiguration)
const snapshotOAuthVerifiedExternalIdentity = makeOAuthSnapshot(OAuthVerifiedExternalIdentity)
const snapshotOAuthLinkDecision = makeOAuthSnapshot(OAuthLinkDecision)
const snapshotOAuthUnlink = makeOAuthSnapshot(OAuthUnlink)
const snapshotOAuthCredentialSnapshot = makeOAuthSnapshot(OAuthCredentialSnapshot)
const snapshotOAuthUnlinkDecision = makeOAuthSnapshot(OAuthUnlinkDecision)
const snapshotOAuthLinkedAccountsList = makeOAuthSnapshot(OAuthLinkedAccountsList)
const snapshotOAuthLinkedAccountsListResult = makeOAuthSnapshot(OAuthLinkedAccountsListResult)
const snapshotOAuthCleanupInput = makeOAuthSnapshot(OAuthCleanupInput)
const snapshotCleanupResult = makeOAuthSnapshot(CleanupResult)
