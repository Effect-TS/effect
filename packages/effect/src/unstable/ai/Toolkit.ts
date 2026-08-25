/**
 * Groups AI tools together with their handlers.
 *
 * A toolkit connects `Tool` schemas to the handler functions an application
 * provides for a language model workflow. It can build a handler context or
 * layer and execute tool calls by name. Execution validates parameters, runs the
 * handler, encodes the result, supports preliminary streamed results, and
 * applies the tool's failure mode.
 *
 * @since 4.0.0
 */
import type * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Effectable from "../../Effectable.ts"
import * as Fiber from "../../Fiber.ts"
import { identity } from "../../Function.ts"
import * as InternalRecord from "../../internal/record.ts"
import * as Layer from "../../Layer.ts"
import * as Predicate from "../../Predicate.ts"
import * as Queue from "../../Queue.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as AiError from "./AiError.ts"
import type * as Tool from "./Tool.ts"

const TypeId = "~effect/ai/Toolkit" as const
const WithHandlerTypeId = "~effect/ai/Toolkit/WithHandler" as const

/**
 * Property used to execute a tool whose parameters have already been decoded
 * and validated against its parameter schema.
 *
 * This lower-level boundary is useful when composing resolved toolkits. Most
 * callers should use {@link WithHandler.handle}, which accepts encoded model
 * output and performs parameter decoding first.
 *
 * @category symbols
 * @since 4.0.0
 */
export const Execute = "~effect/ai/Toolkit/execute" as const

/**
 * Represents a collection of tools which can be used to enhance the
 * capabilities of a large language model.
 *
 * **Example** (Defining AI toolkits)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Tool, Toolkit } from "effect/unstable/ai"
 *
 * const SearchDocs = Tool.make("SearchDocs", {
 *   description: "Search project documentation",
 *   parameters: Schema.Struct({ query: Schema.String }),
 *   success: Schema.Array(Schema.String)
 * })
 *
 * const SummarizeText = Tool.make("SummarizeText", {
 *   description: "Summarize text",
 *   parameters: Schema.Struct({ text: Schema.String }),
 *   success: Schema.String
 * })
 *
 * const AiToolkit = Toolkit.make(SearchDocs, SummarizeText)
 *
 * const ready = AiToolkit.pipe(Effect.provide(AiToolkit.toLayer({
 *   SearchDocs: ({ query }) => Effect.succeed([query]),
 *   SummarizeText: ({ text }) => Effect.succeed(text)
 * })))
 *
 * Object.keys((await Effect.runPromise(ready)).tools) // => ["SearchDocs", "SummarizeText"]
 * ```
 *
 * @category models
 * @since 4.0.0
 */
export interface Toolkit<in out Tools extends Record<string, Tool.Any>> extends
  Effect.Effect<
    WithHandler<Tools>,
    never,
    Tool.HandlersFor<Tools>
  >
{
  new(_: never): {}

  readonly [TypeId]: typeof TypeId

  /**
   * A record containing all tools in this toolkit.
   */
  readonly tools: Tools

  /**
   * A helper method which can be used for type-safe handler declarations.
   */
  of<Handlers extends HandlersFrom<Tools>>(handlers: Handlers): Handlers

  /**
   * Converts a toolkit into a `Context` containing handlers for each tool
   * in the toolkit.
   */
  toHandlers<Handlers extends HandlersFrom<Tools>, EX = never, RX = never>(
    build: Handlers | Effect.Effect<Handlers, EX, RX>
  ): Effect.Effect<Context.Context<Tool.HandlersFor<Tools>>, EX, RX>

  /**
   * Converts a toolkit into a `Layer` containing handlers for each tool in the
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
 * Context provided to tool handlers during execution.
 *
 * @category models
 * @since 4.0.0
 */
export interface HandlerContext<Tool extends Tool.Any> {
  /**
   * The unique identifier of the tool call, when available.
   */
  readonly toolCallId?: string | undefined
  /**
   * Emit a preliminary result during long-running tool calls.
   *
   * **Details**
   *
   * Preliminary results are streamed to the caller before the handler completes,
   * enabling real-time progress updates for lengthy operations.
   */
  readonly preliminary: (result: Tool.Success<Tool>) => Effect.Effect<void>
}

/**
 * Represents any `Toolkit` instance, used for generic constraints.
 *
 * @category utility types
 * @since 4.0.0
 */
export interface Any {
  readonly [TypeId]: typeof TypeId
  readonly tools: Record<string, Tool.Any>
}

/**
 * A utility type which can be used to extract the tool definitions from a
 * toolkit.
 *
 * @category utility types
 * @since 4.0.0
 */
export type Tools<T> = T extends Toolkit<infer Tools> ? Tools : never

/**
 * A utility type which transforms either a record or an array of tools into
 * a record where keys are tool names and values are the tool instances.
 *
 * @category utility types
 * @since 4.0.0
 */
export type ToolsByName<Tools> = Tools extends Record<string, Tool.Any> ?
  { readonly [Name in keyof Tools]: Tools[Name] }
  : Tools extends ReadonlyArray<Tool.Any> ? { readonly [Tool in Tools[number] as Tool["name"]]: Tool }
  : never

/**
 * A utility type that maps tool names to their required handler functions.
 *
 * **Details**
 *
 * Handlers can return either the tool's custom failure type, an `AiErrorReason`
 * (which will be wrapped in `AiError`), or a full `AiError`.
 *
 * @category utility types
 * @since 4.0.0
 */
export type HandlersFrom<Tools extends Record<string, Tool.Any>> = {
  readonly [Name in keyof Tools as Tool.RequiresHandler<Tools[Name]> extends true ? Name : never]: (
    params: Tool.Parameters<Tools[Name]>,
    context: HandlerContext<Tools[Name]>
  ) => Effect.Effect<
    Tool.Success<Tools[Name]>,
    Tool.Failure<Tools[Name]> | AiError.AiError | AiError.AiErrorReason,
    Tool.HandlerServices<Tools[Name]>
  >
}

type HandlerExecutionServices<T> = T extends Tool.Tool<
  infer _Name,
  infer _Config,
  infer Requirements
> ? Tool.ResultEncodingServices<T> | Requirements
  : never

/**
 * Handler for tool parameters which have already been decoded and validated.
 *
 * @category models
 * @since 4.0.0
 */
export type DecodedHandle<Tools extends Record<string, Tool.Any>> = <Name extends keyof Tools>(
  name: Name,
  params: Tool.Parameters<Tools[Name]>,
  toolCallId?: string
) => Effect.Effect<
  Stream.Stream<
    Tool.HandlerResult<Tools[Name]>,
    Tool.HandlerError<Tools[Name]>,
    HandlerExecutionServices<Tools[Name]>
  >,
  AiError.AiError
>

/**
 * A toolkit instance with registered handlers ready for tool execution.
 *
 * @category models
 * @since 4.0.0
 */
export interface WithHandler<in out Tools extends Record<string, Tool.Any>> {
  readonly [WithHandlerTypeId]: typeof WithHandlerTypeId

  /**
   * The tools available in this toolkit instance.
   */
  readonly tools: Tools

  /**
   * Executes a tool call by name.
   *
   * **Details**
   *
   * Validates the input parameters, executes the corresponding handler, and
   * streams back both the typed result and encoded result. Streaming allows
   * handlers to emit preliminary results before completion.
   */
  readonly handle: <Name extends keyof Tools>(
    /**
     * The name of the tool to execute.
     */
    name: Name,
    /**
     * Encoded parameters to decode and pass to the tool handler.
     */
    params: Tool.ParametersEncoded<Tools[Name]>,
    /**
     * The unique identifier of the tool call.
     */
    toolCallId?: string
  ) => Effect.Effect<
    Stream.Stream<
      Tool.HandlerResult<Tools[Name]>,
      Tool.HandlerError<Tools[Name]>,
      Tool.HandlerServices<Tools[Name]>
    >,
    AiError.AiError
  >

  /** Executes a tool call whose parameters have already been decoded. */
  readonly [Execute]: DecodedHandle<Tools>
}

/**
 * A utility type which can be used to extract the tools from a toolkit with
 * handlers.
 *
 * @category utility types
 * @since 4.0.0
 */
export type WithHandlerTools<T> = T extends WithHandler<infer Tools> ? Tools : never

type ErasedHandle = (
  name: string,
  params: unknown,
  toolCallId?: string
) => Effect.Effect<Stream.Stream<unknown, unknown, unknown>, AiError.AiError, unknown>

const makeWithHandlerErased = <Tools extends Record<string, Tool.Any>>(
  tools: Tools,
  handle: ErasedHandle,
  execute: ErasedHandle
): WithHandler<Tools> => ({
  [WithHandlerTypeId]: WithHandlerTypeId,
  tools,
  handle,
  [Execute]: execute
} as WithHandler<Tools>)

/**
 * Creates a resolved toolkit from encoded and decoded handler boundaries.
 *
 * This is intended for integrations which compose, route, or decorate an
 * existing resolved toolkit. Application toolkits should normally be created
 * with {@link make} and provided with handlers through {@link Toolkit.toLayer}.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeWithHandler = <Tools extends Record<string, Tool.Any>>(
  tools: Tools,
  handle: WithHandler<Tools>["handle"],
  execute: DecodedHandle<Tools>
): WithHandler<Tools> => {
  return makeWithHandlerErased(tools, handle as ErasedHandle, execute as ErasedHandle)
}

const Proto = {
  ...Effectable.Prototype({
    label: "Toolkit",
    evaluate: Effect.fnUntraced(function*(this: Toolkit<Record<string, Tool.Any>>, parent) {
      const tools = this.tools
      const services = parent.context
      const schemasCache = new WeakMap<any, {
        readonly context: Context.Context<never>
        readonly handler: Tool.Handler<any>["handler"]
        readonly decodeParameters: (u: unknown) => Effect.Effect<unknown, Schema.SchemaError>
        readonly decodeResult: (u: unknown) => Effect.Effect<unknown, Schema.SchemaError>
        readonly encodeResult: (u: unknown) => Effect.Effect<unknown, Schema.SchemaError>
      }>()

      const getSchemas = (tool: Tool.Any) => {
        let schemas = schemasCache.get(tool)
        if (Predicate.isUndefined(schemas)) {
          const handler = services.mapUnsafe.get(tool.id)! as Tool.Handler<any>
          const resultSchema = tool.failureMode === "return"
            ? Schema.Union([tool.successSchema, tool.failureSchema, AiError.AiError])
            : tool.successSchema
          const decodeParameters = Schema.isSchema(tool.parametersSchema)
            ? Schema.decodeUnknownEffect(tool.parametersSchema) as any
            : (u: unknown) => Effect.succeed(u)
          const decodeResult = Schema.decodeUnknownEffect(resultSchema) as any
          const encodeResult = Schema.encodeUnknownEffect(resultSchema) as any
          schemas = {
            context: handler.context,
            handler: handler.handler,
            decodeParameters,
            decodeResult,
            encodeResult
          }
          schemasCache.set(tool, schemas)
        }
        return schemas
      }

      const execute = Effect.fnUntraced(function*(
        tool: Tool.Any,
        schemas: ReturnType<typeof getSchemas>,
        name: string,
        decodedParams: unknown,
        toolCallId?: string
      ) {
        // Setup the handler context
        const queue = yield* Queue.make<
          | {
            readonly result: any
            readonly isFailure: false
            readonly preliminary: boolean
          }
          | {
            readonly result: any
            readonly isFailure: true
            readonly preliminary: false
          },
          Cause.Done
        >()
        const context: HandlerContext<any> = {
          toolCallId,
          preliminary: (result) =>
            Effect.asVoid(Queue.offer(queue, {
              result,
              isFailure: false,
              preliminary: true
            }))
        }

        const fiber = yield* schemas.handler(decodedParams, context).pipe(
          Effect.flatMap((result) => Queue.offer(queue, { result, isFailure: false, preliminary: false })),
          Effect.updateContext((input) => Context.merge(schemas.context, input)),
          Effect.matchCauseEffect({
            onFailure: (cause) => Queue.failCause(queue, cause),
            onSuccess: () => Queue.end(queue)
          }),
          Effect.forkChild
        )

        const encodeResult = (result: any) =>
          schemas.encodeResult(result).pipe(
            Effect.mapError((cause) =>
              AiError.make({
                module: "Toolkit",
                method: `${name}.handle`,
                reason: new AiError.ToolResultEncodingError({
                  toolName: name,
                  toolResult: result,
                  description: cause.message
                })
              })
            )
          )

        const normalizeError = (error: unknown) => {
          // Schema errors indicate handler returned invalid data
          const normalizedError = Schema.isSchemaError(error)
            ? AiError.make({
              module: "Toolkit",
              method: `${name}.handle`,
              reason: new AiError.InvalidToolResultError({
                toolName: name,
                description: `Tool handler returned invalid result: ${error.message}`
              })
            })
            : AiError.isAiErrorReason(error)
            ? AiError.make({
              module: "Toolkit",
              method: `${name}.handle`,
              reason: error
            })
            : error
          return normalizedError
        }

        return Stream.fromQueue(queue).pipe(
          // If the tool handler failed, check the tool's failure mode to
          // determine how the result should be returned to the end user
          Stream.catch((error) => {
            const normalizedError = normalizeError(error)
            return tool.failureMode === "error"
              ? Stream.fail(normalizedError)
              : Stream.succeed({
                result: normalizedError,
                isFailure: true as const,
                preliminary: false as const
              })
          }),
          Stream.mapEffect(Effect.fnUntraced(function*(output) {
            const encodedResult = yield* encodeResult(output.result)
            return { ...output, encodedResult }
          })),
          Stream.onEnd(Fiber.interrupt(fiber))
        ) satisfies Stream.Stream<Tool.HandlerResult<any>, any>
      })

      const getTool = (name: string) => Object.hasOwn(tools, name) ? tools[name] : undefined

      const toolNotFound = (name: string) =>
        AiError.make({
          module: "Toolkit",
          method: `${name}.handle`,
          reason: new AiError.ToolNotFoundError({
            toolName: name,
            availableTools: Object.keys(tools)
          })
        })

      const handle = Effect.fnUntraced(function*(name: string, params: unknown, toolCallId?: string) {
        const tool = getTool(name)

        yield* Effect.annotateCurrentSpan({ tool: name, parameters: params })

        if (Predicate.isUndefined(tool)) {
          return yield* toolNotFound(name)
        }

        const schemas = getSchemas(tool)
        const decodedParams = yield* schemas.decodeParameters(params).pipe(
          Effect.mapError((cause) =>
            AiError.make({
              module: "Toolkit",
              method: `${name}.handle`,
              reason: new AiError.ToolParameterValidationError({
                toolName: name,
                toolParams: params,
                description: cause.message
              })
            })
          )
        )

        return yield* execute(tool, schemas, name, decodedParams, toolCallId)
      })

      const executeDecoded = Effect.fnUntraced(function*(name: string, params: unknown, toolCallId?: string) {
        const tool = getTool(name)

        yield* Effect.annotateCurrentSpan({ tool: name, parameters: params })

        if (Predicate.isUndefined(tool)) {
          return yield* toolNotFound(name)
        }

        return yield* execute(tool, getSchemas(tool), name, params, toolCallId)
      })

      return makeWithHandlerErased(tools, handle, executeDecoded)
    })
  }),
  [TypeId]: TypeId,
  of: identity,
  toHandlers(
    this: Toolkit<Record<string, Tool.Any>>,
    build: Record<string, (params: any) => any> | Effect.Effect<Record<string, (params: any) => any>>
  ) {
    return Effect.gen({ self: this }, function*() {
      const services = yield* Effect.context<never>()
      const handlers = Effect.isEffect(build) ? yield* build : build
      const context = new Map<string, unknown>()
      for (const [name, handler] of Object.entries(handlers)) {
        const tool = Object.hasOwn(this.tools, name) ? this.tools[name] : undefined
        if (tool !== undefined) {
          context.set(tool.id, { name, handler, context: services })
        }
      }
      return Context.makeUnsafe(context)
    })
  },
  toLayer(
    this: Toolkit<Record<string, Tool.Any>>,
    build: Record<string, (params: any) => any> | Effect.Effect<Record<string, (params: any) => any>>
  ) {
    return Layer.effectContext(this.toHandlers(build))
  },
  toJSON(this: Toolkit<any>): unknown {
    return {
      _id: "effect/ai/Toolkit",
      tools: Array.from(Object.values(this.tools)).map((tool) => (tool as Tool.Any).name)
    }
  }
}

const makeProto = <Tools extends Record<string, Tool.Any>>(tools: Tools): Toolkit<Tools> =>
  Object.assign(function() {}, Proto, { tools }) as any

const resolveInput = <Tools extends ReadonlyArray<Tool.Any>>(
  ...tools: Tools
): Record<string, Tools[number]> => {
  const output = {} as Record<string, Tools[number]>
  for (const tool of tools) {
    InternalRecord.assignProperty(output, tool.name, tool)
  }
  return output
}

/**
 * An empty toolkit with no tools.
 *
 * **When to use**
 *
 * Use when you need an empty starting point for building toolkits or a default
 * toolkit value that can be extended with `merge`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const empty: Toolkit<{}> = makeProto({})

/**
 * Creates a new toolkit from the specified tools.
 *
 * **Details**
 *
 * This is the primary constructor for creating toolkits. It accepts multiple
 * tools and organizes them into a toolkit that can be provided to AI language
 * models.
 *
 * **Example** (Creating a toolkit)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Tool, Toolkit } from "effect/unstable/ai"
 *
 * const GetCurrentTime = Tool.make("GetCurrentTime", {
 *   description: "Get the current timestamp",
 *   success: Schema.Number
 * })
 *
 * const GetWeather = Tool.make("get_weather", {
 *   description: "Get weather information",
 *   parameters: Schema.Struct({ location: Schema.String }),
 *   success: Schema.Struct({
 *     temperature: Schema.Number,
 *     condition: Schema.String
 *   })
 * })
 *
 * const toolkit = Toolkit.make(GetCurrentTime, GetWeather)
 * const ready = toolkit.pipe(Effect.provide(toolkit.toLayer({
 *   GetCurrentTime: () => Effect.succeed(0),
 *   get_weather: () => Effect.succeed({ temperature: 20, condition: "clear" })
 * })))
 *
 * Object.keys((await Effect.runPromise(ready)).tools) // => ["GetCurrentTime", "get_weather"]
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = <Tools extends ReadonlyArray<Tool.Any>>(
  ...tools: Tools
): Toolkit<ToolsByName<Tools>> => makeProto(resolveInput(...tools)) as any

/**
 * A utility type which flattens a record type for improved IDE display.
 *
 * @category utility types
 * @since 4.0.0
 */
export type SimplifyRecord<T> = { [K in keyof T]: T[K] } & {}

/**
 * A utility type which merges a union of tool records into a single record.
 *
 * @category utility types
 * @since 4.0.0
 */
export type MergeRecords<U> = {
  readonly [K in Extract<U extends unknown ? keyof U : never, string>]: Extract<
    U extends Record<K, infer V> ? V : never,
    Tool.Any
  >
}

/**
 * A utility type which merges the tools from multiple toolkits into a single
 * record.
 *
 * @category utility types
 * @since 4.0.0
 */
export type MergedTools<Toolkits extends ReadonlyArray<Any>> = SimplifyRecord<
  MergeRecords<Tools<Toolkits[number]>>
>

/**
 * Merges multiple toolkits into a single toolkit.
 *
 * **Details**
 *
 * Combines all tools from the provided toolkits into one unified toolkit.
 * If there are naming conflicts, tools from later toolkits will override
 * tools from earlier ones.
 *
 * **Example** (Merging toolkits)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Tool, Toolkit } from "effect/unstable/ai"
 *
 * const mathToolkit = Toolkit.make(
 *   Tool.make("add", { success: Schema.Number }),
 *   Tool.make("subtract", { success: Schema.Number })
 * )
 *
 * const utilityToolkit = Toolkit.make(
 *   Tool.make("get_time", { success: Schema.Number }),
 *   Tool.make("get_weather", { success: Schema.String })
 * )
 *
 * const combined = Toolkit.merge(mathToolkit, utilityToolkit)
 * const ready = combined.pipe(Effect.provide(combined.toLayer({
 *   add: () => Effect.succeed(1),
 *   subtract: () => Effect.succeed(0),
 *   get_time: () => Effect.succeed(0),
 *   get_weather: () => Effect.succeed("clear")
 * })))
 *
 * Object.keys((await Effect.runPromise(ready)).tools) // => ["add", "subtract", "get_time", "get_weather"]
 * ```
 *
 * @category constructors
 * @since 4.0.0
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
      InternalRecord.assignProperty(tools, name, tool)
    }
  }
  return makeProto(tools) as any
}
