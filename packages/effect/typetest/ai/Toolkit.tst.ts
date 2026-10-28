import { Context, Effect, Schema, SchemaGetter, Stream } from "effect"
import { Tool, Toolkit } from "effect/ai"
import { describe, expect, it } from "tstyche"

class Database extends Context.Service<Database, number>()("test/ToolkitDatabase") {}
class Configuration extends Context.Service<Configuration, string>()("test/ToolkitConfiguration") {}

class Decoder extends Context.Service<Decoder, { readonly value: number }>()("test/ToolkitDecoder") {}

const parameter = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
  decode: SchemaGetter.transformEffect(() => Effect.map(Decoder, (decoder) => decoder.value)),
  encode: SchemaGetter.transform(String)
}))

const toolkit = Toolkit.make(Tool.make("Decode", {
  parameters: Schema.Struct({ n: parameter }),
  success: Schema.Number
}))

declare const requiresHandler: boolean

describe("Toolkit", () => {
  it("requires parameter decoder services on the outer handle Effect", () => {
    const handle = Effect.gen(function*() {
      const handlers = yield* toolkit
      return yield* handlers.handle("Decode", { n: "1" })
    }).pipe(Effect.provide(toolkit.toLayer({ Decode: ({ n }) => Effect.succeed(n) })))

    expect<[Decoder] extends [Effect.Services<typeof handle>] ? true : false>().type.toBe<true>()
    // Providing the service only to the returned Stream cannot discharge the
    // requirement of decoding before that Stream exists.
    const streamOnly = handle.pipe(
      Effect.flatMap((stream) => Stream.runCollect(stream).pipe(Effect.provideService(Decoder, { value: 1 })))
    )
    expect<[Decoder] extends [Effect.Services<typeof streamOnly>] ? true : false>().type.toBe<true>()
  })

  it("does not require handlers for client-executed tools", () => {
    const Ask = Tool.make("Ask", {
      parameters: Schema.Struct({ question: Schema.String }),
      success: Schema.Boolean,
      execution: "client"
    })
    const Confirm = Tool.dynamic("Confirm", { parameters: { type: "object", properties: {} }, execution: "client" })
    const Lookup = Tool.make("Lookup", { success: Schema.String })

    expect<Tool.RequiresHandler<typeof Ask>>().type.toBe<false>()
    expect<Tool.RequiresHandler<typeof Confirm>>().type.toBe<false>()
    expect<Tool.RequiresHandler<typeof Lookup>>().type.toBe<true>()

    const toolkit = Toolkit.make(Ask, Confirm, Lookup)
    expect(toolkit.toLayer).type.toBeCallableWith({ Lookup: () => Effect.succeed("value") })
    expect(toolkit.toLayer).type.not.toBeCallableWith({})
  })

  it("keeps client execution through tool combinators", () => {
    const Ask = Tool.make("Ask", { execution: "client" })
    const Confirm = Tool.dynamic("Confirm", { parameters: { type: "object", properties: {} }, execution: "client" })

    expect<Tool.RequiresHandler<ReturnType<typeof Ask.setParameters<typeof Schema.String>>>>().type.toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Ask.setSuccess<typeof Schema.Boolean>>>>().type.toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Ask.setFailure<typeof Schema.String>>>>().type.toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Ask.setNeedsApproval>>>().type.toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Ask.addDependency<Decoder, { readonly value: number }>>>>().type
      .toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Ask.annotate<boolean, boolean>>>>().type.toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Ask.annotateMerge<never>>>>().type.toBe<false>()
    expect<Tool.RequiresHandler<ReturnType<typeof Confirm.setNeedsApproval>>>().type.toBe<false>()

    // A configured client tool still needs no handler, and a configured server
    // tool still needs one
    const Configured = Ask.setParameters(Schema.Struct({ question: Schema.String }))
    expect(Toolkit.make(Configured).toLayer).type.toBeCallableWith({})
    const Lookup = Tool.make("Lookup").setSuccess(Schema.String)
    expect<Tool.RequiresHandler<typeof Lookup>>().type.toBe<true>()
  })

  it("requires a handler unless a tool is definitely client-executed", () => {
    // `undefined` creates a server-executed tool, so a possibly undefined
    // execution must keep the handler requirement
    const make = (execution: "client" | undefined) => Tool.make("Ask", { execution })
    const dynamic = (execution: "client" | undefined) =>
      Tool.dynamic("Confirm", { parameters: { type: "object", properties: {} }, execution })
    expect<Tool.RequiresHandler<ReturnType<typeof make>>>().type.toBe<true>()
    expect<Tool.RequiresHandler<ReturnType<typeof dynamic>>>().type.toBe<true>()
    expect(Toolkit.make(make(undefined)).toLayer).type.not.toBeCallableWith({})

    // The same holds when the whole options object may be absent
    const makeOptional = (options: { readonly execution: "client" } | undefined) => Tool.make("Ask", options)
    const dynamicOptional = (options: { readonly execution: "client" } | undefined) => Tool.dynamic("Confirm", options)
    expect<Tool.RequiresHandler<ReturnType<typeof makeOptional>>>().type.toBe<true>()
    expect<Tool.RequiresHandler<ReturnType<typeof dynamicOptional>>>().type.toBe<true>()
    expect(Toolkit.make(makeOptional(undefined)).toLayer).type.not.toBeCallableWith({})
    expect(Toolkit.make(dynamicOptional(undefined)).toLayer).type.not.toBeCallableWith({})

    // A runtime check establishes client execution, and configuring the
    // narrowed tool keeps it
    const widened: Tool.Tool<"Ask", {
      readonly parameters: typeof Tool.EmptyParams
      readonly success: typeof Schema.Void
      readonly failure: typeof Schema.Never
      readonly failureMode: "error"
    }> = Tool.make("Ask", { execution: "client" })
    expect<Tool.RequiresHandler<typeof widened>>().type.toBe<true>()
    if (Tool.isClientExecuted(widened)) {
      const configured = widened.setSuccess(Schema.Number)
      expect<Tool.RequiresHandler<typeof widened>>().type.toBe<false>()
      expect<Tool.RequiresHandler<typeof configured>>().type.toBe<false>()
      expect(Toolkit.make(configured).toLayer).type.toBeCallableWith({})
    }

    // Narrowing an erased dynamic tool keeps its dynamic type and client
    // execution through every combinator. Results that are no longer tools
    // report "not a tool" rather than failing to compile.
    type NeedsHandler<T> = T extends Tool.Any ? Tool.RequiresHandler<T> : "not a tool"
    const erased = Tool.dynamic("Confirm", { execution: "client" }) as Tool.AnyDynamic
    if (Tool.isClientExecuted(erased)) {
      expect(erased).type.toBeAssignableTo<Tool.AnyDynamic>()
      expect<Tool.RequiresHandler<typeof erased>>().type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.setParameters<typeof Schema.String>>>>().type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.setSuccess<typeof Schema.Number>>>>().type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.setFailure<typeof Schema.String>>>>().type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.setNeedsApproval>>>().type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.addDependency<Decoder, { readonly value: number }>>>>()
        .type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.annotate<boolean, boolean>>>>().type.toBe<false>()
      expect<NeedsHandler<ReturnType<typeof erased.annotateMerge<never>>>>().type.toBe<false>()
    }

    // The guard narrows when passed as a predicate callback
    const tools: ReadonlyArray<Tool.Any> = []
    const dynamicTools: ReadonlyArray<Tool.AnyDynamic> = []
    const clients = tools.filter(Tool.isClientExecuted)
    const dynamicClients = dynamicTools.filter(Tool.isClientExecuted)
    expect<Tool.RequiresHandler<typeof clients[number]>>().type.toBe<false>()
    expect<Tool.RequiresHandler<typeof dynamicClients[number]>>().type.toBe<false>()
    expect(dynamicClients).type.toBeAssignableTo<ReadonlyArray<Tool.AnyDynamic>>()
  })

  it("requires a handler for a provider-defined tool whose handler flag may be true", () => {
    const flagged = Toolkit.make(
      Tool.providerDefined({
        id: "test.flagged",
        customName: "Flagged",
        providerName: "flagged",
        requiresHandler
      })({})
    )

    expect(flagged.toLayer).type.toBeCallableWith({ Flagged: () => Effect.void })
    expect(flagged.toLayer).type.not.toBeCallableWith({})
  })
})

// Owner: public compiler behavior; runtime protocol conformance is covered by the MCP runtime suites.
describe("bound Toolkit handlers", () => {
  it("should retain unknown services when handler requirements are widened", () => {
    const tools = Toolkit.make(Tool.make("Read", { success: Schema.Number }))
    // Deliberately widen the services to exercise the unsafe input boundary.
    const handlers: Toolkit.HandlersFrom<typeof tools.tools, any> = { Read: () => Database }
    const run = Effect.flatMap(
      tools.withHandlers(handlers),
      (bound) => Effect.flatMap(bound.handle("Read", {}), Stream.runCollect)
    )
    expect<Effect.Services<typeof run>>().type.toBe<unknown>()
    expect(Effect.runPromise).type.not.toBeCallableWith(run)
  })

  it("should reject incorrect handler results when allowing extra services", () => {
    expect(toolkit.withHandlers).type.not.toBeCallableWith({ Decode: () => Effect.succeed("wrong") })
  })

  it("should reject incorrect handler failures when allowing extra services", () => {
    expect(toolkit.withHandlers).type.not.toBeCallableWith({ Decode: () => Effect.fail("wrong") })
  })

  it("should require no handler services when binding an empty toolkit", () => {
    expect(Toolkit.empty.withHandlers({})).type.toBe<Effect.Effect<Toolkit.WithHandler<{}>>>()
  })

  it("should retain handler services when decoding and consuming the result stream", () => {
    const bound = toolkit.withHandlers({
      Decode: ({ n }) => Effect.map(Database, (value) => n + value)
    })
    expect(bound).type.toBe<Effect.Effect<Toolkit.WithHandler<typeof toolkit.tools, Database>>>()
    const call = Effect.flatMap(bound, (handlers) => handlers.handle("Decode", { n: "1" }))
    expect<Effect.Services<typeof call>>().type.toBe<Decoder | Database>()
    expect<Stream.Services<Effect.Success<typeof call>>>().type.toBe<Decoder | Database>()
    const run = call.pipe(Effect.flatMap(Stream.runCollect))
    expect(Effect.runPromise).type.not.toBeCallableWith(run.pipe(
      Effect.provideService(Decoder, { value: 2 })
    ))
    expect(Effect.runPromise).type.toBeCallableWith(run.pipe(
      Effect.provideService(Database, 1),
      Effect.provideService(Decoder, { value: 2 })
    ))
    expect<Toolkit.WithHandlerTools<Effect.Success<typeof bound>>>().type.toBe<typeof toolkit.tools>()
  })

  it("should separate construction requirements when handlers use invocation services", () => {
    const bound = toolkit.withHandlers(Effect.gen(function*() {
      const configuration = yield* Configuration
      if (configuration === "invalid") return yield* Effect.fail("invalid" as const)
      return { Decode: ({ n }: { n: number }) => Effect.map(Database, (value) => n + value) }
    }))
    expect(bound).type.toBe<
      Effect.Effect<Toolkit.WithHandler<typeof toolkit.tools, Database>, "invalid", Configuration>
    >()
  })
})
