import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import type * as OAuth from "../../../../../oauth/OAuth.ts"
import type * as Oidc from "../../../../../oauth/Oidc.ts"
import * as Pkce from "../../../../../oauth/Pkce.ts"
import { RequestBindingFlowId } from "../../../../operations/requestBindingModels.ts"
import { reportAuthDiagnostic, withoutObservability } from "../../../../shared/diagnostics.ts"
import { makeScopedOperation } from "../../../../shared/scopedOperation.ts"
import { timeoutOrElseWithCause } from "../../../../shared/timeout.ts"
import * as ConnectedModels from "../../../connectedModels.ts"
import { OAuthConnectedProtocol } from "../../../oauthConnectedProtocol.ts"
import { OAuthProtocolRejected, OAuthUnavailable } from "../../../signInErrors.ts"
import {
  OAuthAuthorizationPrompt,
  OAuthCallbackId,
  OAuthCodeResponse,
  OAuthDisplayProfile,
  OAuthExternalIdentity,
  OAuthInstant,
  OAuthLoginHint,
  OAuthProtocolPreparation,
  OAuthTransactionSecrets
} from "../../../signInModels.ts"
import { makeOAuthSnapshot } from "../../../signInSnapshot.ts"
import type { ConnectedCompatibility } from "../compatibility.ts"
import {
  type OpenIdConnectAuthentication,
  type OpenIdConnectConfigurationError,
  persistedResponseIssuerMode
} from "../models.ts"
import { PrivateKeyClientSecret } from "../privateKeyJwt.ts"
import { decodeOidcProfile } from "../profile.ts"
import { ProviderRevocation } from "../providerRevocation.ts"
import { tokens } from "../receipt.ts"
import { subjectInTenant } from "../tenantSubject.ts"
import {
  type InstalledConnectedConfiguration,
  type InstalledConnectedProvider,
  sameConnectedProfile
} from "./configuration.ts"

const unavailable = () => OAuthUnavailable.make({})
const rejected = () => OAuthProtocolRejected.make({})

const prepareInput = Schema.Struct({
  profile: ConnectedModels.OAuthConnectedProfile,
  callbackId: OAuthCallbackId,
  flowId: RequestBindingFlowId,
  prompt: Schema.optionalKey(OAuthAuthorizationPrompt),
  loginHint: Schema.optionalKey(OAuthLoginHint)
})

const tokenIssuer = Schema.Struct({
  iss: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048))
})

const userInfoSubject = Schema.Struct({
  sub: Schema.NonEmptyString.check(Schema.isMaxLength(1024))
})

const prepareOutput = Schema.Struct({
  ...OAuthProtocolPreparation.fields,
  configuration: ConnectedModels.OAuthConnectedConfiguration
})

const exchangeInput = Schema.toType(
  Schema.Struct({
    configuration: ConnectedModels.OAuthConnectedConfiguration,
    secrets: OAuthTransactionSecrets,
    response: OAuthCodeResponse,
    verificationStartedAt: Schema.DateTimeUtcFromMillis
  })
)

const refreshInput = Schema.toType(
  Schema.Struct({
    context: ConnectedModels.OAuthConnectedTokenContext,
    material: ConnectedModels.OAuthConnectedTokenMaterial,
    verificationStartedAt: Schema.DateTimeUtcFromMillis
  })
)

const revokeInput = Schema.Struct({
  context: ConnectedModels.OAuthConnectedTokenContext,
  material: ConnectedModels.OAuthConnectedTokenMaterial
})

const identitySchema = Schema.Struct({
  subject: OAuthExternalIdentity.fields.subject,
  profile: Schema.optionalKey(OAuthDisplayProfile)
})

const rawMetadataSchema = Schema.Struct({
  expires_in: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThan(0))),
  scope: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(16447)))
})

const rawRefreshExpiry = Schema.UndefinedOr(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)))

interface GrantMetadata {
  readonly expiresIn?: number
  readonly scope?: string
  readonly refreshExpiresIn?: number
}

const receiptMetadata = Effect.fnUntraced(function*<R>(
  entry: InstalledConnectedProvider<R>,
  receipt: OAuth.TokenReceipt
): Effect.fn.Return<GrantMetadata, Schema.SchemaError> {
  const body = Redacted.value(receipt.body)

  const decoded = yield* Schema.decodeEffect(rawMetadataSchema)(body)

  let refreshExpiresIn: number | undefined

  if (entry.provider.refreshExpiry !== "unreported") {
    refreshExpiresIn = yield* Schema.decodeUnknownEffect(rawRefreshExpiry)(
      body[entry.provider.refreshExpiry.field]
    )
    if (refreshExpiresIn === 0 && entry.provider.refreshExpiry.zero === "unreported") {
      refreshExpiresIn = undefined
    }
  }

  return {
    ...(decoded.expires_in === undefined ? {} : { expiresIn: decoded.expires_in }),
    ...(decoded.scope === undefined ? {} : { scope: decoded.scope }),
    ...(refreshExpiresIn === undefined ? {} : { refreshExpiresIn })
  }
}, Effect.mapError(unavailable))

const sameStrings = (left: ReadonlyArray<string>, right: ReadonlyArray<string>) =>
  left.length === right.length &&
  [...left].sort().every((value, index) => value === [...right].sort()[index])

/** @internal */
export const makeConnectedProtocolWithCompatibility = Effect.fn(
  "makeOpenIdConnectConnectedProtocol"
)(function*<R, Setup>(
  installation: Effect.Effect<
    InstalledConnectedConfiguration<R>,
    OpenIdConnectConfigurationError | OAuthUnavailable,
    Setup
  >,
  compatibility?: ConnectedCompatibility
): Effect.fn.Return<
  OAuthConnectedProtocol["Service"],
  OpenIdConnectConfigurationError | OAuthUnavailable,
  R | Setup | ProviderRevocation | SecureRandom.SecureRandom | Digest.Digest | PrivateKeyClientSecret | Scope.Scope
> {
  const decoderContext = (yield* Effect.context<R>()).pipe(withoutObservability)
  const random = yield* SecureRandom.SecureRandom
  const digests = yield* Digest.Digest
  const clientSecrets = yield* PrivateKeyClientSecret
  const providerRevocation = yield* ProviderRevocation
  // Provider-owned revocation bypasses the generic OAuth client's transport.
  // Own the entire operation, including provider callbacks, in this lifetime.
  const run = yield* makeScopedOperation(unavailable)

  const requestSecret = (authentication: OpenIdConnectAuthentication) =>
    clientSecrets
      .mint(authentication)
      .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

  // Setup shares the protocol's containment for supplied platform services.
  const { installed, timeoutSeconds } = yield* installation

  const retained = Effect.fnUntraced(function*(
    saved: ConnectedModels.OAuthConnectedConfiguration
  ) {
    const entry = installed.find(
      ({ provider }) =>
        provider.provider === saved.provider &&
        provider.configurationGeneration === saved.configurationGeneration
    )

    const provider = entry?.provider

    if (
      !entry ||
      !provider ||
      provider.protocol !== saved.protocol ||
      provider.issuer !== saved.issuer ||
      persistedResponseIssuerMode(
          provider.responseIssuerMode,
          entry.metadata.authorization_response_iss_parameter_supported
        ) !== saved.responseIssuerMode ||
      provider.clientRegistrationId !== saved.profile.clientRegistrationId ||
      !provider.profiles.some((profile) => sameConnectedProfile(profile, saved.profile)) ||
      provider.callbacks.find((callback) => callback.callbackId === saved.callbackId)
          ?.redirectUri !== saved.redirectUri
    ) {
      return yield* unavailable()
    }

    return entry
  })

  const checkedStart = Effect.fnUntraced(function*(
    start: DateTime.Utc
  ) {
    const value = DateTime.toEpochMillis(start)

    if (
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > DateTime.toEpochMillis(yield* DateTime.now)
    ) {
      return yield* unavailable()
    }

    return value
  })

  const tokenMetadata = Effect.fnUntraced(function*(
    profile: ConnectedModels.OAuthConnectedProfile,
    metadata: GrantMetadata,
    start: number,
    refreshRetained: boolean
  ) {
    const scopes = compatibility !== undefined
      ? yield* compatibility.decodeScopes(metadata.scope, profile.scopes)
      : metadata.scope === undefined
      ? profile.scopes
      : yield* Schema.decodeEffect(ConnectedModels.OAuthConnectedScopes)(metadata.scope.split(" ")).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )

    if (new Set(scopes).size !== scopes.length || !sameStrings(scopes, profile.scopes)) {
      return yield* unavailable()
    }

    const accessExpiresAtMillis = metadata.expiresIn === undefined
      ? undefined
      : yield* Schema.decodeEffect(OAuthInstant)(
        Math.floor(start + metadata.expiresIn * 1000)
      ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    const refreshExpiresAtMillis = !refreshRetained || metadata.refreshExpiresIn === undefined
      ? undefined
      : yield* Schema.decodeEffect(OAuthInstant)(
        Math.floor(start + metadata.refreshExpiresIn * 1000)
      ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    const now = DateTime.toEpochMillis(yield* DateTime.now)

    if (
      (accessExpiresAtMillis !== undefined && accessExpiresAtMillis <= now) ||
      (refreshExpiresAtMillis !== undefined && refreshExpiresAtMillis <= now)
    ) {
      return yield* unavailable()
    }

    return {
      scopes: [...scopes],
      resources: [...profile.resources],
      ...(accessExpiresAtMillis === undefined ? {} : { accessExpiresAtMillis }),
      ...(refreshExpiresAtMillis === undefined ? {} : { refreshExpiresAtMillis })
    }
  })

  const oidcIdentity = Effect.fn("OpenIdConnectConnected.oidcIdentity")(function*(
    entry: InstalledConnectedProvider<R>,
    verified: Oidc.Verified,
    originalNonce: Redacted.Redacted<string>,
    previous?: {
      readonly identity: typeof OAuthExternalIdentity.Type
      readonly continuation: Extract<
        ConnectedModels.OAuthConnectedTokenMaterial["continuation"],
        { readonly _tag: "Oidc" }
      >
    },
    claims?: unknown
  ) {
    const provider = entry.provider

    if (provider.protocol !== "oidc") return yield* unavailable()

    // Refresh keeps the stored identity. UserInfo-only required claims belong
    // to the initial exchange, not the refresh ID token.
    const profile = previous === undefined
      ? yield* decodeOidcProfile(
        claims ?? Redacted.value(verified.claims),
        provider.profileSchema
      ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))
      : undefined

    const issued = yield* Schema.decodeUnknownEffect(tokenIssuer)(
      Redacted.value(verified.claims)
    ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    const decodedSubject = provider.decodeSubject === undefined
      ? verified.subject
      : yield* provider
        .decodeSubject(Redacted.value(verified.claims))
        .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    const namespaced = yield* subjectInTenant(
      provider.issuer,
      Redacted.value(verified.claims),
      decodedSubject
    ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    if (
      previous !== undefined &&
      (previous.continuation.issuer !== issued.iss || namespaced !== previous.identity.subject)
    ) {
      return yield* unavailable()
    }

    const subject = previous === undefined ? namespaced : previous.identity.subject

    return {
      identity: { provider: provider.provider, issuer: provider.issuer, subject },
      ...(profile === undefined ? {} : { profile }),
      continuation: previous?.continuation ?? {
        _tag: "Oidc" as const,
        clientId: provider.clientId,
        nonce: Redacted.make(Redacted.value(originalNonce)),
        subject: verified.subject,
        issuer: issued.iss,
        ...(verified.authTime === undefined ? {} : { authTime: verified.authTime })
      }
    }
  })

  const decodeIdentity = Effect.fn("OpenIdConnectConnected.decodeIdentity")(function*(
    entry: InstalledConnectedProvider<R>,
    body: unknown,
    accessToken?: Redacted.Redacted<string>
  ) {
    if (entry.provider.protocol !== "oauth") return yield* unavailable()
    const decoder = entry.provider.identitySource.decodeIdentity

    const result = yield* Effect.suspend(() => decoder(body)).pipe(
      Effect.provideContext(decoderContext),
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
    )

    const enriched = accessToken === undefined || entry.enrichIdentity === undefined
      ? result
      : yield* entry
        .enrichIdentity(result, accessToken)
        .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    const value = yield* Schema.decodeEffect(identitySchema)(enriched).pipe(
      Effect.mapError(unavailable)
    )

    return {
      identity: {
        provider: entry.provider.provider,
        issuer: entry.provider.issuer,
        subject: value.subject
      },
      ...(value.profile === undefined ? {} : { profile: value.profile }),
      continuation: { _tag: "OAuth" as const }
    }
  })

  const prepareAuthorization: OAuthConnectedProtocol["Service"]["prepareAuthorization"] = Effect.fn(
    "OpenIdConnectConnected.prepareAuthorization"
  )(function*(input) {
    const request = yield* snapshotPrepareInput.effect(input)

    const entry = installed.find(
      ({ provider }) =>
        provider.provider === request.profile.provider &&
        provider.issuance === "active" &&
        provider.profiles.some(
          (profile) => profile.issuance === "active" && sameConnectedProfile(profile, request.profile)
        )
    )

    const callback = entry?.provider.callbacks.find(
      (value) => value.callbackId === request.callbackId
    )

    if (!entry || !callback || request.profile.issuance !== "active") return yield* rejected()

    const state = yield* Pkce.random().pipe(
      Effect.provideService(SecureRandom.SecureRandom, random),
      Effect.provideService(Digest.Digest, digests),
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
    )

    const pkce = entry.provider.pkceS256
      ? yield* Pkce.make().pipe(
        Effect.provideService(SecureRandom.SecureRandom, random),
        Effect.provideService(Digest.Digest, digests),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )
      : undefined

    const nonce = entry.provider.protocol === "oidc"
      ? yield* Pkce.random().pipe(
        Effect.provideService(SecureRandom.SecureRandom, random),
        Effect.provideService(Digest.Digest, digests),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )
      : undefined

    const authorizationUrl = yield* entry.client
      .authorizationUrl({
        redirectUri: callback.redirectUri,
        scopes: compatibility?.authorizationScopes(
          request.profile.scopes,
          request.profile.retention === "access-and-refresh"
        ) ?? request.profile.scopes,
        state,
        ...(pkce === undefined ? {} : { codeChallenge: pkce.challenge }),
        ...(nonce === undefined ? {} : { nonce }),
        ...(entry.provider.authorizationParameters === undefined
          ? {}
          : { parameters: entry.provider.authorizationParameters }),
        resources: request.profile.resources,
        ...(entry.provider.protocol === "oidc" && entry.provider.maxAgeSeconds !== undefined
          ? { maxAgeSeconds: entry.provider.maxAgeSeconds }
          : {}),
        ...(request.prompt === undefined ? {} : { prompt: request.prompt }),
        ...(request.loginHint === undefined ? {} : { loginHint: request.loginHint }),
        ...(entry.provider.responseMode === undefined
          ? {}
          : { responseMode: entry.provider.responseMode })
      })
      .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

    const responseIssuerMode = persistedResponseIssuerMode(
      entry.provider.responseIssuerMode,
      entry.metadata.authorization_response_iss_parameter_supported
    )

    const result = {
      configuration: {
        provider: entry.provider.provider,
        protocol: entry.provider.protocol,
        configurationGeneration: entry.provider.configurationGeneration,
        issuer: entry.provider.issuer,
        responseIssuerMode,
        callbackId: callback.callbackId,
        redirectUri: callback.redirectUri,
        profile: request.profile
      },
      authorizationUrl,
      secrets: {
        namespace: "effect-auth/oauth-transaction-secrets/v1" as const,
        state,
        ...(pkce === undefined ? {} : { pkceVerifier: pkce.verifier }),
        ...(nonce === undefined ? {} : { oidcNonce: nonce })
      },
      ...(entry.provider.responseMode === undefined
        ? {}
        : { responseMode: entry.provider.responseMode })
    }

    return yield* snapshotPrepareOutput.effect(result)
  })

  const exchangeGrant: OAuthConnectedProtocol["Service"]["exchangeGrant"] = Effect.fn(
    "OpenIdConnectConnected.exchangeGrant"
  )(function*(input) {
    const request = yield* snapshotExchangeInput.effect(input),
      saved = request.configuration

    const entry = yield* retained(saved),
      provider = entry.provider

    const responseIssuerMode = persistedResponseIssuerMode(
      provider.responseIssuerMode,
      entry.metadata.authorization_response_iss_parameter_supported
    )

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
    const start = yield* checkedStart(request.verificationStartedAt)

    const clientSecret = yield* requestSecret(provider.authentication)

    const receipt = yield* entry.client
      .codeGrant({
        code: request.response.code,
        redirectUri: saved.redirectUri,
        ...(request.secrets.pkceVerifier === undefined
          ? {}
          : { pkceVerifier: request.secrets.pkceVerifier }),
        ...(provider.tokenParameters === undefined ? {} : { parameters: provider.tokenParameters }),
        resources: saved.profile.resources,
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

    const grant = yield* tokens(receipt, compatibility, {
      scopes: saved.profile.scopes,
      refreshRequired: saved.profile.retention === "access-and-refresh",
      operation: "authorization_code"
    })

    const rawMetadata = yield* receiptMetadata(entry, receipt)

    const identity = yield* provider.protocol === "oidc"
      ? Effect.gen(function*() {
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
          .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

        const claims = provider.userInfo === "merge"
          ? yield* Effect.gen(function*() {
            const userInfo = yield* entry.client
              .fetchProfile(grant.accessToken)
              .pipe(
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
              )

            const subject = yield* Schema.decodeUnknownEffect(userInfoSubject)(userInfo).pipe(
              Effect.mapError(unavailable)
            )

            if (subject.sub !== verified.subject) return yield* unavailable()

            return { ...userInfo, ...Redacted.value(verified.claims) }
          })
          : undefined

        return yield* oidcIdentity(
          entry,
          verified,
          request.secrets.oidcNonce!,
          undefined,
          claims
        )
      })
      : provider.identitySource.from === "token"
      ? decodeIdentity(entry, Redacted.value(receipt.body), grant.accessToken)
      : entry.client.fetchProfile(grant.accessToken).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))),
        Effect.flatMap((body) => decodeIdentity(entry, body, grant.accessToken))
      )

    const refreshToken = saved.profile.retention === "access-and-refresh" ? grant.refreshToken : undefined

    const metadata = yield* tokenMetadata(
      saved.profile,
      rawMetadata,
      start,
      refreshToken !== undefined
    )

    return yield* snapshotOAuthConnectedGrantResponse.effect({
      ...identity,
      ...metadata,
      material: {
        namespace: "effect-auth/oauth-connected-token-material/v1",
        accessToken: grant.accessToken,
        ...(refreshToken === undefined ? {} : { refreshToken: refreshToken }),
        continuation: identity.continuation
      }
    })
  })

  const refreshGrant: OAuthConnectedProtocol["Service"]["refreshGrant"] = Effect.fn(
    "OpenIdConnectConnected.refreshGrant"
  )(function*(input) {
    const request = yield* snapshotRefreshInput.effect(input),
      saved = request.context.configuration

    const entry = yield* retained(saved),
      provider = entry.provider,
      previous = request.material.continuation

    if (
      saved.profile.retention !== "access-and-refresh" ||
      saved.profile.refresh === "unsupported" ||
      !request.material.refreshToken ||
      request.context.identity.provider !== provider.provider ||
      request.context.identity.issuer !== provider.issuer ||
      (provider.protocol === "oidc"
        ? previous._tag !== "Oidc" ||
          previous.clientId !== provider.clientId ||
          previous.nonce === undefined
        : previous._tag !== "OAuth") ||
      !sameStrings(request.context.metadata.scopes, saved.profile.scopes) ||
      !sameStrings(request.context.metadata.resources, saved.profile.resources)
    ) {
      return yield* unavailable()
    }
    const start = yield* checkedStart(request.verificationStartedAt)

    if (
      (request.context.metadata.refreshUseUntilMillis !== undefined &&
        request.context.metadata.refreshUseUntilMillis <= start) ||
      (request.context.metadata.refreshExpiresAtMillis !== undefined &&
        request.context.metadata.refreshExpiresAtMillis <= start)
    ) {
      return yield* unavailable()
    }

    const clientSecret = yield* requestSecret(provider.authentication)

    const receipt = yield* entry.client
      .refreshGrant({
        refreshToken: request.material.refreshToken,
        ...(compatibility?.includeRefreshScope === false ? {} : { scopes: saved.profile.scopes }),
        ...(provider.refreshParameters === undefined
          ? {}
          : { parameters: provider.refreshParameters }),
        resources: saved.profile.resources,
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

    const grant = yield* tokens(receipt, compatibility, {
      scopes: saved.profile.scopes,
      refreshRequired: true,
      operation: "refresh_token"
    })

    if (
      saved.profile.refresh === "rotating" &&
      (grant.refreshToken === undefined ||
        Redacted.value(grant.refreshToken) === Redacted.value(request.material.refreshToken))
    ) {
      return yield* unavailable()
    }
    const rawMetadata = yield* receiptMetadata(entry, receipt)

    if (provider.protocol === "oidc") {
      if (previous._tag !== "Oidc" || !previous.nonce || entry.verifier === undefined) {
        return yield* unavailable()
      }
      if (grant.idToken !== undefined) {
        const verified = yield* entry.verifier
          .verify(grant.idToken, {
            verificationStartedAt: request.verificationStartedAt,
            nonce: previous.nonce,
            accessToken: grant.accessToken,
            previous: {
              subject: previous.subject ?? request.context.identity.subject,
              ...(previous.issuer === undefined ? {} : { issuer: previous.issuer }),
              ...(previous.authTime === undefined ? {} : { authTime: previous.authTime })
            }
          })
          .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

        yield* oidcIdentity(entry, verified, previous.nonce, {
          identity: request.context.identity,
          continuation: previous
        })
      }
    } else if (provider.identitySource.from === "token") {
      const identity = yield* decodeIdentity(
        entry,
        Redacted.value(receipt.body),
        grant.accessToken
      )

      if (identity.identity.subject !== request.context.identity.subject) {
        return yield* unavailable()
      }
    } else {
      const body = yield* entry.client
        .fetchProfile(grant.accessToken)
        .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

      const identity = yield* decodeIdentity(entry, body)

      if (identity.identity.subject !== request.context.identity.subject) {
        return yield* unavailable()
      }
    }
    const metadata = yield* tokenMetadata(saved.profile, rawMetadata, start, true)
    const finishedAt = DateTime.toEpochMillis(yield* DateTime.now)

    if (
      (request.context.metadata.refreshUseUntilMillis !== undefined &&
        request.context.metadata.refreshUseUntilMillis <= finishedAt) ||
      (request.context.metadata.refreshExpiresAtMillis !== undefined &&
        request.context.metadata.refreshExpiresAtMillis <= finishedAt)
    ) {
      return yield* unavailable()
    }

    return yield* snapshotOAuthConnectedGrantResponse.effect({
      identity: request.context.identity,
      ...metadata,
      material: {
        namespace: "effect-auth/oauth-connected-token-material/v1",
        accessToken: grant.accessToken,
        ...(grant.refreshToken === undefined ? {} : { refreshToken: grant.refreshToken }),
        continuation: previous
      }
    })
  })

  const revokeGrant: OAuthConnectedProtocol["Service"]["revokeGrant"] = Effect.fn(
    "OpenIdConnectConnected.revokeGrant"
  )(function*(input) {
    const request = yield* snapshotRevokeInput.effect(input),
      saved = request.context.configuration

    const entry = yield* retained(saved),
      revocation = entry.provider.revocation

    if (
      saved.profile.revocation !== "provider" ||
      revocation.mode === "unsupported" ||
      (revocation.mode === "provider-cohort" && compatibility === undefined) ||
      (revocation.mode === "rfc7009" &&
        request.material.refreshToken !== undefined &&
        revocation.tokenTypes !== "access-and-refresh") ||
      request.context.identity.provider !== entry.provider.provider ||
      request.context.identity.issuer !== entry.provider.issuer ||
      (entry.provider.protocol === "oidc"
        ? request.material.continuation._tag !== "Oidc" ||
          request.material.continuation.clientId !== entry.provider.clientId
        : request.material.continuation._tag !== "OAuth")
    ) {
      return yield* unavailable()
    }
    if (revocation.mode === "provider-cohort") {
      yield* providerRevocation.revoke({
        clientId: entry.provider.clientId,
        authentication: entry.provider.authentication,
        context: request.context,
        material: request.material
      })

      return "Confirmed" as const
    }
    if (revocation.mode !== "rfc7009") return yield* unavailable()
    const revocationAuthentication = revocation.authentication

    if (request.material.refreshToken !== undefined) {
      const clientSecret = yield* requestSecret(revocationAuthentication)

      yield* entry.client
        .revoke({
          token: request.material.refreshToken,
          tokenTypeHint: "refresh_token",
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
    }
    const accessSecret = yield* requestSecret(revocationAuthentication)

    yield* entry.client
      .revoke({
        token: request.material.accessToken,
        tokenTypeHint: "access_token",
        ...(accessSecret === undefined ? {} : { clientSecret: accessSecret })
      })
      .pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))),
        Effect.ensuring(
          Effect.sync(() => {
            if (accessSecret !== undefined) Redacted.wipeUnsafe(accessSecret)
          })
        )
      )

    return "Confirmed" as const
  })

  return OAuthConnectedProtocol.of({
    prepareAuthorization: (input) => run(prepareAuthorization(input)),
    exchangeGrant: (input) =>
      run(exchangeGrant(input)).pipe(
        timeoutOrElseWithCause({
          duration: timeoutSeconds * 1000,
          orElse: () => Effect.fail(unavailable())
        }),
        Effect.tapError((error) =>
          reportAuthDiagnostic(
            "oauth-exchange",
            error._tag === "OAuthProtocolRejected" ? "rejected" : "unavailable"
          )
        )
      ),
    refreshGrant: (input) =>
      run(refreshGrant(input)).pipe(
        timeoutOrElseWithCause({
          duration: timeoutSeconds * 1000,
          orElse: () => Effect.fail(unavailable())
        }),
        Effect.tapError((error) =>
          reportAuthDiagnostic(
            "oauth-exchange",
            error._tag === "OAuthProtocolRejected" ? "rejected" : "unavailable"
          )
        )
      ),
    revokeGrant: (input) =>
      run(revokeGrant(input)).pipe(
        timeoutOrElseWithCause({
          duration: timeoutSeconds * 1000,
          orElse: () => Effect.fail(unavailable())
        })
      )
  })
})

/** @internal */
export const makeOpenIdConnectConnectedProtocol = <R, Setup>(
  installation: Effect.Effect<
    InstalledConnectedConfiguration<R>,
    OpenIdConnectConfigurationError | OAuthUnavailable,
    Setup
  >
): Effect.Effect<
  OAuthConnectedProtocol["Service"],
  OpenIdConnectConfigurationError | OAuthUnavailable,
  R | Setup | SecureRandom.SecureRandom | Digest.Digest | PrivateKeyClientSecret | Scope.Scope
> =>
  makeConnectedProtocolWithCompatibility(installation).pipe(
    Effect.provide(ProviderRevocation.layerUnsupported)
  )

const snapshotPrepareInput = makeOAuthSnapshot(prepareInput)
const snapshotPrepareOutput = makeOAuthSnapshot(prepareOutput)
const snapshotExchangeInput = makeOAuthSnapshot(exchangeInput)
const snapshotOAuthConnectedGrantResponse = makeOAuthSnapshot(ConnectedModels.OAuthConnectedGrantResponse)
const snapshotRefreshInput = makeOAuthSnapshot(refreshInput)
const snapshotRevokeInput = makeOAuthSnapshot(revokeInput)
