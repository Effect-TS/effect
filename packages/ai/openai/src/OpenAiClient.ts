/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as Sse from "@effect/experimental/Sse"
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Generated from "./Generated.js"
import { OpenAiConfig } from "./OpenAiConfig.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class OpenAiClient extends Context.Tag(
  "@effect/ai-openai/OpenAiClient"
)<OpenAiClient, Service>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  readonly client: Generated.Client

  readonly streamRequest: <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>
  ) => Stream.Stream<A, AiError.AiError, R>

  readonly createResponse: (
    options: typeof Generated.CreateResponse.Encoded
  ) => Effect.Effect<Generated.Response, AiError.AiError>

  readonly createResponseStream: (
    options: Omit<typeof Generated.CreateResponse.Encoded, "stream">
  ) => Stream.Stream<ResponseStreamEvent, AiError.AiError>

  readonly createEmbedding: (
    options: typeof Generated.CreateEmbeddingRequest.Encoded
  ) => Effect.Effect<Generated.CreateEmbeddingResponse, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Models
 */
export type StreamCompletionRequest = Omit<typeof Generated.CreateChatCompletionRequest.Encoded, "stream">

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The API key to use to communicate with the OpenAi API.
   */
  readonly apiKey?: Redacted.Redacted | undefined
  /**
   * The URL to use to communicate with the OpenAi API.
   */
  readonly apiUrl?: string | undefined
  /**
   * The OpenAi organization identifier to use when communicating with the
   * OpenAi API.
   */
  readonly organizationId?: Redacted.Redacted | undefined
  /**
   * The OpenAi project identifier to use when communicating with the OpenAi
   * API.
   */
  readonly projectId?: Redacted.Redacted | undefined
  /**
   * A method which can be used to transform the underlying `HttpClient` which
   * will be used to communicate with the OpenAi API.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const organizationHeader = "OpenAI-Organization"
    const projectHeader = "OpenAI-Project"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.appendAll([organizationHeader, projectHeader]))

    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl ?? "https://api.openai.com/v1"),
          options.apiKey ? HttpClientRequest.bearerToken(options.apiKey) : identity,
          options.organizationId !== undefined
            ? HttpClientRequest.setHeader(organizationHeader, Redacted.value(options.organizationId))
            : identity,
          options.projectId !== undefined
            ? HttpClientRequest.setHeader(projectHeader, Redacted.value(options.projectId))
            : identity,
          HttpClientRequest.acceptJson
        )
      ),
      options.transformClient ? options.transformClient : identity
    )

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const client = Generated.make(httpClient, {
      transformClient: (client) =>
        OpenAiConfig.getOrUndefined.pipe(
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
        Stream.mapEffect((event) => decodeEvent(event.data)),
        Stream.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "OpenAiClient",
              method: "streamRequest",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "OpenAiClient",
              method: "streamRequest",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "OpenAiClient",
              method: "streamRequest",
              error
            })
        })
      )
    }

    const createResponse = (
      options: typeof Generated.CreateResponse.Encoded
    ): Effect.Effect<Generated.Response, AiError.AiError> =>
      client.createResponse(options).pipe(
        Effect.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "OpenAiClient",
              method: "createResponse",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "OpenAiClient",
              method: "createResponse",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "OpenAiClient",
              method: "createResponse",
              error
            })
        })
      )

    const createResponseStream = (
      options: Omit<typeof Generated.CreateResponse.Encoded, "stream">
    ): Stream.Stream<ResponseStreamEvent, AiError.AiError> => {
      const request = HttpClientRequest.post("/responses", {
        body: HttpBody.unsafeJson({ ...options, stream: true })
      })
      return streamRequest(request, ResponseStreamEvent).pipe(
        Stream.takeUntil((event) => event.type === "response.completed" || event.type === "response.incomplete")
      )
    }

    const createEmbedding = (
      options: typeof Generated.CreateEmbeddingRequest.Encoded
    ): Effect.Effect<Generated.CreateEmbeddingResponse, AiError.AiError> =>
      client.createEmbedding(options).pipe(
        Effect.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "OpenAiClient",
              method: "createResponse",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "OpenAiClient",
              method: "createResponse",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "OpenAiClient",
              method: "createResponse",
              error
            })
        })
      )

    return OpenAiClient.of({
      client,
      streamRequest,
      createResponse,
      createResponseStream,
      createEmbedding
    })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  readonly organizationId?: Redacted.Redacted | undefined
  readonly projectId?: Redacted.Redacted | undefined
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
}): Layer.Layer<OpenAiClient, never, HttpClient.HttpClient> => Layer.scoped(OpenAiClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: {
    readonly apiKey?: Config.Config<Redacted.Redacted | undefined> | undefined
    readonly apiUrl?: Config.Config<string | undefined> | undefined
    readonly organizationId?: Config.Config<Redacted.Redacted | undefined> | undefined
    readonly projectId?: Config.Config<Redacted.Redacted | undefined> | undefined
    readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
  }
): Layer.Layer<OpenAiClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.scoped(OpenAiClient)
  )
}

// =============================================================================
// Response Stream Schema
// =============================================================================

/**
 * An event that is emitted when a response is created.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCreatedEvent extends Schema.Class<ResponseCreatedEvent>(
  "@effect/ai-openai/ResponseCreatedEvent"
)({
  /**
   * The type of the event. Always `"response.created"`.
   */
  type: Schema.Literal("response.created"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The response that was created.
   */
  response: Generated.Response
}) {}

/**
 * Emitted when a response is queued and waiting to be processed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseQueuedEvent extends Schema.Class<ResponseQueuedEvent>(
  "@effect/ai-openai/ResponseQueuedEvent"
)({
  /**
   * The type of the event. Always `"response.queued"`.
   */
  type: Schema.Literal("response.queued"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The full response object that is queued.
   */
  response: Generated.Response
}) {}

/**
 * Emitted when the response is in progress.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseInProgressEvent extends Schema.Class<ResponseInProgressEvent>(
  "@effect/ai-openai/ResponseInProgressEvent"
)({
  /**
   * The type of the event. Always `"response.in_progress"`.
   */
  type: Schema.Literal("response.in_progress"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The response that is in progress.
   */
  response: Generated.Response
}) {}

/**
 * Emitted when the model response is complete.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCompletedEvent extends Schema.Class<ResponseCompletedEvent>(
  "@effect/ai-openai/ResponseCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.completed"`.
   */
  type: Schema.Literal("response.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * Properties of the completed response.
   */
  response: Generated.Response
}) {}

/**
 * An event that is emitted when a response finishes as incomplete.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseIncompleteEvent extends Schema.Class<ResponseIncompleteEvent>(
  "@effect/ai-openai/ResponseIncompleteEvent"
)({
  /**
   * The type of the event. Always `"response.incomplete"`.
   */
  type: Schema.Literal("response.incomplete"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The response that was incomplete.
   */
  response: Generated.Response
}) {}

/**
 * An event that is emitted when a response fails.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseFailedEvent extends Schema.Class<ResponseFailedEvent>(
  "@effect/ai-openai/ResponseFailedEvent"
)({
  /**
   * The type of the event. Always `"response.failed"`.
   */
  type: Schema.Literal("response.failed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The response that failed.
   */
  response: Generated.Response
}) {}

const WebSearchToolCallForAddEvent = Schema.asSchema(
  Generated.WebSearchToolCall.pipe(
    Schema.omit("action")
  )
)

const AddEventOutputItem = Schema.Union(
  Generated.OutputItem,
  WebSearchToolCallForAddEvent
)

/**
 * Emitted when a new output item is added.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseOutputItemAddedEvent extends Schema.Class<ResponseOutputItemAddedEvent>(
  "@effect/ai-openai/ResponseOutputItemAddedEvent"
)({
  /**
   * The type of the event. Always `"response.output_item.added"`.
   */
  type: Schema.Literal("response.output_item.added"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that was added.
   */
  output_index: Schema.Int,
  /**
   * The output item that was added.
   */
  item: AddEventOutputItem
}) {}

/**
 * Emitted when an output item is marked done.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseOutputItemDoneEvent extends Schema.Class<ResponseOutputItemDoneEvent>(
  "@effect/ai-openai/ResponseOutputItemDoneEvent"
)({
  /**
   * The type of the event. Always `"response.output_item.done"`.
   */
  type: Schema.Literal("response.output_item.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that was marked done.
   */
  output_index: Schema.Int,
  /**
   * The output item that was marked done.
   */
  item: Generated.OutputItem
}) {}

/**
 * Emitted when a new content part is added.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseContentPartAddedEvent extends Schema.Class<ResponseContentPartAddedEvent>(
  "@effect/ai-openai/ResponseContentPartAddedEvent"
)({
  /**
   * The type of the event. Always `"response.content_part.added"`.
   */
  type: Schema.Literal("response.content_part.added"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the content part was added to.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part that was added.
   */
  content_index: Schema.Int,
  /**
   * The ID of the output item that the content part was added to.
   */
  item_id: Schema.String,
  /**
   * The content part that was added.
   */
  part: Schema.Union(
    Generated.OutputTextContent,
    Generated.RefusalContent,
    Generated.ReasoningTextContent
  )
}) {}

/**
 * Emitted when a content part is done.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseContentPartDoneEvent extends Schema.Class<ResponseContentPartDoneEvent>(
  "@effect/ai-openai/ResponseContentPartDoneEvent"
)({
  /**
   * The type of the event. Always `"response.content_part.done"`.
   */
  type: Schema.Literal("response.content_part.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the content part was added to.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part that is done.
   */
  content_index: Schema.Int,
  /**
   * The ID of the output item that the content part was added to.
   */
  item_id: Schema.String,
  /**
   * The content part that was added.
   */
  part: Schema.Union(
    Generated.OutputTextContent,
    Generated.RefusalContent,
    Generated.ReasoningTextContent
  )
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class LogProbs extends Schema.Class<LogProbs>(
  "@effect/ai-openai/LogProbs"
)({
  /**
   * The log probability of this token.
   */
  logprob: Schema.Number,
  /**
   * A possible text token.
   */
  token: Schema.String,
  /**
   * The log probability of the top 20 most likely tokens.
   */
  top_logprobs: Schema.Array(Schema.Struct({
    /**
     * The log probability of this token.
     */
    logprob: Schema.Number,
    /**
     * A possible text token.
     */
    token: Schema.String
  }))
}) {}

/**
 * Emitted when there is an additional text delta.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseOutputTextDeltaEvent extends Schema.Class<ResponseOutputTextDeltaEvent>(
  "@effect/ai-openai/ResponseOutputTextDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.output_text.delta"`.
   */
  type: Schema.Literal("response.output_text.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the text delta was added to.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part that the text delta was added to.
   */
  content_index: Schema.Int,
  /**
   * The ID of the output item that the text delta was added to.
   */
  item_id: Schema.String,
  /**
   * The text delta that was added.
   */
  delta: Schema.String,
  /**
   * The log probabilities of the tokens in the delta.
   */
  logprobs: Schema.optional(Schema.NullOr(Schema.Array(LogProbs)))
}) {}

/**
 * Emitted when text content is finalized.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseOutputTextDoneEvent extends Schema.Class<ResponseOutputTextDoneEvent>(
  "@effect/ai-openai/ResponseOutputTextDoneEvent"
)({
  /**
   * The type of the event. Always `"response.output_text.done"`.
   */
  type: Schema.Literal("response.output_text.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the text content is finalized.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part that the text content is finalized.
   */
  content_index: Schema.Int,
  /**
   * The ID of the output item that the text content is finalized.
   */
  item_id: Schema.String,
  /**
   * The text content that is finalized.
   */
  text: Schema.String,
  /**
   * The log probabilities of the tokens in the delta.
   */
  logprobs: Schema.optional(Schema.NullOr(Schema.Array(LogProbs)))
}) {}

/**
 * Emitted when an annotation is added to output text content.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseOutputTextAnnotationAddedEvent extends Schema.Class<ResponseOutputTextAnnotationAddedEvent>(
  "@effect/ai-openai/ResponseOutputTextAnnotationAddedEvent"
)({
  /**
   * The type of the event. Always `"response.output_text.annotation.added"`.
   */
  type: Schema.Literal("response.output_text.annotation.added"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response's output array.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part within the output item.
   */
  content_index: Schema.Int,
  /**
   * The index of the annotation within the content part.
   */
  annotation_index: Schema.Int,
  /**
   * The unique identifier of the item to which the annotation is being added.
   */
  item_id: Schema.String,
  /**
   * The annotation object being added. (See annotation schema for details.)
   */
  annotation: Generated.Annotation
}) {}

/**
 * Emitted when there is a partial refusal text.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseRefusalDeltaEvent extends Schema.Class<ResponseRefusalDeltaEvent>(
  "@effect/ai-openai/ResponseRefusalDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.refusal.delta"`.
   */
  type: Schema.Literal("response.refusal.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the refusal text is added to.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part that the refusal text is added to.
   */
  content_index: Schema.Int,
  /**
   * The ID of the output item that the refusal text is added to.
   */
  item_id: Schema.String,
  /**
   * The refusal text that is added.
   */
  delta: Schema.String
}) {}

/**
 * Emitted when refusal text is finalized.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseRefusalDoneEvent extends Schema.Class<ResponseRefusalDoneEvent>(
  "@effect/ai-openai/ResponseRefusalDoneEvent"
)({
  /**
   * The type of the event. Always `"response.refusal.done"`.
   */
  type: Schema.Literal("response.refusal.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the refusal text is finalized.
   */
  output_index: Schema.Int,
  /**
   * The index of the content part that the refusal text is finalized.
   */
  content_index: Schema.Int,
  /**
   * The index of the output item that the refusal text is added to.
   */
  item_id: Schema.String,
  /**
   * The refusal text that is finalized.
   */
  refusal: Schema.String
}) {}

/**
 * Emitted when there is a partial function-call arguments delta.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseFunctionCallArgumentsDeltaEvent extends Schema.Class<ResponseFunctionCallArgumentsDeltaEvent>(
  "@effect/ai-openai/ResponseFunctionCallArgumentsDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.function_call_arguments.delta"`.
   */
  type: Schema.Literal("response.function_call_arguments.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the function-call arguments delta is added to.
   */
  output_index: Schema.Int,
  /**
   * The ID of the output item that the function-call arguments delta is added to.
   */
  item_id: Schema.String,
  /**
   * The function-call arguments delta that is added.
   */
  delta: Schema.String
}) {}

/**
 * Emitted when function-call arguments are finalized.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseFunctionCallArgumentsDoneEvent extends Schema.Class<ResponseFunctionCallArgumentsDoneEvent>(
  "@effect/ai-openai/ResponseFunctionCallArgumentsDoneEvent"
)({
  /**
   * The type of the event. Always `"response.function_call_arguments.done"`.
   */
  type: Schema.Literal("response.function_call_arguments.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item.
   */
  item_id: Schema.String,
  /**
   * The function-call arguments.
   */
  arguments: Schema.String
}) {}

/**
 * Emitted when a file search call is initiated.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseFileSearchCallInProgressEvent extends Schema.Class<ResponseFileSearchCallInProgressEvent>(
  "@effect/ai-openai/ResponseFileSearchCallInProgressEvent"
)({
  /**
   * The type of the event. Always `"response.file_search_call.in_progress"`.
   */
  type: Schema.Literal("response.file_search_call.in_progress"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the file search call is initiated.
   */
  output_index: Schema.Int,
  /**
   * The ID of the output item that the file search call is initiated.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a file search is currently searching.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseFileSearchCallSearchingEvent extends Schema.Class<ResponseFileSearchCallSearchingEvent>(
  "@effect/ai-openai/ResponseFileSearchCallSearchingEvent"
)({
  /**
   * The type of the event. Always `"response.file_search_call.searching"`.
   */
  type: Schema.Literal("response.file_search_call.searching"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the file search call is searching.
   */
  output_index: Schema.Int,
  /**
   * The ID of the output item that the file search call is initiated.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a file search call is completed (results found).
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseFileSearchCallCompletedEvent extends Schema.Class<ResponseFileSearchCallCompletedEvent>(
  "@effect/ai-openai/ResponseFileSearchCallCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.file_search_call.completed"`.
   */
  type: Schema.Literal("response.file_search_call.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the file search call is initiated.
   */
  output_index: Schema.Int,
  /**
   * The ID of the output item that the file search call is initiated.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a web search call is initiated.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseWebSearchCallInProgressEvent extends Schema.Class<ResponseWebSearchCallInProgressEvent>(
  "@effect/ai-openai/ResponseWebSearchCallInProgressEvent"
)({
  /**
   * The type of the event. Always `"response.web_search_call.in_progress"`.
   */
  type: Schema.Literal("response.web_search_call.in_progress"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the web search call is associated with.
   */
  output_index: Schema.Int,
  /**
   * Unique ID for the output item associated with the web search call.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a web search call is executing.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseWebSearchCallSearchingEvent extends Schema.Class<ResponseWebSearchCallSearchingEvent>(
  "@effect/ai-openai/ResponseWebSearchCallSearchingEvent"
)({
  /**
   * The type of the event. Always `"response.web_search_call.searching"`.
   */
  type: Schema.Literal("response.web_search_call.searching"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the web search call is associated with.
   */
  output_index: Schema.Int,
  /**
   * Unique ID for the output item associated with the web search call.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a web search call is completed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseWebSearchCallCompletedEvent extends Schema.Class<ResponseWebSearchCallCompletedEvent>(
  "@effect/ai-openai/ResponseWebSearchCallCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.web_search_call.completed"`.
   */
  type: Schema.Literal("response.web_search_call.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that the web search call is associated with.
   */
  output_index: Schema.Int,
  /**
   * Unique ID for the output item associated with the web search call.
   */
  item_id: Schema.String
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class SummaryPart extends Schema.Class<SummaryPart>(
  "@effect/ai-openai/SummaryPart"
)({
  /**
   * The type of the summary part. Always `"summary_text"`.
   */
  type: Schema.Literal("summary_text"),
  /**
   * The text of the summary part.
   */
  text: Schema.String
}) {}

/**
 * Emitted when a reasoning summary part is completed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseReasoningSummaryPartAddedEvent extends Schema.Class<ResponseReasoningSummaryPartAddedEvent>(
  "@effect/ai-openai/ResponseReasoningSummaryPartAddedEvent"
)({
  /**
   * The type of the event. Always `"response.reasoning_summary_part.added"`.
   */
  type: Schema.Literal("response.reasoning_summary_part.added"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the summary part within the reasoning summary.
   */
  summary_index: Schema.Int,
  /**
   * The index of the output item this summary part is associated with.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item this summary part is associated with.
   */
  item_id: Schema.String,
  /**
   * The summary part that was added.
   */
  part: SummaryPart
}) {}

/**
 * Emitted when a new reasoning summary part is added.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseReasoningSummaryPartDoneEvent extends Schema.Class<ResponseReasoningSummaryPartDoneEvent>(
  "@effect/ai-openai/ResponseReasoningSummaryPartDoneEvent"
)({
  /**
   * The type of the event. Always `"response.reasoning_summary_part.done"`.
   */
  type: Schema.Literal("response.reasoning_summary_part.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the summary part within the reasoning summary.
   */
  summary_index: Schema.Int,
  /**
   * The index of the output item this summary part is associated with.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item this summary part is associated with.
   */
  item_id: Schema.String,
  /**
   * The completed summary part.
   */
  part: SummaryPart
}) {}

/**
 * Emitted when a delta is added to a reasoning summary text.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseReasoningSummaryTextDeltaEvent extends Schema.Class<ResponseReasoningSummaryTextDeltaEvent>(
  "@effect/ai-openai/ResponseReasoningSummaryTextDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.reasoning_summary_text.delta"`.
   */
  type: Schema.Literal("response.reasoning_summary_text.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the summary part within the reasoning summary.
   */
  summary_index: Schema.Int,
  /**
   * The index of the output item this summary text delta is associated with.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item this summary text delta is associated with.
   */
  item_id: Schema.String,
  /**
   * The text delta that was added to the summary.
   */
  delta: Schema.String
}) {}

/**
 * Emitted when a reasoning summary text is completed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseReasoningSummaryTextDoneEvent extends Schema.Class<ResponseReasoningSummaryTextDoneEvent>(
  "@effect/ai-openai/ResponseReasoningSummaryTextDoneEvent"
)({
  /**
   * The type of the event. Always `"response.reasoning_summary_text.done"`.
   */
  type: Schema.Literal("response.reasoning_summary_text.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the summary part within the reasoning summary.
   */
  summary_index: Schema.Int,
  /**
   * The index of the output item this summary text is associated with.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item this summary text is associated with.
   */
  item_id: Schema.String,
  /**
   * The full text of the completed reasoning summary.
   */
  text: Schema.String
}) {}

/**
 * Emitted when a delta is added to a reasoning text.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseReasoningTextDeltaEvent extends Schema.Class<ResponseReasoningTextDeltaEvent>(
  "@effect/ai-openai/ResponseReasoningTextDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.reasoning_text.delta"`.
   */
  type: Schema.Literal("response.reasoning_text.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the reasoning content part this delta is associated with.
   */
  content_index: Schema.Int,
  /**
   * The index of the output item this reasoning text delta is associated with.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item this reasoning text delta is associated with.
   */
  item_id: Schema.String,
  /**
   * The text delta that was added to the reasoning content.
   */
  delta: Schema.String
}) {}

/**
 * Emitted when a reasoning text is completed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseReasoningTextDoneEvent extends Schema.Class<ResponseReasoningTextDoneEvent>(
  "@effect/ai-openai/ResponseReasoningPartDoneEvent"
)({
  /**
   * The type of the event. Always `"response.reasoning_text.done"`.
   */
  type: Schema.Literal("response.reasoning_text.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the reasoning content part.
   */
  content_index: Schema.Int,
  /**
   * The index of the output item this reasoning text is associated with.
   */
  output_index: Schema.Int,
  /**
   * The ID of the item this reasoning text is associated with.
   */
  item_id: Schema.String,
  /**
   * The full text of the completed reasoning content.
   */
  text: Schema.String
}) {}

/**
 * Emitted when an image generation tool call is in progress.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseImageGenerationCallInProgressEvent
  extends Schema.Class<ResponseImageGenerationCallInProgressEvent>(
    "@effect/ai-openai/ResponseImageGenerationCallInProgressEvent"
  )({
    /**
     * The type of the event. Always `"response.image_generation_call.in_progress"`.
     */
    type: Schema.Literal("response.image_generation_call.in_progress"),
    /**
     * The sequence number for this event.
     */
    sequence_number: Schema.Int,
    /**
     * The index of the output item in the response's output array.
     */
    output_index: Schema.Int,
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: Schema.String
  })
{}

/**
 * Emitted when an image generation tool call is actively generating an image
 * (intermediate state).
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseImageGenerationCallGeneratingEvent
  extends Schema.Class<ResponseImageGenerationCallGeneratingEvent>(
    "@effect/ai-openai/ResponseImageGenerationCallGeneratingEvent"
  )({
    /**
     * The type of the event. Always `"response.image_generation_call.generating"`.
     */
    type: Schema.Literal("response.image_generation_call.generating"),
    /**
     * The sequence number for this event.
     */
    sequence_number: Schema.Int,
    /**
     * The index of the output item in the response's output array.
     */
    output_index: Schema.Int,
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: Schema.String
  })
{}

/**
 * Emitted when a partial image is available during image generation streaming.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseImageGenerationCallPartialImageEvent
  extends Schema.Class<ResponseImageGenerationCallPartialImageEvent>(
    "@effect/ai-openai/ResponseImageGenerationCallPartialImageEvent"
  )({
    /**
     * The type of the event. Always `"response.image_generation_call.partial_image"`.
     */
    type: Schema.Literal("response.image_generation_call.partial_image"),
    /**
     * The sequence number for this event.
     */
    sequence_number: Schema.Int,
    /**
     * The index of the output item in the response's output array.
     */
    output_index: Schema.Int,
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: Schema.String,
    /**
     * `0`-based index for the partial image (backend is `1`-based, but this is
     * `0`-based for the user).
     */
    partial_image_index: Schema.Int,
    /**
     * Base64-encoded partial image data, suitable for rendering as an image.
     */
    partial_image_b64: Schema.String
  })
{}

/**
 * Emitted when an image generation tool call has completed and the final image
 * is available.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseImageGenerationCallCompletedEvent extends Schema.Class<ResponseImageGenerationCallCompletedEvent>(
  "@effect/ai-openai/ResponseImageGenerationCallCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.image_generation_call.completed"`.
   */
  type: Schema.Literal("response.image_generation_call.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response's output array.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the image generation item being processed.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when there is a delta (partial update) to the arguments of an MCP
 * tool call.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpCallArgumentsDeltaEvent extends Schema.Class<ResponseMcpCallArgumentsDeltaEvent>(
  "@effect/ai-openai/ResponseMcpCallArgumentsDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_call_arguments.delta"`.
   */
  type: Schema.Literal("response.mcp_call_arguments.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response's output array.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the MCP tool call item being processed.
   */
  item_id: Schema.String,
  /**
   * A JSON string containing the partial update to the arguments for the MCP
   * tool call.
   */
  delta: Schema.String
}) {}

/**
 * Emitted when the arguments for an MCP tool call are finalized.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpCallArgumentsDoneEvent extends Schema.Class<ResponseMcpCallArgumentsDoneEvent>(
  "@effect/ai-openai/ResponseMcpCallArgumentsDoneEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_call_arguments.done"`.
   */
  type: Schema.Literal("response.mcp_call_arguments.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response's output array.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the MCP tool call item being processed.
   */
  item_id: Schema.String,
  /**
   * A JSON string containing the finalized arguments for the MCP tool call.
   */
  arguments: Schema.String
}) {}

/**
 * Emitted when an MCP tool call is in progress.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpCallInProgressEvent extends Schema.Class<ResponseMcpCallInProgressEvent>(
  "@effect/ai-openai/ResponseMcpCallInProgressEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_call.in_progress"`.
   */
  type: Schema.Literal("response.mcp_call.in_progress"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response's output array.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the MCP tool call item being processed.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when an MCP tool call has completed successfully.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpCallCompletedEvent extends Schema.Class<ResponseMcpCallCompletedEvent>(
  "@effect/ai-openai/ResponseMcpCallCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_call.completed"`.
   */
  type: Schema.Literal("response.mcp_call.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that completed.
   */
  output_index: Schema.Int,
  /**
   * The ID of the MCP tool call item that completed.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when an MCP tool call has failed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpCallFailedEvent extends Schema.Class<ResponseMcpCallFailedEvent>(
  "@effect/ai-openai/ResponseMcpCallFailedEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_call.failed"`.
   */
  type: Schema.Literal("response.mcp_call.failed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that failed.
   */
  output_index: Schema.Int,
  /**
   * The ID of the MCP tool call item that failed.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when the system is in the process of retrieving the list of available
 * MCP tools.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpListToolsInProgressEvent extends Schema.Class<ResponseMcpListToolsInProgressEvent>(
  "@effect/ai-openai/ResponseMcpListToolsInProgressEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_list_tools.in_progress"`.
   */
  type: Schema.Literal("response.mcp_list_tools.in_progress"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that is being processed.
   */
  output_index: Schema.Int,
  /**
   * The ID of the MCP tool call item that is being processed.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when the list of available MCP tools has been successfully retrieved.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpListToolsCompletedEvent extends Schema.Class<ResponseMcpListToolsCompletedEvent>(
  "@effect/ai-openai/ResponseMcpListToolsCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_list_tools.completed"`.
   */
  type: Schema.Literal("response.mcp_list_tools.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that was processed.
   */
  output_index: Schema.Int,
  /**
   * The ID of the MCP tool call item that produced this output.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when the attempt to list available MCP tools has failed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseMcpListToolsFailedEvent extends Schema.Class<ResponseMcpListToolsFailedEvent>(
  "@effect/ai-openai/ResponseMcpListToolsFailedEvent"
)({
  /**
   * The type of the event. Always `"response.mcp_list_tools.failed"`.
   */
  type: Schema.Literal("response.mcp_list_tools.failed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item that failed.
   */
  output_index: Schema.Int,
  /**
   * The ID of the MCP tool call item that failed.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a code interpreter call is in progress.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCodeInterpreterCallInProgressEvent
  extends Schema.Class<ResponseCodeInterpreterCallInProgressEvent>(
    "@effect/ai-openai/ResponseCodeInterpreterCallInProgressEvent"
  )({
    /**
     * The type of the event. Always `"response.code_interpreter_call.in_progress"`.
     */
    type: Schema.Literal("response.code_interpreter_call.in_progress"),
    /**
     * The sequence number for this event.
     */
    sequence_number: Schema.Int,
    /**
     * The index of the output item in the response for which the code interpreter
     * call is in progress.
     */
    output_index: Schema.Int,
    /**
     * The unique identifier of the code interpreter tool call item.
     */
    item_id: Schema.String
  })
{}

/**
 * Emitted when the code interpreter is actively interpreting the code snippet.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCodeInterpreterCallInterpretingEvent
  extends Schema.Class<ResponseCodeInterpreterCallInterpretingEvent>(
    "@effect/ai-openai/ResponseCodeInterpreterCallInterpretingEvent"
  )({
    /**
     * The type of the event. Always `"response.code_interpreter_call.interpreting"`.
     */
    type: Schema.Literal("response.code_interpreter_call.interpreting"),
    /**
     * The sequence number for this event.
     */
    sequence_number: Schema.Int,
    /**
     * The index of the output item in the response for which the code
     * interpreter is interpreting code.
     */
    output_index: Schema.Int,
    /**
     * The unique identifier of the code interpreter tool call item.
     */
    item_id: Schema.String
  })
{}

/**
 * Emitted when the code interpreter call is completed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCodeInterpreterCallCompletedEvent extends Schema.Class<ResponseCodeInterpreterCallCompletedEvent>(
  "@effect/ai-openai/ResponseCodeInterpreterCallCompletedEvent"
)({
  /**
   * The type of the event. Always `"response.code_interpreter_call.completed"`.
   */
  type: Schema.Literal("response.code_interpreter_call.completed"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response for which the code interpreter
   * call is completed.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the code interpreter tool call item.
   */
  item_id: Schema.String
}) {}

/**
 * Emitted when a partial code snippet is streamed by the code interpreter.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCodeInterpreterCallCodeDeltaEvent extends Schema.Class<ResponseCodeInterpreterCallCodeDeltaEvent>(
  "@effect/ai-openai/ResponseCodeInterpreterCallCodeDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.code_interpreter_call_code.delta"`.
   */
  type: Schema.Literal("response.code_interpreter_call_code.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response for which the code is being
   * streamed.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the code interpreter tool call item.
   */
  item_id: Schema.String,
  /**
   * The partial code snippet being streamed by the code interpreter.
   */
  delta: Schema.String
}) {}

/**
 * Emitted when the code snippet is finalized by the code interpreter.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCodeInterpreterCallCodeDoneEvent extends Schema.Class<ResponseCodeInterpreterCallCodeDoneEvent>(
  "@effect/ai-openai/ResponseCodeInterpreterCallCodeDoneEvent"
)({
  /**
   * The type of the event. Always `"response.code_interpreter_call_code.done"`.
   */
  type: Schema.Literal("response.code_interpreter_call_code.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output item in the response for which the code is finalized.
   */
  output_index: Schema.Int,
  /**
   * The unique identifier of the code interpreter tool call item.
   */
  item_id: Schema.String,
  /**
   * The final code snippet output by the code interpreter.
   */
  code: Schema.String
}) {}

/**
 * Event representing a delta (partial update) to the input of a custom tool call.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCustomToolCallInputDeltaEvent extends Schema.Class<ResponseCustomToolCallInputDeltaEvent>(
  "@effect/ai-openai/ResponseCustomToolCallInputDeltaEvent"
)({
  /**
   * The type of the event. Always `"response.custom_tool_call_input.delta"`.
   */
  type: Schema.Literal("response.custom_tool_call_input.delta"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output this delta applies to.
   */
  output_index: Schema.Int,
  /**
   * Unique identifier for the API item associated with this event.
   */
  item_id: Schema.String,
  /**
   * The incremental input data (delta) for the custom tool call.
   */
  delta: Schema.String
}) {}

/**
 * Event indicating that input for a custom tool call is complete.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseCustomToolCallInputDoneEvent extends Schema.Class<ResponseCustomToolCallInputDoneEvent>(
  "@effect/ai-openai/ResponseCustomToolCallInputDoneEvent"
)({
  /**
   * The type of the event. Always `"response.custom_tool_call_input.done"`.
   */
  type: Schema.Literal("response.custom_tool_call_input.done"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The index of the output this event applies to.
   */
  output_index: Schema.Int,
  /**
   * Unique identifier for the API item associated with this event.
   */
  item_id: Schema.String,
  /**
   * The complete input data for the custom tool call.
   */
  input: Schema.String
}) {}

/**
 * Emitted when an error occurs.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class ResponseErrorEvent extends Schema.Class<ResponseErrorEvent>(
  "@effect/ai-openai/ResponseErrorEvent"
)({
  /**
   * The type of the event. Always `"error"`.
   */
  type: Schema.Literal("error"),
  /**
   * The sequence number for this event.
   */
  sequence_number: Schema.Int,
  /**
   * The error code.
   */
  code: Schema.optional(Schema.NullOr(Schema.String)),
  /**
   * The error message.
   */
  message: Schema.String,
  /**
   * The error parameter.
   */
  param: Schema.optional(Schema.NullOr(Schema.String))
}) {}

/**
 * Represents the events that can be emitted during a streaming response.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ResponseStreamEvent: Schema.Union<[
  typeof ResponseCreatedEvent,
  typeof ResponseQueuedEvent,
  typeof ResponseInProgressEvent,
  typeof ResponseCompletedEvent,
  typeof ResponseIncompleteEvent,
  typeof ResponseFailedEvent,
  typeof ResponseOutputItemAddedEvent,
  typeof ResponseOutputItemDoneEvent,
  typeof ResponseContentPartAddedEvent,
  typeof ResponseContentPartDoneEvent,
  typeof ResponseOutputTextDeltaEvent,
  typeof ResponseOutputTextDoneEvent,
  typeof ResponseOutputTextAnnotationAddedEvent,
  typeof ResponseRefusalDeltaEvent,
  typeof ResponseRefusalDoneEvent,
  typeof ResponseFunctionCallArgumentsDeltaEvent,
  typeof ResponseFunctionCallArgumentsDoneEvent,
  typeof ResponseFileSearchCallInProgressEvent,
  typeof ResponseFileSearchCallSearchingEvent,
  typeof ResponseFileSearchCallCompletedEvent,
  typeof ResponseWebSearchCallInProgressEvent,
  typeof ResponseWebSearchCallSearchingEvent,
  typeof ResponseWebSearchCallCompletedEvent,
  typeof ResponseReasoningSummaryPartAddedEvent,
  typeof ResponseReasoningSummaryPartDoneEvent,
  typeof ResponseReasoningSummaryTextDeltaEvent,
  typeof ResponseReasoningSummaryTextDoneEvent,
  typeof ResponseReasoningTextDeltaEvent,
  typeof ResponseReasoningTextDoneEvent,
  typeof ResponseImageGenerationCallInProgressEvent,
  typeof ResponseImageGenerationCallGeneratingEvent,
  typeof ResponseImageGenerationCallPartialImageEvent,
  typeof ResponseImageGenerationCallCompletedEvent,
  typeof ResponseMcpCallArgumentsDeltaEvent,
  typeof ResponseMcpCallArgumentsDoneEvent,
  typeof ResponseMcpCallInProgressEvent,
  typeof ResponseMcpCallCompletedEvent,
  typeof ResponseMcpCallFailedEvent,
  typeof ResponseMcpListToolsInProgressEvent,
  typeof ResponseMcpListToolsCompletedEvent,
  typeof ResponseMcpListToolsFailedEvent,
  typeof ResponseCodeInterpreterCallInProgressEvent,
  typeof ResponseCodeInterpreterCallInterpretingEvent,
  typeof ResponseCodeInterpreterCallCompletedEvent,
  typeof ResponseCodeInterpreterCallCodeDeltaEvent,
  typeof ResponseCodeInterpreterCallCodeDoneEvent,
  typeof ResponseCustomToolCallInputDeltaEvent,
  typeof ResponseCustomToolCallInputDoneEvent,
  typeof ResponseErrorEvent
]> = Schema.Union(
  ResponseCreatedEvent,
  ResponseQueuedEvent,
  ResponseInProgressEvent,
  ResponseCompletedEvent,
  ResponseIncompleteEvent,
  ResponseFailedEvent,
  ResponseOutputItemAddedEvent,
  ResponseOutputItemDoneEvent,
  ResponseContentPartAddedEvent,
  ResponseContentPartDoneEvent,
  ResponseOutputTextDeltaEvent,
  ResponseOutputTextDoneEvent,
  ResponseOutputTextAnnotationAddedEvent,
  ResponseRefusalDeltaEvent,
  ResponseRefusalDoneEvent,
  ResponseFunctionCallArgumentsDeltaEvent,
  ResponseFunctionCallArgumentsDoneEvent,
  ResponseFileSearchCallInProgressEvent,
  ResponseFileSearchCallSearchingEvent,
  ResponseFileSearchCallCompletedEvent,
  ResponseWebSearchCallInProgressEvent,
  ResponseWebSearchCallSearchingEvent,
  ResponseWebSearchCallCompletedEvent,
  ResponseReasoningSummaryPartAddedEvent,
  ResponseReasoningSummaryPartDoneEvent,
  ResponseReasoningSummaryTextDeltaEvent,
  ResponseReasoningSummaryTextDoneEvent,
  ResponseReasoningTextDeltaEvent,
  ResponseReasoningTextDoneEvent,
  ResponseImageGenerationCallInProgressEvent,
  ResponseImageGenerationCallGeneratingEvent,
  ResponseImageGenerationCallPartialImageEvent,
  ResponseImageGenerationCallCompletedEvent,
  ResponseMcpCallArgumentsDeltaEvent,
  ResponseMcpCallArgumentsDoneEvent,
  ResponseMcpCallInProgressEvent,
  ResponseMcpCallCompletedEvent,
  ResponseMcpCallFailedEvent,
  ResponseMcpListToolsInProgressEvent,
  ResponseMcpListToolsCompletedEvent,
  ResponseMcpListToolsFailedEvent,
  ResponseCodeInterpreterCallInProgressEvent,
  ResponseCodeInterpreterCallInterpretingEvent,
  ResponseCodeInterpreterCallCompletedEvent,
  ResponseCodeInterpreterCallCodeDeltaEvent,
  ResponseCodeInterpreterCallCodeDoneEvent,
  ResponseCustomToolCallInputDeltaEvent,
  ResponseCustomToolCallInputDoneEvent,
  ResponseErrorEvent
)

/**
 * Represents the events that can be emitted during a streaming response.
 *
 * @since 1.0.0
 * @category Models
 */
export type ResponseStreamEvent = typeof ResponseStreamEvent.Type
