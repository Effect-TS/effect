/**
 * Registers long-running MCP tools using a supplied task execution service.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as DateTime from "../DateTime.ts"
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
import type * as AiError from "./AiError.ts"
import * as Binding from "./internal/mcpTasksBinding.ts"
import { TaskError } from "./internal/mcpTasksBinding.ts"
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

type Handlers<Tools extends Record<string, Tool.Any>> = {
  readonly [K in keyof Tools as Tool.RequiresHandler<Tools[K]> extends true ? K : never]: (
    params: Tool.Parameters<Tools[K]>,
    context: Toolkit.HandlerContext<Tools[K]>
  ) => Effect.Effect<Tool.Success<Tools[K]>, Tool.Failure<Tools[K]> | AiError.AiError | AiError.AiErrorReason, any>
}
type Services<H> = H extends (...args: any) => Effect.Effect<any, any, infer R> ? 0 extends (1 & R) ? never : R : never

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

const makeHandlers = <
  Tools extends Record<string, Tool.Any>,
  H extends Handlers<NoInfer<Tools>>,
  EX,
  RX,
  Provided = never
>(tools: Toolkit.Toolkit<Tools>, handlers: H | Effect.Effect<H, EX, RX>) => {
  const build = Effect.gen(function*() {
    const context = yield* tools.toHandlers(
      handlers as Toolkit.HandlersFrom<Tools> | Effect.Effect<Toolkit.HandlersFrom<Tools>, EX, RX>
    )
    const registrations = yield* McpServer.makeToolkitRegistrations(tools).pipe(Effect.provideContext(context))
    const run = new Map<
      string,
      (request: CreateRequest) => Effect.Effect<McpSchema.CallToolResult, TaskFailure>
    >()
    for (const registration of registrations) {
      run.set(registration.tool.name, (request) =>
        registration.handle(request.arguments).pipe(
          Effect.provideService(McpSchema.McpRequestContext, request.requestContext),
          Effect.mapError((error) => ({
            code: error.code,
            message: error.message
          })),
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
  // Toolkit captures handler contexts; request and Workflow services arrive at invocation.
  return build as Effect.Effect<
    Map<string, (request: CreateRequest) => Effect.Effect<McpSchema.CallToolResult, TaskFailure>>,
    EX,
    | RX
    | Exclude<Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>, McpSchema.McpRequestContext | Provided>
  >
}

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
 * Workflow owns history cleanup. This implementation issues no input requests.
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
): Layer.Layer<
  Execution,
  EX | Schema.SchemaError,
  | WorkflowEngine.WorkflowEngine
  | Exclude<RX, Scope.Scope>
  | Exclude<
    Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>,
    McpSchema.McpRequestContext | WorkflowEngine.WorkflowEngine | WorkflowEngine.WorkflowInstance
  >
> =>
  Layer.effect(
    Execution,
    Effect.gen(function*() {
      yield* decodeWorkflowName(options.name)
      const engine = yield* WorkflowEngine.WorkflowEngine
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const runners = yield* makeHandlers<
        Tools,
        H,
        EX,
        RX,
        WorkflowEngine.WorkflowEngine | WorkflowEngine.WorkflowInstance
      >(tools, handlers)

      const operations = new Map<string, Execution["Service"]>()

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

        const findOwned = Effect.fnUntraced(function*({ taskId, ownerId }: TaskRequest) {
          const token = yield* decodeTaskToken(taskId).pipe(
            Effect.mapError(() =>
              new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
            )
          )

          if (token.workflowName !== workflow._tag || token.deferredName !== identity.name) {
            return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
          }

          const fact = yield* readFact(token.executionId, identity)
          if (Option.isNone(fact) || fact.value.ownerId !== ownerId) {
            return yield* new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message: "Unknown taskId" })
          }

          return { ...fact.value, executionId: token.executionId }
        })
        yield* engine.register(workflow, (payload) =>
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

            return yield* runners.get(tool.name)!({
              toolName: tool.name,
              arguments: payload.arguments,
              requestContext: payload.request,
              ownerId: payload.ownerId
            })
          }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine)))
        yield* Effect.updateContext(register, (context: Context.Context<Effect.Services<typeof register>>) =>
          Context.makeUnsafe(McpServer.omitRequestServices(context).mapUnsafe))

        operations.set(workflow._tag, {
          get: Effect.fnUntraced(function*(request) {
            const fact = yield* findOwned(request)
            const base = {
              taskId: request.taskId,
              createdAt: fact.createdAt,
              lastUpdatedAt: fact.createdAt,
              ttlMs: null
            }

            const result = yield* engine.poll(workflow, fact.executionId)

            if (Option.isNone(result) || result.value._tag !== "Complete") {
              return { ...base, status: "working" as const }
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
            yield* findOwned(request)
          }),
          cancel: Effect.fnUntraced(function*(request) {
            const fact = yield* findOwned(request)
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

        return entry
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
          return yield* (yield* resolve(request.taskId)).get(request)
        }),
        update: Effect.fnUntraced(function*(request) {
          yield* (yield* resolve(request.taskId)).update(request)
        }),
        cancel: Effect.fnUntraced(function*(request) {
          yield* (yield* resolve(request.taskId)).cancel(request)
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
 * durable creation and is intended for development and tests. It issues no input requests.
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
  | Exclude<Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>, McpSchema.McpRequestContext>
> =>
  Layer.effect(
    Execution,
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const runners = yield* makeHandlers(tools, handlers)

      const tasks = new Map<string, { ownerId: string; task: Task; fiber?: Fiber.Fiber<void> }>()

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

          const entry: { ownerId: string; task: Task; fiber?: Fiber.Fiber<void> } = {
            ownerId: request.ownerId,
            task
          }

          tasks.set(task.taskId, entry)

          entry.fiber = yield* run(request).pipe(
            Effect.onExit(Effect.fnUntraced(function*(exit) {
              const lastUpdatedAt = yield* DateTime.now
              const base = { ...task, lastUpdatedAt }

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
        update: (request) => Effect.asVoid(find(request)),
        cancel: Effect.fnUntraced(function*(request) {
          const entry = yield* find(request)
          if (entry.fiber) yield* Fiber.interrupt(entry.fiber).pipe(Effect.forkIn(scope), Effect.asVoid)
        })
      })
    })
  )
