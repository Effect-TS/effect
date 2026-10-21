import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type * as OAuth from "../../../../../oauth/OAuth.ts"
import * as Oidc from "../../../../../oauth/Oidc.ts"
import { OAuthConnectedProfile } from "../../../permissionProfile.ts"
import { OAuthGeneration, OAuthProviderKey } from "../../../schema.ts"
import { OAuthCallbackId, OAuthIssuer, OAuthRedirectUri } from "../../../signInModels.ts"
import { freezeOAuth } from "../../../signInSnapshot.ts"
import { type ConnectedOptions, githubVerifiedPrimaryEmail, type ProviderConnectedOAuth } from "../compatibility.ts"
import {
  callbackEndpoint,
  copyAuth,
  copyIdentitySource,
  endpoint,
  identitySourceSchema,
  nativeAuthentication,
  nativeOAuthClientOptions,
  validateIdentitySource
} from "../configuration.ts"
import {
  advertisedIdTokenAlgorithms,
  hasStaticSecret,
  IdTokenSignedResponseAlg,
  isPrivateKeyAuthentication,
  type OidcProfileSchema,
  type OidcSubjectDecoder,
  OidcUserInfoMode,
  OpenIdConnectConfigurationError
} from "../models.ts"
import { install, type NativeProvider } from "../native.ts"
import { resolveOptions } from "../options.ts"
import type { OpenIdConnectConnectedOAuthProvider, OpenIdConnectConnectedOidcProvider } from "./models.ts"

const text = (maximum: number) => Schema.NonEmptyString.check(Schema.isMaxLength(maximum))

const fields = Schema.Record(
  Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9._~-]{0,63}$/)),
  Schema.String.check(Schema.isMaxLength(2048))
).check(Schema.makeFilter((value) => Object.keys(value).length <= 16))

const secret = Schema.RedactedFromValue(text(4096))

const privateKeyJwt = Schema.Struct({
  algorithm: Schema.Literal("ES256"),
  keyId: text(256),
  issuer: text(2048),
  subject: text(1024),
  audience: text(2048),
  lifetimeSeconds: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 15_777_000 })),
  privateKey: secret
})

const authentication = Schema.Union([
  Schema.Struct({
    method: Schema.Literal("client_secret_basic"),
    secret
  }),
  Schema.Struct({
    method: Schema.Literal("client_secret_post"),
    secret,
    privateKeyJwt: Schema.optionalKey(Schema.Never)
  }),
  Schema.Struct({
    method: Schema.Literal("client_secret_post"),
    privateKeyJwt,
    secret: Schema.optionalKey(Schema.Never)
  }),
  Schema.Struct({ method: Schema.Literal("none"), publicClient: Schema.Literal(true) })
])

const common = {
  provider: OAuthProviderKey,
  configurationGeneration: OAuthGeneration,
  issuance: Schema.Literals(["active", "retired"]),
  issuer: OAuthIssuer,
  responseIssuerMode: Schema.Literals(["required", "unsupported", "discovered"]),
  clientId: text(1024),
  authentication,
  callbacks: Schema.Array(
    Schema.Struct({ callbackId: OAuthCallbackId, redirectUri: OAuthRedirectUri })
  ).check(Schema.isMinLength(1), Schema.isMaxLength(16)),
  authorizationParameters: Schema.optionalKey(fields),
  tokenParameters: Schema.optionalKey(fields),
  responseMode: Schema.optionalKey(Schema.Literals(["query", "form_post"])),
  refreshParameters: Schema.optionalKey(fields),
  clientRegistrationId: OAuthConnectedProfile.fields.clientRegistrationId,
  profiles: Schema.Array(OAuthConnectedProfile).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(64)
  ),
  resourceIndicators: Schema.Literals(["unsupported", "rfc8707"]),
  refreshExpiry: Schema.Union([
    Schema.Literal("unreported"),
    Schema.Struct({
      field: Schema.Literals(["refresh_expires_in", "refresh_token_expires_in"]),
      zero: Schema.Literals(["unreported", "expired"])
    })
  ]),
  revocation: Schema.Union([
    Schema.Struct({ mode: Schema.Literal("unsupported") }),
    Schema.Struct({
      mode: Schema.Literal("rfc7009"),
      scope: Schema.Literal("cohort"),
      tokenTypes: Schema.Literals(["access", "access-and-refresh"]),
      authentication,
      endpoint: Schema.optionalKey(text(2048))
    })
  ])
}

const optionsSchema = <R>(providerCohort: boolean) =>
  Schema.toType(
    Schema.Struct({
      providers: Schema.Array(
        Schema.Union([
          Schema.Struct({
            ...common,
            protocol: Schema.Literal("oidc"),
            idTokenSignedResponseAlg: Schema.Array(IdTokenSignedResponseAlg).check(
              Schema.isMinLength(1),
              Schema.isMaxLength(5)
            ),
            pkceS256: Schema.Boolean,
            userInfo: OidcUserInfoMode,
            profileSchema: Schema.declare<OidcProfileSchema>((input): input is OidcProfileSchema =>
              Schema.isSchema(input)
            ),
            decodeSubject: Schema.optionalKey(
              Schema.declare<OidcSubjectDecoder>((input): input is OidcSubjectDecoder => Predicate.isFunction(input))
            ),
            maxAgeSeconds: Schema.optionalKey(
              Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 86400 }))
            )
          }),
          Schema.Struct({
            ...common,
            revocation: providerCohort
              ? Schema.Union([
                common.revocation,
                Schema.Struct({ mode: Schema.Literal("provider-cohort") })
              ])
              : common.revocation,
            protocol: Schema.Literal("oauth"),
            [githubVerifiedPrimaryEmail]: Schema.optionalKey(Schema.Boolean),
            authorizationEndpoint: text(2048),
            tokenEndpoint: text(2048),
            pkceS256: Schema.Boolean,
            tokenBodyFormat: Schema.optionalKey(Schema.Literals(["form", "json"])),
            scopeSeparator: Schema.optionalKey(Schema.Literals([" ", ","])),
            identitySource: identitySourceSchema<R>()
          })
        ])
      ).check(Schema.isMinLength(1), Schema.isMaxLength(64)),
      timeoutSeconds: Schema.Finite.check(Schema.isBetween({ minimum: 1, maximum: 30 }))
    })
  )

const reserved = new Set([
  "client_id",
  "client_secret",
  "client_assertion",
  "client_assertion_type",
  "redirect_uri",
  "response_type",
  "response_mode",
  "state",
  "code",
  "code_verifier",
  "code_challenge",
  "code_challenge_method",
  "nonce",
  "scope",
  "resource",
  "audience",
  "iss",
  "grant_type",
  "refresh_token",
  "token",
  "token_type_hint",
  "max_age",
  "request",
  "request_uri",
  "authorization_details",
  "id_token_hint",
  "login_hint",
  "login_hint_token",
  "subject_token",
  "subject_token_type",
  "actor_token",
  "actor_token_type",
  "requested_token_type"
])

// oxlint-disable-next-line no-restricted-properties -- Collision-free fingerprints for bounded local configuration tuple indexes.
const tupleKey = (values: ReadonlyArray<string | number>) => JSON.stringify(values)

const forbiddenHeaders = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "host",
  "content-length",
  "content-type",
  "transfer-encoding",
  "connection",
  "upgrade",
  "trailer",
  "te"
])

const configurationError = (reason: OpenIdConnectConfigurationError["reason"]) =>
  OpenIdConnectConfigurationError.make({ reason })

const copyRevocation = <
  T extends
    | OpenIdConnectConnectedOAuthProvider<never>["revocation"]
    | ProviderConnectedOAuth<never>["revocation"]
>(
  value: T
): T =>
  value.mode === "rfc7009"
    ? { ...value, authentication: copyAuth(value.authentication) }
    : { ...value }

/** @internal */
export type ConnectedProvider<R> =
  | OpenIdConnectConnectedOidcProvider
  | (Omit<OpenIdConnectConnectedOAuthProvider<R>, "revocation"> & {
    readonly revocation:
      | OpenIdConnectConnectedOAuthProvider<R>["revocation"]
      | ProviderConnectedOAuth<R>["revocation"]
  })

/** @internal */
export interface InstalledConnectedProvider<R> extends NativeProvider {
  readonly provider: ConnectedProvider<R>
  readonly metadata: OAuth.Metadata
}

const metadataSchema = Schema.Struct({
  issuer: OAuthIssuer,
  signing_key_issuer_required: Schema.optionalKey(Schema.Literal(true)),
  authorization_endpoint: text(2048),
  token_endpoint: text(2048),
  jwks_uri: Schema.optionalKey(text(2048)),
  userinfo_endpoint: Schema.optionalKey(text(2048)),
  revocation_endpoint: Schema.optionalKey(text(2048)),
  code_challenge_methods_supported: Schema.optionalKey(
    Schema.Array(text(64)).check(Schema.isMaxLength(64))
  ),
  response_types_supported: Schema.optionalKey(
    Schema.Array(text(64)).check(Schema.isMaxLength(64))
  ),
  grant_types_supported: Schema.optionalKey(Schema.Array(text(128)).check(Schema.isMaxLength(64))),
  id_token_signing_alg_values_supported: Schema.optionalKey(
    Schema.Array(text(64)).check(Schema.isMaxLength(64))
  ),
  token_endpoint_auth_methods_supported: Schema.optionalKey(
    Schema.Array(text(64)).check(Schema.isMaxLength(64))
  ),
  revocation_endpoint_auth_methods_supported: Schema.optionalKey(
    Schema.Array(text(64)).check(Schema.isMaxLength(64))
  ),
  authorization_response_iss_parameter_supported: Schema.optionalKey(Schema.Boolean)
})

const equivalentProfile = Schema.toEquivalence(OAuthConnectedProfile)

/**
 * Compare captured, validated profiles. The issuance flag selects new authorization only.
 *
 * @internal
 */
export const sameConnectedProfile = (
  registered: OAuthConnectedProfile,
  saved: OAuthConnectedProfile
) => equivalentProfile({ ...registered, issuance: saved.issuance }, saved)

/** @internal */
export interface InstalledConnectedConfiguration<R> {
  readonly installed: ReadonlyArray<InstalledConnectedProvider<R>>
  readonly timeoutSeconds: number
}

/** @internal */
export const prepareConnectedConfigurations = Effect.fn(
  "OpenIdConnect.prepareConnectedConfigurations"
)(function*<R>(input: ConnectedOptions<R>, providerCohort = false) {
  const options = yield* Schema.decodeEffect(optionsSchema<R>(providerCohort))(input).pipe(
    Effect.mapError(() => configurationError("provider"))
  )

  const providers: Array<ConnectedProvider<R>> = yield* resolveOptions(() =>
    Effect.sync(() =>
      options.providers.map((provider): ConnectedProvider<R> => {
        const detached = {
          authentication: copyAuth(provider.authentication),
          callbacks: provider.callbacks.map((value) => ({ ...value })),
          profiles: provider.profiles.map((value) => ({
            ...value,
            scopes: [...value.scopes],
            resources: [...value.resources]
          })),
          ...(provider.authorizationParameters
            ? { authorizationParameters: { ...provider.authorizationParameters } }
            : {}),
          ...(provider.tokenParameters ? { tokenParameters: { ...provider.tokenParameters } } : {}),
          ...(provider.refreshParameters
            ? { refreshParameters: { ...provider.refreshParameters } }
            : {}),
          refreshExpiry: provider.refreshExpiry === "unreported"
            ? provider.refreshExpiry
            : { ...provider.refreshExpiry }
        }

        return provider.protocol === "oidc"
          ? { ...provider, ...detached, revocation: copyRevocation(provider.revocation) }
          : {
            ...provider,
            ...detached,
            revocation: copyRevocation(provider.revocation),
            identitySource: copyIdentitySource(provider.identitySource)
          }
      })
    )
  )

  for (const provider of providers) {
    const saved = provider.authentication

    if (isPrivateKeyAuthentication(saved)) {
      const privateKey = saved.privateKeyJwt.privateKey

      yield* Effect.addFinalizer(() => Effect.sync(() => Redacted.wipeUnsafe(privateKey)))
    }

    const revocation = provider.revocation

    if (revocation.mode === "rfc7009" && isPrivateKeyAuthentication(revocation.authentication)) {
      const privateKey = revocation.authentication.privateKeyJwt.privateKey

      yield* Effect.addFinalizer(() => Effect.sync(() => Redacted.wipeUnsafe(privateKey)))
    }
  }

  const generations = new Set<string>(),
    active = new Set<string>(),
    aliases = new Map<string, string>(),
    registrations = new Map<string, string>()

  let profileCount = 0

  for (const provider of providers) {
    const generationKey = tupleKey([provider.provider, provider.configurationGeneration])

    if (
      generations.has(generationKey) ||
      (provider.issuance === "active" && active.has(provider.provider))
    ) {
      return yield* configurationError("generation")
    }
    generations.add(generationKey)
    if (provider.issuance === "active") active.add(provider.provider)
    const issuer = yield* endpoint(provider.issuer, "provider")

    if (provider.issuer.includes("?")) return yield* configurationError("issuer")

    const aliasKey = tupleKey([issuer.href, provider.clientId]),
      alias = tupleKey([provider.provider, provider.clientRegistrationId])

    if (aliases.has(aliasKey) && aliases.get(aliasKey) !== alias) {
      return yield* configurationError("provider")
    }
    aliases.set(aliasKey, alias)

    const registration = tupleKey([provider.provider, issuer.href, provider.clientRegistrationId])

    if (registrations.has(registration) && registrations.get(registration) !== provider.clientId) {
      return yield* configurationError("provider")
    }
    registrations.set(registration, provider.clientId)
    const callbacks = new Set<string>()

    for (const callback of provider.callbacks) {
      const url = yield* callbackEndpoint(callback.redirectUri, "provider")

      if (
        callbacks.has(callback.callbackId) ||
        callback.redirectUri.includes("?") ||
        url.href !== callback.redirectUri
      ) {
        return yield* configurationError("callback")
      }
      callbacks.add(callback.callbackId)
    }
    for (
      const parameters of [
        provider.authorizationParameters,
        provider.tokenParameters,
        provider.refreshParameters
      ]
    ) {
      for (const key of Object.keys(parameters ?? {})) {
        if (reserved.has(key.toLowerCase())) return yield* configurationError("parameters")
      }
    }

    const profiles = new Set<string>(),
      activeProfiles = new Set<string>()

    for (const profile of provider.profiles) {
      if (++profileCount > 64) return yield* configurationError("provider")
      const key = tupleKey([profile.key, profile.generation])

      if (
        profiles.has(key) ||
        (profile.issuance === "active" && activeProfiles.has(profile.key)) ||
        profile.provider !== provider.provider ||
        profile.clientRegistrationId !== provider.clientRegistrationId ||
        new Set(profile.scopes).size !== profile.scopes.length ||
        new Set(profile.resources).size !== profile.resources.length ||
        profile.refreshAheadMillis >= profile.maximumAccessLifetimeMillis ||
        (provider.protocol === "oidc" &&
          (new Set(provider.idTokenSignedResponseAlg).size !==
              provider.idTokenSignedResponseAlg.length ||
            !profile.scopes.includes("openid"))) ||
        (provider.resourceIndicators === "unsupported" && profile.resources.length !== 0) ||
        (profile.retention === "access-only" && profile.refresh !== "unsupported") ||
        (profile.retention === "access-and-refresh" &&
          (profile.refresh === "unsupported" ||
            profile.maximumRefreshLifetimeMillis === undefined ||
            (provider.authentication.method === "none" && profile.refresh !== "rotating"))) ||
        (profile.revocation === "provider" &&
          (provider.revocation.mode === "unsupported" ||
            (provider.revocation.mode === "rfc7009" &&
              profile.retention === "access-and-refresh" &&
              provider.revocation.tokenTypes !== "access-and-refresh")))
      ) {
        return yield* configurationError("provider")
      }
      profiles.add(key)
      if (profile.issuance === "active") activeProfiles.add(profile.key)
      for (const resource of profile.resources) {
        const uri = yield* Effect.try({
          try: () => new URL(resource),
          catch: () => configurationError("provider")
        })

        if (
          resource.includes("#") ||
          // oxlint-disable-next-line no-control-regex -- Preserve exact resource URIs and reject ambiguous control characters.
          /[\s\\\u0000-\u001f\u007f]/u.test(resource) ||
          uri.username !== "" ||
          uri.password !== ""
        ) {
          return yield* configurationError("parameters")
        }
      }
    }
    if (provider.protocol === "oauth") {
      yield* endpoint(provider.authorizationEndpoint, "provider")
      yield* endpoint(provider.tokenEndpoint, "provider")
      yield* validateIdentitySource(provider.identitySource)
      if (provider.identitySource.from !== "token") {
        const headers = new Set<string>()

        for (const [name, value] of Object.entries(provider.identitySource.headers ?? {})) {
          const lower = name.toLowerCase()

          if (forbiddenHeaders.has(lower) || headers.has(lower) || /[\r\n]/u.test(value)) {
            return yield* configurationError("identity-source")
          }
          headers.add(lower)
        }
      }
    }
    if (provider.revocation.mode === "rfc7009") {
      if (provider.protocol === "oauth" && provider.revocation.endpoint === undefined) {
        return yield* configurationError("metadata")
      }
      if (provider.revocation.endpoint) yield* endpoint(provider.revocation.endpoint, "provider")
    }
    freezeOAuth(provider)
  }

  return { providers, timeoutSeconds: options.timeoutSeconds }
})

/** @internal */
export const installConnectedProvider = Effect.fn("OpenIdConnect.installConnectedProvider")(
  function*<R>(provider: ConnectedProvider<R>, raw: OAuth.Metadata, timeoutSeconds: number) {
    // oxlint-disable-next-line no-restricted-properties -- Validate foreign discovery metadata at this adapter's bounded boundary.
    const metadata = yield* Schema.decodeEffect(metadataSchema)(raw).pipe(
      Effect.mapError(() => configurationError("metadata"))
    )

    if (!Oidc.discoveredIssuerMatches(provider.issuer, metadata.issuer)) {
      return yield* configurationError("issuer")
    }
    if (
      provider.responseIssuerMode !== "discovered" &&
      (metadata.authorization_response_iss_parameter_supported === true) !==
        (provider.responseIssuerMode === "required")
    ) {
      return yield* configurationError("metadata")
    }
    const authorization = yield* endpoint(metadata.authorization_endpoint)

    for (const key of authorization.searchParams.keys()) {
      if (reserved.has(key.toLowerCase())) return yield* configurationError("parameters")
    }
    const token = yield* endpoint(metadata.token_endpoint)

    for (const key of token.searchParams.keys()) {
      if (reserved.has(key.toLowerCase())) return yield* configurationError("parameters")
    }

    const tokenAuthentication = metadata.token_endpoint_auth_methods_supported ??
      (provider.protocol === "oidc" ? ["client_secret_basic"] : undefined)

    if (tokenAuthentication && !tokenAuthentication.includes(provider.authentication.method)) {
      return yield* configurationError("authentication")
    }
    if (provider.protocol === "oidc") {
      const algorithms = advertisedIdTokenAlgorithms(
        metadata.id_token_signing_alg_values_supported,
        provider.idTokenSignedResponseAlg
      )

      const usesHmac = algorithms?.includes("HS256") === true
      const usesAsymmetric = algorithms?.some((algorithm) => algorithm !== "HS256") === true

      if (usesHmac && usesAsymmetric) return yield* configurationError("parameters")
      if (usesHmac && !hasStaticSecret(provider.authentication)) {
        return yield* configurationError("authentication")
      }
      if (
        algorithms === undefined ||
        !metadata.response_types_supported?.includes("code") ||
        (usesAsymmetric && metadata.jwks_uri === undefined) ||
        (provider.pkceS256 && !metadata.code_challenge_methods_supported?.includes("S256")) ||
        (provider.userInfo === "merge" && metadata.userinfo_endpoint === undefined) ||
        (provider.profiles.some((profile) => profile.retention === "access-and-refresh") &&
          !metadata.grant_types_supported?.includes("refresh_token"))
      ) {
        return yield* configurationError("metadata")
      }
      if (metadata.jwks_uri !== undefined) yield* endpoint(metadata.jwks_uri)
      if (metadata.userinfo_endpoint !== undefined) yield* endpoint(metadata.userinfo_endpoint)
    } else if (provider.identitySource.from !== "token") {
      yield* endpoint(provider.identitySource.url)
    }
    if (provider.revocation.mode === "rfc7009") {
      if (
        !metadata.revocation_endpoint ||
        (provider.revocation.endpoint !== undefined &&
          provider.revocation.endpoint !== metadata.revocation_endpoint)
      ) {
        return yield* configurationError("metadata")
      }

      const auth = metadata.revocation_endpoint_auth_methods_supported ??
        (provider.protocol === "oidc" ? ["client_secret_basic"] : undefined)

      if (auth && !auth.includes(provider.revocation.authentication.method)) {
        return yield* configurationError("authentication")
      }
      const revoke = yield* endpoint(metadata.revocation_endpoint)

      for (const key of revoke.searchParams.keys()) {
        if (reserved.has(key.toLowerCase())) return yield* configurationError("parameters")
      }
    }

    const native = yield* install(
      {
        metadata,
        clientId: provider.clientId,
        authentication: nativeAuthentication(provider.authentication),
        timeout: timeoutSeconds * 1000,
        ...(provider.protocol === "oauth"
          ? nativeOAuthClientOptions(provider)
          : provider.userInfo === "merge" && metadata.userinfo_endpoint !== undefined
          ? { profile: { url: metadata.userinfo_endpoint } }
          : {}),
        ...(provider.revocation.mode === "rfc7009"
          ? { revocationAuthentication: nativeAuthentication(provider.revocation.authentication) }
          : {})
      },
      provider.protocol === "oauth" && provider[githubVerifiedPrimaryEmail] === true
    )

    return { provider, metadata, ...native }
  }
)

/** @internal */
export const installOAuthConnectedConfigurations = Effect.fn(
  "OAuth.installConnectedConfigurations"
)(function*<R>(input: ConnectedOptions<R>, providerCohort = false) {
  const { providers, timeoutSeconds } = yield* prepareConnectedConfigurations(
    input,
    providerCohort
  )

  const installed: Array<InstalledConnectedProvider<R>> = []

  for (const provider of providers) {
    if (provider.protocol !== "oauth") return yield* configurationError("provider")
    installed.push(
      yield* installConnectedProvider(
        provider,
        {
          issuer: provider.issuer,
          authorization_endpoint: provider.authorizationEndpoint,
          token_endpoint: provider.tokenEndpoint,
          authorization_response_iss_parameter_supported: provider.responseIssuerMode === "required",
          ...(provider.revocation.mode === "rfc7009"
            ? { revocation_endpoint: provider.revocation.endpoint }
            : {})
        },
        timeoutSeconds
      )
    )
  }

  return { installed, timeoutSeconds }
})
