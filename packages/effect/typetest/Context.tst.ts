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

  expect(identity).type.toBe<Context.Overridable<Identity>>()
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

  expect(Layer.succeed(greet.reference, (name) => Effect.succeed(name))).type.toBe<Layer.Layer<never>>()
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

  expect(loadConfig).type.toBe<Context.Overridable<Effect.Effect<number>>>()
  expect(loadConfig.reference).type.toBe<Context.Reference<Effect.Effect<number>>>()
  expect(Effect.succeed("a").pipe(Effect.andThen(loadConfig))).type.toBe<Effect.Effect<number>>()
})

it("types a Stream value as the Stream plus its reference", () => {
  const events = Context.overridable("Test/events", Stream.fromIterable([1, 2]))

  expect(events).type.toBe<Context.Overridable<Stream.Stream<number>>>()
  expect(events.reference).type.toBe<Context.Reference<Stream.Stream<number>>>()
})

it("accepts a Stream-returning function and rejects values that are neither an Effect nor a Stream", () => {
  expect(Context.overridable("Test/range", (n: number) => Stream.make(n))(1)).type.toBe<Stream.Stream<number>>()
  expect(Context.overridable).type.not.toBeCallableWith("Test/number", 42)
  expect(Context.overridable).type.not.toBeCallableWith("Test/fn", () => 42)
})

it("displays the wrapper as Overridable<...> rather than an intersection", () => {
  const loadConfig = Context.overridable("Test/loadConfig", Effect.succeed({ port: 8080 }))
  // @ts-expect-error Type 'Overridable<Effect<{ port: number; }, never, never>>' is not assignable to type 'never'
  const effect: never = loadConfig

  const events = Context.overridable("Test/events", Stream.fromIterable([1, 2]))
  // @ts-expect-error Type 'Overridable<Stream<number, never, never>>' is not assignable to type 'never'
  const stream: never = events

  const identity = Context.overridable("Test/identity", <A>(a: A) => Effect.succeed(a))
  // @ts-expect-error Type 'Overridable<(<A>(a: A) => Effect<A, never, never>)>' is not assignable to type 'never'
  const fn: never = identity

  void effect
  void stream
  void fn
})
