/**
 * Long-running MCP tools that clients poll, answer, and cancel through the
 * 2026-07-28 Tasks extension.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as DateTime from "../DateTime.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Workflow from "../workflow/Workflow.ts"
import * as WorkflowEngine from "../workflow/WorkflowEngine.ts"
import * as McpCore from "./internal/mcpCore.ts"
import { TaskError } from "./internal/mcpCore.ts"
import * as McpServerTools from "./internal/mcpServerTools.ts"
import * as McpTasksWire from "./internal/mcpTasks.ts"
import * as TaskWorkflow from "./internal/mcpTasksWorkflow.ts"
import * as McpSchema from "./McpSchema.ts"
import * as McpServer from "./McpServer.ts"
import type * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

/**
 * Trusted ownership resolver for a task toolkit.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Options<R = never> {
  readonly owner: "shared" | Effect.Effect<string, never, R | McpSchema.McpRequestContext>
}

/**
 * Serializable context retained for task execution and replay.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface RequestContext {
  readonly clientId: number
  readonly protocolVersion: string
  readonly clientCapabilities: McpSchema.ClientCapabilities
  readonly clientInfo?: typeof McpSchema.Implementation.Type | undefined
  readonly requestMetadata?: McpSchema.McpRequestContext["Service"]["requestMetadata"] | undefined
}

/**
 * A task identifier and the trusted caller identity.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface TaskRequest {
  readonly taskId: string
  readonly ownerId: string
}

/**
 * Encoded arguments and context for creating a task.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface CreateRequest {
  readonly toolName: string
  readonly arguments: Schema.JsonObject
  readonly ownerId: string
  readonly requestContext: RequestContext
}

/**
 * Responses to outstanding task input requests.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface UpdateRequest extends TaskRequest {
  readonly inputResponses: Readonly<Record<string, McpSchema.McpInputResponse>>
}

/**
 * JSON-RPC failure of the underlying task execution.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface TaskFailure {
  readonly code: number
  readonly message: string
  readonly data?: Schema.JsonObject
}

/**
 * Current task state, constructed by the execution service rather than stored by MCP.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Task =
  & {
    readonly taskId: string
    readonly createdAt: DateTime.Utc
    readonly lastUpdatedAt: DateTime.Utc
    readonly ttlMs: number | null
    readonly pollIntervalMs?: number | undefined
    readonly statusMessage?: string | undefined
  }
  & (
    | { readonly status: "working" | "cancelled" }
    | { readonly status: "input_required"; readonly inputRequests: Readonly<Record<string, McpSchema.McpInputRequest>> }
    | { readonly status: "completed"; readonly result: McpSchema.CallToolResult }
    | { readonly status: "failed"; readonly error: TaskFailure }
  )

export {
  /**
   * Failure to create, read, update, or cancel a task.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.3
   */
  TaskError
}

/**
 * Task operations supplied by Workflow or an application job service.
 *
 * **Details**
 *
 * Creation must be durable and readable before returning, with an unguessable
 * identifier. Every operation must enforce ownership. Cancellation acknowledges
 * intent; reads report the outcome, which may still be completion.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class Execution extends Context.Service<Execution, {
  readonly create: (request: CreateRequest) => Effect.Effect<Task, TaskError>
  readonly get: (request: TaskRequest) => Effect.Effect<Task, TaskError>
  readonly update: (request: UpdateRequest) => Effect.Effect<void, TaskError>
  readonly cancel: (request: TaskRequest) => Effect.Effect<void, TaskError>
}>()("effect/ai/McpTasks/Execution") {}

/**
 * Requests client input and reports status from a running task handler.
 *
 * **Details**
 *
 * `layerMemory` and `layerWorkflow` supply this service per task. Updates
 * acknowledge receipt without waiting for the handler to decode the response,
 * and the first response for a key wins. Handle decoding failures in the
 * handler; another input round needs a new key. Clear the status message with
 * `undefined`. The last status message remains on terminal tasks.
 *
 * **Gotchas**
 *
 * Input keys must be unique across the task lifetime; reusing one is a defect.
 * Status changes are visible through polling; there are no notifications.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class TaskContext extends Context.Service<TaskContext, {
  readonly requestInput: <A, R>(options: {
    readonly key: string
    readonly request: McpSchema.McpInputRequest
    readonly response: Schema.Decoder<A, R>
  }) => Effect.Effect<A, Schema.SchemaError, R>
  readonly setStatusMessage: (message: string | undefined) => Effect.Effect<void>
}>()("effect/ai/McpTasks/TaskContext") {}

/**
 * Registers task-only tools that create tasks through the `Execution` service.
 *
 * **Details**
 *
 * The tools are listed only to clients using protocol 2026-07-28 and can only
 * be called by clients that declare the Tasks extension. Provide `Execution`
 * with `layerWorkflow`, `layerMemory`, or an application job service.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const toolkit = <Tools extends Record<string, Tool.Any>, R = never>(
  tools: Toolkit.Toolkit<Tools>,
  options: Options<R>
): Layer.Layer<never, never, McpServer.McpServer | Execution | Exclude<R, McpSchema.McpRequestContext>> =>
  Layer.effectDiscard(Effect.gen(function*() {
    const execution = yield* Execution
    const registry = yield* McpServer.McpServer
    const core = McpServerTools.serverCores.get(registry)
    if (core === undefined) {
      return yield* Effect.die(
        new Cause.IllegalArgumentError("McpTasks.toolkit requires an McpServer from McpServer.make or McpServer.layer")
      )
    }
    const services = McpServerTools.omitRequestServices(
      yield* Effect.context<Exclude<R, McpSchema.McpRequestContext>>()
    )
    const resolveOwner = options.owner
    const owner = (request: McpSchema.McpRequestContext["Service"]): Effect.Effect<string> =>
      resolveOwner === "shared" ? Effect.succeed("shared") : resolveOwner.pipe(
        Effect.provideService(McpSchema.McpRequestContext, request),
        Effect.updateContext((context: Context.Context<never>) => Context.merge(services, context))
      ) as Effect.Effect<string>

    const operations: McpCore.TaskOperations = {
      get: (taskId, { requestContext }) =>
        Effect.flatMap(owner(requestContext), (ownerId) => execution.get({ taskId, ownerId })),
      update: (taskId, inputResponses, { requestContext }) =>
        Effect.flatMap(owner(requestContext), (ownerId) => execution.update({ taskId, ownerId, inputResponses })),
      cancel: (taskId, { requestContext }) =>
        Effect.flatMap(owner(requestContext), (ownerId) => execution.cancel({ taskId, ownerId }))
    }

    const reject = (failure: TaskFailure) =>
      Effect.fail(new McpCore.RequestRejected({ ...failure, error: new McpSchema.McpErrorBase(failure) }))

    const create = Effect.fnUntraced(function*(toolName: string, args: unknown) {
      const request = yield* McpSchema.McpRequestContext
      // Check before creating so clients without Tasks never start work.
      if (!McpTasksWire.supportsTasks(request)) return yield* reject(McpTasksWire.missingCapability)
      const task = yield* execution.create({
        toolName,
        arguments: (args ?? {}) as Schema.JsonObject,
        ownerId: yield* owner(request),
        requestContext: {
          clientId: request.clientId,
          protocolVersion: request.protocolVersion,
          clientCapabilities: request.clientCapabilities,
          ...(request.clientInfo === undefined ? {} : { clientInfo: request.clientInfo }),
          ...(request.requestMetadata === undefined ? {} : { requestMetadata: request.requestMetadata })
        }
      }).pipe(Effect.catchTag("TaskError", reject))
      return new McpCore.TaskCreated({ task: { ...task, taskId: core.tasks.handle(toolName, task.taskId) } })
    })

    for (const tool of Object.values(tools.tools)) {
      const { tool: descriptor, annotations } = yield* McpServerTools.toolDescriptor(tool)
      const enabledWhen = Context.getOrUndefined(annotations, McpSchema.EnabledWhen)
      yield* core.tasks.register(tool.name, operations)
      yield* registry.addTool({
        tool: descriptor,
        annotations: Context.add(
          annotations,
          McpSchema.EnabledWhen,
          (profile) =>
            profile.protocolVersion === McpTasksWire.PROTOCOL_VERSION &&
            (enabledWhen === undefined || enabledWhen(profile))
        ),
        services,
        // McpServer passes TaskCreated and RequestRejected through to the protocol adapter.
        handle: (args) => create(tool.name, args) as Effect.Effect<never>
      })
    }
  }))

type Handlers<Tools extends Record<string, Tool.Any>> = Toolkit.HandlersFrom<Tools, unknown>
type Services<H> = H extends (...args: Array<never>) => Effect.Effect<unknown, unknown, infer R>
  ? 0 extends (1 & R) ? unknown : R
  : never
type HandlerServices<Tools extends Record<string, Tool.Any>, H> = Exclude<
  Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>,
  McpSchema.McpRequestContext | TaskContext
>

type Runner = (request: CreateRequest) => Effect.Effect<McpSchema.CallToolResult, TaskFailure>

// Runs handlers through the same decoding, encoding and error reporting as `McpServer.toolkit`.
const makeRunners = <Tools extends Record<string, Tool.Any>, EX, RX>(
  tools: Toolkit.Toolkit<Tools>,
  handlers: unknown
): Effect.Effect<ReadonlyMap<string, Runner>, EX, RX> =>
  Effect.gen(function*() {
    const context = yield* tools.toHandlers(handlers as any)
    const built = yield* McpServerTools.buildToolkit(tools).pipe(Effect.provideContext(context))
    const runners = new Map<string, Runner>()
    for (const registration of yield* McpServerTools.toolkitRegistrations(built)) {
      runners.set(registration.tool.name, (request) =>
        registration.handle(request.arguments).pipe(
          Effect.provideService(McpSchema.McpRequestContext, request.requestContext),
          Effect.mapError(({ code, message }): TaskFailure => ({ code, message }))
        ))
    }
    return runners
  }) as any

const unknownTask = () => new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
const unknownTool = () => new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown tool" })

const Request = Schema.Struct({
  clientId: Schema.Number,
  protocolVersion: Schema.String,
  clientCapabilities: McpSchema.ClientCapabilities,
  clientInfo: Schema.optional(McpSchema.Implementation),
  requestMetadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown))
})
const decodeRequest = Schema.decodeUnknownEffect(Request)
const Failure = Schema.Struct({ ...McpSchema.McpErrorBase.fields, data: Schema.optionalKey(Schema.JsonObject) })
const isFailure = Schema.is(Failure)
const ToolFailure = Schema.TaggedStruct("McpTaskToolFailure", { result: McpSchema.CallToolResult })
const isToolFailure = Schema.is(ToolFailure)

/**
 * Provides task execution through an existing Workflow engine.
 *
 * **Details**
 *
 * Each task is a Workflow execution, so handlers may use Activities, durable
 * clocks and deferreds. Tool failures and defects run Workflow compensations
 * and complete the task with an `isError` result. Change `name` when handlers
 * become replay-incompatible. Workflow owns history cleanup.
 *
 * Cancellation interrupts the execution with `WorkflowEngine.interrupt`, which
 * runs compensations. It takes effect when the handler next suspends, such as
 * while waiting for input or a durable clock, so a handler that never suspends
 * runs to completion and the task reports that outcome.
 *
 * **Gotchas**
 *
 * Keep `TaskContext` calls and response decoders in the handler, not in
 * Activities, and replay-safe. An input withdrawn by a lost race can stay
 * visible if the runner stops before recording the withdrawal; answers to it
 * are ignored.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layerWorkflow = <
  Tools extends Record<string, Tool.Any>,
  H extends Handlers<NoInfer<Tools>>,
  EX = never,
  RX = never
>(
  tools: Toolkit.Toolkit<Tools>,
  handlers: H | Effect.Effect<H, EX, RX>,
  options: { readonly name: string }
): Layer.Layer<
  Execution,
  EX | Schema.SchemaError,
  | WorkflowEngine.WorkflowEngine
  | Exclude<RX, Scope.Scope>
  | Exclude<
    HandlerServices<Tools, H>,
    WorkflowEngine.WorkflowEngine | WorkflowEngine.WorkflowInstance | Workflow.Execution<string> | Scope.Scope
  >
> =>
  Layer.effect(
    Execution,
    Effect.gen(function*() {
      yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(options.name)
      const engine = yield* WorkflowEngine.WorkflowEngine
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const runners = yield* makeRunners<Tools, EX, RX>(tools, handlers)
      const workflow = Workflow.make(`McpTasks/${options.name}`, {
        payload: {
          tool: Schema.String,
          arguments: Schema.JsonObject,
          request: Request,
          ownerId: Schema.String,
          id: Schema.String
        },
        success: McpSchema.CallToolResult,
        error: Schema.Union([Failure, ToolFailure]),
        idempotencyKey: ({ id }) => id
      })
      const state = TaskWorkflow.make(engine, workflow, scope)

      const register = engine.register(workflow, (payload) =>
        Effect.gen(function*() {
          const run = runners.get(payload.tool)
          if (run === undefined) {
            return yield* Effect.fail({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown tool" })
          }
          const { taskContext, finish } = yield* state.context
          yield* Workflow.addFinalizer(() => finish)
          const result = yield* run({
            toolName: payload.tool,
            arguments: payload.arguments,
            ownerId: payload.ownerId,
            requestContext: payload.request
          }).pipe(Effect.provideService(TaskContext, taskContext))
          // Tool errors fail the Workflow so its compensations run.
          return result.isError === true ? yield* Effect.fail(ToolFailure.make({ result })) : result
        }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine)))
      yield* Effect.updateContext(register, (context: Context.Context<Effect.Services<typeof register>>) =>
        Context.add(McpServerTools.omitRequestServices(context), Scope.Scope, Context.get(context, Scope.Scope)))

      const owned = Effect.fnUntraced(function*({ taskId, ownerId }: TaskRequest) {
        const identity = yield* state.read(taskId, TaskWorkflow.identity)
        if (Option.isNone(identity) || identity.value.ownerId !== ownerId) {
          return yield* unknownTask()
        }
        return identity.value
      })

      return Execution.of({
        create: Effect.fnUntraced(function*(request) {
          if (!runners.has(request.toolName)) {
            return yield* unknownTool()
          }
          const createdAt = yield* DateTime.now
          const executionId = yield* workflow.execute({
            tool: request.toolName,
            arguments: request.arguments,
            request: yield* decodeRequest(request.requestContext).pipe(
              Effect.mapError(() =>
                new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Invalid task request context" })
              )
            ),
            ownerId: request.ownerId,
            id: crypto.randomUUID()
          }, { discard: true }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine))
          // Creation returns once the owner is durable, so the handle is immediately readable.
          yield* state.write(executionId, TaskWorkflow.identity, { ownerId: request.ownerId, createdAt })
          return { taskId: executionId, createdAt, lastUpdatedAt: createdAt, ttlMs: null, status: "working" }
        }),
        get: Effect.fnUntraced(function*(request) {
          const { createdAt } = yield* owned(request)
          const current = yield* state.state(request.taskId)
          const base = {
            taskId: request.taskId,
            createdAt,
            lastUpdatedAt: current.lastUpdatedAt ?? createdAt,
            ttlMs: null,
            ...(current.statusMessage === undefined ? {} : { statusMessage: current.statusMessage })
          }
          const result = yield* engine.poll(workflow, request.taskId)
          if (Option.isNone(result) || result.value._tag !== "Complete") {
            return Object.keys(current.inputRequests).length === 0
              ? { ...base, status: "working" }
              : { ...base, status: "input_required", inputRequests: current.inputRequests }
          }
          const exit = result.value.exit
          if (Exit.isSuccess(exit)) {
            return { ...base, status: "completed", result: exit.value }
          }
          if (Cause.hasInterrupts(exit.cause)) {
            return { ...base, status: "cancelled" }
          }
          const error = Cause.findErrorOption(exit.cause)
          if (Option.isSome(error) && isToolFailure(error.value)) {
            return { ...base, status: "completed", result: error.value.result }
          }
          return {
            ...base,
            status: "failed",
            error: Option.isSome(error) && isFailure(error.value)
              ? error.value
              : { code: McpSchema.INTERNAL_ERROR_CODE, message: "Task execution failed" }
          }
        }),
        update: Effect.fnUntraced(function*(request) {
          yield* owned(request)
          yield* state.update(request.taskId, request.inputResponses)
        }),
        cancel: Effect.fnUntraced(function*(request) {
          yield* owned(request)
          yield* engine.interrupt(workflow, request.taskId)
        })
      })
    })
  )

/**
 * Provides process-local task execution using scoped Effect fibers.
 *
 * **Details**
 *
 * Cancellation interrupts the handler fiber immediately.
 *
 * **Gotchas**
 *
 * Tasks and results are lost when the layer closes. This layer cannot provide
 * durable creation and is intended for development and tests.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layerMemory = <
  Tools extends Record<string, Tool.Any>,
  H extends Handlers<NoInfer<Tools>>,
  EX = never,
  RX = never
>(
  tools: Toolkit.Toolkit<Tools>,
  handlers: H | Effect.Effect<H, EX, RX>
): Layer.Layer<Execution, EX, Exclude<RX, Scope.Scope> | HandlerServices<Tools, H>> =>
  Layer.effect(
    Execution,
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const services = McpServerTools.omitRequestServices(yield* Effect.context<never>())
      const runners = yield* makeRunners<Tools, EX, RX>(tools, handlers)

      interface PendingInput {
        readonly request: McpSchema.McpInputRequest
        readonly response: Deferred.Deferred<McpSchema.McpInputResponse>
      }
      interface Entry {
        readonly ownerId: string
        task: Task
        fiber?: Fiber.Fiber<void>
        readonly inputKeys: Set<string>
        readonly pending: Map<string, PendingInput>
      }
      const tasks = new Map<string, Entry>()
      yield* Scope.addFinalizer(scope, Effect.sync(() => tasks.clear()))

      const isActive = (entry: Entry) => entry.task.status === "working" || entry.task.status === "input_required"
      const base = (task: Task, lastUpdatedAt: DateTime.Utc) => ({
        taskId: task.taskId,
        createdAt: task.createdAt,
        lastUpdatedAt,
        ttlMs: task.ttlMs,
        ...(task.statusMessage === undefined ? {} : { statusMessage: task.statusMessage })
      })
      const refresh = (entry: Entry, lastUpdatedAt: DateTime.Utc) => {
        entry.task = entry.pending.size === 0
          ? { ...base(entry.task, lastUpdatedAt), status: "working" }
          : {
            ...base(entry.task, lastUpdatedAt),
            status: "input_required",
            inputRequests: Object.fromEntries(Array.from(entry.pending, ([key, input]) => [key, input.request]))
          }
      }

      const taskContext = (entry: Entry): TaskContext["Service"] => ({
        requestInput: Effect.fnUntraced(function*<A, R>(options: {
          readonly key: string
          readonly request: McpSchema.McpInputRequest
          readonly response: Schema.Decoder<A, R>
        }) {
          if (entry.inputKeys.has(options.key)) return yield* Effect.die(new Error("Task input keys must be unique"))
          entry.inputKeys.add(options.key)
          const pending: PendingInput = {
            request: options.request,
            response: yield* Deferred.make<McpSchema.McpInputResponse>()
          }
          return yield* Effect.acquireUseRelease(
            Effect.flatMap(DateTime.now, (now) =>
              Effect.sync(() => {
                entry.pending.set(options.key, pending)
                refresh(entry, now)
              })),
            () => Effect.flatMap(Deferred.await(pending.response), Schema.decodeUnknownEffect(options.response)),
            () =>
              Effect.flatMap(DateTime.now, (now) =>
                Effect.sync(() => {
                  if (entry.pending.get(options.key) !== pending) return
                  entry.pending.delete(options.key)
                  if (isActive(entry)) refresh(entry, now)
                }))
          )
        }),
        setStatusMessage: (message) =>
          Effect.flatMap(DateTime.now, (now) =>
            Effect.sync(() => {
              if (!isActive(entry)) return
              const { statusMessage: _, ...task } = entry.task
              entry.task = { ...task, ...(message === undefined ? {} : { statusMessage: message }), lastUpdatedAt: now }
            }))
      })

      const find = (request: TaskRequest) =>
        Effect.suspend(() => {
          const entry = tasks.get(request.taskId)
          return entry !== undefined && entry.ownerId === request.ownerId ? Effect.succeed(entry) : unknownTask()
        })

      return Execution.of({
        create: Effect.fnUntraced(function*(request) {
          const run = runners.get(request.toolName)
          if (run === undefined) return yield* unknownTool()
          const createdAt = yield* DateTime.now
          const task: Task = {
            taskId: crypto.randomUUID(),
            createdAt,
            lastUpdatedAt: createdAt,
            ttlMs: null,
            status: "working"
          }
          const entry: Entry = { ownerId: request.ownerId, task, inputKeys: new Set(), pending: new Map() }
          tasks.set(task.taskId, entry)
          entry.fiber = yield* run(request).pipe(
            Effect.provideService(TaskContext, taskContext(entry)),
            Effect.updateContext((context: Context.Context<never>) => Context.merge(services, context)),
            Effect.onExit((exit) =>
              Effect.flatMap(DateTime.now, (now) =>
                Effect.sync(() => {
                  entry.pending.clear()
                  const next = base(entry.task, now)
                  if (Exit.isSuccess(exit)) entry.task = { ...next, status: "completed", result: exit.value }
                  else if (Cause.hasInterrupts(exit.cause)) entry.task = { ...next, status: "cancelled" }
                  else {
                    const error = Cause.findErrorOption(exit.cause)
                    entry.task = {
                      ...next,
                      status: "failed",
                      error: Option.isSome(error)
                        ? error.value
                        : { code: McpSchema.INTERNAL_ERROR_CODE, message: "Task execution failed" }
                    }
                  }
                }))
            ),
            Effect.ignoreCause,
            Effect.forkIn(scope)
          )
          return task
        }),
        get: (request) => Effect.map(find(request), (entry) => entry.task),
        update: Effect.fnUntraced(function*(request) {
          const entry = yield* find(request)
          if (!isActive(entry)) return
          const received: Array<readonly [PendingInput, McpSchema.McpInputResponse]> = []
          for (const [key, response] of Object.entries(request.inputResponses)) {
            const pending = entry.pending.get(key)
            if (pending === undefined) continue
            entry.pending.delete(key)
            received.push([pending, response])
          }
          if (received.length === 0) return
          refresh(entry, yield* DateTime.now)
          for (const [pending, response] of received) Deferred.doneUnsafe(pending.response, Exit.succeed(response))
        }),
        cancel: Effect.fnUntraced(function*(request) {
          const entry = yield* find(request)
          if (entry.fiber !== undefined) yield* Fiber.interrupt(entry.fiber).pipe(Effect.forkIn(scope))
        })
      })
    })
  )
