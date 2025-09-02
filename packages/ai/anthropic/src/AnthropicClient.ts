/**
 * @since 1.0.0
 */
import * as Sse from "@effect/experimental/Sse"
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import type { HttpClientError } from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { AnthropicConfig } from "./AnthropicConfig.js"
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AnthropicClient extends Context.Tag(
  "@effect/ai-anthropic/AnthropicClient"
)<AnthropicClient, Service>() {}

/**
 * Represents the interface that the `AnthropicClient` service provides.
 *
 * This service abstracts the complexity of communicating with Anthropic's API,
 * providing both high-level AI completion methods and low-level HTTP access
 * for advanced use cases.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * The underlying HTTP client capable of communicating with the Anthropic API.
   *
   * This client is pre-configured with authentication, base URL, and standard
   * headers required for Anthropic API communication. It provides direct access
   * to the generated Anthropic API client for operations not covered by the
   * higher-level methods.
   *
   * Use this when you need to:
   * - Access provider-specific API endpoints not available through the AI SDK
   * - Implement custom request/response handling
   * - Use Anthropic API features not yet supported by the Effect AI abstractions
   * - Perform batch operations or non-streaming requests
   *
   * The client automatically handles authentication and follows Anthropic's
   * API conventions for request formatting and error handling.
   */
  readonly client: Generated.Client

  readonly streamRequest: <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>
  ) => Stream.Stream<A, HttpClientError | ParseError, R>

  readonly createMessageStream: (
    options: Omit<typeof Generated.CreateMessageParams.Encoded, "stream">
  ) => Stream.Stream<MessageStreamEvent, HttpClientError | ParseError, never>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The API key that will be used to authenticate with Anthropic's API.
   *
   * The key is wrapped in a `Redacted` type to prevent accidental logging or
   * exposure in debugging output, helping maintain security best practices.
   *
   * The key is automatically included in the `x-api-key` header for all API
   * requests made through this client, which is automatically redacted in logs
   * output by Effect loggers.
   *
   * Leave `undefined` if authentication will be handled through other means
   * (e.g., environment-based authentication, proxy authentication, or when
   * using a mock server that doesn't require authentication).
   */
  readonly apiKey?: Redacted.Redacted | undefined

  /**
   * The base URL endpoint used to communicate with Anthropic's API.
   *
   * This property determines the HTTP destination for all API requests made by
   * this client.
   *
   * Defaults to `"https://api.anthropic.com"`.
   *
   * Override this value when you need to:
   * - Point to a different Anthropic environment (e.g., staging or sandbox
   *   servers).
   * - Use a proxy between your application and Anthropic's API for security,
   *   caching, or logging.
   * - Employ a mock server for local development or testing.
   *
   * You may leave this property `undefined` to accept the default value.
   */
  readonly apiUrl?: string | undefined

  /**
   * The Anthropic API version to use for requests.
   *
   * This version string determines which API schema and features are available
   * for your requests. Different versions may have different capabilities,
   * request/response formats, or available models.
   *
   * Defaults to `"2023-06-01"`.
   *
   * You should specify a version that:
   * - Supports the features and models you need
   * - Is stable and well-tested for your use case
   * - Matches your application's integration requirements
   *
   * Consult Anthropic's API documentation for available versions and their
   * differences.
   */
  readonly anthropicVersion?: string | undefined

  /**
   * The organization ID to associate with API requests.
   *
   * This identifier links requests to a specific organization within your
   * Anthropic account, enabling proper billing, usage tracking, and access
   * control at the organizational level.
   *
   * Provide this when:
   * - Your account belongs to multiple organizations
   * - You need to ensure requests are billed to the correct organization
   * - Organization-level access policies apply to your use case
   *
   * Leave `undefined` if you're using a personal account or the default
   * organization.
   */
  readonly organizationId?: Redacted.Redacted | undefined

  /**
   * The project ID to associate with API requests.
   *
   * This identifier scopes requests to a specific project within your
   * organization, enabling granular resource management, billing allocation,
   * and access control at the project level.
   *
   * Specify this when:
   * - You have multiple projects and need to separate their API usage
   * - Project-level billing or quota management is required
   * - Access policies are configured at the project level
   *
   * Leave `undefined` to use the default project or when project-level
   * scoping is not needed.
   */
  readonly projectId?: Redacted.Redacted | undefined

  /**
   * A function to transform the underlying HTTP client before it's used for API requests.
   *
   * This transformation function receives the configured HTTP client and returns
   * a modified version. It's applied after all standard client configuration
   * (authentication, base URL, headers) but before any requests are made.
   *
   * Use this for:
   * - Adding custom middleware (logging, metrics, caching)
   * - Modifying request/response processing behavior
   * - Adding custom retry logic or error handling
   * - Integrating with monitoring or debugging tools
   * - Applying organization-specific HTTP client policies
   *
   * The transformation is applied once during client initialization and affects
   * all subsequent API requests made through this client instance.
   *
   * Leave `undefined` if no custom HTTP client behavior is needed.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const apiKeyHeader = "x-api-key"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append(apiKeyHeader))

    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(
            options.apiUrl ?? "https://api.anthropic.com"
          ),
          options.apiKey
            ? HttpClientRequest.setHeader(
              apiKeyHeader,
              Redacted.value(options.apiKey)
            )
            : identity,
          HttpClientRequest.setHeader(
            "anthropic-version",
            options.anthropicVersion ?? "2023-06-01"
          ),
          HttpClientRequest.acceptJson
        )
      ),
      options.transformClient ? options.transformClient : identity
    )

    const client = Generated.make(httpClient, {
      transformClient: (client) =>
        AnthropicConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const streamRequest = <A, I, R>(
      request: HttpClientRequest.HttpClientRequest,
      schema: Schema.Schema<A, I, R>
    ): Stream.Stream<A, HttpClientError | ParseError, R> => {
      const decodeEvent = Schema.decode(Schema.parseJson(schema))
      return httpClient.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrapScoped,
        Stream.decodeText(),
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.takeUntil((event) => event.event === "message_stop"),
        Stream.mapEffect((event) => decodeEvent(event.data))
      )
    }

    const createMessageStream = (
      options: Omit<typeof Generated.CreateMessageParams.Encoded, "stream">
    ): Stream.Stream<MessageStreamEvent, HttpClientError | ParseError, never> => {
      const request = HttpClientRequest.post("/v1/messages", {
        body: HttpBody.unsafeJson({ ...options, stream: true })
      })
      return streamRequest(request, MessageStreamEvent)
    }

    return AnthropicClient.of({ client, streamRequest, createMessageStream })
  })

export class PingEvent extends Schema.Class<PingEvent>(
  "@effect/ai-anthropic/Ping"
)({
  type: Schema.Literal("ping")
}) {}

export class ErrorEvent extends Schema.Class<ErrorEvent>(
  "@effect/ai-anthropic/Error"
)({
  type: Schema.Literal("error"),
  error: Schema.Struct({
    type: Schema.Literal(
      "invalid_request_error",
      "authentication_error",
      "permission_error",
      "not_found_error",
      "request_too_large",
      "rate_limit_error",
      "api_error",
      "overloaded_error"
    ),
    message: Schema.String
  })
}) {}

export class MessageStartEvent extends Schema.Class<MessageStartEvent>(
  "@effect/ai-anthropic/MessageStartEvent"
)({
  type: Schema.Literal("message_start"),
  message: Generated.Message
}) {}

export class ServerToolUsage extends Schema.Class<ServerToolUsage>(
  "@effect/ai-anthropic/ServerToolUsage"
)({
  /**
   * The number of web search tool requests.
   */
  web_search_requests: Schema.optionalWith(
    Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
    { default: () => 0 }
  )
}) {}

export class MessageDelta extends Schema.Class<MessageDelta>(
  "@effect/ai-anthropic/MessageDelta"
)({
  stop_reason: Schema.optionalWith(
    Schema.NullOr(
      Schema.Literal(
        "end_turn",
        "max_tokens",
        "stop_sequence",
        "tool_use",
        "pause_turn",
        "refusal"
      )
    ),
    { default: () => null }
  ),
  stop_sequence: Schema.optionalWith(
    Schema.NullOr(Schema.String),
    { default: () => null }
  )
}) {}

export class MessageDeltaUsage extends Schema.Class<MessageDeltaUsage>(
  "@effect/ai-anthropic/MessageDeltaUsage"
)({
  /**
   * The cumulative number of input tokens which were used.
   */
  input_tokens: Schema.optionalWith(
    Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
    { default: () => null }
  ),
  /**
   * The cumulative number of output tokens which were used.
   */
  output_tokens: Schema.optionalWith(
    Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
    { default: () => null }
  ),
  /**
   * The cumulative number of input tokens used to create the cache entry.
   */
  cache_creation_input_tokens: Schema.optionalWith(
    Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
    { default: () => null }
  ),
  /**
   * The cumulative number of input tokens read from the cache.
   */
  cache_read_input_tokens: Schema.optionalWith(
    Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
    { default: () => null }
  ),
  /**
   * The number of server tool requests.
   */
  server_tool_use: Schema.optionalWith(
    Schema.NullOr(ServerToolUsage),
    { default: () => null }
  )
}) {}

export class MessageDeltaEvent extends Schema.Class<MessageDeltaEvent>(
  "@effect/ai-anthropic/MessageDeltaEvent"
)({
  type: Schema.Literal("message_delta"),
  delta: MessageDelta,
  /**
   * Billing and rate-limit usage.
   *
   * Anthropic's API bills and rate-limits by token counts, as tokens represent
   * the underlying cost to our systems.
   *
   * Under the hood, the API transforms requests into a format suitable for the
   * model. The model's output then goes through a parsing stage before becoming
   * an API response. As a result, the token counts in `usage` will not match
   * one-to-one with the exact visible content of an API request or response.
   *
   * For example, `output_tokens` will be non-zero, even for an empty string
   * response from Claude.\n\nTotal input tokens in a request is the summation
   * of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`.
   */
  usage: MessageDeltaUsage
}) {}

export class MessageStopEvent extends Schema.Class<MessageStopEvent>(
  "@effect/ai-anthropic/MessageStopEvent"
)({
  type: Schema.Literal("message_stop")
}) {}

export class ContentBlockStartEvent extends Schema.Class<ContentBlockStartEvent>(
  "@effect/ai-anthropic/ContentBlockStartEvent"
)({
  type: Schema.Literal("content_block_start"),
  index: Schema.Int,
  content_block: Generated.ContentBlock
}) {}

export class CitationsDelta extends Schema.Class<CitationsDelta>(
  "@effect/ai-anthropic/CitationsDelta"
)({
  type: Schema.Literal("citations_delta"),
  citation: Schema.Union(
    Generated.ResponseCharLocationCitation,
    Generated.ResponsePageLocationCitation,
    Generated.ResponseContentBlockLocationCitation,
    Generated.ResponseWebSearchResultLocationCitation,
    Generated.ResponseSearchResultLocationCitation
  )
}) {}

export class InputJsonContentBlockDelta extends Schema.Class<InputJsonContentBlockDelta>(
  "@effect/ai-anthropic/InputJsonContentBlockDelta"
)({
  type: Schema.Literal("input_json_delta"),
  partial_json: Schema.String
}) {}

export class SignatureContentBlockDelta extends Schema.Class<SignatureContentBlockDelta>(
  "@effect/ai-anthropic/SignatureContentBlockDelta"
)({
  type: Schema.Literal("signature_delta"),
  signature: Schema.String
}) {}

export class TextContentBlockDelta extends Schema.Class<TextContentBlockDelta>(
  "@effect/ai-anthropic/TextContentBlockDelta"
)({
  type: Schema.Literal("text_delta"),
  text: Schema.String
}) {}

export class ThinkingContentBlockDelta extends Schema.Class<ThinkingContentBlockDelta>(
  "@effect/ai-anthropic/ThinkingContentBlockDelta"
)({
  type: Schema.Literal("thinking_delta"),
  thinking: Schema.String
}) {}

export class ContentBlockDeltaEvent extends Schema.Class<ContentBlockDeltaEvent>(
  "@effect/ai-anthropic/ContentBlockDeltaEvent"
)({
  type: Schema.Literal("content_block_delta"),
  index: Schema.Int,
  delta: Schema.Union(
    CitationsDelta,
    InputJsonContentBlockDelta,
    SignatureContentBlockDelta,
    TextContentBlockDelta,
    ThinkingContentBlockDelta
  )
}) {}

export class ContentBlockStopEvent extends Schema.Class<ContentBlockStopEvent>(
  "@effect/ai-anthropic/ContentBlockStopEvent"
)({
  type: Schema.Literal("content_block_stop"),
  index: Schema.Int
}) {}

export const MessageStreamEvent = Schema.Union(
  PingEvent,
  ErrorEvent,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  ContentBlockStartEvent,
  ContentBlockDeltaEvent,
  ContentBlockStopEvent
)

export type MessageStreamEvent = typeof MessageStreamEvent.Type

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  /**
   * The API key that will be used to authenticate with Anthropic's API.
   *
   * The key is wrapped in a `Redacted` type to prevent accidental logging or
   * exposure in debugging output, helping maintain security best practices.
   *
   * The key is automatically included in the `x-api-key` header for all API
   * requests made through this client, which is automatically redacted in logs
   * output by Effect loggers.
   *
   * Leave `undefined` if authentication will be handled through other means
   * (e.g., environment-based authentication, proxy authentication, or when
   * using a mock server that doesn't require authentication).
   */
  readonly apiKey?: Redacted.Redacted | undefined
  /**
   * The base URL endpoint used to communicate with Anthropic's API.
   *
   * This property determines the HTTP destination for all API requests made by
   * this client.
   *
   * Defaults to `"https://api.anthropic.com"`.
   *
   * Override this value when you need to:
   * - Point to a different Anthropic environment (e.g., staging or sandbox
   *   servers).
   * - Use a proxy between your application and Anthropic's API for security,
   *   caching, or logging.
   * - Employ a mock server for local development or testing.
   *
   * You may leave this property `undefined` to accept the default value.
   */
  readonly apiUrl?: string | undefined
  /**
   * The Anthropic API version to use for requests.
   *
   * This version string determines which API schema and features are available
   * for your requests. Different versions may have different capabilities,
   * request/response formats, or available models.
   *
   * Defaults to `"2023-06-01"`.
   *
   * You should specify a version that:
   * - Supports the features and models you need
   * - Is stable and well-tested for your use case
   * - Matches your application's integration requirements
   *
   * Consult Anthropic's API documentation for available versions and their
   * differences.
   */
  readonly anthropicVersion?: string | undefined
  /**
   * A function to transform the underlying HTTP client before it's used for API requests.
   *
   * This transformation function receives the configured HTTP client and returns
   * a modified version. It's applied after all standard client configuration
   * (authentication, base URL, headers) but before any requests are made.
   *
   * Use this for:
   * - Adding custom middleware (logging, metrics, caching)
   * - Modifying request/response processing behavior
   * - Adding custom retry logic or error handling
   * - Integrating with monitoring or debugging tools
   * - Applying organization-specific HTTP client policies
   *
   * The transformation is applied once during client initialization and affects
   * all subsequent API requests made through this client instance.
   *
   * Leave `undefined` if no custom HTTP client behavior is needed.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<AnthropicClient, never, HttpClient.HttpClient> => Layer.scoped(AnthropicClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: {
    /**
     * The API key that will be used to authenticate with Anthropic's API.
     *
     * The key is wrapped in a `Redacted` type to prevent accidental logging or
     * exposure in debugging output, helping maintain security best practices.
     *
     * The key is automatically included in the `x-api-key` header for all API
     * requests made through this client, which is automatically redacted in logs
     * output by Effect loggers.
     *
     * Leave `undefined` if authentication will be handled through other means
     * (e.g., environment-based authentication, proxy authentication, or when
     * using a mock server that doesn't require authentication).
     */
    readonly apiKey?: Config.Config<Redacted.Redacted | undefined> | undefined
    /**
     * The base URL endpoint used to communicate with Anthropic's API.
     *
     * This property determines the HTTP destination for all API requests made by
     * this client.
     *
     * Defaults to `"https://api.anthropic.com"`.
     *
     * Override this value when you need to:
     * - Point to a different Anthropic environment (e.g., staging or sandbox
     *   servers).
     * - Use a proxy between your application and Anthropic's API for security,
     *   caching, or logging.
     * - Employ a mock server for local development or testing.
     *
     * You may leave this property `undefined` to accept the default value.
     */
    readonly apiUrl?: Config.Config<string | undefined> | undefined
    /**
     * The Anthropic API version to use for requests.
     *
     * This version string determines which API schema and features are available
     * for your requests. Different versions may have different capabilities,
     * request/response formats, or available models.
     *
     * Defaults to `"2023-06-01"`.
     *
     * You should specify a version that:
     * - Supports the features and models you need
     * - Is stable and well-tested for your use case
     * - Matches your application's integration requirements
     *
     * Consult Anthropic's API documentation for available versions and their
     * differences.
     */
    readonly anthropicVersion?: Config.Config<string | undefined> | undefined
    /**
     * A function to transform the underlying HTTP client before it's used for API requests.
     *
     * This transformation function receives the configured HTTP client and returns
     * a modified version. It's applied after all standard client configuration
     * (authentication, base URL, headers) but before any requests are made.
     *
     * Use this for:
     * - Adding custom middleware (logging, metrics, caching)
     * - Modifying request/response processing behavior
     * - Adding custom retry logic or error handling
     * - Integrating with monitoring or debugging tools
     * - Applying organization-specific HTTP client policies
     *
     * The transformation is applied once during client initialization and affects
     * all subsequent API requests made through this client instance.
     *
     * Leave `undefined` if no custom HTTP client behavior is needed.
     */
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
  }
): Layer.Layer<AnthropicClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.scoped(AnthropicClient)
  )
}
