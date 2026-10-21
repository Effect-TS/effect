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
import { prepareCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { HookDenied, lifecycleEventEffect, LifecycleEventId, lifecycleSnapshotEffect } from "../hooks/models.ts"
import { IdentityConflict } from "../identity/models.ts"
import { AuthenticationClock } from "../operations/clock.ts"
import type { AuthInvocation } from "../operations/context.ts"
import { type AuthCredentialCommand, type AuthOperationResult, formPostBinding } from "../operations/credentials.ts"
import { AuthenticationRequired } from "../operations/errors.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { makeRequestBinding } from "../operations/requestBinding.ts"
import { SecurityRevision } from "../sessions/models.ts"
import { OAuthAccountRevision } from "./accountsModels.ts"
import { authorizeOAuthEvidence } from "./actionAuthorization.ts"
import {
  captureConnectedPolicy,
  connectedBounded,
  connectedCaller,
  connectedGrantResponse,
  connectedProfile,
  connectedRead,
  connectedSame,
  connectedUseAuthorization,
  makeOAuthConnectedAccess,
  validateConnectedPolicy
} from "./connectedAccess.ts"
import { makeOAuthConnectedMaintenance } from "./connectedMaintenance.ts"
import * as ConnectedModels from "./connectedModels.ts"
import { wipeConnectedMaterial } from "./grantTokens.ts"
import { OAuthConnectedActionEvidence } from "./oauthConnectedActionEvidence.ts"
import { OAuthConnectedPersistence } from "./oauthConnectedPersistence.ts"
import { OAuthConnectedProtocol } from "./oauthConnectedProtocol.ts"
import { OAuthConnectedTokenProtector } from "./oauthConnectedTokenProtector.ts"
import { OAuthConnectedTransactionProtector } from "./oauthConnectedTransactionProtector.ts"
import { OAuthConnectedUseAuthority } from "./oauthConnectedUseAuthority.ts"
import { OAuthReturnTargets } from "./oauthReturnTargets.ts"
import { OAuthMethodUnsupported, OAuthProtocolRejected, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import {
  OAuthAuthorizationUrl,
  OAuthCallbackResponse,
  OAuthClaimId,
  OAuthExternalIdentity,
  OAuthReturnTarget,
  OAuthSealedTransaction,
  OAuthSignInAuthorization,
  OAuthTransactionSecrets
} from "./signInModels.ts"
import { makeOAuthSnapshot } from "./signInSnapshot.ts"

const Failure = Schema.Union([
  AuthenticationRequired,
  ConnectedModels.OAuthConnectedActionRequired,
  ConnectedModels.OAuthConnectedBusy,
  ConnectedModels.OAuthConnectedReauthorizationRequired,
  OAuthRejected,
  OAuthUnavailable,
  OAuthMethodUnsupported,
  IdentityConflict,
  HookDenied
])

type Failure = typeof Failure.Type

const capturedSchema = Schema.Struct({
  revision: OAuthAccountRevision,
  grant: Schema.optionalKey(ConnectedModels.OAuthConnectedGrantSnapshot)
})

const preparationSchema = Schema.Struct({
  configuration: ConnectedModels.OAuthConnectedConfiguration,
  authorizationUrl: OAuthAuthorizationUrl,
  secrets: OAuthTransactionSecrets,
  responseMode: Schema.optionalKey(Schema.Literals(["query", "form_post"]))
})

const encoder = new TextEncoder()
const strings = Schema.fromJsonString(Schema.Array(Schema.String))
const intentJson = Schema.fromJsonString(ConnectedModels.OAuthConnectedIntentContext)
const contextJson = Schema.fromJsonString(ConnectedModels.OAuthConnectedTransactionContext)

const clearBinding: ReadonlyArray<AuthCredentialCommand> = Object.freeze([
  Object.freeze({ _tag: "Clear", slot: "request-binding" })
])

export interface ConnectedModule<Id extends string> {
  readonly moduleId: Id
  readonly kind: "oauth-connected"
}

/** Opt-in API access. No login factor/session creation or token-bearing RPC. */
export const makeOAuthConnected = <const Id extends string>(
  moduleId: Id,
  configuration: ConnectedModels.OAuthConnectedPolicy
) => {
  const binding = makeRequestBinding(moduleId, "oauth-connected")

  const Connected = Context.Service<
    ConnectedModule<Id>,
    {
      readonly begin: (
        invocation: AuthInvocation,
        input: typeof ConnectedModels.OAuthConnectedBegin.Type
      ) => Effect.Effect<AuthOperationResult<typeof OAuthSignInAuthorization.Type>, Failure>
      readonly complete: (
        invocation: AuthInvocation,
        input: typeof ConnectedModels.OAuthConnectedComplete.Type
      ) => Effect.Effect<AuthOperationResult<typeof ConnectedModels.OAuthConnectedResult.Type>, Failure>
      readonly list: (
        invocation: AuthInvocation,
        input: typeof ConnectedModels.OAuthConnectedList.Type
      ) => Effect.Effect<typeof ConnectedModels.OAuthConnectedListResult.Type, Failure>
      readonly disconnect: (
        invocation: AuthInvocation,
        input: typeof ConnectedModels.OAuthConnectedDisconnect.Type
      ) => Effect.Effect<typeof ConnectedModels.OAuthConnectedDisconnected.Type, Failure>
    }
  >()("@effect/auth/oauth/" + moduleId.length + ":" + moduleId + "/Connected")

  const captured = captureConnectedPolicy(configuration)

  const layer = Layer.effect(
    Connected,
    Effect.gen(function*() {
      const { id, policy } = yield* validateConnectedPolicy(moduleId, captured)
      const clockPolicy = yield* AuthenticationClock
      const { issue: issueBinding, verify: verifyBinding } = yield* binding.RequestBinding

      const {
        read,
        issue,
        consume,
        settle,
        list: listRows,
        disconnect: disconnectRow
      } = yield* OAuthConnectedPersistence

      const { verify: verifyAction } = yield* OAuthConnectedActionEvidence
      const { authorize: authorizeUse } = yield* OAuthConnectedUseAuthority
      const { prepareAuthorization, exchangeGrant } = yield* OAuthConnectedProtocol
      const { seal: sealFlow, open: openFlow } = yield* OAuthConnectedTransactionProtector
      const { seal: sealTokens } = yield* OAuthConnectedTokenProtector
      const { resolve: resolveTarget } = yield* OAuthReturnTargets
      const { before } = yield* LifecycleHooks
      const { randomBytes } = yield* SecureRandom.SecureRandom
      const { digest } = yield* Digest.Digest

      const random = Effect.fnUntraced(function*() {
        const bytes = yield* randomBytes(32).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

        const value = OAuthClaimId.make(Base64Url.encode(bytes))

        bytes.fill(0)

        return value
      })

      const hash = Effect.fnUntraced(function*(value: string) {
        const bytes = yield* digest(Digest.sha256, encoder.encode(value)).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

        return TokenDigest.make(Base64Url.encode(bytes))
      })

      const stateDigest = Effect.fnUntraced(function*(
        flowId: typeof ConnectedModels.OAuthConnectedBegin.Type.flowId,
        provider: typeof ConnectedModels.OAuthConnectedTransactionContext.Type.provider,
        secret: Redacted.Redacted<string>
      ) {
        const raw = Redacted.value(secret)

        if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return yield* OAuthRejected.make({})
        const bytes = Result.getOrUndefined(Base64Url.decode(raw))

        if (!bytes || bytes.length !== 32 || Base64Url.encode(bytes) !== raw) {
          bytes?.fill(0)

          return yield* OAuthRejected.make({})
        }
        bytes.fill(0)

        return yield* hash(
          Schema.encodeSync(strings)([
            "effect-auth/oauth-connected-state/v1",
            id,
            String(policy.generation),
            provider,
            flowId,
            raw
          ])
        )
      })

      const challenge = Effect.fnUntraced(function*(
        action: ConnectedModels.OAuthConnectedActionChallenge["action"],
        flowId: ConnectedModels.OAuthConnectedActionChallenge["flowId"],
        revision: OAuthAccountRevision,
        intent: string
      ) {
        const intentDigest = yield* hash(intent)

        return yield* snapshotOAuthConnectedActionChallenge.effect({
          moduleId: id,
          action,
          flowId,
          revision,
          intentDigest,
          bindingDigest: yield* hash(
            Schema.encodeSync(strings)([
              "effect-auth/oauth-connected-action/v1",
              id,
              action,
              flowId,
              intentDigest
            ])
          )
        })
      })

      const authorize = Effect.fn("OAuthConnected.authorize")(function*(
        caller: Effect.Success<ReturnType<typeof connectedCaller>>,
        expected: ConnectedModels.OAuthConnectedActionChallenge,
        proof: Redacted.Redacted<string> | undefined,
        maximumAge = policy.maximumEvidenceAgeMillis
      ) {
        const granted = yield* verifyAction({
          invocation: { ...caller },
          challenge: yield* snapshotOAuthConnectedActionChallenge.effect(expected),
          ...(proof === undefined ? {} : { proof: Redacted.make(Redacted.value(proof)) })
        })

        const accepted = yield* authorizeOAuthEvidence(
          caller,
          expected,
          granted,
          Math.min(maximumAge, policy.maximumEvidenceAgeMillis)
        ).pipe(
          Effect.provideService(AuthenticationClock, clockPolicy),
          Effect.catchCause((cause) =>
            Effect.failCause(Cause.map(cause, () => ConnectedModels.OAuthConnectedActionRequired.make({})))
          )
        )

        const authorization = yield* snapshotOAuthConnectedActionAuthorization.effect({
          challenge: expected,
          ...accepted
        })

        return authorization
      })

      const binderError = (error: { readonly _tag: string }) =>
        error._tag === "RequestBindingInvalid" ? OAuthRejected.make({}) : OAuthUnavailable.make({})

      const eventFor = Effect.fn("OAuthConnected.event")(function*(
        operation: "connect" | "disconnect",
        subjectId: OAuthAccountRevision["subjectId"]
      ) {
        const snapshot = yield* lifecycleSnapshotEffect({
          action: "linking",
          operation: moduleId + "/connected/" + operation,
          subjectId,
          method: "oauth-connected",
          identifiers: []
        }).pipe(Effect.orDie)

        yield* before(snapshot)

        return yield* lifecycleEventEffect({
          id: LifecycleEventId.make(yield* random()),
          occurredAtMillis: DateTime.toEpochMillis(yield* DateTime.now),
          snapshot
        }).pipe(Effect.orDie)
      })

      const begin = Effect.fn("OAuthConnected.begin")(function*(
        invocation: AuthInvocation,
        raw: typeof ConnectedModels.OAuthConnectedBegin.Type
      ) {
        const caller = yield* connectedCaller(invocation)
        const request = yield* snapshotOAuthConnectedBegin.effect(raw)

        const found = yield* read({
          moduleId: id,
          subjectId: caller.subjectId,
          ...(request.intent._tag === "Reconnect"
            ? { selector: { _tag: "Grant" as const, grantId: request.intent.grantId } }
            : {})
        })

        if (!found) return yield* OAuthRejected.make({})
        const owned = yield* snapshotCapturedSchema.effect(found)

        if (
          owned.revision.subjectId !== caller.subjectId ||
          (request.intent._tag === "Reconnect" &&
            (!owned.grant || owned.grant.context.grantId !== request.intent.grantId))
        ) {
          return yield* OAuthUnavailable.make({})
        }

        const profile = policy.profiles.find(
          (value) => value.key === request.intent.profileKey && value.issuance === "active"
        )

        const provider = request.intent._tag === "Connect"
          ? request.intent.provider
          : owned.grant!.context.identity.provider

        if (
          !profile ||
          profile.provider !== provider ||
          (request.intent._tag === "Reconnect" &&
            profile.clientRegistrationId !==
              owned.grant!.context.configuration.profile.clientRegistrationId)
        ) {
          return yield* OAuthRejected.make({})
        }

        const returnTarget = yield* resolveTarget(request.returnTarget).pipe(
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

        const prepared = yield* prepareAuthorization({
          profile: yield* snapshotOAuthConnectedProfile.effect(profile),
          callbackId: request.callbackId,
          flowId: request.flowId
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) => error._tag === "OAuthProtocolRejected" ? OAuthRejected.make({}) : error)
            )
          ),
          Effect.flatMap((value) => snapshotPreparationSchema.effect(value))
        )

        if (
          prepared.configuration.provider !== provider ||
          prepared.configuration.callbackId !== request.callbackId ||
          !connectedSame(ConnectedModels.OAuthConnectedProfile, prepared.configuration.profile, profile) ||
          (prepared.configuration.protocol === "oidc") !==
            (prepared.secrets.oidcNonce !== undefined) ||
          (request.intent._tag === "Reconnect" &&
            prepared.configuration.issuer !== owned.grant!.context.identity.issuer)
        ) {
          return yield* OAuthUnavailable.make({})
        }
        const now = DateTime.toEpochMillis(yield* DateTime.now)
        const expiresAtMillis = Math.min(now + policy.lifetimeMillis, binder.expiresAtMillis)

        if (expiresAtMillis <= now) return yield* OAuthRejected.make({})

        const intent = yield* snapshotOAuthConnectedIntentContext.effect({
          ...prepared.configuration,
          ...(prepared.responseMode === undefined ? {} : { responseMode: prepared.responseMode }),
          namespace: "effect-auth/oauth-connected-context/v1",
          moduleId: id,
          generation: policy.generation,
          flowId: request.flowId,
          revision: owned.revision,
          grantId: request.intent._tag === "Reconnect"
            ? request.intent.grantId
            : ConnectedModels.OAuthGrantId.make(yield* random()),
          ...(request.intent._tag === "Reconnect"
            ? { reconnect: yield* snapshotOAuthConnectedTarget.effect(owned.grant!.context) }
            : {}),
          maximumEvidenceAgeMillis: policy.maximumEvidenceAgeMillis,
          authenticatedCaller: caller,
          returnTarget,
          stateDigest: yield* stateDigest(request.flowId, provider, prepared.secrets.state),
          requestBindingVerifier: binder.verifier,
          requestBindingExpiresAtMillis: binder.expiresAtMillis,
          issuedAtMillis: now,
          expiresAtMillis,
          exchangeTimeoutMillis: policy.exchangeTimeoutMillis
        })

        const authorization = yield* authorize(
          caller,
          yield* challenge(
            "connected-begin",
            intent.flowId,
            intent.revision,
            Schema.encodeSync(intentJson)(intent)
          ),
          request.actionProof
        )

        const context = yield* snapshotOAuthConnectedTransactionContext.effect({
          ...intent,
          authorization
        })

        const sealed = yield* sealFlow({
          context,
          secrets: yield* snapshotOAuthTransactionSecrets.effect(prepared.secrets)
        }).pipe(Effect.flatMap((value) => snapshotOAuthSealedTransaction.effect(value)))

        const flow = yield* snapshotOAuthConnectedFlow.effect({
          context,
          sealed
        })

        const receipt = yield* issue(
          yield* snapshotOAuthConnectedFlow.effect(flow),
          prepareCommit((value, journal) =>
            Result.gen(function*() {
              const decision = snapshotOAuthConnectedIssueDecision.sync(value)

              if (
                decision._tag === "Issued" &&
                !connectedSame(ConnectedModels.OAuthConnectedFlow, decision.flow, flow)
              ) {
                return yield* Result.fail(OAuthUnavailable.make({}))
              }

              return journal.prepare(decision._tag === "Issued")
            })
          )
        )

        if (!(yield* connectedRead(receipt))) return yield* OAuthRejected.make({})

        return {
          value: {
            flowId: request.flowId,
            authorizationUrl: prepared.authorizationUrl,
            expiresAtMillis
          },
          credentialCommands: [formPostBinding(command, prepared.responseMode)]
        }
      })

      const consumeCallback = Effect.fn("OAuthConnected.consumeCallback")(function*(
        invocation: AuthInvocation,
        raw: typeof ConnectedModels.OAuthConnectedComplete.Type
      ) {
        const authenticated = yield* connectedCaller(invocation).pipe(
          Effect.catchTag("AuthenticationRequired", () => Effect.succeed(undefined))
        )

        const request = yield* snapshotOAuthConnectedComplete.effect(raw)
        const response = request.response

        if (
          encoder.encode(Schema.encodeSync(Schema.fromJsonString(OAuthCallbackResponse))(response))
            .length > 16384
        ) {
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

        const access = yield* snapshotOAuthConnectedAccess.effect(
          authenticated === undefined
            ? { ...binding, formPostSubject: true as const }
            : { ...binding, subjectId: authenticated.subjectId }
        )

        const consumed = yield* consume(
          access,
          (value, journal) => journal.prepare(snapshotOAuthConnectedConsumeDecision.sync(value))
        ).pipe(Effect.flatMap(connectedRead))

        if (consumed._tag !== "Consumed") {
          if (authenticated === undefined) return yield* AuthenticationRequired.make({})

          return yield* OAuthRejected.make({})
        }
        const flow = yield* snapshotOAuthConnectedFlow.effect(consumed.flow)
        const context = flow.context

        if (authenticated === undefined && context.responseMode !== "form_post") {
          return yield* AuthenticationRequired.make({})
        }

        const caller = authenticated ?? context.authenticatedCaller

        if (caller === undefined) return yield* AuthenticationRequired.make({})

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
          !connectedProfile(policy, context.profile) ||
          (context.responseIssuerMode === "required"
            ? response.issuer !== context.issuer
            : response.issuer !== undefined)
        ) {
          return yield* OAuthUnavailable.make({})
        }

        return { caller, request, flow, context, access }
      })

      const completeChallenge = (context: ConnectedModels.OAuthConnectedTransactionContext) =>
        challenge(
          "connected-complete",
          context.flowId,
          context.revision,
          Schema.encodeSync(contextJson)(context)
        )

      const complete = Effect.fn("OAuthConnected.complete")(function*(
        invocation: AuthInvocation,
        raw: typeof ConnectedModels.OAuthConnectedComplete.Type
      ) {
        const { caller, request, flow, context } = yield* consumeCallback(invocation, raw)
        const response = request.response

        if (response._tag === "Error") {
          return {
            value: { _tag: "Cancelled" as const, returnTarget: context.returnTarget },
            credentialCommands: clearBinding
          }
        }

        const authorization = yield* authorize(
          caller,
          yield* completeChallenge(context),
          request.actionProof,
          context.maximumEvidenceAgeMillis
        )

        const grant = yield* connectedBounded(
          Effect.gen(function*() {
            const secrets = yield* openFlow({ context, sealed: flow.sealed }).pipe(
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
            const start = DateTime.toEpochMillis(yield* DateTime.now)

            const protocolConfiguration = yield* snapshotOAuthConnectedConfiguration.effect(context)

            const rawGrant = yield* exchangeGrant({
              configuration: protocolConfiguration,
              secrets,
              response,
              verificationStartedAt: DateTime.makeUnsafe(start)
            })

            const projected = yield* connectedGrantResponse(protocolConfiguration, rawGrant, start)

            return yield* Effect.gen(function*() {
              if (
                (context.reconnect &&
                  !connectedSame(
                    OAuthExternalIdentity,
                    context.reconnect.identity,
                    projected.identity
                  )) ||
                (projected.material.continuation._tag === "Oidc" &&
                  (!projected.material.continuation.nonce ||
                    !secrets.oidcNonce ||
                    Redacted.value(projected.material.continuation.nonce) !==
                      Redacted.value(secrets.oidcNonce)))
              ) {
                return yield* OAuthProtocolRejected.make({})
              }

              const tokenContext = yield* snapshotOAuthConnectedTokenContext.effect({
                namespace: "effect-auth/oauth-connected-token-context/v1",
                moduleId: id,
                subjectId: caller.subjectId,
                identity: projected.identity,
                configuration: protocolConfiguration,
                grantId: context.grantId,
                grantVersion: SecurityRevision.make(yield* random()),
                tokenVersion: SecurityRevision.make(yield* random()),
                metadata: projected.metadata
              })

              return yield* snapshotOAuthConnectedStoredGrant.effect({
                context: tokenContext,
                sealed: yield* sealTokens({ context: tokenContext, material: projected.material })
              })
            }).pipe(Effect.ensuring(Effect.sync(() => wipeConnectedMaterial(projected.material))))
          }),
          context.exchangeTimeoutMillis
        ).pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) =>
                error._tag === "TimeoutError"
                  ? OAuthUnavailable.make({})
                  : error._tag === "OAuthProtocolRejected"
                  ? OAuthRejected.make({})
                  : error)
            )
          )
        )

        const event = yield* eventFor("connect", caller.subjectId)

        const finished = yield* settle(
          { _tag: "Connect", flow, authorization, grant },
          prepareCommit((value, journal) =>
            Result.gen(function*() {
              const result = snapshotOAuthConnectedSettlementDecision.sync(value)

              if (result._tag === "Connected") {
                if (!connectedSame(ConnectedModels.OAuthConnectedStoredGrant, result.grant, grant)) {
                  return yield* Result.fail(OAuthUnavailable.make({}))
                }
                journal.stage(event)
              }

              return journal.prepare(result)
            })
          )
        ).pipe(Effect.flatMap(connectedRead))

        if (finished._tag === "Conflict") return yield* IdentityConflict.make({})
        if (finished._tag !== "Connected") return yield* OAuthRejected.make({})

        return {
          value: {
            _tag: "Connected" as const,
            grantId: context.grantId,
            profileKey: context.profile.key,
            status: "Active" as const,
            returnTarget: context.returnTarget
          },
          credentialCommands: clearBinding
        }
      })

      const list = Effect.fn("OAuthConnected.list")(function*(
        invocation: AuthInvocation,
        raw: typeof ConnectedModels.OAuthConnectedList.Type
      ) {
        const caller = yield* connectedCaller(invocation)
        const input = yield* snapshotOAuthConnectedList.effect(raw)

        const authorization = yield* connectedUseAuthorization(
          yield* authorizeUse({ invocation: caller, moduleId: id, purpose: "metadata" }),
          id,
          caller.subjectId,
          "metadata"
        )

        const result = yield* listRows({ authorization, ...input }).pipe(
          Effect.flatMap((value) => snapshotOAuthConnectedListResult.effect(value))
        )

        if (
          result.items.length > input.limit ||
          new Set(result.items.map((v) => v.grantId)).size !== result.items.length
        ) {
          return yield* OAuthUnavailable.make({})
        }

        return result
      })

      const disconnect = Effect.fn("OAuthConnected.disconnect")(function*(
        invocation: AuthInvocation,
        raw: typeof ConnectedModels.OAuthConnectedDisconnect.Type
      ) {
        const caller = yield* connectedCaller(invocation)
        const request = yield* snapshotOAuthConnectedDisconnect.effect(raw)

        const inspected = yield* read({
          moduleId: id,
          subjectId: caller.subjectId,
          selector: { _tag: "Grant", grantId: request.grantId }
        })

        if (inspected === undefined || inspected.grant === undefined) {
          return yield* OAuthRejected.make({})
        }
        const grant = yield* snapshotOAuthConnectedStoredGrant.effect(inspected.grant)
        const context = grant.context

        if (
          context.moduleId !== id ||
          context.subjectId !== caller.subjectId ||
          context.grantId !== request.grantId ||
          inspected.revision.subjectId !== caller.subjectId
        ) {
          return yield* OAuthUnavailable.make({})
        }

        const authorization = yield* authorize(
          caller,
          yield* challenge(
            "connected-disconnect",
            ConnectedModels.OAuthConnectedActionChallenge.fields.flowId.make(request.commandId),
            inspected.revision,
            Schema.encodeSync(Schema.fromJsonString(ConnectedModels.OAuthConnectedDisconnectIntent))({
              key: { moduleId: id, subjectId: caller.subjectId, grantId: request.grantId },
              grantVersion: context.grantVersion
            })
          ),
          request.actionProof
        )

        const event = yield* eventFor("disconnect", caller.subjectId)

        const result = yield* disconnectRow(
          {
            key: { moduleId: id, subjectId: caller.subjectId, grantId: request.grantId },
            grantVersion: context.grantVersion,
            authorization
          },
          prepareCommit((value, journal) =>
            Result.gen(function*() {
              const decision = snapshotOAuthConnectedDisconnectDecision.sync(value)

              if (decision._tag === "Disconnected") {
                if (
                  decision.grantId !== request.grantId ||
                  (context.configuration.profile.revocation === "unsupported" &&
                    decision.remoteRevocation !== "Unsupported")
                ) {
                  return yield* Result.fail(OAuthUnavailable.make({}))
                }
                journal.stage(event)
              }

              return journal.prepare(decision)
            })
          )
        ).pipe(Effect.flatMap(connectedRead))

        if (result._tag === "Rejected") return yield* OAuthRejected.make({})

        return result
      })

      return Connected.of({
        begin,
        complete,
        list,
        disconnect
      })
    })
  )

  const Begin = makeOperation(`${moduleId}/connected/begin`, {
    payload: ConnectedModels.OAuthConnectedBegin,
    success: OAuthSignInAuthorization,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  // form_post completion carries the binding cookie. A guest reaches the handler,
  // which accepts only a form_post continuation whose sealed caller and binding
  // match. Begin, list, and disconnect stay authenticated.
  const Complete = makeOperation(`${moduleId}/connected/complete`, {
    payload: ConnectedModels.OAuthConnectedComplete,
    success: ConnectedModels.OAuthConnectedResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  const List = makeOperation(`${moduleId}/connected/list`, {
    payload: ConnectedModels.OAuthConnectedList,
    success: ConnectedModels.OAuthConnectedListResult,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "read-only"
  })

  const Disconnect = makeOperation(`${moduleId}/connected/disconnect`, {
    payload: ConnectedModels.OAuthConnectedDisconnect,
    success: ConnectedModels.OAuthConnectedDisconnected,
    error: Failure,
    access: "authenticated",
    exposure: "public",
    replay: "single-use"
  })

  const handlersLayer = Layer.mergeAll(
    Begin.credentialHandlerLayer(
      Effect.fn("OAuthConnected.Begin")(function*(input, invocation) {
        return yield* (yield* Connected).begin(invocation, input)
      })
    ),
    Complete.credentialHandlerLayer(
      Effect.fn("OAuthConnected.Complete")(function*(input, invocation) {
        return yield* (yield* Connected).complete(invocation, input)
      })
    ),
    List.handlerLayer(
      Effect.fn("OAuthConnected.List")(function*(input, invocation) {
        return yield* (yield* Connected).list(invocation, input)
      })
    ),
    Disconnect.handlerLayer(
      Effect.fn("OAuthConnected.Disconnect")(function*(input, invocation) {
        return yield* (yield* Connected).disconnect(invocation, input)
      })
    )
  )

  return Object.freeze({
    Connected,
    binding,
    layer,
    operations: Object.freeze({ Begin, Complete, List, Disconnect }),
    handlersLayer,
    group: operationGroup(Begin, Complete, List, Disconnect),
    ...makeOAuthConnectedAccess(moduleId, configuration),
    ...makeOAuthConnectedMaintenance(moduleId, configuration)
  })
}

const snapshotOAuthConnectedActionChallenge = makeOAuthSnapshot(ConnectedModels.OAuthConnectedActionChallenge)

const snapshotOAuthConnectedActionAuthorization = makeOAuthSnapshot(
  ConnectedModels.OAuthConnectedActionAuthorization
)

const snapshotOAuthConnectedBegin = makeOAuthSnapshot(ConnectedModels.OAuthConnectedBegin)
const snapshotCapturedSchema = makeOAuthSnapshot(capturedSchema)
const snapshotOAuthReturnTarget = makeOAuthSnapshot(OAuthReturnTarget)
const snapshotOAuthConnectedProfile = makeOAuthSnapshot(ConnectedModels.OAuthConnectedProfile)
const snapshotPreparationSchema = makeOAuthSnapshot(preparationSchema)
const snapshotOAuthConnectedIntentContext = makeOAuthSnapshot(ConnectedModels.OAuthConnectedIntentContext)
const snapshotOAuthConnectedTarget = makeOAuthSnapshot(ConnectedModels.OAuthConnectedTarget)

const snapshotOAuthConnectedTransactionContext = makeOAuthSnapshot(
  ConnectedModels.OAuthConnectedTransactionContext
)

const snapshotOAuthTransactionSecrets = makeOAuthSnapshot(OAuthTransactionSecrets)
const snapshotOAuthSealedTransaction = makeOAuthSnapshot(OAuthSealedTransaction)
const snapshotOAuthConnectedFlow = makeOAuthSnapshot(ConnectedModels.OAuthConnectedFlow)
const snapshotOAuthConnectedIssueDecision = makeOAuthSnapshot(ConnectedModels.OAuthConnectedIssueDecision)
const snapshotOAuthConnectedComplete = makeOAuthSnapshot(ConnectedModels.OAuthConnectedComplete)
const snapshotOAuthConnectedAccess = makeOAuthSnapshot(ConnectedModels.OAuthConnectedAccess)
const snapshotOAuthConnectedConsumeDecision = makeOAuthSnapshot(ConnectedModels.OAuthConnectedConsumeDecision)
const snapshotOAuthConnectedConfiguration = makeOAuthSnapshot(ConnectedModels.OAuthConnectedConfiguration)
const snapshotOAuthConnectedTokenContext = makeOAuthSnapshot(ConnectedModels.OAuthConnectedTokenContext)
const snapshotOAuthConnectedStoredGrant = makeOAuthSnapshot(ConnectedModels.OAuthConnectedStoredGrant)

const snapshotOAuthConnectedSettlementDecision = makeOAuthSnapshot(
  ConnectedModels.OAuthConnectedSettlementDecision
)

const snapshotOAuthConnectedList = makeOAuthSnapshot(ConnectedModels.OAuthConnectedList)
const snapshotOAuthConnectedListResult = makeOAuthSnapshot(ConnectedModels.OAuthConnectedListResult)
const snapshotOAuthConnectedDisconnect = makeOAuthSnapshot(ConnectedModels.OAuthConnectedDisconnect)

const snapshotOAuthConnectedDisconnectDecision = makeOAuthSnapshot(
  ConnectedModels.OAuthConnectedDisconnectDecision
)
