import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redactable from "effect/Redactable"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe, it } from "vitest"

interface ContextInternals {
  readonly _flat: unknown
}

describe("Context", () => {
  const A = Context.Service<number>("ContextTest/A")
  const B = Context.Service<number>("ContextTest/B")
  const C = Context.Service<number>("ContextTest/C")

  it("keeps the source immutable across additions", () => {
    const source = Context.make(A, 1)
    const result = Context.add(source, B, 2)

    deepStrictEqual([...source.mapUnsafe], [[A.key, 1]])
    deepStrictEqual([...result.mapUnsafe], [[A.key, 1], [B.key, 2]])
  })

  it("removes a service with addOrOmit", () => {
    const context = Context.make(A, 1).pipe(Context.addOrOmit(A, Option.none()))

    assertTrue(Context.getOption(context, A)._tag === "None")
  })

  it("preserves Map insertion order for replacements and appends", () => {
    const Ref = Context.Reference<number>("ContextTest/OrderRef", { defaultValue: () => 0 })
    const context = Context.empty().pipe(
      Context.add(A, 1),
      Context.add(Ref, 2),
      Context.add(B, 3),
      Context.add(A, 4),
      Context.add(C, 5)
    )

    deepStrictEqual([...context.mapUnsafe], [
      [A.key, 4],
      [Ref.key, 2],
      [B.key, 3],
      [C.key, 5]
    ])
  })

  it("invalidates the fiber cache only for opted-in keys", () => {
    const Cached = Context.Service<number>("ContextTest/Cached", { fiberCached: true })
    class CachedClass extends Context.Service<CachedClass, number>()("ContextTest/CachedClass", {
      fiberCached: true
    }) {}
    const Ref = Context.Reference<number>("ContextTest/Ref", { defaultValue: () => 0 })
    const CachedRef = Context.Reference<number>("ContextTest/CachedRef", {
      fiberCached: true,
      defaultValue: () => 0
    })

    const source = Context.make(A, 1)
    assertTrue(Context.hasSameCache(source, Context.add(source, B, 1)))
    assertTrue(Context.hasSameCache(source, Context.add(source, Ref, 1)))
    assertFalse(Context.hasSameCache(source, Context.add(source, CachedRef, 1)))
    const context = source.pipe(
      Context.add(Cached, 2),
      Context.add(CachedClass, 3)
    )

    strictEqual(Context.get(context, Cached), 2)
    strictEqual(Context.get(context, CachedClass), 3)
    assertTrue(Context.getOption(source, Cached)._tag === "None")

    const replaced = Context.add(context, Cached, 4)
    strictEqual(Context.get(replaced, Cached), 4)
    strictEqual(Context.get(context, Cached), 2)

    deepStrictEqual([...replaced.mapUnsafe], [
      [A.key, 1],
      [Cached.key, 4],
      [CachedClass.key, 3]
    ])
    deepStrictEqual([...Context.omit(Cached)(replaced).mapUnsafe], [
      [A.key, 1],
      [CachedClass.key, 3]
    ])
  })

  it("supports the Redactable fallback context", () => {
    const Cached = Context.Service<number>("ContextTest/RedactableCached", { fiberCached: true })
    const context = Redactable.getRedacted({
      [Redactable.symbolRedactable](context: Context.Context<never>) {
        return context
      }
    }) as Context.Context<never>

    strictEqual(context.mapUnsafe.size, 0)
    assertTrue(Context.getOption(context, Cached)._tag === "None")

    const added = Context.add(context, Cached, 1)
    strictEqual(Context.get(added, Cached), 1)
    strictEqual(context.mapUnsafe.size, 0)
  })

  it("distinguishes an undefined service from an absent service", () => {
    const Undefined = Context.Service<number | undefined>("ContextTest/Undefined", { fiberCached: true })
    const Missing = Context.Service<undefined>("ContextTest/Missing")
    const Ref = Context.Reference<string | undefined>("ContextTest/UndefinedRef", {
      defaultValue: () => "default",
      fiberCached: true
    })
    const context = Context.make(Undefined, 1).pipe(Context.add(Undefined, undefined), Context.add(Ref, undefined))

    assertTrue(Context.getOption(context, Undefined)._tag === "Some")
    assertTrue(Context.getOption(context, Missing)._tag === "None")
    strictEqual(Context.getUnsafe(context, Undefined), undefined)
    strictEqual(Context.getOrElse(context, Undefined, () => 1), undefined)
    deepStrictEqual(Context.getOption(context, Ref), Option.some(undefined))
    deepStrictEqual([...Context.pick(Undefined)(context).mapUnsafe], [[Undefined.key, undefined]])
    deepStrictEqual([...Context.pick(Missing)(context).mapUnsafe], [])
    strictEqual(Context.get(context, Ref), undefined)
  })

  it("bounds deep overlay chains without changing values or order", () => {
    const keys = Array.from({ length: 20 }, (_, i) => Context.Service<number>(`ContextTest/Deep${i}`))
    let context = Context.empty()
    for (let i = 0; i < keys.length; i++) {
      context = Context.add(context, keys[i], i)
    }

    strictEqual(context.mapUnsafe.size, 20)
    deepStrictEqual([...context.mapUnsafe.keys()], keys.map((key) => key.key))
    for (let i = 0; i < keys.length; i++) {
      strictEqual(Context.getUnsafe(context, keys[i]), i)
    }
    // Rebasing on ordinary keys must not invalidate fiber caches
    assertTrue(Context.hasSameCache(Context.empty(), context))
  })

  it("rebases a shadowing overlay chain from a cold or warm parent", () => {
    const keys = Array.from({ length: 8 }, (_, i) => Context.Service<number>(`ContextTest/Rebase${i}`))
    const base = Context.make(A, 1).pipe(Context.add(B, 2))
    const flat = Context.makeUnsafe<never>(new Map(base.mapUnsafe))
    // Build a depth-8 chain so the next add rebases.
    let parent = Context.add(flat, A, 10)
    for (let i = 0; i < 7; i++) {
      parent = Context.add(parent, keys[i], i)
    }
    const expected = [[A.key, 10], [B.key, 2], ...keys.slice(0, 7).map((key, i) => [key.key, i]), [C.key, 3]]

    const cold = Context.add(parent, C, 3)
    deepStrictEqual([...cold.mapUnsafe], expected)

    const parentEntries = [...parent.mapUnsafe]
    const warm = Context.add(parent, C, 3)
    deepStrictEqual([...warm.mapUnsafe], expected)
    deepStrictEqual([...parent.mapUnsafe], parentEntries)
    strictEqual(Context.getOption(parent, C)._tag, "None")
  })

  it("rebases a large base without warming the pre-rebase context's flat cache", () => {
    const baseSize = 50
    const baseKeys = Array.from({ length: baseSize }, (_, i) => Context.Service<number>(`ContextTest/Rebase${i}`))
    const base = Context.makeUnsafe(new Map(baseKeys.map((key, i) => [key.key, i])))
    const pushKeys = Array.from({ length: 9 }, (_, i) => Context.Service<number>(`ContextTest/Push${i}`))

    let preRebase: Context.Context<never> = base
    for (let i = 0; i < pushKeys.length - 1; i++) {
      preRebase = Context.add(preRebase, pushKeys[i], i)
    }
    const context = Context.add(preRebase, pushKeys[pushKeys.length - 1], pushKeys.length - 1)

    strictEqual((preRebase as any as ContextInternals)._flat, undefined)

    strictEqual(context.mapUnsafe.size, baseSize + pushKeys.length)
    for (let i = 0; i < baseKeys.length; i++) {
      strictEqual(Context.getUnsafe(context, baseKeys[i]), i)
    }
    for (let i = 0; i < pushKeys.length; i++) {
      strictEqual(Context.getUnsafe(context, pushKeys[i]), i)
    }
  })

  it("inherits maxDepth across additions, rebases, and merge", () => {
    // Depth has no public accessor; inspect rebase boundaries, not policy storage.
    let context = Context.makeUnsafe(new Map(), { maxDepth: 2 })
    for (let cycle = 0; cycle < 2; cycle++) {
      context = Context.add(context, A, 1).pipe(Context.add(B, 2))
      strictEqual((context as unknown as { depth: number }).depth, 2)
      context = Context.add(context, C, 3)
      strictEqual((context as unknown as { depth: number }).depth, 0)
    }

    context = Context.merge(context, Context.make(A, 4)).pipe(
      Context.add(B, 5),
      Context.add(C, 6),
      Context.add(A, 7)
    )
    strictEqual((context as unknown as { depth: number }).depth, 0)
  })

  it("keeps maxDepth when picking zero or one key", () => {
    const source = Context.makeUnsafe(new Map([[A.key, 1]]), { maxDepth: 2 })
    for (let context of [Context.pick()(source), Context.pick(A)(source)]) {
      context = Context.add(context, B, 2).pipe(Context.add(C, 3))
      strictEqual((context as unknown as { depth: number }).depth, 2)
      context = Context.add(context, A, 4)
      strictEqual((context as unknown as { depth: number }).depth, 0)
    }
  })

  it("uses depth 8 by default, for invalid options, and after mergeAll", () => {
    const contexts = [
      Context.makeUnsafe(new Map()),
      ...[NaN, -1, 1.5, Infinity].map((maxDepth) => Context.makeUnsafe(new Map(), { maxDepth })),
      Context.mergeAll(
        Context.makeUnsafe(new Map([[A.key, 1]]), { maxDepth: 2 }),
        Context.makeUnsafe(new Map([[B.key, 2]]), { maxDepth: 32 })
      )
    ]
    for (let context of contexts) {
      for (let i = 0; i < 8; i++) {
        context = Context.add(context, A, i)
      }
      strictEqual((context as unknown as { depth: number }).depth, 8)
      context = Context.add(context, B, 8)
      strictEqual((context as unknown as { depth: number }).depth, 0)
    }
  })

  it("flattens after repeated base fall-throughs", () => {
    const context = Context.make(A, 1).pipe(Context.add(B, 2))
    const impl = context as any

    for (let i = 0; i < 7; i++) {
      strictEqual(Context.getUnsafe(context, A), 1)
    }
    strictEqual(impl._flat, undefined)

    strictEqual(Context.getUnsafe(context, A), 1)
    assertTrue(impl._flat instanceof Map)
    strictEqual(impl.overlay, undefined)
    strictEqual(impl.depth, 0)

    const added = Context.add(context, C, 3) as any
    strictEqual(added._flat, undefined)
    strictEqual(added.baseHits, 0)
  })

  it("defers flattening a large base until enough base hits", () => {
    const keys = Array.from({ length: 32 }, (_, i) => Context.Service<number>(`ContextTest/Large${i}`))
    const base = Context.makeUnsafe(new Map(keys.map((key, i) => [key.key, i])))
    const context = Context.add(base, A, -1)
    const impl = context as any

    for (let i = 0; i < 8; i++) {
      strictEqual(Context.getUnsafe(context, keys[0]), 0)
    }
    strictEqual(impl._flat, undefined)
    strictEqual(impl.base, base.mapUnsafe)
    strictEqual(Context.getUnsafe(context, A), -1)
    assertTrue(Option.isNone(Context.getOption(context, B)))
    strictEqual(impl.baseHits, 8)

    for (let i = 8; i < 31; i++) {
      strictEqual(Context.getUnsafe(context, keys[i]), i)
    }
    strictEqual(impl._flat, undefined)
    strictEqual(impl.base, base.mapUnsafe)

    strictEqual(Context.getUnsafe(context, keys[31]), 31)
    assertTrue(impl._flat instanceof Map)
    strictEqual(impl.overlay, undefined)
    strictEqual(impl.baseHits, 32)
    strictEqual(Context.getUnsafe(context, A), -1)
    strictEqual(Context.getUnsafe(context, keys[0]), 0)
  })

  it("supports the ReadonlyMap surface through mapUnsafe", () => {
    const context = Context.make(A, 1).pipe(Context.add(B, 2))
    const visited: Array<[string, number]> = []
    context.mapUnsafe.forEach((value, key) => visited.push([key, value]))

    strictEqual(context.mapUnsafe.size, 2)
    assertTrue(context.mapUnsafe.has(A.key))
    strictEqual(context.mapUnsafe.get(B.key), 2)
    deepStrictEqual([...context.mapUnsafe.keys()], [A.key, B.key])
    deepStrictEqual([...context.mapUnsafe.values()], [1, 2])
    deepStrictEqual([...context.mapUnsafe.entries()], [[A.key, 1], [B.key, 2]])
    deepStrictEqual(visited, [[A.key, 1], [B.key, 2]])
  })

  it("supports equality and JSON materialization", () => {
    const left = Context.make(A, 1).pipe(Context.add(B, 2))
    const right = Context.makeUnsafe(new Map([[A.key, 1], [B.key, 2]]))

    assertTrue(Equal.equals(left, right))
    assertFalse(Equal.equals(left, Context.make(A, 2)))
    deepStrictEqual(left.toJSON(), {
      _id: "Context",
      services: [{ key: A.key, value: 1 }, { key: B.key, value: 2 }]
    })
  })

  it("merges with right bias and preserves empty operand identity", () => {
    const left = Context.make(A, 1).pipe(Context.add(B, 2))
    const right = Context.make(A, 3).pipe(Context.add(C, 4))
    const merged = Context.merge(left, right)

    strictEqual(Context.merge(Context.empty(), left), left)
    strictEqual(Context.merge(left, Context.empty()), left)
    deepStrictEqual([...merged.mapUnsafe], [[A.key, 3], [B.key, 2], [C.key, 4]])
  })

  it("pick and omit preserve services and source ordering", () => {
    const source = Context.make(A, 1).pipe(Context.add(B, 2), Context.add(C, 0), Context.add(C, 3))

    const impl = source as any as ContextInternals
    strictEqual(impl._flat, undefined)
    const empty = Context.pick()(source)
    strictEqual(impl._flat, undefined)
    const picked = Context.pick(C)(source)
    strictEqual(impl._flat, undefined)
    deepStrictEqual([...picked.mapUnsafe], [[C.key, 3]])
    deepStrictEqual([...empty.mapUnsafe], [])
    assertFalse(Context.hasSameCache(source, picked))
    assertFalse(Context.hasSameCache(source, empty))
    deepStrictEqual([...source.mapUnsafe], [[A.key, 1], [B.key, 2], [C.key, 3]])
    deepStrictEqual([...Context.pick(C, A)(source).mapUnsafe], [[A.key, 1], [C.key, 3]])
    deepStrictEqual([...Context.omit(B)(source).mapUnsafe], [[A.key, 1], [C.key, 3]])
  })

  it("resolves reference defaults lazily and caches them", () => {
    let calls = 0
    const Ref = Context.Reference<object>("ContextTest/LazyRef", {
      defaultValue: () => {
        calls++
        return {}
      }
    })
    const context = Context.empty()
    deepStrictEqual([...Context.pick(Ref)(context).mapUnsafe], [])

    strictEqual(calls, 0)
    const first = Context.get(context, Ref)
    strictEqual(calls, 1)
    strictEqual(Context.get(context, Ref), first)
    strictEqual(calls, 1)
  })

  it("retains the makeUnsafe input map", () => {
    const map = new Map([[A.key, 1]])
    const context = Context.makeUnsafe(map)

    strictEqual(context.mapUnsafe, map)
  })
})

// -----------------------------------------------------------------------------
// Operations: callable slots and record services
// -----------------------------------------------------------------------------

describe("Operation", () => {
  const readFile = Context.Operation<(path: string) => Effect.Effect<string>>()("ContextTest/FS/readFile")
  const writeFile = Context.Operation<(path: string, data: string) => Effect.Effect<void>>()(
    "ContextTest/FS/writeFile"
  )
  const stat = Context.Operation<(path: string) => Effect.Effect<number>>()("ContextTest/FS/stat")
  const lines = Stream.Operation<(path: string) => Stream.Stream<string>>()("ContextTest/FS/lines")
  const collect = Sink.Operation<(label: string) => Sink.Sink<Array<string>, string>>()("ContextTest/FS/collect")
  const members = { readFile, writeFile, stat, lines }
  type FS = Context.Operations.Identifier<typeof members>
  interface Shape extends Context.Operations.Shape<typeof members> {}
  const FS = Context.Operations<FS, Shape>()("ContextTest/FS", members)
  const readOnlyMembers = { readFile, stat }
  type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
  const ReadOnly = Context.Operations<ReadOnly>()("ContextTest/FS/ReadOnly", readOnlyMembers)

  /** An in-memory file system: a map and one layer per operation over it. */
  const memory = () => {
    const files = new Map<string, string>()
    const read = Layer.succeed(readFile, (path) => Effect.succeed(files.get(path) ?? ""))
    const write = Layer.succeed(writeFile, (path, data) =>
      Effect.sync(() => {
        files.set(path, data)
      }))
    const size = Layer.succeed(stat, (path) => Effect.succeed((files.get(path) ?? "").length))
    const read2 = Layer.succeed(lines, (path) => Stream.fromIterable((files.get(path) ?? "").split("\n")))
    return { files, read, write, size, lines: read2, layer: Layer.mergeAll(read, write, size, read2) }
  }
  /** A whole-record implementation: every member dies unless overridden, the way a record fake is written today. */
  const record = (overrides: Partial<Shape>): Shape => ({
    readFile: () => Effect.die("record: readFile"),
    writeFile: () => Effect.die("record: writeFile"),
    stat: () => Effect.die("record: stat"),
    lines: () => Stream.fromEffect(Effect.die("record: lines")),
    ...overrides
  })
  const backup = Effect.fnUntraced(function*(path: string) {
    const data = yield* readFile(path)
    yield* writeFile(`${path}.bak`, data)
    return data.length
  })
  const dies = async <A, E>(effect: Effect.Effect<A, E>, pattern: RegExp) => {
    const exit = await Effect.runPromiseExit(effect)
    assertTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) assert.match(String(Cause.squash(exit.cause)), pattern)
  }

  it("is a function named after its key, a slot, and neither a Context.Key nor an Effect", () => {
    strictEqual(typeof readFile, "function")
    strictEqual(readFile.name, "ContextTest/FS/readFile")
    strictEqual(readFile.key, "ContextTest/FS/readFile")
    assertTrue(Context.isOperation(readFile))
    assertFalse(Context.isKey(readFile))
    assertFalse(Context.isOperations(readFile))
    assertFalse(Context.isReference(readFile))
    assertFalse(Effect.isEffect(readFile))
    deepStrictEqual(JSON.parse(JSON.stringify(readFile)), { _id: "Operation", key: "ContextTest/FS/readFile" })
    strictEqual(typeof readFile.bind, "function")
  })

  it("runs the implementation provided for it, with the innermost provider winning", async () => {
    const fs = memory()
    fs.files.set("a", "hello")
    strictEqual(await Effect.runPromise(backup("a").pipe(Effect.provide(fs.layer))), 5)
    strictEqual(fs.files.get("a.bak"), "hello")
    // a single operation overridden on top of the live layers, through a layer, provideService and provideMerge
    const fake = Layer.succeed(readFile, () => Effect.succeed("faked"))
    strictEqual(await Effect.runPromise(backup("a").pipe(Effect.provide(fake), Effect.provide(fs.layer))), 5)
    strictEqual(fs.files.get("a.bak"), "faked")
    strictEqual(
      await Effect.runPromise(
        readFile("a").pipe(Effect.provideService(readFile, () => Effect.succeed("fake 2")), Effect.provide(fs.layer))
      ),
      "fake 2"
    )
    strictEqual(
      await Effect.runPromise(readFile("a").pipe(Effect.provide(Layer.provideMerge(fake, fs.layer)))),
      "faked"
    )
    // the other order: the live layer is closer, so it wins
    strictEqual(await Effect.runPromise(readFile("a").pipe(Effect.provide(fs.layer), Effect.provide(fake))), "hello")
  })

  it("is provided, read, picked and omitted as one slot, and read as a value by Effect.service", async () => {
    const implementation = (path: string) => Effect.succeed(path)
    const context = Context.make(readFile, implementation)
    strictEqual(context.mapUnsafe.size, 1)
    strictEqual(Context.get(context, readFile), implementation)
    deepStrictEqual(Context.getOption(context, readFile), Option.some(implementation))
    strictEqual(Context.getOrUndefined(Context.empty(), readFile), undefined)
    strictEqual(Context.pick(readFile)(Context.add(context, stat, () => Effect.succeed(1))).mapUnsafe.size, 1)
    strictEqual(Context.omit(readFile)(context).mapUnsafe.size, 0)
    strictEqual(
      await Effect.runPromise(Effect.service(readFile).pipe(Effect.provideService(readFile, implementation))),
      implementation
    )
    // Layer.updateService maps the implementation a layer consumes
    const Size = Context.Service<number>("ContextTest/Size")
    const consumer = Layer.effect(Size, stat("a"))
    const doubled = Layer.updateService(consumer, stat, (f) => (path) => Effect.map(f(path), (n) => n * 2))
    strictEqual(
      await Effect.runPromise(Size.pipe(Effect.provide(doubled), Effect.provideService(stat, () => Effect.succeed(1)))),
      2
    )
  })

  it("dies naming the key when the implementation is missing at run time", async () => {
    await dies(readFile("a") as Effect.Effect<string>, /Service not found: ContextTest\/FS\/readFile/)
  })

  it("looks the implementation up each time the call result runs", async () => {
    const call = readFile("a")
    const one = Effect.provideService(call, readFile, () => Effect.succeed("one"))
    const two = Effect.provideService(call, readFile, () => Effect.succeed("two"))
    deepStrictEqual(await Effect.runPromise(Effect.all([one, two])), ["one", "two"])
  })

  it("returns exactly one kind of value: an Effect, a Stream or a Sink, decided by the constructor", async () => {
    assertTrue(Effect.isEffect(readFile("a")))
    assertFalse(Stream.isStream(readFile("a")))
    assertTrue(Stream.isStream(lines("a")))
    assertFalse(Effect.isEffect(lines("a")))
    assertTrue(Sink.isSink(collect("x")))
    assertFalse(Effect.isEffect(collect("x")))
    const fs = memory()
    fs.files.set("a", "1\n2")
    deepStrictEqual(
      await Effect.runPromise(Stream.runCollect(Stream.map(lines("a"), Number)).pipe(Effect.provide(fs.layer))),
      [1, 2]
    )
    // a Stream operation is overridden and looked up per run like an Effect operation
    const call = lines("a")
    const faked = Stream.runCollect(call).pipe(Effect.provideService(lines, () => Stream.make("x")))
    deepStrictEqual(
      await Effect.runPromise(Effect.all([Stream.runCollect(call).pipe(Effect.provide(fs.layer)), faked])),
      [
        ["1", "2"],
        ["x"]
      ]
    )
    const collected = Stream.make("a", "b").pipe(
      Stream.run(collect("x")),
      Effect.provideService(collect, (label) => Sink.map(Sink.collect<string>(), (items) => [label, ...items]))
    )
    deepStrictEqual(await Effect.runPromise(collected), ["x", "a", "b"])
  })

  it("is called by Effect.andThen, Effect.tap and Effect.flatMap, and forwards its receiver", async () => {
    const live = Layer.succeed(readFile, (path) => Effect.succeed(`read ${path}`))
    const program = Effect.all([
      Effect.andThen(Effect.succeed("a"), readFile),
      Effect.flatMap(Effect.succeed("b"), readFile),
      Effect.tap(Effect.succeed("c"), readFile)
    ])
    deepStrictEqual(await Effect.runPromise(Effect.provide(program, live)), ["read a", "read b", "c"])
    const greet = Context.Operation<(this: { name: string }, greeting: string) => Effect.Effect<string>>()(
      "ContextTest/greet"
    )
    const holder = { name: "world", greet }
    const greeted = holder.greet("hello").pipe(
      Effect.provideService(greet, function(greeting) {
        return Effect.succeed(`${greeting} ${this.name}`)
      })
    )
    strictEqual(await Effect.runPromise(greeted), "hello world")
  })

  it("keeps a generic signature when the shape names its key, and accepts Effect.fn implementations", async () => {
    const parse = Context.Operation<
      <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "ContextTest/parse">
    >()("ContextTest/parse")
    const parsed = parse(Number, "42").pipe(
      Effect.provideService(parse, (decode, input) => Effect.succeed(decode(input)))
    )
    strictEqual(await Effect.runPromise(parsed), 42)
    const live = Layer.succeed(
      readFile,
      Effect.fn("readFile")((path) => Effect.succeed(`fn ${path}`))
    )
    strictEqual(await Effect.runPromise(readFile("a").pipe(Effect.provide(live))), "fn a")
  })

  it("accepts an operation of no arguments, read the same standalone and through a record", async () => {
    const columns = Context.Operation<() => Effect.Effect<number>>()("ContextTest/Terminal/columns")
    const Terminal = Context.Operations("ContextTest/Terminal", { columns })
    const live = Layer.succeed(Terminal, { columns: () => Effect.succeed(80) })
    const program = Effect.gen(function*() {
      const terminal = yield* Terminal
      return [yield* columns(), yield* terminal.columns()]
    })
    deepStrictEqual(await Effect.runPromise(Effect.provide(program, live)), [80, 80])
  })

  describe("Operations", () => {
    it("is a key whose members are slots", () => {
      assertTrue(Context.isKey(FS))
      assertTrue(Context.isOperations(FS))
      assertFalse(Context.isOperation(FS))
      assertTrue(Effect.isEffect(FS))
      strictEqual(FS.key, "ContextTest/FS")
      strictEqual(FS.members.readFile, readFile)
      deepStrictEqual(JSON.parse(JSON.stringify(FS)), {
        _id: "Operations",
        key: "ContextTest/FS",
        members: ["readFile", "writeFile", "stat", "lines"]
      })
    })

    it("provides every member when provided as a record, and reads back the provided object", async () => {
      const live = record({ readFile: () => Effect.succeed("live"), writeFile: () => Effect.void })
      const program = Effect.gen(function*() {
        const fs = yield* FS
        return [fs, yield* backup("a"), yield* fs.readFile("a")] as const
      })
      const [fs, size, viaRecord] = await Effect.runPromise(Effect.provide(program, Layer.succeed(FS, live)))
      strictEqual(fs, live)
      strictEqual(size, 4)
      strictEqual(viaRecord, "live")
      strictEqual(await Effect.runPromise(FS.pipe(Effect.provideService(FS, live))), live)
      // stored under its own key and its members' keys; read back after enough additions to flatten the overlays
      let context = Context.make(FS, live)
      strictEqual(context.mapUnsafe.size, 5)
      strictEqual(context.mapUnsafe.get("ContextTest/FS/readFile"), live.readFile)
      const Other = Context.Service<number>("ContextTest/Other")
      for (let i = 0; i < 12; i++) context = Context.add(context, Other, i)
      strictEqual(Context.get(context, FS), live)
      strictEqual(Context.getOrUndefinedUnsafe(context, "ContextTest/FS"), live)
    })

    it("assembles the record from member layers, dying with the missing member's key", async () => {
      const fs = memory()
      fs.files.set("a", "abc")
      const program = Effect.flatMap(FS, (fs) => fs.stat("a"))
      strictEqual(await Effect.runPromise(Effect.provide(program, fs.layer)), 3)
      await dies(
        Effect.provide(program, Layer.mergeAll(fs.read, fs.write, fs.lines)) as Effect.Effect<number>,
        /Service not found: ContextTest\/FS\/stat/
      )
      // the optional getters report the record as absent while a member is missing
      const partial = Context.make(readFile, () => Effect.succeed(""))
      assertTrue(Option.isNone(Context.getOption(partial, FS)))
      strictEqual(Context.getOrUndefinedUnsafe(partial, "ContextTest/FS"), undefined)
      assert.throws(
        () => Context.get(partial as Context.Context<FS>, FS),
        /Service not found: ContextTest\/FS\/writeFile/
      )
    })

    it("lets one operation be overridden on top of a record, in both orders", async () => {
      const live = record({ readFile: () => Effect.succeed("live"), stat: () => Effect.succeed(1) })
      const fake = () => Effect.succeed("fake")
      const program = Effect.gen(function*() {
        const fs = yield* FS
        return [yield* readFile("a"), yield* fs.readFile("a"), yield* fs.stat("a"), fs] as const
      })
      // the override is closer: the call and the record view both see it, and the record is assembled once
      const [direct, viaRecord, other, fs] = await Effect.runPromise(
        program.pipe(Effect.provideService(readFile, fake), Effect.provide(Layer.succeed(FS, live)))
      )
      strictEqual(direct, "fake")
      strictEqual(viaRecord, "fake")
      strictEqual(other, 1)
      strictEqual(fs.readFile, fake)
      strictEqual(fs.stat, live.stat)
      // the record is closer: it wins, and the read returns the provided object
      const [, , , whole] = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.succeed(FS, live)), Effect.provideService(readFile, fake))
      )
      strictEqual(whole, live)
      // Layer.mock claims the record and dies on the members it lacks
      const mocked = Layer.mock(FS, { readFile: () => Effect.succeed("mocked") })
      strictEqual(await Effect.runPromise(readFile("a").pipe(Effect.provide(mocked))), "mocked")
      await dies(
        stat("a").pipe(Effect.provide(mocked)) as Effect.Effect<number>,
        /ContextTest\/FS: Unimplemented method "stat"/
      )
    })

    it("works with Effect.updateService and the Context functions", () => {
      const live = record({ readFile: () => Effect.succeed("live") })
      const context = Context.make(FS, live)
      const updated = Effect.runSync(
        Effect.map(FS, (fs) => fs.readFile).pipe(
          Effect.updateService(FS, (fs) => ({ ...fs, readFile: () => Effect.succeed("updated") })),
          Effect.provide(context)
        )
      )
      strictEqual(Effect.runSync(updated("a")), "updated")
      deepStrictEqual(Context.getOption(context, FS), Option.some(live))
      strictEqual(
        Context.pick(FS)(Context.add(context, Context.Service<number>("ContextTest/Other"), 1)).mapUnsafe.size,
        5
      )
      strictEqual(Context.pick(readFile)(context).mapUnsafe.size, 1)
      strictEqual(Context.omit(FS)(context).mapUnsafe.size, 0)
      // omitting a member drops the record's own slot: the record no longer agrees with its slots
      const withoutStat = Context.omit(stat)(context)
      strictEqual(withoutStat.mapUnsafe.size, 3)
      assertFalse(withoutStat.mapUnsafe.has("ContextTest/FS"))
      assertTrue(Option.isNone(Context.getOption(withoutStat, FS)))
    })

    it("never stores a record that disagrees with its slots in a flat map", () => {
      const live = record({ readFile: () => Effect.succeed("live") })
      const fake = () => Effect.succeed("fake")
      const Other = Context.Service<number>("ContextTest/Other")
      let context = Context.add(Context.make(FS, live), readFile, fake)
      for (let i = 0; i < 12; i++) context = Context.add(context, Other, i)
      assertFalse(context.mapUnsafe.has("ContextTest/FS"))
      strictEqual(Context.get(context, FS).readFile, fake)
      // merge: a member on the right drops the record on the left; a record on the right replaces a member
      const merged = Context.merge(Context.make(FS, live), Context.make(readFile, fake))
      assertFalse(merged.mapUnsafe.has("ContextTest/FS"))
      strictEqual(Context.get(merged, FS).readFile, fake)
      const reversed = Context.merge(Context.make(readFile, fake), Context.make(FS, live))
      strictEqual(Context.get(reversed, FS), live)
      strictEqual(Context.get(reversed, readFile), live.readFile)
      strictEqual(
        Context.get(Context.mergeAll(Context.make(FS, live), Context.make(readFile, fake)), FS).readFile,
        fake
      )
      // a marker never reaches mapUnsafe
      for (const value of Context.add(Context.make(FS, live), readFile, fake).mapUnsafe.values()) {
        assertFalse(typeof value === "symbol")
      }
    })

    it("accepts services, references and records as members", async () => {
      const sep = Context.Service<string>("ContextTest/Path/sep")
      const indent = Context.Reference<number>("ContextTest/Path/indent", { defaultValue: () => 2 })
      const Path = Context.Operations("ContextTest/Path", { sep, indent, fs: ReadOnly })
      const fsImpl = { readFile: () => Effect.succeed("nested"), stat: () => Effect.succeed(1) }
      const context = Context.make(Path, { sep: "/", indent: 4, fs: fsImpl })
      strictEqual(context.mapUnsafe.size, 6)
      strictEqual(Context.get(context, sep), "/")
      strictEqual(Context.get(context, ReadOnly), fsImpl)
      strictEqual(Context.get(context, readFile), fsImpl.readFile)
      // from member layers, a reference member reads its default
      const fromMembers = Context.mergeAll(Context.make(sep, "\\"), Context.make(ReadOnly, fsImpl))
      deepStrictEqual(Context.get(fromMembers, Path), { sep: "\\", indent: 2, fs: fsImpl })
      // a member written deeper down shadows the nested record and the outer record
      const shadowed = Context.add(context, readFile, () => Effect.succeed("deep"))
      strictEqual(await Effect.runPromise(Context.get(shadowed, Path).fs.readFile("a")), "deep")
      strictEqual(Context.omit(Path)(shadowed).mapUnsafe.size, 0)
    })

    it("treats a subset record as a record like any other, shadowing the full record slot by slot", async () => {
      const live = record({ readFile: () => Effect.succeed("full"), stat: () => Effect.succeed(1) })
      const subset = { readFile: () => Effect.succeed("subset"), stat: () => Effect.succeed(2) }
      // satisfied by the full record and by member layers
      const debug = await Effect.runPromise(
        Effect.map(ReadOnly, (fs) => fs).pipe(Effect.provide(Layer.succeed(FS, live)))
      )
      process.stdout.write(
        "DEBUG " + JSON.stringify(Object.keys(debug)) + " " + JSON.stringify(Object.keys(ReadOnly.members)) + "\n"
      )
      strictEqual(debug.readFile, live.readFile)
      const fs = memory()
      fs.files.set("a", "xyz")
      strictEqual(
        await Effect.runPromise(
          Effect.flatMap(ReadOnly, (fs) => fs.stat("a")).pipe(Effect.provide(Layer.mergeAll(fs.read, fs.size)))
        ),
        3
      )
      const over = Context.add(Context.make(FS, live), ReadOnly, subset)
      strictEqual(Context.get(over, ReadOnly), subset)
      strictEqual(Context.get(over, readFile), subset.readFile)
      strictEqual(Context.get(over, FS).readFile, subset.readFile)
      strictEqual(Context.get(over, FS).writeFile, live.writeFile)
      const under = Context.add(Context.make(ReadOnly, subset), FS, live)
      strictEqual(Context.get(under, FS), live)
      strictEqual(Context.get(under, ReadOnly).readFile, live.readFile)
    })

    it("shares one assembly across contexts on one base and rebuilds it when a member changes", () => {
      const Other = Context.Service<number>("ContextTest/Other")
      const base = Context.mergeAll(
        Context.make(readFile, () => Effect.succeed("one")),
        Context.make(stat, () => Effect.succeed(1))
      )
      const first = Context.get(base, ReadOnly)
      strictEqual(Context.get(base, ReadOnly), first)
      strictEqual(Context.get(Context.add(base, Other, 1), ReadOnly), first)
      strictEqual(Context.get(Context.add(base, Other, 2), ReadOnly), first)
      const fake = () => Effect.succeed("two")
      const replaced = Context.add(base, readFile, fake)
      const second = Context.get(replaced, ReadOnly)
      assert.notStrictEqual(second, first)
      strictEqual(second.readFile, fake)
      strictEqual(second.stat, first.stat)
      strictEqual(Context.get(replaced, ReadOnly), second)
      // a context whose overlays touch a member never shares the base's assembly
      const touched = Context.add(Context.add(base, readFile, fake), Other, 3)
      strictEqual(Context.get(touched, ReadOnly).readFile, fake)
      strictEqual(Context.get(Context.add(base, Other, 4), ReadOnly), first)
    })
  })

  describe("same string, same key", () => {
    const live = () => record({ readFile: () => Effect.succeed("live"), writeFile: () => Effect.void })
    const fake = () => Effect.succeed("fake")

    it("treats a second operation object with a member's string as that member", async () => {
      const twin = Context.Operation<Shape["readFile"]>()("ContextTest/FS/readFile")
      assert.notStrictEqual(twin, readFile)
      strictEqual(await Effect.runPromise(readFile("a").pipe(Effect.provideService(twin, fake))), "fake")
      const context = Context.add(Context.make(FS, live()), twin, fake)
      strictEqual(Context.get(context, FS).readFile, fake)
      strictEqual(Context.get(context, readFile), fake)
    })

    it("treats a Context.Service with a member's or a record's string as that member or record", () => {
      const Plain = Context.Service<"ContextTest/FS/readFile", Shape["readFile"]>("ContextTest/FS/readFile")
      const context = Context.add(Context.make(FS, live()), Plain, fake)
      strictEqual(Context.get(context, FS).readFile, fake)
      strictEqual(Context.get(context, readFile), fake)
      assertFalse(context.mapUnsafe.has("ContextTest/FS"))
      const PlainRecord = Context.Service<FS, Shape>("ContextTest/FS")
      const value = live()
      const spread = Context.make(PlainRecord, value)
      strictEqual(spread.mapUnsafe.size, 5)
      strictEqual(Context.get(spread, readFile), value.readFile)
      strictEqual(Context.get(spread, PlainRecord), value)
      strictEqual(Context.get(Context.add(spread, readFile, fake), PlainRecord).readFile, fake)
    })

    it("replaces a record's registration when it is constructed again under its string", () => {
      const Again = Context.Operations<FS, Shape>()("ContextTest/FS", { ...members })
      try {
        assert.notStrictEqual(Again, FS)
        const value = live()
        const context = Context.make(FS, value)
        strictEqual(Context.get(context, Again), value)
        strictEqual(Context.get(Context.make(Again, value), FS), value)
        // `writeFile` is a member of `FS` alone: a write lays the member and one marker, not one per construction
        const shadowed = Context.add(context, writeFile, () => Effect.void)
        let depth = 0
        for (let overlay = (shadowed as any).overlay; overlay; overlay = overlay.parent) depth++
        strictEqual(depth, 2)
        // `readFile` is a member of `FS` and `ReadOnly`: two markers
        depth = 0
        for (let overlay = (Context.add(context, readFile, fake) as any).overlay; overlay; overlay = overlay.parent) {
          depth++
        }
        strictEqual(depth, 3)
      } finally {
        // restore the original object as the registered record
        const restored = Context.Operations<FS, Shape>()("ContextTest/FS", members)
        strictEqual(restored.key, FS.key)
      }
    })

    it("keeps the storage invariants for writes and reads by string", () => {
      const value = live()
      const spread = Context.addUnsafe(Context.empty(), "ContextTest/FS", value)
      strictEqual(spread.mapUnsafe.size, 5)
      strictEqual(Context.get(spread as Context.Context<FS>, readFile), value.readFile)
      const shadowed = Context.addUnsafe(spread, "ContextTest/FS/readFile", fake)
      assertFalse(shadowed.mapUnsafe.has("ContextTest/FS"))
      strictEqual(Context.getOrUndefinedUnsafe<Shape>(shadowed, "ContextTest/FS")!.readFile, fake)
      strictEqual(Context.getOrUndefinedUnsafe(spread, "ContextTest/FS"), value)
    })

    it("gives a key built structurally one-slot semantics", () => {
      const Duck = { key: "ContextTest/duck" } as unknown as Context.Service<"ContextTest/duck", number>
      const context = Context.make(Duck, 1)
      strictEqual(context.mapUnsafe.size, 1)
      strictEqual(Context.get(context, Duck), 1)
      strictEqual(Context.get(Context.add(context, Duck, 2), Duck), 2)
      assertTrue(Option.isNone(Context.getOption(Context.empty(), Duck)))
      assert.throws(
        () => Context.get(Context.empty() as Context.Context<"ContextTest/duck">, Duck),
        /Service not found: ContextTest\/duck/
      )
      strictEqual(Context.pick(Duck)(context).mapUnsafe.size, 1)
      strictEqual(Context.omit(Duck)(context).mapUnsafe.size, 0)
    })
  })
})
