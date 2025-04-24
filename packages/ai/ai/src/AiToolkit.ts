/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import type { Inspectable } from "effect/Inspectable"
import { BaseProto as InspectableProto } from "effect/Inspectable"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import { AiError } from "./AiError.js"
import * as AiTool from "./AiTool.js"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiToolkit")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * An `AiToolkit` represents a set of tools that a large language model can
 * use to augment its response.
 *
 * @since 1.0.0
 * @category Models
 */
export interface AiToolkit<in out Tool extends AiTool.Any>
  extends Effect.Effect<ToHandler<Tool>, never, AiTool.ToHandler<Tool>>, Inspectable, Pipeable
{
  new(_: never): {}

  readonly [TypeId]: TypeId

  /**
   * A map containing the tools that are part of this toolkit.
   */
  readonly tools: {
    [T in Tool as T["name"]]: T
  }

  /**
   * Converts this toolkit into a `Context` object containing the handlers for
   * all tools in the toolkit.
   */
  toContext<Handlers extends HandlersFrom<Tool>, EX = never, RX = never>(
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Effect.Effect<Context.Context<AiTool.ToHandler<Tool>>, EX, RX>

  /**
   * Converts this toolkit into a `Layer` containing the handlers for all tools
   * in the toolkit.
   */
  toLayer<Handlers extends HandlersFrom<Tool>, EX = never, RX = never>(
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Layer.Layer<AiTool.ToHandler<Tool>, EX, Exclude<RX, Scope.Scope>>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Any {
  readonly [TypeId]: TypeId
  readonly tools: ReadonlyMap<string, AiTool.Any>
}

/**
 * Represents an `AiToolkit` which has been augmented with a handler function
 * for resolving tool call requests.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToHandler<in out Tool extends AiTool.Any> {
  readonly tools: ReadonlyArray<Tool>
  readonly handle: (toolName: AiTool.Name<Tool>, toolParams: AiTool.Parameters<Tool>) => AiTool.HandlerEffect<Tool>
}

/**
 * A utility mapped type which associates tool names with their handlers.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlersFrom<Tool extends AiTool.Any> = {
  [Name in Tool as Tool["name"]]: (params: AiTool.Parameters<Tool>) => AiTool.HandlerEffect<Tool>
}

/**
 * A utility type which returns the tools in an `AiToolkit`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Tools<Toolkit> = Toolkit extends AiToolkit<infer Tool> ? string extends Tool["name"] ? never : Tool : never

const Proto = {
  ...CommitPrototype,
  ...InspectableProto,
  [TypeId]: TypeId,
  toContext(this: AiToolkit<any>, build: Effect.Effect<Record<string, (params: any) => any>>) {
    return Effect.gen(this, function*() {
      const context = yield* Effect.context<never>()
      const handlers = Effect.isEffect(build) ? yield* build : build
      const contextMap = new Map<string, unknown>()
      for (const [name, handler] of Object.entries(handlers)) {
        const tool = this.tools[name]!
        contextMap.set(tool.key, { handler, context })
      }
      return Context.unsafeMake(contextMap)
    })
  },
  toLayer(this: AiToolkit<any>, build: Effect.Effect<Record<string, (params: any) => any>>) {
    return Layer.scopedContext(this.toContext(build))
  },
  commit(this: AiToolkit<AiTool.AnyWithProtocol>) {
    return Effect.gen(this, function*() {
      const context = yield* Effect.context<never>()
      const tools = this.tools
      const schemasCache = new WeakMap<any, {
        readonly context: Context.Context<never>
        readonly handler: (params: any) => Effect.Effect<any, any>
        readonly encodeSuccess: (u: unknown) => Effect.Effect<unknown, ParseError>
        readonly decodeFailure: (u: unknown) => Effect.Effect<AiTool.Failure<any>, ParseError>
        readonly decodeParameters: (u: unknown) => Effect.Effect<AiTool.Parameters<any>, ParseError>
      }>()
      const getSchemas = (tool: AiTool.AnyWithProtocol) => {
        let schemas = schemasCache.get(tool)
        if (Predicate.isUndefined(schemas)) {
          const handler = context.unsafeMap.get(tool.key)! as AiTool.Handler<any>
          const encodeSuccess = Schema.encodeUnknown(tool.successSchema) as any
          const decodeFailure = Schema.decodeUnknown(tool.failureSchema as any) as any
          const decodeParameters = Schema.decodeUnknown(tool.parametersSchema) as any
          schemas = {
            context: handler.context,
            handler: handler.handler,
            encodeSuccess,
            decodeFailure,
            decodeParameters
          }
          schemasCache.set(tool, schemas)
        }
        return schemas
      }
      const handle = Effect.fn("AiToolkit.handler", { captureStackTrace: false })(
        function*(toolName: string, toolParams: unknown) {
          yield* Effect.annotateCurrentSpan({
            tool: toolName,
            parameters: toolParams
          })
          const tool = tools[toolName]!
          const schemas = getSchemas(tool)
          const decodedParams = yield* Effect.mapError(
            schemas.decodeParameters(toolParams),
            (cause) =>
              new AiError({
                module: "AiToolkit",
                method: `${toolName}.handle`,
                description: `Failed to decode tool call parameters for tool '${toolName}' from '${toolParams}'`,
                cause
              })
          )
          const result = yield* schemas.handler(decodedParams).pipe(
            Effect.mapInputContext((input) => Context.merge(schemas.context, input)),
            Effect.catchAll((error) =>
              schemas.decodeFailure(error).pipe(
                Effect.mapError((cause) =>
                  new AiError({
                    module: "AiToolkit",
                    method: `${toolName}.handle`,
                    description: `Failed to decode tool call failure for tool '${toolName}'`,
                    cause
                  })
                ),
                Effect.flatMap(Effect.fail)
              )
            )
          )
          const encodedResult = yield* Effect.mapError(
            schemas.encodeSuccess(result),
            (cause) =>
              new AiError({
                module: "AiToolkit",
                method: `${toolName}.handle`,
                description: `Failed to encode tool call result for tool '${toolName}'`,
                cause
              })
          )
          return {
            result,
            encodedResult
          } satisfies AiTool.HandlerResult<any>
        }
      )
      return {
        tools: Array.from(Object.values(tools)),
        handle
      }
    })
  },
  toJSON(this: AiToolkit<any>): unknown {
    return {
      _id: "@effect/ai/AiToolkit",
      tools: Array.from(Object.values(this.tools)).map((tool) => tool.name)
    }
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Tools extends AiTool.Any>(tools: Record<string, Tools>): AiToolkit<Tools> =>
  Object.assign(function() {}, Proto, { tools }) as any

const resolveInput = <Tools extends ReadonlyArray<AiTool.Any>>(
  ...tools: Tools
): Record<string, Tools[number]> => {
  const output = {} as Record<string, Tools[number]>
  for (const tool of tools) {
    const value = (Schema.isSchema(tool) ? AiTool.fromTaggedRequest(tool as any) : tool) as any
    output[tool.name] = value
  }
  return output
}

/**
 * Constructs a new `AiToolkit` from the specified tools.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = <const Tools extends ReadonlyArray<AiTool.Any>>(
  ...tools: Tools
): AiToolkit<Tools[number]> => makeProto(resolveInput(...tools))

/**
 * Merges this toolkit with one or more other toolkits.
 *
 * @since 1.0.0
 * @category Merging
 */
export const merge = <const Toolkits extends ReadonlyArray<Any>>(
  ...toolkits: Toolkits
): AiToolkit<Tools<Toolkits[number]>> => {
  const tools = {} as Record<string, any>
  for (const toolkit of toolkits) {
    for (const [name, tool] of toolkit.tools) {
      tools[name] = tool
    }
  }
  return makeProto(tools)
}
