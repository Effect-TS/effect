import type { Scope } from "effect"
import { Context, Effect, Layer, Option, Sink, Stream } from "effect"
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

// -----------------------------------------------------------------------------
// Operations: callable slots and record services
// -----------------------------------------------------------------------------

describe("Operation", () => {
  const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, Error>>()("TypeTest/FS/readFile")
  const writeFile = Context.Operation<(path: string, data: Uint8Array) => Effect.Effect<void, Error>>()(
    "TypeTest/FS/writeFile"
  )
  const scoped = Context.Operation<() => Effect.Effect<string, Error, Scope.Scope>>()("TypeTest/FS/scoped")
  const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, Error>>()("TypeTest/FS/stream")
  const collect = Sink.Operation<(label: string) => Sink.Sink<Array<string>, string>>()("TypeTest/FS/collect")
  const columns = Context.Operation.value<Effect.Effect<number>>()("TypeTest/Terminal/columns")
  const display = Context.Operation<(text: string) => Effect.Effect<void>>()("TypeTest/Terminal/display")
  const members = { readFile, writeFile, scoped, stream }
  type FS = Context.Operations.Identifier<typeof members>
  interface Shape extends Context.Operations.Shape<typeof members> {}
  const FS = Context.Operations<FS, Shape>()("TypeTest/FS", members)
  const readOnlyMembers = { readFile }
  type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
  const ReadOnly = Context.Operations<ReadOnly>()("TypeTest/FS/ReadOnly", readOnlyMembers)
  type ReadOnlyShape = Pick<Shape, "readFile">
  const ReadOnlyNamed = Context.Operations<ReadOnly, ReadOnlyShape>()("TypeTest/FS/ReadOnlyNamed", readOnlyMembers)
  const fsLayer = null as unknown as Layer.Layer<FS>
  const readFileLayer = null as unknown as Layer.Layer<"TypeTest/FS/readFile">
  const writeFileLayer = null as unknown as Layer.Layer<"TypeTest/FS/writeFile">
  const scopedLayer = null as unknown as Layer.Layer<"TypeTest/FS/scoped">
  const streamLayer = null as unknown as Layer.Layer<"TypeTest/FS/stream">

  it("has the shape's parameters and the shape's result with the key added to R", () => {
    expect(readFile("a")).type.toBe<Effect.Effect<Uint8Array, Error, "TypeTest/FS/readFile">>()
    expect(scoped()).type.toBe<Effect.Effect<string, Error, Scope.Scope | "TypeTest/FS/scoped">>()
    expect(stream("a")).type.toBe<Stream.Stream<Uint8Array, Error, "TypeTest/FS/stream">>()
    expect(collect("x")).type.toBe<Sink.Sink<Array<string>, string, never, never, "TypeTest/FS/collect">>()
  })

  it("is the Effect itself, with the key added to R, when the shape is an Effect", () => {
    expect(columns).type.toBeAssignableTo<Effect.Effect<number, never, "TypeTest/Terminal/columns">>()
    expect(columns).type.toBeAssignableTo<Context.Slot<"TypeTest/Terminal/columns", Effect.Effect<number>>>()
    expect(columns).type.not.toBeAssignableTo<Context.Key<any, any>>()
    expect(columns.key).type.toBe<"TypeTest/Terminal/columns">()
    expect(Effect.map(columns, (width) => width * 2)).type.toBe<
      Effect.Effect<number, never, "TypeTest/Terminal/columns">
    >()
    expect(Layer.succeed(columns, Effect.succeed(80))).type.toBe<Layer.Layer<"TypeTest/Terminal/columns">>()
    expect(Layer.succeed).type.not.toBeCallableWith(columns, () => Effect.succeed(80))
    expect(columns.pipe(Effect.provideService(columns, Effect.succeed(80)))).type.toBe<Effect.Effect<number>>()
    expect(Effect.service(columns)).type.toBe<
      Effect.Effect<Effect.Effect<number>, never, "TypeTest/Terminal/columns">
    >()
    // in a record the member is the Effect, as it is today
    const Terminal = Context.Operations("TypeTest/Terminal", { columns, display })
    expect<Context.Service.Shape<typeof Terminal>>().type.toBe<{
      readonly columns: Effect.Effect<number>
      readonly display: (text: string) => Effect.Effect<void>
    }>()
    expect<Context.Service.Identifier<typeof Terminal>>().type.toBe<
      "TypeTest/Terminal/columns" | "TypeTest/Terminal/display"
    >()
    // a shape that already requires the key is kept as is
    const named = Context.Operation.value<Effect.Effect<number, never, "TypeTest/named">>()("TypeTest/named")
    expect(named).type.toBeAssignableTo<Effect.Effect<number, never, "TypeTest/named">>()
  })

  it("is a slot and not a key: provided as itself, read as a value, never yielded", () => {
    expect(readFile).type.toBeAssignableTo<
      Context.Slot<"TypeTest/FS/readFile", (path: string) => Effect.Effect<Uint8Array, Error>>
    >()
    expect(readFile).type.not.toBeAssignableTo<Context.Key<any, any>>()
    expect(readFile).type.not.toBeAssignableTo<Effect.Effect<unknown, unknown, unknown>>()
    expect(readFile.key).type.toBe<"TypeTest/FS/readFile">()
    expect<Context.Service.Identifier<typeof readFile>>().type.toBe<"TypeTest/FS/readFile">()
    expect<Context.Service.Shape<typeof readFile>>().type.toBe<(path: string) => Effect.Effect<Uint8Array, Error>>()
    expect(Layer.succeed(readFile, () => Effect.succeed(new Uint8Array()))).type.toBe<
      Layer.Layer<"TypeTest/FS/readFile">
    >()
    expect(Effect.service(readFile)).type.toBe<
      Effect.Effect<(path: string) => Effect.Effect<Uint8Array, Error>, never, "TypeTest/FS/readFile">
    >()
    expect(readFile("a").pipe(Effect.provide(readFileLayer))).type.toBe<Effect.Effect<Uint8Array, Error>>()
    expect(readFile("a").pipe(Effect.provideService(readFile, () => Effect.succeed(new Uint8Array())))).type.toBe<
      Effect.Effect<Uint8Array, Error>
    >()
    expect(Effect.map).type.not.toBeCallableWith(readFile, (x: unknown) => x)
  })

  it("rejects a wrong override and a missing shape", () => {
    expect(Layer.succeed).type.not.toBeCallableWith(readFile, (_path: number) => Effect.succeed(new Uint8Array()))
    expect(Layer.succeed).type.not.toBeCallableWith(
      readFile,
      (_path: string) => Effect.succeed(new Uint8Array()) as Effect.Effect<Uint8Array, Error, "extra">
    )
    expect(Context.Operation).type.not.toBeCallableWith("TypeTest/noShape")
  })

  it("derives overloaded shapes, keeps generic ones that name their key, and rejects those that do not", () => {
    const parse = Context.Operation<
      <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "TypeTest/parse">
    >()("TypeTest/parse")
    expect(parse(Number, "42")).type.toBe<Effect.Effect<number, never, "TypeTest/parse">>()
    const format = Context.Operation<{
      (value: number): Effect.Effect<string, never, "TypeTest/format">
      (value: Date, locale: string): Effect.Effect<string, never, "TypeTest/format">
    }>()("TypeTest/format")
    expect(format(1)).type.toBe<Effect.Effect<string, never, "TypeTest/format">>()
    expect(format(new Date(), "en")).type.toBe<Effect.Effect<string, never, "TypeTest/format">>()
    // overloads are derived one by one (up to four), so they need not name the key
    const render = Context.Operation<{
      (value: number): Effect.Effect<string>
      (value: Date, locale: string): Effect.Effect<boolean, Error>
      (value: boolean): Effect.Effect<number>
    }>()("TypeTest/render")
    expect(render(1)).type.toBe<Effect.Effect<string, never, "TypeTest/render">>()
    expect(render(new Date(), "en")).type.toBe<Effect.Effect<boolean, Error, "TypeTest/render">>()
    expect(render(true)).type.toBe<Effect.Effect<number, never, "TypeTest/render">>()
    expect(render).type.not.toBeCallableWith("a")
    // a type parameter that appears only in the parameters is derived without loss
    const log = Context.Operation<<A>(value: A) => Effect.Effect<void>>()("TypeTest/log")
    expect(log(1)).type.toBe<Effect.Effect<void, never, "TypeTest/log">>()
    expect(Context.Operation<<A>(decode: (input: string) => A) => Effect.Effect<A>>()).type.not.toBeCallableWith(
      "TypeTest/unnamed"
    )
    // a generic overload is derived at its constraint: TypeScript relates overload sets with their type parameters
    // erased, so the definition cannot tell; such a shape names its key in its results to keep the type parameter
    const coerce = Context.Operation<{
      <A>(value: A): Effect.Effect<A>
      (value: Date, locale: string): Effect.Effect<string>
    }>()("TypeTest/coerce")
    expect(coerce(1)).type.toBe<Effect.Effect<unknown, never, "TypeTest/coerce">>()
    expect(Context.Operation<((value: number) => Effect.Effect<string>) & { readonly extra: number }>()).type.not
      .toBeCallableWith("TypeTest/properties")
    // a `this` parameter is rejected: an operation passes no receiver, so an implementation's `this` is the object
    // that provides it
    expect<Context.Operation.KeyFor<"k", (this: { name: string }, greeting: string) => Effect.Effect<string>>>()
      .type.toBe<"The shape declares this: an implementation's receiver is the object that provides it">()
    expect(Context.Operation<(this: { name: string }, greeting: string) => Effect.Effect<string>>()).type.not
      .toBeCallableWith("TypeTest/greet")
    expect(Stream.Operation<(this: { name: string }) => Stream.Stream<number>>()).type.not.toBeCallableWith("k")
    // an explicit `this: void` or `this: unknown` says the same as none
    expect<Context.Operation.KeyFor<"k", (this: unknown) => Effect.Effect<number>>>().type.toBe<"k">()
    expect<Context.Operation.KeyFor<"k", (this: void) => Effect.Effect<number>>>().type.toBe<"k">()
  })

  it("rejects a shape of another result kind on the key argument, naming the constructor to use", () => {
    expect<Context.Operation.KeyFor<"k", (path: string) => Stream.Stream<number>>>().type.toBe<
      "The shape returns a Stream: define it with Stream.Operation"
    >()
    expect<Context.Operation.KeyFor<"k", (path: string) => Sink.Sink<number, string>>>().type.toBe<
      "The shape returns a Sink: define it with Sink.Operation"
    >()
    expect<Context.Operation.KeyFor<"k", () => Effect.Effect<number>, "Stream">>().type.toBe<
      "The shape returns an Effect: define it with Context.Operation"
    >()
    expect<Context.Operation.KeyFor<"k", (path: string) => Stream.Stream<number>, "Stream">>().type.toBe<"k">()
    expect(Context.Operation<(path: string) => Stream.Stream<number>>()).type.not.toBeCallableWith("k")
    expect(Stream.Operation<() => Effect.Effect<number>>()).type.not.toBeCallableWith("k")
    expect(Sink.Operation<(path: string) => Stream.Stream<number>>()).type.not.toBeCallableWith("k")
  })

  describe("Operations", () => {
    it("has the union of its members' identifiers as identity and the record of their shapes as shape", () => {
      expect<FS>().type.toBe<
        "TypeTest/FS/readFile" | "TypeTest/FS/writeFile" | "TypeTest/FS/scoped" | "TypeTest/FS/stream"
      >()
      expect(FS).type.toBe<Context.Operations<FS, Shape> & typeof members>()
      // the members are properties of the key
      expect(FS.readFile).type.toBe<typeof readFile>()
      expect(FS.readFile("a")).type.toBe<Effect.Effect<Uint8Array, Error, "TypeTest/FS/readFile">>()
      expect(FS).type.toBeAssignableTo<Context.Key<FS, Shape>>()
      expect<Context.Service.Identifier<typeof FS>>().type.toBe<FS>()
      expect<Context.Service.Shape<typeof FS>>().type.toBe<Shape>()
      expect(FS.members.readFile).type.toBeAssignableTo<Context.Slot<any, Shape["readFile"]>>()
      // the inferred and the two-declaration forms
      const Inferred = Context.Operations("TypeTest/Inferred", { readFile, writeFile })
      expect<Context.Service.Identifier<typeof Inferred>>().type.toBe<
        "TypeTest/FS/readFile" | "TypeTest/FS/writeFile"
      >()
      // the one-line form carries its key, which it prints first: `Of<"TypeTest/Inferred", { … }>`
      expect(Inferred).type.toBe<
        Context.Operations.Of<
          "TypeTest/Inferred",
          { readonly readFile: typeof readFile; readonly writeFile: typeof writeFile }
        >
      >()
      expect(Inferred.key).type.toBe<"TypeTest/Inferred">()
      expect(ReadOnly).type.toBe<
        Context.Operations<ReadOnly, Context.Operations.Shape<typeof readOnlyMembers>> & typeof readOnlyMembers
      >()
    })

    it("is satisfied by the merge of every member layer and satisfies each member", () => {
      const program = Effect.gen(function*() {
        const bytes = yield* readFile("a")
        yield* writeFile("b", bytes)
        return bytes.length
      })
      expect(program).type.toBe<Effect.Effect<number, Error, "TypeTest/FS/readFile" | "TypeTest/FS/writeFile">>()
      expect(program).type.toBeAssignableTo<Effect.Effect<number, Error, FS>>()
      expect(program.pipe(Effect.provide(fsLayer))).type.toBe<Effect.Effect<number, Error>>()
      expect(FS.pipe(Effect.provide(fsLayer))).type.toBe<Effect.Effect<Shape, never>>()
      expect(Layer.mergeAll(readFileLayer, writeFileLayer, scopedLayer, streamLayer)).type.toBeAssignableTo<
        Layer.Layer<FS>
      >()
      expect(Layer.mergeAll(readFileLayer, writeFileLayer)).type.not.toBeAssignableTo<Layer.Layer<FS>>()
      expect(readFileLayer).type.not.toBeAssignableTo<Layer.Layer<FS>>()
      expect(fsLayer).type.toBeAssignableTo<Layer.Layer<"TypeTest/FS/readFile">>()
      expect(Layer.succeed).type.not.toBeCallableWith(FS, { readFile: () => Effect.succeed(new Uint8Array()) })
      expect(Layer.mock(FS, { readFile: () => Effect.succeed(new Uint8Array()) })).type.toBe<Layer.Layer<FS>>()
    })

    it("rejects an identifier lacking a member, a wrong shape and a missing identifier on the key argument", () => {
      expect(Context.Operations<"TypeTest/FS/readFile", Shape>()).type.not.toBeCallableWith("TypeTest/Partial", members)
      expect(
        Context.Operations<
          FS,
          { readonly readFile: Shape["readFile"]; readonly writeFile: () => Effect.Effect<void> }
        >()
      ).type.not.toBeCallableWith("TypeTest/WrongShape", { readFile, writeFile })
      expect(Context.Operations()).type.not.toBeCallableWith("TypeTest/Unknown", members)
      // a member whose name is a property of every key is rejected on the key argument, in both forms
      const use = Context.Operation<() => Effect.Effect<void>>()("TypeTest/Bad/use")
      expect(Context.Operations).type.not.toBeCallableWith("TypeTest/Bad", { use })
      expect(Context.Operations<"TypeTest/Bad/use">()).type.not.toBeCallableWith("TypeTest/Bad", { use })
      expect<Context.Operations.Key<{ use: typeof use }>>().type.toBe<
        "Member \"use\" has the name of a property of the key: rename it"
      >()
      expect<Context.Operations.KeyFor<FS, { readonly readFile: Shape["readFile"] }, typeof members>>().type.toBe<
        "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"
      >()
      expect<Context.Operations.KeyFor<"TypeTest/FS/readFile", Shape, typeof members>>().type.toBe<
        | `Self lacks the identifier of "TypeTest/FS/writeFile"`
        | `Self lacks the identifier of "TypeTest/FS/scoped"`
        | `Self lacks the identifier of "TypeTest/FS/stream"`
      >()
      // a declared identifier wider than the union is accepted
      interface Legacy {
        readonly _: unique symbol
      }
      const Legacy = Context.Operations<Legacy | ReadOnly, Context.Operations.Shape<typeof readOnlyMembers>>()(
        "TypeTest/Legacy",
        readOnlyMembers
      )
      const legacyLayer = null as unknown as Layer.Layer<Legacy | ReadOnly>
      expect(Legacy).type.toBe<
        Context.Operations<Legacy | ReadOnly, Context.Operations.Shape<typeof readOnlyMembers>> & typeof readOnlyMembers
      >()
      expect(readFile("a").pipe(Effect.provide(legacyLayer))).type.toBe<Effect.Effect<Uint8Array, Error>>()
      expect(readFileLayer).type.not.toBeAssignableTo<Layer.Layer<Legacy | ReadOnly>>()
    })

    it("takes a Pick of the shape as a subset record's shape, keeping the alias in the type", () => {
      expect(ReadOnlyNamed).type.toBe<Context.Operations<ReadOnly, ReadOnlyShape> & typeof readOnlyMembers>()
      expect(ReadOnlyNamed).type.toBeAssignableTo<Effect.Effect<ReadOnlyShape, never, ReadOnly>>()
      expect(Layer.succeed(ReadOnlyNamed, { readFile: (_: string) => Effect.succeed(new Uint8Array()) })).type.toBe<
        Layer.Layer<ReadOnly>
      >()
      expect(Layer.succeed(ReadOnlyNamed)).type.not.toBeCallableWith({})
    })

    it("treats a subset record as a record like any other", () => {
      expect(fsLayer).type.toBeAssignableTo<Layer.Layer<ReadOnly>>()
      expect(readFileLayer).type.toBeAssignableTo<Layer.Layer<ReadOnly>>()
      const readOnlyLayer = null as unknown as Layer.Layer<ReadOnly>
      expect(readFile("a").pipe(Effect.provide(readOnlyLayer))).type.toBe<Effect.Effect<Uint8Array, Error>>()
      expect(readOnlyLayer).type.not.toBeAssignableTo<Layer.Layer<FS>>()
      expect(ReadOnly.pipe(Effect.provide(readOnlyLayer))).type.toBe<
        Effect.Effect<Context.Operations.Shape<typeof readOnlyMembers>, never>
      >()
      // a nested record's identity is the union of its members' identities
      const Platform = Context.Operations("TypeTest/Platform", { fs: ReadOnly, columns })
      expect<Context.Service.Identifier<typeof Platform>>().type.toBe<ReadOnly | "TypeTest/Terminal/columns">()
    })
  })
})
