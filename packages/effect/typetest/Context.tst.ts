import { Context, Effect, Layer, Option, Stream } from "effect"
import { expect, it } from "tstyche"

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

it("preserves a generic function type through overridable", () => {
  type Identity = <A>(a: A) => Effect.Effect<A>
  const identity = Context.overridable("Test/identity", ((a) => Effect.succeed(a)) as Identity)

  expect(identity(1)).type.toBe<Effect.Effect<number>>()
  expect(identity.reference).type.toBe<Context.Reference<Identity>>()
})

it("preserves an overloaded function type through overridable", () => {
  function parse(input: string): Effect.Effect<string>
  function parse(input: number): Effect.Effect<number>
  function parse(input: string | number): Effect.Effect<string | number> {
    return Effect.succeed(input)
  }
  const wrapped = Context.overridable("Test/parse", parse)

  expect(wrapped("a")).type.toBe<Effect.Effect<string>>()
  expect(wrapped(1)).type.toBe<Effect.Effect<number>>()
})

it("types an override as the original function", () => {
  const Dep = Context.Service<number>("Test/Dep")
  const greet = Context.overridable("Test/greet", (name: string) => Effect.succeed(name))

  expect(Layer.succeed).type.toBeCallableWith(greet.reference, (name: string) => Effect.succeed(name))
  expect(Layer.succeed).type.not.toBeCallableWith(greet.reference, (name: number) => Effect.succeed(name))
  expect(Layer.succeed).type.not.toBeCallableWith(
    greet.reference,
    (name: string) => Effect.map(Dep, (n) => `${name}${n}`)
  )
})

it("does not type a function wrapper as an Effect", () => {
  const greet = Context.overridable("Test/greet", (name: string) => Effect.succeed(name))

  expect(greet).type.not.toBeAssignableTo<Effect.Effect<unknown, unknown, unknown>>()
})

it("types an Effect value as the Effect plus its reference", () => {
  const loadConfig = Context.overridable("Test/loadConfig", Effect.succeed(1))

  expect(loadConfig).type.toBeAssignableTo<Effect.Effect<number>>()
  expect(loadConfig.reference).type.toBe<Context.Reference<Effect.Effect<number>>>()
})

it("types a Stream value as the Stream plus its reference", () => {
  const events = Context.overridable("Test/events", Stream.fromIterable([1, 2]))

  expect(events).type.toBeAssignableTo<Stream.Stream<number>>()
  expect(events.reference).type.toBe<Context.Reference<Stream.Stream<number>>>()
})

it("rejects values that are neither an Effect nor a Stream", () => {
  expect(Context.overridable).type.not.toBeCallableWith("Test/number", 42)
  expect(Context.overridable).type.not.toBeCallableWith("Test/fn", () => 42)
})
