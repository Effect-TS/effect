/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as JsonSchema from "effect/JSONSchema"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Random from "effect/Random"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Concurrency, Mutable, NoExcessProperties } from "effect/Types"
import { AiError } from "./AiError.js"
import * as AiPrompt from "./AiPrompt.js"
import * as AiResponse from "./AiResponse.js"
import { CurrentSpanTransformer } from "./AiTelemetry.js"
import * as AiTool from "./AiTool.js"
import type * as AiToolkit from "./AiToolkit.js"

const constDisableValidation: Schema.MakeOptions = { disableValidation: true }

/**
 * @since 1.0.0
 * @category Context
 */
export class AiLanguageModel extends Context.Tag("@effect/ai/AiLanguageModel")<
  AiLanguageModel,
  Service
>() {}

/**
 * Represents the interface that the `AiChat` service provides.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * Generate text using a large language model for the specified `prompt`.
   *
   * If a `toolkit` is specified, the large language model will additionally
   * be able to perform tool calls to augment its response.
   */
  readonly generateText: <
    Tools extends Record<string, AiTool.Any>,
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
  >(options: Options & GenerateTextOptions<Tools>) => Effect.Effect<
    ExtractSuccess<Options>,
    ExtractError<Options>,
    ExtractRequirements<Options>
  >

  /**
   * Generate text using a large language model for the specified `prompt`,
   * streaming output from the model as soon as it is available.
   *
   * If a `toolkit` is specified, the large language model will additionally
   * be able to perform tool calls to augment its response.
   */
  readonly streamText: <
    Tools extends Record<string, AiTool.Any>,
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
  >(
    options: Options & GenerateTextOptions<Tools>
  ) => Stream.Stream<
    ExtractSuccess<Options>,
    ExtractError<Options>,
    ExtractRequirements<Options>
  >

  /**
   * Generate a structured object for the specified prompt and schema using a
   * large language model.
   */
  readonly generateObject: <A, I extends Record<string, unknown>, R>(
    options: GenerateObjectOptions<A, I, R>
  ) => Effect.Effect<AiResponse.WithStructuredOutput<A>, AiError, R>
}

/**
 * Options for generating text using a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateTextOptions<Tools extends Record<string, AiTool.Any>> {
  /**
   * The prompt input to use to generate text.
   */
  readonly prompt: AiPrompt.RawInput

  /**
   * A toolkit containing both the tools and the tool call handler to use to
   * augment text generation.
   */
  readonly toolkit?: AiToolkit.WithHandlers<Tools> | Effect.Effect<AiToolkit.WithHandlers<Tools>, any, any> | undefined

  /**
   * The tool choice mode for the language model.
   *
   * - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call.
   * - `required`: The model **must** call a tool but can decide which tool will be called.
   * - `none`: The model **must not** call a tool.
   * - `{ tool: <tool_name> }`: The model must call the specified tool.
   */
  readonly toolChoice?: ToolChoice<Tools> | undefined

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
   *      capability to call tools.
   *   2. The user wants to control the execution of tool call resolvers
   *      instead of having the framework handle tool call resolution.
   */
  readonly disableToolCallResolution?: boolean | undefined
}

/**
 * Options for generating a structured object using a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateObjectOptions<Value, Input extends Record<string, unknown>, Requirements> {
  /**
   * The prompt input to use to generate text.
   */
  readonly prompt: AiPrompt.RawInput

  /**
   * The schema to be used to specify the structure of the object to generate.
   */
  readonly schema: Schema.Schema<Value, Input, Requirements>

  /**
   * The identifier to use to associating the underlying tool call with the
   * generated output.
   */
  readonly toolCallId?: string | undefined
}

/**
 * The tool choice mode for the language model.
 *
 * - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call.
 * - `required`: The model **must** call a tool but can decide which tool will be called.
 * - `none`: The model **must not** call a tool.
 * - `{ tool: <tool_name> }`: The model must call the specified tool.
 *
 * @since 1.0.0
 * @category Models
 */
export type ToolChoice<Tools extends Record<string, AiTool.Any>> = "auto" | "none" | "required" | {
  readonly tool: keyof Tools extends infer Key ? Key extends string ? Key : never : never
}

/**
 * A utility type to extract the success type for the text generation methods
 * of `AiLanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractSuccess<Options> = Options extends {
  readonly disableToolCallResolution: true
} ? AiResponse.AiResponse
  : Options extends {
    readonly toolkit: AiToolkit.WithHandlers<infer _Tools>
  } ? AiResponse.WithToolCallResults<_Tools>
  : Options extends {
    readonly toolkit: Effect.Effect<AiToolkit.WithHandlers<infer _Tools>, infer _E, infer _R>
  } ? AiResponse.WithToolCallResults<_Tools>
  : AiResponse.AiResponse

/**
 * A utility type to extract the error type for the text generation methods
 * of `AiLanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractError<Options> = Options extends {
  readonly disableToolCallResolution: true
} ? AiError
  : Options extends {
    readonly toolkit: AiToolkit.WithHandlers<infer _Tools>
  } ? AiError | AiTool.Failure<_Tools>
  : Options extends {
    readonly toolkit: Effect.Effect<AiToolkit.WithHandlers<infer _Tools>, infer _E, infer _R>
  } ? AiError | AiTool.Failure<_Tools> | _E
  : AiError

/**
 * A utility type to extract the requirements type for the text generation
 * methods of `AiLanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractRequirements<Options> = Options extends {
  readonly disableToolCallResolution: true
} ? never
  : Options extends {
    readonly toolkit: AiToolkit.WithHandlers<infer _Tools>
  } ? AiTool.Requirements<_Tools>
  : Options extends {
    readonly toolkit: Effect.Effect<AiToolkit.WithHandlers<infer _Tools>, infer _E, infer _R>
  } ? AiTool.Requirements<_Tools> | _R
  : never

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
  readonly prompt: AiPrompt.AiPrompt

  /**
   * The tools that the large language model will have available to provide
   * additional information which can be incorporated into its text generation.
   */
  readonly tools: Array<Tool>

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
 * Represents the structure of a tool call received by the provider when
 * constructing an implementation of `AiLanguageModel`.
 *
 * @since 1.0.0
 * @category Models
 */
export type Tool = ProviderDefinedTool | UserDefinedTool

/**
 * Represents a tool call that will be requested by the large language model
 * provider and executed client-side by the user's application.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ProviderDefinedTool {
  readonly _tag: "ProviderDefinedTool"
  readonly id: string
  readonly name: string
  readonly args: unknown
}

/**
 * Represents a tool call that will be requested by the large language model
 * provider and executed server-side by the model provider application.
 *
 * @since 1.0.0
 * @category Models
 */
export interface UserDefinedTool {
  readonly _tag: "UserDefinedTool"
  readonly name: string
  readonly description: string
  readonly parameters: JsonSchema.JsonSchema7
  readonly structured: boolean
}

/**
 * Represents the default services available for use when constructing an
 * `AiLanguageModel`.
 *
 * @since 1.0.0
 * @category Models
 */
export type ConstructorContext = ToolCallIdGenerator

/**
 * Represents a service which can be used to generate identifiers for tool calls.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolCallIdGenerator {
  readonly generateId: () => Effect.Effect<string>
}

/**
 * @since 1.0.0
 * @category Context
 */
export class CurrentToolCallIdGenerator extends Context.Tag("@effect/ai/CurrentToolCallIdGenerator")<
  CurrentToolCallIdGenerator,
  ToolCallIdGenerator
>() {}

const ALPHANUMS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"

const DefaultToolCallIdGenerator: ToolCallIdGenerator = {
  generateId: Effect.fnUntraced(function*() {
    const chars = new Array(32)
    for (let i = 0; i < 32; i++) {
      chars[i] = ALPHANUMS[yield* Random.nextIntBetween(0, ALPHANUMS.length - 1)]
    }
    return `tool_${chars.join("")}`
  })
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
   * The final result is returned as an `AiResponse` only once the large
   * language model provider has finished text generation.
   */
  readonly generateText: (options: ProviderOptions) => Effect.Effect<AiResponse.AiResponse, AiError, ConstructorContext>
  /**
   * A method which requests text generation from the large language model
   * provider.
   *
   * Intermediate results should be streamed from the large language model
   * provider and accumulated into an `AiResponse`.
   */
  readonly streamText: (options: ProviderOptions) => Stream.Stream<AiResponse.AiResponse, AiError, ConstructorContext>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (params: ConstructorParams) => Effect.Effect<Service> = Effect.fnUntraced(
  function*(params: ConstructorParams) {
    const parentSpanTransformer = yield* Effect.serviceOption(CurrentSpanTransformer)
    const getSpanTransformer = Effect.serviceOption(CurrentSpanTransformer).pipe(
      Effect.map(Option.orElse(() => parentSpanTransformer))
    )

    const toolCallIdGenerator = yield* Effect.serviceOption(CurrentToolCallIdGenerator).pipe(
      Effect.map(Option.getOrElse(() => DefaultToolCallIdGenerator))
    )

    const generateText = <
      Tools extends Record<string, AiTool.Any>,
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
    >({ concurrency, toolChoice = "auto", toolkit, ...options }: Options & GenerateTextOptions<Tools>): Effect.Effect<
      ExtractSuccess<Options>,
      ExtractError<Options>,
      ExtractRequirements<Options>
    > =>
      Effect.useSpan(
        "AiLanguageModel.generateText",
        { captureStackTrace: false, attributes: { concurrency, toolChoice } },
        Effect.fnUntraced(
          function*(span) {
            const prompt = AiPrompt.make(options.prompt)
            const spanTransformer = yield* getSpanTransformer
            const providerOptions: Mutable<ProviderOptions> = { prompt, tools: [], toolChoice: "none", span }

            if (Predicate.isUndefined(toolkit)) {
              const response = yield* params.generateText(providerOptions)
              if (Option.isSome(spanTransformer)) {
                spanTransformer.value({ ...providerOptions, response })
              }
              return response
            }

            const actualToolkit = Effect.isEffect(toolkit) ? yield* toolkit : toolkit
            providerOptions.tools = convertToolkit(actualToolkit)
            providerOptions.toolChoice = toolChoice

            const response = yield* params.generateText(providerOptions)
            if (Option.isSome(spanTransformer)) {
              spanTransformer.value({ ...providerOptions, response })
            }
            if (options.disableToolCallResolution === true) {
              return response
            }

            return yield* resolveToolCalls({
              method: "generateText",
              response,
              toolkit: actualToolkit,
              concurrency
            })
          },
          (effect, span) => Effect.withParentSpan(effect, span),
          Effect.provideService(CurrentToolCallIdGenerator, toolCallIdGenerator)
        )
      ) as any

    const streamText = Effect.fnUntraced(
      function*<
        Tools extends Record<string, AiTool.Any>,
        Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
      >({ concurrency, toolChoice = "auto", toolkit, ...options }: Options & GenerateTextOptions<Tools>) {
        const prompt = AiPrompt.make(options.prompt)
        const span = yield* Effect.makeSpanScoped("AiLanguageModel.streamText", {
          captureStackTrace: false,
          attributes: { concurrency, toolChoice }
        })
        const providerOptions: Mutable<ProviderOptions> = { prompt, tools: [], toolChoice: "none", span }

        if (Predicate.isUndefined(toolkit)) {
          return [params.streamText(providerOptions), providerOptions] as const
        }

        const actualToolkit = Effect.isEffect(toolkit) ? yield* toolkit : toolkit
        providerOptions.toolChoice = toolChoice
        providerOptions.tools = convertToolkit(actualToolkit)

        const stream = params.streamText(providerOptions).pipe(
          Stream.mapEffect(
            (response) =>
              resolveToolCalls({
                method: "streamText",
                response,
                toolkit: actualToolkit,
                concurrency
              }),
            { concurrency: "unbounded" }
          )
        ) as Stream.Stream<AiResponse.AiResponse, AiError, ConstructorContext>
        return [stream, providerOptions] as const
      },
      Effect.flatMap(Effect.fnUntraced(function*([stream, options]) {
        const spanTransformer = yield* getSpanTransformer

        if (Option.isNone(spanTransformer)) {
          return stream
        }

        let finalResponse = AiResponse.empty
        return stream.pipe(
          Stream.map((response) => {
            finalResponse = AiResponse.merge(finalResponse, response)
            return response
          }),
          Stream.ensuring(Effect.sync(() => {
            spanTransformer.value({ ...options, response: finalResponse })
          }))
        )
      })),
      Stream.unwrapScoped,
      Stream.provideService(CurrentToolCallIdGenerator, toolCallIdGenerator)
    ) as any

    const generateObject = <Value, Input extends Record<string, unknown>, Requirements>(
      options: GenerateObjectOptions<Value, Input, Requirements>
    ) => {
      const toolCallId: string = options.toolCallId
        ? options.toolCallId
        : "_tag" in options.schema
        ? options.schema._tag as string
        : "identifier" in options.schema
        ? options.schema.identifier as string
        : "generateObject"
      const decode = Schema.decodeUnknown(options.schema)
      return Effect.useSpan(
        "AiLanguageModel.generateObject",
        { captureStackTrace: false, attributes: { toolCallId } },
        Effect.fnUntraced(
          function*(span) {
            const prompt = AiPrompt.make(options.prompt)
            const tool = convertStructuredTool(toolCallId, options.schema)
            const toolChoice = { tool: tool.name }
            const providerOptions: ProviderOptions = { prompt, tools: [tool], toolChoice, span }

            const response = yield* params.generateText(providerOptions)

            const spanTransformer = yield* getSpanTransformer
            if (Option.isSome(spanTransformer)) {
              spanTransformer.value({ ...providerOptions, response })
            }

            const toolCallPart = response.parts.find((part): part is AiResponse.ToolCallPart => {
              return part.type === "tool-call" && part.name === toolCallId
            })
            if (Predicate.isUndefined(toolCallPart)) {
              return yield* new AiError({
                module: "AiLanguageModel",
                method: "generateObject",
                description: `Tool call '${toolCallId}' not found in model response`
              })
            }

            return yield* Effect.matchEffect(decode(toolCallPart.params), {
              onFailure: (cause) =>
                new AiError({
                  module: "AiLanguageModel",
                  method: "generateObject",
                  description: `Failed to decode tool call '${toolCallId}' parameters`,
                  cause
                }),
              onSuccess: (output) =>
                Effect.succeed(
                  new AiResponse.WithStructuredOutput({
                    parts: response.parts,
                    id: toolCallPart.id,
                    name: toolCallPart.name,
                    value: output
                  }, constDisableValidation)
                )
            })
          },
          (effect, span) => Effect.withParentSpan(effect, span),
          Effect.provideService(CurrentToolCallIdGenerator, toolCallIdGenerator)
        )
      ) as any
    }

    return AiLanguageModel.of({
      generateText,
      streamText,
      generateObject
    })
  }
)

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
  Tools extends Record<string, AiTool.Any>,
  Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
>(
  options: Options & GenerateTextOptions<Tools>
) => Effect.Effect<
  ExtractSuccess<Options>,
  ExtractError<Options>,
  AiLanguageModel | ExtractRequirements<Options>
> = Effect.serviceFunctionEffect(AiLanguageModel, (model) => model.generateText)

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
  Tools extends Record<string, AiTool.Any>,
  Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
>(
  options: Options & GenerateTextOptions<Tools>
): Stream.Stream<
  ExtractSuccess<Options>,
  ExtractError<Options>,
  AiLanguageModel | ExtractRequirements<Options>
> => Stream.unwrap(AiLanguageModel.pipe(Effect.map((model) => model.streamText(options))))

/**
 * Generate a structured object for the specified prompt and schema using a
 * large language model.
 *
 * When using a `Schema` that does not have an `identifier` or `_tag`
 * property, you must specify a `toolCallId` to properly associate the
 * output of the model.
 *
 * @since 1.0.0
 * @category Functions
 */
export const generateObject: <A, I extends Record<string, unknown>, R>(
  options: GenerateObjectOptions<A, I, R>
) => Effect.Effect<
  AiResponse.WithStructuredOutput<A>,
  AiError,
  AiLanguageModel | R
> = Effect.serviceFunctionEffect(AiLanguageModel, (model) => model.generateObject)

const convertToolkit = <Tools extends Record<string, AiTool.Any>>(
  toolkit: AiToolkit.WithHandlers<Tools>
): Array<Tool> => {
  const tools: Array<Tool> = []
  for (const tool of Object.values(toolkit.tools)) {
    if (AiTool.isProviderDefined(tool)) {
      tools.push(convertProviderDefinedTool(tool))
    } else {
      tools.push(convertUserDefinedTool(tool))
    }
  }
  return tools
}

const convertUserDefinedTool = <Tool extends AiTool.Any>(
  tool: Tool
): UserDefinedTool => ({
  _tag: "UserDefinedTool",
  name: tool.name,
  description: tool.description ?? getDescription(tool.parametersSchema.ast),
  parameters: makeJsonSchema(tool.parametersSchema.ast),
  structured: false
})

const convertProviderDefinedTool = <Tool extends AiTool.AnyProviderDefined>(
  tool: Tool
): ProviderDefinedTool => ({
  _tag: "ProviderDefinedTool",
  id: tool.id,
  name: tool.name,
  args: tool.args
})

const convertStructuredTool = <A, I, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): UserDefinedTool => ({
  _tag: "UserDefinedTool",
  name,
  description: getDescription(schema.ast),
  parameters: makeJsonSchema(schema.ast),
  structured: true
})

const makeJsonSchema = (ast: AST.AST): JsonSchema.JsonSchema7 => {
  const props = AST.getPropertySignatures(ast)
  if (props.length === 0) {
    return {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  }
  const $defs = {}
  const schema = JsonSchema.fromAST(ast, {
    definitions: $defs,
    topLevelReferenceStrategy: "skip"
  })
  if (Object.keys($defs).length === 0) return schema
  ;(schema as any).$defs = $defs
  return schema
}

const getDescription = (ast: AST.AST): string => {
  const annotations = ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations
  return AST.DescriptionAnnotationId in annotations ? annotations[AST.DescriptionAnnotationId] as string : ""
}

const constEmptyMap = new Map<never, never>()

const resolveToolCalls = Effect.fnUntraced(
  function*<Tools extends Record<string, AiTool.Any>>(options: {
    readonly response: AiResponse.AiResponse
    readonly toolkit: AiToolkit.WithHandlers<Tools>
    readonly concurrency: Concurrency | undefined
    readonly method: string
  }) {
    const toolNames: Array<string> = []
    const clientToolCalls: Array<AiResponse.ToolCallPart> = []
    const serverToolResults: Array<AiResponse.ToolCallResultPart> = []

    for (const part of options.response.parts) {
      if (part.type === "tool-call") {
        toolNames.push(part.name)
        if (part.mode === "client") {
          clientToolCalls.push(part)
        }
      }
      if (part.type === "tool-result" && part.mode === "server") {
        serverToolResults.push(part)
      }
    }

    if (toolNames.length === 0) {
      return new AiResponse.WithToolCallResults({
        parts: options.response.parts,
        results: constEmptyMap,
        encodedResults: constEmptyMap
      }, constDisableValidation)
    }

    yield* Effect.annotateCurrentSpan("toolCalls", toolNames)

    const results = new Map<AiResponse.ToolCallId, {
      readonly name: string
      readonly result: AiTool.Success<Tools>
    }>()
    const encodedResults = new Map<AiResponse.ToolCallId, {
      readonly name: string
      readonly result: unknown
    }>()

    const resolveClient = Effect.forEach(clientToolCalls, (part) => {
      const id = part.id as AiResponse.ToolCallId
      const name = part.name as AiTool.Name<Tools>
      const params = part.params as AiTool.Parameters<Tools>
      const toolCall = options.toolkit.handleUserDefined(name, params)
      return Effect.map(toolCall, ({ encodedResult, result }) => {
        results.set(id, { name, result })
        encodedResults.set(id, { name, result: encodedResult })
      })
    }, { concurrency: options.concurrency, discard: true })
    yield* resolveClient

    const resolveServer = Effect.forEach(serverToolResults, (part) => {
      const id = part.id as AiResponse.ToolCallId
      const name = part.name as AiTool.Name<Tools>
      const result = part.result as AiTool.Success<Tool>
      const toolCall = options.toolkit.handleProviderDefined(name, result)
      return Effect.map(toolCall, ({ encodedResult, result }) => {
        results.set(id, { name, result })
        encodedResults.set(id, { name, result: encodedResult })
      })
    }, { concurrency: options.concurrency, discard: true })
    yield* resolveServer

    return new AiResponse.WithToolCallResults({
      parts: options.response.parts,
      results,
      encodedResults
    }, constDisableValidation)
  }
)
