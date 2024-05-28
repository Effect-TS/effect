import * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import * as Effect from "../Effect.js"
import type * as Exit from "../Exit.js"
import * as Fiber from "../Fiber.js"
import { dual, identity } from "../Function.js"
import { pipeArguments } from "../Pipeable.js"
import type { Pool, PoolTypeId as PoolTypeId_ } from "../Pool.js"
import { hasProperty } from "../Predicate.js"
import * as Queue from "../Queue.js"
import * as Scope from "../Scope.js"

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
  readonly acquire: Effect.Effect<A, E, R>
  readonly min: number
  readonly max: number
  readonly strategy: Strategy<A, E>
  readonly permits?: number | undefined
}): Effect.Effect<Pool<A, E>, never, Scope.Scope | R> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.flatMap(Effect.context<R | Scope.Scope>(), (context) => {
      const scope = Context.get(context, Scope.Scope)
      const acquire = Effect.mapInputContext(
        options.acquire,
        (input) => Context.merge(context, input)
      ) as Effect.Effect<
        A,
        E,
        Scope.Scope
      >
      return Queue.unbounded<PoolItem<A, E>>().pipe(
        Effect.map((queue) =>
          new PoolImpl<A, E>(
            acquire,
            options.permits ?? 1,
            options.min,
            options.max,
            queue,
            options.strategy
          )
        ),
        Effect.tap((pool) =>
          restore(pool.reconcile).pipe(
            Effect.forkDaemon,
            Effect.tap(Scope.addFinalizer(scope, pool.shutdown)),
            Effect.tap((fiber) => Scope.addFinalizer(scope, Fiber.interrupt(fiber)))
          )
        ),
        Effect.tap((pool) =>
          restore(options.strategy.run(pool)).pipe(
            Effect.forkDaemon,
            Effect.tap((fiber) => Scope.addFinalizer(scope, Fiber.interrupt(fiber)))
          )
        )
      )
    })
  )

/** @internal */
export const make = <A, E, R>(options: {
  readonly acquire: Effect.Effect<A, E, R>
  readonly size: number
  readonly permits?: number | undefined
}): Effect.Effect<Pool<A, E>, never, R | Scope.Scope> =>
  makeWith({ ...options, min: options.size, max: options.size, strategy: strategyNoop() })

/** @internal */
export const makeWithTTL = <A, E, R>(options: {
  readonly acquire: Effect.Effect<A, E, R>
  readonly min: number
  readonly max: number
  readonly permits?: number | undefined
  readonly timeToLive: Duration.DurationInput
  readonly timeToLiveStrategy?: "creation" | "access" | undefined
}): Effect.Effect<Pool<A, E>, never, R | Scope.Scope> =>
  Effect.flatMap(
    options.timeToLiveStrategy === "creation" ?
      strategyCreationTTL<A, E>(options.timeToLive) :
      strategyAccessTTL<A, E>(options.timeToLive),
    (strategy) => makeWith({ ...options, strategy })
  )

/** @internal */
export const get = <A, E>(self: Pool<A, E>): Effect.Effect<A, E, Scope.Scope> => self.get

/** @internal */
export const invalidate: {
  <A>(item: A): <E>(self: Pool<A, E>) => Effect.Effect<void>
  <A, E>(self: Pool<A, E>, item: A): Effect.Effect<void>
} = dual(2, <A, E>(self: Pool<A, E>, item: A): Effect.Effect<void> => self.invalidate(item))

interface PoolItem<A, E> {
  readonly exit: Exit.Exit<A, E>
  finalizer: Effect.Effect<void>
  refCount: number
}

interface Strategy<A, E> {
  readonly run: (pool: PoolImpl<A, E>) => Effect.Effect<void>
  readonly onAcquire: (item: PoolItem<A, E>) => Effect.Effect<void>
}

class PoolImpl<A, E> implements Pool<A, E> {
  readonly [PoolTypeId]: Pool.Variance<A, E>[PoolTypeId_]

  private isShuttingDown = false
  readonly items = new Set<PoolItem<A, E>>()
  readonly invalidated = new Set<PoolItem<A, E>>()
  private waiters = 0

  constructor(
    readonly acquire: Effect.Effect<A, E, Scope.Scope>,
    readonly permits: number,
    readonly minSize: number,
    readonly maxSize: number,
    readonly queue: Queue.Queue<PoolItem<A, E>>,
    readonly strategy: Strategy<A, E>
  ) {
    this[PoolTypeId] = poolVariance
  }

  allocate: Effect.Effect<void> = Scope.make().pipe(
    Effect.bindTo("scope"),
    Effect.bind("exit", ({ scope }) => Effect.exit(Scope.extend(this.acquire, scope))),
    Effect.flatMap(({ exit, scope }) => {
      const item: PoolItem<A, E> = {
        exit,
        finalizer: Scope.close(scope, exit),
        refCount: 0
      }
      this.items.add(item)
      const offer = Effect.zipRight(this.strategy.onAcquire(item), this.queue.offer(item))
      return exit._tag === "Success" ? offer : Effect.zipRight(item.finalizer, offer)
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

  private reconcileSemaphore = Effect.unsafeMakeSemaphore(1)
  reconcileLoop: Effect.Effect<void> = Effect.suspend(() => {
    if (this.items.size >= this.targetSize) {
      return Effect.void
    }
    return Effect.zipRight(this.allocate, this.reconcileLoop)
  })
  reconcile = this.reconcileSemaphore.withPermits(1)(this.reconcileLoop)

  getPoolItem: Effect.Effect<PoolItem<A, E>, never, Scope.Scope> = Effect.uninterruptibleMask((restore) =>
    Effect.suspend(() => {
      this.waiters++
      return restore(this.reconcile).pipe(
        Effect.zipRight(restore(this.queue.take)),
        Effect.ensuring(Effect.sync(() => this.waiters--)),
        Effect.flatMap((poolItem) => {
          if (!this.items.has(poolItem) || this.invalidated.has(poolItem)) {
            return this.getPoolItem
          }
          return Effect.succeed(poolItem)
        })
      )
    }).pipe(
      Effect.tap((poolItem) => {
        if (poolItem.exit._tag === "Failure") {
          this.items.delete(poolItem)
          return Effect.void
        }
        poolItem.refCount++
        return Effect.flatMap(Effect.scope, (scope) => {
          const addFinalizer = Scope.addFinalizer(
            scope,
            Effect.suspend(() => {
              poolItem.refCount--
              if (this.invalidated.has(poolItem)) {
                return this.invalidatePoolItem(poolItem)
              }
              return poolItem.refCount === (this.permits - 1) ?
                this.queue.offer(poolItem) :
                Effect.void
            })
          )
          return poolItem.refCount < this.permits
            ? Effect.zipRight(addFinalizer, this.queue.offer(poolItem))
            : addFinalizer
        })
      })
    )
  )

  get: Effect.Effect<A, E, Scope.Scope> = Effect.flatMap(
    Effect.suspend(() => this.isShuttingDown ? Effect.interrupt : this.getPoolItem),
    (_) => _.exit
  )

  invalidate(item: A): Effect.Effect<void> {
    return Effect.uninterruptible(Effect.suspend(() => {
      if (this.isShuttingDown) return Effect.void
      for (const poolItem of this.items) {
        if (poolItem.exit._tag === "Success" && poolItem.exit.value === item) {
          return this.invalidatePoolItem(poolItem)
        }
      }
      return Effect.void
    }))
  }

  invalidatePoolItem(poolItem: PoolItem<A, E>): Effect.Effect<void> {
    return Effect.suspend(() => {
      if (poolItem.refCount === 0) {
        this.items.delete(poolItem)
        this.invalidated.delete(poolItem)
        return this.waiters > 0
          ? Effect.zipRight(poolItem.finalizer, this.reconcile)
          : poolItem.finalizer
      }
      this.invalidated.add(poolItem)
      return Effect.void
    })
  }

  get shutdown(): Effect.Effect<void> {
    return Effect.suspend(() => {
      this.isShuttingDown = true
      const size = this.items.size
      const semaphore = Effect.unsafeMakeSemaphore(size)
      return Effect.zipRight(
        Effect.forEach(this.items, (item) => {
          if (item.refCount > 0) {
            item.finalizer = Effect.zipRight(item.finalizer, semaphore.release(1))
            this.invalidated.add(item)
            return semaphore.take(1)
          }
          this.items.delete(item)
          this.invalidated.delete(item)
          return item.finalizer
        }),
        semaphore.take(size)
      )
    })
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

const strategyNoop = <A, E>(): Strategy<A, E> => ({
  run: (_) => Effect.void,
  onAcquire: (_) => Effect.void
})

const strategyCreationTTL = <A, E>(ttl: Duration.DurationInput) =>
  Effect.gen(function*() {
    const ttlMillis = Duration.toMillis(ttl)
    const clock = yield* Effect.clock
    const creationTimes = new WeakMap<PoolItem<A, E>, number>()
    const queue = yield* Queue.unbounded<PoolItem<A, E>>()

    return identity<Strategy<A, E>>({
      run: (pool) => {
        const process = (item: PoolItem<A, E>): Effect.Effect<void> =>
          Effect.suspend(() => {
            if (pool.invalidated.has(item)) return Effect.void
            const now = clock.unsafeCurrentTimeMillis()
            const created = creationTimes.get(item)!
            const remaining = ttlMillis - (now - created)
            return remaining > 0
              ? Effect.delay(process(item), remaining)
              : pool.invalidatePoolItem(item)
          })
        return queue.take.pipe(
          Effect.tap(process),
          Effect.forever
        )
      },
      onAcquire: (item) =>
        Effect.suspend(() => {
          creationTimes.set(item, clock.unsafeCurrentTimeMillis())
          return queue.offer(item)
        })
    })
  })

const strategyAccessTTL = <A, E>(ttl: Duration.DurationInput) =>
  Effect.gen(function*() {
    const queue = yield* Queue.unbounded<PoolItem<A, E>>()

    return identity<Strategy<A, E>>({
      run: (pool) =>
        Effect.suspend(() => {
          const excess = pool.items.size - pool.targetSize
          if (excess <= 0) return Effect.void
          return Effect.flatMap(
            queue.takeUpTo(excess),
            Effect.forEach((item) => pool.invalidatePoolItem(item), { discard: true })
          )
        }).pipe(
          Effect.delay(ttl),
          Effect.forever
        ),
      onAcquire: (item) => queue.offer(item)
    })
  })
