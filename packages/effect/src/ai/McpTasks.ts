/**
 * Registers long-running MCP tools using a supplied task execution service.
 *
 * @stability unstable
 * @since 4.0.0
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
import * as Predicate from "../Predicate.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as DurableDeferred from "../workflow/DurableDeferred.ts"
import * as Workflow from "../workflow/Workflow.ts"
import * as WorkflowEngine from "../workflow/WorkflowEngine.ts"
import * as Binding from "./internal/mcpTasksBinding.ts"
import { TaskError } from "./internal/mcpTasksBinding.ts"
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
 * @since 4.0.0
 */
export interface Options<R = never> {
  readonly owner: "shared" | Effect.Effect<string, never, R | McpSchema.McpRequestContext>
}

/**
 * Serializable context retained for task execution and replay.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
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
 * @since 4.0.0
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
 * @since 4.0.0
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
 * @since 4.0.0
 */
export interface UpdateRequest extends TaskRequest {
  readonly inputResponses: Readonly<Record<string, McpSchema.McpInputResponse>>
}

/**
 * JSON-RPC failure of the underlying task execution.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
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
 * @since 4.0.0
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
   * @since 4.0.0
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
 * intent, not termination.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
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
 * `layerMemory` and `layerWorkflow` supply this service per task. Updates acknowledge
 * receipt without waiting for the handler to decode the response. The first received response wins.
 * Handle decoding failures in the handler. Another input round needs a new key.
 * Status messages may be cleared with `undefined` and remain on terminal tasks.
 *
 * **Gotchas**
 *
 * Input keys and status checkpoint keys must each be unique across the task lifetime.
 * Use stable status keys so Workflow replay can skip completed checkpoints.
 * Reusing a key is a handler defect. Status changes are visible through task polling;
 * this service does not emit notifications.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class TaskContext extends Context.Service<TaskContext, {
  readonly requestInput: <A, R>(options: {
    readonly key: string
    readonly request: McpSchema.McpInputRequest
    readonly response: Schema.Decoder<A, R>
  }) => Effect.Effect<A, Schema.SchemaError, R>
  readonly setStatusMessage: (key: string, message: string | undefined) => Effect.Effect<void>
}>()("effect/ai/McpTasks/TaskContext") {}

/**
 * Runs a durable Workflow race and withdraws pending input from its losing branches.
 *
 * **Details**
 *
 * Use this helper for races containing `TaskContext.requestInput`. It delegates
 * to `DurableDeferred.raceAll` and associates input requests with the named race.
 * Task polls and updates observe its durable result, including
 * when replay skips the losing branches.
 *
 * **Gotchas**
 *
 * Plain `DurableDeferred.raceAll` does not track task input withdrawal. Race names
 * must be unique within the workflow, and handler code must remain replay-safe.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const workflowRace: typeof DurableDeferred.raceAll = (options) =>
  Effect.flatMap(TaskWorkflow.CurrentRaces, (parents) =>
    DurableDeferred.raceAll(options).pipe(
      Effect.provideService(TaskWorkflow.CurrentRaces, [...parents, `raceAll/${options.name}`])
    ))

type Handlers<Tools extends Record<string, Tool.Any>> = Toolkit.HandlersFrom<Tools, unknown>
type Services<H> = H extends (...args: Array<never>) => Effect.Effect<unknown, unknown, infer R>
  ? 0 extends (1 & R) ? unknown : R
  : never

/**
 * Registers task-only tools using the supplied `Execution` service.
 *
 * **Details**
 *
 * Pass an optional callback to construct and provide an execution layer using
 * this toolkit. The callback runs once when constructing the registration layer.
 * Without a callback, provide `Execution` through ordinary layer composition.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export function toolkit<Tools extends Record<string, Tool.Any>, R = never>(
  tools: Toolkit.Toolkit<Tools>,
  options: Options<R>
): Layer.Layer<never, never, McpServer.McpServer | Execution | Exclude<R, McpSchema.McpRequestContext>>
export function toolkit<Tools extends Record<string, Tool.Any>, R = never, E = never, RX = never>(
  tools: Toolkit.Toolkit<Tools>,
  options: Options<R>,
  execution: (tools: NoInfer<Toolkit.Toolkit<Tools>>) => Layer.Layer<Execution, E, RX>
): Layer.Layer<never, E, McpServer.McpServer | RX | Exclude<R, McpSchema.McpRequestContext>>
export function toolkit<Tools extends Record<string, Tool.Any>, R = never, E = never, RX = never>(
  tools: Toolkit.Toolkit<Tools>,
  options: Options<R>,
  makeExecution?: (tools: NoInfer<Toolkit.Toolkit<Tools>>) => Layer.Layer<Execution, E, RX>
) {
  const registration = Layer.effectDiscard(Effect.gen(function*() {
    const execution = yield* Execution
    const services = McpServer.omitRequestServices(
      yield* Effect.context<Exclude<R, McpSchema.McpRequestContext>>()
    )
    const registry = yield* McpServer.McpServer

    const binding = Binding.get(yield* McpServer.getCore(registry))
    const resolver = options.owner

    const owner = (request: McpSchema.McpRequestContext["Service"]): Effect.Effect<string> =>
      resolver === "shared"
        ? Effect.succeed("shared")
        : Effect.contextWith((current: Context.Context<never>) =>
          Effect.setContext(
            Effect.provideService(resolver, McpSchema.McpRequestContext, request),
            Context.makeUnsafe<Exclude<R, McpSchema.McpRequestContext>>(Context.merge(services, current).mapUnsafe)
          )
        )

    const descriptors = yield* Effect.forEach(Object.values(tools.tools), McpServer.makeToolDescriptor)

    for (const descriptor of descriptors) {
      const tool = descriptor.tool

      yield* binding.install(tool.name, {
        get: Effect.fnUntraced(function*(taskId, invocation) {
          return yield* execution.get({ taskId, ownerId: yield* owner(invocation.requestContext) })
        }),
        update: Effect.fnUntraced(function*(taskId, inputResponses, invocation) {
          yield* execution.update({ taskId, inputResponses, ownerId: yield* owner(invocation.requestContext) })
        }),
        cancel: Effect.fnUntraced(function*(taskId, invocation) {
          yield* execution.cancel({ taskId, ownerId: yield* owner(invocation.requestContext) })
        })
      })

      yield* registry.addTool({
        ...descriptor,
        handle: () => new McpSchema.InternalError({ message: "Tool requires MCP Tasks" })
      })

      yield* binding.register(
        tool.name,
        Effect.fnUntraced(function*(payload, invocation) {
          yield* Binding.requireTasks(invocation)
          const task = yield* execution.create({
            toolName: tool.name,
            arguments: payload.arguments ?? {},
            ownerId: yield* owner(invocation.requestContext),
            requestContext: {
              clientId: invocation.clientId,
              protocolVersion: invocation.protocol.protocolVersion,
              clientCapabilities: invocation.protocol.clientCapabilities,
              clientInfo: invocation.protocol.clientInfo,
              requestMetadata: invocation.protocol.requestMetadata
            }
          })

          return { _tag: "Task", task }
        })
      )
    }
  }))

  return makeExecution === undefined ? registration : Layer.provide(registration, makeExecution(tools))
}

type TaskRunner<R> = (request: CreateRequest) => Effect.Effect<McpSchema.CallToolResult, TaskFailure, R>

const makeHandlers = Effect.fnUntraced(function*<
  Tools extends Record<string, Tool.Any>,
  H extends Handlers<NoInfer<Tools>>,
  EX,
  RX
>(tools: Toolkit.Toolkit<Tools>, handlers: H | Effect.Effect<H, EX, RX>) {
  const implementation = Effect.isEffect(handlers) ? yield* handlers : handlers
  const built = yield* tools.withHandlers(implementation).pipe(
    Effect.updateContext((context: Context.Context<never>) => McpServer.omitRequestServices(context))
  )
  const registrations = yield* McpServer.makeToolkitRegistrations(built)
  const run = new Map<
    string,
    TaskRunner<
      Exclude<Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>, McpSchema.McpRequestContext>
    >
  >()
  for (const registration of registrations) {
    run.set(registration.tool.name, (request) =>
      registration.handle(request.arguments).pipe(
        Effect.provideService(McpSchema.McpRequestContext, request.requestContext),
        Effect.mapError((error) => ({ code: error.code, message: error.message })),
        Effect.flatMap((result) =>
          Predicate.isTagged(result, "InputRequired")
            ? Effect.fail({
              code: McpSchema.INTERNAL_ERROR_CODE,
              message: "Task input is not supported by this execution layer"
            })
            : Effect.succeed(result)
        )
      ))
  }
  return run
})

const identity = DurableDeferred.make("mcp/task/identity", {
  success: Schema.Struct({ ownerId: Schema.String, createdAt: Schema.DateTimeUtc })
})
const finishedAt = DurableDeferred.make("mcp/task/finishedAt", { success: Schema.DateTimeUtc })

const POLL_INTERVAL = "10 millis"
const POLL_ATTEMPTS = 20

const Request = Schema.Struct({
  clientId: Schema.Number,
  protocolVersion: Schema.String,
  clientCapabilities: McpSchema.ClientCapabilities,
  clientInfo: Schema.optional(McpSchema.Implementation),
  requestMetadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown))
})
const Failure = Schema.Struct({ ...McpSchema.McpErrorBase.fields, data: Schema.optionalKey(Schema.JsonObject) })

const decodeWorkflowName = Schema.decodeUnknownEffect(Schema.NonEmptyString)
const decodeTaskToken = Schema.decodeUnknownEffect(DurableDeferred.TokenParsed.FromString)
const decodeRequestContext = Schema.decodeUnknownEffect(Request)
const isFailure = Schema.is(Failure)

/**
 * Provides task execution through an existing Workflow engine.
 *
 * **Details**
 *
 * Handlers may use Activities. Change `name` for replay-incompatible handlers.
 * Workflow owns history cleanup, including durable input and status records.
 * Updates acknowledge persisted responses without waiting for the handler to decode them.
 * Responses for inputs that are no longer outstanding are ignored.
 *
 * **Gotchas**
 *
 * Keep task-context calls and response decoders replay-safe. Activities may
 * checkpoint side effects between input rounds. Task-state reads incrementally
 * refresh a bounded projection cache; cold reads rebuild it from durable history.
 * Use `workflowRace` to withdraw pending inputs from losing race branches,
 * including when replay skips their execution.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
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
) =>
  Layer.effect(
    Execution,
    Effect.gen(function*() {
      yield* decodeWorkflowName(options.name)
      const engine = yield* WorkflowEngine.WorkflowEngine
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const runners = yield* makeHandlers(tools, handlers)

      type WorkflowTaskRequest = TaskRequest & { readonly token: DurableDeferred.TokenParsed }
      const operations = new Map<string, {
        readonly create: Execution["Service"]["create"]
        readonly get: (request: WorkflowTaskRequest) => Effect.Effect<Task, TaskError>
        readonly update: (request: WorkflowTaskRequest & UpdateRequest) => Effect.Effect<void, TaskError>
        readonly cancel: (request: WorkflowTaskRequest) => Effect.Effect<void, TaskError>
      }>()

      for (const tool of Object.values(tools.tools)) {
        const workflow = Workflow.make(JSON.stringify(["McpTasks", options.name, tool.name]), {
          payload: { arguments: Schema.JsonObject, request: Request, ownerId: Schema.String, id: Schema.String },
          success: McpSchema.CallToolResult,
          error: Failure,
          idempotencyKey: ({ id }) => id
        })

        const readFact = <S extends Schema.Constraint>(executionId: string, fact: DurableDeferred.DurableDeferred<S>) =>
          engine.deferredResult(fact).pipe(
            Effect.provideService(
              WorkflowEngine.WorkflowInstance,
              WorkflowEngine.WorkflowInstance.initial(workflow, executionId, { scope })
            ),
            Effect.flatMap((value) =>
              Option.match(value, {
                onSome: (v) => Effect.map(v, Option.some),
                onNone: () => Effect.succeedNone
              })
            )
          )

        const readFinishedAt = (executionId: string) =>
          readFact(executionId, finishedAt).pipe(
            Effect.repeat({
              while: Option.isNone,
              schedule: Schedule.spaced(POLL_INTERVAL).pipe(Schedule.upTo({ times: POLL_ATTEMPTS }))
            }),
            Effect.flatMap((value) =>
              Option.isSome(value)
                ? Effect.succeed(value.value)
                : new TaskError({
                  code: McpSchema.INTERNAL_ERROR_CODE,
                  message: "Task state is not yet available; retry the request"
                })
            )
          )

        const findOwned = Effect.fnUntraced(function*({ token, ownerId }: WorkflowTaskRequest) {
          if (token.workflowName !== workflow._tag || token.deferredName !== identity.name) {
            return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
          }

          const fact = yield* readFact(token.executionId, identity)
          if (Option.isNone(fact) || fact.value.ownerId !== ownerId) {
            return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
          }

          return { ...fact.value, executionId: token.executionId }
        })

        const interaction = yield* TaskWorkflow.make(engine, workflow, scope)

        const register = engine.register(workflow, (payload) =>
          Effect.gen(function*() {
            yield* DurableDeferred.succeed(identity, {
              token: yield* DurableDeferred.token(identity),
              value: { ownerId: payload.ownerId, createdAt: yield* DateTime.now }
            })

            yield* Workflow.addFinalizer(() =>
              Effect.gen(function*() {
                yield* DurableDeferred.succeed(finishedAt, {
                  token: yield* DurableDeferred.token(finishedAt),
                  value: yield* DateTime.now
                })
              })
            )

            const taskContext = yield* interaction.context
            return yield* runners.get(tool.name)!({
              toolName: tool.name,
              arguments: payload.arguments,
              requestContext: payload.request,
              ownerId: payload.ownerId
            }).pipe(Effect.provideService(TaskContext, taskContext))
          }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine)))
        yield* Effect.updateContext(register, (context: Context.Context<Effect.Services<typeof register>>) =>
          Context.makeUnsafe(McpServer.omitRequestServices(context).mapUnsafe))

        operations.set(workflow._tag, {
          get: Effect.fnUntraced(function*(request) {
            const fact = yield* findOwned(request)
            const state = yield* interaction.snapshot(fact.executionId)
            const base = {
              taskId: request.taskId,
              createdAt: fact.createdAt,
              lastUpdatedAt: state.lastUpdatedAt ?? fact.createdAt,
              statusMessage: state.statusMessage,
              ttlMs: null
            }

            const result = yield* engine.poll(workflow, fact.executionId)

            if (Option.isNone(result) || result.value._tag !== "Complete") {
              return Object.keys(state.inputRequests).length === 0
                ? { ...base, status: "working" as const }
                : { ...base, status: "input_required" as const, inputRequests: state.inputRequests }
            }

            const lastUpdatedAt = yield* readFinishedAt(fact.executionId)

            const exit = result.value.exit

            if (Exit.isSuccess(exit)) {
              return { ...base, lastUpdatedAt, status: "completed", result: exit.value } satisfies Task
            }
            if (Cause.hasInterrupts(exit.cause)) {
              return { ...base, lastUpdatedAt, status: "cancelled" } satisfies Task
            }

            const error = Cause.findErrorOption(exit.cause)

            return {
              ...base,
              lastUpdatedAt,
              status: "failed",
              error: Option.isSome(error) && isFailure(error.value)
                ? error.value :
                { code: McpSchema.INTERNAL_ERROR_CODE, message: "Task execution failed" }
            } satisfies Task
          }),
          update: Effect.fnUntraced(function*(request) {
            const fact = yield* findOwned(request)
            yield* interaction.update(fact.executionId, request.inputResponses)
          }),
          cancel: Effect.fnUntraced(function*(request) {
            const fact = yield* findOwned(request)
            yield* interaction.cancel(fact.executionId)
            yield* engine.interrupt(workflow, fact.executionId)
          }),
          create: Effect.fnUntraced(function*(request) {
            const data = {
              id: crypto.randomUUID(),
              arguments: request.arguments,
              request: yield* decodeRequestContext(request.requestContext).pipe(
                Effect.mapError(() =>
                  new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Invalid task request context" })
                )
              ),
              ownerId: request.ownerId
            }

            const executionId = yield* workflow.execute(data, { discard: true }).pipe(
              Effect.provideService(WorkflowEngine.WorkflowEngine, engine)
            )

            // Accepted work must keep its submission open until its handle is readable.
            const fact = yield* readFact(executionId, identity).pipe(
              Effect.repeat({ while: Option.isNone, schedule: Schedule.spaced(POLL_INTERVAL) }),
              Effect.flatMap(Effect.fromOption),
              Effect.orDie
            )

            return {
              taskId: DurableDeferred.tokenFromExecutionId(identity, { workflow, executionId }),
              createdAt: fact.createdAt,
              lastUpdatedAt: fact.createdAt,
              ttlMs: null,
              status: "working"
            }
          })
        })
      }

      const resolve = Effect.fnUntraced(function*(taskId: string) {
        const token = yield* decodeTaskToken(taskId).pipe(
          Effect.mapError(() =>
            new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
          )
        )
        const entry = operations.get(token.workflowName)

        if (!entry) {
          return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
        }

        return { entry, token }
      })

      return Execution.of({
        create: Effect.fnUntraced(function*(request) {
          const name = JSON.stringify(["McpTasks", options.name, request.toolName])
          const entry = operations.get(name)

          if (!entry) {
            return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown tool" })
          }

          return yield* entry.create(request)
        }),
        get: Effect.fnUntraced(function*(request) {
          const { entry, token } = yield* resolve(request.taskId)
          return yield* entry.get({ ...request, token })
        }),
        update: Effect.fnUntraced(function*(request) {
          const { entry, token } = yield* resolve(request.taskId)
          yield* entry.update({ ...request, token })
        }),
        cancel: Effect.fnUntraced(function*(request) {
          const { entry, token } = yield* resolve(request.taskId)
          yield* entry.cancel({ ...request, token })
        })
      })
    })
  )

/**
 * Provides process-local task execution using scoped Effect fibers.
 *
 * **Gotchas**
 *
 * Tasks and results are lost when the layer closes. This layer cannot provide
 * durable creation and is intended for development and tests.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMemory = <
  Tools extends Record<string, Tool.Any>,
  H extends Handlers<NoInfer<Tools>>,
  EX = never,
  RX = never
>(
  tools: Toolkit.Toolkit<Tools>,
  handlers: H | Effect.Effect<H, EX, RX>
): Layer.Layer<
  Execution,
  EX,
  | Exclude<RX, Scope.Scope>
  | Exclude<
    Exclude<Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>, McpSchema.McpRequestContext>,
    TaskContext
  >
> =>
  Layer.effect(
    Execution,
    Effect.gen(function*() {
      type HandlerServices = Exclude<
        Exclude<Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>, McpSchema.McpRequestContext>,
        TaskContext
      >
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const services = Context.makeUnsafe<HandlerServices>(
        McpServer.omitRequestServices(yield* Effect.context<HandlerServices>()).mapUnsafe
      )
      const runners = yield* makeHandlers(tools, handlers)

      interface PendingInput {
        readonly request: McpSchema.McpInputRequest
        readonly response: Deferred.Deferred<McpSchema.McpInputResponse>
      }
      interface Entry {
        readonly ownerId: string
        task: Task
        fiber?: Fiber.Fiber<void>
        readonly usedKeys: Set<string>
        readonly pending: Map<string, PendingInput>
      }
      const tasks = new Map<string, Entry>()

      const isActive = (entry: Entry) => entry.task.status === "working" || entry.task.status === "input_required"
      const taskMetadata = (task: Task, lastUpdatedAt: DateTime.Utc) => ({
        taskId: task.taskId,
        createdAt: task.createdAt,
        lastUpdatedAt,
        ttlMs: task.ttlMs,
        statusMessage: task.statusMessage
      })
      const refresh = (entry: Entry, lastUpdatedAt: DateTime.Utc) => {
        const base = taskMetadata(entry.task, lastUpdatedAt)
        entry.task = entry.pending.size === 0
          ? { ...base, status: "working" }
          : {
            ...base,
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
          const response = yield* Deferred.make<McpSchema.McpInputResponse>()
          const pending: PendingInput = { request: options.request, response }
          const key = JSON.stringify(["input", options.key])
          return yield* Effect.acquireUseRelease(
            Effect.gen(function*() {
              const now = yield* DateTime.now
              if (!isActive(entry) || entry.usedKeys.has(key)) {
                return yield* Effect.die(new Error("Task input requires an active task and a unique request key"))
              }
              entry.usedKeys.add(key)
              entry.pending.set(options.key, pending)
              refresh(entry, now)
            }),
            () => Deferred.await(response).pipe(Effect.flatMap(Schema.decodeUnknownEffect(options.response))),
            () =>
              Effect.gen(function*() {
                const now = yield* DateTime.now
                if (entry.pending.get(options.key) === pending) {
                  entry.pending.delete(options.key)
                  if (isActive(entry)) refresh(entry, now)
                }
              })
          )
        }),
        setStatusMessage: Effect.fnUntraced(function*(key, message) {
          const now = yield* DateTime.now
          if (!isActive(entry)) return
          const operation = JSON.stringify(["status", key])
          if (entry.usedKeys.has(operation)) return yield* Effect.die(new Error("Task status requires a unique key"))
          entry.usedKeys.add(operation)
          entry.task = { ...entry.task, statusMessage: message, lastUpdatedAt: now }
        })
      })

      yield* Scope.addFinalizer(scope, Effect.sync(() => tasks.clear()))

      const find = (request: TaskRequest) =>
        Effect.suspend(() => {
          const entry = tasks.get(request.taskId)

          return entry && entry.ownerId === request.ownerId
            ? Effect.succeed(entry)
            : new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
        })

      return Execution.of({
        create: Effect.fnUntraced(function*(request) {
          const run = runners.get(request.toolName)

          if (!run) return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown tool" })

          const createdAt = yield* DateTime.now
          const task: Task = {
            taskId: crypto.randomUUID(),
            createdAt,
            lastUpdatedAt: createdAt,
            ttlMs: null,
            status: "working"
          }

          const entry: Entry = {
            ownerId: request.ownerId,
            task,
            usedKeys: new Set(),
            pending: new Map()
          }

          tasks.set(task.taskId, entry)

          entry.fiber = yield* run(request).pipe(
            Effect.provideService(TaskContext, taskContext(entry)),
            Effect.setContext(services),
            Effect.onExit(Effect.fnUntraced(function*(exit) {
              const lastUpdatedAt = yield* DateTime.now
              const base = taskMetadata(entry.task, lastUpdatedAt)
              entry.pending.clear()

              if (Exit.isSuccess(exit)) entry.task = { ...base, status: "completed", result: exit.value }
              else if (Cause.hasInterrupts(exit.cause)) entry.task = { ...base, status: "cancelled" }
              else {
                const error = Cause.findErrorOption(exit.cause)
                entry.task = {
                  ...base,
                  status: "failed",
                  error: Option.isSome(error)
                    ? error.value
                    : { code: McpSchema.INTERNAL_ERROR_CODE, message: "Task execution failed" }
                }
              }
            })),
            Effect.ignoreCause,
            Effect.forkIn(scope)
          )
          entry.fiber.addObserver(() => {
            delete entry.fiber
          })
          return task
        }),
        get: (request) => Effect.map(find(request), (entry) => entry.task),
        update: Effect.fnUntraced(function*(request) {
          const entry = yield* find(request)
          const now = yield* DateTime.now
          if (!isActive(entry)) return
          const received: Array<readonly [PendingInput, McpSchema.McpInputResponse]> = []
          for (const [key, response] of Object.entries(request.inputResponses)) {
            const pending = entry.pending.get(key)
            if (!pending) continue
            entry.pending.delete(key)
            received.push([pending, response])
          }
          if (received.length > 0) refresh(entry, now)
          for (const [pending, response] of received) Deferred.doneUnsafe(pending.response, Effect.succeed(response))
        }),
        cancel: Effect.fnUntraced(function*(request) {
          const entry = yield* find(request)
          if (entry.fiber) yield* Fiber.interrupt(entry.fiber).pipe(Effect.forkIn(scope), Effect.asVoid)
        })
      })
    })
  )
