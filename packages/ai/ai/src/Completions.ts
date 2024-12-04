/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as JsonSchema from "effect/JSONSchema"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Stream from "effect/Stream"
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
   * @models
   */
  export interface StructuredSchema<A, I, R> extends Schema.Schema<A, I, R> {
    readonly _tag?: string
    readonly identifier: string
  }

  /**
   * @since 1.0.0
   * @models
   */
  export interface Service {
    readonly create: (input: AiInput.Input) => Effect.Effect<AiResponse, AiError>
    readonly stream: (input: AiInput.Input) => Stream.Stream<AiResponse, AiError>
    readonly structured: <A, I, R>(
      options: {
        readonly input: AiInput.Input
        readonly schema: StructuredSchema<A, I, R>
      }
    ) => Effect.Effect<WithResolved<A>, AiError, R>
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
  }) => Stream.Stream<AiResponse, AiError>
}): Effect.Effect<Completions.Service> =>
  Effect.map(Effect.serviceOption(AiInput.SystemInstruction), (parentSystem) => {
    return Completions.of({
      create(input) {
        return Effect.serviceOption(AiInput.SystemInstruction).pipe(
          Effect.flatMap((system) =>
            options.create({
              input: AiInput.make(input) as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: [],
              required: false
            })
          ),
          Effect.withSpan("Completions.create", { captureStackTrace: false })
        )
      },
      stream(input_) {
        const input = AiInput.make(input_)
        return Effect.serviceOption(AiInput.SystemInstruction).pipe(
          Effect.map((system) =>
            options.stream({
              input: input as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: [],
              required: false
            })
          ),
          Stream.unwrap,
          Stream.withSpan("Completions.stream", { captureStackTrace: false })
        )
      },
      structured(opts) {
        const input = AiInput.make(opts.input)
        const schema = opts.schema
        const decode = Schema.decodeUnknown(schema)
        const toolId = schema._tag ?? schema.identifier
        return Effect.serviceOption(AiInput.SystemInstruction).pipe(
          Effect.flatMap((system) =>
            options.create({
              input: input as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: [convertTool(schema, true)],
              required: true
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
              }),
              Effect.withSpan("Completions.structured", {
                attributes: { tool: toolId },
                captureStackTrace: false
              })
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
          toolArr.push(convertTool(tool as any))
        }
        return Effect.serviceOption(AiInput.SystemInstruction).pipe(
          Effect.flatMap((system) =>
            options.create({
              input: input as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: toolArr,
              required: required as any
            })
          ),
          Effect.flatMap((response) => resolveParts({ response, tools, concurrency, method: "toolkit" })),
          Effect.withSpan("Completions.toolkit", {
            captureStackTrace: false,
            attributes: {
              concurrency,
              required
            }
          })
        ) as any
      },
      toolkitStream({ concurrency, input, required = false, tools }) {
        const toolArr: Array<{
          name: string
          description: string
          parameters: JsonSchema.JsonSchema7
          structured: boolean
        }> = []
        for (const [, tool] of tools.toolkit.tools) {
          toolArr.push(convertTool(tool as any))
        }
        return Effect.serviceOption(AiInput.SystemInstruction).pipe(
          Effect.map((system) =>
            options.stream({
              input: AiInput.make(input) as Chunk.NonEmptyChunk<Message>,
              system: Option.orElse(system, () => parentSystem),
              tools: toolArr,
              required: required as any
            })
          ),
          Stream.unwrap,
          Stream.mapEffect(
            (chunk) => resolveParts({ response: chunk, tools, concurrency, method: "toolkitStream" }),
            { concurrency: "unbounded" }
          ),
          Stream.withSpan("Completions.toolkitStream", {
            captureStackTrace: false,
            attributes: {
              concurrency,
              required
            }
          })
        ) as any
      }
    })
  })

const convertTool = <A, I, R>(tool: Completions.StructuredSchema<A, I, R>, structured = false) => ({
  name: tool._tag ?? tool.identifier,
  description: getDescription(tool.ast),
  parameters: JsonSchema.make(tool),
  structured
})

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
        return decodeParams(part.params).pipe(
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
