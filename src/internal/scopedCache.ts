import type * as Cache from "../Cache.js"
import type * as Clock from "../Clock.js"
import * as Context from "../Context.js"
import * as Data from "../Data.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import * as Equal from "../Equal.js"
import * as Exit from "../Exit.js"
import { pipe } from "../Function.js"
import * as HashSet from "../HashSet.js"
import * as MutableHashMap from "../MutableHashMap.js"
import * as MutableQueue from "../MutableQueue.js"
import * as MutableRef from "../MutableRef.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Scope from "../Scope.js"
import type * as ScopedCache from "../ScopedCache.js"
import * as _cache from "./cache.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as fiberRuntime from "./fiberRuntime.js"

/**
 * The `CacheState` represents the mutable state underlying the cache.
 *
 * @internal
 */
export interface CacheState<Key, Error, Value> {
  map: MutableHashMap.MutableHashMap<Key, MapValue<Key, Error, Value>>
  keys: _cache.KeySet<Key>
  accesses: MutableQueue.MutableQueue<_cache.MapKey<Key>>
  updating: MutableRef.MutableRef<boolean>
  hits: number
  misses: number
}

/** @internal */
export const makeCacheState = <Key, Error, Value>(
  map: MutableHashMap.MutableHashMap<Key, MapValue<Key, Error, Value>>,
  keys: _cache.KeySet<Key>,
  accesses: MutableQueue.MutableQueue<_cache.MapKey<Key>>,
  updating: MutableRef.MutableRef<boolean>,
  hits: number,
  misses: number
): CacheState<Key, Error, Value> => ({
  map,
  keys,
  accesses,
  updating,
  hits,
  misses
})

/**
 * Constructs an initial cache state.
 *
 * @internal
 */
export const initialCacheState = <Key, Error, Value>(): CacheState<Key, Error, Value> =>
  makeCacheState(
    MutableHashMap.empty(),
    _cache.makeKeySet(),
    MutableQueue.unbounded(),
    MutableRef.make(false),
    0,
    0
  )

/**
 * A `MapValue` represents a value in the cache. A value may either be
 * `Pending` with a `Promise` that will contain the result of computing the
 * lookup function, when it is available, or `Complete` with an `Exit` value
 * that contains the result of computing the lookup function.
 *
 * @internal
 */
export type MapValue<Key, Error, Value> =
  | Complete<Key, Error, Value>
  | Pending<Key, Error, Value>
  | Refreshing<Key, Error, Value>

/** @internal */
export interface Complete<Key, Error, Value> {
  readonly _tag: "Complete"
  readonly key: _cache.MapKey<Key>
  readonly exit: Exit.Exit<Error, readonly [Value, Scope.Scope.Finalizer]>
  readonly ownerCount: MutableRef.MutableRef<number>
  readonly entryStats: Cache.EntryStats
  readonly timeToLive: number
}

/** @internal */
export interface Pending<Key, Error, Value> {
  readonly _tag: "Pending"
  readonly key: _cache.MapKey<Key>
  readonly scoped: Effect.Effect<never, never, Effect.Effect<Scope.Scope, Error, Value>>
}

/** @internal */
export interface Refreshing<Key, Error, Value> {
  readonly _tag: "Refreshing"
  readonly scoped: Effect.Effect<never, never, Effect.Effect<Scope.Scope, Error, Value>>
  readonly complete: Complete<Key, Error, Value>
}

/** @internal */
export const complete = <Key, Error, Value>(
  key: _cache.MapKey<Key>,
  exit: Exit.Exit<Error, readonly [Value, Scope.Scope.Finalizer]>,
  ownerCount: MutableRef.MutableRef<number>,
  entryStats: Cache.EntryStats,
  timeToLive: number
): Complete<Key, Error, Value> =>
  Data.struct({
    _tag: "Complete",
    key,
    exit,
    ownerCount,
    entryStats,
    timeToLive
  })

/** @internal */
export const pending = <Key, Error, Value>(
  key: _cache.MapKey<Key>,
  scoped: Effect.Effect<never, never, Effect.Effect<Scope.Scope, Error, Value>>
): Pending<Key, Error, Value> =>
  Data.struct({
    _tag: "Pending",
    key,
    scoped
  })

/** @internal */
export const refreshing = <Key, Error, Value>(
  scoped: Effect.Effect<never, never, Effect.Effect<Scope.Scope, Error, Value>>,
  complete: Complete<Key, Error, Value>
): Refreshing<Key, Error, Value> =>
  Data.struct({
    _tag: "Refreshing",
    scoped,
    complete
  })

/** @internal */
export const toScoped = <Key, Error, Value>(
  self: Complete<Key, Error, Value>
): Effect.Effect<Scope.Scope, Error, Value> =>
  Exit.matchEffect(self.exit, {
    onFailure: (cause) => core.failCause(cause),
    onSuccess: ([value]) =>
      fiberRuntime.acquireRelease(
        core.as(core.sync(() => MutableRef.incrementAndGet(self.ownerCount)), value),
        () => releaseOwner(self)
      )
  })

/** @internal */
export const releaseOwner = <Key, Error, Value>(
  self: Complete<Key, Error, Value>
): Effect.Effect<never, never, void> =>
  Exit.matchEffect(self.exit, {
    onFailure: () => core.unit,
    onSuccess: ([, finalizer]) =>
      core.flatMap(
        core.sync(() => MutableRef.decrementAndGet(self.ownerCount)),
        (numOwner) => effect.when(finalizer(Exit.unit), () => numOwner === 0)
      )
  })

/** @internal */
const ScopedCacheSymbolKey = "effect/ScopedCache"

/** @internal */
export const ScopedCacheTypeId: ScopedCache.ScopedCacheTypeId = Symbol.for(
  ScopedCacheSymbolKey
) as ScopedCache.ScopedCacheTypeId

const scopedCacheVariance = {
  _Key: (_: unknown) => _,
  _Error: (_: never) => _,
  _Value: (_: never) => _
}

class ScopedCacheImpl<Key, Environment, Error, Value> implements ScopedCache.ScopedCache<Key, Error, Value> {
  readonly [ScopedCacheTypeId] = scopedCacheVariance
  readonly cacheState: CacheState<Key, Error, Value>
  constructor(
    readonly capacity: number,
    readonly scopedLookup: ScopedCache.Lookup<Key, Environment, Error, Value>,
    readonly clock: Clock.Clock,
    readonly timeToLive: (exit: Exit.Exit<Error, Value>) => Duration.Duration,
    readonly context: Context.Context<Environment>
  ) {
    this.cacheState = initialCacheState()
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  cacheStats(): Effect.Effect<never, never, Cache.CacheStats> {
    return core.sync(() =>
      _cache.makeCacheStats({
        hits: this.cacheState.hits,
        misses: this.cacheState.misses,
        size: MutableHashMap.size(this.cacheState.map)
      })
    )
  }

  getOption(key: Key): Effect.Effect<Scope.Scope, Error, Option.Option<Value>> {
    return core.suspend(() =>
      Option.match(MutableHashMap.get(this.cacheState.map, key), {
        onNone: () => effect.succeedNone,
        onSome: (value) => core.flatten(this.resolveMapValue(value))
      })
    )
  }

  getOptionComplete(key: Key): Effect.Effect<Scope.Scope, never, Option.Option<Value>> {
    return core.suspend(() =>
      Option.match(MutableHashMap.get(this.cacheState.map, key), {
        onNone: () => effect.succeedNone,
        onSome: (value) =>
          core.flatten(this.resolveMapValue(value, true)) as Effect.Effect<Scope.Scope, never, Option.Option<Value>>
      })
    )
  }

  contains(key: Key): Effect.Effect<never, never, boolean> {
    return core.sync(() => MutableHashMap.has(this.cacheState.map, key))
  }

  entryStats(key: Key): Effect.Effect<never, never, Option.Option<Cache.EntryStats>> {
    return core.sync(() => {
      const value = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
      if (value === undefined) {
        return Option.none()
      }
      switch (value._tag) {
        case "Complete": {
          return Option.some(_cache.makeEntryStats(value.entryStats.loadedMillis))
        }
        case "Pending": {
          return Option.none()
        }
        case "Refreshing": {
          return Option.some(_cache.makeEntryStats(value.complete.entryStats.loadedMillis))
        }
      }
    })
  }

  get(key: Key): Effect.Effect<Scope.Scope, Error, Value> {
    return pipe(
      this.lookupValueOf(key),
      effect.memoize,
      core.flatMap((lookupValue) =>
        core.suspend(() => {
          let k: _cache.MapKey<Key> | undefined = undefined
          let value = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
          if (value === undefined) {
            k = _cache.makeMapKey(key)
            if (MutableHashMap.has(this.cacheState.map, key)) {
              value = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
            } else {
              MutableHashMap.set(this.cacheState.map, key, pending(k, lookupValue))
            }
          }
          if (value === undefined) {
            this.trackMiss()
            return core.zipRight(
              this.ensureMapSizeNotExceeded(k!),
              lookupValue
            )
          }

          return core.map(
            this.resolveMapValue(value),
            core.flatMap(Option.match({
              onNone: () => {
                const val = value as Complete<Key, Error, Value>
                const current = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
                if (Equal.equals(current, value)) {
                  MutableHashMap.remove(this.cacheState.map, key)
                }
                return pipe(
                  this.ensureMapSizeNotExceeded(val.key),
                  core.zipRight(releaseOwner(val)),
                  core.zipRight(this.get(key))
                )
              },
              onSome: core.succeed
            }))
          )
        })
      ),
      core.flatten
    )
  }

  invalidate(key: Key): Effect.Effect<never, never, void> {
    return core.suspend(() => {
      if (MutableHashMap.has(this.cacheState.map, key)) {
        const mapValue = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))!
        MutableHashMap.remove(this.cacheState.map, key)
        switch (mapValue._tag) {
          case "Complete": {
            return releaseOwner(mapValue)
          }
          case "Pending": {
            return core.unit
          }
          case "Refreshing": {
            return releaseOwner(mapValue.complete)
          }
        }
      }
      return core.unit
    })
  }

  invalidateAll(): Effect.Effect<never, never, void> {
    return fiberRuntime.forEachParUnboundedDiscard(
      HashSet.fromIterable(Array.from(this.cacheState.map).map(([key]) => key)),
      (key) => this.invalidate(key),
      false
    )
  }

  refresh(key: Key): Effect.Effect<never, Error, void> {
    return pipe(
      this.lookupValueOf(key),
      effect.memoize,
      core.flatMap((scoped) => {
        let value = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
        let newKey: _cache.MapKey<Key> | undefined = undefined
        if (value === undefined) {
          newKey = _cache.makeMapKey(key)
          if (MutableHashMap.has(this.cacheState.map, key)) {
            value = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
          } else {
            MutableHashMap.set(this.cacheState.map, key, pending(newKey, scoped))
          }
        }
        let finalScoped: Effect.Effect<never, never, Effect.Effect<Scope.Scope, Error, Value>>
        if (value === undefined) {
          finalScoped = core.zipRight(
            this.ensureMapSizeNotExceeded(newKey!),
            scoped
          )
        } else {
          switch (value._tag) {
            case "Complete": {
              if (this.hasExpired(value.timeToLive)) {
                finalScoped = core.succeed(this.get(key))
              } else {
                const current = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
                if (Equal.equals(current, value)) {
                  const mapValue = refreshing(scoped, value)
                  MutableHashMap.set(this.cacheState.map, key, mapValue)
                  finalScoped = scoped
                } else {
                  finalScoped = core.succeed(this.get(key))
                }
              }
              break
            }
            case "Pending": {
              finalScoped = value.scoped
              break
            }
            case "Refreshing": {
              finalScoped = value.scoped
              break
            }
          }
        }
        return core.flatMap(finalScoped, (s) => fiberRuntime.scopedEffect(core.asUnit(s)))
      })
    )
  }

  size(): Effect.Effect<never, never, number> {
    return core.sync(() => MutableHashMap.size(this.cacheState.map))
  }

  resolveMapValue(value: MapValue<Key, Error, Value>, ignorePending = false) {
    switch (value._tag) {
      case "Complete": {
        this.trackHit()
        if (this.hasExpired(value.timeToLive)) {
          return core.succeed(effect.succeedNone)
        }
        return core.as(
          this.ensureMapSizeNotExceeded(value.key),
          effect.asSome(toScoped(value))
        )
      }
      case "Pending": {
        this.trackHit()

        if (ignorePending) {
          return core.succeed(effect.succeedNone)
        }

        return core.zipRight(
          this.ensureMapSizeNotExceeded(value.key),
          core.map(value.scoped, effect.asSome)
        )
      }
      case "Refreshing": {
        this.trackHit()
        if (this.hasExpired(value.complete.timeToLive)) {
          if (ignorePending) {
            return core.succeed(effect.succeedNone)
          }
          return core.zipRight(
            this.ensureMapSizeNotExceeded(value.complete.key),
            core.map(value.scoped, effect.asSome)
          )
        }
        return core.as(
          this.ensureMapSizeNotExceeded(value.complete.key),
          effect.asSome(toScoped(value.complete))
        )
      }
    }
  }

  lookupValueOf(key: Key): Effect.Effect<never, never, Effect.Effect<Scope.Scope, Error, Value>> {
    return pipe(
      core.onInterrupt(
        core.flatMap(Scope.make(), (scope) =>
          pipe(
            this.scopedLookup(key),
            core.provideContext(pipe(this.context, Context.add(Scope.Scope, scope))),
            core.exit,
            core.map((exit) => [exit, ((exit) => Scope.close(scope, exit)) as Scope.Scope.Finalizer] as const)
          )),
        () => core.sync(() => MutableHashMap.remove(this.cacheState.map, key))
      ),
      core.flatMap(([exit, release]) => {
        const now = this.clock.unsafeCurrentTimeMillis()
        const expiredAt = now + Duration.toMillis(this.timeToLive(exit))
        switch (exit._tag) {
          case "Success": {
            const exitWithFinalizer: Exit.Exit<never, [Value, Scope.Scope.Finalizer]> = Exit.succeed([
              exit.value,
              release
            ])
            const completedResult = complete<Key, Error, Value>(
              _cache.makeMapKey(key),
              exitWithFinalizer,
              MutableRef.make(1),
              _cache.makeEntryStats(now),
              expiredAt
            )
            let previousValue: MapValue<Key, Error, Value> | undefined = undefined
            if (MutableHashMap.has(this.cacheState.map, key)) {
              previousValue = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
            }
            MutableHashMap.set(this.cacheState.map, key, completedResult)
            return core.sync(() =>
              core.flatten(
                core.as(
                  this.cleanMapValue(previousValue),
                  toScoped(completedResult)
                )
              )
            )
          }
          case "Failure": {
            const completedResult = complete<Key, Error, Value>(
              _cache.makeMapKey(key),
              exit as Exit.Exit<Error, readonly [Value, Scope.Scope.Finalizer]>,
              MutableRef.make(0),
              _cache.makeEntryStats(now),
              expiredAt
            )
            let previousValue: MapValue<Key, Error, Value> | undefined = undefined
            if (MutableHashMap.has(this.cacheState.map, key)) {
              previousValue = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
            }
            MutableHashMap.set(this.cacheState.map, key, completedResult)
            return core.zipRight(
              release(exit),
              core.sync(() =>
                core.flatten(
                  core.as(
                    this.cleanMapValue(previousValue),
                    toScoped(completedResult)
                  )
                )
              )
            )
          }
        }
      }),
      effect.memoize,
      core.flatten
    )
  }

  hasExpired(timeToLive: number): boolean {
    return this.clock.unsafeCurrentTimeMillis() > timeToLive
  }

  trackHit(): void {
    this.cacheState.hits = this.cacheState.hits + 1
  }

  trackMiss(): void {
    this.cacheState.misses = this.cacheState.misses + 1
  }

  trackAccess(key: _cache.MapKey<Key>): Array<MapValue<Key, Error, Value>> {
    const cleanedKeys: Array<MapValue<Key, Error, Value>> = []
    MutableQueue.offer(this.cacheState.accesses, key)
    if (MutableRef.compareAndSet(this.cacheState.updating, false, true)) {
      let loop = true
      while (loop) {
        const key = MutableQueue.poll(this.cacheState.accesses, MutableQueue.EmptyMutableQueue)
        if (key === MutableQueue.EmptyMutableQueue) {
          loop = false
        } else {
          this.cacheState.keys.add(key)
        }
      }
      let size = MutableHashMap.size(this.cacheState.map)
      loop = size > this.capacity
      while (loop) {
        const key = this.cacheState.keys.remove()
        if (key === undefined) {
          loop = false
        } else {
          if (MutableHashMap.has(this.cacheState.map, key.current)) {
            const removed = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key.current))!
            MutableHashMap.remove(this.cacheState.map, key.current)
            size = size - 1
            cleanedKeys.push(removed)
            loop = size > this.capacity
          }
        }
      }
      MutableRef.set(this.cacheState.updating, false)
    }
    return cleanedKeys
  }

  cleanMapValue(mapValue: MapValue<Key, Error, Value> | undefined): Effect.Effect<never, never, void> {
    if (mapValue === undefined) {
      return core.unit
    }
    switch (mapValue._tag) {
      case "Complete": {
        return releaseOwner(mapValue)
      }
      case "Pending": {
        return core.unit
      }
      case "Refreshing": {
        return releaseOwner(mapValue.complete)
      }
    }
  }

  ensureMapSizeNotExceeded(key: _cache.MapKey<Key>): Effect.Effect<never, never, void> {
    return fiberRuntime.forEachParUnboundedDiscard(
      this.trackAccess(key),
      (cleanedMapValue) => this.cleanMapValue(cleanedMapValue),
      false
    )
  }
}

/** @internal */
export const make = <Key, Environment, Error, Value>(
  options: {
    readonly lookup: ScopedCache.Lookup<Key, Environment, Error, Value>
    readonly capacity: number
    readonly timeToLive: Duration.DurationInput
  }
): Effect.Effect<Environment | Scope.Scope, never, ScopedCache.ScopedCache<Key, Error, Value>> => {
  const timeToLive = Duration.decode(options.timeToLive)
  return makeWith({
    capacity: options.capacity,
    lookup: options.lookup,
    timeToLive: () => timeToLive
  })
}

/** @internal */
export const makeWith = <Key, Environment, Error, Value>(
  options: {
    readonly capacity: number
    readonly lookup: ScopedCache.Lookup<Key, Environment, Error, Value>
    readonly timeToLive: (exit: Exit.Exit<Error, Value>) => Duration.DurationInput
  }
): Effect.Effect<Environment | Scope.Scope, never, ScopedCache.ScopedCache<Key, Error, Value>> =>
  core.flatMap(
    effect.clock,
    (clock) =>
      buildWith(
        options.capacity,
        options.lookup,
        clock,
        (exit) => Duration.decode(options.timeToLive(exit))
      )
  )

const buildWith = <Key, Environment, Error, Value>(
  capacity: number,
  scopedLookup: ScopedCache.Lookup<Key, Environment, Error, Value>,
  clock: Clock.Clock,
  timeToLive: (exit: Exit.Exit<Error, Value>) => Duration.Duration
): Effect.Effect<Environment | Scope.Scope, never, ScopedCache.ScopedCache<Key, Error, Value>> =>
  fiberRuntime.acquireRelease(
    core.flatMap(
      core.context<Environment>(),
      (context) =>
        core.sync(() =>
          new ScopedCacheImpl(
            capacity,
            scopedLookup,
            clock,
            timeToLive,
            context
          )
        )
    ),
    (cache) => cache.invalidateAll()
  )
