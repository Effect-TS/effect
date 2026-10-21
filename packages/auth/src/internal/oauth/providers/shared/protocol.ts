import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Pkce from "../../../../oauth/Pkce.ts"
import { RequestBindingFlowId } from "../../../operations/requestBindingModels.ts"
import { reportAuthDiagnostic, withoutObservability } from "../../../shared/diagnostics.ts"
import { makeScopedOperation } from "../../../shared/scopedOperation.ts"
import { timeoutOrElseWithCause } from "../../../shared/timeout.ts"
import { selectCallback } from "../../callback.ts"
import { OAuthProtocol } from "../../oauthProtocol.ts"
import { OAuthProviderKey } from "../../schema.ts"
import { OAuthProtocolRejected, OAuthRejected, OAuthUnavailable } from "../../signInErrors.ts"
import {
  OAuthAuthorizationPrompt,
  OAuthCallbackId,
  OAuthCodeResponse,
  OAuthDisplayProfile,
  OAuthLoginHint,
  OAuthProtocolConfiguration,
  OAuthProtocolPreparation,
  OAuthTransactionSecrets,
  OAuthVerifiedExternalIdentity
} from "../../signInModels.ts"
import { makeOAuthSnapshot } from "../../signInSnapshot.ts"
import { tokenCompatibility } from "./compatibility.ts"
import type { InstalledConfiguration } from "./configuration.ts"
import { discoveryProfile } from "./discovery.ts"
import {
  type OpenIdConnectAuthentication,
  type OpenIdConnectConfigurationError,
  persistedResponseIssuerMode
} from "./models.ts"
import { PrivateKeyClientSecret } from "./privateKeyJwt.ts"
import { decodeOidcProfile, mergeAppleCallbackUser } from "./profile.ts"
import { tokens } from "./receipt.ts"
import { subjectInTenant } from "./tenantSubject.ts"

const beginInput = Schema.Struct({
  provider: OAuthProviderKey,
  callbackId: Schema.optionalKey(OAuthCallbackId),
  flowId: RequestBindingFlowId,
  prompt: Schema.optionalKey(OAuthAuthorizationPrompt),
  loginHint: Schema.optionalKey(OAuthLoginHint)
})

const userInfoSubject = Schema.Struct({
  sub: Schema.NonEmptyString.check(Schema.isMaxLength(1024))
})

const exchangeInput = Schema.toType(
  Schema.Struct({
    configuration: OAuthProtocolConfiguration,
    response: OAuthCodeResponse,
    secrets: OAuthTransactionSecrets,
    verificationStartedAt: Schema.DateTimeUtcFromMillis
  })
)

const plainIdentitySchema = Schema.Struct({
  subject: OAuthVerifiedExternalIdentity.fields.identity.fields.subject,
  profile: Schema.optionalKey(OAuthDisplayProfile)
})

const unavailable = () => OAuthUnavailable.make({})
const rejected = () => OAuthProtocolRejected.make({})

/** @internal */
export const makeOpenIdConnectOAuthProtocol = Effect.fn("makeOpenIdConnectOAuthProtocol")(
  // Capture one provider table; each generation retains its own receipt rules.
  function*<R, Setup>(
    installation: Effect.Effect<
      InstalledConfiguration<R>,
      OpenIdConnectConfigurationError | OAuthUnavailable,
      Setup
    >
  ): Effect.fn.Return<
    OAuthProtocol["Service"],
    OpenIdConnectConfigurationError | OAuthUnavailable,
    R | Setup | SecureRandom.SecureRandom | Digest.Digest | PrivateKeyClientSecret | Scope.Scope
  > {
    const context = (yield* Effect.context<R>()).pipe(withoutObservability)
    const random = yield* SecureRandom.SecureRandom
    const digests = yield* Digest.Digest
    const clientSecrets = yield* PrivateKeyClientSecret
    // Own application decoding as well as the native client's individual requests.
    const run = yield* makeScopedOperation(unavailable)

    const requestSecret = (authentication: OpenIdConnectAuthentication) =>
      clientSecrets
        .mint(authentication)
        .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    // Setup shares the protocol's containment for supplied platform services.
    const { installed, timeoutSeconds } = yield* installation

    const prepareAuthorization: OAuthProtocol["Service"]["prepareAuthorization"] = Effect.fn(
      "OpenIdConnect.prepareAuthorization"
    )(function*(input) {
      const request = yield* Schema.decodeEffect(beginInput)(input).pipe(
        Effect.mapError(() => OAuthRejected.make({}))
      )

      const entry = installed.find(
        ({ provider }) => provider.issuance === "active" && provider.provider === request.provider
      )

      const provider = entry?.provider

      const callback = provider === undefined
        ? undefined
        : selectCallback(provider.provider, provider.callbacks, request.callbackId)

      if (entry === undefined || provider === undefined || callback === undefined) {
        return yield* OAuthRejected.make({})
      }

      const state = yield* Pkce.random().pipe(
        Effect.provideService(SecureRandom.SecureRandom, random),
        Effect.provideService(Digest.Digest, digests),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )

      const pkce = provider.pkceS256
        ? yield* Pkce.make().pipe(
          Effect.provideService(SecureRandom.SecureRandom, random),
          Effect.provideService(Digest.Digest, digests),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
        )
        : undefined

      const nonce = provider.protocol === "oidc"
        ? yield* Pkce.random().pipe(
          Effect.provideService(SecureRandom.SecureRandom, random),
          Effect.provideService(Digest.Digest, digests),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
        )
        : undefined

      const url = yield* entry.client
        .authorizationUrl({
          redirectUri: callback.redirectUri,
          scopes: provider.scopes,
          state,
          ...(pkce === undefined ? {} : { codeChallenge: pkce.challenge }),
          ...(nonce === undefined ? {} : { nonce }),
          ...(provider.authorizationParameters === undefined
            ? {}
            : { parameters: provider.authorizationParameters }),
          ...(provider.protocol === "oidc" && provider.maxAgeSeconds !== undefined
            ? { maxAgeSeconds: provider.maxAgeSeconds }
            : {}),
          ...(request.prompt === undefined ? {} : { prompt: request.prompt }),
          ...(request.loginHint === undefined ? {} : { loginHint: request.loginHint }),
          ...(provider.responseMode === undefined ? {} : { responseMode: provider.responseMode })
        })
        .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

      const responseIssuerMode = persistedResponseIssuerMode(
        provider.responseIssuerMode,
        entry.metadata.authorization_response_iss_parameter_supported
      )

      const result = {
        configuration: {
          provider: provider.provider,
          protocol: provider.protocol,
          configurationGeneration: provider.configurationGeneration,
          issuer: provider.issuer,
          responseIssuerMode,
          callbackId: callback.callbackId,
          redirectUri: callback.redirectUri
        },
        authorizationUrl: url,
        secrets: {
          namespace: "effect-auth/oauth-transaction-secrets/v1" as const,
          state,
          ...(pkce === undefined ? {} : { pkceVerifier: pkce.verifier }),
          ...(nonce === undefined ? {} : { oidcNonce: nonce })
        },
        ...(provider.responseMode === undefined ? {} : { responseMode: provider.responseMode })
      }

      return yield* snapshotOAuthProtocolPreparation.effect(result)
    })

    const exchangeVerifiedIdentity: OAuthProtocol["Service"]["exchangeVerifiedIdentity"] = Effect.fn(
      "OpenIdConnect.exchangeVerifiedIdentity"
    )(function*(input) {
      const request = yield* snapshotExchangeInput.effect(input)
      const saved = request.configuration

      const entry = installed.find(
        ({ provider }) =>
          provider.provider === saved.provider &&
          provider.configurationGeneration === saved.configurationGeneration
      )

      if (entry === undefined) return yield* unavailable()
      const provider = entry.provider

      const callback = provider.callbacks.find(
        (candidate) => candidate.callbackId === saved.callbackId
      )

      const responseIssuerMode = persistedResponseIssuerMode(
        provider.responseIssuerMode,
        entry.metadata.authorization_response_iss_parameter_supported
      )

      if (
        provider.protocol !== saved.protocol ||
        provider.issuer !== saved.issuer ||
        responseIssuerMode !== saved.responseIssuerMode ||
        callback?.redirectUri !== saved.redirectUri
      ) {
        return yield* unavailable()
      }
      if (
        (provider.protocol === "oidc") !== (request.secrets.oidcNonce !== undefined) ||
        provider.pkceS256 !== (request.secrets.pkceVerifier !== undefined) ||
        Redacted.value(request.response.state) !== Redacted.value(request.secrets.state) ||
        (responseIssuerMode === "required"
          ? request.response.issuer !== provider.issuer
          : request.response.issuer !== undefined)
      ) {
        return yield* rejected()
      }
      const startedAt = DateTime.toEpochMillis(request.verificationStartedAt)

      if (startedAt < 0 || startedAt > DateTime.toEpochMillis(yield* DateTime.now)) {
        return yield* rejected()
      }

      const clientSecret = yield* requestSecret(provider.authentication)

      const receipt = yield* entry.client
        .codeGrant({
          code: request.response.code,
          redirectUri: saved.redirectUri,
          ...(request.secrets.pkceVerifier === undefined
            ? {}
            : { pkceVerifier: request.secrets.pkceVerifier }),
          ...(provider.tokenParameters === undefined
            ? {}
            : { parameters: provider.tokenParameters }),
          ...(clientSecret === undefined ? {} : { clientSecret })
        })
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))),
          Effect.ensuring(
            Effect.sync(() => {
              if (clientSecret !== undefined) Redacted.wipeUnsafe(clientSecret)
            })
          )
        )

      const grant = yield* tokens(
        receipt,
        provider.protocol === "oauth" ? provider[tokenCompatibility] : undefined,
        {
          scopes: provider.scopes,
          refreshRequired: false,
          operation: "authorization_code"
        }
      )

      if (provider.protocol === "oidc") {
        if (entry.verifier === undefined || grant.idToken === undefined) {
          return yield* unavailable()
        }

        const verified = yield* entry.verifier
          .verify(grant.idToken, {
            verificationStartedAt: request.verificationStartedAt,
            nonce: request.secrets.oidcNonce!,
            ...(provider.maxAgeSeconds === undefined
              ? {}
              : { maxAgeSeconds: provider.maxAgeSeconds }),
            accessToken: grant.accessToken,
            code: request.response.code
          })
          .pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) => error._tag === "OAuthRejected" ? rejected() : unavailable())
              )
            )
          )

        const claims = provider.userInfo === "merge"
          ? yield* Effect.gen(function*() {
            const userInfo = yield* entry.client
              .fetchProfile(grant.accessToken)
              .pipe(
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
              )

            const subject = yield* Schema.decodeUnknownEffect(userInfoSubject)(userInfo).pipe(
              Effect.mapError(rejected)
            )

            if (subject.sub !== verified.subject) return yield* rejected()

            return { ...userInfo, ...Redacted.value(verified.claims) }
          })
          : Redacted.value(verified.claims)

        const profile = yield* decodeOidcProfile(
          provider[discoveryProfile] === "apple"
            ? yield* mergeAppleCallbackUser(claims, request.response.user)
            : claims,
          provider.profileSchema
        )

        const decodedSubject = provider.decodeSubject === undefined
          ? verified.subject
          : yield* provider.decodeSubject(Redacted.value(verified.claims))

        const subject = yield* subjectInTenant(
          provider.issuer,
          Redacted.value(verified.claims),
          decodedSubject
        )

        return yield* snapshotOAuthVerifiedExternalIdentity.effect({
          identity: {
            provider: provider.provider,
            issuer: provider.issuer,
            subject
          },
          ...(profile === undefined ? {} : { profile }),
          ...(verified.upstreamAuthenticatedAt === undefined
            ? {}
            : { upstreamAuthenticatedAt: verified.upstreamAuthenticatedAt })
        })
      }

      if (provider.protocol !== "oauth") return yield* unavailable()

      const body = provider.identitySource.from === "token"
        ? Redacted.value(receipt.body)
        : yield* entry.client
          .fetchProfile(grant.accessToken)
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
          )

      const decoded = yield* Effect.suspend(() => provider.identitySource.decodeIdentity(body)).pipe(
        Effect.provideContext(context),
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) => Schema.is(OAuthProtocolRejected)(error) ? rejected() : unavailable())
          )
        )
      )

      const enriched = entry.enrichIdentity === undefined
        ? decoded
        : yield* entry.enrichIdentity(decoded, grant.accessToken)

      const identity = yield* Schema.decodeEffect(plainIdentitySchema)(enriched).pipe(
        Effect.mapError(rejected)
      )

      return yield* snapshotOAuthVerifiedExternalIdentity.effect({
        identity: {
          provider: provider.provider,
          issuer: provider.issuer,
          subject: identity.subject
        },
        ...(identity.profile === undefined ? {} : { profile: identity.profile })
      })
    })

    return OAuthProtocol.of({
      prepareAuthorization: (input) => run(prepareAuthorization(input)),
      exchangeVerifiedIdentity: (input) =>
        run(
          exchangeVerifiedIdentity(input).pipe(
            timeoutOrElseWithCause({
              duration: timeoutSeconds * 1000,
              orElse: () => Effect.fail(unavailable())
            })
          )
        ).pipe(
          Effect.tapError((error) =>
            reportAuthDiagnostic(
              "oauth-exchange",
              error._tag === "OAuthProtocolRejected" ? "rejected" : "unavailable"
            )
          )
        )
    })
  }
)

const snapshotOAuthProtocolPreparation = makeOAuthSnapshot(OAuthProtocolPreparation)
const snapshotExchangeInput = makeOAuthSnapshot(exchangeInput)
const snapshotOAuthVerifiedExternalIdentity = makeOAuthSnapshot(OAuthVerifiedExternalIdentity)
