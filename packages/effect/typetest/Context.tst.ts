import { Context, Effect, Layer, Option, Stream } from "effect"
import { describe, expect, it } from "tstyche"

it("does not type a service removed with addOrOmit as present", () => {
  const Service = Context.Service<{ readonly value: number }>("TestService")
  const context = Context.make(Service, { value: 1 }).pipe(Context.addOrOmit(Service, Option.none()))
  const dataFirst = Context.addOrOmit(Context.make(Service, { value: 1 }), Service, Option.none())

  expect(Context.get).type.not.toBeCallableWith(context, Service)
  expect(Context.get).type.not.toBeCallableWith(dataFirst, Service)
})

it("infers services for a saved curried getter", () => {
  const Service = Context.Service<{ readonly value: number }>("TestService")
  const getService = Context.get(Service)

  expect(getService(Context.make(Service, { value: 1 }))).type.toBe<{ readonly value: number }>()
})

describe("overridable", () => {
  class Other extends Context.Service<Other, { readonly value: number }>()("Other") {}
  const greet = Context.overridable("test/greet", (name: string) => Effect.succeed(`hello ${name}`))

  it("preserves a generic function type", () => {
    const identity = Context.overridable("test/identity", <A>(a: A) => Effect.succeed(a))

    expect(identity(1)).type.toBe<Effect.Effect<number>>()
    expect(identity("a")).type.toBe<Effect.Effect<string>>()
  })

  it("preserves overloads", () => {
    function parse(input: string): Effect.Effect<number>
    function parse(input: number): Effect.Effect<string>
    function parse(input: string | number): Effect.Effect<number | string> {
      return Effect.succeed(typeof input === "string" ? Number(input) : String(input))
    }
    const overridable = Context.overridable("test/parse", parse)

    expect(overridable("1")).type.toBe<Effect.Effect<number>>()
    expect(overridable(1)).type.toBe<Effect.Effect<string>>()
  })

  it("exposes a reference whose value is the original function type, so an override cannot add requirements", () => {
    expect(greet.reference).type.toBe<Context.Reference<(name: string) => Effect.Effect<string>>>()
    expect(Layer.succeed(greet.reference, (name) => Effect.succeed(name))).type.toBe<Layer.Layer<never>>()
    expect(Layer.succeed).type.not.toBeCallableWith(
      greet.reference,
      (name: string) => Effect.map(Other, ({ value }) => `${name}${value}`)
    )
  })

  it("is a plain function rather than an effect", () => {
    expect(greet).type.not.toBeAssignableTo<Effect.Effect<any, any, any>>()
  })

  it("accepts only functions that return an Effect or a Stream", () => {
    expect(Context.overridable("test/stream", (n: number) => Stream.make(n))(1)).type.toBe<Stream.Stream<number>>()
    expect(Context.overridable).type.not.toBeCallableWith("test/plain", (n: number) => n)
    expect(Context.overridable).type.not.toBeCallableWith("test/effect", Effect.void)
  })
})
