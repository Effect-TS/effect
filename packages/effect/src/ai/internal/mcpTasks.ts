/** @internal */
import * as Brand from "../../Brand.ts"
import * as Cause from "../../Cause.ts"
import * as EffectContext from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as DateTime from "../../DateTime.ts"
import * as Deferred from "../../Deferred.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Fiber from "../../Fiber.ts"
import * as Layer from "../../Layer.ts"
import * as Match from "../../Match.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as AiError from "../AiError.ts"
import * as McpSchema from "../McpSchema.ts"
import * as McpServer from "../McpServer.ts"
import type * as McpTasks from "../McpTasks.ts"
import type {
  DetailedTask,
  ExecutionOptions,
  MemoryOptions,
  OptionalPolicy,
  RequiredPolicy,
  TaskRequestContext
} from "../McpTasks.ts"
import type * as Tool from "../Tool.ts"
import type * as Toolkit from "../Toolkit.ts"
import * as McpCore from "./mcpCore.ts"
import * as McpProtocolInternal from "./mcpProtocol.ts"
import * as TasksBinding from "./mcpTasksBinding.ts"
import { TaskError } from "./mcpTasksBinding.ts"
import type { PreparedParameters } from "./mcpToolkitParameters.ts"
import { mcpParseOptions } from "./mcpToolkitParameters.ts"
import * as ToolkitHandlers from "./toolkitHandlers.ts"

/** @internal */
export const TaskContext = EffectContext.Service<McpTasks.TaskContext, McpTasks.TaskContext["Service"]>()(
  "effect/ai/McpTasks/TaskContext"
)

/** @internal */
export const Input = EffectContext.Service<McpTasks.Input, McpTasks.Input["Service"]>()("effect/ai/McpTasks/Input")

/** @internal */
export const Execution = EffectContext.Service<McpTasks.Execution, McpTasks.Execution["Service"]>()(
  "effect/ai/McpTasks/Execution"
)

/** @internal */
export class InvalidOption extends Data.TaggedError("McpTasksInvalidOption")<
  Pick<McpTasks.InvalidOption, "option" | "message">
> {}

/** @internal */
export class InputUnavailable extends Data.TaggedError("McpTasksInputUnavailable")<
  Pick<McpTasks.InputUnavailable, "method">
> {}

const decodeParameters = (
  tool: Tool.Any,
  input: unknown,
  options?: SchemaAST.ParseOptions
): Effect.Effect<unknown, Schema.SchemaError, unknown> =>
  Schema.isSchema(tool.parametersSchema)
    ? Schema.decodeUnknownEffect(tool.parametersSchema)(input, options)
    : Effect.succeed(input)

/** @internal */
export const taskResult = (run: Effect.Effect<McpCore.OperationOutcome<McpSchema.CallToolResult>, McpCore.ToolError>) =>
  run.pipe(
    Effect.flatMap((outcome) =>
      outcome._tag === "Complete"
        ? Effect.succeed(outcome.value)
        : Effect.fail(new TaskError({ code: -32603, message: "Tasks require McpTasks.Input for input requests" }))
    ),
    Effect.catchTag(
      ["ToolExecutionError", "InvalidToolInput"],
      (error) =>
        Effect.succeed(
          new McpSchema.CallToolResult({ isError: true, content: [{ type: "text", text: error.message }] })
        )
    )
  )

const DurationInput = Schema.Unknown.pipe(Schema.decodeTo(Schema.Duration, {
  decode: SchemaGetter.transformEffect((input) => {
    // fromInput catches invalid values at runtime, but its signature only accepts Duration.Input.
    const parsed = Duration.fromInput(input as Duration.Input)
    return Option.isSome(parsed)
      ? Effect.succeed(parsed.value)
      : Effect.fail(new SchemaIssue.InvalidValue({ expected: "a valid Duration input" }, input))
  }),
  encode: SchemaGetter.transform((duration) => duration)
}))

const PositiveDuration = DurationInput.check(Schema.makeFilter((duration) => {
  const millis = Duration.toMillis(duration)
  return Number.isSafeInteger(millis) && millis > 0
}))

const RetentionDuration = DurationInput.check(Schema.makeFilter((duration) => {
  const millis = Duration.toMillis(duration)
  return millis === Infinity || (Number.isSafeInteger(millis) && millis > 0)
}))

const DurationOptions = Schema.Struct({
  retention: Schema.optional(RetentionDuration),
  pollInterval: Schema.optional(PositiveDuration),
  timeout: Schema.optional(PositiveDuration)
})

const MemorySettings = Schema.Struct({
  maxActive: Schema.Int.check(Schema.isGreaterThan(0)),
  maxRecords: Schema.Int.check(Schema.isGreaterThan(0)),
  retention: RetentionDuration,
  pollInterval: PositiveDuration,
  timeout: Schema.optional(PositiveDuration),
  shutdownWait: PositiveDuration
})

const formatOptionIssue = SchemaIssue.makeFormatterStandardSchemaV1()

const invalidOption = (error: Schema.SchemaError) => {
  const issue = formatOptionIssue(error.issue).issues[0]
  const option = String(issue.path?.[0] ?? "options")
  return new InvalidOption({
    option,
    message: option === "maxActive" || option === "maxRecords"
      ? `${option} must be a positive integer`
      : `${option} must be a positive whole number of milliseconds`
  })
}

const normalizeOptions = (options: Pick<RequiredPolicy, "retention" | "pollInterval" | "timeout">) =>
  Schema.decodeUnknownEffect(DurationOptions)(options).pipe(Effect.mapError(invalidOption))

type Entry = {
  record: DetailedTask
  owner: string
  fiber?: Fiber.Fiber<void, never> | undefined
  pending: Map<string, Deferred.Deferred<McpSchema.McpInputResponse>>
}

/** @internal */
export const layerMemory: typeof McpTasks.layerMemory = <R = never>(
  options: MemoryOptions<R>
) =>
  Layer.effect(Execution)(Effect.gen(function*() {
    const settings = yield* Schema.decodeUnknownEffect(MemorySettings)({
      maxActive: options.maxActive,
      maxRecords: options.maxRecords,
      retention: options.retention ?? "1 hour",
      pollInterval: options.pollInterval ?? "1 second",
      timeout: options.timeout,
      shutdownWait: options.shutdownWait ?? "30 seconds"
    }).pipe(Effect.mapError(invalidOption))

    const ownerContext = yield* Effect.context<Exclude<R, McpSchema.McpRequestContext>>()

    const resolveOwner = (request: TaskRequestContext): Effect.Effect<string> =>
      options.owner === "shared"
        ? Effect.succeed("shared")
        : Effect.setContext(
          Effect.provideService(options.owner, McpSchema.McpRequestContext, request),
          ownerContext
        )

    const taskFields = (record: DetailedTask, now: DateTime.Utc) => ({
      taskId: record.taskId,
      createdAt: record.createdAt,
      lastUpdatedAt: now,
      ttl: record.ttl,
      ...(record.pollInterval === undefined ? {} : { pollInterval: record.pollInterval }),
      ...(record.statusMessage === undefined ? {} : { statusMessage: record.statusMessage })
    })

    const records = new Map<string, Entry>()
    const active = new Set<Entry>()
    let accepting = true

    const findOwned = Effect.fnUntraced(function*(taskId: string, request: TaskRequestContext) {
      const entry = records.get(taskId)
      const now = yield* DateTime.now
      if (
        entry === undefined ||
        now.epochMilliseconds - entry.record.createdAt.epochMilliseconds >=
          Duration.toMillis(entry.record.ttl)
      ) {
        records.delete(taskId)
        return yield* new TaskError({ code: -32602, message: "Unknown taskId" })
      }
      const owner = yield* resolveOwner(request)

      if (owner !== entry.owner) return yield* new TaskError({ code: -32602, message: "Unknown taskId" })

      return entry
    })

    yield* Effect.addFinalizer(Effect.fnUntraced(function*() {
      accepting = false
      const fibers = Array.from(active).flatMap((entry) => entry.fiber === undefined ? [] : [entry.fiber])
      yield* Fiber.awaitAll(fibers).pipe(Effect.interruptible, Effect.timeoutOption(settings.shutdownWait))
      yield* Effect.forkDetach(Fiber.interruptAll(fibers))
    }))

    return Execution.of({
      create: Effect.fnUntraced(function*(run, request, overrides) {
        const owner = yield* resolveOwner(request)
        const now = yield* DateTime.now

        for (const [id, entry] of records) {
          if (
            now.epochMilliseconds - entry.record.createdAt.epochMilliseconds >=
              Duration.toMillis(entry.record.ttl)
          ) records.delete(id)
        }

        if (!accepting || active.size >= settings.maxActive || records.size >= settings.maxRecords) {
          return yield* new TaskError({ code: -32000, message: "Task capacity reached" })
        }

        const taskRetention = overrides.retention ?? settings.retention
        const taskPollInterval = overrides.pollInterval ?? settings.pollInterval
        const configuredTimeout = overrides.timeout ?? settings.timeout
        const taskTimeout = configuredTimeout === undefined
          ? taskRetention
          : Duration.min(configuredTimeout, taskRetention)
        const taskId = Brand.nominal<McpTasks.TaskId>()(crypto.randomUUID())
        const record: DetailedTask = {
          taskId,
          status: "working",
          createdAt: now,
          lastUpdatedAt: now,
          ttl: taskRetention,
          pollInterval: taskPollInterval
        }

        const entry: Entry = { record, owner, pending: new Map() }

        records.set(taskId, entry)
        active.add(entry)

        const requestInput = Effect.fnUntraced(function*(inputRequest: McpSchema.McpInputRequest) {
          const supported = Match.value(inputRequest).pipe(
            Match.discriminatorsExhaustive("method")({
              "roots/list": () => request.clientCapabilities.roots !== undefined,
              "sampling/createMessage": ({ params }) => {
                if (request.clientCapabilities.sampling === undefined) return false
                if (
                  McpProtocolInternal.samplingRequestRequiresTools(params) &&
                  request.clientCapabilities.sampling.tools === undefined
                ) return false
                const needsContext = params.includeContext === "thisServer" || params.includeContext === "allServers"
                return !needsContext || request.clientCapabilities.sampling.context !== undefined
              },
              "elicitation/create": ({ params }) => {
                if (request.clientCapabilities.elicitation === undefined) return false
                if (params.mode === "url") return request.clientCapabilities.elicitation.url !== undefined
                return request.clientCapabilities.elicitation.form !== undefined ||
                  Object.keys(request.clientCapabilities.elicitation).length === 0
              }
            })
          )

          if (!supported) return yield* new InputUnavailable({ method: inputRequest.method })

          const key = crypto.randomUUID()
          const pending = yield* Deferred.make<McpSchema.McpInputResponse>()

          entry.pending.set(key, pending)
          entry.record = {
            ...taskFields(entry.record, yield* DateTime.now),
            status: "input_required",
            inputRequests: {
              ...entry.record.status === "input_required" ? entry.record.inputRequests : {},
              [key]: inputRequest
            }
          }
          const response = yield* Deferred.await(pending)
          entry.pending.delete(key)
          const requests = entry.record.status === "input_required" ? { ...entry.record.inputRequests } : {}

          delete requests[key]

          entry.record = Object.keys(requests).length === 0
            ? { ...taskFields(entry.record, yield* DateTime.now), status: "working" }
            : {
              ...taskFields(entry.record, yield* DateTime.now),
              status: "input_required",
              inputRequests: requests
            }

          return response
        })

        const input = Input.of({
          roots: Effect.fnUntraced(function*() {
            const response = yield* requestInput({ method: "roots/list" })

            return yield* Schema.decodeUnknownEffect(McpSchema.ListRootsResult)(response)
          }),
          sampling: Effect.fnUntraced(function*(request) {
            const encoded = yield* Schema.encodeEffect(McpSchema.CreateMessage.payloadSchema)(request)
            const params = yield* Schema.decodeUnknownEffect(Schema.JsonObject)(encoded)
            const response = yield* requestInput({ method: "sampling/createMessage", params })

            return yield* Schema.decodeUnknownEffect(McpSchema.CreateMessageResult)(response)
          }),
          elicitation: Effect.fnUntraced(function*<S extends Schema.Constraint>(
            request: typeof McpSchema.Elicit.payloadSchema.Type,
            response: S
          ) {
            const params = yield* Schema.encodeEffect(McpSchema.Elicit.payloadSchema)(request)
            const raw = yield* requestInput({ method: "elicitation/create", params })
            const result = yield* Schema.decodeUnknownEffect(McpSchema.ElicitResult)(raw)

            if (result.action === "accept") {
              const content = yield* Schema.decodeUnknownEffect(response)(result.content)
              return { action: "accept", content }
            }

            return { action: result.action }
          })
        })

        const taskContext = TaskContext.of({
          mode: "task",
          taskId,
          setStatus: Effect.fnUntraced(function*(message) {
            if (entry.record.status === "working" || entry.record.status === "input_required") {
              entry.record = { ...entry.record, statusMessage: message, lastUpdatedAt: yield* DateTime.now }
            }
          })
        })

        const suppliedRun = Effect.provideService(
          Effect.provideService(run, Input, input),
          TaskContext,
          taskContext
        )

        const execute = (Duration.isFinite(taskTimeout) ? Effect.timeout(suppliedRun, taskTimeout) : suppliedRun).pipe(
          Effect.matchCauseEffect({
            onFailure: Effect.fnUntraced(function*(cause) {
              if (entry.record.status !== "working" && entry.record.status !== "input_required") {
                return
              }

              const failure = Cause.findErrorOption(cause)
              const error = Option.isSome(failure) && failure.value instanceof TaskError
                ? {
                  code: failure.value.code,
                  message: failure.value.message,
                  ...(failure.value.data === undefined ? {} : { data: failure.value.data })
                }
                : { code: -32603, message: "Task execution failed" }

              entry.record = Cause.hasInterrupts(cause)
                ? { ...taskFields(entry.record, yield* DateTime.now), status: "cancelled" }
                : {
                  ...taskFields(entry.record, yield* DateTime.now),
                  status: "failed",
                  error
                }
            }),
            onSuccess: Effect.fnUntraced(function*(outcome) {
              if (entry.record.status !== "working" && entry.record.status !== "input_required") {
                return
              }
              entry.record = {
                ...taskFields(entry.record, yield* DateTime.now),
                status: "completed",
                result: outcome
              }
            })
          }),
          Effect.onInterrupt(Effect.fnUntraced(function*() {
            if (entry.record.status === "working" || entry.record.status === "input_required") {
              entry.record = { ...taskFields(entry.record, yield* DateTime.now), status: "cancelled" }
            }
          })),
          Effect.ensuring(Effect.sync(() => {
            active.delete(entry)
          }))
        )

        entry.fiber = yield* Effect.forkDetach(execute)

        return record
      }),
      get: Effect.fnUntraced(function*(taskId, request) {
        return (yield* findOwned(taskId, request)).record
      }),
      update: Effect.fnUntraced(function*(taskId, responses, request) {
        const entry = yield* findOwned(taskId, request)
        yield* Effect.forEach(Object.entries(responses), ([key, response]) => {
          const pending = entry.pending.get(key)

          return pending === undefined ? Effect.void : Deferred.succeed(pending, response)
        })
      }),
      cancel: Effect.fnUntraced(function*(taskId, request) {
        const entry = yield* findOwned(taskId, request)

        if (entry.record.status === "working" || entry.record.status === "input_required") {
          if (entry.fiber !== undefined) yield* Effect.forkDetach(Fiber.interrupt(entry.fiber))
        }
      })
    })
  }))

/** @internal */
export const toolkit: typeof McpTasks.toolkit = <
  Tools extends Record<string, Tool.Any>,
  Handlers extends McpTasks.HandlersFrom<NoInfer<Tools>>,
  const Config extends McpTasks.Policies<NoInfer<Tools>>,
  EX = never,
  RX = never
>(
  tools: Toolkit.Toolkit<Tools>,
  policies: Config & Record<Exclude<keyof Config, keyof Tools>, never>,
  handlers: Handlers | Effect.Effect<Handlers, EX, RX>
) => {
  type Definition = ReturnType<typeof McpTasks.toolkit<Tools, Handlers, Config, EX, RX>>
  type Requirements = Layer.Services<Definition["mcpLayer"]>

  const runtimePolicies: Readonly<Record<string, RequiredPolicy | OptionalPolicy<Tool.Any> | undefined>> = policies
  const build = Effect.map(Effect.isEffect(handlers) ? handlers : Effect.succeed(handlers), (built) => {
    const routed: Record<string, Tool.Handler<string>["handler"]> = {}
    for (const [name, handler] of Object.entries(built)) {
      routed[name] = typeof handler === "function" ? handler : Effect.fnUntraced(function*(
        params: unknown,
        context: Toolkit.HandlerContext<Tool.Any>
      ) {
        const task = yield* Effect.serviceOption(TaskContext)
        return yield* (Option.isSome(task) && task.value.mode === "task"
          ? handler.task(params, context)
          : handler.inline(params, context))
      })
    }
    return routed
  })
  type Routed = Effect.Success<typeof build>
  const reusableHandlers = Layer.effectContext(
    ToolkitHandlers.make<Tools, Routed, EX, RX, Layer.Services<Definition>>(tools.tools, build)
  )
  const handlerLayer = Layer.effectContext(
    ToolkitHandlers.make<Tools, Routed, EX, RX, Requirements>(tools.tools, build).pipe(
      Effect.map((context) => {
        const services = new Map(context.mapUnsafe)

        for (const [name, tool] of Object.entries(tools.tools)) {
          const original: Tool.Handler<string> | undefined = context.mapUnsafe.get(tool.id)

          if (original === undefined) continue

          services.set(tool.id, {
            ...original,
            handler: Effect.fnUntraced(function*(params: unknown, handlerContext: Toolkit.HandlerContext<Tool.Any>) {
              const request = yield* Effect.serviceOption(McpSchema.McpRequestContext)
              const task = yield* Effect.serviceOption(TaskContext)
              const input = yield* Effect.serviceOption(Input)

              if (
                Option.isNone(request) || Option.isNone(task) ||
                (runtimePolicies[name]?.mode === "required" && task.value.mode !== "task") ||
                (task.value.mode === "task" && Option.isNone(input))
              ) {
                return yield* AiError.make({
                  module: "McpTasks",
                  method: `${name}.handle`,
                  reason: new AiError.ToolConfigurationError({
                    toolName: name,
                    description: "MCP task toolkit handlers require an active MCP request and execution context"
                  })
                })
              }

              return yield* original.handler(params, handlerContext)
            })
          })
        }

        return EffectContext.makeUnsafe<Tool.HandlersFor<Tools>>(services)
      })
    )
  )
  const registration = Layer.effectDiscard(Effect.gen(function*() {
    for (const [name, tool] of Object.entries(tools.tools)) {
      const policy = runtimePolicies[name]

      if (tool.dependencies?.includes(Input) && policy?.mode !== "required") {
        return yield* new InvalidOption({
          option: name,
          message: `Tool '${name}' requires McpTasks.Input and must use required task mode`
        })
      }
    }

    const normalized = new Map<
      string,
      { readonly policy: RequiredPolicy | OptionalPolicy<Tool.Any>; readonly options: ExecutionOptions }
    >()

    for (const [name, policy] of Object.entries(runtimePolicies)) {
      if (!(name in tools.tools)) {
        return yield* new InvalidOption({ option: name, message: `Unknown tool '${name}'` })
      }

      if (policy === undefined) {
        return yield* new InvalidOption({ option: name, message: `Task policy for '${name}' must be defined` })
      }

      normalized.set(
        name,
        {
          policy,
          options: yield* normalizeOptions(policy).pipe(
            Effect.mapError((error) => new InvalidOption({ option: `${name}.${error.option}`, message: error.message }))
          )
        }
      )
    }

    const server = yield* McpServer.McpServer
    const execution = yield* Execution
    const decisionContext = yield* Effect.context<Requirements>()

    // Tool.Any erases schema services; the public signature retains each decoder and encoder requirement.
    const runtimeContext = decisionContext as EffectContext.Context<unknown>
    const taskCore = TasksBinding.get(yield* McpServer.getCore(server))

    yield* taskCore.install(execution, {
      get: (taskId, invocation) => execution.get(taskId, invocation.requestContext),
      update: (taskId, responses, invocation) => execution.update(taskId, responses, invocation.requestContext),
      cancel: (taskId, invocation) => execution.cancel(taskId, invocation.requestContext)
    })

    yield* McpServer.registerToolkit(tools)
    const inlineContext = TaskContext.of({ mode: "inline", setStatus: () => Effect.void })

    for (const name of Object.keys(tools.tools)) {
      if (name in policies) continue

      yield* taskCore.register(name, "inline", (payload, invocation) =>
        Effect.map(
          Effect.provideService(taskCore.runInline(payload, invocation), TaskContext, inlineContext),
          (outcome): TasksBinding.TaskCallOutcome => ({ _tag: "Inline", outcome })
        ))
    }

    for (const [name, { policy, options }] of normalized) {
      const tool = tools.tools[name]
      yield* taskCore.register(
        name,
        policy.mode,
        Effect.fnUntraced(function*(payload, invocation): Effect.fn.Return<
          TasksBinding.TaskCallOutcome,
          TaskError | McpCore.ToolError
        > {
          const supported = TasksBinding.supportsTasks(invocation)

          if (!supported && (policy.mode === "required" || policy.whenUnavailable === "reject")) {
            yield* TasksBinding.requireTasks(invocation)
          }

          if (!supported) {
            const outcome = yield* Effect.provideService(
              taskCore.runInline(payload, invocation),
              TaskContext,
              inlineContext
            )
            return { _tag: "Inline", outcome }
          }

          let prepared: PreparedParameters | undefined
          if (policy.mode === "optional" && policy.decide !== undefined && tool !== undefined) {
            const invocationContext = EffectContext.add(
              runtimeContext,
              McpSchema.McpRequestContext,
              invocation.requestContext
            )
            const schemaContext = EffectContext.add(invocationContext, TaskContext, inlineContext)
            const decoded = yield* Effect.setContext(
              decodeParameters(tool, payload.arguments ?? {}, mcpParseOptions(tool)),
              schemaContext
            ).pipe(
              Effect.mapError((error) => new TaskError({ code: -32602, message: error.message }))
            )

            prepared = { parameters: decoded }

            const decision = Effect.setContext(
              policy.decide(decoded),
              invocationContext
            )

            const choice = yield* Effect.result(decision)

            if (choice._tag === "Failure") {
              const encoded = yield* Effect.setContext(
                Schema.encodeUnknownEffect(tool.failureSchema)(choice.failure),
                schemaContext
              ).pipe(
                Effect.mapError(() => new TaskError({ code: -32603, message: "Task decision failed" }))
              )

              return {
                _tag: "Inline",
                outcome: McpCore.OperationOutcome.Complete(
                  new McpSchema.CallToolResult({
                    isError: true,
                    content: [{ type: "text", text: JSON.stringify(encoded) }]
                  })
                )
              }
            }

            if (choice.success === "inline") {
              const outcome = yield* Effect.provideService(
                taskCore.runInline(payload, invocation, prepared),
                TaskContext,
                inlineContext
              )
              return { _tag: "Inline", outcome }
            }
          }

          const task = yield* execution.create(
            taskCore.runInline(payload, invocation, prepared).pipe(
              taskResult
            ),
            invocation.requestContext,
            options
          )

          return { _tag: "Task", task }
        })
      )
    }
  })).pipe(Layer.provideMerge(handlerLayer), Layer.provide(McpServer.McpServer.layer))

  return Object.assign(reusableHandlers, { mcpLayer: registration })
}
