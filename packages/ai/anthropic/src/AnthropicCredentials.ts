/**
 * The `AnthropicCredentials` module provides credentials for
 * `AnthropicClient`: a static API key, or Workload Identity Federation, which
 * exchanges an identity token from the workload's own identity provider for a
 * short-lived Anthropic access token and refreshes it before it expires.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Credentials from "effect/ai/Credentials"
import * as WorkloadIdentity from "effect/ai/WorkloadIdentity"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import type * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type { AnthropicErrorMetadata, AnthropicRateLimitMetadata } from "./AnthropicError.ts"

// =============================================================================
// Service
// =============================================================================

/**
 * Credentials used by `AnthropicClient` to authenticate requests.
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
 * Service tag for Anthropic credentials. `AnthropicClient` uses it when
 * neither `apiKey` nor `credentials` is passed in its options.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class AnthropicCredentials extends Context.Service<AnthropicCredentials, Service>()(
  "@effect/ai-anthropic/AnthropicCredentials"
) {}

// =============================================================================
// API key
// =============================================================================

/**
 * Credentials that send a static API key in the `x-api-key` header.
 *
 * @see {@link makeWorkloadIdentity} for Workload Identity Federation credentials
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const apiKey = (key: Redacted.Redacted<string>): Service => Credentials.apiKeyHeader("x-api-key", key)

// =============================================================================
// Workload Identity Federation
// =============================================================================

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer"
const OAUTH_BETA = "oauth-2025-04-20"
const FEDERATION_BETA = "oidc-federation-2026-04-01"
const USER_AGENT = "@effect/ai-anthropic workloadIdentity"
const MAX_ASSERTION_BYTES = 16 * 1024

/**
 * The refresh policy used by default: refresh in the background from two
 * minutes before expiry and wait for a new token from thirty seconds before
 * expiry, both capped at a fraction of the token's lifetime so short-lived
 * tokens are not refreshed on every request.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.3
 */
export const defaultRefreshPolicy: WorkloadIdentity.RefreshPolicy = {
  advisory: (lifetime) => Duration.min(Duration.seconds(120), Duration.millis(Duration.toMillis(lifetime) / 2)),
  mandatory: (lifetime) => Duration.min(Duration.seconds(30), Duration.millis(Duration.toMillis(lifetime) / 4)),
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
   * Produces the identity token to exchange; runs again on every exchange.
   * Anthropic does not distinguish identity token types, so the source's
   * `type` is ignored.
   */
  readonly identityToken: WorkloadIdentity.IdentityTokenSource<R>
  /** Tagged ID (`fdrl_...`) of the federation rule to evaluate. */
  readonly federationRuleId: string
  /** UUID of the Anthropic organization. */
  readonly organizationId: string
  /** Tagged ID (`svac_...`) of the service account the token acts as. */
  readonly serviceAccountId?: string | undefined
  /**
   * Tagged ID (`wrkspc_...`) of the workspace to scope the token to. Required
   * when the federation rule is enabled for more than one workspace. The
   * workspace is fixed when the token is minted, so the
   * `anthropic-workspace-id` request header has no effect.
   */
  readonly workspaceId?: string | undefined
  /**
   * Base URL of the Anthropic API.
   *
   * @default "https://api.anthropic.com"
   */
  readonly apiUrl?: string | undefined
  /**
   * Token endpoint of the exchange. Must use `https`, except for `http` on `localhost`, `127.0.0.1` or `::1`.
   *
   * @default `${apiUrl}/v1/oauth/token`
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
  access_token: Schema.NonEmptyString,
  expires_in: Schema.Finite.check(Schema.isGreaterThan(0)),
  token_type: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.String)
})

const decodeTokenResponse = Schema.decodeUnknownOption(Schema.fromJsonString(TokenResponse))

const checkAssertionSize = (identityToken: WorkloadIdentity.IdentityToken) =>
  new TextEncoder().encode(Redacted.value(identityToken.token)).length > MAX_ASSERTION_BYTES
    ? Effect.fail(
      new WorkloadIdentity.IdentityTokenError({
        description: "Identity token exceeds the 16 KiB assertion limit"
      })
    )
    : Effect.succeed(identityToken)

const rejectedHint = (workspaceId: string | undefined): string =>
  "Ensure the federation rule matches the identity token. " +
  (workspaceId === undefined
    ? "If the rule is enabled for more than one workspace, set workspaceId or ANTHROPIC_WORKSPACE_ID. "
    : "") +
  "The Workload identity page of the Claude Console records why an exchange was denied, for example jti_reused."

const withOAuthBeta = (request: HttpClientRequest.HttpClientRequest): HttpClientRequest.HttpClientRequest => {
  const existing = request.headers["anthropic-beta"]
  if (existing === undefined || existing.trim() === "") {
    return HttpClientRequest.setHeader(request, "anthropic-beta", OAUTH_BETA)
  }
  if (existing.split(",").some((value) => value.trim() === OAUTH_BETA)) return request
  return HttpClientRequest.setHeader(request, "anthropic-beta", `${existing},${OAUTH_BETA}`)
}

/**
 * Credentials that authenticate with Workload Identity Federation.
 *
 * **Details**
 *
 * The identity token is exchanged lazily on the first request and again as the
 * access token nears expiry, according to `refreshPolicy`
 * (by default {@link defaultRefreshPolicy}). Exchanges are not
 * retried, because Anthropic accepts an identity token carrying a `jti` claim
 * only once. Requests are sent with `Authorization: Bearer` and the
 * `oauth-2025-04-20` beta. A request rejected with a 401 is replayed once with
 * a newly exchanged token. A token response with an access token that cannot
 * be sent in an HTTP header fails with an `InvalidResponseError`.
 *
 * The exchange uses the `HttpClient` in context, not the transformed client of
 * `AnthropicClient`, so the `transformClient` option never sees the identity
 * token.
 *
 * **Gotchas**
 *
 * - An invalid or non-https `tokenUrl` is a defect.
 * - Middleware applied to the `HttpClient` in context sees the identity token,
 *   so that client must not follow redirects or log request bodies.
 *
 * @see {@link layerWorkloadIdentity} for providing the credentials as a `Layer`
 * @see {@link layerWorkloadIdentityConfig} for configuring them from the environment
 * @see {@link defaultRefreshPolicy} for the default refresh margins
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const makeWorkloadIdentity = <R = never>(
  options: WorkloadIdentityOptions<R>
): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope | R> => {
  const apiUrl = options.apiUrl ?? "https://api.anthropic.com"
  return WorkloadIdentity.makeCredentials({
    tokenUrl: options.tokenUrl ?? `${apiUrl}/v1/oauth/token`,
    identityToken: Effect.flatMap(options.identityToken, checkAssertionSize),
    request: (tokenUrl, identityToken) =>
      HttpClientRequest.post(tokenUrl).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": `${OAUTH_BETA},${FEDERATION_BETA}`,
          "user-agent": USER_AGENT
        }),
        HttpClientRequest.acceptJson,
        HttpClientRequest.bodyJsonUnsafe({
          grant_type: GRANT_TYPE,
          assertion: Redacted.value(identityToken.token),
          federation_rule_id: options.federationRuleId,
          organization_id: options.organizationId,
          ...(options.serviceAccountId === undefined ? {} : { service_account_id: options.serviceAccountId }),
          ...(options.workspaceId === undefined ? {} : { workspace_id: options.workspaceId })
        })
      ),
    requestIdHeader: "request-id",
    decode: (body) => {
      const decoded = decodeTokenResponse(body)
      if (decoded._tag === "None") return Result.fail("Token endpoint returned an invalid token response")
      const { access_token, expires_in, token_type } = decoded.value
      if (token_type !== undefined && token_type.toLowerCase() !== "bearer") {
        return Result.fail("Token endpoint returned an unsupported token_type")
      }
      return Result.succeed({ accessToken: access_token, expiresIn: expires_in })
    },
    hint: (status) => status === 401 ? rejectedHint(options.workspaceId) : undefined,
    policy: options.refreshPolicy ?? defaultRefreshPolicy,
    module: "AnthropicCredentials",
    metadata: (error) => ({
      anthropic: {
        errorType: error.errorType ?? null,
        requestId: error.requestId ?? null
      } satisfies AnthropicErrorMetadata
    }),
    rateLimitMetadata: (error) => ({
      anthropic: {
        errorType: error.errorType ?? null,
        requestId: error.requestId ?? null,
        requestsLimit: null,
        requestsRemaining: null,
        requestsReset: null,
        tokensLimit: null,
        tokensRemaining: null,
        tokensReset: null
      } satisfies AnthropicRateLimitMetadata
    }),
    spanAttributes: {
      provider: "anthropic",
      federation_rule_id: options.federationRuleId,
      service_account_id: options.serviceAccountId
    },
    mapRequest: withOAuthBeta
  })
}

/**
 * Provides `AnthropicCredentials` using Workload Identity Federation.
 *
 * @see {@link makeWorkloadIdentity} for the behavior and options
 * @see {@link layerWorkloadIdentityConfig} for configuring it from the environment
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layerWorkloadIdentity = <R = never>(
  options: WorkloadIdentityOptions<R>
): Layer.Layer<AnthropicCredentials, never, HttpClient.HttpClient | Exclude<R, Scope.Scope>> =>
  Layer.effect(AnthropicCredentials, makeWorkloadIdentity(options))

// Falls back to the literal token only when the file setting is absent, so a
// failing config source is reported rather than masked.
const defaultIdentityToken = Effect.gen(function*() {
  const path = yield* Config.option(Config.String("ANTHROPIC_IDENTITY_TOKEN_FILE"))
  if (Option.isSome(path)) return WorkloadIdentity.fromFile(path.value)
  return WorkloadIdentity.fromRedacted(yield* Config.Redacted("ANTHROPIC_IDENTITY_TOKEN"))
})

/**
 * Provides `AnthropicCredentials` using Workload Identity Federation,
 * configured from the environment variables the official Anthropic SDKs read.
 *
 * **Details**
 *
 * - `ANTHROPIC_FEDERATION_RULE_ID` and `ANTHROPIC_ORGANIZATION_ID` are
 *   required.
 * - `ANTHROPIC_SERVICE_ACCOUNT_ID` and `ANTHROPIC_WORKSPACE_ID` are optional.
 * - The identity token comes from the file at `ANTHROPIC_IDENTITY_TOKEN_FILE`,
 *   reread on every exchange, or otherwise from `ANTHROPIC_IDENTITY_TOKEN`.
 *
 * Any setting can be replaced with another `Config`. `ANTHROPIC_API_KEY` and
 * profile files are not consulted.
 *
 * @see {@link layerWorkloadIdentity} for providing explicit options
 * @see {@link makeWorkloadIdentity} for the behavior
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layerWorkloadIdentityConfig = (options?: {
  readonly identityToken?: Config.Config<WorkloadIdentity.IdentityTokenSource<FileSystem.FileSystem>> | undefined
  readonly federationRuleId?: Config.Config<string> | undefined
  readonly organizationId?: Config.Config<string> | undefined
  readonly serviceAccountId?: Config.Config<string | undefined> | undefined
  readonly workspaceId?: Config.Config<string | undefined> | undefined
  readonly apiUrl?: Config.Config<string> | undefined
  readonly refreshPolicy?: WorkloadIdentity.RefreshPolicy | undefined
}): Layer.Layer<AnthropicCredentials, Config.ConfigError, HttpClient.HttpClient | FileSystem.FileSystem> =>
  Layer.effect(
    AnthropicCredentials,
    Effect.gen(function*() {
      const identityToken: WorkloadIdentity.IdentityTokenSource<FileSystem.FileSystem> =
        Predicate.isNotUndefined(options?.identityToken)
          ? yield* options.identityToken
          : yield* defaultIdentityToken
      const federationRuleId = yield* (options?.federationRuleId ?? Config.String("ANTHROPIC_FEDERATION_RULE_ID"))
      const organizationId = yield* (options?.organizationId ?? Config.String("ANTHROPIC_ORGANIZATION_ID"))
      const serviceAccountId = yield* (options?.serviceAccountId ??
        Config.String("ANTHROPIC_SERVICE_ACCOUNT_ID").pipe(Config.withDefault(undefined)))
      const workspaceId = yield* (options?.workspaceId ??
        Config.String("ANTHROPIC_WORKSPACE_ID").pipe(Config.withDefault(undefined)))
      const apiUrl = Predicate.isNotUndefined(options?.apiUrl) ? yield* options.apiUrl : undefined
      return yield* makeWorkloadIdentity({
        identityToken,
        federationRuleId,
        organizationId,
        serviceAccountId,
        workspaceId,
        apiUrl,
        refreshPolicy: options?.refreshPolicy
      })
    })
  )
