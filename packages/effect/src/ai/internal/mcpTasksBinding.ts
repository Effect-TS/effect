/** @internal */
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import { memoize } from "../../Function.ts"
import * as Predicate from "../../Predicate.ts"
import type * as McpSchema from "../McpSchema.ts"
import type * as McpTasks from "../McpTasks.ts"
import * as McpCore from "./mcpCore.ts"

/** @internal */
export class TaskError extends Data.TaggedError("TaskError")<
  Pick<McpTasks.TaskError, "code" | "message" | "data">
> {}

/** @internal */
export const supportsTasks = (invocation: McpCore.McpInvocation): boolean =>
  invocation.protocol.protocolVersion === "2026-07-28" &&
  Predicate.isReadonlyObject(invocation.protocol.clientCapabilities.extensions?.["io.modelcontextprotocol/tasks"])

/** @internal */
export type TaskRecord = McpTasks.DetailedTask

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

/** @internal */
export interface Tasks {
  readonly enabled: boolean
  readonly runInline: McpCore.Tools["call"]
  readonly register: (
    name: string,
    mode: "required" | "optional" | "inline",
    call: (
      payload: typeof McpSchema.CallTool.payloadSchema.Type,
      invocation: McpCore.McpInvocation
    ) => Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError>
  ) => Effect.Effect<void>
  readonly call: (
    payload: typeof McpSchema.CallTool.payloadSchema.Type,
    invocation: McpCore.McpInvocation
  ) => Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError>
  readonly install: (identity: object, operations: {
    readonly get: (taskId: string, invocation: McpCore.McpInvocation) => Effect.Effect<TaskRecord, TaskError>
    readonly update: (
      taskId: string,
      inputResponses: Readonly<Record<string, McpSchema.McpInputResponse>>,
      invocation: McpCore.McpInvocation
    ) => Effect.Effect<void, TaskError>
    readonly cancel: (taskId: string, invocation: McpCore.McpInvocation) => Effect.Effect<void, TaskError>
  }) => Effect.Effect<void>
  readonly get: (taskId: string, invocation: McpCore.McpInvocation) => Effect.Effect<TaskRecord, TaskError>
  readonly update: (
    taskId: string,
    inputResponses: Readonly<Record<string, McpSchema.McpInputResponse>>,
    invocation: McpCore.McpInvocation
  ) => Effect.Effect<void, TaskError>
  readonly cancel: (taskId: string, invocation: McpCore.McpInvocation) => Effect.Effect<void, TaskError>
}

/** @internal */
export const get = memoize((core: McpCore.McpCore): Tasks => {
  const registrations = new Map<string, {
    mode: "required" | "optional" | "inline"
    call: Parameters<Tasks["register"]>[2]
    run: McpCore.Tools["call"]
  }>()
  const backends = new Map<object, Parameters<Tasks["install"]>[1]>()

  const resolve = Effect.fnUntraced(function*(taskId: string, invocation: McpCore.McpInvocation) {
    if (backends.size === 0) return yield* new TaskError({ code: -32601, message: "Tasks are not enabled" })

    for (const operations of backends.values()) {
      const result = yield* Effect.result(operations.get(taskId, invocation))
      if (result._tag === "Success") return { operations, task: result.success }
      if (result.failure.code !== -32602) return yield* result.failure
    }

    return yield* new TaskError({ code: -32602, message: "Unknown taskId" })
  })

  const binding: Tasks = {
    get enabled() {
      return Array.from(registrations.values()).some((entry) => entry.mode !== "inline")
    },
    runInline: (payload, invocation, prepared) =>
      Effect.suspend(() => (registrations.get(payload.name)?.run ?? core.tools.call)(payload, invocation, prepared)),
    register: (name, mode, call) =>
      core.tools.decorate(name, (registration) => {
        const run: McpCore.Tools["call"] = (payload, invocation, prepared) =>
          registration.isVisible(invocation.protocol)
            ? registration.handle(payload, invocation, prepared)
            : Effect.fail(new McpCore.ToolNotFound({ name }))
        registrations.set(name, {
          mode,
          run,
          call: (payload, invocation) =>
            registration.isVisible(invocation.protocol)
              ? call(payload, invocation)
              : Effect.fail(new McpCore.ToolNotFound({ name }))
        })
        return {
          ...registration,
          isVisible: (profile) =>
            registration.isVisible(profile) &&
            (mode !== "required" || profile.protocolVersion === "2026-07-28"),
          handle: (payload, invocation) =>
            call(payload, invocation).pipe(
              Effect.flatMap((result) =>
                result._tag === "Inline"
                  ? Effect.succeed(result.outcome)
                  : Effect.fail(new McpCore.ToolExecutionError({ name, message: "Task result is unavailable" }))
              ),
              Effect.mapError((error) =>
                error._tag === "TaskError" || error._tag === "ToolNotFound"
                  ? new McpCore.ToolExecutionError({
                    name,
                    message: error._tag === "TaskError" ? error.message : "Tool not found"
                  })
                  : error
              )
            )
        }
      }),
    call: (payload, invocation) =>
      Effect.suspend(() => {
        const registration = registrations.get(payload.name)
        return registration === undefined
          ? Effect.map(
            core.tools.call(payload, invocation),
            (outcome): TaskCallOutcome => ({ _tag: "Inline", outcome })
          )
          : registration.call(payload, invocation)
      }),
    install: (identity, value) =>
      Effect.sync(() => {
        backends.set(identity, value)
      }),
    get: Effect.fnUntraced(function*(taskId, invocation) {
      return (yield* resolve(taskId, invocation)).task
    }),
    update: Effect.fnUntraced(function*(taskId, responses, invocation) {
      const { operations } = yield* resolve(taskId, invocation)
      yield* operations.update(taskId, responses, invocation)
    }),
    cancel: Effect.fnUntraced(function*(taskId, invocation) {
      const { operations } = yield* resolve(taskId, invocation)
      yield* operations.cancel(taskId, invocation)
    })
  }
  return binding
})
