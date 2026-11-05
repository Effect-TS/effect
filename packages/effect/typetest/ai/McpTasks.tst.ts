import * as McpSchema from "effect/ai/McpSchema"
import type * as McpServer from "effect/ai/McpServer"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Activity from "effect/workflow/Activity"
import type * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { expect, it } from "tstyche"

class Database extends Context.Service<Database, { readonly query: true }>()("test/McpTasks/Database") {}
class Decoder extends Context.Service<Decoder, number>()("test/McpTasks/Decoder") {}

const Failure = Schema.TaggedStruct("ReportFailure", { message: Schema.String })
const reports = Toolkit.make(Tool.make("report", {
  parameters: Schema.Struct({ rows: Schema.NumberFromString }),
  success: Schema.String,
  failure: Failure
}))
const options = { name: "reports", owner: "shared" as const }
type RuntimeServices = McpServer.McpServer | WorkflowEngine.WorkflowEngine

it("should infer decoded parameters and handler context when registering a task", () => {
  const registered = McpTasks.toolkit(reports, { owner: options.owner }).pipe(
    Layer.provide(McpTasks.layerWorkflow(reports, {
      report: ({ rows }, context) => {
        expect(rows).type.toBe<number>()
        expect(context).type.toBe<Toolkit.HandlerContext<typeof reports.tools.report>>()
        return Effect.succeed(String(rows))
      }
    }, { name: options.name }))
  )
  expect(registered).type.toBe<Layer.Layer<never, Schema.SchemaError, RuntimeServices>>()
})

it("should supply Workflow context and retain application services when handlers use Activities", () => {
  const registered = McpTasks.toolkit(reports, { owner: options.owner }).pipe(
    Layer.provide(McpTasks.layerWorkflow(reports, {
      report: Effect.fnUntraced(function*() {
        yield* McpSchema.McpRequestContext
        return yield* Activity.make({
          name: "query",
          success: Schema.String,
          execute: Database.useSync(() => "report")
        })
      })
    }, { name: options.name }))
  )
  expect(registered).type.toBe<Layer.Layer<never, Schema.SchemaError, RuntimeServices | Database>>()
})

it("should reject registration when a tool handler is missing", () => {
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {}, options)
})

it("should reject a handler when its success type differs from the tool schema", () => {
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {
    report: () => Effect.succeed(123)
  }, options)
})

it("should reject a handler when its error type differs from the tool schema", () => {
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {
    report: () => Effect.fail("wrong failure")
  }, options)
})

it("should retain application requirements when memory handlers receive the task context", () => {
  const execution = McpTasks.layerMemory(reports, {
    report: Effect.fnUntraced(function*() {
      const task = yield* McpTasks.TaskContext
      yield* task.setStatusMessage("Waiting for approval")
      yield* task.requestInput({
        key: "approval",
        request: { method: "elicitation/create", params: {} },
        response: Schema.Struct({ approved: Schema.Boolean })
      }).pipe(Effect.orDie)
      return yield* Database.useSync(() => "report")
    })
  })
  expect(execution).type.toBe<Layer.Layer<McpTasks.Execution, never, Database>>()
})

it("should infer response values and retain decoder requirements when a handler requests input", () => {
  const response = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformEffect((value) => Effect.map(Decoder, (scale) => Number(value) * scale)),
    encode: SchemaGetter.transformEffect((value: number) => Effect.succeed(String(value)))
  }))
  const requested = McpTasks.TaskContext.use((task) =>
    task.requestInput({
      key: "scaled",
      request: { method: "elicitation/create", params: {} },
      response: Schema.Struct({ value: response })
    })
  )
  expect(requested).type.toBe<
    Effect.Effect<{ readonly value: number }, Schema.SchemaError, McpTasks.TaskContext | Decoder>
  >()
})
