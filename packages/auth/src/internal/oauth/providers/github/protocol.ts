import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"

import { timeoutOrElseWithCause } from "../../../shared/timeout.ts"
import { OAuthConnectedProfile } from "../../permissionProfile.ts"
import { OAuthGeneration } from "../../schema.ts"
import { OAuthProtocolRejected, OAuthUnavailable } from "../../signInErrors.ts"
import { OAuthCallbackId, OAuthIssuer, OAuthRedirectUri } from "../../signInModels.ts"
import { freezeOAuth } from "../../signInSnapshot.ts"
import { type ConnectedCompatibility, githubVerifiedPrimaryEmail, tokenCompatibility } from "../shared/compatibility.ts"
import { installOAuthConfigurations } from "../shared/configuration.ts"
import { installOAuthConnectedConfigurations } from "../shared/connected/configuration.ts"
import { makeConnectedProtocolWithCompatibility } from "../shared/connected/protocol.ts"
import { hasStaticSecret, OpenIdConnectConfigurationError, type OpenIdConnectOAuthProvider } from "../shared/models.ts"
import { resolveOptions } from "../shared/options.ts"
import { PrivateKeyClientSecret } from "../shared/privateKeyJwt.ts"
import { makeOpenIdConnectOAuthProtocol } from "../shared/protocol.ts"
import { ProviderRevocation } from "../shared/providerRevocation.ts"
import { githubApiHeaders } from "./email.ts"
import {
  type GitHubOAuthAppConnectedProtocolOptions,
  type GitHubOAuthAppGeneration,
  type GitHubOAuthAppProtocolOptions,
  gitHubOAuthAppProviderKey
} from "./models.ts"
import { decodeGitHubIdentity } from "./profile.ts"

const unavailable = () => OAuthUnavailable.make({})
const invalid = () => OpenIdConnectConfigurationError.make({ reason: "provider" })
// GitHub's OAuth authorization server issuer, including its RFC 9207 callback value.
const issuer = OAuthIssuer.make("https://github.com/login/oauth")

const generation = Schema.Struct({
  configurationGeneration: OAuthGeneration,
  issuance: Schema.Literals(["active", "retired"]),
  clientId: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._-]{1,256}$/)),
  clientSecret: Schema.RedactedFromValue(Schema.NonEmptyString.check(Schema.isMaxLength(4096))),
  verifiedPrimaryEmail: Schema.optionalKey(Schema.Boolean),
  callbacks: Schema.Array(
    Schema.Struct({ callbackId: OAuthCallbackId, redirectUri: OAuthRedirectUri })
  ).check(Schema.isMinLength(1), Schema.isMaxLength(16))
})

const generations = Schema.Array(generation).check(Schema.isMinLength(1), Schema.isMaxLength(64))

const connectedGenerations = Schema.Array(
  Schema.Struct({
    ...generation.fields,
    profiles: Schema.Array(OAuthConnectedProfile).check(
      Schema.isMinLength(1),
      Schema.isMaxLength(64)
    )
  })
).check(Schema.isMinLength(1), Schema.isMaxLength(64))

const timeout = Schema.Finite.check(Schema.isBetween({ minimum: 1, maximum: 30 }))

const captureResult = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  value: S["Type"]
) => {
  const codec = Schema.fromJsonString(Schema.toCodecJson(Schema.toType(schema)))

  return Schema.encodeResult(codec)(value).pipe(
    Result.flatMap(Schema.decodeResult(codec)),
    Result.map((saved) => {
      freezeOAuth(saved)

      return saved
    }),
    Result.mapError(invalid)
  )
}

const capture = Effect.fnUntraced(function*<
  S extends Schema.Codec<unknown, unknown, never, never>
>(
  schema: S,
  registrations: S["Type"],
  options: {
    readonly timeoutSeconds: number
  }
) {
  const saved = yield* resolveOptions(() => Effect.fromResult(captureResult(schema, registrations)))

  const timeoutSeconds = yield* Schema.decodeEffect(timeout)(options.timeoutSeconds).pipe(
    Effect.mapError(invalid)
  )

  return { registrations: saved, timeoutSeconds }
})

const provider = (
  registration: GitHubOAuthAppGeneration
): Omit<OpenIdConnectOAuthProvider, "scopes"> => ({
  provider: gitHubOAuthAppProviderKey,
  configurationGeneration: registration.configurationGeneration,
  issuance: registration.issuance,
  issuer,
  protocol: "oauth",
  responseIssuerMode: "required",
  clientId: registration.clientId,
  authentication: { method: "client_secret_post", secret: registration.clientSecret },
  callbacks: registration.callbacks,
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  pkceS256: true,
  [githubVerifiedPrimaryEmail]: registration.verifiedPrimaryEmail === true,
  identitySource: {
    url: "https://api.github.com/user",
    headers: githubApiHeaders,
    decodeIdentity: decodeGitHubIdentity
  }
})

const csvCell = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_:-]{1,256}$/))
const isCell = Schema.is(csvCell)

/** GitHub's receipt is comma-delimited, unlike the generic OAuth scope string. */
const scopes = Effect.fnUntraced(function*(
  receipt: string | undefined,
  expected: ReadonlyArray<string>
): Effect.fn.Return<ReadonlyArray<string>, OAuthUnavailable> {
  if (receipt === undefined || receipt.length > 16447) return yield* unavailable()

  const result = receipt === "" ? [] : receipt.split(",").map((cell) => cell.replace(/^[ \t]+|[ \t]+$/g, ""))

  if (
    result.length > 64 ||
    result.some((cell) => !isCell(cell)) ||
    new Set(result).size !== result.length ||
    result.length !== expected.length ||
    result.some((cell) => !expected.includes(cell))
  ) {
    return yield* unavailable()
  }

  return result
})

const token = Schema.NonEmptyString.check(Schema.isMaxLength(16384))
const expiry = Schema.Finite.check(Schema.isGreaterThan(0))

const receiptSchema = Schema.Struct({
  access_token: token,
  token_type: Schema.String.check(Schema.isPattern(/^[Bb][Ee][Aa][Rr][Ee][Rr]$/)),
  scope: Schema.String.check(Schema.isMaxLength(16447)),
  expires_in: Schema.optionalKey(expiry),
  refresh_token: Schema.optionalKey(token),
  refresh_token_expires_in: Schema.optionalKey(expiry)
})

// oxlint-disable-next-line no-restricted-properties -- Inspect the bounded raw receipt before the maintained parser can coerce expiry fields.
const decodeReceipt = Schema.decodeUnknownEffect(receiptSchema)

const encodeRevocation = Schema.encodeEffect(
  Schema.fromJsonString(Schema.Struct({ access_token: token }))
)

const terminalReceipt = Schema.Struct({
  error: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
  error_description: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(4096))),
  error_uri: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
})

// oxlint-disable-next-line no-restricted-properties -- Fully validate the raw terminal receipt before classifying a provider rejection.
const decodeTerminalReceipt = Schema.decodeUnknownEffect(terminalReceipt)

const successKeys = [
  "access_token",
  "token_type",
  "scope",
  "expires_in",
  "refresh_token",
  "refresh_token_expires_in",
  "id_token"
]

const compatibility: ConnectedCompatibility = Object.freeze<ConnectedCompatibility>({
  inspectReceipt: Effect.fnUntraced(function*({ body, status, contentType }, input) {
    if (contentType?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
      return yield* unavailable()
    }
    if (!Predicate.isObject(body)) return yield* unavailable()
    if (Object.hasOwn(body, "error")) {
      if (successKeys.some((key) => Object.hasOwn(body, key))) return yield* unavailable()
      const terminal = yield* decodeTerminalReceipt(body).pipe(Effect.mapError(unavailable))

      if (
        (status === 200 || status === 400) &&
        terminal.error ===
          (input.operation === "authorization_code" ? "bad_verification_code" : "bad_refresh_token")
      ) {
        return yield* OAuthProtocolRejected.make({})
      }

      return yield* unavailable()
    }
    if (
      status !== 200 ||
      ["error_description", "error_uri", "id_token"].some((key) => Object.hasOwn(body, key))
    ) {
      return yield* unavailable()
    }
    const receipt = yield* decodeReceipt(body).pipe(Effect.mapError(unavailable))

    yield* scopes(receipt.scope, input.scopes)
    if (
      input.refreshRequired &&
      (receipt.refresh_token === undefined ||
        receipt.expires_in === undefined ||
        receipt.refresh_token_expires_in === undefined)
    ) {
      return yield* unavailable()
    }
  }),
  authorizationScopes: (permissions, refresh) => refresh ? [...permissions, "offline_access"] : permissions,
  decodeScopes: scopes,
  includeRefreshScope: false
})

const revocationLayer = (options: Pick<GitHubOAuthAppConnectedProtocolOptions, "timeoutSeconds">) =>
  Layer.effect(
    ProviderRevocation,
    Effect.gen(function*() {
      const http = yield* HttpClient.HttpClient
      const fetch = yield* FetchHttpClient.Fetch

      const timeoutSeconds = options.timeoutSeconds

      return ProviderRevocation.of({
        revoke: Effect.fn("GitHubOAuthApp.revoke")(function*(input) {
          if (
            input.authentication.method !== "client_secret_post" ||
            !hasStaticSecret(input.authentication) ||
            input.context.configuration.profile.clientRegistrationId !== input.clientId ||
            input.context.identity.provider !== gitHubOAuthAppProviderKey ||
            input.context.identity.issuer !== issuer
          ) {
            return yield* unavailable()
          }
          const url = `https://api.github.com/applications/${encodeURIComponent(input.clientId)}/grant`

          const body = yield* encodeRevocation({
            access_token: Redacted.value(input.material.accessToken)
          }).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))

          const request = HttpClientRequest.delete(url).pipe(
            HttpClientRequest.setHeaders({
              ...githubApiHeaders,
              Authorization: `Basic ${
                Base64.encode(`${input.clientId}:${Redacted.value(input.authentication.secret)}`)
              }`
            }),
            HttpClientRequest.bodyText(body, "application/json")
          )

          yield* Effect.gen(function*() {
            const response = yield* HttpClient.withScope(http).execute(request)

            if (response.status !== 204 || response.url !== url) return yield* unavailable()
            yield* Stream.runFoldEffect(
              response.stream,
              () => 0,
              (length, chunk) =>
                length + chunk.byteLength > 65536
                  ? Effect.fail(unavailable())
                  : Effect.succeed(length + chunk.byteLength)
            ).pipe(
              Effect.catchCause((cause) =>
                cause.reasons.every(
                    (reason) =>
                      Cause.isFailReason(reason) &&
                      reason.error._tag === "HttpClientError" &&
                      reason.error.reason._tag === "EmptyBodyError"
                  )
                  ? Effect.succeed(0)
                  : Effect.failCause(cause)
              )
            )
          }).pipe(
            Effect.scoped,
            Effect.provideService(FetchHttpClient.Fetch, fetch),
            Effect.provideService(FetchHttpClient.RequestInit, {
              redirect: "error",
              credentials: "omit",
              cache: "no-store"
            }),
            Effect.provideService(Tracer.DisablePropagation, true),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))),
            // The connected protocol contains and reports unexpected transport defects.
            timeoutOrElseWithCause({
              duration: timeoutSeconds * 1000,
              orElse: () => Effect.fail(unavailable())
            })
          )
        })
      })
    })
  )

/** A GitHub.com OAuth App generation for the same provider list as generic OIDC.
 * Retains GitHub receipt/error rules. Requests read:user, plus user:email only
 * when verifiedPrimaryEmail is enabled; no repository access is requested.
 * Construction performs no I/O; invalid configuration throws the typed configuration error. */
export const gitHubOAuthAppProvider = (
  registration: GitHubOAuthAppGeneration
): OpenIdConnectOAuthProvider => {
  try {
    return signInProvider(Result.getOrThrowWith(captureResult(generation, registration), invalid))
  } catch {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous provider construction rejects invalid configuration; Effect callers use makeGitHubOAuthAppProvider.
    throw invalid()
  }
}

const signInProvider = (registration: GitHubOAuthAppGeneration): OpenIdConnectOAuthProvider => ({
  ...provider(registration),
  scopes: registration.verifiedPrimaryEmail === true ? ["read:user", "user:email"] : ["read:user"],
  [tokenCompatibility]: compatibility
})

/**
 * Effect callers share validation without entering the synchronous public boundary.
 *
 * @internal
 */
export const makeGitHubOAuthAppProvider = (registration: GitHubOAuthAppGeneration) =>
  resolveOptions(() => Effect.fromResult(captureResult(generation, registration))).pipe(
    Effect.map(signInProvider)
  )

/** @internal */
export const makeGitHubOAuthAppProtocol = Effect.fn("makeGitHubOAuthAppProtocol")(function*(
  options: GitHubOAuthAppProtocolOptions
) {
  const saved = yield* capture(generations, options.registrations, options)

  if (saved.registrations.filter((item) => item.issuance === "active").length !== 1) {
    return yield* invalid()
  }

  return yield* makeOpenIdConnectOAuthProtocol(
    installOAuthConfigurations({
      ...saved,
      providers: saved.registrations.map(signInProvider)
    })
  ).pipe(Effect.provide(PrivateKeyClientSecret.layerUnused))
})

/** @internal */
export const makeGitHubOAuthAppConnectedProtocol = Effect.fn("makeGitHubOAuthAppConnectedProtocol")(
  function*(options: GitHubOAuthAppConnectedProtocolOptions) {
    const saved = yield* capture(connectedGenerations, options.registrations, options)

    if (saved.registrations.filter((item) => item.issuance === "active").length !== 1) {
      return yield* invalid()
    }
    for (const registration of saved.registrations) {
      for (const profile of registration.profiles) {
        if (
          profile.provider !== gitHubOAuthAppProviderKey ||
          profile.clientRegistrationId !== registration.clientId ||
          profile.resources.length !== 0 ||
          (registration.verifiedPrimaryEmail === true && !profile.scopes.includes("user:email")) ||
          profile.scopes.some((scope) => scope === "offline_access" || !isCell(scope)) ||
          (profile.retention === "access-only"
            ? profile.refresh !== "unsupported" ||
              profile.maximumRefreshLifetimeMillis !== undefined
            : profile.refresh !== "rotating" || profile.maximumRefreshLifetimeMillis === undefined)
        ) {
          return yield* invalid()
        }
      }
    }

    return yield* makeConnectedProtocolWithCompatibility(
      installOAuthConnectedConfigurations(
        {
          ...saved,
          providers: saved.registrations.map((item) => ({
            ...provider(item),
            profiles: item.profiles,
            clientRegistrationId: item.clientId,
            resourceIndicators: "unsupported",
            refreshExpiry: { field: "refresh_token_expires_in", zero: "expired" },
            revocation: { mode: "provider-cohort" }
          }))
        },
        true
      ),
      compatibility
    ).pipe(
      Effect.provide(Layer.mergeAll(revocationLayer(saved), PrivateKeyClientSecret.layerUnused))
    )
  }
)
