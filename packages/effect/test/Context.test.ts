import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redactable from "effect/Redactable"
import * as Stream from "effect/Stream"
import { describe, it } from "vitest"

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

  describe("overridable", () => {
    const makeGreet = () => Context.overridable("ContextTest/greet", (name: string) => Effect.succeed(`hello ${name}`))

    it("runs the default when nothing is provided", async () => {
      const greet = makeGreet()
      strictEqual(await Effect.runPromise(greet("a")), "hello a")
    })

    it("is overridden through Effect.provideService on its reference", async () => {
      const greet = makeGreet()
      const result = await Effect.runPromise(
        greet("a").pipe(Effect.provideService(greet.reference, (name) => Effect.succeed(`hi ${name}`)))
      )
      strictEqual(result, "hi a")
    })

    it("is overridden through Layer.succeed on its reference", async () => {
      const greet = makeGreet()
      const layer = Layer.succeed(greet.reference, (name) => Effect.succeed(`hey ${name}`))
      strictEqual(await Effect.runPromise(Effect.provide(greet("a"), layer)), "hey a")
    })

    it("looks up the implementation when the result runs, not when the function is called", async () => {
      const greet = makeGreet()
      const call = greet("a")
      const result = await Effect.runPromise(Effect.all([
        call,
        call.pipe(Effect.provideService(greet.reference, (name) => Effect.succeed(`later ${name}`)))
      ]))
      deepStrictEqual(result, ["hello a", "later a"])
    })

    it("a Stream-returning function works through its Stream side and its Effect side", async () => {
      const range = Context.overridable(
        "ContextTest/range",
        (n: number) => Stream.fromIterable(Array.from({ length: n }, (_, i) => i + 1))
      )
      const override = (n: number) => Stream.make(-n)
      const viaStream = Stream.runCollect(range(3))
      // The Effect side of a call resolves to the Stream the implementation returns
      const viaEffect = Effect.flatMap(range(3) as unknown as Effect.Effect<Stream.Stream<number>>, Stream.runCollect)
      const results = await Effect.runPromise(Effect.all([
        viaStream,
        viaEffect,
        viaStream.pipe(Effect.provideService(range.reference, override)),
        viaEffect.pipe(Effect.provideService(range.reference, override))
      ]))
      deepStrictEqual(results, [[1, 2, 3], [1, 2, 3], [-3], [-3]])
    })

    it("Effect.andThen calls the function instead of treating it as an effect", async () => {
      const greet = makeGreet()
      strictEqual(await Effect.runPromise(Effect.succeed("a").pipe(Effect.andThen(greet))), "hello a")
    })

    it("an Effect value runs its default and its override", async () => {
      const loadConfig = Context.overridable("ContextTest/loadConfig", Effect.succeed("default"))
      const results = await Effect.runPromise(Effect.all([
        loadConfig,
        loadConfig.pipe(Effect.provideService(loadConfig.reference, Effect.succeed("override")))
      ]))
      deepStrictEqual(results, ["default", "override"])
    })

    it("a Stream value runs its default and its override", async () => {
      const events = Context.overridable("ContextTest/events", Stream.make(1, 2, 3))
      const results = await Effect.runPromise(Effect.all([
        Stream.runCollect(events),
        Stream.runCollect(events).pipe(Effect.provideService(events.reference, Stream.make(9)))
      ]))
      deepStrictEqual(results, [[1, 2, 3], [9]])
    })

    it("looks up a value's implementation when it runs", async () => {
      const loadConfig = Context.overridable("ContextTest/loadConfigLater", Effect.succeed("default"))
      const overridden = loadConfig.pipe(Effect.provideService(loadConfig.reference, Effect.succeed("override")))
      const results = await Effect.runPromise(Effect.all([loadConfig, overridden, loadConfig]))
      deepStrictEqual(results, ["default", "override", "default"])
    })
  })
})
