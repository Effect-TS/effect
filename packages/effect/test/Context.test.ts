import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as internalEffect from "effect/internal/effect"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Redactable from "effect/Redactable"
import * as References from "effect/References"
import * as Scheduler from "effect/Scheduler"
import * as Tracer from "effect/Tracer"
import { describe, it } from "vitest"

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

  describe("merge", () => {
    const Cached = Context.Service<number>("ContextTest/MergeCached", { fiberCached: true })
    const D = Context.Service<number>("ContextTest/D")

    // The merge semantics spelled out: `self`'s entries in order, then `that`'s
    // entries overriding in place or appending
    const slowMerge = (self: Context.Context<any>, that: Context.Context<any>) => {
      const map = new Map(self.mapUnsafe)
      that.mapUnsafe.forEach((value, key) => map.set(key, value))
      return Context.makeUnsafe(map)
    }

    const assertMergeMatches = (self: Context.Context<any>, that: Context.Context<any>) => {
      const expected = slowMerge(self, that)
      const merged = Context.merge(self, that)
      deepStrictEqual([...merged.mapUnsafe], [...expected.mapUnsafe])
      for (const key of [A, B, C, D, Cached]) {
        deepStrictEqual(Context.getOption(merged, key), Context.getOption(expected, key))
      }
      assertTrue(Equal.equals(merged, expected))
      strictEqual(Hash.hash(merged), Hash.hash(expected))
      deepStrictEqual(merged.toJSON(), expected.toJSON())
      return merged
    }

    it("returns a context derived from self by additions", () => {
      const self = Context.make(A, 1).pipe(Context.add(B, 2))

      const single = Context.add(self, C, 3)
      strictEqual(assertMergeMatches(self, single), single)

      const multiple = self.pipe(Context.add(C, 3), Context.add(A, 4), Context.add(Cached, 5), Context.add(B, 6))
      strictEqual(assertMergeMatches(self, multiple), multiple)
      deepStrictEqual([...multiple.mapUnsafe], [[A.key, 4], [B.key, 6], [C.key, 3], [Cached.key, 5]])

      strictEqual(assertMergeMatches(self, self), self)

      const flat = Context.makeUnsafe<any>(new Map([[A.key, 1], [B.key, 2]]))
      const fromFlat = flat.pipe(Context.add(Cached, 3), Context.add(A, 4))
      strictEqual(assertMergeMatches(flat, fromFlat), fromFlat)
    })

    it("does not treat siblings or ancestors as derived", () => {
      const source = Context.make(A, 1).pipe(Context.add(B, 2))
      const left = Context.add(source, C, 3)
      const right = source.pipe(Context.add(D, 4), Context.add(A, 5))

      deepStrictEqual([...assertMergeMatches(left, right).mapUnsafe], [
        [A.key, 5],
        [B.key, 2],
        [C.key, 3],
        [D.key, 4]
      ])
      deepStrictEqual([...assertMergeMatches(right, source).mapUnsafe], [
        [A.key, 1],
        [B.key, 2],
        [D.key, 4]
      ])
      // Contexts that share only the base map of `Context.empty()`
      assertMergeMatches(Context.make(A, 1), Context.add(Context.empty(), B, 2))
      assertMergeMatches(Context.add(Context.empty(), A, 1), Context.add(Context.empty(), B, 2))
    })

    it("stays correct after either side flattens in place", () => {
      const self = Context.make(A, 1).pipe(Context.add(B, 2))
      const that = self.pipe(Context.add(C, 3), Context.add(A, 4))
      for (let i = 0; i < 8; i++) Context.getUnsafe(self, A)
      strictEqual((self as any).overlay, undefined)
      deepStrictEqual([...assertMergeMatches(self, that).mapUnsafe], [[A.key, 4], [B.key, 2], [C.key, 3]])

      const self2 = Context.make(D, 0).pipe(Context.add(A, 1), Context.add(B, 2))
      const that2 = self2.pipe(Context.add(C, 3), Context.add(A, 4))
      for (let i = 0; i < 8; i++) Context.getUnsafe(that2, D)
      strictEqual((that2 as any).overlay, undefined)
      deepStrictEqual([...assertMergeMatches(self2, that2).mapUnsafe], [[D.key, 0], [A.key, 4], [B.key, 2], [C.key, 3]])
    })

    it("reuses the fiber cache of self unless that holds a cached key", () => {
      const self = Context.make(A, 1).pipe(Context.add(Cached, 2))
      const plain = Context.make(B, 3).pipe(Context.add(A, 4))
      const withCached = Context.make(B, 3).pipe(Context.add(Cached, 5))
      const fiberCache = (context: Context.Context<never>) => (context as any).cacheRoot._fiberCache

      // Nothing to reuse before a fiber has run with self
      strictEqual(fiberCache(assertMergeMatches(self, plain)), undefined)
      // A fiber running with self computes the fiber cache of its root
      const fiber = new internalEffect.FiberImpl(self)
      strictEqual(fiber.context, self)
      const cache = fiberCache(self)
      assertTrue(cache !== undefined)

      const merged = assertMergeMatches(self, plain)
      strictEqual(fiberCache(merged), cache)
      // The merged context is its own root, so it does not keep self alive
      assertFalse(Context.hasSameCache(merged, self))
      strictEqual(fiberCache(assertMergeMatches(self, withCached)), undefined)
      // A derived context keeps its own cache
      const derived = Context.add(self, Cached, 6)
      assertTrue(Context.hasSameCache(assertMergeMatches(self, derived), derived))
      assertFalse(Context.hasSameCache(derived, self))
    })

    it("keeps fiber caches current in provided finalizers", () => {
      const services = Array.from({ length: 20 }, (_, i) => Context.Service<number>(`ContextTest/MergeService${i}`))
      let provided = Context.empty()
      for (let i = 0; i < services.length; i++) provided = Context.add(provided, services[i], i)
      const observed: Array<unknown> = []
      const observe = (label: string) =>
        Effect.withFiber((fiber) => {
          const expected = internalEffect.makeFiberContextCache(fiber.context)
          for (const field of Object.keys(expected) as Array<keyof typeof expected>) {
            strictEqual(fiber.cache[field], expected[field], `${label}: ${field}`)
          }
          return Effect.map(Effect.currentSpan, (span) =>
            observed.push([
              label,
              span.name,
              Context.get(fiber.context, References.CurrentLogLevel),
              Context.getUnsafe(fiber.context, Cached),
              Context.getUnsafe(fiber.context, services[19])
            ]))
        })
      const resource = (label: string) =>
        Effect.acquireRelease(observe(`${label} acquire`), () => Effect.orDie(observe(`${label} release`)))

      Effect.runSync(
        Effect.scoped(Effect.gen(function*() {
          yield* resource("outer")
          yield* resource("inner").pipe(
            Effect.provideService(References.CurrentLogLevel, "Error"),
            Effect.provideService(Cached, 2),
            Effect.withSpan("inner")
          )
          yield* Effect.scoped(resource("nested"))
          yield* Effect.orDie(observe("body"))
        })).pipe(
          Effect.withSpan("outer"),
          Effect.provideService(Cached, 1),
          Effect.provideService(References.CurrentLogLevel, "Debug"),
          Effect.provideContext(provided)
        )
      )

      deepStrictEqual(observed, [
        ["outer acquire", "outer", "Debug", 1, 19],
        ["inner acquire", "inner", "Error", 2, 19],
        ["nested acquire", "outer", "Debug", 1, 19],
        ["nested release", "outer", "Debug", 1, 19],
        ["body", "outer", "Debug", 1, 19],
        ["inner release", "inner", "Error", 2, 19],
        ["outer release", "outer", "Debug", 1, 19]
      ])
    })
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

  it("derives fiber caches that match a full rebuild", () => {
    const UserCached = Context.Service<number>("ContextTest/FiberCacheUserCached", { fiberCached: true })
    const tracerA = Tracer.make({ span: () => undefined as any, context: () => undefined as any })
    const tracerB = Tracer.make({ span: () => undefined as any })
    const span = (spanId: string) => Tracer.externalSpan({ spanId, traceId: "trace" })
    const frame = (name: string) => ({ name, stack: () => undefined, parent: undefined })
    const metrics = { recordFiberStart() {}, recordFiberEnd() {} } as any
    const choices: ReadonlyArray<readonly [string, ReadonlyArray<unknown>]> = [
      [Scheduler.Scheduler.key, [new Scheduler.MixedScheduler(), new Scheduler.MixedScheduler(), undefined]],
      [Tracer.TracerKey, [tracerA, tracerB, undefined]],
      [References.TracerEnabled.key, [true, false, undefined]],
      [Tracer.ParentSpanKey, [span("a"), span("b"), undefined]],
      [References.CurrentLogLevel.key, ["Debug", "Error", undefined]],
      [References.MinimumLogLevel.key, ["All", "Warn", undefined]],
      [References.CurrentStackFrame.key, [frame("a"), frame("b"), undefined]],
      [Metric.FiberRuntimeMetricsKey, [metrics, undefined]],
      [Scheduler.MaxOpsBeforeYield.key, [1, 4096, undefined]],
      [Scheduler.PreventSchedulerYield.key, [true, false, undefined]],
      [UserCached.key, [1, 2]],
      [A.key, [1, 2]],
      [B.key, [3]]
    ]
    let seed = 42
    const random = (n: number) => {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
      return (seed >>> 16) % n
    }

    const fiber = new internalEffect.FiberImpl(Context.empty())
    const contexts: Array<Context.Context<never>> = [Context.empty()]
    let derived = 0
    for (let i = 0; i < 5000; i++) {
      let context = contexts[random(contexts.length)]
      const op = random(20)
      if (op === 0) {
        context = Context.omit(Context.Service(choices[random(choices.length)][0]))(context)
      } else if (op === 1) {
        // Covers merges of unrelated contexts, of contexts derived from `self`,
        // and of `that`s with or without cached keys
        const that = contexts[random(contexts.length)]
        context = random(2) === 0 ? Context.merge(context, that) : Context.merge(that, context)
      } else {
        const [key, values] = choices[random(choices.length)]
        context = Context.addUnsafe(context, key, values[random(values.length)])
      }
      contexts.push(context)
      // Leave some roots unrefreshed so later additions on top of them have to
      // fall back to a full rebuild
      if (random(4) === 0) continue
      const root = (context as any).cacheRoot
      if (root._fiberCacheParent !== undefined) {
        // Runtimes that only read `_fiberCache` must keep rebuilding in full
        strictEqual(root._fiberCache, undefined)
        derived++
      }
      fiber.setContext(context)
      const expected = internalEffect.makeFiberContextCache(context)
      deepStrictEqual(Object.keys(fiber.cache), Object.keys(expected))
      for (const field of Object.keys(expected) as Array<keyof typeof expected>) {
        strictEqual(fiber.cache[field], expected[field], field)
      }
    }
    assertTrue(derived > 1000)
  })
})
