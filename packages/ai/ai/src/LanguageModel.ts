/**
 * The `LanguageModel` module provides AI text generation capabilities with tool
 * calling support.
 *
 * This module offers a comprehensive interface for interacting with large
 * language models, supporting both streaming and non-streaming text generation,
 * structured output generation, and tool calling functionality. It provides a
 * unified API that can be implemented by different AI providers while
 * maintaining type safety and effect management.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Basic text generation
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateText({
 *     prompt: "Explain quantum computing"
 *   })
 *
 *   console.log(response.text)
 *
 *   return response
 * })
 * ```
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * // Structured output generation
 * const ContactSchema = Schema.Struct({
 *   name: Schema.String,
 *   email: Schema.String
 * })
 *
 * const extractContact = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateObject({
 *     prompt: "Extract contact: John Doe, john@example.com",
 *     schema: ContactSchema
 *   })
 *
 *   return response.value
 * })
 * ```
 *
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Concurrency, Mutable, NoExcessProperties } from "effect/Types"
import * as AiError from "./AiError.js"
import { defaultIdGenerator, IdGenerator } from "./IdGenerator.js"
import * as Prompt from "./Prompt.js"
import * as Response from "./Response.js"
import type { SpanTransformer } from "./Telemetry.js"
import { CurrentSpanTransformer } from "./Telemetry.js"
import type * as Tool from "./Tool.js"
import * as Toolkit from "./Toolkit.js"

// =============================================================================
// Service Definition
// =============================================================================

/**
 * The `LanguageModel` service tag for dependency injection.
 *
 * This tag provides access to language model functionality throughout your
 * application, enabling text generation, streaming, and structured output
 * capabilities.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const useLanguageModel = Effect.gen(function* () {
 *   const model = yield* LanguageModel
 *   const response = yield* model.generateText({
 *     prompt: "What is machine learning?"
 *   })
 *   return response.text
 * })
 * ```
 *
 * @since 1.0.0
 * @category Context
 */
export class LanguageModel extends Context.Tag("@effect/ai/LanguageModel")<
  LanguageModel,
  Service
>() {}

/**
 * The service interface for language model operations.
 *
 * Defines the contract that all language model implementations must fulfill,
 * providing text generation, structured output, and streaming capabilities.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * Generate text using the language model.
   */
  readonly generateText: <
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
    Tools extends Record<string, Tool.Any> = {}
  >(options: Options & GenerateTextOptions<Tools>) => Effect.Effect<
    GenerateTextResponse<Tools>,
    ExtractError<Options>,
    ExtractContext<Options>
  >

  /**
   * Generate a structured object from a schema using the language model.
   */
  readonly generateObject: <
    A,
    I extends Record<string, unknown>,
    R,
    Options extends NoExcessProperties<GenerateObjectOptions<any, A, I, R>, Options>,
    Tools extends Record<string, Tool.Any> = {}
  >(options: Options & GenerateObjectOptions<Tools, A, I, R>) => Effect.Effect<
    GenerateObjectResponse<Tools, A>,
    ExtractError<Options>,
    R | ExtractContext<Options>
  >

  /**
   * Generate text using the language model with streaming output.
   */
  readonly streamText: <
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
    Tools extends Record<string, Tool.Any> = {}
  >(options: Options & GenerateTextOptions<Tools>) => Stream.Stream<
    Response.StreamPart<Tools>,
    ExtractError<Options>,
    ExtractContext<Options>
  >
}

/**
 * Configuration options for text generation.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateTextOptions<Tools extends Record<string, Tool.Any>> {
  /**
   * The prompt input to use to generate text.
   */
  readonly prompt: Prompt.RawInput

  /**
   * A toolkit containing both the tools and the tool call handler to use to
   * augment text generation.
   */
  readonly toolkit?: Toolkit.WithHandler<Tools> | Effect.Effect<Toolkit.WithHandler<Tools>, any, any> | undefined

  /**
   * The tool choice mode for the language model.
   * - `auto` (default): The model can decide whether or not to call tools, as
   *   well as which tools to call.
   * - `required`: The model **must** call a tool but can decide which tool will
   *   be called.
   * - `none`: The model **must not** call a tool.
   * - `{ tool: <tool_name> }`: The model must call the specified tool.
   * - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The
   *   model is restricted to the subset of tools specified by `oneOf`. When
   *   `mode` is `"auto"` or omitted, the model can decide whether or not a tool
   *   from the allowed subset of tools can be called. When `mode` is
   *   `"required"`, the model **must** call one tool from the allowed subset of
   *   tools.
   */
  readonly toolChoice?:
    | ToolChoice<{ [Name in keyof Tools]: Tools[Name]["name"] }[keyof Tools]>
    | undefined

  /**
   * The concurrency level for resolving tool calls.
   */
  readonly concurrency?: Concurrency | undefined

  /**
   * When set to `true`, tool calls requested by the large language model
   * will not be auto-resolved by the framework.
   *
   * This option is useful when:
   *   1. The user wants to include tool call definitions from an `AiToolkit`
   *      in requests to the large language model so that the model has the
   *      capability to call tools
   *   2. The user wants to control the execution of tool call resolvers
   *      instead of having the framework handle tool call resolution
   */
  readonly disableToolCallResolution?: boolean | undefined
}

/**
 * Configuration options for structured object generation.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateObjectOptions<Tools extends Record<string, Tool.Any>, A, I extends Record<string, unknown>, R>
  extends GenerateTextOptions<Tools>
{
  /**
   * The name of the structured output that should be generated. Used by some
   * large language model providers to provide additional guidance to the model.
   */
  readonly objectName?: string | undefined

  /**
   * The schema to be used to specify the structure of the object to generate.
   */
  readonly schema: Schema.Schema<A, I, R>
}

/**
 * The tool choice mode for the language model.
 * - `auto` (default): The model can decide whether or not to call tools, as
 *   well as which tools to call.
 * - `required`: The model **must** call a tool but can decide which tool will
 *   be called.
 * - `none`: The model **must not** call a tool.
 * - `{ tool: <tool_name> }`: The model must call the specified tool.
 * - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The
 *   model is restricted to the subset of tools specified by `oneOf`. When
 *   `mode` is `"auto"` or omitted, the model can decide whether or not a tool
 *   from the allowed subset of tools can be called. When `mode` is
 *   `"required"`, the model **must** call one tool from the allowed subset of
 *   tools.
 *
 * @since 1.0.0
 * @category Models
 */
export type ToolChoice<Tools extends string> = "auto" | "none" | "required" | {
  readonly tool: Tools
} | {
  readonly mode?: "auto" | "required"
  readonly oneOf: ReadonlyArray<Tools>
}

/**
 * Response class for text generation operations.
 *
 * Contains the generated content and provides convenient accessors for
 * extracting different types of response parts like text, tool calls, and usage
 * information.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateText({
 *     prompt: "Explain photosynthesis"
 *   })
 *
 *   console.log(response.text) // Generated text content
 *   console.log(response.finishReason) // "stop", "length", etc.
 *   console.log(response.usage) // Usage information
 *
 *   return response
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export class GenerateTextResponse<Tools extends Record<string, Tool.Any>> {
  readonly content: Array<Response.Part<Tools>>

  constructor(content: Array<Response.Part<Tools>>) {
    this.content = content
  }

  /**
   * Extracts and concatenates all text parts from the response.
   */
  get text(): string {
    const text: Array<string> = []
    for (const part of this.content) {
      if (part.type === "text") {
        text.push(part.text)
      }
    }
    return text.join("")
  }

  /**
   * Returns all reasoning parts from the response.
   */
  get reasoning(): Array<Response.ReasoningPart> {
    return this.content.filter((part) => part.type === "reasoning")
  }

  /**
   * Extracts and concatenates all reasoning text, or undefined if none exists.
   */
  get reasoningText(): string | undefined {
    const text: Array<string> = []
    for (const part of this.content) {
      if (part.type === "reasoning") {
        text.push(part.text)
      }
    }
    return text.length === 0 ? undefined : text.join("")
  }

  /**
   * Returns all tool call parts from the response.
   */
  get toolCalls(): Array<Response.ToolCallParts<Tools>> {
    return this.content.filter((part) => part.type === "tool-call")
  }

  /**
   * Returns all tool result parts from the response.
   */
  get toolResults(): Array<Response.ToolResultParts<Tools>> {
    return this.content.filter((part) => part.type === "tool-result")
  }

  /**
   * The reason why text generation finished.
   */
  get finishReason(): Response.FinishReason {
    const finishPart = this.content.find((part) => part.type === "finish")
    return Predicate.isUndefined(finishPart) ? "unknown" : finishPart.reason
  }

  /**
   * Token usage statistics for the generation request.
   */
  get usage(): Response.Usage {
    const finishPart = this.content.find((part) => part.type === "finish")
    if (Predicate.isUndefined(finishPart)) {
      return new Response.Usage({
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: undefined,
        reasoningTokens: undefined,
        cachedInputTokens: undefined
      })
    }
    return finishPart.usage
  }
}

/**
 * Response class for structured object generation operations.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * const UserSchema = Schema.Struct({
 *   name: Schema.String,
 *   email: Schema.String
 * })
 *
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateObject({
 *     prompt: "Create user: John Doe, john@example.com",
 *     schema: UserSchema
 *   })
 *
 *   console.log(response.value) // { name: "John Doe", email: "john@example.com" }
 *   console.log(response.text) // Raw generated text
 *
 *   return response.value
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export class GenerateObjectResponse<Tools extends Record<string, Tool.Any>, A> extends GenerateTextResponse<Tools> {
  /**
   * The parsed structured object that conforms to the provided schema.
   */
  readonly value: A

  constructor(value: A, content: Array<Response.Part<Tools>>) {
    super(content)
    this.value = value
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Utility type that extracts the error type from LanguageModel options.
 *
 * Automatically infers the possible error types based on toolkit configuration
 * and tool call resolution settings.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractError<Options> = Options extends {
  readonly toolkit: Toolkit.WithHandler<infer _Tools>
  readonly disableToolCallResolution: true
} ? AiError.AiError
  : Options extends {
    readonly toolkit: Effect.Effect<Toolkit.WithHandler<infer _Tools>, infer _E, infer _R>
    readonly disableToolCallResolution: true
  } ? AiError.AiError | _E
  : Options extends {
    readonly toolkit: Toolkit.WithHandler<infer _Tools>
  } ? AiError.AiError | Tool.HandlerError<_Tools[keyof _Tools]>
  : Options extends {
    readonly toolkit: Effect.Effect<Toolkit.WithHandler<infer _Tools>, infer _E, infer _R>
  } ? AiError.AiError | Tool.HandlerError<_Tools[keyof _Tools]> | _E :
  AiError.AiError

/**
 * Utility type that extracts the context requirements from LanguageModel options.
 *
 * Automatically infers the required services based on the toolkit configuration.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractContext<Options> = Options extends {
  readonly toolkit: Toolkit.WithHandler<infer _Tools>
} ? Tool.Requirements<_Tools[keyof _Tools]>
  : Options extends {
    readonly toolkit: Effect.Effect<Toolkit.WithHandler<infer _Tools>, infer _E, infer _R>
  } ? Tool.Requirements<_Tools[keyof _Tools]> | _R
  : never

// =============================================================================
// Service Constructor
// =============================================================================

/**
 * Configuration options passed along to language model provider
 * implementations.
 *
 * This interface defines the normalized options that are passed to the
 * underlying provider implementation, regardless of the specific provider being
 * used.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ProviderOptions {
  /**
   * The prompt messages to use to generate text.
   */
  readonly prompt: Prompt.Prompt

  /**
   * The tools that the large language model will have available to provide
   * additional information which can be incorporated into its text generation.
   */
  readonly tools: ReadonlyArray<Tool.Any>

  /**
   * The format which the response should be provided in.
   *
   * If `"text"` is specified, the large language model response will be
   * returned as text.
   *
   * If `"json"` is specified, the large language model respose will be provided
   * as an JSON object that conforms to the shape of the specified schema.
   *
   * Defaults to `{ type: "text" }`.
   */
  readonly responseFormat:
    | {
      readonly type: "text"
    }
    | {
      readonly type: "json"
      readonly objectName: string
      readonly schema: Schema.Schema.Any
    }

  /**
   * The tool choice mode for the language model.
   * - `auto` (default): The model can decide whether or not to call tools, as
   *   well as which tools to call.
   * - `required`: The model **must** call a tool but can decide which tool will
   *   be called.
   * - `none`: The model **must not** call a tool.
   * - `{ tool: <tool_name> }`: The model must call the specified tool.
   * - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The
   *   model is restricted to the subset of tools specified by `oneOf`. When
   *   `mode` is `"auto"` or omitted, the model can decide whether or not a tool
   *   from the allowed subset of tools can be called. When `mode` is
   *   `"required"`, the model **must** call one tool from the allowed subset of
   *   tools.
   */
  readonly toolChoice: ToolChoice<any>

  /**
   * The span to use to trace interactions with the large language model.
   */
  readonly span: Span
}

/**
 * Parameters required to construct a LanguageModel service.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ConstructorParams {
  /**
   * A method which requests text generation from the large language model
   * provider.
   *
   * The final result is returned when the large language model provider
   * finishes text generation.
   */
  readonly generateText: (options: ProviderOptions) => Effect.Effect<
    Array<Response.PartEncoded>,
    AiError.AiError,
    IdGenerator
  >

  /**
   * A method which requests text generation from the large language model
   * provider.
   *
   * Intermediate results are streamed from the large language model provider.
   */
  readonly streamText: (options: ProviderOptions) => Stream.Stream<
    Response.StreamPartEncoded,
    AiError.AiError,
    IdGenerator
  >
}

/**
 * Creates a LanguageModel service from provider-specific implementations.
 *
 * This constructor takes provider-specific implementations for text generation
 * and streaming text generation and returns a LanguageModel service.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make: (params: ConstructorParams) => Effect.Effect<Service> = Effect.fnUntraced(
  function*(params) {
    const parentSpanTransformer = yield* Effect.serviceOption(CurrentSpanTransformer)
    const getSpanTransformer = Effect.serviceOption(CurrentSpanTransformer).pipe(
      Effect.map(Option.orElse(() => parentSpanTransformer))
    )

    const idGenerator = yield* Effect.serviceOption(IdGenerator).pipe(
      Effect.map(Option.getOrElse(() => defaultIdGenerator))
    )

    const generateText = <
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
      Tools extends Record<string, Tool.Any> = {}
    >(options: Options & GenerateTextOptions<Tools>): Effect.Effect<
      GenerateTextResponse<Tools>,
      ExtractError<Options>,
      ExtractContext<Options>
    > =>
      Effect.useSpan(
        "LanguageModel.generateText",
        {
          captureStackTrace: false,
          attributes: {
            concurrency: options.concurrency,
            toolChoice: options.toolChoice
          }
        },
        Effect.fnUntraced(
          function*(span) {
            const spanTransformer = yield* getSpanTransformer

            const providerOptions: Mutable<ProviderOptions> = {
              prompt: Prompt.make(options.prompt),
              tools: [],
              toolChoice: "none",
              responseFormat: { type: "text" },
              span
            }
            const content = yield* generateContent(options, providerOptions)

            applySpanTransformer(spanTransformer, content as any, providerOptions)

            return new GenerateTextResponse(content)
          },
          Effect.catchTag("ParseError", (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "LanguageModel",
              method: "generateText",
              error
            })),
          (effect, span) => Effect.withParentSpan(effect, span),
          Effect.provideService(IdGenerator, idGenerator)
        )
      ) as any

    const generateObject = <
      A,
      I extends Record<string, unknown>,
      R,
      Options extends NoExcessProperties<GenerateObjectOptions<any, A, I, R>, Options>,
      Tools extends Record<string, Tool.Any> = {}
    >(options: Options & GenerateObjectOptions<Tools, A, I, R>): Effect.Effect<
      GenerateObjectResponse<Tools, A>,
      ExtractError<Options>,
      R | ExtractContext<Options>
    > => {
      const schema: Schema.Schema<A, I, R> = options.schema
      const objectName = getObjectName(options.objectName, schema)
      return Effect.useSpan(
        "LanguageModel.generateObject",
        {
          captureStackTrace: false,
          attributes: {
            objectName,
            concurrency: options.concurrency,
            toolChoice: options.toolChoice
          }
        },
        Effect.fnUntraced(
          function*(span) {
            const spanTransformer = yield* getSpanTransformer

            const providerOptions: Mutable<ProviderOptions> = {
              prompt: Prompt.make(options.prompt),
              tools: [],
              toolChoice: "none",
              responseFormat: { type: "json", objectName, schema },
              span
            }

            const content = yield* generateContent(options, providerOptions)

            applySpanTransformer(spanTransformer, content as any, providerOptions)

            const value = yield* resolveStructuredOutput(content as any, schema)

            return new GenerateObjectResponse(value, content)
          },
          Effect.catchTag("ParseError", (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "LanguageModel",
              method: "generateText",
              error
            })),
          (effect, span) => Effect.withParentSpan(effect, span),
          Effect.provideService(IdGenerator, idGenerator)
        )
      ) as any
    }

    const streamText: <
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
      Tools extends Record<string, Tool.Any> = {}
    >(options: Options & GenerateTextOptions<Tools>) => Stream.Stream<
      Response.StreamPart<Tools>,
      ExtractError<Options>,
      ExtractContext<Options>
    > = Effect.fnUntraced(
      function*<
        Tools extends Record<string, Tool.Any>,
        Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
      >(options: Options & GenerateTextOptions<Tools>) {
        const span = yield* Effect.makeSpanScoped("LanguageModel.streamText", {
          captureStackTrace: false,
          attributes: { concurrency: options.concurrency, toolChoice: options.toolChoice }
        })

        const providerOptions: Mutable<ProviderOptions> = {
          prompt: Prompt.make(options.prompt),
          tools: [],
          toolChoice: "none",
          responseFormat: { type: "text" },
          span
        }

        // Resolve the content stream for the request
        const stream = yield* streamContent(options, providerOptions)

        // Return the stream immediately if there is no span transformer
        const spanTransformer = yield* getSpanTransformer
        if (Option.isNone(spanTransformer)) {
          return stream
        }

        // Otherwise aggregate generated content and apply the span transformer
        // when the stream is finished
        let content: Array<Response.StreamPart<Tools>> = []
        return stream.pipe(
          Stream.mapChunks((chunk) => {
            content = [...content, ...chunk]
            return chunk
          }),
          Stream.ensuring(Effect.sync(() => {
            spanTransformer.value({ ...providerOptions, response: content as any })
          }))
        )
      },
      Stream.unwrapScoped,
      Stream.mapError((error) =>
        ParseResult.isParseError(error)
          ? AiError.MalformedOutput.fromParseError({
            module: "LanguageModel",
            method: "streamText",
            error
          })
          : error
      ),
      Stream.provideService(IdGenerator, idGenerator)
    ) as any

    const generateContent: <
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
      Tools extends Record<string, Tool.Any> = {}
    >(options: Options & GenerateTextOptions<Tools>, providerOptions: Mutable<ProviderOptions>) => Effect.Effect<
      Array<Response.Part<Tools>>,
      AiError.AiError | ParseResult.ParseError,
      IdGenerator
    > = Effect.fnUntraced(
      function*<
        Tools extends Record<string, Tool.Any>,
        Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
      >(options: Options & GenerateTextOptions<Tools>, providerOptions: Mutable<ProviderOptions>) {
        const toolChoice = options.toolChoice ?? "auto"

        // If there is no toolkit, the generated content can be returned immediately
        if (Predicate.isUndefined(options.toolkit)) {
          const ResponseSchema = Schema.mutable(Schema.Array(Response.Part(Toolkit.empty)))
          const rawContent = yield* params.generateText(providerOptions)
          const content = yield* Schema.decodeUnknown(ResponseSchema)(rawContent)
          return content as Array<Response.Part<Tools>>
        }

        // If there is a toolkit resolve and apply it to the provider options
        const toolkit = yield* resolveToolkit<Tools, any, any>(options.toolkit)

        // If the resolved toolkit is empty, return the generated content immediately
        if (Object.values(toolkit.tools).length === 0) {
          const ResponseSchema = Schema.mutable(Schema.Array(Response.Part(Toolkit.empty)))
          const rawContent = yield* params.generateText(providerOptions)
          const content = yield* Schema.decodeUnknown(ResponseSchema)(rawContent)
          return content as Array<Response.Part<Tools>>
        }

        const tools = typeof toolChoice === "object" && "oneOf" in toolChoice
          ? Object.values(toolkit.tools).filter((tool) => toolChoice.oneOf.includes(tool.name))
          : Object.values(toolkit.tools)
        providerOptions.tools = tools
        providerOptions.toolChoice = toolChoice

        // Construct the response schema with the tools from the toolkit
        const ResponseSchema = Schema.mutable(Schema.Array(Response.Part(toolkit)))

        // If tool call resolution is disabled, return the response without
        // resolving the tool calls that were generated
        if (options.disableToolCallResolution === true) {
          const rawContent = yield* params.generateText(providerOptions)
          const content = yield* Schema.decodeUnknown(ResponseSchema)(rawContent)
          return content as Array<Response.Part<Tools>>
        }

        const rawContent = yield* params.generateText(providerOptions)

        // Resolve the generated tool calls
        const toolResults = yield* resolveToolCalls(rawContent, toolkit, options.concurrency)
        const content = yield* Schema.decodeUnknown(ResponseSchema)(rawContent)

        // Return the content merged with the tool call results
        return [...content, ...toolResults] as Array<Response.Part<Tools>>
      }
    )

    const streamContent: <
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
      Tools extends Record<string, Tool.Any> = {}
    >(options: Options & GenerateTextOptions<Tools>, providerOptions: Mutable<ProviderOptions>) => Effect.Effect<
      Stream.Stream<Response.StreamPart<Tools>, AiError.AiError | ParseResult.ParseError, IdGenerator>,
      Options extends { readonly toolkit: Effect.Effect<Toolkit.WithHandler<Tools>, infer _E, infer _R> } ? _E : never,
      | (Options extends { readonly toolkit: Effect.Effect<Toolkit.WithHandler<Tools>, infer _E, infer _R> } ? _R
        : never)
      | Scope.Scope
    > = Effect.fnUntraced(
      function*<
        Tools extends Record<string, Tool.Any>,
        Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
      >(options: Options & GenerateTextOptions<Tools>, providerOptions: Mutable<ProviderOptions>) {
        const toolChoice = options.toolChoice ?? "auto"

        // If there is no toolkit, return immediately
        if (Predicate.isUndefined(options.toolkit)) {
          const schema = Schema.ChunkFromSelf(Response.StreamPart(Toolkit.empty))
          const decode = Schema.decode(schema)
          return params.streamText(providerOptions).pipe(
            Stream.mapChunksEffect(decode)
          ) as Stream.Stream<Response.StreamPart<Tools>, AiError.AiError | ParseResult.ParseError, IdGenerator>
        }

        // If there is a toolkit resolve and apply it to the provider options
        const toolkit = Effect.isEffect(options.toolkit) ? yield* options.toolkit : options.toolkit

        // If the toolkit is empty, return immediately
        if (Object.values(toolkit.tools).length === 0) {
          const schema = Schema.ChunkFromSelf(Response.StreamPart(Toolkit.empty))
          const decode = Schema.decode(schema)
          return params.streamText(providerOptions).pipe(
            Stream.mapChunksEffect(decode)
          ) as Stream.Stream<Response.StreamPart<Tools>, AiError.AiError | ParseResult.ParseError, IdGenerator>
        }

        const tools = typeof toolChoice === "object" && "oneOf" in toolChoice
          ? Object.values(toolkit.tools).filter((tool) => toolChoice.oneOf.includes(tool.name))
          : Object.values(toolkit.tools)
        providerOptions.tools = tools
        providerOptions.toolChoice = toolChoice

        // If tool call resolution is disabled, return the response without
        // resolving the tool calls that were generated
        if (options.disableToolCallResolution === true) {
          const schema = Schema.ChunkFromSelf(Response.StreamPart(toolkit))
          const decode = Schema.decode(schema)
          return params.streamText(providerOptions).pipe(
            Stream.mapChunksEffect(decode)
          ) as Stream.Stream<Response.StreamPart<Tools>, AiError.AiError | ParseResult.ParseError, IdGenerator>
        }

        const mailbox = yield* Mailbox.make<Response.StreamPart<Tools>, AiError.AiError | ParseResult.ParseError>()
        const ResponseSchema = Schema.Array(Response.StreamPart(toolkit))
        const decode = Schema.decode(ResponseSchema)
        yield* params.streamText(providerOptions).pipe(
          Stream.runForEachChunk(Effect.fnUntraced(function*(chunk) {
            const rawContent = Chunk.toArray(chunk)
            const content = yield* decode(rawContent)
            yield* mailbox.offerAll(content)
            const toolResults = yield* resolveToolCalls(rawContent, toolkit, options.concurrency)
            yield* mailbox.offerAll(toolResults as any)
          })),
          Mailbox.into(mailbox),
          Effect.forkScoped
        )
        return Mailbox.toStream(mailbox)
      }
    )

    return {
      generateText,
      generateObject,
      streamText
    } as const
  }
)

// =============================================================================
// Accessors
// =============================================================================

/**
 * Generate text using a language model.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateText({
 *     prompt: "Write a haiku about programming",
 *     toolChoice: "none"
 *   })
 *
 *   console.log(response.text)
 *   console.log(response.usage.totalTokens)
 *
 *   return response
 * })
 * ```
 *
 * @since 1.0.0
 * @category Functions
 */
export const generateText: <
  Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
  Tools extends Record<string, Tool.Any> = {}
>(options: Options & GenerateTextOptions<Tools>) => Effect.Effect<
  GenerateTextResponse<Tools>,
  ExtractError<Options>,
  LanguageModel | ExtractContext<Options>
> = Effect.serviceFunctionEffect(LanguageModel, (model) => model.generateText)

/**
 * Generate a structured object from a schema using a language model.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * const EventSchema = Schema.Struct({
 *   title: Schema.String,
 *   date: Schema.String,
 *   location: Schema.String
 * })
 *
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateObject({
 *     prompt: "Extract event info: Tech Conference on March 15th in San Francisco",
 *     schema: EventSchema,
 *     objectName: "event"
 *   })
 *
 *   console.log(response.value)
 *   // { title: "Tech Conference", date: "March 15th", location: "San Francisco" }
 *
 *   return response.value
 * })
 * ```
 *
 * @since 1.0.0
 * @category Functions
 */
export const generateObject: <
  A,
  I extends Record<string, unknown>,
  R,
  Options extends NoExcessProperties<GenerateObjectOptions<any, A, I, R>, Options>,
  Tools extends Record<string, Tool.Any> = {}
>(options: Options & GenerateObjectOptions<Tools, A, I, R>) => Effect.Effect<
  GenerateObjectResponse<Tools, A>,
  ExtractError<Options>,
  LanguageModel | R | ExtractContext<Options>
> = Effect.serviceFunctionEffect(LanguageModel, (model) => model.generateObject)

/**
 * Generate text using a language model with streaming output.
 *
 * Returns a stream of response parts that are emitted as soon as they are
 * available from the model, enabling real-time text generation experiences.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect, Stream, Console } from "effect"
 *
 * const program = LanguageModel.streamText({
 *   prompt: "Write a story about a space explorer"
 * }).pipe(Stream.runForEach((part) => {
 *   if (part.type === "text-delta") {
 *     return Console.log(part.delta)
 *   }
 *   return Effect.void
 * }))
 * ```
 *
 * @since 1.0.0
 * @category Functions
 */
export const streamText = <
  Options extends NoExcessProperties<GenerateTextOptions<any>, Options>,
  Tools extends Record<string, Tool.Any> = {}
>(options: Options & GenerateTextOptions<Tools>): Stream.Stream<
  Response.StreamPart<Tools>,
  ExtractError<Options>,
  LanguageModel | ExtractContext<Options>
> => Stream.unwrap(LanguageModel.pipe(Effect.map((model) => model.streamText(options))))

// =============================================================================
// Tool Call Resolution
// =============================================================================

const resolveToolCalls = <Tools extends Record<string, Tool.Any>>(
  content: ReadonlyArray<Response.AllPartsEncoded>,
  toolkit: Toolkit.WithHandler<Tools>,
  concurrency: Concurrency | undefined
): Effect.Effect<
  ReadonlyArray<
    Response.ToolResultPart<
      Tool.Name<Tools[keyof Tools]>,
      Tool.Success<Tools[keyof Tools]>,
      Tool.Failure<Tools[keyof Tools]>
    >
  >,
  Tool.HandlerError<Tools[keyof Tools]>,
  Tool.Requirements<Tools[keyof Tools]>
> => {
  const toolNames: Array<string> = []
  const toolCalls: Array<Response.ToolCallPartEncoded> = []

  for (const part of content) {
    if (part.type === "tool-call") {
      toolNames.push(part.name)
      if (part.providerExecuted === true) {
        continue
      }
      toolCalls.push(part)
    }
  }

  return Effect.forEach(toolCalls, (toolCall) => {
    return toolkit.handle(toolCall.name, toolCall.params as any).pipe(
      Effect.map(({ encodedResult, isFailure, result }) =>
        Response.makePart("tool-result", {
          id: toolCall.id,
          name: toolCall.name,
          result,
          encodedResult,
          isFailure,
          providerExecuted: false,
          ...(toolCall.providerName !== undefined
            ? { providerName: toolCall.providerName }
            : {})
        })
      )
    )
  }, { concurrency })
}

// =============================================================================
// Utilities
// =============================================================================

const resolveToolkit = <Tools extends Record<string, Tool.Any>, E, R>(
  toolkit: Toolkit.WithHandler<Tools> | Effect.Effect<Toolkit.WithHandler<Tools>, E, R>
): Effect.Effect<Toolkit.WithHandler<Tools>, E, R> => Effect.isEffect(toolkit) ? toolkit : Effect.succeed(toolkit)

const getObjectName = <A, I extends Record<string, unknown>, R>(
  objectName: string | undefined,
  schema: Schema.Schema<A, I, R>
): string =>
  Predicate.isNotUndefined(objectName)
    ? objectName
    : "_tag" in schema
    ? schema._tag as string
    : "identifier" in schema
    ? schema.identifier as string
    : "generateObject"

const resolveStructuredOutput = Effect.fnUntraced(
  function*<A, I, R>(response: ReadonlyArray<Response.AllParts<any>>, ResultSchema: Schema.Schema<A, I, R>) {
    const text: Array<string> = []
    for (const part of response) {
      if (part.type === "text") {
        text.push(part.text)
      }
    }

    if (text.length === 0) {
      return yield* new AiError.MalformedOutput({
        module: "LanguageModel",
        method: "generateObject",
        description: "No object was generated by the large language model"
      })
    }

    const decode = Schema.decode(Schema.parseJson(ResultSchema))
    return yield* Effect.mapError(decode(text.join("")), (cause) =>
      new AiError.MalformedOutput({
        module: "LanguageModel",
        method: "generateObject",
        description: "Generated object failed to conform to provided schema",
        cause
      }))
  }
)

const applySpanTransformer = (
  transformer: Option.Option<SpanTransformer>,
  response: ReadonlyArray<Response.AllParts<any>>,
  options: ProviderOptions
): void => {
  if (Option.isSome(transformer)) {
    transformer.value({ ...options, response: response as any })
  }
}
