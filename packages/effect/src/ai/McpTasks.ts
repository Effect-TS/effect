/**
 * In-memory MCP Tasks execution for selected AI tools.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Cause from "../Cause.ts"
import type * as Context from "../Context.ts"
import type * as Duration from "../Duration.ts"
import type * as Effect from "../Effect.ts"
import type * as Layer from "../Layer.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import type * as AiError from "./AiError.ts"
import * as internal from "./internal/mcpTasks.ts"
import * as binding from "./internal/mcpTasksBinding.ts"
import * as McpSchema from "./McpSchema.ts"
import type * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

/**
 * Schema for a branded MCP task identifier.
 *
 * @category models
 * @since 4.0.0
 */
export const TaskId = Schema.String.pipe(Schema.brand("effect/ai/McpTasks/TaskId"))

/**
 * Type for a branded MCP task identifier.
 *
 * @category models
 * @since 4.0.0
 */
export type TaskId = typeof TaskId.Type

/**
 * Schema for the execution states of an MCP task.
 *
 * @category models
 * @since 4.0.0
 */
export const TaskStatus = Schema.Literals(["working", "input_required", "completed", "failed", "cancelled"])

/**
 * Schema for task identity, status, timestamps, and retention.
 *
 * @category models
 * @since 4.0.0
 */
export const Task = Schema.Struct({
  taskId: TaskId,
  status: TaskStatus,
  createdAt: Schema.DateTimeUtc,
  lastUpdatedAt: Schema.DateTimeUtc,
  ttl: Schema.Duration,
  pollInterval: Schema.optionalKey(Schema.Duration),
  statusMessage: Schema.optionalKey(Schema.String)
})

/**
 * Schema for a task and the input requests, result, or error associated with its status.
 *
 * @category models
 * @since 4.0.0
 */
export const DetailedTask = Schema.Union([
  Schema.Struct({ ...Task.fields, status: Schema.Literal("working") }),
  Schema.Struct({
    ...Task.fields,
    status: Schema.Literal("input_required"),
    inputRequests: Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Struct({ method: Schema.Literal("roots/list"), params: Schema.optional(Schema.JsonObject) }),
        Schema.Struct({ method: Schema.Literal("sampling/createMessage"), params: Schema.JsonObject }),
        Schema.Struct({ method: Schema.Literal("elicitation/create"), params: Schema.JsonObject })
      ])
    )
  }),
  Schema.Struct({ ...Task.fields, status: Schema.Literal("completed"), result: McpSchema.CallToolResult }),
  Schema.Struct({
    ...Task.fields,
    status: Schema.Literal("failed"),
    error: Schema.Struct({ code: Schema.Int, message: Schema.String, data: Schema.optionalKey(Schema.Unknown) })
  }),
  Schema.Struct({ ...Task.fields, status: Schema.Literal("cancelled") })
]).pipe(Schema.toTaggedUnion("status"))

/**
 * Type for a task and the input requests, result, or error associated with its status.
 *
 * @category models
 * @since 4.0.0
 */
export type DetailedTask = typeof DetailedTask.Type

/**
 * Error raised when a task policy or memory execution option is invalid.
 *
 * @category errors
 * @since 4.0.0
 */
export const InvalidOption: new(options: {
  option: string
  message: string
}) => InvalidOption = internal.InvalidOption

/**
 * Error raised when a task policy or memory execution option is invalid.
 *
 * @category errors
 * @since 4.0.0
 */
export interface InvalidOption extends Cause.YieldableError {
  readonly _tag: "McpTasksInvalidOption"

  readonly option: string
  readonly message: string
}

/**
 * Error raised when the client does not support a requested input operation.
 *
 * @category errors
 * @since 4.0.0
 */
export const InputUnavailable: new(options: {
  method: McpSchema.McpInputRequest["method"]
}) => InputUnavailable = internal.InputUnavailable

/**
 * Error raised when the client does not support a requested input operation.
 *
 * @category errors
 * @since 4.0.0
 */
export interface InputUnavailable extends Cause.YieldableError {
  readonly _tag: "McpTasksInputUnavailable"

  readonly method: McpSchema.McpInputRequest["method"]
}

/**
 * Policy that requires a tool to execute as a task.
 *
 * @category models
 * @since 4.0.0
 */
export interface RequiredPolicy {
  readonly mode: "required"
  readonly retention?: Duration.Input | undefined
  readonly pollInterval?: Duration.Input | undefined
  readonly timeout?: Duration.Input | undefined
}

/**
 * Policy that chooses task or inline execution and defines behavior for unsupported clients.
 *
 * @category models
 * @since 4.0.0
 */
export interface OptionalPolicy<T extends Tool.Any> extends Omit<RequiredPolicy, "mode"> {
  readonly mode: "optional"
  readonly whenUnavailable: "inline" | "reject"
  readonly decide?: (input: Tool.Parameters<T>) => Effect.Effect<"task" | "inline", Tool.Failure<T>, any>
}

type InputNames<Tools extends Record<string, Tool.Any>> = {
  [K in keyof Tools]: Input extends Tool.HandlerServices<Tools[K]> ? K : never
}[keyof Tools]

/**
 * Task policies indexed by tool name, requiring task execution for tools that depend on `Input`.
 *
 * @category models
 * @since 4.0.0
 */
export type Policies<Tools extends Record<string, Tool.Any>> =
  & { readonly [K in InputNames<Tools>]: RequiredPolicy }
  & { readonly [K in Exclude<keyof Tools, InputNames<Tools>>]?: RequiredPolicy | OptionalPolicy<Tools[K]> }

/**
 * Service that exposes the execution mode and lets a tool update its task status message.
 *
 * @category services
 * @since 4.0.0
 */
export const TaskContext: Context.ServiceClass<TaskContext, "effect/ai/McpTasks/TaskContext", TaskContext["Service"]> =
  internal.TaskContext

/**
 * Service that exposes the execution mode and lets a tool update its task status message.
 *
 * @category services
 * @since 4.0.0
 */
export interface TaskContext extends
  Context.ServiceClass.Shape<
    "effect/ai/McpTasks/TaskContext",
    {
      readonly mode: "inline"
      readonly setStatus: (message: string) => Effect.Effect<void>
    } | {
      readonly mode: "task"
      readonly taskId: TaskId
      readonly setStatus: (message: string) => Effect.Effect<void>
    }
  >
{}

/**
 * Service that requests client input while a task is running.
 *
 * @category services
 * @since 4.0.0
 */
export const Input: Context.ServiceClass<Input, "effect/ai/McpTasks/Input", Input["Service"]> = internal.Input

/**
 * Service that requests client input while a task is running.
 *
 * @category services
 * @since 4.0.0
 */
export interface Input extends
  Context.ServiceClass.Shape<"effect/ai/McpTasks/Input", {
    readonly roots: () => Effect.Effect<McpSchema.ListRootsResult, Schema.SchemaError | InputUnavailable>
    readonly sampling: (
      request: typeof McpSchema.CreateMessage.payloadSchema.Type
    ) => Effect.Effect<McpSchema.CreateMessageResult, Schema.SchemaError | InputUnavailable>
    readonly elicitation: <S extends Schema.Constraint>(
      request: typeof McpSchema.Elicit.payloadSchema.Type,
      response: S
    ) => Effect.Effect<
      | { readonly action: "accept"; readonly content: S["Type"] }
      | { readonly action: "decline" | "cancel" },
      Schema.SchemaError | InputUnavailable,
      S["DecodingServices"]
    >
  }>
{}

/**
 * Request context used to authorize access to a task.
 *
 * @category models
 * @since 4.0.0
 */
export type TaskRequestContext = McpSchema.McpRequestContext["Service"]

/**
 * Error returned by task operations with a JSON-RPC error code and message.
 *
 * @category errors
 * @since 4.0.0
 */
export const TaskError: new(options: {
  code: number
  message: string
  data?: Schema.JsonObject | undefined
}) => TaskError = binding.TaskError

/**
 * Error returned by task operations with a JSON-RPC error code and message.
 *
 * @category errors
 * @since 4.0.0
 */
export interface TaskError extends Cause.YieldableError {
  readonly _tag: "TaskError"

  readonly code: number
  readonly message: string
  readonly data?: Schema.JsonObject | undefined
}

/**
 * Service that creates, reads, updates, and cancels tasks.
 *
 * @category services
 * @since 4.0.0
 */
export const Execution: Context.ServiceClass<Execution, "effect/ai/McpTasks/Execution", Execution["Service"]> =
  internal.Execution

/**
 * Service that creates, reads, updates, and cancels tasks.
 *
 * @category services
 * @since 4.0.0
 */
export interface Execution extends
  Context.ServiceClass.Shape<"effect/ai/McpTasks/Execution", {
    readonly create: (
      run: Effect.Effect<McpSchema.CallToolResult, unknown, Input | TaskContext>,
      request: TaskRequestContext,
      options: ExecutionOptions
    ) => Effect.Effect<DetailedTask, TaskError>
    readonly get: (taskId: TaskId | string, request: TaskRequestContext) => Effect.Effect<DetailedTask, TaskError>
    readonly update: (
      taskId: TaskId | string,
      responses: Readonly<Record<string, McpSchema.McpInputResponse>>,
      request: TaskRequestContext
    ) => Effect.Effect<void, TaskError>
    readonly cancel: (taskId: TaskId | string, request: TaskRequestContext) => Effect.Effect<void, TaskError>
  }>
{}

/**
 * Options for in-memory task capacity, ownership, retention, and shutdown.
 *
 * @category models
 * @since 4.0.0
 */
export interface MemoryOptions<R = never> {
  /** Maximum number of executions, including executions whose finalizers are still running. */
  readonly maxActive: number
  /** Maximum number of retained task records. */
  readonly maxRecords: number
  /**
   * Access policy for task IDs. `"shared"` lets any client with a task ID access it.
   * An owner effect must return a trusted, stable identity for the caller, such as
   * an authenticated principal. Client-supplied metadata is not authentication.
   */
  readonly owner: "shared" | Effect.Effect<string, never, R | McpSchema.McpRequestContext>
  /** Lifetime from creation. Defaults to one hour. Expiry interrupts active work; infinity disables expiry. */
  readonly retention?: Duration.Input | undefined
  /** Suggested polling interval. Defaults to one second. */
  readonly pollInterval?: Duration.Input | undefined
  /** Grace period before shutdown signals interruption and returns. Defaults to 30 seconds. */
  readonly shutdownWait?: Duration.Input | undefined
  /** Optional execution deadline, bounded by finite retention. */
  readonly timeout?: Duration.Input | undefined
}

/**
 * Normalized duration overrides for an individual task execution.
 *
 * @category models
 * @since 4.0.0
 */
export interface ExecutionOptions {
  readonly retention?: Duration.Duration | undefined
  readonly pollInterval?: Duration.Duration | undefined
  readonly timeout?: Duration.Duration | undefined
}

type DecisionServices<Config> = {
  [K in keyof Config]: Config[K] extends { readonly decide: (input: never) => infer Decision }
    ? Effect.Services<Decision>
    : never
}[keyof Config]

/**
 * Creates an in-memory task execution layer with bounded capacity and scoped shutdown.
 *
 * **Gotchas**
 *
 * Records do not survive server restarts. A disconnected client can resume polling
 * before retention expires. Expiry and timeout request cooperative interruption.
 * Uninterruptible work and blocked finalizers can continue occupying execution
 * capacity. Shutdown returns after its grace period; finalizers may continue afterward.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerMemory: <R = never>(
  options: MemoryOptions<R>
) => Layer.Layer<Execution, InvalidOption, Exclude<R, McpSchema.McpRequestContext>> = internal.layerMemory

/**
 * Creates a reusable handler layer and defines its MCP task policies.
 *
 * **Details**
 *
 * Handler effects infer the handler layer's service requirements. Use `toLayer`
 * to provide the tools and install them on an MCP server. Task execution provides
 * `Input` and `TaskContext`, and requests provide `McpRequestContext`. Handlers
 * that use `Input` require a `required` policy unless a separate `inline` handler
 * is supplied. Inline handlers cannot use `Input`. A handler pair shares the tool's
 * parameter, success, and failure schemas. Every inline path uses the inline handler,
 * including an optional policy decision returning `"inline"`. Execution failures
 * do not trigger fallback.
 * An effect that builds handlers retains its construction services and errors.
 * Each layer captures services when built. Register the definition before applying
 * ordinary Layer combinators, which return a layer without its registration metadata.
 *
 * Task handles require `McpProtocol.v2026_07_28`. Clients declare
 * `extensions["io.modelcontextprotocol/tasks"]: {}` in the per-request
 * `_meta["io.modelcontextprotocol/clientCapabilities"]` object. A required tool
 * returns a capability error when the client does not declare the extension.
 *
 * **Example** (Providing a task and an inline fallback)
 *
 * This single-client example uses shared ownership. The client also declares
 * `roots: {}` and answers outstanding input with `tasks/update`. Clients without
 * Tasks receive a report using the server's configured default roots.
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema } from "effect"
 * import { McpProtocol, McpServer, McpTasks, Tool, Toolkit } from "effect/ai"
 * import { HttpRouter } from "effect/http"
 *
 * const Reports = Toolkit.make(Tool.make("workspace_report", {
 *   parameters: Schema.Struct({ title: Schema.String }),
 *   success: Schema.String,
 *   failure: Schema.String
 * }))
 *
 * const Tasks = McpTasks.toolkit(Reports, {
 *   workspace_report: { mode: "optional", whenUnavailable: "inline" }
 * }, {
 *   workspace_report: {
 *     task: Effect.fnUntraced(function*({ title }) {
 *       const task = yield* McpTasks.TaskContext
 *       const input = yield* McpTasks.Input
 *       yield* task.setStatus("Waiting for workspace roots")
 *       const response = yield* input.roots().pipe(Effect.mapError((error) => error.message))
 *       yield* task.setStatus("Preparing the report")
 *       return `${title}: ${response.roots.length} workspace roots`
 *     }),
 *     inline: Effect.fnUntraced(function*({ title }) {
 *       const defaultRoots = [{ uri: "file:///workspace", name: "Demo workspace" }]
 *       return `${title}: ${defaultRoots.length} workspace roots`
 *     })
 *   }
 * })
 *
 * const RegisteredTasks = Tasks.pipe(McpTasks.toLayer, Layer.provide(McpTasks.layerMemory({
 *   maxActive: 2,
 *   maxRecords: 20,
 *   owner: "shared",
 *   retention: "10 minutes",
 *   timeout: "1 minute"
 * })))
 *
 * const Server = Layer.mergeAll(RegisteredTasks, McpServer.layerHttp({
 *   name: "Reports",
 *   version: "1.0.0",
 *   path: "/mcp",
 *   protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25]
 * }))
 *
 * // Build the routes. A platform HTTP server can provide HttpRouter in an application.
 * await Effect.runPromise(
 *   Layer.build(Server.pipe(Layer.provide(HttpRouter.layer))).pipe(Effect.scoped)
 * )
 * ```
 *
 * @category layers
 * @since 4.0.0
 */
export const toolkit: <
  Tools extends Record<string, Tool.Any>,
  Handlers extends HandlersFrom<NoInfer<Tools>>,
  const Config extends Policies<NoInfer<Tools>>,
  EX = never,
  RX = never
>(
  tools: Toolkit.Toolkit<Tools>,
  policies: Config & Record<Exclude<keyof Config, keyof Tools>, never> & NoInfer<HandlerPolicies<Tools, Handlers>>,
  handlers:
    | (Handlers & Record<UnsafeInlineNames<Handlers>, never>)
    | Effect.Effect<Handlers & Record<UnsafeInlineNames<Handlers>, never>, EX, RX>
) => ToolkitLayer<
  Tool.HandlersFor<Tools>,
  EX,
  Exclude<RX, Scope.Scope> | Tool.HandlerServices<Tools[keyof Tools]> | HandlerServices<Handlers[keyof Handlers]>,
  InvalidOption | EX,
  | Execution
  | Exclude<RX, Scope.Scope>
  | Exclude<
    Tool.HandlerServices<Tools[keyof Tools]> | HandlerServices<Handlers[keyof Handlers]>,
    Input | TaskContext | McpSchema.McpRequestContext
  >
  | DecisionServices<Config>
> = internal.toolkit

/**
 * Reusable tool handler layer with a separate MCP execution layer.
 *
 * @category models
 * @since 4.0.0
 */
export interface ToolkitLayer<ROut, E, RIn, RegistrationError, RegistrationServices> extends Layer.Layer<ROut, E, RIn> {
  /** Registers these handlers and policies on an MCP server. */
  readonly mcpLayer: Layer.Layer<ROut, RegistrationError, RegistrationServices>
}

/**
 * Provides MCP tool handlers and registers their task policies on an MCP server.
 *
 * **Details**
 *
 * Construction services remain requirements of the returned layer. Use the original
 * toolkit layer to provide handlers for direct Toolkit calls and tests.
 * The returned handlers require an active MCP request and execution context;
 * calls through an ordinary Toolkit fail with an `AiError` outside that context.
 *
 * @see toolkit
 * @category layers
 * @since 4.0.0
 */
export const toLayer = <ROut, E, RIn, RegistrationError, RegistrationServices>(
  toolkit: ToolkitLayer<ROut, E, RIn, RegistrationError, RegistrationServices>
): Layer.Layer<ROut, RegistrationError, RegistrationServices> => toolkit.mcpLayer

/**
 * Tool handlers with inferred services and optional separate task and inline implementations.
 *
 * @category models
 * @since 4.0.0
 */
export type HandlersFrom<Tools extends Record<string, Tool.Any>> = {
  readonly [Name in keyof Tools]: HandlerFrom<Tools[Name]> | {
    readonly task: HandlerFrom<Tools[Name]>
    readonly inline: HandlerFrom<Tools[Name]>
  }
}

type HandlerFrom<T extends Tool.Any> = (
  params: Tool.Parameters<T>,
  context: Toolkit.HandlerContext<T>
) => Effect.Effect<Tool.Success<T>, Tool.Failure<T> | AiError.AiError | AiError.AiErrorReason, any>

type HandlerServices<Handler> = Handler extends { readonly task: infer Task; readonly inline: infer Inline }
  ? HandlerServices<Task> | HandlerServices<Inline>
  : Handler extends (...args: any) => infer Result ? Effect.Services<Result>
  : never

// Contextual handler constraints use any until concrete handler services are inferred.
type ConcreteServices<R> = 0 extends (1 & R) ? never : R

type UnsafeInlineNames<Handlers> = {
  [Name in keyof Handlers]: Handlers[Name] extends { readonly inline: infer Inline }
    ? Input extends ConcreteServices<HandlerServices<Inline>> ? Name : never
    : never
}[keyof Handlers]

type HandlerInputNames<Tools extends Record<string, Tool.Any>, Handlers> = {
  [Name in keyof Tools]: Input extends Tool.HandlerServices<Tools[Name]> ? Name
    : Handlers[Name & keyof Handlers] extends { readonly task: unknown; readonly inline: unknown } ? never
    : Input extends ConcreteServices<HandlerServices<Handlers[Name & keyof Handlers]>> ? Name
    : never
}[keyof Tools]

type HandlerPolicies<Tools extends Record<string, Tool.Any>, Handlers> = {
  readonly [Name in HandlerInputNames<Tools, Handlers>]: RequiredPolicy
}
