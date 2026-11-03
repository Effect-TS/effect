import { Context, Effect, Layer, Option } from "effect"
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

interface FileSystemShape {
  readonly readFile: (path: string) => Effect.Effect<string>
  readonly writeFile: (path: string, data: string) => Effect.Effect<void>
  readonly stat: (path: string) => Effect.Effect<number>
  readonly copy: (from: string, to: string) => Effect.Effect<void>
}
class FileSystem extends Context.Service<FileSystem, FileSystemShape>()("FileSystem") {}
class Other extends Context.Service<Other, { readonly value: number }>()("Other") {}

type ReadFile = Context.Only<FileSystem, "readFile">
type WriteFile = Context.Only<FileSystem, "writeFile">

declare const full: Layer.Layer<FileSystem>
declare const writeFile: Layer.Layer<WriteFile>
declare const needsSlices: Effect.Effect<void, never, ReadFile | WriteFile | Other>
declare const needsFull: Effect.Effect<void, never, FileSystem | Other>
declare const fullContext: Context.Context<FileSystem>
declare const sliceContext: Context.Context<WriteFile>

describe("Only", () => {
  it("providing the full service removes every slice requirement", () => {
    expect(needsSlices.pipe(Effect.provide(full))).type.toBe<Effect.Effect<void, never, Other>>()
  })

  it("a slice layer removes only its own slice", () => {
    expect(needsSlices.pipe(Effect.provide(writeFile))).type.toBe<Effect.Effect<void, never, ReadFile | Other>>()
    expect(Effect.provideService(needsSlices, FileSystem.only("writeFile"), () => Effect.void)).type.toBe<
      Effect.Effect<void, never, ReadFile | Other>
    >()
  })

  it("a slice layer does not satisfy a requirement for the whole service", () => {
    expect(needsFull.pipe(Effect.provide(writeFile))).type.toBe<Effect.Effect<void, never, FileSystem | Other>>()
  })

  it("a full layer is assignable to a slice layer, but not the reverse", () => {
    expect(full).type.toBeAssignableTo<Layer.Layer<WriteFile>>()
    expect(writeFile).type.not.toBeAssignableTo<Layer.Layer<FileSystem>>()
  })

  it("an effect requiring a slice is assignable to one requiring the full service, but not the reverse", () => {
    expect(needsSlices).type.toBeAssignableTo<Effect.Effect<void, never, FileSystem | Other>>()
    expect(needsFull).type.not.toBeAssignableTo<Effect.Effect<void, never, WriteFile | Other>>()
  })

  it("a full context satisfies a slice context, but the whole service cannot be read from a slice-only context", () => {
    expect(fullContext).type.toBeAssignableTo<Context.Context<WriteFile>>()
    expect(Context.get).type.not.toBeCallableWith(sliceContext, FileSystem)
  })

  it("displays a missing slice by name", () => {
    const program = Effect.flatMap(FileSystem.only("readFile"), (readFile) => readFile("a.txt"))

    // @ts-expect-error Only<FileSystem, "readFile">
    const displayed: never = program.pipe(Effect.provide(writeFile))

    void displayed
  })

  it("rejects symbol members, whose slice keys would collide", () => {
    const member = Symbol("readFile")
    class Symbolic extends Context.Service<Symbolic, { readonly [member]: () => Effect.Effect<void> }>()("Symbolic") {}

    expect(Symbolic.only).type.not.toBeCallableWith(member)
  })

  it("distributes over a union of member names", () => {
    expect<Context.Only<FileSystem, "readFile" | "writeFile">>().type.toBe<ReadFile | WriteFile>()
  })

  it("the accessor returns a single-member key that the existing key-based APIs accept", () => {
    expect(FileSystem.only("readFile")).type.toBe<Context.Key<ReadFile, FileSystemShape["readFile"]>>()
    expect(FileSystem.only).type.not.toBeCallableWith("readFile", "writeFile")
    expect(Layer.succeed(FileSystem.only("writeFile"), (_path, _data) => Effect.void)).type.toBe<
      Layer.Layer<WriteFile>
    >()
    expect(
      Layer.effect(
        FileSystem.only("copy"),
        Effect.map(FileSystem.only("stat"), (stat) => (from, _to) => Effect.asVoid(stat(from)))
      )
    ).type.toBe<Layer.Layer<Context.Only<FileSystem, "copy">, never, Context.Only<FileSystem, "stat">>>()
  })
})
