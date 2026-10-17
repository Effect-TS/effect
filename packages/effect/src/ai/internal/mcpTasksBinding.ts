/** @internal */
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import * as Base64Url from "../../encoding/Base64Url.ts"
import { memoize } from "../../Function.ts"
import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import type * as McpSchema from "../McpSchema.ts"
import type * as McpTasks from "../McpTasks.ts"
import * as McpCore from "./mcpCore.ts"

/**
 * Failure to create, read, update, or cancel a task.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class TaskError extends Data.TaggedError("TaskError")<McpTasks.TaskFailure> {}
/** @internal */
export type TaskRecord = McpTasks.Task

/** @internal */
export const supportsTasks = (invocation: McpCore.McpInvocation): boolean =>
  invocation.protocol.protocolVersion === "2026-07-28" &&
  Predicate.isReadonlyObject(invocation.protocol.clientCapabilities.extensions?.["io.modelcontextprotocol/tasks"])

/** @internal */
export const requireTasks = (invocation: McpCore.McpInvocation) =>
  supportsTasks(invocation) ? Effect.void : Effect.fail(
    new TaskError({
      code: -32021,
      message: "Client does not support the Tasks extension",
      data: { requiredCapabilities: { extensions: { "io.modelcontextprotocol/tasks": {} } } }
    })
  )

/** @internal */
export type TaskCallOutcome =
  | { readonly _tag: "Task"; readonly task: TaskRecord }
  | { readonly _tag: "Inline"; readonly outcome: McpCore.OperationOutcome<McpSchema.CallToolResult> }

interface Operations {
  readonly update: (
    id: string,
    responses: Readonly<Record<string, McpSchema.McpInputResponse>>,
    invocation: McpCore.McpInvocation
  ) => Effect.Effect<void, TaskError>
  readonly get: (id: string, invocation: McpCore.McpInvocation) => Effect.Effect<TaskRecord, TaskError>
  readonly cancel: (id: string, invocation: McpCore.McpInvocation) => Effect.Effect<void, TaskError>
}

/** @internal */
export const get = memoize((core: McpCore.McpCore) => {
  const registrations = new WeakMap<McpCore.ToolRegistration, {
    readonly call: (
      payload: typeof McpSchema.CallTool.payloadSchema.Type,
      invocation: McpCore.McpInvocation
    ) => Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError>
  }>()
  const operationsByTool = new Map<string, Operations>()
  const resolve = Effect.fnUntraced(function*(id: string) {
    const [name, taskId] = yield* Schema.decodeUnknownEffect(Schema.StringFromBase64Url)(id).pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(Schema.Tuple([Schema.String, Schema.String]).pipe(Schema.fromJsonString))
      )
    ).pipe(Effect.mapError(() => new TaskError({ code: -32602, message: "Unknown taskId" })))
    const operations = operationsByTool.get(name)
    if (!operations) return yield* new TaskError({ code: -32602, message: "Unknown taskId" })
    return { taskId, operations }
  })
  return {
    get enabled() {
      return operationsByTool.size > 0
    },
    install: (name: string, operations: Operations) =>
      Effect.sync(() => {
        if (operationsByTool.has(name)) throw new Error(`MCP task tool '${name}' is already registered`)
        operationsByTool.set(name, operations)
      }),
    register: (
      name: string,
      call: (
        payload: typeof McpSchema.CallTool.payloadSchema.Type,
        invocation: McpCore.McpInvocation
      ) => Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError>
    ) =>
      core.tools.decorate(name, (registration) => {
        const decorated: McpCore.ToolRegistration = {
          ...registration,
          isVisible: (profile) => profile.protocolVersion === "2026-07-28" && registration.isVisible(profile),
          handle: () => Effect.fail(new McpCore.ToolExecutionError({ name, message: "Tool requires MCP Tasks" }))
        }
        registrations.set(decorated, {
          call: (payload, invocation) =>
            registration.isVisible(invocation.protocol)
              ? call(payload, invocation).pipe(Effect.map((outcome) =>
                outcome._tag === "Task"
                  ? {
                    ...outcome,
                    task: { ...outcome.task, taskId: Base64Url.encode(JSON.stringify([name, outcome.task.taskId])) }
                  }
                  : outcome
              )) :
              Effect.fail(new McpCore.ToolNotFound({ name }))
        })
        return decorated
      }),
    call: (
      payload: typeof McpSchema.CallTool.payloadSchema.Type,
      invocation: McpCore.McpInvocation
    ): Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError> =>
      Effect.gen(function*() {
        const current = yield* core.tools.get(payload.name)
        const entry = current === undefined ? undefined : registrations.get(current)
        return yield* (entry ?
          entry.call(payload, invocation) :
          Effect.map(core.tools.call(payload, invocation), (outcome): TaskCallOutcome => ({ _tag: "Inline", outcome })))
      }),
    get: Effect.fnUntraced(function*(id: string, invocation: McpCore.McpInvocation) {
      const { taskId, operations } = yield* resolve(id)
      const task = yield* operations.get(taskId, invocation)
      return { ...task, taskId: id }
    }),
    update: Effect.fnUntraced(
      function*(
        id: string,
        responses: Readonly<Record<string, McpSchema.McpInputResponse>>,
        invocation: McpCore.McpInvocation
      ) {
        const { taskId, operations } = yield* resolve(id)
        yield* operations.update(taskId, responses, invocation)
      }
    ),
    cancel: Effect.fnUntraced(function*(id: string, invocation: McpCore.McpInvocation) {
      const { taskId, operations } = yield* resolve(id)
      yield* operations.cancel(taskId, invocation)
    })
  }
})
