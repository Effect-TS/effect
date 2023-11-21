import * as ObservableResource from "effect-test/utils/cache/ObservableResource"
import * as WatchableLookup from "effect-test/utils/cache/WatchableLookup"
import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { dual, identity, pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as HashMap from "effect/HashMap"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as ScopedCache from "effect/ScopedCache"
import * as TestClock from "effect/TestClock"
import * as TestServices from "effect/TestServices"
import * as fc from "fast-check"
import { describe, expect } from "vitest"

const hash = dual<
  (y: number) => (x: number) => number,
  (x: number, y: number) => number
>(2, (x, y) => Hash.number(x ^ y))

const hashEffect = dual<
  (y: number) => (x: number) => Effect.Effect<never, never, number>,
  (x: number, y: number) => Effect.Effect<never, never, number>
>(2, (x, y) => Effect.sync(() => hash(x, y)))

describe.concurrent("ScopedCache", () => {
  it.it("cacheStats - should correctly keep track of cache size, hits and misses", () =>
    fc.assert(
      fc.asyncProperty(fc.integer(), async (salt) => {
        const program = Effect.gen(function*($) {
          const capacity = 10
          const scopedCache = ScopedCache.make({
            lookup: hashEffect(salt),
            capacity,
            timeToLive: Duration.infinity
          })
          const { hits, misses, size } = yield* $(
            scopedCache,
            Effect.flatMap((cache) =>
              pipe(
                Effect.forEach(
                  ReadonlyArray.map(ReadonlyArray.range(1, capacity), (n) => (n / 2) | 0),
                  (n) => Effect.scoped(Effect.zipRight(cache.get(n), Effect.unit)),
                  { concurrency: "unbounded", discard: true }
                ),
                Effect.flatMap(() => cache.cacheStats)
              )
            )
          )
          expect(hits).toBe(4)
          expect(misses).toBe(6)
          expect(size).toBe(6)
        })
        return Effect.runPromise(Effect.scoped(program))
      })
    ))

  it.effect("invalidate - should properly remove and clean a resource from the cache", () =>
    Effect.gen(function*($) {
      const capacity = 100
      const observablesResources = yield* $(
        Effect.forEach(
          ReadonlyArray.range(0, capacity - 1),
          () => ObservableResource.makeUnit()
        )
      )
      const scopedCache = ScopedCache.make({
        capacity,
        timeToLive: Duration.infinity,
        lookup: (key: number) => observablesResources[key].scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(Effect.forEach(
          ReadonlyArray.range(0, capacity - 1),
          (n) => Effect.scoped(Effect.zipRight(cache.get(n), Effect.unit)),
          { concurrency: "unbounded", discard: true }
        ))
        yield* $(cache.invalidate(42))
        const cacheContainsKey42 = yield* $(cache.contains(42))
        const { hits, misses, size } = yield* $(cache.cacheStats)
        yield* $(observablesResources[42].assertAcquiredOnceAndCleaned())
        yield* $(Effect.forEach(
          pipe(
            observablesResources,
            ReadonlyArray.filter((_, index) => index !== 42)
          ),
          (observableResource) => observableResource.assertAcquiredOnceAndNotCleaned()
        ))
        expect(cacheContainsKey42).toBe(false)
        expect(hits).toBe(0)
        expect(misses).toBe(100)
        expect(size).toBe(99)
      })))
    }))

  it.effect("invalidate - should not invalidate anything before effect is evaluated", () =>
    Effect.gen(function*($) {
      const observablesResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 4,
        timeToLive: Duration.infinity,
        lookup: () => observablesResource.scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(Effect.scoped(Effect.zipRight(cache.get(void 0), Effect.unit)))
        const invalidateEffect = cache.invalidate(void 0)
        const cacheContainsKey42BeforeInvalidate = yield* $(cache.contains(void 0))
        yield* $(observablesResource.assertAcquiredOnceAndNotCleaned())
        yield* $(Effect.scoped(Effect.zipRight(cache.get(void 0), Effect.unit)))
        yield* $(invalidateEffect)
        const cacheContainsKey42AfterInvalidate = yield* $(cache.contains(void 0))
        yield* $(observablesResource.assertAcquiredOnceAndCleaned())
        expect(cacheContainsKey42BeforeInvalidate).toBe(true)
        expect(cacheContainsKey42AfterInvalidate).toBe(false)
      })))
    }))

  it.effect("invalidateAll - should properly remove and clean all resource from the cache", () =>
    Effect.gen(function*($) {
      const capacity = 100
      const observablesResources = yield* $(
        Effect.forEach(
          ReadonlyArray.range(0, capacity - 1),
          () => ObservableResource.makeUnit()
        )
      )
      const scopedCache = ScopedCache.make({
        capacity,
        timeToLive: Duration.infinity,
        lookup: (key: number) => observablesResources[key].scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(Effect.forEach(
          ReadonlyArray.range(0, capacity - 1),
          (n) => Effect.scoped(Effect.zipRight(cache.get(n), Effect.unit)),
          { concurrency: "unbounded", discard: true }
        ))
        yield* $(cache.invalidateAll)
        const contains = yield* $(
          Effect.forEach(
            ReadonlyArray.range(0, capacity - 1),
            (n) => Effect.scoped(cache.contains(n)),
            { concurrency: "unbounded" }
          ),
          Effect.map((_) => _.every(identity))
        )
        const { hits, misses, size } = yield* $(cache.cacheStats)
        yield* $(Effect.forEach(
          observablesResources,
          (observableResource) => observableResource.assertAcquiredOnceAndCleaned()
        ))
        expect(contains).toBe(false)
        expect(hits).toBe(0)
        expect(misses).toBe(100)
        expect(size).toBe(0)
      })))
    }))

  it.effect("get - should not put anything in the cache before the scoped effect returned by get is used", () =>
    Effect.gen(function*($) {
      const observablesResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: () => observablesResource.scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(observablesResource.assertNotAcquired())
        // Not actually retreiving from the cache
        cache.get(void 0)
        yield* $(observablesResource.assertNotAcquired())
        const contains = yield* $(cache.contains(void 0))
        expect(contains).toBe(false)
      })))
    }))

  it.it("get - when used sequentially, should properly call correct lookup", () =>
    fc.assert(fc.asyncProperty(fc.integer(), (salt) => {
      const program = Effect.gen(function*($) {
        const scopedCache = ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.infinity,
          lookup: hashEffect(salt)
        })
        yield* $(Effect.scoped(Effect.gen(function*($) {
          const cache = yield* $(scopedCache)
          const actual = yield* $(
            Effect.forEach(
              ReadonlyArray.range(1, 10),
              (n) => Effect.scoped(Effect.flatMap(cache.get(n), Effect.succeed))
            )
          )
          const expected = ReadonlyArray.map(ReadonlyArray.range(1, 10), hash(salt))
          expect(actual).toEqual(expected)
        })))
      })
      return Effect.runPromise(program)
    })))

  it.it("get - when used concurrently, should properly call correct lookup", () =>
    fc.assert(fc.asyncProperty(fc.integer(), (salt) => {
      const program = Effect.gen(function*($) {
        const scopedCache = ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.infinity,
          lookup: hashEffect(salt)
        })
        yield* $(Effect.scoped(Effect.gen(function*($) {
          const cache = yield* $(scopedCache)
          const actual = yield* $(
            Effect.forEach(
              ReadonlyArray.range(1, 10),
              (n) => Effect.scoped(Effect.flatMap(cache.get(n), Effect.succeed)),
              { concurrency: "unbounded" }
            )
          )
          const expected = ReadonlyArray.map(ReadonlyArray.range(1, 10), hash(salt))
          expect(Array.from(actual)).toEqual(Array.from(expected))
        })))
      })
      return Effect.runPromise(program)
    })))

  it.it("get - should clean and remove old resource to respect cache capacity", () =>
    fc.assert(fc.asyncProperty(fc.integer(), (salt) => {
      const program = Effect.gen(function*($) {
        const scopedCache = ScopedCache.make({
          capacity: 5,
          timeToLive: Duration.infinity,
          lookup: hashEffect(salt)
        })
        yield* $(Effect.scoped(Effect.gen(function*($) {
          const cache = yield* $(scopedCache)
          const actual = yield* $(
            Effect.forEach(
              ReadonlyArray.range(1, 10),
              (n) => Effect.scoped(Effect.flatMap(cache.get(n), Effect.succeed))
            )
          )
          const expected = ReadonlyArray.map(ReadonlyArray.range(1, 10), hash(salt))
          const cacheStats = yield* $(cache.cacheStats)
          expect(Array.from(actual)).toEqual(Array.from(expected))
          expect(cacheStats.size).toBe(5)
        })))
      })
      return Effect.runPromise(program)
    })))

  it.effect("get - sequential use of the scoped effect returned by a single call to get should create only one resource", () =>
    Effect.gen(function*($) {
      const subResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (_: void) => subResource.scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(subResource.assertNotAcquired())
        const resourceScopedProxy = cache.get(void 0)
        yield* $(subResource.assertNotAcquired())
        yield* $(Effect.scoped(resourceScopedProxy))
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
        yield* $(Effect.scoped(resourceScopedProxy))
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      })))
      yield* $(subResource.assertAcquiredOnceAndCleaned())
    }))

  it.effect("get - sequential use should create only one resource", () =>
    Effect.gen(function*($) {
      const subResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (_: void) => subResource.scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(subResource.assertNotAcquired())
        yield* $(Effect.scoped(cache.get(void 0)))
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
        yield* $(Effect.scoped(cache.get(void 0)))
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      })))
      yield* $(subResource.assertAcquiredOnceAndCleaned())
    }))

  it.effect("get - sequential use of a failing scoped effect should cache the error and immediately call the resource finalizer", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(
        WatchableLookup.makeEffect<void, Cause.RuntimeException, never>(() =>
          Effect.fail(new Cause.RuntimeException("fail"))
        )
      )
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (key: void) => watchableLookup(key)
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(0)))
        const resourceScopedProxy = cache.get(void 0)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(0)))
        yield* $(Effect.either(Effect.scoped(resourceScopedProxy)))
        yield* $(watchableLookup.assertAllCleanedForKey(void 0))
        yield* $(Effect.either(Effect.scoped(resourceScopedProxy)))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(1)))
      })))
    }))

  it.effect("get - concurrent use of the scoped effect returned by a single call to get should create only one resource", () =>
    Effect.gen(function*($) {
      const subResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (_: void) => subResource.scoped
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        const scoped = cache.get(void 0)
        const scope1 = yield* $(Scope.make())
        const scope2 = yield* $(Scope.make())
        const acquire1 = Effect.provide(scoped, Context.make(Scope.Scope, scope1))
        const release1: Scope.Scope.Finalizer = (exit) => Scope.close(scope1, exit)
        const acquire2 = Effect.provide(scoped, Context.make(Scope.Scope, scope2))
        const release2: Scope.Scope.Finalizer = (exit) => Scope.close(scope2, exit)
        yield* $(subResource.assertNotAcquired())
        yield* $(acquire2)
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
        yield* $(acquire1)
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
        yield* $(release2(Exit.unit))
        yield* $(release1(Exit.unit))
        yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      })))
      yield* $(subResource.assertAcquiredOnceAndCleaned())
    }))

  it.effect("get - concurrent use on a failing scoped effect should cache the error and immediately call the resource finalizer", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(
        WatchableLookup.makeEffect<void, Cause.RuntimeException, never>(() =>
          Effect.fail(new Cause.RuntimeException("fail"))
        )
      )
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (key: void) => watchableLookup(key)
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(0)))
        const resourceScopedProxy = cache.get(void 0)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(0)))
        yield* $(Effect.zip(
          Effect.either(Effect.scoped(resourceScopedProxy)),
          Effect.either(Effect.scoped(resourceScopedProxy)),
          { concurrent: true }
        ))
        yield* $(watchableLookup.assertAllCleanedForKey(void 0))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(1)))
      })))
    }))

  it.effect("get - when two scoped effects returned by two calls to get live longer than the cache, the resource should be cleaned only when it is not in use anymore", () =>
    Effect.gen(function*($) {
      const subResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (_: void) => subResource.scoped
      })
      const scope1 = yield* $(Scope.make())
      const scope2 = yield* $(Scope.make())
      const [release1, release2] = yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(Effect.provide(
          cache.get(void 0),
          Context.make(Scope.Scope, scope1)
        ))
        yield* $(Effect.provide(
          cache.get(void 0),
          Context.make(Scope.Scope, scope2)
        ))
        const release1: Scope.Scope.Finalizer = (exit) => Scope.close(scope1, exit)
        const release2: Scope.Scope.Finalizer = (exit) => Scope.close(scope2, exit)
        return [release1, release2] as const
      })))
      yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      yield* $(release1(Exit.unit))
      yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      yield* $(release2(Exit.unit))
      yield* $(subResource.assertAcquiredOnceAndCleaned())
    }))

  it.effect("get - when two scoped effects obtained by a single scoped effect returned by a single call to get live longer than the cache, the resource should be cleaned only when it is not in use anymore", () =>
    Effect.gen(function*($) {
      const subResource = yield* $(ObservableResource.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.seconds(60),
        lookup: (_: void) => subResource.scoped
      })
      const scope1 = yield* $(Scope.make())
      const scope2 = yield* $(Scope.make())
      const [release1, release2] = yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        const scoped = cache.get(void 0)
        yield* $(Effect.provide(scoped, Context.make(Scope.Scope, scope1)))
        yield* $(Effect.provide(scoped, Context.make(Scope.Scope, scope2)))
        const release1: Scope.Scope.Finalizer = (exit) => Scope.close(scope1, exit)
        const release2: Scope.Scope.Finalizer = (exit) => Scope.close(scope2, exit)
        return [release1, release2] as const
      })))
      yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      yield* $(release1(Exit.unit))
      yield* $(subResource.assertAcquiredOnceAndNotCleaned())
      yield* $(release2(Exit.unit))
      yield* $(subResource.assertAcquiredOnceAndCleaned())
    }))

  it.it("get - should clean old resources if the cache size is exceeded", () => {
    const arb = fc.integer({ min: 1, max: 5 }).chain((cacheSize) =>
      fc.integer({ min: cacheSize, max: cacheSize + 3 })
        .map((numCreatedKey) => [cacheSize, numCreatedKey] as const)
    )
    return fc.assert(fc.asyncProperty(arb, ([cacheSize, numCreatedKey]) => {
      const program = Effect.gen(function*($) {
        const watchableLookup = yield* $(WatchableLookup.make<number, void>(() => void 0))
        const scopedCache = ScopedCache.make({
          capacity: cacheSize,
          timeToLive: Duration.seconds(60),
          lookup: (key: number) => watchableLookup(key)
        })
        yield* $(Effect.scoped(Effect.gen(function*($) {
          const cache = yield* $(scopedCache)
          yield* $(
            Effect.forEach(
              ReadonlyArray.range(0, numCreatedKey - 1),
              (key) => Effect.scoped(Effect.asUnit(cache.get(key))),
              { discard: true }
            )
          )
          const createdResources = yield* $(watchableLookup.createdResources())
          const cleanedAssertions = numCreatedKey - cacheSize - 1
          const oldestResourceCleaned = cleanedAssertions <= 0
            ? ReadonlyArray.empty()
            : pipe(
              ReadonlyArray.range(0, numCreatedKey - cacheSize - 1),
              ReadonlyArray.flatMap((key) => Chunk.toReadonlyArray(HashMap.unsafeGet(createdResources, key))),
              ReadonlyArray.map((resource) => resource.assertAcquiredOnceAndCleaned())
            )
          yield* $(Effect.all(oldestResourceCleaned, { discard: true }))
          const newestResourceNotCleanedYet = pipe(
            ReadonlyArray.range(numCreatedKey - cacheSize, numCreatedKey - 1),
            ReadonlyArray.flatMap((key) => Chunk.toReadonlyArray(HashMap.unsafeGet(createdResources, key))),
            ReadonlyArray.map((resource) => resource.assertAcquiredOnceAndNotCleaned())
          )
          yield* $(Effect.all(newestResourceNotCleanedYet, { discard: true }))
        })))
      })
      return Effect.runPromise(program)
    }))
  })

  it.effect("get - the scoped effect returned by get should recall lookup function if resource is too old and release the previous resource", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: (key: void) => watchableLookup(key)
        }))
        const scoped = cache.get(void 0)
        yield* $(Effect.scoped(Effect.asUnit(scoped)))
        yield* $(TestClock.adjust(Duration.seconds(5)))
        yield* $(Effect.scoped(Effect.asUnit(scoped)))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(1)))
        yield* $(TestClock.adjust(Duration.seconds(4)))
        yield* $(Effect.scoped(Effect.asUnit(scoped)))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(1)))
        yield* $(TestClock.adjust(Duration.seconds(2)))
        yield* $(Effect.scoped(Effect.asUnit(scoped)))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(2)))
        yield* $(watchableLookup.assertFirstNCreatedResourcesCleaned(void 0, 1))
      })))
    }))

  it.effect("get - should recall lookup function if resource is too old and release old resource when using the scoped effect multiple times", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: (key: void) => watchableLookup(key)
        }))
        const scoped = Effect.scoped(Effect.asUnit(cache.get(void 0)))
        yield* $(scoped)
        yield* $(TestClock.adjust(Duration.seconds(5)))
        yield* $(scoped)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(1)))
        yield* $(TestClock.adjust(Duration.seconds(4)))
        yield* $(scoped)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(1)))
        yield* $(TestClock.adjust(Duration.seconds(2)))
        yield* $(scoped)
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(2)))
        yield* $(watchableLookup.assertFirstNCreatedResourcesCleaned(void 0, 1))
      })))
    }))

  it.effect("get - when resource is expired but still used it should wait until resource is not cleaned anymore to clean immediately", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: (key: void) => watchableLookup(key)
        }))
        const scope = yield* $(Scope.make())
        const acquire = Effect.provide(
          cache.get(void 0),
          Context.make(Scope.Scope, scope)
        )
        const release: Scope.Scope.Finalizer = (exit) => Scope.close(scope, exit)
        yield* $(acquire)
        yield* $(TestClock.adjust(Duration.seconds(11)))
        yield* $(Effect.scoped(Effect.asUnit(cache.get(void 0))))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(2)))
        const firstCreatedResource = yield* $(watchableLookup.firstCreatedResource(void 0))
        yield* $(firstCreatedResource.assertAcquiredOnceAndNotCleaned())
        yield* $(release(Exit.unit))
        yield* $(firstCreatedResource.assertAcquiredOnceAndCleaned())
      })))
    }))

  it.effect("getOption - should return None if resource is not in cache", () =>
    Effect.scoped(Effect.gen(function*(_) {
      const scopedCache = yield* _(ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: (i: number) => Effect.succeed(i)
      }))
      const option = yield* _(scopedCache.getOption(1))
      expect(option._tag).toEqual("None")
    })))

  it.effect("getOption - should return Some if pending", () =>
    Effect.scoped(Effect.gen(function*(_) {
      const scopedCache = yield* _(ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: (i: number) => TestServices.provideLive(Effect.delay(Effect.succeed(i), Duration.millis(10)))
      }))
      yield* _(scopedCache.get(1), Effect.scoped, Effect.fork)
      yield* _(TestServices.provideLive(Effect.sleep(Duration.millis(5))))
      const option = yield* _(scopedCache.getOption(1), Effect.scoped)
      expect(option._tag).toEqual("Some")
    })))

  it.effect("getOptionComplete - should return None if pending", () =>
    Effect.scoped(Effect.gen(function*(_) {
      const scopedCache = yield* _(ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: (i: number) => Effect.delay(Effect.succeed(i), Duration.millis(10))
      }))
      yield* _(scopedCache.get(1), Effect.scoped, Effect.fork)
      yield* _(TestClock.adjust(Duration.millis(9)))
      const option = yield* _(scopedCache.getOptionComplete(1), Effect.scoped)
      expect(option._tag).toEqual("None")
    })))

  it.effect("getOptionComplete - should return Some if complete", () =>
    Effect.scoped(Effect.gen(function*(_) {
      const scopedCache = yield* _(ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: (i: number) => TestServices.provideLive(Effect.delay(Effect.succeed(i), Duration.millis(10)))
      }))
      yield* _(scopedCache.get(1), Effect.scoped)
      const option = yield* _(scopedCache.getOptionComplete(1), Effect.scoped)
      expect(option._tag).toEqual("Some")
    })))

  it.effect("refresh - should update the cache with a new value", () =>
    Effect.gen(function*($) {
      const inc = (n: number) => n * 10
      const retrieve = (multiplier: Ref.Ref<number>) => (key: number) =>
        pipe(
          Ref.updateAndGet(multiplier, inc),
          Effect.map((multiplier) => key * multiplier)
        )
      const seed = 1
      const key = 123
      const ref = yield* $(Ref.make(seed))
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: retrieve(ref)
      })
      const [val1, val2, val3] = yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        const val1 = yield* $(cache.get(key))
        yield* $(cache.refresh(key))
        const val2 = yield* $(cache.get(key))
        const val3 = yield* $(cache.get(key))
        return [val1, val2, val3] as const
      })))
      expect(val2).toBe(val3)
      expect(val2).toBe(inc(val1))
    }))

  it.effect("refresh - should clean old resource when making a new one", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: (key: void) => watchableLookup(key)
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        yield* $(Effect.scoped(cache.get(void 0)))
        yield* $(cache.refresh(void 0))
        const createdResources = yield* $(
          watchableLookup.createdResources(),
          Effect.map(HashMap.unsafeGet(void 0))
        )
        yield* $(Chunk.unsafeHead(createdResources).assertAcquiredOnceAndCleaned())
        yield* $(Chunk.unsafeGet(createdResources, 1).assertAcquiredOnceAndNotCleaned())
      })))
    }))

  it.effect("refresh - should update the cache with a new value even if the last get or refresh failed", () =>
    Effect.gen(function*($) {
      const error = new Cause.RuntimeException("Must be a multiple of 3")
      const inc = (n: number) => n + 1
      const retrieve = (number: Ref.Ref<number>) => (key: number) =>
        pipe(
          Ref.updateAndGet(number, inc),
          Effect.flatMap((n) =>
            n % 3 === 0
              ? Effect.fail(error)
              : Effect.succeed(key * n)
          )
        )
      const seed = 2
      const key = 1
      const ref = yield* $(Ref.make(seed))
      const scopedCache = ScopedCache.make({
        capacity: 1,
        timeToLive: Duration.infinity,
        lookup: retrieve(ref)
      })
      const result = yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        const failure1 = yield* $(Effect.either(cache.get(key)))
        yield* $(cache.refresh(key))
        const value1 = yield* $(Effect.either(cache.get(key)))
        yield* $(cache.refresh(key))
        const failure2 = yield* $(Effect.either(cache.refresh(key)))
        yield* $(cache.refresh(key))
        const value2 = yield* $(Effect.either(cache.get(key)))
        return { failure1, value1, failure2, value2 }
      })))
      expect(result.failure1).toEqual(Either.left(error))
      expect(result.failure2).toEqual(Either.left(error))
      expect(result.value1).toEqual(Either.right(4))
      expect(result.value2).toEqual(Either.right(7))
    }))

  it.effect("refresh - should create and acquire subresource if the key doesn't exist in the cache", () =>
    Effect.gen(function*($) {
      const capacity = 100
      const scopedCache = ScopedCache.make({
        capacity,
        timeToLive: Duration.infinity,
        lookup: (_: number) => Effect.unit
      })
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(scopedCache)
        const count0 = yield* $(cache.size)
        yield* $(Effect.forEach(ReadonlyArray.range(1, capacity), (key) => cache.refresh(key), { discard: true }))
        const count1 = yield* $(cache.size)
        expect(count0).toBe(0)
        expect(count1).toBe(capacity)
      })))
    }))

  it.it("refresh - should clean old resource if cache size is exceeded", () => {
    const arb = fc.integer({ min: 1, max: 5 }).chain((cacheSize) =>
      fc.integer({ min: cacheSize, max: cacheSize + 3 })
        .map((numCreatedKey) => [cacheSize, numCreatedKey] as const)
    )
    return fc.assert(fc.asyncProperty(arb, ([cacheSize, numCreatedKey]) => {
      const program = Effect.gen(function*($) {
        const watchableLookup = yield* $(WatchableLookup.make<number, void>(() => void 0))
        const scopedCache = ScopedCache.make({
          capacity: cacheSize,
          timeToLive: Duration.seconds(60),
          lookup: (key: number) => watchableLookup(key)
        })
        yield* $(Effect.scoped(Effect.gen(function*($) {
          const cache = yield* $(scopedCache)
          yield* $(Effect.forEach(
            ReadonlyArray.range(0, numCreatedKey - 1),
            (key) => cache.refresh(key),
            { discard: true }
          ))
          const createdResources = yield* $(watchableLookup.createdResources())
          const cleanedAssertions = numCreatedKey - cacheSize - 1
          const oldestResourceCleaned = cleanedAssertions <= 0
            ? ReadonlyArray.empty()
            : pipe(
              ReadonlyArray.range(0, numCreatedKey - cacheSize - 1),
              ReadonlyArray.flatMap((key) => Chunk.toReadonlyArray(HashMap.unsafeGet(createdResources, key))),
              ReadonlyArray.map((resource) => resource.assertAcquiredOnceAndCleaned())
            )
          yield* $(Effect.all(oldestResourceCleaned, { discard: true }))
          const newestResourceNotCleanedYet = pipe(
            ReadonlyArray.range(numCreatedKey - cacheSize, numCreatedKey - 1),
            ReadonlyArray.flatMap((key) => Chunk.toReadonlyArray(HashMap.unsafeGet(createdResources, key))),
            ReadonlyArray.map((resource) => resource.assertAcquiredOnceAndNotCleaned())
          )
          yield* $(Effect.all(newestResourceNotCleanedYet, { discard: true }))
        })))
      })
      return Effect.runPromise(program)
    }))
  })

  it.effect("refresh - should not clean the resource if it's not yet expired until the new resource is ready", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: watchableLookup
        }))
        yield* $(Effect.scoped(Effect.asUnit(cache.get(void 0))))
        yield* $(TestClock.adjust(Duration.seconds(9)))
        yield* $(watchableLookup.lock())
        const refreshFiber = yield* $(Effect.fork(cache.refresh(void 0)))
        yield* $(
          watchableLookup.getCalledTimes(void 0),
          Effect.repeat(pipe(
            Schedule.recurWhile<number>((calledTimes) => calledTimes < 2),
            Schedule.compose(Schedule.elapsed),
            Schedule.whileOutput((elapsed) => Duration.lessThan(elapsed, Duration.millis(100)))
          ))
        )
        yield* $(TestServices.provideLive(Effect.sleep(Duration.millis(100))))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(2)))
        const firstCreatedResource = yield* $(watchableLookup.firstCreatedResource(void 0))
        yield* $(firstCreatedResource.assertAcquiredOnceAndNotCleaned())
        yield* $(watchableLookup.unlock())
        yield* $(Fiber.join(refreshFiber))
        yield* $(firstCreatedResource.assertAcquiredOnceAndCleaned())
      })))
    }))

  it.effect("refresh - should clean the resource if it's expired and not in used", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: watchableLookup
        }))
        yield* $(Effect.scoped(Effect.asUnit(cache.get(void 0))))
        yield* $(TestClock.adjust(Duration.seconds(11)))
        yield* $(watchableLookup.lock())
        const refreshFiber = yield* $(Effect.fork(cache.refresh(void 0)))
        yield* $(
          watchableLookup.getCalledTimes(void 0),
          Effect.repeat(pipe(
            Schedule.recurWhile<number>((calledTimes) => calledTimes < 1),
            Schedule.compose(Schedule.elapsed),
            Schedule.whileOutput((elapsed) => Duration.lessThan(elapsed, Duration.millis(100)))
          ))
        )
        yield* $(TestServices.provideLive(Effect.sleep(Duration.millis(100))))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(2)))
        yield* $(watchableLookup.assertFirstNCreatedResourcesCleaned(void 0, 1))
        yield* $(watchableLookup.unlock())
        yield* $(Fiber.join(refreshFiber))
      })))
    }))

  it.effect("refresh - should wait to clean expired resource until it's not in use anymore", () =>
    Effect.gen(function*($) {
      const watchableLookup = yield* $(WatchableLookup.makeUnit())
      yield* $(Effect.scoped(Effect.gen(function*($) {
        const cache = yield* $(ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: watchableLookup
        }))
        const scope = yield* $(Scope.make())
        const acquire = Effect.provide(
          cache.get(void 0),
          Context.make(Scope.Scope, scope)
        )
        const release: Scope.Scope.Finalizer = (exit) => Scope.close(scope, exit)
        yield* $(acquire)
        yield* $(TestClock.adjust(Duration.seconds(11)))
        yield* $(cache.refresh(void 0))
        yield* $(watchableLookup.assertCalledTimes(void 0, (n) => expect(n).toBe(2)))
        const firstCreatedResource = yield* $(watchableLookup.firstCreatedResource(void 0))
        yield* $(firstCreatedResource.assertAcquiredOnceAndNotCleaned())
        yield* $(release(Exit.unit))
        yield* $(firstCreatedResource.assertAcquiredOnceAndCleaned())
      })))
    }))
  it.effect(".pipe", () =>
    Effect.gen(function*(_) {
      const cache = yield* _(
        ScopedCache.make({
          capacity: 10,
          timeToLive: Duration.seconds(10),
          lookup: () => Effect.unit
        }),
        Effect.scoped
      )
      expect(cache.pipe(identity)).toBe(cache)
    }))
})
