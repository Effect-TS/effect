/**
 * @since 1.0.0
 */
import type * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as JsonSchema from "effect/JSONSchema"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Concurrency, NoExcessProperties } from "effect/Types"
import { AiError } from "./AiError.js"
import type { Message } from "./AiInput.js"
import * as AiInput from "./AiInput.js"
import type { AiResponse, ToolCallId, ToolCallPart } from "./AiResponse.js"
import { WithStructuredOutput, WithToolCallResults } from "./AiResponse.js"
import type * as AiTool from "./AiTool.js"
import type * as AiToolkit from "./AiToolkit.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AiLanguageModel extends Context.Tag("@effect/ai/AiLanguageModel")<
  AiLanguageModel,
  AiLanguageModel.Service
>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export type StructuredSchema<A, I, R> = TaggedSchema<A, I, R> | IdentifiedSchema<A, I, R>

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
   * Specifies whether a particular tool is required, or a boolean indicating
   * if any tool is required.
   */
  readonly required?: Tools["name"] | boolean | undefined

  /**
   * The maximum number of sequential calls to the large language model that
   * will be made during resolution of the request, for example when tool calls
   * are specified.
   *
   * Specifying a maximum number of steps is required to prevent infinite loops
   * between your application and the large language model.
   *
   * By default, the value of `maxSteps` is `1`, which means that only a single
   * request to the large language model will be made.
By default, it's set to 1, which means that only a single LLM call is made.
   */
  readonly maxSteps?: number

  /**
   * The concurrency level for resolving tool calls.
   */
  readonly concurrency?: Concurrency | undefined
}

/**
 * Options for generating a structured object using a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateObjectOptions<A, I, R> {
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
  readonly schema: StructuredSchema<A, I, R>
}

/**
 * Options for generating a structured object with an associated tool call
 * identifier using a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GenerateObjectWithToolCallIdOptions<A, I, R> {
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
  readonly toolCallId: string
}

/**
 * A utility type to extract the error type for the text generation methods
 * of `AiLanguageModel` from the provided options.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ExtractError<
  Options extends GenerateTextOptions<AiTool.Any>
> = Options extends {
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
export type ExtractContext<
  Options extends GenerateTextOptions<AiTool.Any>
> = Options extends {
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
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
    >(options: Options) => Effect.Effect<
      AiResponse,
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
      Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
    >(options: Options) => Stream.Stream<
      AiResponse,
      ExtractError<Options>,
      ExtractContext<Options>
    >

    /**
     * Generate a structured object for the specified prompt and schema using a
     * large language model.
     *
     * When using a `Schema` that does not have an `identifier` or `_tag`
     * property, you must specify a `toolCallId` to properly associate the
     * output of the model.
     */
    readonly generateObject: <A, I, R>(
      options: GenerateObjectOptions<A, I, R> | GenerateObjectWithToolCallIdOptions<A, I, R>
    ) => Effect.Effect<WithStructuredOutput<A>, AiError, R>
  }
}

const constEmptyMap = new Map<never, never>()

/**
 * @since 1.0.0
 * @category Models
 */
export interface AiLanguageModelOptions {
  readonly prompt: Arr.NonEmptyArray<Message>
  readonly system: Option.Option<string>
  readonly tools: Array<{
    readonly name: string
    readonly description: string
    readonly parameters: JsonSchema.JsonSchema7
    readonly structured: boolean
  }>
  readonly required: boolean | string
  readonly span: Span
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (opts: {
  readonly generateText: (options: AiLanguageModelOptions) => Effect.Effect<AiResponse, AiError>
  readonly streamText: (options: AiLanguageModelOptions) => Stream.Stream<AiResponse, AiError>
}): AiLanguageModel.Service => {
  const generateText = <
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
  >({ concurrency, required, toolkit, ...options }: Options): Effect.Effect<
    AiResponse,
    ExtractError<Options>,
    ExtractContext<Options>
  > =>
    Effect.useSpan(
      "AiLanguageModel.generateText",
      { captureStackTrace: false, attributes: { concurrency, required } },
      Effect.fnUntraced(function*(span) {
        let prompt = AiInput.make(options.prompt) as Arr.NonEmptyArray<Message>
        const system = Option.fromNullable(options.system)
        if (Predicate.isUndefined(toolkit)) {
          return yield* opts.generateText({ prompt, system, tools: [], required: false, span })
        }
        const actualToolkit = Effect.isEffect(toolkit) ? yield* toolkit : toolkit
        const tools: Array<{
          name: string
          description: string
          parameters: JsonSchema.JsonSchema7
          structured: boolean
        }> = []
        for (const tool of actualToolkit.tools) {
          tools.push(convertTool(tool))
        }
        let response = yield* opts.generateText({ prompt, system, tools, required, span })
        let stepCount = 1
        const maxSteps = options.maxSteps ?? 1
        while (response.finishReason === "tool-calls" && stepCount < maxSteps) {
          const parts = yield* resolveParts({ method: "generateText", response, toolkit: actualToolkit, concurrency })
          prompt = [...prompt, ...AiInput.make(parts)] as Arr.NonEmptyArray<Message>
          // Tool calls should not be required after the first call, otherwise
          // we may enter an infinite loop with the model provider
          response = yield* opts.generateText({ prompt, system, tools, required: false, span })
          stepCount += 1
        }
        return response
      }, (effect, span) => Effect.withParentSpan(effect, span))
    )

  const streamText = <
    Options extends NoExcessProperties<GenerateTextOptions<any>, Options>
  >({ concurrency, required, toolkit, ...options }: Options): Stream.Stream<
    AiResponse,
    ExtractError<Options>,
    ExtractContext<Options>
  > =>
    Stream.unwrap(Effect.gen(function*() {
      const makeScopedSpan = Effect.makeSpanScoped("AiLanguageModel.streamText", {
        captureStackTrace: false,
        attributes: { concurrency, required }
      })
      const prompt = AiInput.make(options.prompt) as Arr.NonEmptyArray<Message>
      const system = Option.fromNullable(options.system)
      if (Predicate.isUndefined(toolkit)) {
        return makeScopedSpan.pipe(
          Effect.map((span) => opts.streamText({ prompt, system, tools: [], required: false, span })),
          Stream.unwrapScoped
        ) as any
      }
      const actualToolkit = Effect.isEffect(toolkit) ? yield* toolkit : toolkit
      const tools: Array<{
        name: string
        description: string
        parameters: JsonSchema.JsonSchema7
        structured: boolean
      }> = []
      for (const tool of Object.values(actualToolkit.tools)) {
        tools.push(convertTool(tool))
      }

      // TODO: figure out how this logic makes sense in a streaming scenario
      // let response = yield* opts.generateText({ prompt, system, tools, required, span })
      // while (response.finishReason === "tool-calls") {
      //   const parts = yield* resolveParts({ method: "generateText", response, toolkit, concurrency })
      //   const prompt = AiInput.make(parts) as Arr.NonEmptyArray<Message>
      //   // Tool calls should not continuously be required otherwise we may enter
      //   // an infinite loop with the model provider
      //   response = yield* opts.generateText({ prompt, system, tools, required: false, span })
      // }
      // return response

      return makeScopedSpan.pipe(
        Effect.map((span) => opts.streamText({ prompt, system, tools, required, span })),
        Stream.unwrapScoped,
        Stream.mapEffect(
          (response) => resolveParts({ method: "streamText", response, toolkit: actualToolkit, concurrency }),
          { concurrency: "unbounded" }
        )
      )
    }))

  const generateObject = <A, I, R>(
    options: GenerateObjectOptions<A, I, R> | GenerateObjectWithToolCallIdOptions<A, I, R>
  ): Effect.Effect<WithStructuredOutput<A>, AiError, R> => {
    const toolCallId = "toolCallId" in options
      ? options.toolCallId
      : "_tag" in options.schema
      ? options.schema._tag
      : options.schema.identifier
    return Effect.useSpan(
      "AiLanguageModel.generateObject",
      {
        captureStackTrace: false,
        attributes: { toolCallId }
      },
      Effect.fnUntraced(function*(span) {
        const prompt = AiInput.make(options.prompt) as Arr.NonEmptyArray<Message>
        const system = Option.fromNullable(options.system)
        const decode = Schema.decodeUnknown(options.schema)
        const tool = convertStructured(toolCallId, options.schema)
        const response = yield* opts.generateText({ prompt, system, tools: [tool], required: true, span })
        const toolCallPart = response.parts.find((part): part is ToolCallPart =>
          part._tag === "ToolCall" && part.name === toolCallId
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
              new WithStructuredOutput({
                response,
                toolCallId: toolCallPart.id,
                toolName: toolCallPart.name,
                value: output
              })
            )
        })
      })
    )
  }

  return AiLanguageModel.of({ generateText, streamText, generateObject })
}

const convertTool = <Tool extends AiTool.Any>(tool: Tool) => ({
  name: tool.name,
  description: tool.description ?? getDescription(tool.parametersSchema.ast),
  parameters: makeJsonSchema(tool.parametersSchema.ast),
  structured: false
})

const convertStructured = <A, I, R>(name: string, schema: Schema.Schema<A, I, R>) => ({
  name,
  description: getDescription(schema.ast),
  parameters: makeJsonSchema(schema.ast),
  structured: true
})

const makeJsonSchema = (ast: AST.AST): JsonSchema.JsonSchema7 => {
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

const resolveParts = <Tool extends AiTool.Any>(options: {
  readonly response: AiResponse
  readonly toolkit: AiToolkit.ToHandler<Tool>
  readonly concurrency: Concurrency | undefined
  readonly method: string
}) =>
  Effect.gen(function*() {
    const toolNames: Array<string> = []
    const toolParts = options.response.parts.filter(
      (part): part is ToolCallPart => {
        if (part._tag === "ToolCall") {
          toolNames.push(part.name)
          return true
        }
        return false
      }
    )
    if (toolParts.length === 0) {
      return new WithToolCallResults({
        response: options.response,
        results: constEmptyMap,
        encodedResults: constEmptyMap
      })
    }
    yield* Effect.annotateCurrentSpan("toolCalls", toolNames)
    const results = new Map<ToolCallId, AiTool.Success<Tool>>()
    const encodedResults = new Map<ToolCallId, unknown>()
    yield* Effect.forEach(toolParts, (part) => {
      const id = part.id as AiInput.ToolCallId
      const name = part.name as AiTool.Name<Tool>
      const params = part.params as AiTool.Parameters<Tool>
      const toolCall = options.toolkit.handle(name, params)
      return Effect.map(toolCall, ({ encodedResult, result }) => {
        results.set(id, result)
        encodedResults.set(id, encodedResult)
      })
    }, { concurrency: options.concurrency, discard: true })
    return new WithToolCallResults({
      response: options.response,
      results,
      encodedResults
    })
  })

/**
 * Generate text using a large language model for the specified `prompt`.
 *
 * If a `toolkit` is specified, the large language model will additionally
 * be able to perform tool calls to augment its response.
 *
 * @since 1.0.0
 * @category functions
 */
export const generateText = Effect.serviceFunctionEffect(AiLanguageModel, (_) => _.generateText)

/**
 * Generate a structured object for the specified prompt and schema using a
 * large language model.
 *
 * When using a `Schema` that does not have an `identifier` or `_tag`
 * property, you must specify a `toolCallId` to properly associate the
 * output of the model.
 *
 * @since 1.0.0
 * @category functions
 */
export const generateObject = Effect.serviceFunctionEffect(AiLanguageModel, (_) => _.generateObject)

/**
 * Generate text using a large language model for the specified `prompt`,
 * streaming output from the model as soon as it is available.
 *
 * If a `toolkit` is specified, the large language model will additionally
 * be able to perform tool calls to augment its response.
 *
 * @since 1.0.0
 * @category functions
 */
export const streamText = <Options extends NoExcessProperties<GenerateTextOptions<any>, Options>>(options: Options) =>
  Stream.unwrap(AiLanguageModel.pipe(Effect.map((_) => _.streamText(options))))
