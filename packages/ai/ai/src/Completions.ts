/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
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
import { WithResolved } from "./AiResponse.js"
import type * as AiToolkit from "./AiToolkit.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class Completions extends Context.Tag("@effect/ai/Completions")<
  Completions,
  Completions.Service
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Completions {
  /**
   * @since 1.0.0
   * @category models
   */
  export type StructuredSchema<A, I, R> = TaggedSchema<A, I, R> | IdentifiedSchema<A, I, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface TaggedSchema<A, I, R> extends Schema.Schema<A, I, R> {
    readonly _tag: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface IdentifiedSchema<A, I, R> extends Schema.Schema<A, I, R> {
    readonly identifier: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly create: (input: AiInput.Input) => Effect.Effect<AiResponse, AiError>
    readonly stream: (input: AiInput.Input) => Stream.Stream<AiResponse, AiError>
    readonly structured: {
      <A, I, R>(options: {
        readonly input: AiInput.Input
        readonly schema: StructuredSchema<A, I, R>
      }): Effect.Effect<WithResolved<A>, AiError, R>
      <A, I, R>(options: {
        readonly input: AiInput.Input
        readonly schema: Schema.Schema<A, I, R>
        readonly toolCallId: string
      }): Effect.Effect<WithResolved<A>, AiError, R>
    }
    readonly toolkit: <Tools extends AiToolkit.Tool.AnySchema>(
      options: {
        readonly input: AiInput.Input
        readonly tools: AiToolkit.Handlers<Tools>
        readonly required?: Tools["_tag"] | boolean | undefined
        readonly concurrency?: Concurrency | undefined
      }
    ) => Effect.Effect<
      WithResolved<AiToolkit.Tool.Success<Tools>>,
      AiError | AiToolkit.Tool.Failure<Tools>,
      AiToolkit.Tool.Context<Tools>
    >
    readonly toolkitStream: <Tools extends AiToolkit.Tool.AnySchema>(
      options: {
        readonly input: AiInput.Input
        readonly tools: AiToolkit.Handlers<Tools>
        readonly required?: Tools["_tag"] | boolean | undefined
        readonly concurrency?: Concurrency | undefined
      }
    ) => Stream.Stream<
      WithResolved<AiToolkit.Tool.Success<Tools>>,
      AiError | AiToolkit.Tool.Failure<Tools>,
      AiToolkit.Tool.Context<Tools>
    >
  }
}

const constEmptyMap = new Map<never, never>()

/**
 * @since 1.0.0
 * @category models
 */
export interface CompletionOptions {
  readonly system: Option.Option<string>
  readonly input: Chunk.NonEmptyChunk<Message>
  readonly tools: Array<{
    readonly name: string
    readonly description: string
    readonly parameters: JsonSchema.JsonSchema7
    readonly structured: boolean
  }>
  readonly required: boolean | string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: {
  readonly create: (options: {
    readonly system: Option.Option<string>
    readonly input: Chunk.NonEmptyChunk<Message>
    readonly tools: Array<{
      readonly name: string
      readonly description: string
      readonly parameters: JsonSchema.JsonSchema7
      readonly structured: boolean
    }>
    readonly required: boolean | string
    readonly span: Span
  }) => Effect.Effect<AiResponse, AiError>
  readonly stream: (options: {
    readonly system: Option.Option<string>
    readonly input: Chunk.NonEmptyChunk<Message>
    readonly tools: Array<{
      readonly name: string
      readonly description: string
      readonly parameters: JsonSchema.JsonSchema7
      readonly structured: boolean
    }>
    readonly required: boolean | string
    readonly span: Span
  }) => Stream.Stream<AiResponse, AiError>
}): Effect.Effect<Completions.Service> =>
  Effect.map(Effect.serviceOption(AiInput.SystemInstruction), (parentSystem) => {
    return Completions.of({
      create(input) {
        return Effect.useSpan(
          "Completions.create",
          { captureStackTrace: false },
          (span) =>
            Effect.serviceOption(AiInput.SystemInstruction).pipe(
              Effect.flatMap((system) =>
                options.create({
                  input: AiInput.make(input) as Chunk.NonEmptyChunk<Message>,
                  system: Option.orElse(system, () => parentSystem),
                  tools: [],
                  required: false,
                  span
                })
              )
            )
        )
      },
      stream(input_) {
        const input = AiInput.make(input_)
        return Effect.makeSpanScoped("Completions.stream", { captureStackTrace: false }).pipe(
          Effect.zip(Effect.serviceOption(AiInput.SystemInstruction)),
          Effect.map(([span, system]) =>
            options.stream({
              input: input as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: [],
              required: false,
              span
            })
          ),
          Stream.unwrapScoped
        )
      },
      structured(opts) {
        const input = AiInput.make(opts.input)
        const decode = Schema.decodeUnknown(opts.schema)
        const toolId = "toolCallId" in opts
          ? opts.toolCallId
          : "_tag" in opts.schema
          ? opts.schema._tag
          : opts.schema.identifier
        return Effect.useSpan(
          "Completions.structured",
          { attributes: { toolId }, captureStackTrace: false },
          (span) =>
            Effect.serviceOption(AiInput.SystemInstruction).pipe(
              Effect.flatMap((system) =>
                options.create({
                  input: input as Chunk.NonEmptyChunk<Message>,
                  system: Option.orElse(system, () => parentSystem),
                  tools: [convertTool(toolId, opts.schema, true)],
                  required: true,
                  span
                })
              ),
              Effect.flatMap((response) =>
                Chunk.findFirst(
                  response.parts,
                  (part): part is ToolCallPart => part._tag === "ToolCall" && part.name === toolId
                ).pipe(
                  Option.match({
                    onNone: () =>
                      Effect.fail(
                        new AiError({
                          module: "Completions",
                          method: "structured",
                          description: `Tool call '${toolId}' not found in response`
                        })
                      ),
                    onSome: (toolCall) =>
                      Effect.matchEffect(decode(toolCall.params), {
                        onFailure: (cause) =>
                          new AiError({
                            module: "Completions",
                            method: "structured",
                            description: `Failed to decode tool call '${toolId}' parameters`,
                            cause
                          }),
                        onSuccess: (resolved) =>
                          Effect.succeed(
                            new WithResolved({
                              response,
                              resolved: new Map([[toolCall.id, resolved]]),
                              encoded: new Map([[toolCall.id, toolCall.params]])
                            })
                          )
                      })
                  })
                )
              )
            )
        )
      },
      toolkit({ concurrency, input: inputInput, required = false, tools }) {
        const input = AiInput.make(inputInput)
        const toolArr: Array<{
          name: string
          description: string
          parameters: JsonSchema.JsonSchema7
          structured: boolean
        }> = []
        for (const [, tool] of tools.toolkit.tools) {
          toolArr.push(convertTool(tool._tag, tool as any))
        }
        return Effect.useSpan(
          "Completions.toolkit",
          { attributes: { concurrency, required }, captureStackTrace: false },
          (span) =>
            Effect.serviceOption(AiInput.SystemInstruction).pipe(
              Effect.flatMap((system) =>
                options.create({
                  input: input as Chunk.NonEmptyChunk<Message>,
                  system: Option.orElse(system, () => parentSystem),
                  tools: toolArr,
                  required: required as any,
                  span
                })
              ),
              Effect.flatMap((response) => resolveParts({ response, tools, concurrency, method: "toolkit" }))
            ) as any
        )
      },
      toolkitStream({ concurrency, input, required = false, tools }) {
        const toolArr: Array<{
          name: string
          description: string
          parameters: JsonSchema.JsonSchema7
          structured: boolean
        }> = []
        for (const [, tool] of tools.toolkit.tools) {
          toolArr.push(convertTool(tool._tag, tool as any))
        }
        return Effect.makeSpanScoped("Completions.stream", {
          captureStackTrace: false,
          attributes: { required, concurrency }
        }).pipe(
          Effect.zip(Effect.serviceOption(AiInput.SystemInstruction)),
          Effect.map(([span, system]) =>
            options.stream({
              input: AiInput.make(input) as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: toolArr,
              required: required as any,
              span
            })
          ),
          Stream.unwrapScoped,
          Stream.mapEffect(
            (chunk) => resolveParts({ response: chunk, tools, concurrency, method: "toolkitStream" }),
            { concurrency: "unbounded" }
          )
        ) as any
      }
    })
  })

const convertTool = <A, I, R>(
  name: string,
  schema: Schema.Schema<A, I, R>,
  structured = false
) => ({
  name,
  description: getDescription(schema.ast),
  parameters: makeJsonSchema(schema.ast),
  structured
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

const resolveParts = (
  options: {
    readonly response: AiResponse
    readonly tools: AiToolkit.Handlers<any>
    readonly concurrency: Concurrency | undefined
    readonly method: string
  }
) => {
  const toolNames: Array<string> = []
  const toolParts = Chunk.filter(
    options.response.parts,
    (part): part is ToolCallPart => {
      if (part._tag === "ToolCall") {
        toolNames.push(part.name)
        return true
      }
      return false
    }
  )
  if (Chunk.isEmpty(toolParts)) {
    return Effect.succeed(
      new WithResolved({
        response: options.response,
        resolved: constEmptyMap,
        encoded: constEmptyMap
      })
    )
  }
  const resolved = new Map<ToolCallId, AiToolkit.Tool.Success<any>>()
  const encoded = new Map<ToolCallId, unknown>()
  return Effect.annotateCurrentSpan("toolCalls", toolNames).pipe(
    Effect.zipRight(Effect.forEach(
      toolParts,
      (part) => {
        const tool = HashMap.unsafeGet(options.tools.toolkit.tools, part.name)
        const handler = HashMap.unsafeGet(options.tools.handlers, part.name)
        const decodeParams = Schema.decodeUnknown(tool as any)
        const encodeSuccess = Schema.encode(tool.success)
        return decodeParams(injectTag(part.params, part.name)).pipe(
          Effect.mapError((cause) =>
            new AiError({
              module: "Completions",
              method: options.method,
              description: `Failed to decode tool call '${part.name}' parameters`,
              cause
            })
          ),
          Effect.flatMap(handler),
          Effect.tap((value) => {
            return encodeSuccess(value).pipe(
              Effect.mapError((cause) =>
                new AiError({
                  module: "Completions",
                  method: options.method,
                  description: `Failed to encode tool call '${part.name}' result`,
                  cause
                })
              ),
              Effect.map((encodedValue) => {
                resolved.set(part.id, value)
                encoded.set(part.id, encodedValue)
              })
            )
          })
        )
      },
      { concurrency: options.concurrency, discard: true }
    )),
    Effect.as(new WithResolved({ response: options.response, resolved, encoded }))
  )
}

/**
 * Certain providers (i.e. Anthropic) do not do a great job returning the
 * `_tag` enum with the parameters for a tool call. This method ensures that
 * the `_tag` is injected into the tool call parameters to avoid issues when
 * decoding.
 */
function injectTag(params: unknown, tag: string) {
  // If for some reason we do not receive an object back for the tool call
  // input parameters, just return them unchanged
  if (!Predicate.isObject(params)) {
    return params
  }
  // If the tool's `_tag` is already present in input parameters, return them
  // unchanged
  if (Predicate.hasProperty(params, "_tag")) {
    return params
  }
  // Otherwise inject the tool's `_tag` into the input parameters
  return { ...params, _tag: tag }
}
