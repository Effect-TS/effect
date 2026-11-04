import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import { assert, describe, it } from "vitest"
import * as FileSystem from "../src/FileSystem.ts"
import * as NodeFileSystem from "../src/node/index.ts"
import { layer as nodeLayer } from "../src/node/layer.ts"
import { backupViaRecord } from "../src/program-record.ts"
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

/** A whole-record implementation: every member dies unless overridden, the way a record fake is written today. */
const record = (members: Partial<FileSystem.Shape>): FileSystem.Shape => {
  const all: Record<string, unknown> = {}
  for (const name of Object.keys(FileSystem.FileSystem.operations)) {
    all[name] = () => Effect.die(`record: ${name} not implemented`)
  }
  return { ...all, ...members } as FileSystem.Shape
}

describe("Operation", () => {
  it("is a function with its key as its name, and neither an Effect nor a key", () => {
    assert.strictEqual(typeof FileSystem.readFile, "function")
    assert.strictEqual(FileSystem.readFile.name, "effect/FileSystem/readFile")
    assert.isTrue(Context.isOperation(FileSystem.readFile))
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

  it("returns a Stream for a Stream operation, looked up per run, and overrides it the same way", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))
    const chunks = await Effect.runPromise(Stream.runCollect(FileSystem.stream("a.txt")).pipe(Effect.provide(fs.layer)))
    assert.deepStrictEqual(chunks, [bytes("hello")])

    const call = FileSystem.stream("a.txt").pipe(Stream.map((chunk) => chunk.length))
    const overridden = await Effect.runPromise(
      Stream.runCollect(call).pipe(
        Effect.provideService(FileSystem.stream.service, () => Stream.make(bytes("a"), bytes("bc")))
      )
    )
    assert.deepStrictEqual(overridden, [1, 2])
    // The same Stream value, run under the memory layer, runs the memory implementation.
    assert.deepStrictEqual(await Effect.runPromise(Stream.runCollect(call).pipe(Effect.provide(fs.layer))), [5])
  })

  it("returns exactly one kind of value: an Effect operation returns an Effect, a Stream operation a Stream", () => {
    const effectCall = FileSystem.readFile("a.txt")
    const streamCall = FileSystem.stream("a.txt")
    assert.isTrue(Effect.isEffect(effectCall))
    assert.isFalse(Stream.isStream(effectCall))
    assert.isTrue(Stream.isStream(streamCall))
    assert.isFalse(Effect.isEffect(streamCall))
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
    const op = Context.Operation<(this: { prefix: string }, name: string) => Effect.Effect<string>>()("test/greet")
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

  it("keeps a generic signature when the shape names its key", async () => {
    const parse = Context.Operation<
      <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "test/parse">
    >()("test/parse")
    const result: number = await Effect.runPromise(
      parse(Number, "42").pipe(Effect.provideService(parse.service, (decode, input) => Effect.succeed(decode(input))))
    )
    assert.strictEqual(result, 42)
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

describe("Operations", () => {
  it("is a key whose members are the operations", () => {
    assert.isTrue(Context.isKey(FileSystem.FileSystem))
    assert.isTrue(Context.isOperations(FileSystem.FileSystem))
    assert.isFalse(Context.isReference(FileSystem.FileSystem))
    assert.strictEqual(FileSystem.FileSystem.key, "effect/FileSystem")
    assert.strictEqual(FileSystem.FileSystem.operations.readFile, FileSystem.readFile)
    assert.strictEqual(Object.keys(FileSystem.FileSystem.operations).length, 30)
  })

  it("provides every operation when provided as a record, through Layer.succeed", async () => {
    const files = new Map<string, Uint8Array>([["a.txt", bytes("record")]])
    const live = Layer.succeed(
      FileSystem.FileSystem,
      record({
        readFile: (path) => Effect.succeed(files.get(path)!),
        writeFile: (path, data) =>
          Effect.sync(() => {
            files.set(path, data)
          })
      })
    )
    // The per-operation program runs under the record layer...
    assert.strictEqual(await Effect.runPromise(backup("a.txt").pipe(Effect.provide(live))), 6)
    assert.deepStrictEqual(files.get("a.txt.bak"), bytes("record"))
    // ...and so does the program that yields the record.
    assert.strictEqual(await Effect.runPromise(backupViaRecord("a.txt").pipe(Effect.provide(live))), 6)
  })

  it("assembles the record from operation layers, so yield* works under per-operation providers", async () => {
    const path = await Effect.runPromise(
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const file = yield* fs.makeTempFile()
        yield* fs.writeFileString(file, "assembled")
        yield* backupViaRecord(file)
        return file
      }).pipe(Effect.provide(nodeLayer))
    )
    const copy = await Effect.runPromise(
      FileSystem.readFileString(`${path}.bak`).pipe(Effect.provide(NodeFileSystem.readFileString))
    )
    assert.strictEqual(copy, "assembled")
  })

  it("dies naming the missing member when the record is read with a member unprovided", async () => {
    const twentyNine = Object.entries(NodeFileSystem)
      .filter(([name]) => name !== "stat")
      .reduce((layer, [, next]) => Layer.merge(layer, next as Layer.Layer<never>), Layer.empty)
    // The types reject this; the cast shows what the runtime does if they are bypassed.
    const exit = await Effect.runPromiseExit(
      FileSystem.FileSystem.pipe(Effect.provide(twentyNine)) as unknown as Effect.Effect<FileSystem.Shape>
    )
    assert.isTrue(exit._tag === "Failure")
    assert.match(String(exit), /Service not found: effect\/FileSystem\/stat/)
  })

  it("lets a single operation be overridden on top of a record, and the record view sees the override", async () => {
    const live = Layer.succeed(
      FileSystem.FileSystem,
      record({
        readFile: () => Effect.succeed(bytes("live")),
        writeFile: () => Effect.void
      })
    )
    const fake = () => Effect.succeed(bytes("fake"))
    const direct = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(Effect.provideService(FileSystem.readFile.service, fake), Effect.provide(live))
    )
    assert.deepStrictEqual(direct, bytes("fake"))
    const viaRecord = await Effect.runPromise(
      Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFile("a.txt")).pipe(
        Effect.provideService(FileSystem.readFile.service, fake),
        Effect.provide(live)
      )
    )
    assert.deepStrictEqual(viaRecord, bytes("fake"))
    // Ordinary precedence: with the record provided closer to the program, the record's member wins.
    const inner = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(Effect.provide(live), Effect.provideService(FileSystem.readFile.service, fake))
    )
    assert.deepStrictEqual(inner, bytes("live"))
  })

  it("supports Layer.mock for a partial record: provided members run, the rest die as unimplemented", async () => {
    const mocked = Layer.mock(FileSystem.FileSystem, { readFile: () => Effect.succeed(bytes("mock")) })
    assert.deepStrictEqual(
      await Effect.runPromise(FileSystem.readFile("a.txt").pipe(Effect.provide(mocked))),
      bytes("mock")
    )
    const exit = await Effect.runPromiseExit(FileSystem.stat("a.txt").pipe(Effect.provide(mocked)))
    assert.isTrue(exit._tag === "Failure")
    assert.match(String(exit), /Unimplemented method "stat"/)
  })

  it("works with Effect.provideService, Effect.updateService and Context directly", async () => {
    const live = record({ readFile: () => Effect.succeed(bytes("one")), writeFile: () => Effect.void })
    const direct = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(Effect.provideService(FileSystem.FileSystem, live))
    )
    assert.deepStrictEqual(direct, bytes("one"))
    const updated = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(
        Effect.updateService(FileSystem.FileSystem, (fs) => ({ ...fs, readFile: () => Effect.succeed(bytes("two")) })),
        Effect.provideService(FileSystem.FileSystem, live)
      )
    )
    assert.deepStrictEqual(updated, bytes("two"))

    const context = Context.make(FileSystem.FileSystem, live)
    assert.strictEqual(context.mapUnsafe.size, 30)
    assert.strictEqual(Context.get(context, FileSystem.readFile.service), live.readFile)
    assert.strictEqual(Context.get(context, FileSystem.FileSystem).readFile, live.readFile)
    assert.isTrue(Option.isSome(Context.getOption(context, FileSystem.FileSystem)))

    const one = Context.make(FileSystem.readFile.service, live.readFile)
    assert.isTrue(Option.isNone(Context.getOption(one, FileSystem.FileSystem)))
    assert.throws(() => Context.get(one, FileSystem.FileSystem as any), /Service not found: effect\/FileSystem\/access/)

    assert.strictEqual(Context.pick(FileSystem.FileSystem)(context).mapUnsafe.size, 30)
    assert.strictEqual(Context.omit(FileSystem.FileSystem)(context).mapUnsafe.size, 0)
    assert.strictEqual(Context.omit(FileSystem.readFile.service)(context).mapUnsafe.size, 29)
    assert.strictEqual(Context.pick(FileSystem.readFile.service, FileSystem.stat.service)(context).mapUnsafe.size, 2)
  })

  it("stores a record under its members' keys and never under its own", () => {
    const live = record({})
    const context = Context.add(Context.empty(), FileSystem.FileSystem, live)
    assert.strictEqual(context.mapUnsafe.size, 30)
    assert.isTrue(context.mapUnsafe.has("effect/FileSystem/readFile"))
    assert.isFalse(context.mapUnsafe.has("effect/FileSystem"))
  })
})
