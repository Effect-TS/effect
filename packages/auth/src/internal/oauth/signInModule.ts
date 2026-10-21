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
import type * as Types from "effect/Types"

import { type SubjectId, TokenDigest } from "../../Schema.ts"
import { makeAuthStrategy } from "../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../auth/defaults.ts"
import { hasCommitScope, prepareCommit, type PreparedCommit } from "../hooks/commit.ts"
import { HookDenied } from "../hooks/models.ts"
import { IdentityConflict } from "../identity/models.ts"
import type { AuthInvocation } from "../operations/context.ts"
import { type AuthOperationResult, formPostBinding } from "../operations/credentials.ts"
import { InvalidOperationInput } from "../operations/errors.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { makeRequestBinding } from "../operations/requestBinding.ts"
import { AuthenticationFlowId } from "../sessions/models.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { reportAuthDiagnostic } from "../shared/diagnostics.ts"
import { timeoutWithCause } from "../shared/timeout.ts"
import { makeOAuthAccounts } from "./accounts.ts"
import type { OAuthAccountsPolicy } from "./accountsModels.ts"
import { makeOAuthConnected } from "./connected.ts"
import type { OAuthConnectedGrantResponse, OAuthConnectedPolicy, OAuthConnectedProfile } from "./connectedModels.ts"
import { completionResult } from "./contracts.ts"
import { wipeConnectedMaterial } from "./grantTokens.ts"
import { OAuthProtocol } from "./oauthProtocol.ts"
import { OAuthRegistrationIntents, OAuthRegistrationIssueDecision } from "./oauthRegistrationIntents.ts"
import { OAuthReturnTargets } from "./oauthReturnTargets.ts"
import { OAuthSignInPersistence } from "./oauthSignInPersistence.ts"
import { OAuthTransactionProtector } from "./oauthTransactionProtector.ts"
import {
  claimsIdentitySchema,
  type OAuthClaimsIdentity,
  type OAuthProviderProfiles,
  type ProfileOptions
} from "./profiles.ts"
import { makeOAuthRegistration } from "./registration.ts"
import {
  OAuthRegistrationAuthentication,
  OAuthRegistrationIntent,
  OAuthRegistrationPolicy
} from "./registrationModels.ts"
import * as RegistrationSecrets from "./registrationSecrets.ts"
import { signInAccess } from "./signInAccess.ts"
import { OAuthConfigurationError, OAuthMethodUnsupported, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import {
  OAuthCallbackResponse,
  OAuthConsumeDecision,
  OAuthCredentialSnapshot,
  OAuthIssueDecision,
  OAuthModuleId,
  OAuthProtocolConfiguration,
  OAuthProtocolPreparation,
  OAuthReturnTarget,
  OAuthSealedTransaction,
  OAuthSignInAuthorization,
  OAuthSignInBegin,
  OAuthSignInComplete,
  OAuthSignInFlow,
  OAuthSignInInput,
  OAuthSignInPolicy,
  OAuthSignInTransactionContext,
  OAuthTransactionSecrets,
  OAuthVerifiedExternalIdentity
} from "./signInModels.ts"
import { freezeOAuth, makeOAuthSnapshot } from "./signInSnapshot.ts"

const Failure = Schema.Union([OAuthRejected, OAuthUnavailable, OAuthMethodUnsupported, HookDenied])

type Failure = typeof Failure.Type

const noAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* OAuthMethodUnsupported.make({})
})

const read = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
  )

const encoder = new TextEncoder()

// The wait is bounded. Cancellation stays on this fiber and runs finalizers
// before returning. A timed-out owner may still have committed: its receipt is
// abandoned, never recovered.
const bounded = <A, E, R>(effect: Effect.Effect<A, E, R>, millis: number) =>
  effect.pipe(Effect.interruptible, timeoutWithCause(millis))

const flowJson = Schema.fromJsonString(OAuthSignInFlow)
const contextJson = Schema.fromJsonString(OAuthSignInTransactionContext)
const responseJson = Schema.fromJsonString(OAuthCallbackResponse)

const stateMessage = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/oauth-state/v1"),
    OAuthModuleId,
    OAuthSignInPolicy.fields.generation,
    OAuthSignInBegin.fields.provider,
    OAuthSignInBegin.fields.flowId,
    Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
  ])
)

export interface OAuthModule<Id extends string, Kind extends string, Claims> {
  readonly moduleId: Id
  readonly kind: Kind
  readonly claims: Types.Invariant<Claims>
}

/** Guest sign-in only. Durable flow/identity authority, configured protocol,
 * separate transaction encryption and request-binding signing are explicit Layers.
 * This installs no provider, database, registration or connected-token capability.
 */
export const makeOAuthMethod = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  Access extends OAuthConnectedProfile | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles
>(
  moduleId: Id,
  options: ProfileOptions<Profiles> & {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
    readonly access?: Access
  }
) => {
  const sessions = options.sessions
  const binding = makeRequestBinding(moduleId, "oauth-entry")
  const ClaimsIdentity = claimsIdentitySchema(options.profiles)

  /** Supply application session claims after provider verification and local account matching. */
  const SessionClaims = Context.Service<
    OAuthModule<Id, "claims", Claims["Type"]>,
    {
      readonly resolve: (
        input: OAuthClaimsIdentity<Profiles> & {
          readonly subjectId: SubjectId
          readonly credential: OAuthCredentialSnapshot
        }
      ) => Effect.Effect<Claims["Type"], OAuthUnavailable>
    }
  >(`@effect/auth/oauth/${moduleId.length}:${moduleId}/Claims`)

  const checkCredential = Effect.fnUntraced(function*(
    resolved: OAuthCredentialSnapshot,
    identity: OAuthVerifiedExternalIdentity
  ) {
    const credential = yield* snapshotOAuthCredentialSnapshot.effect(resolved)
    const expectedModule: string = moduleId

    if (
      credential.moduleId !== expectedModule ||
      credential.identity.provider !== identity.identity.provider ||
      credential.identity.issuer !== identity.identity.issuer ||
      credential.identity.subject !== identity.identity.subject ||
      new Set(credential.revision.credentials.map((item) => item.credentialId)).size !==
        credential.revision.credentials.length ||
      !credential.revision.credentials.some(
        (item) =>
          item.credentialId === credential.credentialId &&
          item.revision === credential.credentialRevision
      )
    ) {
      return yield* OAuthUnavailable.make({})
    }

    return credential
  })

  const makeAuthentication = Effect.gen(function*() {
    const { resolve: resolveClaims } = yield* SessionClaims
    const { prepare: completeAuthentication } = yield* sessions.AuthenticationCompletion
    const { digest } = yield* Digest.Digest

    return Effect.fn("OAuth.authenticate")(function*(input: {
      readonly context: OAuthSignInTransactionContext
      readonly identity: OAuthVerifiedExternalIdentity
      readonly credential: OAuthCredentialSnapshot
      readonly verifiedAtMillis: number
      readonly completionExpiresAtMillis?: number
    }) {
      const { context, identity, credential } = input

      yield* noAmbient()

      const encoded = yield* Schema.encodeEffect(contextJson)(context).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
      )

      const bindingDigest = TokenDigest.make(
        Base64Url.encode(
          yield* digest(Digest.sha256, encoder.encode(encoded)).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
          )
        )
      )

      // Validate the selected projection even for replacement protocol services.
      const claimsIdentity = yield* Schema.decodeEffect(ClaimsIdentity)({
        provider: identity.identity.provider,
        identity: yield* snapshotOAuthVerifiedExternalIdentity.effect(identity)
      }).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
      )

      freezeOAuth(claimsIdentity)

      const claims = yield* resolveClaims({
        subjectId: credential.revision.subjectId,
        credential: yield* snapshotOAuthCredentialSnapshot.effect(credential),
        ...claimsIdentity
      })

      return yield* completeAuthentication({
        claims,
        requirement: credential.requirement,
        evidence: {
          revision: credential.revision,
          flowId: AuthenticationFlowId.make(context.flowId),
          bindingDigest,
          ...(input.completionExpiresAtMillis === undefined
            ? {}
            : { completionExpiresAt: DateTime.makeUnsafe(input.completionExpiresAtMillis) }),
          proofs: [
            {
              method: context.protocol,
              credentialId: credential.credentialId,
              factors: ["possession"],
              userVerified: false,
              phishingResistant: false,
              verifiedAt: DateTime.makeUnsafe(input.verifiedAtMillis)
            }
          ]
        }
      }).pipe(
        Effect.tapError((error) =>
          reportAuthDiagnostic(
            "oauth-completion",
            error._tag === "SessionUnavailable"
              ? "unavailable"
              : error._tag === "StaleAuthentication"
              ? "authority-rejected"
              : "rejected"
          )
        ),
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) =>
              error._tag === "HookDenied"
                ? error
                : error._tag === "SessionUnavailable"
                ? OAuthUnavailable.make({})
                : OAuthRejected.make({}))
          )
        ),
        Effect.flatMap(read)
      )
    })
  })

  const completeRegistration = Effect.fn("OAuthRegistration.authenticate")(function*(
    raw: OAuthRegistrationAuthentication
  ) {
    const authentication = yield* snapshotOAuthRegistrationAuthentication.effect(raw)
    const { intent, revision } = authentication
    const now = DateTime.toEpochMillis(yield* DateTime.now)

    if (now >= intent.expiresAtMillis) return yield* OAuthRejected.make({})

    const identity = yield* snapshotOAuthVerifiedExternalIdentity.effect({
      identity: intent.identity,
      ...(intent.profile === undefined ? {} : { profile: intent.profile }),
      ...(intent.upstreamAuthenticatedAt === undefined
        ? {}
        : { upstreamAuthenticatedAt: intent.upstreamAuthenticatedAt })
    })

    const persistence = yield* OAuthSignInPersistence

    const resolved = yield* persistence.resolve({
      moduleId: intent.context.moduleId,
      identity: intent.identity
    })

    if (resolved === undefined) return yield* OAuthRejected.make({})
    const current = yield* checkCredential(resolved, identity)

    if (
      current.credentialId !== authentication.credentialId ||
      current.credentialRevision !== authentication.credentialRevision ||
      current.revision.subjectId !== revision.subjectId ||
      current.revision.securityRevision !== revision.securityRevision ||
      current.revision.credentials.length !== revision.credentials.length ||
      new Set(revision.credentials.map((item) => item.credentialId)).size !==
        revision.credentials.length ||
      !revision.credentials.every((item) =>
        current.revision.credentials.some(
          (expected) => expected.credentialId === item.credentialId && expected.revision === item.revision
        )
      )
    ) {
      return yield* OAuthRejected.make({})
    }
    const authenticate = yield* makeAuthentication

    return yield* authenticate({
      context: intent.context,
      identity,
      credential: yield* snapshotOAuthCredentialSnapshot.effect({ ...current, revision }),
      verifiedAtMillis: intent.verifiedAtMillis,
      completionExpiresAtMillis: intent.expiresAtMillis
    })
  })

  const CompletionResult = completionResult(sessions.CompletionResult)

  type CompletionResult = typeof CompletionResult.Type

  const SignIn = Context.Service<
    OAuthModule<Id, "sign-in", Claims["Type"]>,
    {
      readonly begin: (
        input: typeof OAuthSignInBegin.Type
      ) => Effect.Effect<AuthOperationResult<typeof OAuthSignInAuthorization.Type>, Failure>
      readonly complete: (
        input: typeof OAuthSignInComplete.Type
      ) => Effect.Effect<AuthOperationResult<CompletionResult>, Failure>
    }
  >(`@effect/auth/oauth/${moduleId.length}:${moduleId}/SignIn`)

  const makeSignInLayer = <R>(
    configuration: OAuthSignInPolicy,
    registrationSource: Effect.Effect<
      | {
        readonly issue: OAuthRegistrationIntents["Service"]["issue"]
        readonly policy: OAuthRegistrationPolicy
      }
      | undefined,
      OAuthConfigurationError,
      R
    >
  ) => {
    const captured = Result.getOrUndefined(snapshotOAuthSignInPolicy.result(configuration))

    return Layer.effect(
      SignIn,
      Effect.gen(function*() {
        const id = yield* Schema.decodeEffect(OAuthModuleId)(moduleId).pipe(
          Effect.mapError(() => OAuthConfigurationError.make({ reason: "module" }))
        )

        if (captured === undefined) {
          return yield* OAuthConfigurationError.make({ reason: "policy" })
        }
        const policy = captured
        const registration = yield* registrationSource
        const access = yield* signInAccess(moduleId, policy, options.access)
        const { issue: issueBinding, verify: verifyBinding } = yield* binding.RequestBinding
        const { prepareAuthorization, exchangeVerifiedIdentity } = yield* OAuthProtocol
        const { resolve: returnTarget } = yield* OAuthReturnTargets
        const { seal, open } = yield* OAuthTransactionProtector
        const { issue, consume, resolve } = yield* OAuthSignInPersistence
        const authenticate = yield* makeAuthentication
        const random = yield* SecureRandom.SecureRandom
        const digests = yield* Digest.Digest
        const { digest } = digests

        const hash = Effect.fnUntraced(function*(message: string) {
          const result = yield* digest(Digest.sha256, encoder.encode(message)).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
          )

          return TokenDigest.make(Base64Url.encode(result))
        })

        const stateDigest = Effect.fnUntraced(function*(
          flowId: typeof OAuthSignInBegin.Type.flowId,
          provider: typeof OAuthSignInBegin.Type.provider,
          state: Redacted.Redacted<string>
        ) {
          const raw = Redacted.value(state)

          if (!Schema.is(Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)))(raw)) {
            return yield* OAuthRejected.make({})
          }
          const bytes = Result.getOrUndefined(Base64Url.decode(raw))

          if (bytes === undefined || bytes.length !== 32 || Base64Url.encode(bytes) !== raw) {
            bytes?.fill(0)

            return yield* OAuthRejected.make({})
          }
          bytes.fill(0)

          const message = yield* Schema.encodeEffect(stateMessage)([
            "effect-auth/oauth-state/v1",
            id,
            policy.generation,
            provider,
            flowId,
            raw
          ]).pipe(Effect.mapError(() => OAuthUnavailable.make({})))

          return yield* hash(message)
        })

        const binderError = (error: { readonly _tag: string }) =>
          error._tag === "RequestBindingInvalid"
            ? OAuthRejected.make({})
            : OAuthUnavailable.make({})

        const begin = Effect.fn("OAuth.SignIn.begin")(function*(
          raw: typeof OAuthSignInBegin.Type
        ) {
          yield* noAmbient()
          const request = yield* snapshotOAuthSignInBegin.effect(raw)
          const target = yield* returnTarget(request.returnTarget)

          const canonicalTarget = yield* Schema.decodeEffect(OAuthReturnTarget)(target).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
          )

          const issuedBinding = yield* issueBinding(request.flowId).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, binderError)))
          )

          const original = issuedBinding.credentialCommands[0]

          if (
            issuedBinding.credentialCommands.length !== 1 ||
            original?._tag !== "Issue" ||
            original.slot !== "request-binding" ||
            issuedBinding.value.flowId !== request.flowId ||
            original.expiresAtMillis !== issuedBinding.value.expiresAtMillis
          ) {
            return yield* OAuthUnavailable.make({})
          }

          const command = Object.freeze({
            _tag: "Issue" as const,
            slot: "request-binding" as const,
            credential: Redacted.make(Redacted.value(original.credential)),
            expiresAtMillis: original.expiresAtMillis
          })

          const binder = Object.freeze({
            ...(yield* verifyBinding(
              request.flowId,
              Redacted.make(Redacted.value(command.credential))
            ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, binderError)))))
          })

          if (binder.expiresAtMillis !== command.expiresAtMillis) {
            return yield* OAuthUnavailable.make({})
          }

          const prepared = yield* (access?.prepare ?? prepareAuthorization)(
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
            (request.callbackId !== undefined &&
              prepared.configuration.callbackId !== request.callbackId) ||
            (prepared.configuration.protocol === "oidc") !==
              (prepared.secrets.oidcNonce !== undefined)
          ) {
            return yield* OAuthUnavailable.make({})
          }
          const now = DateTime.toEpochMillis(yield* DateTime.now)
          const expiresAtMillis = Math.min(now + policy.lifetimeMillis, binder.expiresAtMillis)

          if (expiresAtMillis <= now) return yield* OAuthRejected.make({})

          const context = yield* snapshotOAuthSignInTransactionContext.effect({
            namespace: "effect-auth/oauth-sign-in-context/v1",
            moduleId: id,
            generation: policy.generation,
            flowId: request.flowId,
            ...prepared.configuration,
            ...(access === undefined ? {} : { access: access.profile }),
            returnTarget: canonicalTarget,
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

          const sealed = yield* seal({
            context: yield* snapshotOAuthSignInTransactionContext.effect(context),
            secrets: yield* snapshotOAuthTransactionSecrets.effect(prepared.secrets)
          }).pipe(Effect.flatMap((value) => snapshotOAuthSealedTransaction.effect(value)))

          const flow = yield* snapshotOAuthSignInFlow.effect({
            context,
            sealed
          })

          const expected = Schema.encodeSync(flowJson)(flow)

          type Issuance =
            | { readonly _tag: "Rejected" }
            | {
              readonly _tag: "Issued"
              readonly result: AuthOperationResult<typeof OAuthSignInAuthorization.Type>
            }

          const receipt = yield* issue<Issuance>(
            yield* snapshotOAuthSignInFlow.effect(flow),
            prepareCommit<OAuthIssueDecision, Issuance, OAuthUnavailable>((decision, journal) =>
              Result.gen(function*() {
                const checked = snapshotOAuthIssueDecision.sync(decision)

                if (checked._tag === "Rejected") {
                  return journal.prepare({ _tag: "Rejected" as const })
                }
                if (Schema.encodeSync(flowJson)(checked.flow) !== expected) {
                  return yield* Result.fail(OAuthUnavailable.make({}))
                }

                return journal.prepare({
                  _tag: "Issued" as const,
                  result: Object.freeze({
                    value: Object.freeze({
                      flowId: request.flowId,
                      authorizationUrl: prepared.authorizationUrl,
                      expiresAtMillis
                    }),
                    credentialCommands: Object.freeze([
                      formPostBinding(command, prepared.responseMode)
                    ])
                  })
                })
              })
            )
          )

          const committed = yield* read(receipt)

          if (committed._tag === "Rejected") return yield* OAuthRejected.make({})

          return committed.result
        })

        const complete = Effect.fn("OAuth.SignIn.complete")(
          function*(raw: typeof OAuthSignInComplete.Type) {
            let privateGrant: OAuthConnectedGrantResponse | undefined
            let grantStartedAt: number | undefined

            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                if (privateGrant !== undefined) wipeConnectedMaterial(privateGrant.material)
              })
            )
            yield* noAmbient()
            const request = yield* snapshotOAuthSignInComplete.effect(raw)
            const response = request.response

            const serialized = yield* Schema.encodeEffect(responseJson)(response).pipe(
              Effect.mapError(() => OAuthRejected.make({}))
            )

            if (encoder.encode(serialized).length > 16384) return yield* OAuthRejected.make({})

            const binder = Object.freeze({
              ...(yield* verifyBinding(request.flowId, request.requestBinding).pipe(
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, binderError)))
              ))
            })

            const state = yield* stateDigest(request.flowId, request.provider, response.state)

            const decision = yield* consume(
              {
                moduleId: id,
                generation: policy.generation,
                flowId: request.flowId,
                provider: request.provider,
                callbackId: request.callbackId,
                stateDigest: state,
                requestBindingVerifier: binder.verifier,
                requestBindingExpiresAtMillis: binder.expiresAtMillis,
                ...(response.issuer === undefined ? {} : { responseIssuer: response.issuer })
              },
              (value, journal) => journal.prepare(snapshotOAuthConsumeDecision.sync(value))
            ).pipe(Effect.flatMap(read))

            if (decision._tag !== "Consumed") return yield* OAuthRejected.make({})
            const flow = yield* snapshotOAuthSignInFlow.effect(decision.flow)
            const context = flow.context

            if (
              context.moduleId !== id ||
              context.generation !== policy.generation ||
              context.flowId !== request.flowId ||
              context.provider !== request.provider ||
              context.callbackId !== request.callbackId ||
              context.stateDigest !== state ||
              context.requestBindingVerifier !== binder.verifier ||
              context.requestBindingExpiresAtMillis !== binder.expiresAtMillis ||
              context.expiresAtMillis > context.requestBindingExpiresAtMillis ||
              (context.responseIssuerMode === "required"
                ? response.issuer !== context.issuer
                : response.issuer !== undefined)
            ) {
              return yield* OAuthUnavailable.make({})
            }

            if (response._tag === "Error") {
              return {
                value: { _tag: "Cancelled" as const, returnTarget: context.returnTarget },
                credentialCommands: [{ _tag: "Clear" as const, slot: "request-binding" as const }]
              }
            }

            const start = yield* DateTime.now
            let verifiedAt = DateTime.toEpochMillis(start)

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

                const exchangeInput = {
                  configuration: yield* snapshotOAuthProtocolConfiguration.effect(context),
                  response,
                  secrets,
                  verificationStartedAt: start
                }

                if (access === undefined) {
                  if (context.access !== undefined) return yield* OAuthRejected.make({})

                  return yield* exchangeVerifiedIdentity(exchangeInput).pipe(
                    Effect.flatMap((value) => snapshotOAuthVerifiedExternalIdentity.effect(value))
                  )
                }
                grantStartedAt = DateTime.toEpochMillis(start)
                const exchanged = yield* access.exchange(flow, exchangeInput)

                privateGrant = exchanged.grant

                return exchanged.identity
              }),
              context.exchangeTimeoutMillis
            ).pipe(
              Effect.tapError((error) =>
                reportAuthDiagnostic(
                  "oauth-exchange",
                  error._tag === "TimeoutError"
                    ? "timeout"
                    : error._tag === "OAuthProtocolRejected" || error._tag === "OAuthRejected"
                    ? "rejected"
                    : "unavailable"
                )
              ),
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
            if (identity.upstreamAuthenticatedAt !== undefined) {
              verifiedAt = Math.min(
                verifiedAt,
                DateTime.toEpochMillis(identity.upstreamAuthenticatedAt)
              )
            }

            const resolved = yield* resolve({ moduleId: id, identity: identity.identity })

            if (resolved === undefined) {
              if (registration === undefined) return yield* OAuthRejected.make({})

              const prepared = yield* RegistrationSecrets.prepare(
                flow,
                identity,
                verifiedAt,
                registration.policy
              )

              if (prepared === undefined) return yield* OAuthRejected.make({})
              const intentCodec = Schema.fromJsonString(OAuthRegistrationIntent)
              const expected = Schema.encodeSync(intentCodec)(prepared.intent)

              const issued = yield* registration
                .issue(
                  { intent: prepared.intent },
                  prepareCommit((value, journal) =>
                    Result.gen(function*() {
                      const checked = snapshotOAuthRegistrationIssueDecision.sync(value)

                      if (
                        checked._tag === "RegistrationIssued" &&
                        Schema.encodeSync(intentCodec)(checked.intent) !== expected
                      ) {
                        return yield* Result.fail(OAuthUnavailable.make({}))
                      }

                      return journal.prepare(checked)
                    })
                  )
                )
                .pipe(Effect.flatMap(read))

              if (issued._tag !== "RegistrationIssued") return yield* OAuthRejected.make({})

              return {
                value: {
                  _tag: "RegistrationRequired" as const,
                  reference: issued.intent.reference,
                  expiresAtMillis: issued.intent.expiresAtMillis,
                  returnTarget: context.returnTarget
                },
                credentialCommands: [prepared.command]
              }
            }
            const credential = yield* checkCredential(resolved, identity)

            const connection = access === undefined
              ? undefined
              : yield* Effect.gen(function*() {
                if (privateGrant === undefined || grantStartedAt === undefined) {
                  return yield* OAuthUnavailable.make({})
                }

                return yield* access.retain(flow, credential, privateGrant, grantStartedAt)
              })

            const established = yield* authenticate({
              context,
              identity,
              credential,
              verifiedAtMillis: verifiedAt
            })

            return {
              value: {
                completion: established.value,
                returnTarget: context.returnTarget,
                ...(connection === undefined ? {} : { connection })
              },
              credentialCommands: [
                ...established.credentialCommands,
                { _tag: "Clear" as const, slot: "request-binding" as const }
              ]
            }
          },
          Effect.scoped,
          Effect.provideService(SecureRandom.SecureRandom, random),
          Effect.provideService(Digest.Digest, digests),
          Effect.tapError((error) =>
            reportAuthDiagnostic(
              "oauth-completion",
              error._tag === "OAuthUnavailable" ? "unavailable" : "rejected"
            )
          )
        )

        return SignIn.of({ begin, complete })
      })
    )
  }

  const signInLayer = (configuration: OAuthSignInPolicy) => makeSignInLayer(configuration, Effect.succeed(undefined))

  function registration<
    Registration extends Schema.Codec<unknown, unknown, unknown, unknown>,
    Authenticate extends boolean = false
  >(codec: Registration, configuration?: { readonly authenticate?: Authenticate }) {
    type Completion = Authenticate extends true ? typeof sessions.CompletionResult : Schema.Never
    const authenticate = configuration?.authenticate === true
    const completion = (authenticate ? sessions.CompletionResult : Schema.Never) as Completion

    const capability = makeOAuthRegistration(moduleId, codec, binding, {
      completion,
      authenticate
    })

    type Services =
      | typeof capability.Registrations.Identifier
      | typeof capability.RegistrationAuthority.Identifier
      | (Authenticate extends true ? Effect.Services<ReturnType<typeof completeRegistration>>
        : never)

    // The runtime opt-in selects the success schema and the handler's completion requirements.
    const handlersLayer = capability.operations.Complete.credentialHandlerLayer(
      Effect.fn("OAuthRegistration.Complete")(
        function*(input: typeof capability.CompleteInput.Type) {
          const plan = yield* (yield* capability.Registrations).planComplete(input)
          const receipt = yield* plan.commit
          const result = yield* read(receipt)

          if (result.value._tag === "Rejected") return yield* OAuthRejected.make({})
          if (result.value._tag === "Conflict") return yield* IdentityConflict.make({})

          if (result.authentication !== undefined) {
            if (!authenticate) return yield* OAuthUnavailable.make({})
            const authenticated = yield* completeRegistration(result.authentication)

            return {
              value: authenticated.value,
              credentialCommands: [
                ...authenticated.credentialCommands,
                ...result.credentialCommands
              ]
            }
          }

          return { value: result.value, credentialCommands: result.credentialCommands }
        },
        Effect.tapError((error) =>
          reportAuthDiagnostic(
            "oauth-registration",
            error._tag === "OAuthUnavailable" ? "unavailable" : "rejected"
          )
        )
      ) as Parameters<typeof capability.operations.Complete.credentialHandlerLayer<Services>>[0]
    )

    const registrationSignInLayer = (
      configuration: OAuthSignInPolicy,
      registrationConfiguration: OAuthRegistrationPolicy
    ) => {
      const captured = Result.getOrUndefined(
        snapshotOAuthRegistrationPolicy.result(registrationConfiguration)
      )

      return makeSignInLayer(
        configuration,
        Effect.gen(function*() {
          if (captured === undefined) {
            return yield* OAuthConfigurationError.make({ reason: "policy" })
          }
          const { issue } = yield* OAuthRegistrationIntents

          return { issue, policy: captured }
        })
      )
    }

    return Object.freeze({
      ...capability,
      handlersLayer,
      signInLayer: registrationSignInLayer,
      strategy: makeAuthStrategy(
        { register: capability.operations.Complete.invoke },
        handlersLayer.pipe(
          Layer.provide(defaultLayer(capability.Registrations, capability.layer)),
          Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
          Layer.provide(hooksLayer)
        )
      )
    })
  }

  const Begin = makeOperation(`${moduleId}/sign-in/begin`, {
    payload: OAuthSignInBegin,
    success: OAuthSignInAuthorization,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  const Complete = makeOperation(`${moduleId}/sign-in/complete`, {
    payload: OAuthSignInComplete,
    success: CompletionResult,
    error: Failure,
    access: "any",
    exposure: "public",
    replay: "single-use",
    credentials: true
  })

  /** Allocate once per execution, outside codecs and transport retries. The
   * underlying Begin operation keeps the explicit IDs used by persistence. */
  const signIn = Effect.fn("OAuth.signInRequest")(function*(
    invocation: AuthInvocation,
    raw: typeof OAuthSignInInput.Encoded
  ) {
    const input = yield* Schema.decodeEffect(OAuthSignInInput)(raw).pipe(
      Effect.mapError(() => InvalidOperationInput.make({}))
    )

    const random = yield* SecureRandom.SecureRandom

    const flowId = yield* random
      .uuidV4()
      .pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
      )

    return yield* Begin.invoke(invocation, { ...input, flowId })
  })

  const handlersLayer = Layer.mergeAll(
    Begin.credentialHandlerLayer(
      Effect.fn("OAuth.Begin")(function*(input) {
        return yield* (yield* SignIn).begin(input)
      })
    ),
    Complete.credentialHandlerLayer(
      Effect.fn("OAuth.Complete")(function*(input) {
        return yield* (yield* SignIn).complete(input)
      })
    )
  )

  const layer = (policy: OAuthSignInPolicy) =>
    handlersLayer.pipe(
      Layer.provide(defaultLayer(SignIn, signInLayer(policy))),
      Layer.provide(defaultLayer(binding.RequestBinding, binding.layer)),
      Layer.provide(hooksLayer)
    )

  const accounts = (policy: OAuthAccountsPolicy) => {
    const module = makeOAuthAccounts(moduleId, sessions, policy)

    return Object.freeze({
      ...module,
      strategy: makeAuthStrategy(
        {
          listLinkedAccounts: module.operations.List.invoke,
          linkAccount: module.operations.Link.Begin.invoke,
          completeAccountLink: module.operations.Link.Complete.invoke,
          unlinkAccount: module.operations.Unlink.invoke
        },
        module.handlersLayer.pipe(
          Layer.provide(defaultLayer(module.Accounts, module.layer)),
          Layer.provide(defaultLayer(module.binding.RequestBinding, module.binding.layer)),
          Layer.provide(hooksLayer)
        )
      )
    })
  }

  const connected = (policy: OAuthConnectedPolicy) => {
    const module = makeOAuthConnected(moduleId, policy)

    return Object.freeze({
      ...module,
      strategy: makeAuthStrategy(
        {
          connectAccount: module.operations.Begin.invoke,
          completeAccountConnection: module.operations.Complete.invoke,
          listAccountConnections: module.operations.List.invoke,
          disconnectAccount: module.operations.Disconnect.invoke
        },
        module.handlersLayer.pipe(
          Layer.provide(defaultLayer(module.Connected, module.layer)),
          Layer.provide(defaultLayer(module.binding.RequestBinding, module.binding.layer)),
          Layer.provide(hooksLayer)
        )
      )
    })
  }

  return Object.freeze({
    binding,
    SessionClaims,
    SignIn,
    signInLayer,
    layer,
    registration,
    accounts,
    connected,
    CompletionResult,
    signIn,
    operations: Object.freeze({ Begin, Complete }),
    handlersLayer,
    group: operationGroup(Begin, Complete)
  })
}

const snapshotOAuthCredentialSnapshot = makeOAuthSnapshot(OAuthCredentialSnapshot)
const snapshotOAuthVerifiedExternalIdentity = makeOAuthSnapshot(OAuthVerifiedExternalIdentity)
const snapshotOAuthRegistrationAuthentication = makeOAuthSnapshot(OAuthRegistrationAuthentication)
const snapshotOAuthSignInPolicy = makeOAuthSnapshot(OAuthSignInPolicy)
const snapshotOAuthSignInBegin = makeOAuthSnapshot(OAuthSignInBegin)
const snapshotOAuthProtocolPreparation = makeOAuthSnapshot(OAuthProtocolPreparation)
const snapshotOAuthSignInTransactionContext = makeOAuthSnapshot(OAuthSignInTransactionContext)
const snapshotOAuthTransactionSecrets = makeOAuthSnapshot(OAuthTransactionSecrets)
const snapshotOAuthSealedTransaction = makeOAuthSnapshot(OAuthSealedTransaction)
const snapshotOAuthSignInFlow = makeOAuthSnapshot(OAuthSignInFlow)
const snapshotOAuthIssueDecision = makeOAuthSnapshot(OAuthIssueDecision)
const snapshotOAuthSignInComplete = makeOAuthSnapshot(OAuthSignInComplete)
const snapshotOAuthConsumeDecision = makeOAuthSnapshot(OAuthConsumeDecision)
const snapshotOAuthProtocolConfiguration = makeOAuthSnapshot(OAuthProtocolConfiguration)
const snapshotOAuthRegistrationIssueDecision = makeOAuthSnapshot(OAuthRegistrationIssueDecision)
const snapshotOAuthRegistrationPolicy = makeOAuthSnapshot(OAuthRegistrationPolicy)
