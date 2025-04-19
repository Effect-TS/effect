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
import type { Concurrency } from "effect/Types"
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
export declare namespace AiLanguageModel {
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
  export interface GenerateTextOptions {
    /**
     * The prompt input to use to generate text.
     */
    readonly prompt: AiInput.AiInput.Raw

    /**
     * An optional system message that will be part of the prompt.
     */
    readonly system?: string | undefined
  }

  /**
   * Options for generating text using a large language model that is augmented
   * with tools.
   *
   * @since 1.0.0
   * @category Models
   */
  export interface GenerateTextWithToolsOptions<Tools extends AiTool.Any> extends GenerateTextOptions {
    /**
     * A toolkit containing both the tools and the tool call handler to use to
     * augment text generation.
     */
    readonly toolkit: AiToolkit.WithHandler<Tools>

    /**
     * Specifies whether a particular tool is required, or a boolean indicating
     * if any tool is required.
     */
    readonly required?: Tools["name"] | boolean | undefined

    /**
     * The concurrency level for generating text.
     */
    readonly concurrency?: Concurrency | undefined
  }

  /**
   * A utility type to extract the success type for the text generation methods
   * of `AiLanguageModel` from the provided options.
   *
   * @since 1.0.0
   * @category Utility Types
   */
  export type ExtractSuccess<
    Options extends GenerateTextOptions | GenerateTextWithToolsOptions<AiTool.Any>
  > = Options extends {
    toolkit: AiToolkit.WithHandler<infer _Tools>
  } ? WithToolCallResults<AiTool.Success<_Tools>>
    : AiResponse

  /**
   * A utility type to extract the error type for the text generation methods
   * of `AiLanguageModel` from the provided options.
   *
   * @since 1.0.0
   * @category Utility Types
   */
  export type ExtractError<
    Options extends GenerateTextOptions | GenerateTextWithToolsOptions<AiTool.Any>
  > = Options extends {
    toolkit: AiToolkit.WithHandler<infer _Tools>
  } ? AiError | AiTool.Failure<_Tools>
    : AiError

  /**
   * A utility type to extract the context type for the text generation methods
   * of `AiLanguageModel` from the provided options.
   *
   * @since 1.0.0
   * @category Utility Types
   */
  export type ExtractContext<
    Options extends GenerateTextOptions | GenerateTextWithToolsOptions<AiTool.Any>
  > = Options extends {
    toolkit: AiToolkit.WithHandler<infer _Tools>
  } ? AiTool.Context<_Tools>
    : never

  /**
   * Options for generating a structured object using a large language model.
   *
   * @since 1.0.0
   * @category Models
   */
  export interface GenerateObjectOptions<A, I, R> extends GenerateTextOptions {
    /**
     * The schema to be used to specify the structure of the object to generate.
     */
    readonly schema: AiLanguageModel.StructuredSchema<A, I, R>
  }

  /**
   * Options for generating a structured object with an associated tool call
   * identifier using a large language model.
   *
   * @since 1.0.0
   * @category Models
   */
  export interface GenerateObjectWithToolCallIdOptions<A, I, R> extends GenerateTextOptions {
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
      Options extends GenerateTextOptions | GenerateTextWithToolsOptions<AiTool.Any>
    >(options: Options) => Effect.Effect<
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
      Options extends GenerateTextOptions | GenerateTextWithToolsOptions<AiTool.Any>
    >(options: Options) => Stream.Stream<
      ExtractSuccess<Options>,
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
}): AiLanguageModel.Service =>
  AiLanguageModel.of({
    generateText(options: AiLanguageModel.GenerateTextOptions) {
      return generateText(opts.generateText, options as any) as any
    },
    streamText(options: AiLanguageModel.GenerateTextOptions) {
      return streamText(opts.streamText, options as any) as any
    },
    generateObject(options) {
      return generateObject(opts.generateText, options as any) as any
    }
  })

const generateText = <Tools extends AiTool.Any>(
  generateText: (options: AiLanguageModelOptions) => Effect.Effect<AiResponse, AiError>,
  options: AiLanguageModel.GenerateTextWithToolsOptions<Tools>
): Effect.Effect<
  WithToolCallResults<AiTool.Success<Tools>>,
  AiError | AiTool.Failure<Tools>,
  AiTool.Context<Tools>
> => {
  return Effect.useSpan("AiLanguageModel.generateText", {
    captureStackTrace: false,
    attributes: {
      concurrency: options.concurrency,
      required: options.required
    }
  }, (span) => {
    const prompt = AiInput.make(options.prompt) as Arr.NonEmptyArray<Message>
    const system = Option.fromNullable(options.system)
    const toolkit = options.toolkit
    if (Predicate.isUndefined(toolkit)) {
      return generateText({ prompt, system, tools: [], required: false, span }) as any
    }
    const tools: Array<{
      name: string
      description: string
      parameters: JsonSchema.JsonSchema7
      structured: boolean
    }> = []
    for (const tool of toolkit.tools.values()) {
      tools.push(convertTool(tool))
    }
    const concurrency = options.concurrency
    const required = options.required as string | boolean
    return Effect.flatMap(
      generateText({ prompt, system, tools, required, span }),
      (response) => resolveParts({ method: "generateText", response, toolkit, concurrency })
    ) as any
  })
}

const streamText = <Tools extends AiTool.Any>(
  streamText: (options: AiLanguageModelOptions) => Stream.Stream<AiResponse, AiError>,
  options: AiLanguageModel.GenerateTextWithToolsOptions<Tools>
): Stream.Stream<
  WithToolCallResults<AiTool.Success<Tools>>,
  AiError | AiTool.Failure<Tools>,
  AiTool.Context<Tools>
> => {
  const makeScopedSpan = Effect.makeSpanScoped("AiLanguageModel.streamText", {
    captureStackTrace: false,
    attributes: {
      concurrency: options.concurrency,
      required: options.required
    }
  })
  const prompt = AiInput.make(options.prompt) as Arr.NonEmptyArray<Message>
  const system = Option.fromNullable(options.system)
  const toolkit = options.toolkit
  if (Predicate.isUndefined(toolkit)) {
    return makeScopedSpan.pipe(
      Effect.map((span) => streamText({ prompt, system, tools: [], required: false, span })),
      Stream.unwrapScoped
    ) as any
  }
  const tools: Array<{
    name: string
    description: string
    parameters: JsonSchema.JsonSchema7
    structured: boolean
  }> = []
  for (const tool of toolkit.tools.values()) {
    tools.push(convertTool(tool))
  }
  const concurrency = options.concurrency
  const required = options.required as string | boolean
  return makeScopedSpan.pipe(
    Effect.map((span) => streamText({ prompt, system, tools, required, span })),
    Stream.unwrapScoped,
    Stream.mapEffect(
      (response) => resolveParts({ method: "streamText", response, toolkit, concurrency }),
      { concurrency: "unbounded" }
    )
  )
}

const generateObject = <A, I, R>(
  generateText: (options: AiLanguageModelOptions) => Effect.Effect<AiResponse, AiError>,
  options: AiLanguageModel.GenerateObjectOptions<A, I, R> | AiLanguageModel.GenerateObjectWithToolCallIdOptions<A, I, R>
): Effect.Effect<WithStructuredOutput<A>, AiError, R> => {
  const prompt = AiInput.make(options.prompt) as Arr.NonEmptyArray<Message>
  const system = Option.fromNullable(options.system)
  const decode = Schema.decodeUnknown(options.schema)
  const toolCallId = "toolCallId" in options
    ? options.toolCallId
    : "_tag" in options.schema
    ? options.schema._tag
    : options.schema.identifier
  const tool = convertStructured(toolCallId, options.schema)
  return Effect.useSpan("AiLanguageModel.generateObject", {
    captureStackTrace: false,
    attributes: { toolCallId }
  }, (span) =>
    generateText({ prompt, system, tools: [tool], required: true, span }).pipe(
      Effect.flatMap((response) => {
        const tool = response.parts.find((part): part is ToolCallPart =>
          part._tag === "ToolCall" && part.name === toolCallId
        )
        if (Predicate.isUndefined(tool)) {
          return new AiError({
            module: "AiLanguageModel",
            method: "generateObject",
            description: `Tool call '${toolCallId}' not found in model response`
          })
        }
        return Effect.matchEffect(decode(tool.params), {
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
                toolCallId: tool.id,
                toolName: tool.name,
                value: output
              })
            )
        })
      })
    ))
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

const resolveParts = <Tool extends AiTool.Any>(
  options: {
    readonly response: AiResponse
    readonly toolkit: AiToolkit.WithHandler<Tool>
    readonly concurrency: Concurrency | undefined
    readonly method: string
  }
) => {
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
    return Effect.succeed(
      new WithToolCallResults({
        response: options.response,
        results: constEmptyMap,
        encodedResults: constEmptyMap
      })
    )
  }
  const results = new Map<ToolCallId, AiTool.Success<Tool>>()
  const encodedResults = new Map<ToolCallId, unknown>()
  return Effect.annotateCurrentSpan("toolCalls", toolNames).pipe(
    Effect.zipRight(
      Effect.forEach(toolParts, (part) =>
        Effect.andThen(
          options.toolkit.handle(part.name as any, part.params as any),
          ({ encodedResult, result }) => {
            results.set(part.id, result)
            encodedResults.set(part.id, encodedResult)
          }
        ), { concurrency: options.concurrency, discard: true })
    ),
    Effect.as(
      new WithToolCallResults({
        response: options.response,
        results,
        encodedResults
      })
    )
  )
}
