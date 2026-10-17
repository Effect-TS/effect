import * as McpSchema from "effect/ai/McpSchema"
import * as McpTasks from "effect/ai/McpTasks"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// An application's job API owns persistence and authorization. No Workflow is involved.
export interface ReportJob {
  readonly id: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly state: "queued" | "awaiting_roots" | "done" | "failed" | "cancelled"
  readonly report?: string | undefined
}

export class ReportJobs extends Context.Service<ReportJobs, {
  readonly submit: (ownerId: string) => Effect.Effect<ReportJob, McpTasks.TaskError>
  readonly getOwned: (id: string, ownerId: string) => Effect.Effect<ReportJob, McpTasks.TaskError>
  readonly provideRoots: (
    id: string,
    ownerId: string,
    roots: ReadonlyArray<unknown>
  ) => Effect.Effect<void, McpTasks.TaskError>
  readonly cancelOwned: (id: string, ownerId: string) => Effect.Effect<void, McpTasks.TaskError>
}>()("example/ReportJobs") {}

const toTask = (job: ReportJob): McpTasks.Task => {
  const base = {
    taskId: job.id,
    createdAt: DateTime.makeUnsafe(job.createdAt),
    lastUpdatedAt: DateTime.makeUnsafe(job.updatedAt),
    ttlMs: 60_000,
    pollIntervalMs: 1000
  }
  switch (job.state) {
    case "queued":
      return { ...base, status: "working" }
    case "awaiting_roots":
      return {
        ...base,
        status: "input_required",
        inputRequests: { roots: { method: "roots/list" } }
      }
    case "done":
      return {
        ...base,
        status: "completed",
        result: new McpSchema.CallToolResult({ content: [{ type: "text", text: job.report ?? "" }] })
      }
    case "failed":
      return { ...base, status: "failed", error: { code: -32603, message: "Report job failed" } }
    case "cancelled":
      return { ...base, status: "cancelled" }
  }
}

export const externalReports = Layer.effect(
  McpTasks.Execution,
  Effect.gen(function*() {
    const jobs = yield* ReportJobs
    return McpTasks.Execution.of({
      create: (request) =>
        request.toolName === "report"
          ? Effect.map(jobs.submit(request.ownerId), toTask)
          : Effect.fail(new McpTasks.TaskError({ code: -32602, message: "Unknown tool" })),
      get: ({ taskId, ownerId }) => Effect.map(jobs.getOwned(taskId, ownerId), toTask),
      update: Effect.fnUntraced(function*({ taskId, ownerId, inputResponses }) {
        const job = yield* jobs.getOwned(taskId, ownerId)
        if (job.state !== "awaiting_roots") return
        const roots = inputResponses.roots?.roots
        if (Array.isArray(roots)) yield* jobs.provideRoots(taskId, ownerId, roots)
      }),
      cancel: ({ taskId, ownerId }) => jobs.cancelOwned(taskId, ownerId)
    })
  })
)
