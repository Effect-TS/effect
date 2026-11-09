/**
 * The `OpenAiCredentials` module provides credentials for `OpenAiClient`: a
 * static API key, or Workload Identity Federation, which exchanges an identity
 * token from the workload's own identity provider for a short-lived OpenAI
 * access token using an RFC 8693 token exchange and refreshes it before it
 * expires.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Credentials from "effect/ai/Credentials"
import * as WorkloadIdentity from "effect/ai/WorkloadIdentity"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type { OpenAiErrorMetadata, OpenAiRateLimitMetadata } from "./OpenAiError.ts"

// =============================================================================
// Service
// =============================================================================

/**
 * Credentials used by `OpenAiClient` to authenticate requests.
 *
 * @see {@link apiKey} for static API key credentials
 * @see {@link makeWorkloadIdentity} for Workload Identity Federation credentials
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export interface Service extends Credentials.Credentials {}

/**
 * Service tag for OpenAI credentials. `OpenAiClient` uses it when neither
 * `apiKey` nor `credentials` is passed in its options.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class OpenAiCredentials extends Context.Service<OpenAiCredentials, Service>()(
  "@effect/ai-openai/OpenAiCredentials"
) {}

// =============================================================================
// API key
// =============================================================================

/**
 * Credentials that send a static API key as a bearer token.
 *
 * @see {@link makeWorkloadIdentity} for Workload Identity Federation credentials
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const apiKey = (key: Redacted.Redacted<string>): Service => Credentials.bearerToken(key)

// =============================================================================
// Workload Identity Federation
// =============================================================================

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange"
const SUBJECT_TOKEN_TYPES = {
  jwt: "urn:ietf:params:oauth:token-type:jwt",
  id_token: "urn:ietf:params:oauth:token-type:id_token"
} as const
const DEFAULT_EXPIRES_IN = 3600

/**
 * The refresh policy used by default: refresh in the background from twenty
 * minutes before expiry, or halfway through the lifetime of a shorter-lived
 * token, and wait for a new token only once the old one has expired. After a
 * failed background refresh, the next one starts no sooner than five seconds
 * later.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.3
 */
export const defaultRefreshPolicy: WorkloadIdentity.RefreshPolicy = {
  advisory: (lifetime) => Duration.min(Duration.seconds(1200), Duration.millis(Duration.toMillis(lifetime) / 2)),
  mandatory: () => Duration.zero,
  advisoryFailureBackoff: Duration.seconds(5)
}

/**
 * Options for {@link makeWorkloadIdentity} and {@link layerWorkloadIdentity}.
 *
 * @stability unstable
 * @category options
 * @since 4.1.3
 */
export interface WorkloadIdentityOptions<R = never> {
  /**
   * Produces the identity token to exchange; runs again on every exchange. The
   * source's `type` selects the subject token type sent to OpenAI, so an OIDC
   * ID token needs a source created with `type: "id_token"`, for example
   * `WorkloadIdentity.fromRedacted(token, { type: "id_token" })`.
   */
  readonly identityToken: WorkloadIdentity.IdentityTokenSource<R>
  /** ID (`idp_...`) of the workload identity provider that trusts the identity token. */
  readonly identityProviderId: string
  /** ID (`svc_...`) of the service account the token acts as. */
  readonly serviceAccountId: string
  /** Client ID sent with the exchange, for identity providers that require one. */
  readonly clientId?: string | undefined
  /**
   * Token endpoint of the exchange. Must use `https`, except for `http` on `localhost`, `127.0.0.1` or `::1`.
   *
   * @default "https://auth.openai.com/oauth/token"
   */
  readonly tokenUrl?: string | undefined
  /**
   * When to refresh the access token.
   *
   * @default defaultRefreshPolicy
   */
  readonly refreshPolicy?: WorkloadIdentity.RefreshPolicy | undefined
}

const TokenResponse = Schema.Struct({
  access_token: Schema.String,
  expires_in: Schema.optional(Schema.Finite.check(Schema.isGreaterThan(0)))
})

const decodeTokenResponse = Schema.decodeUnknownOption(Schema.fromJsonString(TokenResponse))

const rejectedHint =
  "Ensure the workload identity provider trusts the identity token and that its service account mapping allows this service account."

/**
 * Credentials that authenticate with Workload Identity Federation.
 *
 * **Details**
 *
 * The identity token is exchanged lazily on the first request and again as the
 * access token nears expiry, according to `refreshPolicy`
 * (by default {@link defaultRefreshPolicy}). Exchanges are not retried.
 * Requests are sent with `Authorization: Bearer`. A request rejected with a
 * 401 is replayed once with a newly exchanged token. When the response omits
 * `expires_in`, the token is assumed to live for an hour. A token response with
 * an access token that cannot be sent in an HTTP header fails with an
 * `InvalidResponseError`.
 *
 * The exchange uses the `HttpClient` in context, not the transformed client of
 * `OpenAiClient`, so the `transformClient` option never sees the identity
 * token.
 *
 * **Gotchas**
 *
 * - An invalid or non-https `tokenUrl` is a defect.
 * - Middleware applied to the `HttpClient` in context sees the identity token,
 *   so that client must not follow redirects or log request bodies.
 *
 * @see {@link layerWorkloadIdentity} for providing the credentials as a `Layer`
 * @see {@link defaultRefreshPolicy} for the default refresh margins
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const makeWorkloadIdentity = <R = never>(
  options: WorkloadIdentityOptions<R>
): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope | R> =>
  WorkloadIdentity.makeCredentials({
    tokenUrl: options.tokenUrl ?? "https://auth.openai.com/oauth/token",
    identityToken: options.identityToken,
    request: (tokenUrl, identityToken) =>
      HttpClientRequest.post(tokenUrl).pipe(
        HttpClientRequest.acceptJson,
        HttpClientRequest.bodyJsonUnsafe({
          grant_type: GRANT_TYPE,
          subject_token: Redacted.value(identityToken.token),
          subject_token_type: SUBJECT_TOKEN_TYPES[identityToken.type],
          identity_provider_id: options.identityProviderId,
          service_account_id: options.serviceAccountId,
          ...(options.clientId ? { client_id: options.clientId } : {})
        })
      ),
    requestIdHeader: "x-request-id",
    decode: (body) => {
      const decoded = decodeTokenResponse(body)
      if (decoded._tag === "None") return Result.fail("Token endpoint returned an invalid token response")
      return Result.succeed({
        accessToken: decoded.value.access_token,
        expiresIn: decoded.value.expires_in ?? DEFAULT_EXPIRES_IN
      })
    },
    hint: (status) => status === 400 || status === 401 || status === 403 ? rejectedHint : undefined,
    policy: options.refreshPolicy ?? defaultRefreshPolicy,
    module: "OpenAiCredentials",
    metadata: (error) => ({
      openai: {
        errorCode: null,
        errorType: error.errorType ?? null,
        requestId: error.requestId ?? null
      } satisfies OpenAiErrorMetadata
    }),
    rateLimitMetadata: (error) => ({
      openai: {
        errorCode: null,
        errorType: error.errorType ?? null,
        requestId: error.requestId ?? null,
        limit: null,
        remaining: null,
        resetRequests: null,
        resetTokens: null
      } satisfies OpenAiRateLimitMetadata
    }),
    spanAttributes: {
      provider: "openai",
      identity_provider_id: options.identityProviderId,
      service_account_id: options.serviceAccountId
    }
  })

/**
 * Provides `OpenAiCredentials` using Workload Identity Federation.
 *
 * @see {@link makeWorkloadIdentity} for the behavior and options
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layerWorkloadIdentity = <R = never>(
  options: WorkloadIdentityOptions<R>
): Layer.Layer<OpenAiCredentials, never, HttpClient.HttpClient | Exclude<R, Scope.Scope>> =>
  Layer.effect(OpenAiCredentials, makeWorkloadIdentity(options))
