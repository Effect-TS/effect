/** @internal */
import * as Cause from "../../Cause.ts"
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Schedule from "../../Schedule.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as DurableDeferred from "../../workflow/DurableDeferred.ts"
import * as Workflow from "../../workflow/Workflow.ts"
import * as WorkflowEngine from "../../workflow/WorkflowEngine.ts"
import * as McpSchema from "../McpSchema.ts"
import * as McpServer from "../McpServer.ts"
import type * as McpTasks from "../McpTasks.ts"
import type * as McpCore from "./mcpCore.ts"
import * as Binding from "./mcpTasksBinding.ts"
import * as ToolkitHandlers from "./toolkitHandlers.ts"

const identity = DurableDeferred.make("mcp/task/identity", {
  success: Schema.Struct({ ownerId: Schema.String, createdAt: Schema.DateTimeUtc })
})
const finishedAt = DurableDeferred.make("mcp/task/finishedAt", { success: Schema.DateTimeUtc })
const Request = Schema.Struct({
  clientId: Schema.Number,
  protocolVersion: Schema.String,
  clientCapabilities: McpSchema.ClientCapabilities,
  clientInfo: Schema.optionalKey(McpSchema.Implementation),
  requestMetadata: Schema.optionalKey(Schema.JsonObject)
})
const Failure = Schema.Struct({ ...McpSchema.McpErrorBase.fields, data: Schema.optionalKey(Schema.JsonObject) })

/** @internal */
export const toolkit: typeof McpTasks.toolkit = (tools, handlers, options) => {
  type Requirements = Layer.Services<ReturnType<typeof McpTasks.toolkit>>
  // Runtime iteration erases individual tool names; the public signature keeps
  // each handler's parameters, result, and service requirements.
  const handlerLayer = Layer.effectContext(ToolkitHandlers.make<
    typeof tools.tools,
    Record<string, (...args: any) => any>,
    any,
    any,
    Requirements
  >(tools.tools, handlers))
  return Layer.effectDiscard(Effect.gen(function*() {
    yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(options.name)
    const engine = yield* WorkflowEngine.WorkflowEngine
    const scope = yield* Scope.fork(yield* Scope.Scope)
    const services = yield* Effect.context<Requirements>()
    const binding = Binding.get(yield* McpServer.getCore(yield* McpServer.McpServer))
    const owner = (request: McpSchema.McpRequestContext["Service"]): Effect.Effect<string> =>
      options.owner === "shared"
        ? Effect.succeed("shared") :
        Effect.setContext(Effect.provideService(options.owner, McpSchema.McpRequestContext, request), services)
    yield* McpServer.registerToolkit(tools)
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
          Effect.flatMap((value) => Option.isSome(value) ? Effect.map(value.value, Option.some) : Effect.succeedNone)
        )
      const visibleFact = <S extends Schema.Constraint>(
        executionId: string,
        fact: DurableDeferred.DurableDeferred<S>
      ) =>
        readFact(executionId, fact).pipe(
          Effect.repeat({
            while: Option.isNone,
            schedule: Schedule.spaced("10 millis").pipe(Schedule.upTo({ times: 20 }))
          }),
          Effect.flatMap((value) =>
            Option.isSome(value)
              ? Effect.succeed(value.value)
              : Effect.fail(
                new Binding.TaskError({ code: -32603, message: "Task state is not yet available; retry the request" })
              )
          )
        )
      const findOwned = Effect.fnUntraced(function*(taskId: string, invocation: McpCore.McpInvocation) {
        // Binding already validates routing and the workflow allowlist.
        const token = DurableDeferred.TokenParsed.fromString(taskId)
        const fact = yield* readFact(token.executionId, identity)
        if (Option.isNone(fact) || fact.value.ownerId !== (yield* owner(invocation.requestContext))) {
          return yield* new Binding.TaskError({ code: -32602, message: "Unknown taskId" })
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
          const request = payload.request
          const outcome = yield* binding.run({ name: tool.name, arguments: payload.arguments }, {
            clientId: request.clientId,
            requestContext: request,
            protocol: {
              protocolVersion: request.protocolVersion,
              clientCapabilities: request.clientCapabilities,
              clientInfo: request.clientInfo,
              requestMetadata: request.requestMetadata
            }
          }).pipe(Effect.mapError((error) =>
            error._tag === "InvalidToolInput"
              ? { code: -32602, message: error.message }
              : { code: -32603, message: "Task execution failed" }
          ))
          if (outcome._tag !== "Complete") {
            return yield* Effect.fail({ code: -32603, message: "Task input is not supported" })
          }
          return outcome.value
        }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine)))
      yield* binding.install(workflow._tag, {
        get: Effect.fnUntraced(function*(taskId, invocation): Effect.fn.Return<Binding.TaskRecord, Binding.TaskError> {
          const fact = yield* findOwned(taskId, invocation)
          const base = { taskId, createdAt: fact.createdAt, lastUpdatedAt: fact.createdAt }
          const result = yield* engine.poll(workflow, fact.executionId)
          if (Option.isNone(result) || result.value._tag !== "Complete") return { ...base, status: "working" }
          const lastUpdatedAt = yield* visibleFact(fact.executionId, finishedAt)
          const exit = result.value.exit
          if (Exit.isSuccess(exit)) return { ...base, lastUpdatedAt, status: "completed", result: exit.value }
          if (Cause.hasInterrupts(exit.cause)) return { ...base, lastUpdatedAt, status: "cancelled" }
          const error = Cause.findErrorOption(exit.cause)
          return {
            ...base,
            lastUpdatedAt,
            status: "failed",
            error: Option.isSome(error) && Schema.is(Failure)(error.value)
              ? error.value
              : { code: -32603, message: "Task execution failed" }
          }
        }),
        cancel: Effect.fnUntraced(function*(taskId, invocation) {
          const fact = yield* findOwned(taskId, invocation)
          yield* engine.interrupt(workflow, fact.executionId)
        })
      })
      yield* binding.register(
        tool.name,
        Effect.fnUntraced(function*(payload, invocation) {
          yield* Binding.requireTasks(invocation)
          const request = yield* Schema.decodeUnknownEffect(Request)(invocation.requestContext).pipe(
            Effect.mapError(() => new Binding.TaskError({ code: -32602, message: "Invalid task request context" }))
          )
          const data = {
            id: crypto.randomUUID(),
            arguments: payload.arguments ?? {},
            request,
            ownerId: yield* owner(invocation.requestContext)
          }
          const executionId = yield* workflow.execute(data, { discard: true }).pipe(
            Effect.provideService(WorkflowEngine.WorkflowEngine, engine)
          )
          // Creation is acknowledged only after the identity is readable.
          const fact = yield* visibleFact(executionId, identity)
          return {
            _tag: "Task" as const,
            task: {
              taskId: DurableDeferred.tokenFromExecutionId(identity, { workflow, executionId }),
              createdAt: fact.createdAt,
              lastUpdatedAt: fact.createdAt,
              status: "working" as const
            }
          }
        })
      )
    }
  })).pipe(Layer.provide(handlerLayer))
}
