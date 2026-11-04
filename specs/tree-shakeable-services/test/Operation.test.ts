import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe, it } from "vitest"
import * as FileSystem from "../src/FileSystem.ts"
import * as NodeFileSystem from "../src/node/index.ts"
import { layer as nodeLayer } from "../src/node/layer.ts"
import { layer as nodeTerminal } from "../src/node/terminal/layer.ts"
import { sizeOf } from "../src/program-readonly.ts"
import { backupViaRecord } from "../src/program-record.ts"
import { banner } from "../src/program-terminal.ts"
import { backup } from "../src/program.ts"
import * as Terminal from "../src/Terminal.ts"

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
  for (const name of Object.keys(FileSystem.FileSystem.members)) {
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
    assert.strictEqual(FileSystem.FileSystem.members.readFile, FileSystem.readFile)
    assert.strictEqual(Object.keys(FileSystem.FileSystem.members).length, 30)
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

describe("value-shaped operations", () => {
  const fake = (columns: number, lines: Array<string>) =>
    Layer.mergeAll(
      Layer.succeed(Terminal.columns.service, Effect.succeed(columns)),
      Layer.succeed(Terminal.display.service, (text) =>
        Effect.sync(() => {
          lines.push(text)
        }))
    )

  it("is called with no arguments and runs the Effect provided as its implementation", async () => {
    const lines: Array<string> = []
    const width = await Effect.runPromise(banner("hi").pipe(Effect.provide(fake(12, lines))))
    assert.strictEqual(width, 12)
    assert.deepStrictEqual(lines, ["======\n  hi\n======\n"])
  })

  it("is a function and not an Effect, like every operation", () => {
    assert.strictEqual(typeof Terminal.columns, "function")
    assert.isFalse(Effect.isEffect(Terminal.columns))
    assert.isTrue(Effect.isEffect(Terminal.columns()))
    assert.isTrue(Context.isOperation(Terminal.columns))
  })

  it("looks the implementation up each time the call result runs", async () => {
    const call = Terminal.columns()
    const a = await Effect.runPromise(call.pipe(Effect.provideService(Terminal.columns.service, Effect.succeed(1))))
    const b = await Effect.runPromise(call.pipe(Effect.provideService(Terminal.columns.service, Effect.succeed(2))))
    assert.deepStrictEqual([a, b], [1, 2])
  })

  it("keeps the member as an Effect in the record, so the record view and the implementation are unchanged", async () => {
    const lines: Array<string> = []
    const viaRecord = Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const columns = yield* terminal.columns
      yield* terminal.display(String(columns))
      return columns
    })
    const record: Terminal.Shape = {
      columns: Effect.succeed(40),
      rows: Effect.succeed(10),
      size: Effect.die("unused"),
      readInput: Effect.die("unused"),
      readLine: Effect.succeed("line"),
      display: (text) =>
        Effect.sync(() => {
          lines.push(text)
        })
    }
    assert.strictEqual(
      await Effect.runPromise(viaRecord.pipe(Effect.provide(Layer.succeed(Terminal.Terminal, record)))),
      40
    )
    assert.strictEqual(
      await Effect.runPromise(Terminal.readLine().pipe(Effect.provideService(Terminal.Terminal, record))),
      "line"
    )
    assert.deepStrictEqual(lines, ["40"])
  })

  it("runs against the Node implementation, which is one layer per operation", async () => {
    const width = await Effect.runPromise(Terminal.columns().pipe(Effect.provide(nodeTerminal)))
    assert.isTrue(Number.isInteger(width) && width > 0)
    assert.strictEqual(await Effect.runPromise(Terminal.rows().pipe(Effect.provide(nodeTerminal))) > 0, true)
  })
})

describe("mixed and nested records", () => {
  const sep: Context.Service<"test/Path/sep", string> = Context.Service("test/Path/sep")
  const join: Context.Service<"test/Path/join", (...parts: ReadonlyArray<string>) => string> = Context.Service(
    "test/Path/join"
  )
  const fromFileUrl: Context.Operation<"test/Path/fromFileUrl", (url: URL) => Effect.Effect<string>> = Context
    .Operation(
      "test/Path/fromFileUrl"
    )
  const indent = Context.Reference<number>("test/Path/indent", { defaultValue: () => 2 })
  const pathMembers = { sep, join, fromFileUrl, indent }
  type Path = Context.Operations.Identifier<typeof pathMembers>
  interface PathShape extends Context.Operations.Shape<typeof pathMembers> {}
  const Path: Context.Operations<Path, PathShape> = Context.Operations("test/Path", pathMembers)
  const posix: PathShape = {
    sep: "/",
    join: (...parts) => parts.join("/"),
    fromFileUrl: (url) => Effect.succeed(url.pathname),
    indent: 2
  }

  const program = Effect.gen(function*() {
    const separator = yield* sep
    const joinPaths = yield* join
    const converted = yield* fromFileUrl(new URL("file:///tmp/x"))
    const path = yield* Path
    return { separator, joined: joinPaths("a", "b"), converted, viaRecord: path.join("c", "d"), indent: path.indent }
  })

  it("provides a plain value, a synchronous function and an operation as members of one record", async () => {
    const result = await Effect.runPromise(program.pipe(Effect.provide(Layer.succeed(Path, posix))))
    assert.deepStrictEqual(result, { separator: "/", joined: "a/b", converted: "/tmp/x", viaRecord: "c/d", indent: 2 })
  })

  it("assembles the record from member layers, and an override of one member wins on top of the record", async () => {
    const members = Layer.mergeAll(
      Layer.succeed(sep, "\\"),
      Layer.succeed(join, (...parts) => parts.join("\\")),
      Layer.succeed(fromFileUrl.service, (url) => Effect.succeed(url.pathname.replaceAll("/", "\\")))
    )
    const windows = await Effect.runPromise(program.pipe(Effect.provide(members)))
    assert.strictEqual(windows.joined, "a\\b")
    assert.strictEqual(windows.viaRecord, "c\\d")
    const overridden = await Effect.runPromise(
      program.pipe(Effect.provideService(sep, "|"), Effect.provide(Layer.succeed(Path, posix)))
    )
    assert.strictEqual(overridden.separator, "|")
    assert.strictEqual(overridden.joined, "a/b")
  })

  it("reads a reference member's default when its slot is empty, and the provided value otherwise", async () => {
    const context = Context.make(Path, { ...posix, indent: 4 })
    assert.strictEqual(Context.get(context, Path).indent, 4)
    assert.strictEqual(Context.get(Context.omit(indent)(context), Path).indent, 2)
    const provided = await Effect.runPromise(
      program.pipe(Effect.provideService(indent, 8), Effect.provide(Layer.succeed(Path, posix)))
    )
    assert.strictEqual(provided.indent, 8)
  })

  it("spreads a record that is a member of a record, and reads it back", () => {
    const platformMembers = { fs: FileSystem.ReadOnly, path: Path }
    type Platform = Context.Operations.Identifier<typeof platformMembers>
    interface PlatformShape extends Context.Operations.Shape<typeof platformMembers> {}
    const Platform: Context.Operations<Platform, PlatformShape> = Context.Operations("test/Platform", platformMembers)
    const fs: FileSystem.ReadOnlyShape = {
      exists: () => Effect.succeed(true),
      readFile: () => Effect.succeed(bytes("x")),
      stat: () => Effect.die("unused")
    }
    const context = Context.make(Platform, { fs, path: posix })
    assert.strictEqual(context.mapUnsafe.size, 7)
    assert.isTrue(context.mapUnsafe.has("effect/FileSystem/readFile"))
    assert.isTrue(context.mapUnsafe.has("test/Path/sep"))
    assert.isFalse(context.mapUnsafe.has("test/Platform"))
    assert.strictEqual(Context.get(context, Platform).path.sep, "/")
    assert.strictEqual(Context.get(context, FileSystem.readFile.service), fs.readFile)
    assert.strictEqual(Context.omit(Platform)(context).mapUnsafe.size, 0)
  })
})

describe("subset records", () => {
  it("is satisfied by the full record and by its member layers, and provides its members", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("twelve bytes"))
    const stat = Layer.succeed(
      FileSystem.stat.service,
      (path) => Effect.succeed({ type: "File" as const, size: fs.files.get(path)?.length ?? 0, mtime: new Date() })
    )
    const exists = Layer.succeed(FileSystem.exists.service, (path) => Effect.succeed(fs.files.has(path)))
    const members = Layer.mergeAll(fs.readFile, stat, exists)
    assert.strictEqual(await Effect.runPromise(sizeOf("a.txt").pipe(Effect.provide(members))), 12)
    assert.strictEqual(await Effect.runPromise(sizeOf("missing").pipe(Effect.provide(members))), 0)
    const viaRecord = Effect.map(FileSystem.ReadOnly, (readOnly) => Object.keys(readOnly).sort())
    assert.deepStrictEqual(await Effect.runPromise(viaRecord.pipe(Effect.provide(members))), [
      "exists",
      "readFile",
      "stat"
    ])
    assert.deepStrictEqual(await Effect.runPromise(viaRecord.pipe(Effect.provide(nodeLayer))), [
      "exists",
      "readFile",
      "stat"
    ])
    const readOnly = Layer.succeed(FileSystem.ReadOnly, {
      exists: () => Effect.succeed(true),
      readFile: () => Effect.succeed(bytes("three")),
      stat: () => Effect.die("unused")
    })
    assert.deepStrictEqual(
      await Effect.runPromise(FileSystem.readFile("x").pipe(Effect.provide(readOnly))),
      bytes("three")
    )
    assert.strictEqual(Context.make(FileSystem.ReadOnly, {} as FileSystem.ReadOnlyShape).mapUnsafe.size, 3)
  })
})

describe("record cache", () => {
  it("returns the same record for two reads of one context, and a new one once a member is replaced", () => {
    const live = record({ readFile: () => Effect.succeed(bytes("one")) })
    const context = Context.make(FileSystem.FileSystem, live)
    const first = Context.get(context, FileSystem.FileSystem)
    assert.strictEqual(Context.get(context, FileSystem.FileSystem), first)
    assert.strictEqual(first.readFile, live.readFile)
    const replaced = Context.add(context, FileSystem.readFile.service, () => Effect.succeed(bytes("two")))
    const second = Context.get(replaced, FileSystem.FileSystem)
    assert.notStrictEqual(second, first)
    assert.notStrictEqual(second.readFile, live.readFile)
    assert.strictEqual(second.stat, live.stat)
    // the curried form builds the same kind of operation as the flat form the contract uses
    const curried = Context.Operation<(x: number) => Effect.Effect<number>>()("test/curried")
    assert.isTrue(Context.isOperation(curried))
    assert.strictEqual(curried.name, "test/curried")
    assert.strictEqual(
      Effect.runSync(curried(1).pipe(Effect.provideService(curried.service, (x) => Effect.succeed(x + 1)))),
      2
    )
  })
})

describe("Sink.Operation", () => {
  const collect: Sink.Operation<"test/collect", (label: string) => Sink.Sink<Array<string>, string>> = Sink
    .Operation("test/collect")

  it("returns a Sink that runs the implementation looked up from the running fiber", async () => {
    assert.isTrue(Sink.isSink(collect("x")))
    assert.isFalse(Effect.isEffect(collect("x")))
    const live = Layer.succeed(
      collect.service,
      (label) => Sink.map(Sink.collect<string>(), (items) => items.map((item) => `${label}:${item}`))
    )
    const result = await Effect.runPromise(Stream.run(Stream.make("a", "b"), collect("x")).pipe(Effect.provide(live)))
    assert.deepStrictEqual(result, ["x:a", "x:b"])
  })
})
