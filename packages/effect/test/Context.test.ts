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
  interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}
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
    it("is a key whose members are slots, and properties of the key", () => {
      assertTrue(Context.isKey(FS))
      assertTrue(Context.isOperations(FS))
      assertFalse(Context.isOperation(FS))
      assertTrue(Effect.isEffect(FS))
      strictEqual(FS.key, "ContextTest/FS")
      strictEqual(FS.members.readFile, readFile)
      // the members are properties of the key, so `FS.readFile(path)` is the operation
      strictEqual(FS.readFile, readFile)
      strictEqual(FS.lines, lines)
      deepStrictEqual(JSON.parse(JSON.stringify(FS)), {
        _id: "Operations",
        key: "ContextTest/FS",
        members: ["readFile", "writeFile", "stat", "lines"]
      })
      // a member whose name is a property of every key cannot be one
      const use = Context.Operation<() => Effect.Effect<void>>()("ContextTest/Bad/use")
      assert.throws(
        () => (Context.Operations as any)("ContextTest/Bad", { use }),
        /member "use" of ContextTest\/Bad has the name of a property of the key/
      )
    })

    it("provides every member when provided as a record, and reads back an object of the members", async () => {
      const live = record({ readFile: () => Effect.succeed("live"), writeFile: () => Effect.void })
      const program = Effect.gen(function*() {
        const fs = yield* FS
        return [fs, yield* backup("a"), yield* fs.readFile("a"), yield* FS.readFile("a")] as const
      })
      const [fs, size, viaRecord, viaKey] = await Effect.runPromise(Effect.provide(program, Layer.succeed(FS, live)))
      // the record read is a plain object with every member as its own property: the members, not the provided object
      deepStrictEqual(fs, live)
      assert.notStrictEqual(fs, live)
      strictEqual(Object.getPrototypeOf(fs), Object.prototype)
      deepStrictEqual(Object.keys(fs), ["readFile", "writeFile", "stat", "lines"])
      strictEqual(size, 4)
      strictEqual(viaRecord, "live")
      strictEqual(viaKey, "live")
      deepStrictEqual(await Effect.runPromise(FS.pipe(Effect.provideService(FS, live))), live)
      // stored one slot per member and nothing else; read back after enough additions to flatten the overlays
      let context = Context.make(FS, live)
      strictEqual(context.mapUnsafe.size, 4)
      strictEqual(context.mapUnsafe.get("ContextTest/FS/readFile"), live.readFile)
      assertFalse(context.mapUnsafe.has("ContextTest/FS"))
      const Other = Context.Service<number>("ContextTest/Other")
      for (let i = 0; i < 12; i++) context = Context.add(context, Other, i)
      deepStrictEqual(Context.get(context, FS), live)
      strictEqual(Context.getOrUndefinedUnsafe(context, "ContextTest/FS"), undefined)
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
      strictEqual(Context.getOrUndefined(partial, FS), undefined)
      strictEqual(Context.getOrElse(partial, FS, () => "none"), "none")
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
      // the override is closer: the call and the record both see it
      const [direct, viaRecord, other, fs] = await Effect.runPromise(
        program.pipe(Effect.provideService(readFile, fake), Effect.provide(Layer.succeed(FS, live)))
      )
      strictEqual(direct, "fake")
      strictEqual(viaRecord, "fake")
      strictEqual(other, 1)
      strictEqual(fs.readFile, fake)
      strictEqual(fs.stat, live.stat)
      // the record is closer: it wins for every member
      const [direct2, viaRecord2, , whole] = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.succeed(FS, live)), Effect.provideService(readFile, fake))
      )
      strictEqual(direct2, "live")
      strictEqual(viaRecord2, "live")
      deepStrictEqual(whole, live)
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
        4
      )
      strictEqual(Context.pick(readFile)(context).mapUnsafe.size, 1)
      strictEqual(Context.omit(FS)(context).mapUnsafe.size, 0)
      // omitting a member makes the record absent: there is no other slot
      const withoutStat = Context.omit(stat)(context)
      strictEqual(withoutStat.mapUnsafe.size, 3)
      assertTrue(Option.isNone(Context.getOption(withoutStat, FS)))
      assert.throws(
        () => Context.get(withoutStat as Context.Context<FS>, FS),
        /Service not found: ContextTest\/FS\/stat/
      )
    })

    it("overrides a member as an overlay, and reads the record as an object of the members, once per storage", () => {
      const live = record({ readFile: () => Effect.succeed("live") })
      const fake = () => Effect.succeed("fake")
      const Other = Context.Service<number>("ContextTest/Other")
      // a member write into a context holding the record is an ordinary overlay
      const overridden = Context.add(Context.make(FS, live), readFile, fake)
      strictEqual((overridden as any).overlay.key, "ContextTest/FS/readFile")
      strictEqual(Object.keys((overridden as any).overlay).join(), "key,value,parent")
      // the record read is a plain object with every member as its own property, the override among them, assembled
      // once for the overlay and remembered
      const view = Context.get(overridden, FS)
      strictEqual(Object.getPrototypeOf(view), Object.prototype)
      strictEqual(view.readFile, fake)
      strictEqual(view.writeFile, live.writeFile)
      deepStrictEqual(Object.keys(view), ["readFile", "writeFile", "stat", "lines"])
      deepStrictEqual({ ...view }, { ...live, readFile: fake })
      strictEqual(Context.get(overridden, FS), view)
      // contexts derived by unrelated writes share it; the original context reads the members it holds
      let context = overridden
      strictEqual(Context.get(Context.add(context, Other, 0), FS), view)
      deepStrictEqual(Context.get(Context.make(FS, live), FS), live)
      // the same context read through the overlay and through a flat map of the same slots has the same keys, in
      // the same order, and the same values: one rule for both. Deep additions rebase the overlays into a map too.
      const flat = Context.get(Context.makeUnsafe<FS>(new Map(context.mapUnsafe)), FS)
      assert.notStrictEqual(flat, view)
      deepStrictEqual(Object.keys(flat), Object.keys(view))
      deepStrictEqual(flat, view)
      strictEqual(Object.getPrototypeOf(flat), Object.prototype)
      for (let i = 0; i < 12; i++) context = Context.add(context, Other, i)
      strictEqual(context.mapUnsafe.get("ContextTest/FS/readFile"), fake)
      deepStrictEqual(Context.get(context, FS), view)
      strictEqual(Context.get(context, FS), Context.get(context, FS))
      // merge: a member on the right overrides the record on the left; a record on the right wins over a member
      const merged = Context.merge(Context.make(FS, live), Context.make(readFile, fake))
      strictEqual(Context.get(merged, FS).readFile, fake)
      strictEqual(Context.get(merged, FS).writeFile, live.writeFile)
      const reversed = Context.merge(Context.make(readFile, fake), Context.make(FS, live))
      deepStrictEqual(Context.get(reversed, FS), live)
      strictEqual(Context.get(reversed, readFile), live.readFile)
      strictEqual(
        Context.get(Context.mergeAll(Context.make(FS, live), Context.make(readFile, fake)), FS).readFile,
        fake
      )
      // every value in a flat map is a service: there are no markers
      for (const value of context.mapUnsafe.values()) assertFalse(typeof value === "symbol")
    })

    it("returns one object per storage when reads of two override contexts alternate", () => {
      const live = record({ readFile: () => Effect.succeed("live") })
      const base = Context.make(FS, live)
      // two requests, each with its own override over the same record
      const first = Context.add(base, readFile, () => Effect.succeed("first"))
      const second = Context.add(base, readFile, () => Effect.succeed("second"))
      const a = Context.get(first, FS)
      const b = Context.get(second, FS)
      assert.notStrictEqual(a, b)
      // the copy made for each overlay is remembered under it, not only in the one-entry cache
      for (let i = 0; i < 3; i++) {
        strictEqual(Context.get(first, FS), a)
        strictEqual(Context.get(second, FS), b)
      }
      strictEqual(Context.get(base, FS), Context.get(base, FS))
      strictEqual(a.writeFile, live.writeFile)
      strictEqual(b.writeFile, live.writeFile)
    })

    it("accepts a member whose value is undefined", async () => {
      const Optional = Context.Service<string | undefined>("ContextTest/Optional/value")
      const run = Context.Operation<() => Effect.Effect<string>>()("ContextTest/Optional/run")
      const Rec = Context.Operations("ContextTest/Optional", { value: Optional, run })
      const provided = { value: undefined, run: () => Effect.succeed("ran") }
      // written as a flat map and as overlays, read back with the member present and undefined
      const flat = Context.make(Rec, provided)
      const overlaid = Context.add(Context.make(Context.Service<number>("ContextTest/Other"), 1), Rec, provided)
      for (const context of [flat, overlaid]) {
        const view = Context.get(context, Rec)
        assertTrue(Object.hasOwn(view, "value"))
        strictEqual(view.value, undefined)
        strictEqual(Context.get(context, Optional), undefined)
        assertTrue(Option.isSome(Context.getOption(context, Rec)))
        strictEqual(context.mapUnsafe.has("ContextTest/Optional/value"), true)
      }
      strictEqual(await Effect.runPromise(Effect.provide(run(), Layer.succeed(Rec, provided))), "ran")
      // an absent member is still a defect: `in`, not `=== undefined`
      assert.throws(
        () => Context.make(Rec, { run: provided.run } as unknown as typeof provided),
        /Service not found: ContextTest\/Optional\/value/
      )
    })

    it("stores a method found on the provided object's prototype bound to it, and reads the members, not the instance", async () => {
      class Impl {
        readonly prefix = "instance:"
        readFile(path: string) {
          return Effect.succeed(this.prefix + path)
        }
        writeFile = (_path: string, _data: string) => Effect.void
        stat(path: string) {
          return Effect.map(this.readFile(path), (contents) => contents.length)
        }
        lines(_path: string) {
          return Stream.empty
        }
      }
      const instance = new Impl()
      const context = Context.make(FS, instance)
      // the slot holds a bound function for a prototype method, and the own arrow property as it is
      assert.notStrictEqual(Context.get(context, readFile), Impl.prototype.readFile)
      strictEqual(Context.get(context, writeFile), instance.writeFile)
      strictEqual(
        await Effect.runPromise(readFile("x").pipe(Effect.provide(Layer.succeed(FS, instance)))),
        "instance:x"
      )
      strictEqual(await Effect.runPromise(stat("x").pipe(Effect.provide(Layer.succeed(FS, instance)))), 10)
      // the record read is the members: a plain object, not the instance, so `instanceof` and the instance's other
      // properties do not survive a record read
      const fs = Context.get(context, FS)
      assertFalse(fs instanceof Impl)
      strictEqual(Object.getPrototypeOf(fs), Object.prototype)
      deepStrictEqual(Object.keys(fs), ["readFile", "writeFile", "stat", "lines"])
      assertFalse("prefix" in fs)
      strictEqual(fs.readFile, Context.get(context, readFile))
      strictEqual(await Effect.runPromise(fs.readFile("y")), "instance:y")
      strictEqual(await Effect.runPromise(fs.stat("y")), 10)
      // through overlays, after they are flattened, and in a fiber: the same members, bound once per write
      let added = Context.add(Context.make(Context.Service<number>("ContextTest/Other"), 0), FS, instance)
      deepStrictEqual(Object.keys(Context.get(added, FS)), Object.keys(fs))
      assert.notStrictEqual(Context.get(added, FS).readFile, fs.readFile)
      strictEqual(await Effect.runPromise(Effect.provide(readFile("y"), added)), "instance:y")
      strictEqual(await Effect.runPromise(Context.get(added, FS).stat("y")), 10)
      for (let i = 0; i < 12; i++) added = Context.add(added, Context.Service<number>("ContextTest/Other"), i)
      strictEqual(await Effect.runPromise(Context.get(added, FS).stat("y")), 10)
      strictEqual(
        await Effect.runPromise(
          Effect.flatMap(FS, (fs) => fs.readFile("y")).pipe(Effect.provide(Layer.succeed(FS, instance)))
        ),
        "instance:y"
      )
      // a bound method reads `this` from the instance, so a sibling call through `this` reads the instance's member and
      // not an override of it, standalone and through the record alike: a known limit, the same as a closure in a
      // plain object that calls a sibling closure
      const overridden = Context.add(context, readFile, () => Effect.succeed("fake!"))
      strictEqual(await Effect.runPromise(Effect.provide(stat("x"), overridden)), 10)
      strictEqual(await Effect.runPromise(Effect.provide(Effect.flatMap(FS, (fs) => fs.stat("x")), overridden)), 10)
      strictEqual(Context.get(overridden, FS).stat, Context.get(context, stat))
      // Layer.mock's proxy has no prototype methods: its members are stored as the proxy returns them
      const mocked = Layer.mock(FS, { readFile: () => Effect.succeed("mocked") })
      strictEqual(await Effect.runPromise(readFile("a").pipe(Effect.provide(mocked))), "mocked")
    })

    it("keeps a class with private fields working after one member is overridden", async () => {
      class Impl {
        #count = 0
        readFile(path: string) {
          this.#count++
          return Effect.succeed(`${path}:${this.#count}`)
        }
        writeFile(_path: string, _data: string) {
          return Effect.void
        }
        stat(_path: string) {
          return Effect.succeed(this.#count)
        }
        lines(_path: string) {
          return Stream.empty
        }
      }
      const instance = new Impl()
      const program = Effect.gen(function*() {
        const fs = yield* FS
        const read = yield* fs.readFile("a")
        const copy = { ...fs }
        return [read, yield* fs.stat("a"), yield* stat("a"), yield* copy.stat("a"), fs instanceof Impl] as const
      })
      // a method that reads a private field runs through the record, standalone, and through a spread copy, because
      // it is bound to the instance; the record read itself is not an instance of the class
      deepStrictEqual(
        await Effect.runPromise(
          program.pipe(Effect.provideService(writeFile, () => Effect.void), Effect.provide(Layer.succeed(FS, instance)))
        ),
        ["a:1", 1, 1, 1, false]
      )
    })

    it("writes a record added to a context as one overlay per slot, counting as one add, whatever the context's size", () => {
      const live = record({ readFile: () => Effect.succeed("live") })
      const Other = Context.Service<number>("ContextTest/Other")
      const small = Context.make(Other, 1)
      const added = Context.add(small, FS, live)
      // one ordinary overlay per member, the base map the one of the context added to
      const chain: Array<[string, unknown]> = []
      for (let o = (added as any).overlay; o !== undefined; o = o.parent) {
        strictEqual(Object.keys(o).join(), "key,value,parent")
        chain.unshift([o.key, o.value])
      }
      deepStrictEqual(chain, [
        ["ContextTest/FS/readFile", live.readFile],
        ["ContextTest/FS/writeFile", live.writeFile],
        ["ContextTest/FS/stat", live.stat],
        ["ContextTest/FS/lines", live.lines]
      ])
      strictEqual((added as any).base, (small as any).base)
      strictEqual((added as any).depth, 1)
      strictEqual(added.mapUnsafe.size, 5)
      deepStrictEqual(Context.get(added, FS), live)
      strictEqual(Context.get(added, readFile), live.readFile)
      strictEqual(Context.get(added, Other), 1)
      strictEqual(Context.get(Context.add(added, Other, 2), Other), 2)
      // into three hundred slots: the same overlays, no copy of the map
      const big = Context.mergeAll(
        ...Array.from({ length: 300 }, (_, i) => Context.make(Context.Service<number>(`ContextTest/Wide/${i}`), i))
      )
      const bigAdded = Context.add(big, FS, live)
      strictEqual((bigAdded as any).base, (big as any).base)
      strictEqual((bigAdded as any).overlay.key, "ContextTest/FS/lines")
      deepStrictEqual(Context.get(bigAdded, FS), live)
      strictEqual(bigAdded.mapUnsafe.size, 304)
      // an empty context and a context at its overlay depth take the record as a flat map, as `make` does
      strictEqual((Context.make(FS, live) as any).overlay, undefined)
      let deep: Context.Context<any> = small
      for (let i = 0; i < 8; i++) deep = Context.add(deep, Context.Service<number>(`ContextTest/Deep/${i}`), i)
      const flattened = Context.add(deep, FS, live)
      strictEqual((flattened as any).overlay, undefined)
      deepStrictEqual(Context.get(flattened, FS), live)
      strictEqual(flattened.mapUnsafe.size, 13)
      // the overlays are seen by `pick`, `omit`, `merge` and the string-keyed readers like any slots
      strictEqual(Context.getOrUndefinedUnsafe(added, "ContextTest/FS/readFile"), live.readFile)
      strictEqual(Context.omit(FS)(added).mapUnsafe.size, 1)
      strictEqual(Context.pick(readFile)(added).mapUnsafe.size, 1)
      deepStrictEqual(Context.get(Context.merge(Context.make(Other, 3), added), FS), live)
    })

    it("owns the map given to makeUnsafe: a record is assembled from it once", () => {
      const live = record({ readFile: () => Effect.succeed("live") })
      const fake = () => Effect.succeed("fake")
      // a copy of a context's map reads as the original
      const map = new Map(Context.make(FS, live).mapUnsafe)
      const copied = Context.makeUnsafe<FS>(map)
      deepStrictEqual(Context.get(copied, FS), live)
      strictEqual(Context.get(copied, readFile), live.readFile)
      // the map is the context's storage: a slot changed behind it is read by the member, while the record assembled
      // for that storage stays what it was. Contexts are not mutated after construction.
      map.set("ContextTest/FS/readFile", fake)
      strictEqual(Context.get(copied, readFile), fake)
      strictEqual(Context.get(copied, FS).readFile, live.readFile)
      // a map mutated before the first read is read as it stands
      const fresh = new Map(Context.make(FS, live).mapUnsafe)
      const late = Context.makeUnsafe<FS>(fresh)
      fresh.set("ContextTest/FS/readFile", fake)
      strictEqual(Context.get(late, FS).readFile, fake)
      deepStrictEqual(Context.get(late, FS), { ...live, readFile: fake })
    })

    it("accepts services, references and records as members", async () => {
      const sep = Context.Service<string>("ContextTest/Path/sep")
      const indent = Context.Reference<number>("ContextTest/Path/indent", { defaultValue: () => 2 })
      const Path = Context.Operations("ContextTest/Path", { sep, indent, fs: ReadOnly })
      const fsImpl = { readFile: () => Effect.succeed("nested"), stat: () => Effect.succeed(1) }
      const context = Context.make(Path, { sep: "/", indent: 4, fs: fsImpl })
      strictEqual(context.mapUnsafe.size, 4)
      strictEqual(Context.get(context, sep), "/")
      deepStrictEqual(Context.get(context, ReadOnly), fsImpl)
      strictEqual(Context.get(context, readFile), fsImpl.readFile)
      deepStrictEqual(Context.get(context, Path), { sep: "/", indent: 4, fs: fsImpl })
      // from member layers, a reference member reads its default
      const fromMembers = Context.mergeAll(Context.make(sep, "\\"), Context.make(ReadOnly, fsImpl))
      deepStrictEqual(Context.get(fromMembers, Path), { sep: "\\", indent: 2, fs: fsImpl })
      // a member written deeper down shadows the nested record and the outer record
      const shadowed = Context.add(context, readFile, () => Effect.succeed("deep"))
      strictEqual(await Effect.runPromise(Context.get(shadowed, Path).fs.readFile("a")), "deep")
      strictEqual(await Effect.runPromise(Context.get(shadowed, ReadOnly).readFile("a")), "deep")
      // a nested record written on top replaces the nested members
      const replaced = Context.add(shadowed, ReadOnly, { readFile: () => Effect.succeed("again"), stat: fsImpl.stat })
      strictEqual(await Effect.runPromise(Context.get(replaced, Path).fs.readFile("a")), "again")
      strictEqual(Context.omit(Path)(shadowed).mapUnsafe.size, 0)
    })

    it("treats a subset record as a record like any other, shadowing the full record slot by slot", async () => {
      const live = record({ readFile: () => Effect.succeed("full"), stat: () => Effect.succeed(1) })
      const subset = { readFile: () => Effect.succeed("subset"), stat: () => Effect.succeed(2) }
      // satisfied by the full record and by member layers
      const viaFull = await Effect.runPromise(
        Effect.map(ReadOnly, (fs) => fs).pipe(Effect.provide(Layer.succeed(FS, live)))
      )
      strictEqual(viaFull.readFile, live.readFile)
      deepStrictEqual(Object.keys(viaFull), ["readFile", "stat"])
      const fs = memory()
      fs.files.set("a", "xyz")
      strictEqual(
        await Effect.runPromise(
          Effect.flatMap(ReadOnly, (fs) => fs.stat("a")).pipe(Effect.provide(Layer.mergeAll(fs.read, fs.size)))
        ),
        3
      )
      const over = Context.add(Context.make(FS, live), ReadOnly, subset)
      deepStrictEqual(Context.get(over, ReadOnly), subset)
      strictEqual(Context.get(over, readFile), subset.readFile)
      strictEqual(Context.get(over, FS).readFile, subset.readFile)
      strictEqual(Context.get(over, FS).writeFile, live.writeFile)
      const under = Context.add(Context.make(ReadOnly, subset), FS, live)
      deepStrictEqual(Context.get(under, FS), live)
      strictEqual(Context.get(under, ReadOnly).readFile, live.readFile)
    })

    it("assembles a record that was never written once per storage, from the members' slots", () => {
      const Other = Context.Service<number>("ContextTest/Other")
      const base = Context.mergeAll(
        Context.make(readFile, () => Effect.succeed("one")),
        Context.make(stat, () => Effect.succeed(1))
      )
      // no slot: the record is not in the map, and a read assembles it
      assertFalse(base.mapUnsafe.has("ContextTest/FS/ReadOnly"))
      const first = Context.get(base, ReadOnly)
      strictEqual(Context.get(base, ReadOnly), first)
      strictEqual(first.readFile, Context.get(base, readFile))
      assertFalse(base.mapUnsafe.has("ContextTest/FS/ReadOnly"))
      // a derived context whose members are the same values shares the object
      strictEqual(Context.get(Context.add(base, Other, 1), ReadOnly), first)
      // a member written on top is assembled again for its overlay: a plain object of the members, remembered
      const fake = () => Effect.succeed("two")
      const replaced = Context.add(base, readFile, fake)
      const second = Context.get(replaced, ReadOnly)
      strictEqual(second.readFile, fake)
      strictEqual(second.stat, first.stat)
      strictEqual(Object.getPrototypeOf(second), Object.prototype)
      deepStrictEqual(Object.keys(second), ["readFile", "stat"])
      strictEqual(Context.get(replaced, ReadOnly), second)
      strictEqual(Context.get(base, ReadOnly), first)
    })

    it("assembles members provided as separate overlays, in every mix of overlay and flat map", async () => {
      const Other = Context.Service<number>("ContextTest/Other")
      const one = () => Effect.succeed("one")
      const two = () => Effect.succeed("two")
      const size = () => Effect.succeed(1)
      const live = record({ readFile: one, stat: size })
      // two member overlays and no record: the read collects both
      const overlays = Context.add(Context.add(Context.empty(), readFile, one), stat, size)
      deepStrictEqual(Context.get(overlays, ReadOnly), { readFile: one, stat: size })
      // a member in the flat map and one as an overlay
      const mixed = Context.add(Context.make(readFile, one), stat, size)
      deepStrictEqual(Context.get(mixed, ReadOnly), { readFile: one, stat: size })
      // a member overlay above a record's overlays, and below them
      const above = Context.add(Context.add(Context.make(Other, 0), FS, live), readFile, two)
      strictEqual(Context.get(above, FS).readFile, two)
      strictEqual(Context.get(above, FS).stat, size)
      strictEqual(Context.get(above, ReadOnly).readFile, two)
      const below = Context.add(Context.add(Context.make(Other, 0), readFile, two), FS, live)
      deepStrictEqual(Context.get(below, FS), live)
      strictEqual(Context.get(below, readFile), one)
      // a subset record above the full record, and the full record above the subset
      const subsetAbove = Context.add(Context.make(FS, live), ReadOnly, { readFile: two, stat: size })
      strictEqual(Context.get(subsetAbove, FS).readFile, two)
      strictEqual(Context.get(subsetAbove, FS).writeFile, live.writeFile)
      deepStrictEqual(Context.get(subsetAbove, FS), { ...live, readFile: two, stat: size })
      const fullAbove = Context.add(Context.make(ReadOnly, { readFile: two, stat: size }), FS, live)
      deepStrictEqual(Context.get(fullAbove, FS), live)
      strictEqual(Context.get(fullAbove, ReadOnly).readFile, one)
      // in a fiber: provideService chains, with no record ever provided
      const program = Effect.gen(function*() {
        const fs = yield* ReadOnly
        return [yield* fs.readFile("a"), yield* fs.stat("a"), yield* readFile("a")] as const
      })
      deepStrictEqual(
        await Effect.runPromise(
          program.pipe(Effect.provideService(readFile, one), Effect.provideService(stat, size))
        ),
        ["one", 1, "one"]
      )
      deepStrictEqual(
        await Effect.runPromise(
          program.pipe(
            Effect.provideService(readFile, two),
            Effect.provide(Layer.mergeAll(Layer.succeed(readFile, one), Layer.succeed(stat, size)))
          )
        ),
        ["two", 1, "two"]
      )
    })

    it("spreads, copies and re-provides a record read as the record it stands for", async () => {
      const live = record({ readFile: () => Effect.succeed("live"), stat: () => Effect.succeed(1) })
      const fake = () => Effect.succeed("fake")
      const program = Effect.gen(function*() {
        const fs = yield* FS
        return [yield* fs.readFile("a"), yield* fs.stat("a"), Object.keys(fs).length] as const
      })
      // a spread decorator through updateService: every member survives, and the override is kept
      deepStrictEqual(
        await Effect.runPromise(
          program.pipe(
            Effect.updateService(FS, (fs) => ({ ...fs, stat: () => Effect.succeed(2) })),
            Effect.provideService(readFile, fake),
            Effect.provide(Layer.succeed(FS, live))
          )
        ),
        ["fake", 2, 4]
      )
      // the same through a Layer.effect decorator built on the record
      const decorated = Layer.effect(FS, Effect.map(FS, (fs) => ({ ...fs })))
      deepStrictEqual(
        await Effect.runPromise(
          program.pipe(
            Effect.provide(decorated),
            Effect.provideService(readFile, fake),
            Effect.provide(Layer.succeed(FS, live))
          )
        ),
        ["fake", 1, 4]
      )
      // Effect.updateService over the record, standalone call afterwards
      strictEqual(
        await Effect.runPromise(
          readFile("a").pipe(
            Effect.updateService(FS, (fs) => ({ ...fs })),
            Effect.provideService(readFile, fake),
            Effect.provide(Layer.succeed(FS, live))
          )
        ),
        "fake"
      )
    })

    it("dies naming the missing member when a record is provided without one", async () => {
      const partial = { readFile: () => Effect.succeed("live") } as unknown as Shape
      assert.throws(
        () => Context.make(FS, partial),
        /Service not found: ContextTest\/FS\/writeFile \(the object provided for ContextTest\/FS has no member "writeFile"\)/
      )
      assert.throws(
        () => Context.add(Context.make(Context.Service<number>("ContextTest/Other"), 1), FS, partial),
        /writeFile/
      )
      assert.throws(() => Context.make(FS, null as unknown as Shape), /ContextTest\/FS\/readFile/)
      // a layer built from the record writes it when the layer is built, so the defect is raised there
      assert.throws(() => Layer.succeed(FS, partial), /ContextTest\/FS\/writeFile/)
      await dies(
        Effect.provide(readFile("a"), Layer.effect(FS, Effect.succeed(partial))),
        /ContextTest\/FS\/writeFile/
      )
    })

    it("depends only on the slots a context holds, not on which records exist or when they were built", () => {
      const fake = () => Effect.succeed("fake")
      const live = record({ readFile: () => Effect.succeed("live") })
      // a member written before any record is in the context is a plain slot; a record written later wins slot by slot
      const early = Context.add(Context.make(readFile, fake), FS, live)
      deepStrictEqual(Context.get(early, FS), live)
      strictEqual(Context.get(early, readFile), live.readFile)
      // a record constructed after the context exists reads it like any other
      const Late = Context.Operations("ContextTest/Late", { readFile, stat })
      const members = Context.mergeAll(Context.make(readFile, fake), Context.make(stat, () => Effect.succeed(2)))
      strictEqual(Context.get(members, Late).readFile, fake)
      strictEqual(Context.get(Context.add(members, Late, { readFile: fake, stat: live.stat }), stat), live.stat)
      // constructing records does nothing to contexts that do not hold them: a member write into a context
      // holding `FS` is seen by `FS` and nothing else changes, however many records over `readFile` exist
      const subsets = Array.from({ length: 50 }, (_, i) => Context.Operations(`ContextTest/Subset/${i}`, { readFile }))
      strictEqual(subsets.length, 50)
      const context = Context.add(Context.make(FS, live), readFile, fake)
      strictEqual(context.mapUnsafe.size, 4)
      strictEqual(Context.get(context, FS).readFile, fake)
      // and a context holding one record is unaffected by writes into a context holding another
      const other = Context.add(Context.make(ReadOnly, { readFile: fake, stat: live.stat }), readFile, live.readFile)
      strictEqual(Context.get(other, ReadOnly).readFile, live.readFile)
      strictEqual(Context.get(context, FS).readFile, fake)
    })
  })

  describe("Operation.value", () => {
    const columns = Context.Operation.value<Effect.Effect<number>>()("ContextTest/Terminal/columns")
    const display = Context.Operation<(text: string) => Effect.Effect<void>>()("ContextTest/Terminal/display")
    const Terminal = Context.Operations("ContextTest/Terminal", { columns, display })

    it("is an Effect and a slot, not a function and not a Context.Key", () => {
      assertTrue(Effect.isEffect(columns))
      assertFalse(Stream.isStream(columns))
      assertTrue(Context.isOperation(columns))
      assertFalse(Context.isKey(columns))
      assertFalse(typeof columns === "function")
      strictEqual(columns.key, "ContextTest/Terminal/columns")
      deepStrictEqual(JSON.parse(JSON.stringify(columns)), { _id: "Operation", key: "ContextTest/Terminal/columns" })
    })

    it("runs the Effect stored under its key, standalone and through the record, where it is that Effect", async () => {
      const width = Effect.succeed(80)
      strictEqual(await Effect.runPromise(columns.pipe(Effect.provide(Layer.succeed(columns, width)))), 80)
      strictEqual(await Effect.runPromise(Effect.provideService(columns, columns, Effect.succeed(40))), 40)
      const terminal = { columns: width, display: () => Effect.void }
      const program = Effect.gen(function*() {
        const record = yield* Terminal
        return [yield* columns, yield* record.columns, record.columns] as const
      })
      const [standalone, viaRecord, member] = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.succeed(Terminal, terminal)))
      )
      strictEqual(standalone, 80)
      strictEqual(viaRecord, 80)
      strictEqual(member, width)
      // overridden on top of the record like any slot, and seen by the record view
      const [overridden, viaRecordOverridden] = await Effect.runPromise(
        program.pipe(
          Effect.provideService(columns, Effect.succeed(120)),
          Effect.provide(Layer.succeed(Terminal, terminal))
        )
      )
      strictEqual(overridden, 120)
      strictEqual(viaRecordOverridden, 120)
      await dies(columns as unknown as Effect.Effect<number>, /Service not found: ContextTest\/Terminal\/columns/)
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

    it("treats a Context.Service with a member's string as that member, and one with a record's string as a slot", () => {
      const Plain = Context.Service<"ContextTest/FS/readFile", Shape["readFile"]>("ContextTest/FS/readFile")
      const context = Context.add(Context.make(FS, live()), Plain, fake)
      strictEqual(Context.get(context, FS).readFile, fake)
      strictEqual(Context.get(context, readFile), fake)
      // a record's string is not a slot of the record: a key built with it writes and reads one slot of its own, which
      // the record never writes or reads
      const PlainRecord = Context.Service<FS, Shape>("ContextTest/FS")
      const value = live()
      const one = Context.make(PlainRecord, value)
      strictEqual(one.mapUnsafe.size, 1)
      strictEqual(Context.get(one, PlainRecord), value)
      assertTrue(Option.isNone(Context.getOption(one, FS)))
      assert.throws(() => Context.get(one, FS), /Service not found: ContextTest\/FS\/readFile/)
      assertTrue(Option.isNone(Context.getOption(one, readFile)))
      assertTrue(Option.isNone(Context.getOption(Context.make(FS, value), PlainRecord)))
      // written over a stored record, it adds a slot the record does not read
      const stored = live()
      const replaced = Context.add(Context.make(FS, stored), PlainRecord, value)
      strictEqual(Context.get(replaced, PlainRecord), value)
      strictEqual(replaced.mapUnsafe.size, 5)
      deepStrictEqual(Context.get(replaced, FS), stored)
    })

    it("treats a record constructed again under its string as the same record", () => {
      const Again = Context.Operations<FS, Shape>()("ContextTest/FS", { ...members })
      assert.notStrictEqual(Again, FS)
      const value = live()
      const context = Context.make(FS, value)
      deepStrictEqual(Context.get(context, Again), value)
      deepStrictEqual(Context.get(Context.make(Again, value), FS), value)
      // a member override is seen through either object, as equal objects
      const write = () => Effect.void
      const shadowed = Context.add(context, writeFile, write)
      strictEqual(shadowed.mapUnsafe.size, 4)
      strictEqual(Context.get(shadowed, Again).writeFile, write)
      deepStrictEqual(Context.get(shadowed, FS), Context.get(shadowed, Again))
      strictEqual(Context.get(Context.add(Context.make(Again, value), readFile, fake), FS).readFile, fake)
    })

    it("treats a write by string as a write of that one slot", () => {
      const value = live()
      // a record's string written by `addUnsafe` is one slot, which the record key never reads
      const one = Context.addUnsafe(Context.empty(), "ContextTest/FS", value)
      strictEqual(one.mapUnsafe.size, 1)
      strictEqual(Context.getOrUndefinedUnsafe(one, "ContextTest/FS"), value)
      assertTrue(Option.isNone(Context.getOption(one, FS)))
      assertTrue(Option.isNone(Context.getOption(one, readFile)))
      // a member's string written by `addUnsafe` is that member, in the member read and in the record read
      const shadowed = Context.addUnsafe(Context.make(FS, value), "ContextTest/FS/readFile", fake)
      strictEqual(Context.get(shadowed, readFile), fake)
      strictEqual(Context.get(shadowed, FS).readFile, fake)
      // a read by string is the slot: a member's string is the member, and a record's string is nothing the record
      // wrote, whether or not the record was provided
      strictEqual(Context.getOrUndefinedUnsafe(shadowed, "ContextTest/FS/readFile"), fake)
      strictEqual(Context.getOrUndefinedUnsafe(shadowed, "ContextTest/FS"), undefined)
      strictEqual(Context.getOrUndefinedUnsafe(Context.make(FS, value), "ContextTest/FS"), undefined)
      strictEqual(Context.getOrUndefinedUnsafe(Context.make(readFile, fake), "ContextTest/FS/ReadOnly"), undefined)
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
