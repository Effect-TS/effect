/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Concurrency, Mutable, NoExcessProperties } from "effect/Types"
import { AiError } from "./AiError.js"
import { defaultIdGenerator, IdGenerator } from "./IdGenerator.js"
import * as Prompt from "./Prompt.js"
import * as Response from "./Response.js"
import type { SpanTransformer } from "./Telemetry.js"
import { CurrentSpanTransformer } from "./Telemetry.js"
import type * as Tool from "./Tool.js"
import type * as Toolkit from "./Toolkit.js"

// =============================================================================
// Service Definition
// =============================================================================

export class LanguageModel extends Context.Tag("@effect/ai/LanguageModel")<
  LanguageModel,
  Service
>() {}

export interface Service {
  readonly generateText: <
    Tools extends Record<string, Tool.Any>,
    Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
  >(options: Options & GenerateTextOptions<Tools>) => Effect.Effect<
    GenerateTextResponse<Tools>,
    ExtractError<Options>,
    ExtractContext<Options>
  >

  readonly generateObject: <A, I extends Record<string, unknown>, R>(
    options: GenerateObjectOptions<A, I, R>
  ) => Effect.Effect<GenerateObjectResponse<A>, AiError, R>

  readonly streamText: <
    Tools extends Record<string, Tool.Any>,
    Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
  >(options: Options & GenerateTextOptions<Tools>) => Stream.Stream<
    Response.StreamPart<Tools>,
    ExtractError<Options>,
    ExtractContext<Options>
  >
}

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
   *
   * - `auto` (default): The model can decide whether or not to call tools, as
   *   well as which tools to call.
   * - `required`: The model **must** call a tool but can decide which tool will be called.
   * - `none`: The model **must not** call a tool.
   * - `{ tool: <tool_name> }`: The model must call the specified tool.
   * - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The
   *   model is restricted to the subset of tools specified by `oneOf`. When `mode`
   *   is `"auto"` or omitted, the model can decide whether or not a tool from the
   *   allowed subset of tools can be called. When `mode` is `"required"`, the
   *   model **must** call one tool from the allowed subset of tools.
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
 * Options for generating a structured object using a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateObjectOptions<A, I extends Record<string, unknown>, R> {
  /**
   * The prompt input to use to generate text.
   */
  readonly prompt: Prompt.RawInput

  /**
   * The name of the structured output that should be generated. Used by some
   * large language model providers to provide additional guidance to the model.
   */
  readonly name?: string | undefined

  /**
   * The schema to be used to specify the structure of the object to generate.
   */
  readonly schema: Schema.Schema<A, I, R>
}

/**
 * The tool choice mode for the language model.
 *
 * - `auto` (default): The model can decide whether or not to call tools, as
 *   well as which tools to call.
 * - `required`: The model **must** call a tool but can decide which tool will be called.
 * - `none`: The model **must not** call a tool.
 * - `{ tool: <tool_name> }`: The model must call the specified tool.
 * - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The
 *   model is restricted to the subset of tools specified by `oneOf`. When `mode`
 *   is `"auto"` or omitted, the model can decide whether or not a tool from the
 *   allowed subset of tools can be called. When `mode` is `"required"`, the
 *   model **must** call one tool from the allowed subset of tools.
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

export interface BaseResponse<Part extends Response.AnyPart> {
  readonly content: Array<Part>
}

export class GenerateTextResponse<Tools extends Record<string, Tool.Any>>
  implements BaseResponse<Response.Part<Tools>>
{
  readonly content: Array<Response.Part<Tools>>

  constructor(content: Array<Response.Part<Tools>>) {
    this.content = content
  }

  get text(): string {
    const text: Array<string> = []
    for (const part of this.content) {
      if (part.type === "text") {
        text.push(part.text)
      }
    }
    return text.join("")
  }

  get reasoning(): Array<Response.ReasoningPart> {
    return this.content.filter((part) => part.type === "reasoning")
  }

  get reasoningText(): string | undefined {
    const text: Array<string> = []
    for (const part of this.content) {
      if (part.type === "reasoning") {
        text.push(part.text)
      }
    }
    return text.length === 0 ? undefined : text.join("")
  }

  get toolCalls(): Array<Response.ToolCallParts<Tools>> {
    return this.content.filter((part) => part.type === "tool-call")
  }

  get toolResults(): Array<Response.ToolResultParts<Tools>> {
    return this.content.filter((part) => part.type === "tool-result")
  }

  get finishReason(): Response.FinishReason {
    const finishPart = this.content.find((part) => part.type === "finish")
    return Predicate.isUndefined(finishPart) ? "unknown" : finishPart.reason
  }

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

export class GenerateObjectResponse<A> implements BaseResponse<Response.Part<never>> {
  readonly value: A
  readonly content: Array<Response.Part<never>>

  constructor(value: A, content: Array<Response.Part<never>>) {
    this.value = value
    this.content = content
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * A utility type to extract the error type for the text generation methods
 * of `LanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractError<Options> = Options extends {
  readonly disableToolCallResolution: true
} ? AiError :
  Options extends {
    readonly toolkit: Toolkit.WithHandler<infer _Tools>
  } ? AiError | Tool.Failure<_Tools[keyof _Tools]>
  : Options extends {
    readonly toolkit: Effect.Effect<Toolkit.WithHandler<infer _Tools>, infer _E, infer _R>
  } ? AiError | Tool.Failure<_Tools[keyof _Tools]> | _E :
  AiError

/**
 * A utility type to extract the context type for the text generation methods
 * of `LanguageModel` from the provided options.
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
 * Represents the set of options received by the provider when constructing an
 * implementation of `AiLanguageModel`.
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
      readonly name: string
      readonly schema: Schema.Schema.Any
    }

  /**
   * The tool choice mode for the language model.
   *
   * - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call.
   * - `required`: The model **must** call a tool but can decide which tool will be called.
   * - `none`: The model **must not** call a tool.
   * - `{ tool: <tool_name> }`: The model must call the specified tool.
   */
  readonly toolChoice: ToolChoice<any>

  /**
   * The span to use to trace interactions with the large language model.
   */
  readonly span: Span
}

/**
 * Represents the parameters required to construct an `AiLanguageModel`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ConstructorParams {
  /**
   * A method which requests text generation from the large language model
   * provider.
   *
   * The final result is returned as an only once the large language model
   * provider has finished text generation.
   */
  readonly generateText: (options: ProviderOptions) => Effect.Effect<
    Array<Response.Part<any>>,
    AiError,
    IdGenerator
  >

  /**
   * A method which requests text generation from the large language model
   * provider.
   *
   * Intermediate results should be streamed from the large language model
   * provider and accumulated into an `AiResponse`.
   */
  readonly streamText: (options: ProviderOptions) => Stream.Stream<
    Response.StreamPart<any>,
    AiError,
    IdGenerator
  >
}

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
      Tools extends Record<string, Tool.Any>,
      Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
    >({ concurrency, toolChoice = "auto", ...options }: Options & GenerateTextOptions<Tools>): Effect.Effect<
      GenerateTextResponse<Tools>,
      ExtractError<Options>,
      ExtractContext<Options>
    > =>
      Effect.useSpan(
        "AiLanguageModel.generateText",
        { captureStackTrace: false, attributes: { concurrency, toolChoice } },
        Effect.fnUntraced(
          function*(span) {
            const prompt = Prompt.make(options.prompt)
            const spanTransformer = yield* getSpanTransformer
            const providerOptions: Mutable<ProviderOptions> = {
              prompt,
              tools: [],
              toolChoice: "none",
              responseFormat: { type: "text" },
              span
            }

            // If there is no toolkit, the response can be returned immediately
            if (Predicate.isUndefined(options.toolkit)) {
              const content = yield* params.generateText(providerOptions)
              const response = new GenerateTextResponse(content)
              applySpanTransformer(spanTransformer, content, providerOptions)
              return response
            }

            // If there is a toolkit resolve and apply it to the provider options
            const toolkit = yield* resolveToolkit<Tools, any, any>(options.toolkit)
            const tools = typeof toolChoice === "object" && "oneOf" in toolChoice
              ? Object.values(toolkit.tools).filter((tool) => toolChoice.oneOf.includes(tool.name))
              : Object.values(toolkit.tools)
            providerOptions.tools = tools
            providerOptions.toolChoice = toolChoice

            const content = yield* params.generateText(providerOptions)

            // If tool call resolution is disabled, return the response without
            // resolving the tool calls that were generated
            if (options.disableToolCallResolution === true) {
              const response = new GenerateTextResponse(content)
              applySpanTransformer(spanTransformer, content, providerOptions)
              return response
            }

            // Resolve the generated tool calls
            const toolResults = yield* resolveToolCalls({
              method: "generateText",
              content,
              toolkit,
              concurrency
            })

            // Return the final response
            const finalContent = [...content, ...toolResults]
            const response = new GenerateTextResponse(finalContent)
            applySpanTransformer(spanTransformer, finalContent, providerOptions)
            return response
          },
          (effect, span) => Effect.withParentSpan(effect, span),
          Effect.provideService(IdGenerator, idGenerator)
        )
      ) as any

    const streamText: <
      Tools extends Record<string, Tool.Any>,
      Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
    >(options: Options & GenerateTextOptions<Tools>) => Stream.Stream<
      Response.StreamPart<Tools>,
      ExtractError<Options>,
      ExtractContext<Options>
    > = Effect.fnUntraced(
      function*<
        Tools extends Record<string, Tool.Any>,
        Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
      >({ concurrency, toolChoice = "auto", ...options }: Options & GenerateTextOptions<Tools>) {
        const span = yield* Effect.makeSpanScoped("AiLanguageModel.streamText", {
          captureStackTrace: false,
          attributes: { concurrency, toolChoice }
        })
        const prompt = Prompt.make(options.prompt)
        const providerOptions: Mutable<ProviderOptions> = {
          prompt,
          tools: [],
          toolChoice: "none",
          responseFormat: { type: "text" },
          span
        }

        // If there is no toolkit, return immediately
        if (Predicate.isUndefined(options.toolkit)) {
          return [params.streamText(providerOptions), providerOptions] as const
        }

        // If there is a toolkit resolve and apply it to the provider options
        const toolkit = yield* resolveToolkit<Tools, any, any>(options.toolkit)
        const tools = typeof toolChoice === "object" && "oneOf" in toolChoice
          ? Object.values(toolkit.tools).filter((tool) => toolChoice.oneOf.includes(tool.name))
          : Object.values(toolkit.tools)
        providerOptions.tools = tools
        providerOptions.toolChoice = toolChoice

        const stream = params.streamText(providerOptions)

        // If tool call resolution is disabled, return the response without
        // resolving the tool calls that were generated
        if (options.disableToolCallResolution === true) {
          return [stream, providerOptions] as const
        }

        return [
          Stream.mapChunksEffect(stream, (content) =>
            Effect.map(
              resolveToolCalls({
                method: "streamText",
                content: Chunk.toReadonlyArray(content),
                toolkit,
                concurrency
              }),
              (toolResults) => Chunk.unsafeFromArray([...content, toolResults])
            )) as Stream.Stream<Response.StreamPart<any>, AiError, IdGenerator>,
          providerOptions
        ] as const
      },
      Effect.flatMap(Effect.fnUntraced(function*([stream, options]) {
        const spanTransformer = yield* getSpanTransformer

        if (Option.isNone(spanTransformer)) {
          return stream
        }

        let response: Array<Response.StreamPart<any>> = []
        return stream.pipe(
          Stream.map((content) => {
            response = [...response, content]
            return content
          }),
          Stream.ensuring(Effect.sync(() => {
            applySpanTransformer(spanTransformer, response, options)
          }))
        )
      })),
      Stream.unwrapScoped,
      Stream.provideService(IdGenerator, idGenerator)
    ) as any

    const generateObject = <A, I extends Record<string, unknown>, R>(
      options: GenerateObjectOptions<A, I, R>
    ): Effect.Effect<GenerateObjectResponse<A>, AiError, R> => {
      const name: string = Predicate.isNotUndefined(options.name)
        ? options.name
        : "_tag" in options.schema
        ? options.schema._tag as string
        : "identifier" in options.schema
        ? options.schema.identifier as string
        : "generateObject"
      return Effect.useSpan(
        "LanguageModel.generateObject",
        { captureStackTrace: false, attributes: { name } },
        Effect.fnUntraced(
          function*(span) {
            const prompt = Prompt.make(options.prompt)
            const spanTransformer = yield* getSpanTransformer
            const decode = Schema.decodeUnknown(Schema.parseJson(options.schema))

            const providerOptions: ProviderOptions = {
              prompt,
              tools: [],
              toolChoice: "none",
              responseFormat: { type: "json", name, schema: options.schema },
              span
            }
            const response = yield* params.generateText(providerOptions)
            applySpanTransformer(spanTransformer, response, providerOptions)

            const text: Array<string> = []
            for (const part of response) {
              if (part.type === "text") {
                text.push(part.text)
              }
            }

            if (text.length === 0) {
              return yield* new AiError({
                module: "LanguageModel",
                method: "generateObject",
                description: "No object was generated by the large language model"
              })
            }

            const value = yield* Effect.mapError(decode(text.join("")), (cause) =>
              new AiError({
                module: "LanguageModel",
                method: "generateObject",
                description: "Generated object failed to conform to provided schema",
                cause
              }))

            return new GenerateObjectResponse(value, response as any)
          },
          (effect, span) => Effect.withParentSpan(effect, span),
          Effect.provideService(IdGenerator, idGenerator)
        )
      )
    }

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
 * Generate text using a large language model for the specified `prompt`.
 *
 * If a `toolkit` is specified, the large language model will additionally
 * be able to perform tool calls to augment its response.
 *
 * @since 1.0.0
 * @category Functions
 */
export const generateText: <
  Tools extends Record<string, Tool.Any>,
  Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
>(options: Options & GenerateTextOptions<Tools>) => Effect.Effect<
  GenerateTextResponse<Tools>,
  ExtractError<Options>,
  LanguageModel | ExtractContext<Options>
> = Effect.serviceFunctionEffect(LanguageModel, (model) => model.generateText)

/**
 * Generate a structured object for the specified prompt and schema using a
 * large language model.
 *
 * @since 1.0.0
 * @category Functions
 */
export const generateObject: <A, I extends Record<string, unknown>, R>(
  options: GenerateObjectOptions<A, I, R>
) => Effect.Effect<
  GenerateObjectResponse<A>,
  AiError,
  LanguageModel | R
> = Effect.serviceFunctionEffect(LanguageModel, (model) => model.generateObject)

/**
 * Generate text using a large language model for the specified `prompt`,
 * streaming output from the model as soon as it is available.
 *
 * If a `toolkit` is specified, the large language model will additionally
 * be able to perform tool calls to augment its response.
 *
 * @since 1.0.0
 * @category Functions
 */
export const streamText = <
  Tools extends Record<string, Tool.Any>,
  Options extends NoExcessProperties<GenerateTextOptions<Tools>, Options>
>(
  options: Options & GenerateTextOptions<Tools>
): Stream.Stream<
  Response.StreamPart<Tools>,
  ExtractError<Options>,
  LanguageModel | ExtractContext<Options>
> => Stream.unwrap(LanguageModel.pipe(Effect.map((model) => model.streamText(options))))

// =============================================================================
// Tool Call Resolution
// =============================================================================

const resolveToolCalls = <Tools extends Record<string, Tool.Any>>(options: {
  readonly content: ReadonlyArray<Response.AllParts<any>>
  readonly toolkit: Toolkit.WithHandler<Tools>
  readonly concurrency: Concurrency | undefined
  readonly method: string
}): Effect.Effect<
  ReadonlyArray<Tool.Success<Tools[keyof Tools]>>,
  Tool.Failure<Tools[keyof Tools]>,
  Tool.Requirements<Tools[keyof Tools]>
> => {
  const toolNames: Array<string> = []
  const toolCalls: Array<Response.ToolCallPart<string, any>> = []

  for (const part of options.content) {
    if (part.type === "tool-call") {
      toolNames.push(part.name)
      if (!part.isProviderDefined) {
        toolCalls.push(part)
      }
    }
  }

  return Effect.forEach(toolCalls, (toolCall) => {
    return options.toolkit.handle(toolCall.name, toolCall.params).pipe(
      Effect.map(({ result }) => result)
    )
  }, { concurrency: options.concurrency })
}

// =============================================================================
// Utilities
// =============================================================================

const resolveToolkit = <Tools extends Record<string, Tool.Any>, E, R>(
  toolkit: Toolkit.WithHandler<Tools> | Effect.Effect<Toolkit.WithHandler<Tools>, E, R>
): Effect.Effect<Toolkit.WithHandler<Tools>, E, R> => Effect.isEffect(toolkit) ? toolkit : Effect.succeed(toolkit)

const applySpanTransformer = (
  transformer: Option.Option<SpanTransformer>,
  response: ReadonlyArray<Response.AllParts<any>>,
  options: ProviderOptions
): void => {
  if (Option.isSome(transformer)) {
    transformer.value({ ...options, response: response as any })
  }
}
