/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import { identity } from "effect/Function"
import type { Inspectable } from "effect/Inspectable"
import { BaseProto as InspectableProto } from "effect/Inspectable"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
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
export interface AiToolkit<in out Tools extends Record<string, AiTool.Any>> extends
  Effect.Effect<
    WithHandlers<Tools>,
    never,
    AiTool.HandlersFor<Tools>
  >,
  Inspectable,
  Pipeable
{
  readonly [TypeId]: TypeId

  new(_: never): {}

  /**
   * A record containing the tools that are part of this toolkit.
   */
  readonly tools: Tools

  /**
   * A helper method to get better type inference when defining the handlers for
   * the tools within a toolkit.
   */
  of<Handlers extends HandlersFrom<Tools>>(handlers: Handlers): Handlers

  /**
   * Converts this toolkit into a `Context` object containing the handlers for
   * all tools in the toolkit.
   */
  toContext<Handlers extends HandlersFrom<Tools>, EX = never, RX = never>(
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Effect.Effect<Context.Context<AiTool.HandlersFor<Tools>>, EX, RX>

  /**
   * Converts this toolkit into a `Layer` containing the handlers for all tools
   * in the toolkit.
   */
  toLayer<Handlers extends HandlersFrom<Tools>, EX = never, RX = never>(
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Layer.Layer<AiTool.HandlersFor<Tools>, EX, Exclude<RX, Scope.Scope>>
}

/**
 * A type which represents any `AiToolkit`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface Any {
  readonly [TypeId]: TypeId
  readonly tools: Record<string, AiTool.Any>
}

/**
 * A utility type which extracts the type of the tools in a toolkit.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Tools<Toolkit> = Toolkit extends AiToolkit<infer Tools> ? Tools : never

/**
 * A utility type which extracts the type of the tools in a toolkit as a record
 * where the keys of the record are the tool names and the values of the record
 * are the tools themselves.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ToolsByName<Tools> = Tools extends Record<string, AiTool.Any> ?
  { readonly [Name in keyof Tools]: Tools[Name] }
  : Tools extends ReadonlyArray<AiTool.Any> ? { readonly [Tool in Tools[number] as Tool["name"]]: Tool }
  : never

/**
 * A mapped type which associates the names of tools in a toolkit with their
 * associated handlers.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlersFrom<Tools extends Record<string, AiTool.Any>> = {
  readonly [Name in keyof Tools]: (params: AiTool.Parameters<Tools[Name]>) => Effect.Effect<
    AiTool.Success<Tools[Name]>,
    AiTool.Failure<Tools[Name]>,
    AiTool.Requirements<Tools[Name]>
  >
}

/**
 * Represents an `AiToolkit` which has been augmented with a handler function
 * for executing tool call requests.
 *
 * @since 1.0.0
 * @category Models
 */
export interface WithHandlers<in out Tools extends Record<string, AiTool.Any>> {
  readonly tools: Tools
  /**
   * A tool call handler for user-defined tools which receives the tool name
   * and tool parameters as input and returns the result of executing the tool
   * on the client.
   */
  readonly handleUserDefined: <Name extends keyof Tools>(
    name: Name,
    params: AiTool.Parameters<Tools[Name]>
  ) => Effect.Effect<
    {
      readonly result: AiTool.Success<Tools[Name]>
      readonly encodedResult: unknown
    },
    AiTool.Failure<Tools[Name]>,
    AiTool.Requirements<Tools[Name]>
  >
  /**
   * A tool call handler for provider-defined tools which receives the tool name
   * and tool result (as returned by the provider) as input and returns the result of executing the tool
   * on the client.
   */
  readonly handleProviderDefined: <Name extends keyof Tools>(
    name: Name,
    result: AiTool.Success<Tools[Name]>
  ) => Effect.Effect<
    {
      readonly result: AiTool.Success<Tools[Name]>
      readonly encodedResult: unknown
    },
    AiTool.Failure<Tools[Name]>,
    AiTool.Requirements<Tools[Name]>
  >
}

const Proto = {
  ...CommitPrototype,
  ...InspectableProto,
  of: identity,
  toContext(
    this: AiToolkit<Record<string, AiTool.Any>>,
    build: Record<string, (params: any) => any> | Effect.Effect<Record<string, (params: any) => any>>
  ) {
    return Effect.gen(this, function*() {
      const context = yield* Effect.context<never>()
      const handlers = Effect.isEffect(build) ? yield* build : build
      const contextMap = new Map<string, unknown>()
      for (const [name, handler] of Object.entries(handlers)) {
        const tool = this.tools[name]!
        contextMap.set(tool.id, { handler, context })
      }
      return Context.unsafeMake(contextMap)
    })
  },
  toLayer(
    this: AiToolkit<Record<string, AiTool.Any>>,
    build: Record<string, (params: any) => any> | Effect.Effect<Record<string, (params: any) => any>>
  ) {
    return Layer.scopedContext(this.toContext(build))
  },
  commit(this: AiToolkit<Record<string, AiTool.Any>>) {
    return Effect.gen(this, function*() {
      const tools = this.tools
      const context = yield* Effect.context<never>()
      const schemasCache = new WeakMap<any, {
        readonly context: Context.Context<never>
        readonly handler: (params: any) => Effect.Effect<any, any>
        readonly encodeSuccess: (u: unknown) => Effect.Effect<unknown, ParseError>
        readonly encodeFailure: (u: unknown) => Effect.Effect<unknown, ParseError>
        readonly decodeFailure: (u: unknown) => Effect.Effect<AiTool.Failure<any>, ParseError>
        readonly decodeParameters: (u: unknown) => Effect.Effect<AiTool.Parameters<any>, ParseError>
      }>()
      const getSchemas = (tool: AiTool.Any) => {
        let schemas = schemasCache.get(tool)
        if (Predicate.isUndefined(schemas)) {
          const handler = context.unsafeMap.get(tool.id)! as AiTool.Handler<any>
          const encodeSuccess = Schema.encodeUnknown(tool.successSchema) as any
          const encodeFailure = Schema.encodeUnknown(tool.failureSchema as any) as any
          const decodeFailure = Schema.decodeUnknown(tool.failureSchema as any) as any
          const decodeParameters = Schema.decodeUnknown(tool.parametersSchema) as any
          schemas = {
            context: handler.context,
            handler: handler.handler,
            encodeSuccess,
            encodeFailure,
            decodeFailure,
            decodeParameters
          }
          schemasCache.set(tool, schemas)
        }
        return schemas
      }
      const handleUserDefined = Effect.fn("AiToolkit.handleUserDefined", { captureStackTrace: false })(
        function*(name: string, params: unknown) {
          yield* Effect.annotateCurrentSpan({ tool: name, parameters: params })
          const tool = tools[name]!
          const schemas = getSchemas(tool)
          const decodedParams = yield* Effect.mapError(
            schemas.decodeParameters(params),
            (cause) =>
              new AiError({
                module: "AiToolkit",
                method: `${name}.handle`,
                description: `Failed to decode tool call parameters for tool '${name}' from:\n'${
                  JSON.stringify(params, undefined, 2)
                }'`,
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
                    method: `${name}.handle`,
                    description: `Failed to decode tool call failure for tool '${name}'`,
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
                method: `${name}.handle`,
                description: `Failed to encode tool call result for tool '${name}'`,
                cause
              })
          )
          return {
            result,
            encodedResult
          } satisfies AiTool.HandlerResult<any>
        }
      )
      const handleProviderDefined = Effect.fn("AiToolkit.handleProviderDefined", { captureStackTrace: false })(
        function*(name: string, result: unknown) {
          yield* Effect.annotateCurrentSpan({ tool: name, result })
          const tool = tools[name]!
          const schemas = getSchemas(tool)
          const encodedResult = yield* schemas.encodeSuccess(result).pipe(
            Effect.orElse(() => schemas.encodeFailure(result)),
            Effect.mapError((cause) =>
              new AiError({
                module: "AiToolkit",
                method: `${name}.handle`,
                description: `Failed to encode tool call result for tool '${name}'`,
                cause
              })
            )
          )
          return {
            result,
            encodedResult
          } satisfies AiTool.HandlerResult<any>
        }
      )
      return {
        tools,
        handleUserDefined,
        handleProviderDefined
      } satisfies WithHandlers<Record<string, any>>
    })
  },
  toJSON(this: AiToolkit<any>): unknown {
    return {
      _id: "@effect/ai/AiToolkit",
      tools: Array.from(Object.values(this.tools)).map((tool) => (tool as AiTool.Any).name)
    }
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Tools extends Record<string, AiTool.Any>>(tools: Tools): AiToolkit<Tools> =>
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
export const make = <Tools extends ReadonlyArray<AiTool.Any>>(
  ...tools: Tools
): AiToolkit<ToolsByName<Tools>> => makeProto(resolveInput(...tools)) as any

/**
 * A utility type which simplifies a record type.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type SimplifyRecord<T> = { [K in keyof T]: T[K] } & {}

/**
 * A utility type which merges two records of tools together.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type MergeRecords<U> = {
  readonly [K in Extract<U extends unknown ? keyof U : never, string>]: Extract<
    U extends Record<K, infer V> ? V : never,
    AiTool.Any
  >
}

/**
 * A utility type which merges the tool calls of two toolkits into a single
 * toolkit.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type MergedTools<Toolkits extends ReadonlyArray<Any>> = SimplifyRecord<
  MergeRecords<Tools<Toolkits[number]>>
>

/**
 * Merges this toolkit with one or more other toolkits.
 *
 * @since 1.0.0
 * @category Combination
 */
export const merge = <const Toolkits extends ReadonlyArray<Any>>(
  ...toolkits: Toolkits
): AiToolkit<MergedTools<Toolkits>> => {
  const tools = {} as Record<string, any>
  for (const toolkit of toolkits) {
    for (const [name, tool] of Object.entries(toolkit.tools)) {
      tools[name] = tool
    }
  }
  return makeProto(tools) as any
}
