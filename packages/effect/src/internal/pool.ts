import type { Cause } from "effect/Cause"
import type { Queue } from "effect/Queue"
import * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import type { Effect } from "../Effect.js"
import type { Exit } from "../Exit.js"
import { dual, identity } from "../Function.js"
import { pipeArguments } from "../Pipeable.js"
import type { Pool, PoolTypeId as PoolTypeId_ } from "../Pool.js"
import { hasProperty } from "../Predicate.js"
import type { Scope } from "../Scope.js"
import * as coreEffect from "./core-effect.js"
import * as core from "./core.js"
import * as defaultServices from "./defaultServices.js"
import * as circular from "./effect/circular.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as internalQueue from "./queue.js"

/** @internal */
export const PoolTypeId: PoolTypeId_ = Symbol.for("effect/Pool") as PoolTypeId_

const poolVariance = {
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
export const isPool = (u: unknown): u is Pool<unknown, unknown> => hasProperty(u, PoolTypeId)

/** @internal */
export const makeWith = <A, E, R>(options: {
  readonly acquire: Effect<A, E, R>
  readonly min: number
  readonly max: number
  readonly strategy: Strategy<A, E>
  readonly permits?: number | undefined
}): Effect<Pool<A, E>, never, Scope | R> =>
  core.uninterruptibleMask((restore) =>
    core.flatMap(core.context<R | Scope>(), (context) => {
      const scope = Context.get(context, fiberRuntime.scopeTag)
      const acquire = core.mapInputContext(
        options.acquire,
        (input) => Context.merge(context, input)
      ) as Effect<
        A,
        E,
        Scope
      >
      return internalQueue.unbounded<PoolItem<A, E>>().pipe(
        core.map((queue) =>
          new PoolImpl<A, E>(
            acquire,
            options.permits ?? 1,
            options.min,
            options.max,
            queue,
            options.strategy
          )
        ),
        core.tap((pool) =>
          restore(pool.reconcile).pipe(
            fiberRuntime.forkDaemon,
            core.tap(scope.addFinalizer(() => pool.shutdown)),
            core.tap((fiber) => scope.addFinalizer(() => core.interruptFiber(fiber)))
          )
        ),
        core.tap((pool) =>
          restore(options.strategy.run(pool)).pipe(
            fiberRuntime.forkDaemon,
            core.tap((fiber) => scope.addFinalizer(() => core.interruptFiber(fiber)))
          )
        )
      )
    })
  )

/** @internal */
export const make = <A, E, R>(options: {
  readonly acquire: Effect<A, E, R>
  readonly size: number
  readonly permits?: number | undefined
}): Effect<Pool<A, E>, never, R | Scope> =>
  makeWith({ ...options, min: options.size, max: options.size, strategy: strategyNoop() })

/** @internal */
export const makeWithTTL = <A, E, R>(options: {
  readonly acquire: Effect<A, E, R>
  readonly min: number
  readonly max: number
  readonly permits?: number | undefined
  readonly timeToLive: Duration.DurationInput
  readonly timeToLiveStrategy?: "creation" | "access" | undefined
}): Effect<Pool<A, E>, never, R | Scope> =>
  core.flatMap(
    options.timeToLiveStrategy === "creation" ?
      strategyCreationTTL<A, E>(options.timeToLive) :
      strategyAccessTTL<A, E>(options.timeToLive),
    (strategy) => makeWith({ ...options, strategy })
  )

/** @internal */
export const get = <A, E>(self: Pool<A, E>): Effect<A, E, Scope> => self.get

/** @internal */
export const invalidate: {
  <A>(item: A): <E>(self: Pool<A, E>) => Effect<void>
  <A, E>(self: Pool<A, E>, item: A): Effect<void>
} = dual(2, <A, E>(self: Pool<A, E>, item: A): Effect<void> => self.invalidate(item))

interface PoolItem<A, E> {
  readonly exit: Exit<A, E>
  finalizer: Effect<void>
  refCount: number
}

interface Strategy<A, E> {
  readonly run: (pool: PoolImpl<A, E>) => Effect<void>
  readonly onAcquire: (item: PoolItem<A, E>) => Effect<void>
}

class PoolImpl<A, E> implements Pool<A, E> {
  readonly [PoolTypeId]: Pool.Variance<A, E>[PoolTypeId_]

  private isShuttingDown = false
  readonly items = new Set<PoolItem<A, E>>()
  readonly invalidated = new Set<PoolItem<A, E>>()
  private waiters = 0

  constructor(
    readonly acquire: Effect<A, E, Scope>,
    readonly permits: number,
    readonly minSize: number,
    readonly maxSize: number,
    readonly queue: Queue<PoolItem<A, E>>,
    readonly strategy: Strategy<A, E>
  ) {
    this[PoolTypeId] = poolVariance
  }

  allocate: Effect<void> = fiberRuntime.scopeMake().pipe(
    coreEffect.bindTo("scope"),
    coreEffect.bind("exit", ({ scope }) => core.exit(fiberRuntime.scopeExtend(this.acquire, scope))),
    core.flatMap(({ exit, scope }) => {
      const item: PoolItem<A, E> = {
        exit,
        finalizer: core.catchAllCause(scope.close(exit), reportUnhandledError),
        refCount: 0
      }
      this.items.add(item)
      const offer = core.zipRight(this.strategy.onAcquire(item), this.queue.offer(item))
      return exit._tag === "Success" ? offer : core.zipRight(item.finalizer, offer)
    })
  )

  get currentUsage() {
    let count = this.waiters
    for (const item of this.items) {
      count += item.refCount
    }
    return count
  }

  get targetSize() {
    if (this.isShuttingDown) return 0
    const target = Math.ceil(this.currentUsage / this.permits)
    return Math.min(Math.max(this.minSize, target), this.maxSize)
  }

  private reconcileSemaphore = circular.unsafeMakeSemaphore(1)
  reconcileLoop: Effect<void> = core.suspend(() => {
    if (this.items.size >= this.targetSize) {
      return core.void
    }
    return core.zipRight(this.allocate, this.reconcileLoop)
  })
  reconcile = this.reconcileSemaphore.withPermits(1)(this.reconcileLoop)

  getPoolItem: Effect<PoolItem<A, E>, never, Scope> = core.uninterruptibleMask((restore) =>
    core.flatMap(fiberRuntime.scopeTag, (scope) => {
      this.waiters++
      return restore(this.reconcile).pipe(
        core.zipRight(restore(this.queue.take)),
        core.onExit((_) => core.sync(() => this.waiters--)),
        core.flatMap((poolItem) => {
          if (!this.items.has(poolItem) || this.invalidated.has(poolItem)) {
            return this.getPoolItem
          } else if (poolItem.exit._tag === "Failure") {
            this.items.delete(poolItem)
            return core.succeed(poolItem)
          }
          poolItem.refCount++
          const addFinalizer = scope.addFinalizer(
            () =>
              core.suspend(() => {
                poolItem.refCount--
                if (this.invalidated.has(poolItem)) {
                  return this.invalidatePoolItem(poolItem)
                }
                return poolItem.refCount === (this.permits - 1) ?
                  this.queue.offer(poolItem) :
                  core.void
              })
          )
          return core.as(
            poolItem.refCount < this.permits
              ? core.zipRight(addFinalizer, this.queue.offer(poolItem))
              : addFinalizer,
            poolItem
          )
        })
      )
    })
  )

  get: Effect<A, E, Scope> = core.flatMap(
    core.suspend(() => this.isShuttingDown ? core.interrupt : this.getPoolItem),
    (_) => _.exit
  )

  invalidate(item: A): Effect<void> {
    return core.suspend(() => {
      if (this.isShuttingDown) return core.void
      for (const poolItem of this.items) {
        if (poolItem.exit._tag === "Success" && poolItem.exit.value === item) {
          return core.uninterruptible(this.invalidatePoolItem(poolItem))
        }
      }
      return core.void
    })
  }

  invalidatePoolItem(poolItem: PoolItem<A, E>): Effect<void> {
    return core.suspend(() => {
      if (poolItem.refCount === 0) {
        this.items.delete(poolItem)
        this.invalidated.delete(poolItem)
        return core.zipRight(poolItem.finalizer, this.reconcile)
      }
      this.invalidated.add(poolItem)
      return core.void
    })
  }

  get shutdown(): Effect<void> {
    return core.suspend(() => {
      if (this.isShuttingDown) return core.void
      this.isShuttingDown = true
      const size = this.items.size
      const semaphore = circular.unsafeMakeSemaphore(size)
      return core.forEachSequentialDiscard(this.items, (item) => {
        if (item.refCount > 0) {
          item.finalizer = core.zipLeft(item.finalizer, semaphore.release(1))
          this.invalidated.add(item)
          return semaphore.take(1)
        }
        this.items.delete(item)
        this.invalidated.delete(item)
        return item.finalizer
      }).pipe(
        core.zipRight(this.queue.shutdown),
        core.zipRight(semaphore.take(size))
      )
    })
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

const strategyNoop = <A, E>(): Strategy<A, E> => ({
  run: (_) => core.void,
  onAcquire: (_) => core.void
})

const strategyCreationTTL = <A, E>(ttl: Duration.DurationInput) =>
  defaultServices.clockWith((clock) =>
    core.map(internalQueue.unbounded<PoolItem<A, E>>(), (queue) => {
      const ttlMillis = Duration.toMillis(ttl)
      const creationTimes = new WeakMap<PoolItem<A, E>, number>()
      return identity<Strategy<A, E>>({
        run: (pool) => {
          const process = (item: PoolItem<A, E>): Effect<void> =>
            core.suspend(() => {
              if (pool.invalidated.has(item)) return core.void
              const now = clock.unsafeCurrentTimeMillis()
              const created = creationTimes.get(item)!
              const remaining = ttlMillis - (now - created)
              return remaining > 0
                ? coreEffect.delay(process(item), remaining)
                : pool.invalidatePoolItem(item)
            })
          return queue.take.pipe(
            core.tap(process),
            coreEffect.forever
          )
        },
        onAcquire: (item) =>
          core.suspend(() => {
            creationTimes.set(item, clock.unsafeCurrentTimeMillis())
            return queue.offer(item)
          })
      })
    })
  )

const strategyAccessTTL = <A, E>(ttl: Duration.DurationInput) =>
  core.map(internalQueue.unbounded<PoolItem<A, E>>(), (queue) => {
    return identity<Strategy<A, E>>({
      run: (pool) => {
        const process: Effect<void> = core.suspend(() => {
          const excess = pool.items.size - pool.targetSize
          if (excess <= 0) return core.void
          return queue.take.pipe(
            core.tap((item) => pool.invalidatePoolItem(item)),
            core.zipRight(process)
          )
        })
        return process.pipe(
          coreEffect.delay(ttl),
          coreEffect.forever
        )
      },
      onAcquire: (item) => queue.offer(item)
    })
  })

const reportUnhandledError = <E>(cause: Cause<E>) =>
  core.withFiberRuntime<void>((fiber) => {
    const unhandledLogLevel = fiber.getFiberRef(core.currentUnhandledErrorLogLevel)
    if (unhandledLogLevel._tag === "Some") {
      fiber.log("Unhandled error in pool finalizer", cause, unhandledLogLevel)
    }
    return core.void
  })
