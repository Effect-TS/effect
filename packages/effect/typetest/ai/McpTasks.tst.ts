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
import { describe, expect, it } from "tstyche"

class Database extends Context.Service<Database, { readonly query: true }>()("test/McpTasks/Database") {}
class Pricing extends Context.Service<Pricing, { readonly expensive: boolean }>()("test/McpTasks/Pricing") {}
class Decoder extends Context.Service<Decoder, number>()("test/McpTasks/Decoder") {}

const Failure = Schema.TaggedStruct("EstimateFailure", { message: Schema.String })
const Interactive = Tool.make("interactive", {
  parameters: Schema.Struct({ rows: Schema.NumberFromString }),
  success: Schema.String
})
const Quick = Tool.make("quick", {
  parameters: Schema.Struct({ rows: Schema.NumberFromString }),
  success: Schema.String,
  failure: Failure
})
const reports = Toolkit.make(Interactive, Quick)
const ordinary = Toolkit.make(Quick)
const handlers = {
  interactive: () =>
    Effect.gen(function*() {
      yield* McpTasks.Input
      yield* Database
      return "report"
    }),
  quick: () => McpTasks.TaskContext.useSync((context) => context.mode)
}
const quickHandlers = { quick: handlers.quick }

describe("McpTasks registration", () => {
  it("should preserve service keys when task services are subclassed or yielded", () => {
    class InputKey extends McpTasks.Input {}
    expect<InputKey>().type.toBe<McpTasks.Input>()
    expect(McpTasks.Input.key).type.toBe<"effect/ai/McpTasks/Input">()
    expect(Effect.gen(function*() {
      return yield* McpTasks.Input
    })).type.toBe<Effect.Effect<McpTasks.Input["Service"], never, McpTasks.Input>>()
  })

  it("should yield a typed failure when a task error is used in an Effect generator", () => {
    expect(Effect.gen(function*() {
      return yield* new McpTasks.TaskError({ code: -32602, message: "Unknown taskId" })
    })).type.toBe<Effect.Effect<never, McpTasks.TaskError>>()
  })

  it("should narrow task fields when status or execution mode is checked", () => {
    const task = null as unknown as McpTasks.DetailedTask
    if (task.status === "completed") {
      expect(task.result).type.toBe<McpSchema.CallToolResult>()
    }
    if (task.status === "input_required") {
      expect(task.inputRequests).type.toBe<Readonly<Record<string, McpSchema.McpInputRequest>>>()
    }
    const context = null as unknown as McpTasks.TaskContext["Service"]
    if (context.mode === "task") {
      expect(context.taskId).type.toBe<McpTasks.TaskId>()
    }
  })

  it("should reject ambiguous or unknown policies when optional execution is configured", () => {
    expect(McpTasks.toolkit).type.toBeCallableWith(ordinary, {}, quickHandlers)
    expect(McpTasks.toolkit).type.toBeCallableWith(
      ordinary,
      { quick: { mode: "optional", whenUnavailable: "inline" } },
      quickHandlers
    )
    expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, { quick: { mode: "optional" } }, quickHandlers)
    expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, { typo: { mode: "required" } }, quickHandlers)
  })

  it("should infer decoded inputs and services when handlers and decisions are configured", () => {
    const registered = McpTasks.toolkit(reports, {
      interactive: { mode: "required" },
      quick: {
        mode: "optional",
        whenUnavailable: "inline",
        decide: (input) => {
          expect(input).type.toBe<{ readonly rows: number }>()
          return Pricing.useSync((pricing): "task" | "inline" => pricing.expensive ? "task" : "inline")
        }
      }
    }, {
      ...handlers,
      quick: ({ rows }) => {
        expect(rows).type.toBe<number>()
        return Database.useSync(() => String(rows))
      }
    }).pipe(McpTasks.toLayer)
    expect(registered).type.toBe<
      Layer.Layer<
        Tool.HandlersFor<typeof reports.tools>,
        McpTasks.InvalidOption,
        McpTasks.Execution | Database | Pricing
      >
    >()
    expect(McpTasks.toolkit).type.toBeCallableWith(ordinary, {
      quick: {
        mode: "optional",
        whenUnavailable: "inline",
        decide: () => Effect.fail(Failure.make({ message: "unavailable" }))
      }
    }, quickHandlers)
    expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {
      quick: { mode: "optional", whenUnavailable: "inline", decide: () => Effect.fail("wrong") }
    }, quickHandlers)
  })

  it("should retain decoder services when an elicitation response uses a transformation", () => {
    const response = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
      decode: SchemaGetter.transformEffect((value) => Effect.map(Decoder, (scale) => Number(value) * scale)),
      encode: SchemaGetter.transformEffect((value: number) => Effect.succeed(String(value)))
    }))
    const request = null as unknown as typeof McpSchema.Elicit.payloadSchema.Type
    const elicitation = McpTasks.Input.use((input) => input.elicitation(request, response))
    expect(elicitation).type.toBe<
      Effect.Effect<
        | { readonly action: "accept"; readonly content: number }
        | { readonly action: "decline" | "cancel" },
        Schema.SchemaError | McpTasks.InputUnavailable,
        McpTasks.Input | Decoder
      >
    >()
  })
})

describe("McpTasks execution", () => {
  it("should reject input continuations when task execution is created", () => {
    const execution = null as unknown as McpTasks.Execution["Service"]
    const request = null as unknown as McpTasks.TaskRequestContext
    const result = null as unknown as McpSchema.CallToolResult
    expect(execution.create).type.toBeCallableWith(Effect.succeed(result), request, {})
    expect(execution.create).type.not.toBeCallableWith(
      Effect.succeed({ _tag: "InputRequired" as const, inputRequests: {} }),
      request,
      {}
    )
  })
})

it("should reject prepared arguments when public tool handlers are called", () => {
  const handle = null as unknown as Parameters<McpServer.McpServer["Service"]["addTool"]>[0]["handle"]
  expect(handle).type.toBeCallableWith({})
  expect(handle).type.not.toBeCallableWith({}, { parameters: {} })
})

it("should retain external services when MCP supplies execution services", () => {
  const registered = McpTasks.toolkit(reports, { interactive: { mode: "required" } }, {
    interactive: Effect.fnUntraced(function*({ rows }) {
      expect(rows).type.toBe<number>()
      yield* Database
      yield* McpTasks.Input
      yield* McpTasks.TaskContext
      yield* McpSchema.McpRequestContext
      return String(rows)
    }),
    quick: ({ rows }) => Effect.succeed(String(rows))
  }).pipe(McpTasks.toLayer)
  expect(registered).type.toBe<
    Layer.Layer<Tool.HandlersFor<typeof reports.tools>, McpTasks.InvalidOption, McpTasks.Execution | Database>
  >()
})

it("should require task mode when a parameterized handler uses task input", () => {
  const interactiveHandlers = {
    quick: ({ rows }: { readonly rows: number }) => McpTasks.Input.useSync(() => String(rows))
  }
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, interactiveHandlers)
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {
    quick: { mode: "optional", whenUnavailable: "inline" }
  }, interactiveHandlers)
  expect(McpTasks.toolkit).type.toBeCallableWith(ordinary, { quick: { mode: "required" } }, interactiveHandlers)
})

it("should remove unused services when handlers are replaced with mocks", () => {
  const mocked = McpTasks.toolkit(reports, {}, {
    interactive: () => Effect.succeed("mocked"),
    quick: () => Effect.succeed("mocked")
  }).pipe(McpTasks.toLayer)
  expect(mocked).type.toBe<
    Layer.Layer<Tool.HandlersFor<typeof reports.tools>, McpTasks.InvalidOption, McpTasks.Execution>
  >()
})

it("should retain construction errors and services when handlers are built with an effect", () => {
  const registered = McpTasks.toolkit(
    ordinary,
    {},
    Effect.gen(function*() {
      const pricing = yield* Pricing
      if (pricing.expensive) return yield* Effect.fail("construction failed" as const)
      return { quick: ({ rows }: { readonly rows: number }) => Database.useSync(() => String(rows)) }
    })
  ).pipe(McpTasks.toLayer)
  expect(registered).type.toBe<
    Layer.Layer<
      Tool.HandlersFor<typeof ordinary.tools>,
      McpTasks.InvalidOption | "construction failed",
      McpTasks.Execution | Pricing | Database
    >
  >()
})

it("should reject missing or incompatible handlers when a toolkit is configured", () => {
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, { quick: () => Effect.succeed(123) })
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, { quick: () => Effect.fail("wrong") })
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, {})
})

it("should retain execution services when a definition is used as a reusable layer", () => {
  const definition = McpTasks.toolkit(reports, { interactive: { mode: "required" } }, handlers)
  expect<Layer.Success<typeof definition>>().type.toBe<Tool.HandlersFor<typeof reports.tools>>()
  expect<Layer.Error<typeof definition>>().type.toBe<never>()
  expect<Layer.Services<typeof definition>>().type.toBe<Database | McpTasks.Input | McpTasks.TaskContext>()
  expect(McpTasks.toLayer(definition)).type.toBe<
    Layer.Layer<Tool.HandlersFor<typeof reports.tools>, McpTasks.InvalidOption, McpTasks.Execution | Database>
  >()
})

it("should retain task services when handler construction requires them", () => {
  const definition = McpTasks.toolkit(
    ordinary,
    {},
    Effect.gen(function*() {
      const context = yield* McpTasks.TaskContext
      return { quick: () => Effect.succeed(context.mode) }
    })
  )
  expect<Layer.Services<typeof definition>>().type.toBe<McpTasks.TaskContext>()
  expect(McpTasks.toLayer(definition)).type.toBe<
    Layer.Layer<
      Tool.HandlersFor<typeof ordinary.tools>,
      McpTasks.InvalidOption,
      McpTasks.Execution | McpTasks.TaskContext
    >
  >()
})

it("should provide ordinary handler services when task memory is supplied", () => {
  const tools = Toolkit.make(Tool.make("workspace_report", { success: Schema.String }))
  const tasks = McpTasks.toolkit(tools, { workspace_report: { mode: "required" } }, {
    workspace_report: () => McpTasks.TaskContext.useSync((task) => task.mode)
  }).pipe(
    McpTasks.toLayer,
    Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))
  )
  expect(tasks).type.toBe<Layer.Layer<Tool.Handler<"workspace_report">, McpTasks.InvalidOption, never>>()
})

it("should infer branch services and decoded inputs when task and inline handlers are paired", () => {
  const registered = McpTasks.toolkit(ordinary, {
    quick: { mode: "optional", whenUnavailable: "inline" }
  }, {
    quick: {
      task: Effect.fnUntraced(function*({ rows }) {
        expect(rows).type.toBe<number>()
        yield* McpTasks.Input
        yield* Database
        return String(rows)
      }),
      inline: Effect.fnUntraced(function*({ rows }) {
        expect(rows).type.toBe<number>()
        yield* Pricing
        yield* McpTasks.TaskContext
        return String(rows)
      })
    }
  }).pipe(McpTasks.toLayer)
  expect(registered).type.toBe<
    Layer.Layer<Tool.Handler<"quick">, McpTasks.InvalidOption, McpTasks.Execution | Database | Pricing>
  >()
})

it("should reject task input when an inline handler requires it", () => {
  const unsafe = { quick: { task: () => Effect.succeed("task"), inline: () => McpTasks.Input.useSync(() => "inline") } }
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {
    quick: { mode: "optional", whenUnavailable: "inline" }
  }, unsafe)
})

it("should reject incompatible results and failures when separate handlers are configured", () => {
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, {
    quick: { task: () => Effect.succeed("task"), inline: () => Effect.succeed(1) }
  })
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, {
    quick: { task: () => Effect.succeed(1), inline: () => Effect.succeed("inline") }
  })
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {}, {
    quick: { task: () => Effect.succeed("task"), inline: () => Effect.fail("invalid failure") }
  })
})

it("should retain branch and construction services when paired handlers are built with an effect", () => {
  const registered = McpTasks.toolkit(
    ordinary,
    {
      quick: { mode: "optional", whenUnavailable: "inline" }
    },
    Effect.gen(function*() {
      yield* McpTasks.TaskContext
      return {
        quick: {
          task: ({ rows }: { readonly rows: number }) => McpTasks.Input.useSync(() => String(rows)),
          inline: ({ rows }: { readonly rows: number }) => Database.useSync(() => String(rows))
        }
      }
    })
  ).pipe(McpTasks.toLayer)
  expect(registered).type.toBe<
    Layer.Layer<Tool.Handler<"quick">, McpTasks.InvalidOption, McpTasks.Execution | McpTasks.TaskContext | Database>
  >()
})

it("should reject task input when effect-built inline handlers require it", () => {
  const build = Effect.succeed({
    quick: {
      task: () => Effect.succeed("task"),
      inline: () => McpTasks.Input.useSync(() => "inline")
    }
  })
  expect(McpTasks.toolkit).type.not.toBeCallableWith(ordinary, {
    quick: { mode: "optional", whenUnavailable: "inline" }
  }, build)
})
