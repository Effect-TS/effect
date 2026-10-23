import { Context, Effect, Schema, SchemaGetter, Stream } from "effect"
import { Tool, Toolkit } from "effect/ai"
import { describe, expect, it } from "tstyche"

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
})
