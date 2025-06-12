import { Context, Effect } from "effect"
import { describe, expect, it } from "tstyche"

describe("Context", () => {
  it("`key` field", () => {
    class A extends Effect.Service<A>()("A", { succeed: { a: "value" } }) {}
    expect(A.key).type.toBe<"A">()

    class B extends Context.Tag("B")<B, { a: "value" }>() {}
    expect(B.key).type.toBe<"B">()

    class C extends Context.Reference<C>()("C", { defaultValue: () => 0 }) {}
    expect(C.key).type.toBe<"C">()
  })
  it("Tag with static fields", () => {
    class Foo extends Context.Tag("Foo")<Foo, { readonly bar: string }>() {
      static readonly StaticField = "StaticField"
    }

    // @ts-expect-error
    Context.empty().pipe(Context.add(Foo, 123))

    const ctx = Context.empty().pipe(Context.add(Foo, { bar: "2" }))
    expect(ctx).type.toBe<Context.Context<Foo>>()
  })
})
