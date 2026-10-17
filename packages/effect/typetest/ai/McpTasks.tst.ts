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
class Configuration extends Context.Service<Configuration, string>()("test/McpTasks/Configuration") {}
class Decoder extends Context.Service<Decoder, number>()("test/McpTasks/Decoder") {}
class Principal extends Context.Service<Principal, string>()("test/McpTasks/Principal") {}

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
      report: () =>
        Effect.gen(function*() {
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

it("should retain construction errors and services when handlers are built with an effect", () => {
  const registered = McpTasks.toolkit(reports, { owner: options.owner }).pipe(
    Layer.provide(McpTasks.layerWorkflow(
      reports,
      Effect.gen(function*() {
        const configuration = yield* Configuration
        if (configuration === "invalid") return yield* Effect.fail("invalid configuration" as const)
        return { report: ({ rows }: { readonly rows: number }) => Database.useSync(() => String(rows)) }
      }),
      { name: options.name }
    ))
  )
  expect(registered).type.toBe<
    Layer.Layer<never, Schema.SchemaError | "invalid configuration", RuntimeServices | Configuration | Database>
  >()
})

it("should retain schema services when task parameters require a decoder", () => {
  const rows = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformEffect((value) => Effect.map(Decoder, (scale) => Number(value) * scale)),
    encode: SchemaGetter.transformEffect((value: number) => Effect.succeed(String(value)))
  }))
  const tools = Toolkit.make(Tool.make("scaled", {
    parameters: Schema.Struct({ rows }),
    success: Schema.String
  }))
  const registered = McpTasks.toolkit(tools, { owner: options.owner }).pipe(
    Layer.provide(McpTasks.layerWorkflow(tools, {
      scaled: ({ rows }) => {
        expect(rows).type.toBe<number>()
        return Effect.succeed(String(rows))
      }
    }, { name: options.name }))
  )
  expect(registered).type.toBe<Layer.Layer<never, Schema.SchemaError, RuntimeServices | Decoder>>()
})

it("should retain owner services when ownership is resolved from the request", () => {
  const registered = McpTasks.toolkit(reports, {
    owner: Effect.gen(function*() {
      yield* McpSchema.McpRequestContext
      return yield* Principal
    })
  }).pipe(
    Layer.provide(McpTasks.layerWorkflow(reports, { report: () => Effect.succeed("report") }, { name: "reports" }))
  )
  expect(registered).type.toBe<Layer.Layer<never, Schema.SchemaError, RuntimeServices | Principal>>()
})

it("should reject missing or incompatible handlers when registering a task", () => {
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {}, options)
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {
    report: () => Effect.succeed(123)
  }, options)
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {
    report: () => Effect.fail("wrong failure")
  }, options)
  expect(McpTasks.layerWorkflow).type.not.toBeCallableWith(reports, {
    report: ({ rows }: { readonly rows: string }) => Effect.succeed(rows)
  }, options)
  expect(McpTasks.layerWorkflow).type.toBeCallableWith(reports, {
    report: () => Effect.fail(Failure.make({ message: "unavailable" }))
  }, options)
})

it("should require only Execution and McpServer for protocol registration", () => {
  expect(McpTasks.toolkit(reports, { owner: "shared" })).type.toBe<
    Layer.Layer<never, never, McpServer.McpServer | McpTasks.Execution>
  >()
  expect(McpTasks.layerMemory(reports, { report: ({ rows }) => Effect.succeed(String(rows)) })).type.toBe<
    Layer.Layer<McpTasks.Execution>
  >()
})

it("should infer callback tools and handler parameters without a Workflow requirement for memory", () => {
  const registered = McpTasks.toolkit(reports, { owner: "shared" }, (tools) => {
    expect(tools).type.toBe<typeof reports>()
    return McpTasks.layerMemory(tools, {
      report: ({ rows }, context) => {
        expect(rows).type.toBe<number>()
        expect(context).type.toBe<Toolkit.HandlerContext<typeof reports.tools.report>>()
        return Effect.succeed(String(rows))
      }
    })
  })
  expect(registered).type.toBe<Layer.Layer<never, never, McpServer.McpServer>>()
})

it("should retain Workflow, handler, and owner requirements from the callback", () => {
  const registered = McpTasks.toolkit(reports, { owner: Principal }, (tools) =>
    McpTasks.layerWorkflow(tools, {
      report: () =>
        Activity.make({
          name: "query",
          success: Schema.String,
          execute: Database.useSync(() => "report")
        })
    }, { name: "reports" }))
  expect(registered).type.toBe<
    Layer.Layer<never, Schema.SchemaError, RuntimeServices | Database | Principal>
  >()
})

it("should retain callback layer errors and construction requirements", () => {
  const registered = McpTasks.toolkit(
    reports,
    { owner: "shared" },
    (tools) =>
      McpTasks.layerMemory(
        tools,
        Effect.gen(function*() {
          yield* Configuration
          return yield* Effect.fail("invalid configuration" as const)
        })
      )
  )
  expect(registered).type.toBe<
    Layer.Layer<never, "invalid configuration", McpServer.McpServer | Configuration>
  >()
})

it("should reject a callback that does not provide Execution", () => {
  expect(McpTasks.toolkit).type.not.toBeCallableWith(
    reports,
    { owner: "shared" },
    () => Layer.succeed(Database, { query: true })
  )
})
