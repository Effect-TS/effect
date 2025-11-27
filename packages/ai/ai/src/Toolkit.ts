/**
 * The `Toolkit` module allows for creating and implementing a collection of
 * `Tool`s which can be used to enhance the capabilities of a large language
 * model beyond simple text generation.
 *
 * @example
 * ```ts
 * import { Toolkit, Tool } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * // Create individual tools
 * const GetCurrentTime = Tool.make("GetCurrentTime", {
 *   description: "Get the current timestamp",
 *   success: Schema.Number
 * })
 *
 * const GetWeather = Tool.make("GetWeather", {
 *   description: "Get weather for a location",
 *   parameters: { location: Schema.String },
 *   success: Schema.Struct({
 *     temperature: Schema.Number,
 *     condition: Schema.String
 *   })
 * })
 *
 * // Create a toolkit with multiple tools
 * const MyToolkit = Toolkit.make(GetCurrentTime, GetWeather)
 *
 * const MyToolkitLayer = MyToolkit.toLayer({
 *   GetCurrentTime: () => Effect.succeed(Date.now()),
 *   GetWeather: ({ location }) => Effect.succeed({
 *     temperature: 72,
 *     condition: "sunny"
 *   })
 * })
 * ```
 *
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
import * as ParseResult from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as AiError from "./AiError.js"
import * as Tool from "./Tool.js"

/**
 * Unique identifier for toolkit instances.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = "~@effect/ai/Toolkit"

/**
 * Type-level representation of the toolkit identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * Represents a collection of tools which can be used to enhance the
 * capabilities of a large language model.
 *
 * @example
 * ```ts
 * import { Toolkit, Tool } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * // Create individual tools
 * const GetCurrentTime = Tool.make("GetCurrentTime", {
 *   description: "Get the current timestamp",
 *   success: Schema.Number
 * })
 *
 * const GetWeather = Tool.make("GetWeather", {
 *   description: "Get weather for a location",
 *   parameters: { location: Schema.String },
 *   success: Schema.Struct({
 *     temperature: Schema.Number,
 *     condition: Schema.String
 *   })
 * })
 *
 * // Create a toolkit with multiple tools
 * const MyToolkit = Toolkit.make(GetCurrentTime, GetWeather)
 *
 * const MyToolkitLayer = MyToolkit.toLayer({
 *   GetCurrentTime: () => Effect.succeed(Date.now()),
 *   GetWeather: ({ location }) => Effect.succeed({
 *     temperature: 72,
 *     condition: "sunny"
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface Toolkit<in out Tools extends Record<string, Tool.Any>> extends
  Effect.Effect<
    WithHandler<Tools>,
    never,
    Tool.HandlersFor<Tools>
  >,
  Inspectable,
  Pipeable
{
  readonly [TypeId]: TypeId

  new(_: never): {}

  /**
   * A record containing all tools in this toolkit.
   */
  readonly tools: Tools

  /**
   * A helper method which can be used for type-safe handler declarations.
   */
  of<Handlers extends HandlersFrom<Tools>>(handlers: Handlers): Handlers

  /**
   * Converts a toolkit into an Effect Context containing handlers for each tool
   * in the toolkit.
   */
  toContext<Handlers extends HandlersFrom<Tools>, EX = never, RX = never>(
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Effect.Effect<Context.Context<Tool.HandlersFor<Tools>>, EX, RX>

  /**
   * Converts a toolkit into a Layer containing handlers for each tool in the
   * toolkit.
   */
  toLayer<Handlers extends HandlersFrom<Tools>, EX = never, RX = never>(
    /**
     * Handler functions or Effect that produces handlers.
     */
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Layer.Layer<Tool.HandlersFor<Tools>, EX, Exclude<RX, Scope.Scope>>
}

/**
 * A utility type which structurally represents any toolkit instance.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface Any {
  readonly [TypeId]: TypeId
  readonly tools: Record<string, Tool.Any>
}

/**
 * A utility type which can be used to extract the tool definitions from a
 * toolkit.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Tools<T> = T extends Toolkit<infer Tools> ? Tools : never

/**
 * A utility type which can transforms either a record or an array of tools into
 * a record where keys are tool names and values are the tool instances.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ToolsByName<Tools> = Tools extends Record<string, Tool.Any> ?
  { readonly [Name in keyof Tools]: Tools[Name] }
  : Tools extends ReadonlyArray<Tool.Any> ? { readonly [Tool in Tools[number] as Tool["name"]]: Tool }
  : never

/**
 * A utility type that maps tool names to their required handler functions.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlersFrom<Tools extends Record<string, Tool.Any>> = {
  readonly [Name in keyof Tools as Tool.RequiresHandler<Tools[Name]> extends true ? Name : never]: (
    params: Tool.Parameters<Tools[Name]>
  ) => Effect.Effect<
    Tool.Success<Tools[Name]>,
    Tool.Failure<Tools[Name]>,
    Tool.Requirements<Tools[Name]>
  >
}

/**
 * A utility type which can be used to extract the tools from a toolkit with handlers.
 *
 * @since 1.0.0
 * @category Utility Types
 */

export type WithHandlerTools<T> = T extends WithHandler<infer Tools> ? Tools : never

/**
 * A toolkit instance with registered handlers ready for tool execution.
 *
 * @since 1.0.0
 * @category Models
 */
export interface WithHandler<in out Tools extends Record<string, Tool.Any>> {
  /**
   * The tools available in this toolkit instance.
   */
  readonly tools: Tools

  /**
   * Handler function for executing tool calls.
   *
   * Receives a tool name and parameters, validates the input, executes the
   * corresponding handler, and returns both the typed result and encoded result.
   */
  readonly handle: <Name extends keyof Tools>(
    /**
     * The name of the tool to execute.
     */
    name: Name,
    /**
     * Parameters to pass to the tool handler.
     */
    params: Tool.Parameters<Tools[Name]>
  ) => Effect.Effect<
    Tool.HandlerResult<Tools[Name]>,
    Tool.Failure<Tools[Name]>,
    Tool.Requirements<Tools[Name]>
  >
}

const Proto = {
  ...CommitPrototype,
  ...InspectableProto,
  of: identity,
  toContext(
    this: Toolkit<Record<string, Tool.Any>>,
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
    this: Toolkit<Record<string, Tool.Any>>,
    build: Record<string, (params: any) => any> | Effect.Effect<Record<string, (params: any) => any>>
  ) {
    return Layer.scopedContext(this.toContext(build))
  },
  commit(this: Toolkit<Record<string, Tool.Any>>) {
    return Effect.gen(this, function*() {
      const tools = this.tools
      const context = yield* Effect.context<never>()
      const schemasCache = new WeakMap<any, {
        readonly context: Context.Context<never>
        readonly handler: (params: any) => Effect.Effect<any, any>
        readonly decodeParameters: (u: unknown) => Effect.Effect<Tool.Parameters<any>, ParseError>
        readonly validateResult: (u: unknown) => Effect.Effect<unknown, ParseError>
        readonly encodeResult: (u: unknown) => Effect.Effect<unknown, ParseError>
      }>()
      const getSchemas = (tool: Tool.Any) => {
        let schemas = schemasCache.get(tool)
        if (Predicate.isUndefined(schemas)) {
          const handler = context.unsafeMap.get(tool.id)! as Tool.Handler<any>
          const decodeParameters = Schema.decodeUnknown(tool.parametersSchema) as any
          const resultSchema = Schema.Union(tool.successSchema, tool.failureSchema)
          const validateResult = Schema.validate(resultSchema) as any
          const encodeResult = Schema.encodeUnknown(resultSchema) as any
          schemas = {
            context: handler.context,
            handler: handler.handler,
            decodeParameters,
            validateResult,
            encodeResult
          }
          schemasCache.set(tool, schemas)
        }
        return schemas
      }
      const handle = Effect.fn("Toolkit.handle", { captureStackTrace: false })(
        function*(name: string, params: unknown) {
          yield* Effect.annotateCurrentSpan({ tool: name, parameters: params })
          const tool = tools[name]
          if (Predicate.isUndefined(tool)) {
            const toolNames = Object.keys(tools).join(",")
            return yield* new AiError.MalformedOutput({
              module: "Toolkit",
              method: `${name}.handle`,
              description: `Failed to find tool with name '${name}' in toolkit - available tools: ${toolNames}`
            })
          }
          const schemas = getSchemas(tool)
          const decodedParams = yield* Effect.mapError(
            schemas.decodeParameters(params),
            (cause) =>
              new AiError.MalformedOutput({
                module: "Toolkit",
                method: `${name}.handle`,
                description: `Failed to decode tool call parameters for tool '${name}' from:\n'${
                  JSON.stringify(params, undefined, 2)
                }'`,
                cause
              })
          )
          const { isFailure, result } = yield* schemas.handler(decodedParams).pipe(
            Effect.map((result) => ({ result, isFailure: false })),
            Effect.catchAll((error) =>
              // If the tool handler failed, check the tool's failure mode to
              // determine how the result should be returned to the end user
              tool.failureMode === "error"
                ? Effect.fail(error)
                : Effect.succeed({ result: error, isFailure: true })
            ),
            Effect.tap(({ result }) => schemas.validateResult(result)),
            Effect.mapInputContext((input) => Context.merge(schemas.context, input)),
            Effect.mapError((cause) =>
              ParseResult.isParseError(cause)
                ? new AiError.MalformedInput({
                  module: "Toolkit",
                  method: `${name}.handle`,
                  description: `Failed to validate tool call result for tool '${name}'`,
                  cause
                })
                : cause
            )
          )
          const encodedResult = yield* Effect.mapError(
            schemas.encodeResult(result),
            (cause) =>
              new AiError.MalformedInput({
                module: "Toolkit",
                method: `${name}.handle`,
                description: `Failed to encode tool call result for tool '${name}'`,
                cause
              })
          )
          return {
            isFailure,
            result,
            encodedResult
          } satisfies Tool.HandlerResult<any>
        }
      )
      return {
        tools,
        handle
      } satisfies WithHandler<Record<string, any>>
    })
  },
  toJSON(this: Toolkit<any>): unknown {
    return {
      _id: "@effect/ai/Toolkit",
      tools: Array.from(Object.values(this.tools)).map((tool) => (tool as Tool.Any).name)
    }
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Tools extends Record<string, Tool.Any>>(tools: Tools): Toolkit<Tools> =>
  Object.assign(function() {}, Proto, { tools }) as any

const resolveInput = <Tools extends ReadonlyArray<Tool.Any>>(
  ...tools: Tools
): Record<string, Tools[number]> => {
  const output = {} as Record<string, Tools[number]>
  for (const tool of tools) {
    const value = (Schema.isSchema(tool) ? Tool.fromTaggedRequest(tool as any) : tool) as any
    output[tool.name] = value
  }
  return output
}

/**
 * An empty toolkit with no tools.
 *
 * Useful as a starting point for building toolkits or as a default value. Can
 * be extended using the merge function to add tools.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const empty: Toolkit<{}> = makeProto({})

/**
 * Creates a new toolkit from the specified tools.
 *
 * This is the primary constructor for creating toolkits. It accepts multiple tools
 * and organizes them into a toolkit that can be provided to AI language models.
 * Tools can be either Tool instances or TaggedRequest schemas.
 *
 * @example
 * ```ts
 * import { Toolkit, Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * const GetCurrentTime = Tool.make("GetCurrentTime", {
 *   description: "Get the current timestamp",
 *   success: Schema.Number
 * })
 *
 * const GetWeather = Tool.make("get_weather", {
 *   description: "Get weather information",
 *   parameters: { location: Schema.String },
 *   success: Schema.Struct({
 *     temperature: Schema.Number,
 *     condition: Schema.String
 *   })
 * })
 *
 * const toolkit = Toolkit.make(GetCurrentTime, GetWeather)
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = <Tools extends ReadonlyArray<Tool.Any>>(
  ...tools: Tools
): Toolkit<ToolsByName<Tools>> => makeProto(resolveInput(...tools)) as any

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
    Tool.Any
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
 * Merges multiple toolkits into a single toolkit.
 *
 * Combines all tools from the provided toolkits into one unified toolkit.
 * If there are naming conflicts, tools from later toolkits will override
 * tools from earlier ones.
 *
 * @example
 * ```ts
 * import { Toolkit, Tool } from "@effect/ai"
 *
 * const mathToolkit = Toolkit.make(
 *   Tool.make("add"),
 *   Tool.make("subtract")
 * )
 *
 * const utilityToolkit = Toolkit.make(
 *   Tool.make("get_time"),
 *   Tool.make("get_weather")
 * )
 *
 * const combined = Toolkit.merge(mathToolkit, utilityToolkit)
 * // combined now has: add, subtract, get_time, get_weather
 * ```
 *
 * @example
 * ```ts
 * import { Toolkit, Tool } from "@effect/ai"
 *
 * // Incremental toolkit building
 * const baseToolkit = Toolkit.make(Tool.make("base_tool"))
 * const extendedToolkit = Toolkit.merge(
 *   baseToolkit,
 *   Toolkit.make(Tool.make("additional_tool")),
 *   Toolkit.make(Tool.make("another_tool"))
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const merge = <const Toolkits extends ReadonlyArray<Any>>(
  /**
   * The toolkits to merge together.
   */
  ...toolkits: Toolkits
): Toolkit<MergedTools<Toolkits>> => {
  const tools = {} as Record<string, any>
  for (const toolkit of toolkits) {
    for (const [name, tool] of Object.entries(toolkit.tools)) {
      tools[name] = tool
    }
  }
  return makeProto(tools) as any
}
