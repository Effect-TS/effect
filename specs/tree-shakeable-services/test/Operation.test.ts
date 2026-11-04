import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import { assert, describe, it } from "vitest"
import * as FileSystem from "../src/FileSystem.ts"
import * as NodeFileSystem from "../src/node/index.ts"
import { isOperation, Operation } from "../src/Operation.ts"
import { backup } from "../src/program.ts"

const bytes = (text: string) => new TextEncoder().encode(text)

/** An in-memory file system: a map, and one layer per operation over it. */
const memory = () => {
  const files = new Map<string, Uint8Array>()
  const readFile = Layer.succeed(FileSystem.readFile.service, (path) =>
    files.has(path)
      ? Effect.succeed(files.get(path)!)
      : Effect.fail(new FileSystem.FileSystemError({ operation: "memory/readFile", cause: "ENOENT" })))
  const writeFile = Layer.succeed(FileSystem.writeFile.service, (path, data) =>
    Effect.sync(() => {
      files.set(path, data)
    }))
  const stream = Layer.succeed(
    FileSystem.stream.service,
    (path) =>
      files.has(path)
        ? Stream.make(files.get(path)!)
        : Stream.fail(new FileSystem.FileSystemError({ operation: "memory/stream", cause: "ENOENT" }))
  )
  return { files, readFile, writeFile, stream, layer: Layer.mergeAll(readFile, writeFile, stream) }
}

describe("Operation", () => {
  it("is a function with its key as its name, and neither an Effect nor a key", () => {
    assert.strictEqual(typeof FileSystem.readFile, "function")
    assert.strictEqual(FileSystem.readFile.name, "effect/FileSystem/readFile")
    assert.isTrue(isOperation(FileSystem.readFile))
    assert.isFalse(Effect.isEffect(FileSystem.readFile))
    assert.isFalse(Context.isKey(FileSystem.readFile))
    assert.isTrue(Context.isKey(FileSystem.readFile.service))
    assert.strictEqual(FileSystem.readFile.service.key, "effect/FileSystem/readFile")
  })

  it("runs the implementation provided for its service", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))
    const size = await Effect.runPromise(backup("a.txt").pipe(Effect.provide(fs.layer)))
    assert.strictEqual(size, 5)
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("hello"))
  })

  it("fails with a defect naming the key when the implementation is missing at run time", async () => {
    // The types reject this; the cast shows what the runtime does if they are bypassed.
    const exit = await Effect.runPromiseExit(FileSystem.stat("a.txt") as Effect.Effect<FileSystem.Info, never, never>)
    assert.isTrue(exit._tag === "Failure")
    assert.match(String(exit), /Service not found: effect\/FileSystem\/stat/)
  })

  it("overrides a single operation in a test, with the innermost provider winning", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))
    const seen: Array<string> = []
    const fakeRead = Layer.succeed(FileSystem.readFile.service, (path) =>
      Effect.sync(() => {
        seen.push(path)
        return bytes("faked")
      }))

    // The override sits closer to the program than the full layer, so it wins.
    const overridden = await Effect.runPromise(
      backup("a.txt").pipe(Effect.provide(fakeRead), Effect.provide(fs.layer))
    )
    assert.strictEqual(overridden, 5)
    assert.deepStrictEqual(seen, ["a.txt"])
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("faked"))

    // The same override through Effect.provideService, no layer needed.
    await Effect.runPromise(
      backup("a.txt").pipe(
        Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes("service"))),
        Effect.provide(fs.layer)
      )
    )
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("service"))

    // Layer.provide composes the same way: the override is merged on top of the full layer.
    await Effect.runPromise(
      backup("a.txt").pipe(Effect.provide(Layer.provideMerge(fakeRead, fs.layer)))
    )
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("faked"))
  })

  it("looks the implementation up each time the result runs, not when the operation is called", async () => {
    const read = FileSystem.readFile("a.txt")
    const first = read.pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes("first"))))
    const second = read.pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes("second"))))
    assert.deepStrictEqual(await Effect.runPromise(first), bytes("first"))
    assert.deepStrictEqual(await Effect.runPromise(second), bytes("second"))
    assert.deepStrictEqual(await Effect.runPromise(first), bytes("first"))
  })

  it("returns a Stream for a Stream-returning operation, and overrides it the same way", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))
    const chunks = await Effect.runPromise(Stream.runCollect(FileSystem.stream("a.txt")).pipe(Effect.provide(fs.layer)))
    assert.deepStrictEqual(chunks, [bytes("hello")])

    const overridden = await Effect.runPromise(
      Stream.runCollect(FileSystem.stream("a.txt").pipe(Stream.map((chunk) => chunk.length))).pipe(
        Effect.provideService(FileSystem.stream.service, () => Stream.make(bytes("a"), bytes("bc")))
      )
    )
    assert.deepStrictEqual(overridden, [1, 2])
  })

  it("returns a value that is both an Effect and a Stream at run time; the static type says which it is", () => {
    const effectCall = FileSystem.readFile("a.txt")
    const streamCall = FileSystem.stream("a.txt")
    assert.isTrue(Effect.isEffect(effectCall))
    assert.isTrue(Stream.isStream(effectCall))
    assert.isTrue(Effect.isEffect(streamCall))
    assert.isTrue(Stream.isStream(streamCall))
  })

  it("is called by Effect.andThen and Effect.tap, since it is not an Effect", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))
    const viaAndThen = await Effect.runPromise(
      Effect.succeed("a.txt").pipe(Effect.andThen(FileSystem.readFile), Effect.provide(fs.layer))
    )
    assert.deepStrictEqual(viaAndThen, bytes("hello"))
    const viaTap = await Effect.runPromise(
      Effect.succeed("a.txt").pipe(Effect.tap(FileSystem.readFile), Effect.provide(fs.layer))
    )
    assert.strictEqual(viaTap, "a.txt")
    const viaFlatMap = await Effect.runPromise(
      Effect.succeed("a.txt").pipe(Effect.flatMap(FileSystem.readFile), Effect.provide(fs.layer))
    )
    assert.deepStrictEqual(viaFlatMap, bytes("hello"))
  })

  it("forwards the call receiver to the implementation", async () => {
    const op = Operation<(this: { prefix: string }, name: string) => Effect.Effect<string>>()("test/greet")
    const holder = { prefix: "hi ", greet: op }
    const result = await Effect.runPromise(
      holder.greet("x").pipe(
        Effect.provideService(op.service, function(this: { prefix: string }, name) {
          return Effect.succeed(this.prefix + name)
        })
      )
    )
    assert.strictEqual(result, "hi x")
  })

  it("does not expose the implementation's own properties; the implementation is reached through the service", async () => {
    const op = Operation<{ (n: number): Effect.Effect<number>; readonly label: string }>()("test/double")
    const implementation = Object.assign((n: number) => Effect.succeed(n * 2), { label: "double" })
    const label = await Effect.runPromise(
      Effect.map(op.service, (current) => current.label).pipe(Effect.provideService(op.service, implementation))
    )
    assert.strictEqual(label, "double")
    assert.isFalse("label" in op)
  })

  it("keeps a generic signature when the shape names its key", async () => {
    const parse = Operation<
      <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "test/parse">
    >()(
      "test/parse"
    )
    const result: number = await Effect.runPromise(
      parse(Number, "42").pipe(Effect.provideService(parse.service, (decode, input) => Effect.succeed(decode(input))))
    )
    assert.strictEqual(result, 42)
  })

  it("builds a record service from operations, and operations from a record service", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))

    // Record from operations: every operation is required, so the record form costs all of them.
    interface Fs {
      readonly readFile: (path: string) => Effect.Effect<Uint8Array, FileSystem.FileSystemError>
      readonly writeFile: (path: string, data: Uint8Array) => Effect.Effect<void, FileSystem.FileSystemError>
    }
    const Fs = Context.Service<Fs>("test/Fs")
    const fsFromOperations = Layer.effect(
      Fs,
      Effect.all({ readFile: FileSystem.readFile.service, writeFile: FileSystem.writeFile.service })
    )
    const viaRecord = await Effect.runPromise(
      Fs.use((record) => record.readFile("a.txt")).pipe(Effect.provide(fsFromOperations.pipe(Layer.provide(fs.layer))))
    )
    assert.deepStrictEqual(viaRecord, bytes("hello"))

    // Operations from a record: project one member; the record's implementation is bundled, which is the migration case.
    const readFileFromRecord = Layer.effect(FileSystem.readFile.service, Effect.map(Fs, (record) => record.readFile))
    const viaOperation = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(
        Effect.provide(readFileFromRecord),
        Effect.provide(Layer.succeed(Fs, {
          readFile: (path) => Effect.succeed(bytes(`record:${path}`)),
          writeFile: () => Effect.void
        }))
      )
    )
    assert.deepStrictEqual(viaOperation, bytes("record:a.txt"))
  })

  it("accepts an Effect.fn as an implementation", async () => {
    const implementation = Effect.fn("readFile")(function*(path: string) {
      return bytes(`fn:${path}`)
    })
    const result = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(Effect.provide(Layer.succeed(FileSystem.readFile.service, implementation)))
    )
    assert.deepStrictEqual(result, bytes("fn:a.txt"))
  })

  it("runs against the Node implementation", async () => {
    const path = await Effect.runPromise(
      Effect.gen(function*() {
        const file = yield* FileSystem.makeTempFile()
        yield* FileSystem.writeFileString(file, "node")
        yield* backup(file)
        return file
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            NodeFileSystem.makeTempFile,
            NodeFileSystem.writeFileString,
            NodeFileSystem.readFile,
            NodeFileSystem.writeFile
          )
        )
      )
    )
    const copy = await Effect.runPromise(
      FileSystem.readFileString(`${path}.bak`).pipe(Effect.provide(NodeFileSystem.readFileString))
    )
    assert.strictEqual(copy, "node")
  })
})
