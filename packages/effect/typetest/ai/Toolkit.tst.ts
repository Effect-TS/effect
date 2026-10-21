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
})

describe("bound Toolkit handlers", () => {
  it("does not treat widened handler service requirements as service-free", () => {
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

  it("rejects incorrect handler results and failures when allowing extra services", () => {
    expect(toolkit.withHandlers).type.not.toBeCallableWith({ Decode: () => Effect.succeed("wrong") })
    expect(toolkit.withHandlers).type.not.toBeCallableWith({ Decode: () => Effect.fail("wrong") })
  })

  it("keeps an empty toolkit free of inferred handler services", () => {
    expect(Toolkit.empty.withHandlers({})).type.toBe<Effect.Effect<Toolkit.WithHandler<{}>>>()
  })

  it("keeps handler services on both decoding and the result stream", () => {
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

  it("separates handler construction services and errors from invocation services", () => {
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
