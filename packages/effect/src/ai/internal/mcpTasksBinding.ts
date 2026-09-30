/** @internal */
import * as Data from "../../Data.ts"
import type * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import { memoize } from "../../Function.ts"
import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import * as DurableDeferred from "../../workflow/DurableDeferred.ts"
import type * as McpSchema from "../McpSchema.ts"
import * as McpCore from "./mcpCore.ts"

/** @internal */
export class TaskError extends Data.TaggedError("TaskError")<{
  readonly code: number
  readonly message: string
  readonly data?: Schema.JsonObject | undefined
}> {}

/** @internal */
export type TaskRecord =
  & {
    readonly taskId: string
    readonly createdAt: DateTime.Utc
    readonly lastUpdatedAt: DateTime.Utc
  }
  & (
    | { readonly status: "working" | "cancelled" }
    | { readonly status: "completed"; readonly result: McpSchema.CallToolResult }
    | {
      readonly status: "failed"
      readonly error: { readonly code: number; readonly message: string; readonly data?: Schema.JsonObject | undefined }
    }
  )

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
  readonly get: (id: string, invocation: McpCore.McpInvocation) => Effect.Effect<TaskRecord, TaskError>
  readonly cancel: (id: string, invocation: McpCore.McpInvocation) => Effect.Effect<void, TaskError>
}

/** @internal */
export const get = memoize((core: McpCore.McpCore) => {
  const registrations = new Map<string, {
    readonly call: (
      payload: typeof McpSchema.CallTool.payloadSchema.Type,
      invocation: McpCore.McpInvocation
    ) => Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError>
    readonly run: McpCore.Tools["call"]
  }>()
  const workflows = new Map<string, Operations>()
  const resolve = Effect.fnUntraced(function*(id: string) {
    const token = yield* Schema.decodeUnknownEffect(DurableDeferred.TokenParsed.FromString)(id).pipe(
      Effect.mapError(() => new TaskError({ code: -32602, message: "Unknown taskId" }))
    )
    const operations = workflows.get(token.workflowName)
    if (!operations || token.deferredName !== "mcp/task/identity") {
      return yield* new TaskError({ code: -32602, message: "Unknown taskId" })
    }
    return operations
  })
  return {
    get enabled() {
      return registrations.size > 0
    },
    install: (name: string, operations: Operations) =>
      Effect.sync(() => {
        if (workflows.has(name)) throw new Error(`MCP task workflow '${name}' is already registered`)
        workflows.set(name, operations)
      }),
    run: (payload: typeof McpSchema.CallTool.payloadSchema.Type, invocation: McpCore.McpInvocation) =>
      Effect.suspend(() => registrations.get(payload.name)!.run(payload, invocation)),
    register: (
      name: string,
      call: (
        payload: typeof McpSchema.CallTool.payloadSchema.Type,
        invocation: McpCore.McpInvocation
      ) => Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError>
    ) =>
      core.tools.decorate(name, (registration) => {
        registrations.set(name, {
          run: (payload, invocation) =>
            registration.isVisible(invocation.protocol)
              ? registration.handle(payload, invocation) :
              Effect.fail(new McpCore.ToolNotFound({ name })),
          call: (payload, invocation) =>
            registration.isVisible(invocation.protocol)
              ? call(payload, invocation) :
              Effect.fail(new McpCore.ToolNotFound({ name }))
        })
        return {
          ...registration,
          isVisible: (profile) => profile.protocolVersion === "2026-07-28" && registration.isVisible(profile),
          handle: () => Effect.fail(new McpCore.ToolExecutionError({ name, message: "Tool requires MCP Tasks" }))
        }
      }),
    call: (
      payload: typeof McpSchema.CallTool.payloadSchema.Type,
      invocation: McpCore.McpInvocation
    ): Effect.Effect<TaskCallOutcome, TaskError | McpCore.ToolError> =>
      Effect.suspend(() => {
        const entry = registrations.get(payload.name)
        return entry ?
          entry.call(payload, invocation) :
          Effect.map(core.tools.call(payload, invocation), (outcome): TaskCallOutcome => ({ _tag: "Inline", outcome }))
      }),
    get: Effect.fnUntraced(function*(id: string, invocation: McpCore.McpInvocation) {
      return yield* (yield* resolve(id)).get(id, invocation)
    }),
    update: Effect.fnUntraced(
      function*(
        id: string,
        _responses: Readonly<Record<string, McpSchema.McpInputResponse>>,
        invocation: McpCore.McpInvocation
      ) {
        yield* (yield* resolve(id)).get(id, invocation)
      }
    ),
    cancel: Effect.fnUntraced(function*(id: string, invocation: McpCore.McpInvocation) {
      yield* (yield* resolve(id)).cancel(id, invocation)
    })
  }
})
