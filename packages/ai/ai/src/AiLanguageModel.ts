/**
 * @since 1.0.0
 */
import { OpenApiJsonSchema } from "@effect/platform"
import * as _Context from "effect/Context"
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
import * as AiInput from "./AiInput.js"
import * as AiResponse from "./AiResponse.js"
import { CurrentSpanTransformer } from "./AiTelemetry.js"
import type * as AiTool from "./AiTool.js"
import type * as AiToolkit from "./AiToolkit.js"

const constDisableValidation = { disableValidation: true }

/**
 * @since 1.0.0
 * @category Context
 */
export class AiLanguageModel extends _Context.Tag("@effect/ai/AiLanguageModel")<
  AiLanguageModel,
  AiLanguageModel.Service
>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export type StructuredSchema<A, I extends Record<string, unknown>, R> =
  | TaggedSchema<A, I, R>
  | IdentifiedSchema<A, I, R>

/**
 * @since 1.0.0
 * @category Models
 */
export interface TaggedSchema<A, I, R> extends Schema.Schema<A, I, R> {
  readonly _tag: string
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface IdentifiedSchema<A, I, R> extends Schema.Schema<A, I, R> {
  readonly identifier: string
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
export type ToolChoice<Tool extends AiTool.Any> = "auto" | "none" | "required" | {
  readonly tool: Tool["name"]
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ToolCallIdGenerator {
  generateId(): Effect.Effect<string>
}

/**
 * The default services available for use when constructing an `AiLanguageModel`.
 *
 * @since 1.0.0
 * @category Context
 */
export type Context = CurrentToolCallIdGenerator

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
 * @since 1.0.0
 * @category Context
 */
export class CurrentToolCallIdGenerator extends _Context.Tag("@effect/ai/CurrentToolCallIdGenerator")<
  CurrentToolCallIdGenerator,
  ToolCallIdGenerator
>() {}

/**
 * Options for generating text using a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateTextOptions<Tools extends AiTool.Any> {
  /**
   * The prompt input to use to generate text.
   */
  readonly prompt: AiInput.Raw

  /**
   * An optional system message that will be part of the prompt.
   */
  readonly system?: string | undefined

  /**
   * A toolkit containing both the tools and the tool call handler to use to
   * augment text generation.
   */
  readonly toolkit?: AiToolkit.ToHandler<Tools> | Effect.Effect<AiToolkit.ToHandler<Tools>, any, any>

  /**
   * The tool choice mode for the language model.
   *
   * - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call.
   * - `required`: The model **must** call a tool but can decide which tool will be called.
   * - `none`: The model **must not** call a tool.
   * - `{ tool: <tool_name> }`: The model must call the specified tool.
   */
  readonly toolChoice?: ToolChoice<Tools>

  /**
   * The concurrency level for resolving tool calls.
   */
  readonly concurrency?: Concurrency | undefined

  /**
   * When set to `true`, tool calls requested by the large language model
   * will not be auto-resolved by the framework.
   *
   * This option is useful when:
   *   1. The user wants to include tool call definitions from an `AiToolki`
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
  readonly prompt: AiInput.Raw

  /**
   * An optional system message that will be part of the prompt.
   */
  readonly system?: string | undefined

  /**
   * The schema to be used to specify the structure of the object to generate.
   */
  readonly schema: Schema.Schema<A, I, R>

  /**
   * The identifier to use to associating the underlying tool call with the
   * generated output.
   */
  readonly toolCallId?: string | undefined
}

/**
 * A utility type to extract the success type for the text generation methods
 * of `AiLanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractSuccess<Options> = Options extends {
  disableToolCallResolution: true
} ? AiResponse.AiResponse
  : Options extends {
    toolkit: AiToolkit.ToHandler<infer _Tools>
  } ? AiResponse.WithToolCallResults<_Tools>
  : Options extends {
    toolkit: Effect.Effect<AiToolkit.ToHandler<infer _Tools>, infer _E, infer _R>
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
  disableToolCallResolution: true
} ? AiError
  : Options extends {
    toolkit: AiToolkit.ToHandler<infer _Tools>
  } ? AiError | AiTool.Failure<_Tools>
  : Options extends {
    toolkit: Effect.Effect<AiToolkit.ToHandler<infer _Tools>, infer _E, infer _R>
  } ? AiError | AiTool.Failure<_Tools> | _E
  : AiError

/**
 * A utility type to extract the context type for the text generation methods
 * of `AiLanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractContext<Options> = Options extends {
  disableToolCallResolution: true
} ? never
  : Options extends {
    toolkit: AiToolkit.ToHandler<infer _Tools>
  } ? AiTool.Context<_Tools>
  : Options extends {
    toolkit: Effect.Effect<AiToolkit.ToHandler<infer _Tools>, infer _E, infer _R>
  } ? AiTool.Context<_Tools> | _R
  : never

/**
 * @since 1.0.0
 * @category Models
 */
export declare namespace AiLanguageModel {
  /**
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
      Tools extends AiTool.Any,
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
    >(
      options: Options & GenerateTextOptions<Tools>
    ) => Effect.Effect<
      ExtractSuccess<Options>,
      ExtractError<Options>,
      ExtractContext<Options>
    >
    /**
     * Generate text using a large language model for the specified `prompt`,
     * streaming output from the model as soon as it is available.
     *
     * If a `toolkit` is specified, the large language model will additionally
     * be able to perform tool calls to augment its response.
     */
    readonly streamText: <
      Tools extends AiTool.Any,
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
    >(
      options: Options & GenerateTextOptions<Tools>
    ) => Stream.Stream<
      ExtractSuccess<Options>,
      ExtractError<Options>,
      ExtractContext<Options>
    >

    /**
     * Generate a structured object for the specified prompt and schema using a
     * large language model.
     */
    readonly generateObject: <A, I extends Record<string, unknown>, R>(
      options: GenerateObjectOptions<A, I, R>
    ) => Effect.Effect<AiResponse.WithStructuredOutput<A>, AiError, R>
  }
}

const constEmptyMap = new Map<never, never>()

/**
 * @since 1.0.0
 * @category Models
 */
export interface AiLanguageModelOptions {
  /**
   * The prompt messages to use to generate text.
   */
  readonly prompt: AiInput.AiInput
  /**
   * An optional system message that will be part of the prompt.
   */
  readonly system: Option.Option<string>
  /**
   * The tools to use to generate text in an encoded format suitable for
   * incorporation into requests to the large language model.
   */
  readonly tools: Array<{
    readonly name: string
    readonly description: string
    readonly parameters: JsonSchema.JsonSchema7
    readonly structured: boolean
  }>
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
 * @since 1.0.0
 * @category Constructors
 */
export const make: (
  opts: {
    readonly generateText: (
      options: AiLanguageModelOptions
    ) => Effect.Effect<AiResponse.AiResponse, AiError, Context>
    readonly streamText: (
      options: AiLanguageModelOptions
    ) => Stream.Stream<AiResponse.AiResponse, AiError, Context>
  }
) => Effect.Effect<
  AiLanguageModel.Service
> = Effect.fnUntraced(function*(opts: {
  readonly generateText: (
    options: AiLanguageModelOptions
  ) => Effect.Effect<AiResponse.AiResponse, AiError, Context>
  readonly streamText: (
    options: AiLanguageModelOptions
  ) => Stream.Stream<AiResponse.AiResponse, AiError, Context>
}) {
  const parentSpanTransformer = yield* Effect.serviceOption(CurrentSpanTransformer)
  const getSpanTransformer = Effect.serviceOption(CurrentSpanTransformer).pipe(
    Effect.map(Option.orElse(() => parentSpanTransformer))
  )

  const toolCallIdGenerator = yield* Effect.serviceOption(CurrentToolCallIdGenerator).pipe(
    Effect.map(Option.getOrElse(() => DefaultToolCallIdGenerator))
  )

  const generateText = <
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
  >({ concurrency, toolChoice = "auto", toolkit, ...options }: Options): Effect.Effect<
    ExtractSuccess<Options>,
    ExtractError<Options>,
    ExtractContext<Options>
  > =>
    Effect.useSpan(
      "AiLanguageModel.generateText",
      { captureStackTrace: false, attributes: { concurrency, toolChoice } },
      Effect.fnUntraced(
        function*(span) {
          const prompt = AiInput.make(options.prompt)
          const system = Option.fromNullable(options.system)
          const spanTransformer = yield* getSpanTransformer
          const modelOptions: Mutable<AiLanguageModelOptions> = { prompt, system, tools: [], toolChoice: "none", span }
          if (Predicate.isUndefined(toolkit)) {
            const response = yield* opts.generateText(modelOptions)
            if (Option.isSome(spanTransformer)) {
              spanTransformer.value({ ...modelOptions, response })
            }
            return response
          }
          modelOptions.toolChoice = toolChoice
          const actualToolkit = Effect.isEffect(toolkit) ? yield* toolkit : toolkit
          for (const tool of actualToolkit.tools) {
            modelOptions.tools.push(convertTool(tool))
          }
          const response = yield* opts.generateText(modelOptions)
          if (Option.isSome(spanTransformer)) {
            spanTransformer.value({ ...modelOptions, response })
          }
          if (options.disableToolCallResolution) {
            return response
          }
          return yield* resolveParts({ response, toolkit: actualToolkit, concurrency, method: "generateText" })
        },
        (effect, span) => Effect.withParentSpan(effect, span),
        Effect.provideService(CurrentToolCallIdGenerator, toolCallIdGenerator)
      )
    ) as any

  const streamText = Effect.fnUntraced(
    function*<
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
    >({ concurrency, toolChoice = "auto", toolkit, ...options }: Options) {
      const span = yield* Effect.makeSpanScoped("AiLanguageModel.streamText", {
        captureStackTrace: false,
        attributes: { concurrency, toolChoice }
      })
      const prompt = AiInput.make(options.prompt)
      const system = Option.fromNullable(options.system)
      const modelOptions: Mutable<AiLanguageModelOptions> = { prompt, system, tools: [], toolChoice: "none", span }
      if (Predicate.isUndefined(toolkit)) {
        return [opts.streamText(modelOptions), modelOptions] as const
      }
      modelOptions.toolChoice = toolChoice
      const actualToolkit = Effect.isEffect(toolkit)
        ? yield* (toolkit as Effect.Effect<AiToolkit.ToHandler<any>>)
        : toolkit
      for (const tool of actualToolkit.tools) {
        modelOptions.tools.push(convertTool(tool))
      }
      return [
        opts.streamText(modelOptions).pipe(
          Stream.mapEffect(
            (response) => resolveParts({ response, toolkit: actualToolkit, concurrency, method: "streamText" }),
            { concurrency: "unbounded" }
          )
        ) as Stream.Stream<AiResponse.AiResponse, AiError, Context>,
        modelOptions
      ] as const
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
  )

  const generateObject = <A, I extends Record<string, unknown>, R>(
    options: GenerateObjectOptions<A, I, R>
  ): Effect.Effect<AiResponse.WithStructuredOutput<A>, AiError, R> => {
    const toolCallId: string = options.toolCallId
      ? options.toolCallId
      : "_tag" in options.schema
      ? options.schema._tag as string
      : "identifier" in options.schema
      ? options.schema.identifier as string
      : "generateObject"
    return Effect.useSpan(
      "AiLanguageModel.generateObject",
      {
        captureStackTrace: false,
        attributes: { toolCallId }
      },
      Effect.fnUntraced(
        function*(span) {
          const prompt = AiInput.make(options.prompt)
          const system = Option.fromNullable(options.system)
          const spanTransformer = yield* getSpanTransformer
          const decode = Schema.decodeUnknown(options.schema)
          const tool = convertStructured(toolCallId, options.schema)
          const toolChoice = { tool: tool.name } as const
          const modelOptions: AiLanguageModelOptions = { prompt, system, tools: [tool], toolChoice, span }
          const response = yield* opts.generateText(modelOptions)
          if (Option.isSome(spanTransformer)) {
            spanTransformer.value({ ...modelOptions, response })
          }
          const toolCallPart = response.parts.find((part): part is AiResponse.ToolCallPart =>
            part._tag === "ToolCallPart" && part.name === toolCallId
          )
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
    )
  }

  return AiLanguageModel.of({ generateText, streamText, generateObject } as any)
})

const convertTool = <Tool extends AiTool.Any>(tool: Tool) => ({
  name: tool.name,
  description: tool.description ?? getDescription(tool.parametersSchema.ast),
  parameters: makeJsonSchema(tool.parametersSchema.ast),
  openapi: makeOpenApiSchema(tool.parametersSchema.ast),
  structured: false
})

const convertStructured = <A, I, R>(name: string, schema: Schema.Schema<A, I, R>) => ({
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

const makeOpenApiSchema = (ast: AST.AST): OpenApiJsonSchema.JsonSchema => {
  const props = AST.getPropertySignatures(ast)
  if (props.length === 0) {
    return {
      type: "object",
      properties: {},
      required: []
    }
  }
  const $defs = {}
  const schema = OpenApiJsonSchema.fromAST(ast, {
    defs: $defs,
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

const resolveParts = Effect.fnUntraced(function*<Tools extends AiTool.Any>(options: {
  readonly response: AiResponse.AiResponse
  readonly toolkit: AiToolkit.ToHandler<Tools>
  readonly concurrency: Concurrency | undefined
  readonly method: string
}) {
  const toolNames: Array<string> = []
  const toolParts = options.response.parts.filter(
    (part): part is AiResponse.ToolCallPart => {
      if (part._tag === "ToolCallPart") {
        toolNames.push(part.name)
        return true
      }
      return false
    }
  )
  if (toolParts.length === 0) {
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
  const resolve = Effect.forEach(toolParts, (part) => {
    const id = part.id as AiResponse.ToolCallId
    const name = part.name as AiTool.Name<Tools>
    const params = part.params as AiTool.Parameters<Tools>
    const toolCall = options.toolkit.handle(name, params)
    return Effect.map(toolCall, ({ encodedResult, result }) => {
      results.set(id, { name, result })
      encodedResults.set(id, { name, result: encodedResult })
    })
  }, { concurrency: options.concurrency, discard: true })
  yield* resolve
  return new AiResponse.WithToolCallResults({
    parts: options.response.parts,
    results,
    encodedResults
  }, constDisableValidation)
})

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
  Tools extends AiTool.Any,
  Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
>(
  options: Options & GenerateTextOptions<Tools>
) => Effect.Effect<
  ExtractSuccess<Options>,
  ExtractError<Options>,
  AiLanguageModel | ExtractContext<Options>
> = Effect.serviceFunctionEffect(AiLanguageModel, (_) => _.generateText)

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
> = Effect.serviceFunctionEffect(AiLanguageModel, (_) => _.generateObject)

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
  Tools extends AiTool.Any,
  Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
>(
  options: Options & GenerateTextOptions<Tools>
): Stream.Stream<
  ExtractSuccess<Options>,
  ExtractError<Options>,
  AiLanguageModel | ExtractContext<Options>
> => Stream.unwrap(AiLanguageModel.pipe(Effect.map((_) => _.streamText(options))))
