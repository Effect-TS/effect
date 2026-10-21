import * as Cause from "effect/Cause"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

import {
  OAuthConnectedConfiguration,
  OAuthConnectedGrantResponse,
  OAuthConnectedTokenMaterial
} from "../../connectedModels.ts"
import type { OAuthConnectedProtocol } from "../../oauthConnectedProtocol.ts"
import type { OAuthConnectedProfile } from "../../permissionProfile.ts"
import { OAuthConfigurationError, OAuthProtocolRejected, OAuthUnavailable } from "../../signInErrors.ts"
import { type OAuthCallbackId, OAuthRedirectUri, OAuthTransactionSecrets } from "../../signInModels.ts"
import { issuer, providerKey, type ProviderOptions } from "./models.ts"
import { Athlete } from "./profile.ts"

const Token = Schema.Struct({
  token_type: Schema.String.check(Schema.isPattern(/^[Bb]earer$/)),
  access_token: Schema.NonEmptyString.check(Schema.isMaxLength(16384)),
  refresh_token: Schema.NonEmptyString.check(Schema.isMaxLength(16384)),
  expires_at: Schema.Int.check(Schema.isGreaterThan(0)),
  athlete: Schema.optionalKey(Athlete),
  scope: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(16384)))
})

const decodeGrant = Schema.decodeEffect(Schema.toType(OAuthConnectedGrantResponse))

// Fetch's JSON accessor buffers unknown fields too. Bound the scoped stream before decoding.
const readBody = Effect.fnUntraced(function*(response: HttpClientResponse.HttpClientResponse) {
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let size = 0

  const chunks = yield* response.stream.pipe(
    Stream.mapEffect(
      Effect.fnUntraced(function*(chunk) {
        size += chunk.length
        if (size > 1_048_576) return yield* OAuthUnavailable.make({})

        return yield* Effect.try({
          try: () => decoder.decode(chunk, { stream: true }),
          catch: () => OAuthUnavailable.make({})
        })
      })
    ),
    Stream.runCollect,
    Effect.mapError(() => OAuthUnavailable.make({}))
  )

  return yield* Effect.try({
    try: () => chunks.join("") + decoder.decode(),
    catch: () => OAuthUnavailable.make({})
  })
})

const Scopes = Schema.NonEmptyArray(
  Schema.Literals([
    "read",
    "read_all",
    "profile:read_all",
    "profile:write",
    "activity:read",
    "activity:read_all",
    "activity:write"
  ])
)

/**
 * Confidential Strava authorization. The shared sign-in workflow supplies
 * single-use state/browser binding; this provider does not advertise S256 PKCE.
 *
 * @internal
 */
export const makeConnectedProtocol = Effect.fn("Strava.configure")(function*(
  options: ProviderOptions,
  profile: OAuthConnectedProfile,
  callback: {
    readonly callbackId: typeof OAuthCallbackId.Type
    readonly redirectUri: typeof OAuthRedirectUri.Type
  }
): Effect.fn.Return<
  OAuthConnectedProtocol["Service"],
  OAuthConfigurationError,
  HttpClient.HttpClient | SecureRandom.SecureRandom
> {
  const callbackUrl = callback.redirectUri

  const scopes = yield* Schema.decodeUnknownEffect(Scopes)(profile.scopes).pipe(
    Effect.mapError(() => OAuthConfigurationError.make({ reason: "policy" }))
  )

  if (!/^[0-9]+$/.test(options.clientId) || Redacted.value(options.clientSecret).length === 0) {
    return yield* OAuthConfigurationError.make({ reason: "policy" })
  }

  const http = (yield* HttpClient.HttpClient).pipe(
    HttpClient.withScope,
    HttpClient.transformResponse(
      Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" })
    )
  )

  const random = yield* SecureRandom.SecureRandom

  if (profile.provider !== providerKey || profile.clientRegistrationId !== options.clientId) {
    return yield* OAuthConfigurationError.make({ reason: "policy" })
  }

  const configuration = OAuthConnectedConfiguration.make({
    provider: providerKey,
    protocol: "oauth",
    configurationGeneration: 1,
    issuer,
    responseIssuerMode: "unsupported",
    callbackId: callback.callbackId,
    redirectUri: OAuthRedirectUri.make(callbackUrl),
    profile
  })

  const post = Effect.fn("Strava.token")(
    function*(parameters: Readonly<Record<string, string>>) {
      const response = yield* http.execute(
        HttpClientRequest.post("https://www.strava.com/oauth/token").pipe(
          HttpClientRequest.bodyUrlParams({
            client_id: options.clientId,
            client_secret: Redacted.value(options.clientSecret),
            ...parameters
          })
        )
      )

      if (response.status === 400 || response.status === 401) {
        return yield* OAuthProtocolRejected.make({})
      }
      if (response.status !== 200) return yield* OAuthUnavailable.make({})

      return yield* readBody(response).pipe(
        Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Token)))
      )
    },
    Effect.scoped,
    (effect) =>
      effect.pipe(
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) => error._tag === "OAuthProtocolRejected" ? error : OAuthUnavailable.make({}))
          )
        )
      )
  )

  const verifyConfiguration = (input: OAuthConnectedConfiguration) =>
    JSON.stringify(input) === JSON.stringify(configuration)
      ? Effect.void
      : Effect.fail(OAuthUnavailable.make({}))

  const material = (token: typeof Token.Type) =>
    OAuthConnectedTokenMaterial.make({
      namespace: "effect-auth/oauth-connected-token-material/v1",
      accessToken: Redacted.make(token.access_token),
      refreshToken: Redacted.make(token.refresh_token),
      continuation: { _tag: "OAuth" }
    })

  return {
    prepareAuthorization: Effect.fn("Strava.prepareAuthorization")(function*(input) {
      if (
        input.callbackId !== configuration.callbackId ||
        JSON.stringify(input.profile) !== JSON.stringify(profile)
      ) {
        return yield* OAuthUnavailable.make({})
      }

      const bytes = yield* random
        .randomBytes(32)
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

      const state = Base64Url.encode(bytes)

      bytes.fill(0)
      const url = new URL("https://www.strava.com/oauth/authorize")

      url.searchParams.set("client_id", options.clientId)
      url.searchParams.set("redirect_uri", callbackUrl)
      url.searchParams.set("response_type", "code")
      url.searchParams.set("approval_prompt", "auto")
      url.searchParams.set("scope", scopes.join(","))
      url.searchParams.set("state", state)

      // The shared envelope has a verifier field; this provider does not send
      // it as PKCE and does not claim PKCE protection.
      return {
        configuration,
        authorizationUrl: Redacted.make(url.toString()),
        secrets: OAuthTransactionSecrets.make({
          namespace: "effect-auth/oauth-transaction-secrets/v1",
          state: Redacted.make(state),
          pkceVerifier: Redacted.make(state)
        })
      }
    }),
    exchangeGrant: Effect.fn("Strava.exchangeGrant")(function*(input) {
      yield* verifyConfiguration(input.configuration)
      if (Redacted.value(input.secrets.state) !== Redacted.value(input.response.state)) {
        return yield* OAuthProtocolRejected.make({})
      }

      const token = yield* post({
        grant_type: "authorization_code",
        code: Redacted.value(input.response.code)
      })

      const athlete = token.athlete

      if (athlete === undefined) return yield* OAuthProtocolRejected.make({})

      // Prefer the token endpoint's authenticated receipt. Older Strava
      // responses report accepted scopes only on the bound callback.
      const granted = (token.scope ?? input.response.scope ?? "").split(/[ ,]+/).filter(Boolean)

      if (scopes.some((scope) => !granted.includes(scope))) {
        return yield* OAuthProtocolRejected.make({})
      }

      return yield* decodeGrant({
        identity: { provider: providerKey, issuer, subject: String(athlete.id) },
        profile: {
          displayName: [athlete.firstname, athlete.lastname].filter(Boolean).join(" "),
          // Strava uses this relative placeholder when the athlete has no photo.
          ...(athlete.profile === undefined || athlete.profile === "avatar/athlete/large.png"
            ? {}
            : { avatarUrl: athlete.profile }),
          providerData: { ...athlete }
        },
        scopes: granted,
        resources: [],
        accessExpiresAtMillis: token.expires_at * 1000,
        material: material(token)
      }).pipe(Effect.mapError(() => OAuthUnavailable.make({})))
    }),
    refreshGrant: Effect.fn("Strava.refreshGrant")(function*(input) {
      yield* verifyConfiguration(input.context.configuration)
      if (input.material.refreshToken === undefined) return yield* OAuthProtocolRejected.make({})

      const token = yield* post({
        grant_type: "refresh_token",
        refresh_token: Redacted.value(input.material.refreshToken)
      })

      // Fetch identity again so a provider/account mismatch cannot silently
      // replace the grant held for this subject.
      const response = yield* http
        .execute(
          HttpClientRequest.get("https://www.strava.com/api/v3/athlete").pipe(
            HttpClientRequest.bearerToken(Redacted.make(token.access_token))
          )
        )
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

      if (response.status !== 200) return yield* OAuthUnavailable.make({})

      const athlete = yield* readBody(response).pipe(
        Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Athlete))),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
      )

      if (
        String(athlete.id) !== input.context.identity.subject ||
        token.expires_at * 1000 <= DateTime.toEpochMillis(input.verificationStartedAt)
      ) {
        return yield* OAuthProtocolRejected.make({})
      }

      return yield* decodeGrant({
        identity: input.context.identity,
        scopes: token.scope === undefined
          ? input.context.metadata.scopes
          : token.scope.split(/[ ,]+/).filter(Boolean),
        resources: [],
        accessExpiresAtMillis: token.expires_at * 1000,
        material: material(token)
      }).pipe(Effect.mapError(() => OAuthUnavailable.make({})))
    }, Effect.scoped),
    revokeGrant: () => Effect.fail(OAuthUnavailable.make({}))
  }
})
