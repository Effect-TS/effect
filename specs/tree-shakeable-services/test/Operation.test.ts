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
  const readFile = Layer.succeed(FileSystem.readFile, (path) =>
    files.has(path)
      ? Effect.succeed(files.get(path)!)
      : Effect.fail(new FileSystem.FileSystemError({ operation: "memory/readFile", cause: "ENOENT" })))
  const writeFile = Layer.succeed(FileSystem.writeFile, (path, data) =>
    Effect.sync(() => {
      files.set(path, data)
    }))
  const stream = Layer.succeed(
    FileSystem.stream,
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
  it("is a function with its key as its name, a slot, and neither a Context.Key nor an Effect", () => {
    assert.strictEqual(typeof FileSystem.readFile, "function")
    assert.strictEqual(FileSystem.readFile.name, "effect/FileSystem/readFile")
    assert.strictEqual(FileSystem.readFile.key, "effect/FileSystem/readFile")
    assert.isTrue(Context.isOperation(FileSystem.readFile))
    assert.isFalse(Context.isKey(FileSystem.readFile))
    assert.isFalse(Context.isOperations(FileSystem.readFile))
    assert.isFalse(Context.isReference(FileSystem.readFile))
    assert.isFalse(Effect.isEffect(FileSystem.readFile))
    assert.deepStrictEqual(JSON.parse(JSON.stringify(FileSystem.readFile)), {
      _id: "Operation",
      key: "effect/FileSystem/readFile"
    })
    // Function.prototype is still in the chain
    assert.strictEqual(typeof FileSystem.readFile.bind, "function")
  })

  it("runs the implementation provided for it", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("hello"))
    const size = await Effect.runPromise(backup("a.txt").pipe(Effect.provide(fs.layer)))
    assert.strictEqual(size, 5)
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("hello"))
  })

  it("is provided, read and removed like any key", () => {
    const impl = () => Effect.succeed(bytes("x"))
    const context = Context.make(FileSystem.readFile, impl)
    assert.strictEqual(context.mapUnsafe.size, 1)
    assert.strictEqual(Context.get(context, FileSystem.readFile), impl)
    assert.strictEqual(Context.getOrUndefined(context, FileSystem.stat), undefined)
    assert.isTrue(Option.isSome(Context.getOption(context, FileSystem.readFile)))
    assert.strictEqual(Context.omit(FileSystem.readFile)(context).mapUnsafe.size, 0)
    assert.strictEqual(Context.pick(FileSystem.readFile)(context).mapUnsafe.size, 1)
    // the implementation as a value, inside an Effect
    assert.strictEqual(Effect.runSync(Effect.service(FileSystem.readFile).pipe(Effect.provide(context))), impl)
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
    const fakeRead = Layer.succeed(FileSystem.readFile, (path) =>
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
        Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes("service"))),
        Effect.provide(fs.layer)
      )
    )
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("service"))

    // Layer.provideMerge composes the same way: the override is merged on top of the full layer.
    await Effect.runPromise(
      backup("a.txt").pipe(Effect.provide(Layer.provideMerge(fakeRead, fs.layer)))
    )
    assert.deepStrictEqual(fs.files.get("a.txt.bak"), bytes("faked"))
  })

  it("looks the implementation up each time the result runs, not when the operation is called", async () => {
    const read = FileSystem.readFile("a.txt")
    const first = read.pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes("first"))))
    const second = read.pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes("second"))))
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
        Effect.provideService(FileSystem.stream, () => Stream.make(bytes("a"), bytes("bc")))
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

  it("is called by Effect.andThen, Effect.tap and Effect.flatMap, since it is not an Effect", async () => {
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
        Effect.provideService(op, function(this: { prefix: string }, name) {
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
      parse(Number, "42").pipe(Effect.provideService(parse, (decode, input) => Effect.succeed(decode(input))))
    )
    assert.strictEqual(result, 42)
  })

  it("accepts an Effect.fn as an implementation", async () => {
    const implementation = Effect.fn("readFile")(function*(path: string) {
      return bytes(`fn:${path}`)
    })
    const result = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(Effect.provide(Layer.succeed(FileSystem.readFile, implementation)))
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
    assert.isFalse(Context.isOperation(FileSystem.FileSystem))
    assert.isFalse(Context.isReference(FileSystem.FileSystem))
    assert.isTrue(Effect.isEffect(FileSystem.FileSystem))
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

  it("returns the provided record itself when it is read", async () => {
    const live = record({ readFile: () => Effect.succeed(bytes("one")) })
    // through a layer
    const viaLayer = await Effect.runPromise(
      FileSystem.FileSystem.pipe(Effect.provide(Layer.succeed(FileSystem.FileSystem, live)))
    )
    assert.strictEqual(viaLayer, live)
    // through provideService
    assert.strictEqual(
      await Effect.runPromise(Effect.provideService(FileSystem.FileSystem, FileSystem.FileSystem, live)),
      live
    )
    // through Context directly, and under further unrelated additions
    const context = Context.make(FileSystem.FileSystem, live)
    assert.strictEqual(Context.get(context, FileSystem.FileSystem), live)
    const Other = Context.Service<number>("test/Other")
    let derived = context
    for (let i = 0; i < 12; i++) derived = Context.add(derived, Other, i)
    assert.strictEqual(Context.get(derived, FileSystem.FileSystem), live)
    assert.strictEqual(Context.getOrUndefinedUnsafe(context, "effect/FileSystem"), live)
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
    const liveRecord = record({
      readFile: () => Effect.succeed(bytes("live")),
      writeFile: () => Effect.void
    })
    const live = Layer.succeed(FileSystem.FileSystem, liveRecord)
    const fake = () => Effect.succeed(bytes("fake"))
    const direct = await Effect.runPromise(
      FileSystem.readFile("a.txt").pipe(Effect.provideService(FileSystem.readFile, fake), Effect.provide(live))
    )
    assert.deepStrictEqual(direct, bytes("fake"))
    const viaRecord = await Effect.runPromise(
      Effect.map(FileSystem.FileSystem, (fs) => fs).pipe(
        Effect.provideService(FileSystem.readFile, fake),
        Effect.provide(live)
      )
    )
    // the view is assembled, since the provided record is no longer current
    assert.notStrictEqual(viaRecord, liveRecord)
    assert.strictEqual(viaRecord.readFile, fake)
    assert.strictEqual(viaRecord.stat, liveRecord.stat)
    // Ordinary precedence: with the record provided closer to the program, the record's member wins and the
    // record read is the provided object.
    const inner = await Effect.runPromise(
      Effect.map(FileSystem.FileSystem, (fs) => fs).pipe(
        Effect.provide(live),
        Effect.provideService(FileSystem.readFile, fake)
      )
    )
    assert.strictEqual(inner, liveRecord)
    assert.deepStrictEqual(
      await Effect.runPromise(
        FileSystem.readFile("a.txt").pipe(Effect.provide(live), Effect.provideService(FileSystem.readFile, fake))
      ),
      bytes("live")
    )
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
    assert.strictEqual(context.mapUnsafe.size, 31)
    assert.strictEqual(Context.get(context, FileSystem.readFile), live.readFile)
    assert.strictEqual(Context.get(context, FileSystem.FileSystem), live)
    assert.isTrue(Option.isSome(Context.getOption(context, FileSystem.FileSystem)))

    const one = Context.make(FileSystem.readFile, live.readFile)
    assert.isTrue(Option.isNone(Context.getOption(one, FileSystem.FileSystem)))
    assert.strictEqual(Context.getOrUndefined(one, FileSystem.FileSystem), undefined)
    assert.throws(() => Context.get(one, FileSystem.FileSystem as any), /Service not found: effect\/FileSystem\/access/)

    assert.strictEqual(Context.pick(FileSystem.FileSystem)(context).mapUnsafe.size, 31)
    assert.strictEqual(Context.omit(FileSystem.FileSystem)(context).mapUnsafe.size, 0)
    // omitting a member also drops the record, which no longer agrees with its slots
    const without = Context.omit(FileSystem.readFile)(context)
    assert.strictEqual(without.mapUnsafe.size, 29)
    assert.isFalse(without.mapUnsafe.has("effect/FileSystem"))
    assert.strictEqual(Context.pick(FileSystem.readFile, FileSystem.stat)(context).mapUnsafe.size, 2)
  })

  it("stores a record under its own key and its members' keys", () => {
    const live = record({})
    const context = Context.add(Context.empty(), FileSystem.FileSystem, live)
    assert.strictEqual(context.mapUnsafe.size, 31)
    assert.isTrue(context.mapUnsafe.has("effect/FileSystem/readFile"))
    assert.isTrue(context.mapUnsafe.has("effect/FileSystem"))
    assert.strictEqual(context.mapUnsafe.get("effect/FileSystem/readFile"), live.readFile)
  })

  it("drops a record that no longer agrees with its slots when a context is flattened or merged", () => {
    const live = record({ readFile: () => Effect.succeed(bytes("live")) })
    const fake = () => Effect.succeed(bytes("fake"))
    const Other = Context.Service<number>("test/Other")
    // an override as an overlay, then enough additions to flatten the overlays into the base
    let context = Context.add(Context.make(FileSystem.FileSystem, live), FileSystem.readFile, fake)
    for (let i = 0; i < 12; i++) context = Context.add(context, Other, i)
    assert.isFalse(context.mapUnsafe.has("effect/FileSystem"))
    assert.strictEqual(Context.get(context, FileSystem.FileSystem).readFile, fake)
    assert.strictEqual(Context.get(context, FileSystem.readFile), fake)
    // merge: the right-hand context wins slot by slot, so a member on the right drops the record on the left...
    const merged = Context.merge(Context.make(FileSystem.FileSystem, live), Context.make(FileSystem.readFile, fake))
    assert.isFalse(merged.mapUnsafe.has("effect/FileSystem"))
    assert.strictEqual(Context.get(merged, FileSystem.FileSystem).readFile, fake)
    // ...and a record on the right replaces a member on the left
    const reversed = Context.merge(Context.make(FileSystem.readFile, fake), Context.make(FileSystem.FileSystem, live))
    assert.strictEqual(Context.get(reversed, FileSystem.FileSystem), live)
    assert.strictEqual(Context.get(reversed, FileSystem.readFile), live.readFile)
    const all = Context.mergeAll(Context.make(FileSystem.FileSystem, live), Context.make(FileSystem.readFile, fake))
    assert.strictEqual(Context.get(all, FileSystem.FileSystem).readFile, fake)
  })
})

describe("same string, same key", () => {
  const live = () => record({ readFile: () => Effect.succeed(bytes("live")) })
  const fake = () => Effect.succeed(bytes("fake"))

  it("treats a second operation object with a member's string as that member", async () => {
    const twin = Context.Operation<FileSystem.Shape["readFile"]>()("effect/FileSystem/readFile")
    assert.notStrictEqual(twin, FileSystem.readFile)
    // provided through one, called through the other
    const viaTwin = await Effect.runPromise(FileSystem.readFile("a").pipe(Effect.provideService(twin, fake)))
    assert.deepStrictEqual(viaTwin, bytes("fake"))
    // written through the twin on top of a record: the record view is current
    const context = Context.add(Context.make(FileSystem.FileSystem, live()), twin, fake)
    assert.strictEqual(Context.get(context, FileSystem.FileSystem).readFile, fake)
    assert.strictEqual(Context.get(context, FileSystem.readFile), fake)
    assert.strictEqual(Context.get(context, twin), fake)
  })

  it("treats a Context.Service with a member's string as that member", () => {
    const Plain = Context.Service<"effect/FileSystem/readFile", FileSystem.Shape["readFile"]>(
      "effect/FileSystem/readFile"
    )
    const context = Context.add(Context.make(FileSystem.FileSystem, live()), Plain, fake)
    assert.strictEqual(Context.get(context, FileSystem.FileSystem).readFile, fake)
    assert.strictEqual(Context.get(context, FileSystem.readFile), fake)
    assert.isFalse(context.mapUnsafe.has("effect/FileSystem"))
    // and one with the record's string as the record: written, it spreads; read, it returns the record
    const PlainRecord = Context.Service<FileSystem.FileSystem, FileSystem.Shape>("effect/FileSystem")
    const spread = Context.make(PlainRecord, live())
    assert.strictEqual(spread.mapUnsafe.size, 31)
    assert.strictEqual(Context.get(spread, FileSystem.readFile), Context.get(spread, PlainRecord).readFile)
    assert.strictEqual(Context.get(Context.add(spread, FileSystem.readFile, fake), PlainRecord).readFile, fake)
  })

  it("lets a record be constructed again under its string, replacing its registration", () => {
    const Again = Context.Operations<FileSystem.FileSystem, FileSystem.Shape>()("effect/FileSystem", {
      ...FileSystem.FileSystem.members
    })
    try {
      assert.notStrictEqual(Again, FileSystem.FileSystem)
      const value = live()
      const context = Context.make(FileSystem.FileSystem, value)
      // both objects read the same slots
      assert.strictEqual(Context.get(context, Again), value)
      assert.strictEqual(Context.get(Context.make(Again, value), FileSystem.FileSystem), value)
      // a member write lays one marker per record spanning it, not one per construction: `writeFile` is a member
      // of `FileSystem` alone, so the overlay chain is the member plus one marker
      const shadowed = Context.add(context, FileSystem.writeFile, fake)
      let depth = 0
      for (let overlay = (shadowed as any).overlay; overlay; overlay = overlay.parent) depth++
      assert.strictEqual(depth, 2)
      assert.strictEqual(Context.get(shadowed, Again).writeFile, fake)
      assert.strictEqual(Context.get(shadowed, FileSystem.FileSystem).writeFile, fake)
      // `readFile` is a member of `FileSystem` and `ReadOnly`: two markers
      depth = 0
      for (
        let overlay = (Context.add(context, FileSystem.readFile, fake) as any).overlay;
        overlay;
        overlay = overlay.parent
      ) depth++
      assert.strictEqual(depth, 3)
    } finally {
      // restore the original object as the registered record
      Context.Operations<FileSystem.FileSystem, FileSystem.Shape>()("effect/FileSystem", FileSystem.FileSystem.members)
    }
  })

  it("does not share a base's assembly with a context whose overlays touch a member", () => {
    const Other = Context.Service<number>("test/Other")
    const base = Context.mergeAll(
      Context.make(FileSystem.exists, () => Effect.succeed(true)),
      Context.make(FileSystem.readFile, () => Effect.succeed(bytes("one"))),
      Context.make(FileSystem.stat, () => Effect.die("unused"))
    )
    // a member written as an overlay before any record read, then unrelated overlays on top
    const overridden = Context.add(Context.add(base, FileSystem.readFile, fake), Other, 1)
    const shared = Context.get(Context.add(base, Other, 2), FileSystem.ReadOnly)
    assert.notStrictEqual(Context.get(overridden, FileSystem.ReadOnly), shared)
    assert.strictEqual(Context.get(overridden, FileSystem.ReadOnly).readFile, fake)
    assert.strictEqual(Context.get(Context.add(base, Other, 3), FileSystem.ReadOnly), shared)
  })
})

describe("string-keyed and structural keys", () => {
  it("keeps the storage invariant for writes by string", () => {
    const live = record({ readFile: () => Effect.succeed(bytes("live")) })
    const fake = () => Effect.succeed(bytes("fake"))
    // a record written by its string is spread like a keyed write
    const spread = Context.addUnsafe(Context.empty(), "effect/FileSystem", live)
    assert.strictEqual(spread.mapUnsafe.size, 31)
    assert.strictEqual(
      Context.get(spread as Context.Context<FileSystem.FileSystem>, FileSystem.readFile),
      live.readFile
    )
    // a member written by its string marks the records spanning it, and a read by the record's string assembles
    const shadowed = Context.addUnsafe(spread, "effect/FileSystem/readFile", fake)
    assert.strictEqual(Context.getOrUndefinedUnsafe<FileSystem.Shape>(shadowed, "effect/FileSystem")!.readFile, fake)
    assert.strictEqual(
      Context.get(shadowed as Context.Context<FileSystem.FileSystem>, FileSystem.FileSystem).readFile,
      fake
    )
    assert.isFalse(shadowed.mapUnsafe.has("effect/FileSystem"))
    assert.strictEqual(Context.getOrUndefinedUnsafe(spread, "effect/FileSystem"), live)
    // a record's string with a member missing reads as absent
    assert.strictEqual(
      Context.getOrUndefinedUnsafe(Context.make(FileSystem.readFile, fake), "effect/FileSystem"),
      undefined
    )
  })

  it("gives a key built structurally one-slot semantics", () => {
    // `internal/core.ts` builds its cause annotation keys this way
    const Duck = { key: "test/duck" } as unknown as Context.Service<"test/duck", number>
    const context = Context.make(Duck, 1)
    assert.strictEqual(context.mapUnsafe.size, 1)
    assert.strictEqual(Context.get(context, Duck), 1)
    assert.strictEqual(Context.get(Context.add(context, Duck, 2), Duck), 2)
    assert.isTrue(Option.isNone(Context.getOption(Context.empty(), Duck)))
    assert.throws(
      () => Context.get(Context.empty() as Context.Context<"test/duck">, Duck),
      /Service not found: test\/duck/
    )
    assert.strictEqual(Context.pick(Duck)(context).mapUnsafe.size, 1)
    assert.strictEqual(Context.omit(Duck)(context).mapUnsafe.size, 0)
  })
})

describe("zero-argument operations", () => {
  const fake = (columns: number, lines: Array<string>) =>
    Layer.mergeAll(
      Layer.succeed(Terminal.columns, () => Effect.succeed(columns)),
      Layer.succeed(Terminal.display, (text) =>
        Effect.sync(() => {
          lines.push(text)
        }))
    )

  it("is called with no arguments and runs the implementation", async () => {
    const lines: Array<string> = []
    const width = await Effect.runPromise(banner("hi").pipe(Effect.provide(fake(12, lines))))
    assert.strictEqual(width, 12)
    assert.deepStrictEqual(lines, ["======\n  hi\n======\n"])
  })

  it("reads the same standalone and through the record", async () => {
    const lines: Array<string> = []
    const viaRecord = Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const columns = yield* terminal.columns()
      yield* terminal.display(String(columns))
      return columns
    })
    const record: Terminal.Shape = {
      columns: () => Effect.succeed(40),
      rows: () => Effect.succeed(10),
      size: () => Effect.die("unused"),
      readInput: () => Effect.die("unused"),
      readLine: () => Effect.succeed("line"),
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
  const sep = Context.Service<string>("test/Path/sep")
  const join = Context.Service<(...parts: ReadonlyArray<string>) => string>("test/Path/join")
  const fromFileUrl = Context.Operation<(url: URL) => Effect.Effect<string>>()("test/Path/fromFileUrl")
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
      Layer.succeed(fromFileUrl, (url) => Effect.succeed(url.pathname.replaceAll("/", "\\")))
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
    const platform = { fs, path: posix }
    const context = Context.make(Platform, platform)
    // three leaves and the ReadOnly record, four leaves and the Path record, and the Platform record
    assert.strictEqual(context.mapUnsafe.size, 10)
    assert.isTrue(context.mapUnsafe.has("effect/FileSystem/readFile"))
    assert.isTrue(context.mapUnsafe.has("test/Path/sep"))
    assert.isTrue(context.mapUnsafe.has("test/Platform"))
    assert.strictEqual(Context.get(context, Platform), platform)
    assert.strictEqual(Context.get(context, FileSystem.ReadOnly), fs)
    assert.strictEqual(Context.get(context, FileSystem.readFile), fs.readFile)
    assert.strictEqual(Context.omit(Platform)(context).mapUnsafe.size, 0)
    // a member written deeper down shadows every record spanning it
    const fake = () => Effect.succeed(bytes("fake"))
    const shadowed = Context.add(context, FileSystem.readFile, fake)
    assert.strictEqual(Context.get(shadowed, Platform).fs.readFile, fake)
    assert.strictEqual(Context.get(shadowed, FileSystem.ReadOnly).readFile, fake)
    assert.strictEqual(Context.get(shadowed, Platform).path, posix)
    // a nested record written on top shadows the outer record and wins for its members
    const inner: FileSystem.ReadOnlyShape = { ...fs, readFile: fake }
    const rewritten = Context.add(context, FileSystem.ReadOnly, inner)
    assert.strictEqual(Context.get(rewritten, FileSystem.ReadOnly), inner)
    assert.strictEqual(Context.get(rewritten, Platform).fs, inner)
    assert.strictEqual(Context.get(rewritten, FileSystem.readFile), fake)
  })
})

describe("subset records", () => {
  it("is satisfied by the full record and by its member layers, and provides its members", async () => {
    const fs = memory()
    fs.files.set("a.txt", bytes("twelve bytes"))
    const stat = Layer.succeed(
      FileSystem.stat,
      (path) => Effect.succeed({ type: "File" as const, size: fs.files.get(path)?.length ?? 0, mtime: new Date() })
    )
    const exists = Layer.succeed(FileSystem.exists, (path) => Effect.succeed(fs.files.has(path)))
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
    assert.strictEqual(Context.make(FileSystem.ReadOnly, {} as FileSystem.ReadOnlyShape).mapUnsafe.size, 4)
  })

  it("is shadowed by the full record and shadows it, slot by slot", () => {
    const full = record({ readFile: () => Effect.succeed(bytes("full")) })
    const subset: FileSystem.ReadOnlyShape = {
      exists: () => Effect.succeed(true),
      readFile: () => Effect.succeed(bytes("subset")),
      stat: () => Effect.die("unused")
    }
    const fullThenSubset = Context.add(Context.make(FileSystem.FileSystem, full), FileSystem.ReadOnly, subset)
    assert.strictEqual(Context.get(fullThenSubset, FileSystem.ReadOnly), subset)
    assert.strictEqual(Context.get(fullThenSubset, FileSystem.readFile), subset.readFile)
    assert.strictEqual(Context.get(fullThenSubset, FileSystem.FileSystem).readFile, subset.readFile)
    assert.strictEqual(Context.get(fullThenSubset, FileSystem.FileSystem).writeFile, full.writeFile)
    const subsetThenFull = Context.add(Context.make(FileSystem.ReadOnly, subset), FileSystem.FileSystem, full)
    assert.strictEqual(Context.get(subsetThenFull, FileSystem.FileSystem), full)
    assert.strictEqual(Context.get(subsetThenFull, FileSystem.ReadOnly).readFile, full.readFile)
  })
})

describe("record cache", () => {
  it("shares one assembled record across contexts derived from one base, and rebuilds it when a member changes", () => {
    const Other = Context.Service<number>("test/Other")
    const fromMembers = Context.mergeAll(
      Context.make(FileSystem.exists, () => Effect.succeed(true)),
      Context.make(FileSystem.readFile, () => Effect.succeed(bytes("one"))),
      Context.make(FileSystem.stat, () => Effect.die("unused"))
    )
    const first = Context.get(fromMembers, FileSystem.ReadOnly)
    assert.strictEqual(Context.get(fromMembers, FileSystem.ReadOnly), first)
    // a context derived by adding an unrelated service shares the base, so it shares the assembly
    assert.strictEqual(Context.get(Context.add(fromMembers, Other, 1), FileSystem.ReadOnly), first)
    assert.strictEqual(Context.get(Context.add(fromMembers, Other, 2), FileSystem.ReadOnly), first)
    // replacing a member gives a new record with the replacement and the other members unchanged
    const fake = () => Effect.succeed(bytes("two"))
    const replaced = Context.add(fromMembers, FileSystem.readFile, fake)
    const second = Context.get(replaced, FileSystem.ReadOnly)
    assert.notStrictEqual(second, first)
    assert.strictEqual(second.readFile, fake)
    assert.strictEqual(second.stat, first.stat)
    assert.strictEqual(Context.get(replaced, FileSystem.ReadOnly), second)
  })
})

describe("Sink.Operation", () => {
  const collect = Sink.Operation<(label: string) => Sink.Sink<Array<string>, string>>()("test/collect")

  it("returns a Sink that runs the implementation looked up from the running fiber", async () => {
    assert.isTrue(Sink.isSink(collect("x")))
    assert.isFalse(Effect.isEffect(collect("x")))
    const live = Layer.succeed(
      collect,
      (label) => Sink.map(Sink.collect<string>(), (items) => items.map((item) => `${label}:${item}`))
    )
    const result = await Effect.runPromise(Stream.run(Stream.make("a", "b"), collect("x")).pipe(Effect.provide(live)))
    assert.deepStrictEqual(result, ["x:a", "x:b"])
  })
})
