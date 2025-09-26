/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as Sse from "@effect/experimental/Sse"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Generated from "./Generated.js"
import { OpenRouterConfig } from "./OpenRouterConfig.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class OpenRouterClient extends Context.Tag(
  "@effect/ai-openrouter/OpenRouterClient"
)<OpenRouterClient, Service>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * The underlying HTTP client capable of communicating with the OpenRouter API.
   *
   * This client is pre-configured with authentication, base URL, and standard
   * headers required for OpenRouter API communication. It provides direct access
   * to the generated OpenRouter API client for operations not covered by the
   * higher-level methods.
   *
   * Use this when you need to:
   * - Access provider-specific API endpoints not available through the AI SDK
   * - Implement custom request/response handling
   * - Use OpenRouter API features not yet supported by the Effect AI abstractions
   * - Perform batch operations or non-streaming requests
   *
   * The client automatically handles authentication and follows OpenRouter's
   * API conventions for request formatting and error handling.
   */
  readonly client: Generated.Client

  readonly createChatCompletion: (
    options: typeof Generated.ChatCompletionCreateParams.Encoded
  ) => Effect.Effect<Generated.ChatCompletion, AiError.AiError>

  readonly createChatCompletionStream: (
    options: Omit<typeof Generated.ChatCompletionCreateParams.Encoded, "stream">
  ) => Stream.Stream<ChatCompletionStreamEvent, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  /**
   * Optional URL of your site for rankings on `openrouter.ai`.
   */
  readonly referrer?: string | undefined
  /**
   * Optional title of your site for rankings on `openrouter.ai`.
   */
  readonly title?: string | undefined
  /**
   * A function to transform the underlying HTTP client before it's used to send
   * API requests.
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
   * Leave absent or set to `undefined` if no custom HTTP client behavior is
   * needed.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}) => Effect.Effect<Service, never, HttpClient.HttpClient> = Effect.fnUntraced(function*(options) {
  const httpClient = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.prependUrl(options.apiUrl ?? "https://openrouter.ai/api/v1"),
        options.apiKey ? HttpClientRequest.bearerToken(options.apiKey) : identity,
        options.referrer ? HttpClientRequest.setHeader("HTTP-Referrer", options.referrer) : identity,
        options.title ? HttpClientRequest.setHeader("X-Title", options.title) : identity,
        HttpClientRequest.acceptJson
      )
    ),
    options.transformClient ?? identity
  )

  const httpClientOk = HttpClient.filterStatusOk(httpClient)

  const client = Generated.make(httpClient, {
    transformClient: (client) =>
      OpenRouterConfig.getOrUndefined.pipe(
        Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
      )
  })

  const streamRequest = <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>
  ): Stream.Stream<A, AiError.AiError, R> => {
    const decodeEvent = Schema.decode(Schema.parseJson(schema))
    return httpClientOk.execute(request).pipe(
      Effect.map((r) => r.stream),
      Stream.unwrapScoped,
      Stream.decodeText(),
      Stream.pipeThroughChannel(Sse.makeChannel()),
      Stream.takeWhile((event) => event.data !== "[DONE]"),
      Stream.mapEffect((event) => decodeEvent(event.data)),
      Stream.catchTags({
        RequestError: (error) =>
          AiError.HttpRequestError.fromRequestError({
            module: "OpenRouterClient",
            method: "streamRequest",
            error
          }),
        ResponseError: (error) =>
          AiError.HttpResponseError.fromResponseError({
            module: "OpenRouterClient",
            method: "streamRequest",
            error
          }),
        ParseError: (error) =>
          AiError.MalformedOutput.fromParseError({
            module: "OpenRouterClient",
            method: "streamRequest",
            error
          })
      })
    )
  }

  const createChatCompletion: (
    options: typeof Generated.ChatCompletionCreateParams.Encoded
  ) => Effect.Effect<Generated.ChatCompletion, AiError.AiError> = Effect.fnUntraced(
    function*(options) {
      return yield* client.createChatCompletion(options).pipe(
        Effect.catchTag(
          "OpenRouterUnauthorizedError",
          "OpenRouterRateLimitError",
          "OpenRouterServerError",
          (error) =>
            new AiError.HttpResponseError({
              module: "OpenRouterClient",
              method: "createChatCompletion",
              reason: "StatusCode",
              request: {
                hash: error.request.hash,
                headers: error.request.headers,
                method: error.request.method,
                url: error.request.url,
                urlParams: error.request.urlParams
              },
              response: {
                headers: error.response.headers,
                status: error.response.status
              }
            })
        ),
        Effect.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "OpenRouterClient",
              method: "createChatCompletion",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "OpenRouterClient",
              method: "createChatCompletion",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "OpenRouterClient",
              method: "createChatCompletion",
              error
            }),
          OpenRouterInvalidRequestError: (error) =>
            new AiError.HttpRequestError({
              module: "OpenRouterClient",
              method: "createChatCompletion",
              cause: error.cause,
              reason: "Transport",
              request: {
                hash: error.request.hash,
                headers: error.request.headers,
                method: error.request.method,
                url: error.request.url,
                urlParams: error.request.urlParams
              }
            })
        })
      )
    }
  )

  const createChatCompletionStream = (
    options: Omit<typeof Generated.ChatCompletionCreateParams.Encoded, "stream">
  ): Stream.Stream<ChatCompletionStreamEvent, AiError.AiError> => {
    const request = HttpClientRequest.post("/chat/completions", {
      body: HttpBody.unsafeJson({
        ...options,
        stream: true,
        stream_options: { include_usage: true }
      })
    })
    return streamRequest(request, ChatCompletionStreamEvent)
  }

  return OpenRouterClient.of({
    client,
    createChatCompletion,
    createChatCompletionStream
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  /**
   * Optional URL of your site for rankings on `openrouter.ai`.
   */
  readonly referrer?: string | undefined
  /**
   * Optional title of your site for rankings on `openrouter.ai`.
   */
  readonly title?: string | undefined
  /**
   * A function to transform the underlying HTTP client before it's used to send
   * API requests.
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
   * Leave absent or set to `undefined` if no custom HTTP client behavior is
   * needed.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<OpenRouterClient, never, HttpClient.HttpClient> => Layer.effect(OpenRouterClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (options: {
  readonly apiKey?: Config.Config<Redacted.Redacted> | undefined
  readonly apiUrl?: Config.Config<string> | undefined
  /**
   * Optional URL of your site for rankings on `openrouter.ai`.
   */
  readonly referrer?: Config.Config<string> | undefined
  /**
   * Optional title of your site for rankings on `openrouter.ai`.
   */
  readonly title?: Config.Config<string> | undefined
  /**
   * A function to transform the underlying HTTP client before it's used to send
   * API requests.
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
   * Leave absent or set to `undefined` if no custom HTTP client behavior is
   * needed.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<OpenRouterClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.effect(OpenRouterClient)
  )
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ChatCompletionToolCallDelta extends Schema.Class<ChatCompletionToolCallDelta>(
  "@effect/ai-openrouter/ChatCompletionToolCallDelta"
)({
  index: Schema.Number,
  id: Schema.optionalWith(Schema.String, { nullable: true }),
  type: Schema.Literal("function"),
  function: Schema.Struct({
    name: Schema.optionalWith(Schema.String, { nullable: true }),
    arguments: Schema.String
  })
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ChatCompletionStreamDelta extends Schema.Class<ChatCompletionStreamDelta>(
  "@effect/ai-openrouter/ChatCompletionStreamDelta"
)({
  role: Schema.optional(Generated.ChatCompletionMessageRole),
  content: Schema.NullOr(Schema.String),
  reasoning: Schema.optionalWith(Schema.String, { nullable: true }),
  reasoning_details: Schema.optionalWith(Schema.Array(Generated.ReasoningDetail), { nullable: true }),
  tool_calls: Schema.optionalWith(Schema.Array(ChatCompletionToolCallDelta), { nullable: true }),
  images: Schema.optionalWith(Schema.Array(Generated.ChatCompletionContentPartImage), { nullable: true }),
  annotations: Schema.optionalWith(Schema.Array(Generated.AnnotationDetail), { nullable: true })
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ChatCompletionStreamDeltaEvent extends Schema.Class<ChatCompletionStreamDeltaEvent>(
  "@effect/ai-openrouter/ChatCompletionStreamDeltaEvent"
)({
  id: Schema.optionalWith(Schema.String, { nullable: true }),
  model: Schema.optionalWith(Schema.String, { nullable: true }),
  provider: Schema.optionalWith(Schema.String, { nullable: true }),
  usage: Schema.optionalWith(Generated.CompletionUsage, { nullable: true }),
  choices: Schema.Array(Schema.Struct({
    index: Schema.optionalWith(Schema.Number, { nullable: true }),
    finish_reason: Schema.NullOr(Generated.ChatCompletionChoiceFinishReason),
    delta: ChatCompletionStreamDelta,
    logprobs: Schema.optionalWith(Generated.ChatCompletionTokenLogprobs, { nullable: true })
  }))
}) {
  readonly type = "event"
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class ChatCompletionStreamErrorEvent extends Schema.Class<ChatCompletionStreamErrorEvent>(
  "@effect/ai-openrouter/ChatCompletionStreamErrorEvent"
)({ error: Generated.OpenRouterServerError.fields.error }) {
  readonly type = "error"
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const ChatCompletionStreamEvent: Schema.Union<[
  typeof ChatCompletionStreamDeltaEvent,
  typeof ChatCompletionStreamErrorEvent
]> = Schema.Union(
  ChatCompletionStreamDeltaEvent,
  ChatCompletionStreamErrorEvent
)

/**
 * @since 1.0.0
 * @category Models
 */
export type ChatCompletionStreamEvent = typeof ChatCompletionStreamEvent.Type
