import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Equal from "effect/Equal"
import * as Option from "effect/Option"
import * as Redactable from "effect/Redactable"
import { describe, it } from "vitest"

// The fields below have no public accessor; tests that pin them cast
// through this explicit shape instead of bare `any`, so a typo'd field
// name is a type error rather than a silent `undefined`.
interface ContextInternals {
  readonly depth: number
  readonly overlay: unknown
  readonly _flat: unknown
  readonly baseHits: number
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
    const Undefined = Context.Service<undefined>("ContextTest/Undefined", { fiberCached: true })
    const Missing = Context.Service<undefined>("ContextTest/Missing")
    const Ref = Context.Reference<string | undefined>("ContextTest/UndefinedRef", {
      defaultValue: () => "default",
      fiberCached: true
    })
    const context = Context.make(Undefined, undefined).pipe(Context.add(Ref, undefined))

    assertTrue(Context.getOption(context, Undefined)._tag === "Some")
    assertTrue(Context.getOption(context, Missing)._tag === "None")
    strictEqual(Context.getUnsafe(context, Undefined), undefined)
    strictEqual(Context.getOrElse(context, Undefined, () => 1), undefined)
    deepStrictEqual(Context.getOption(context, Ref), Option.some(undefined))
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

  it("honors an explicit maxDepth override, inherited across add and rebase", () => {
    const base = Context.makeUnsafe(new Map(), { maxDepth: 2 })
    const keys = Array.from({ length: 6 }, (_, i) => Context.Service<number>(`ContextTest/Override${i}`))

    let context: Context.Context<never> = base
    context = Context.add(context, keys[0], 0)
    context = Context.add(context, keys[1], 1)
    // Still within the override: no rebase yet, even though the base is tiny
    let impl = context as any as ContextInternals
    strictEqual(impl.overlay !== undefined, true)
    strictEqual(impl.depth, 2)

    context = Context.add(context, keys[2], 2)
    // One push past the override -> rebase, well below the default floor of 8
    impl = context as any as ContextInternals
    strictEqual(impl.overlay, undefined)
    strictEqual(impl.depth, 0)

    // The override survives the rebase and keeps applying afterwards
    context = Context.add(context, keys[3], 3)
    impl = context as any as ContextInternals
    strictEqual(impl.overlay !== undefined, true)
    strictEqual(impl.depth, 1)

    context = Context.add(context, keys[4], 4)
    impl = context as any as ContextInternals
    strictEqual(impl.depth, 2)
    strictEqual(impl.overlay !== undefined, true)

    context = Context.add(context, keys[5], 5)
    impl = context as any as ContextInternals
    strictEqual(impl.depth, 0)
    strictEqual(impl.overlay, undefined)

    strictEqual(context.mapUnsafe.size, keys.length)
    for (let i = 0; i < keys.length; i++) {
      strictEqual(Context.getUnsafe(context, keys[i]), i)
    }
  })

  it("falls back to the default depth for an invalid maxDepth", () => {
    const keys = Array.from({ length: 9 }, (_, i) => Context.Service<number>(`ContextTest/Invalid${i}`))
    for (const invalid of [Number.NaN, -1, 1.5, -Infinity, Infinity]) {
      let context: Context.Context<never> = Context.makeUnsafe(new Map(), { maxDepth: invalid })
      for (let i = 0; i < 8; i++) {
        context = Context.add(context, keys[i], i)
      }
      let impl = context as any as ContextInternals
      strictEqual(impl.depth, 8)
      strictEqual(impl.overlay !== undefined, true)

      context = Context.add(context, keys[8], 8)
      impl = context as any as ContextInternals
      strictEqual(impl.depth, 0)
      strictEqual(impl.overlay, undefined)
    }
  })

  it("preserves the maxDepth override through merge, omit, and pick", () => {
    const A = Context.Service<number>("ContextTest/OverrideMergeA")
    const B = Context.Service<number>("ContextTest/OverrideMergeB")
    const base = Context.add(Context.makeUnsafe(new Map(), { maxDepth: 2 }), A, 1)

    for (
      let context of [
        Context.omit(A)(base),
        Context.merge(base, Context.make(B, 2)),
        Context.pick(A)(base),
        Context.addOrOmit(A, Option.none())(base)
      ]
    ) {
      context = Context.add(context, A, 3)
      context = Context.add(context, B, 4)
      let impl = context as any as ContextInternals
      strictEqual(impl.depth, 2)
      strictEqual(impl.overlay !== undefined, true)

      context = Context.add(context, C, 5)
      impl = context as any as ContextInternals
      strictEqual(impl.depth, 0)
      strictEqual(impl.overlay, undefined)
    }
  })

  it("keeps the default depth of 8 when no maxDepth override is given", () => {
    const keys = Array.from({ length: 8 }, (_, i) => Context.Service<number>(`ContextTest/Default${i}`))
    let context = Context.empty()
    for (let i = 0; i < keys.length; i++) {
      context = Context.add(context, keys[i], i)
    }
    let impl = context as any as ContextInternals
    strictEqual(impl.overlay !== undefined, true)
    strictEqual(impl.depth, 8)

    context = Context.add(context, Context.Service<number>("ContextTest/DefaultPush"), -1)
    impl = context as any as ContextInternals
    strictEqual(impl.overlay, undefined)
    strictEqual(impl.depth, 0)
  })

  it("resets mergeAll to the default depth of 8 instead of inheriting overrides", () => {
    const first = Context.add(Context.makeUnsafe(new Map(), { maxDepth: 2 }), A, 1)
    const second = Context.add(Context.makeUnsafe(new Map(), { maxDepth: 32 }), B, 2)
    let context = Context.mergeAll(first, second)
    const keys = Array.from({ length: 9 }, (_, i) => Context.Service<number>(`ContextTest/MergeAllDefault${i}`))

    for (let i = 0; i < 8; i++) {
      context = Context.add(context, keys[i], i)
    }
    let impl = context as any as ContextInternals
    strictEqual(impl.overlay !== undefined, true)
    strictEqual(impl.depth, 8)

    context = Context.add(context, keys[8], 8)
    impl = context as any as ContextInternals
    strictEqual(impl.overlay, undefined)
    strictEqual(impl.depth, 0)
    deepStrictEqual([...context.mapUnsafe], [
      [A.key, 1],
      [B.key, 2],
      ...keys.map((key, i) => [key.key, i])
    ])
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

  it("pick and omit retain source ordering", () => {
    const source = Context.make(A, 1).pipe(Context.add(B, 2), Context.add(C, 3))

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
