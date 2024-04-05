import type * as Clock from "../Clock.js"
import * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import * as Equal from "../Equal.js"
import type * as Exit from "../Exit.js"
import { dual, pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import * as HashSet from "../HashSet.js"
import { pipeArguments } from "../Pipeable.js"
import type * as Pool from "../Pool.js"
import { hasProperty } from "../Predicate.js"
import type * as Queue from "../Queue.js"
import type * as Ref from "../Ref.js"
import type * as Scope from "../Scope.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as queue from "./queue.js"
import * as ref from "./ref.js"

/** @internal */
const PoolSymbolKey = "effect/Pool"

/** @internal */
export const PoolTypeId: Pool.PoolTypeId = Symbol.for(
  PoolSymbolKey
) as Pool.PoolTypeId

const poolVariance = {
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: any) => _
}

interface PoolState {
  readonly size: number
  readonly free: number
}

interface Attempted<A, E> {
  readonly result: Exit.Exit<A, E>
  readonly finalizer: Effect.Effect<unknown>
}

/**
 * A `Strategy` describes the protocol for how a pool whose excess items are
 * not being used should shrink down to the minimum pool size.
 */
interface Strategy<S, R, E, A> {
  /**
   * Describes how the initial state of the strategy should be allocated.
   */
  initial(): Effect.Effect<S, never, R>
  /**
   * Describes how the state of the strategy should be updated when an item is
   * added to the pool or returned to the pool.
   */
  track(state: S, attempted: Exit.Exit<A, E>): Effect.Effect<void>
  /**
   * Describes how excess items that are not being used should shrink down.
   */
  run(
    state: S,
    getExcess: Effect.Effect<number>,
    shrink: Effect.Effect<void>
  ): Effect.Effect<void>
}

/**
 * A strategy that does nothing to shrink excess items. This is useful when
 * the minimum size of the pool is equal to its maximum size and so there is
 * nothing to do.
 */
class NoneStrategy implements Strategy<unknown, never, never, never> {
  initial(): Effect.Effect<void> {
    return core.void
  }
  track(): Effect.Effect<void> {
    return core.void
  }
  run(): Effect.Effect<void> {
    return core.void
  }
}

/**
 * A strategy that shrinks the pool down to its minimum size if items in the
 * pool have not been used for the specified duration.
 */
class TimeToLiveStrategy implements Strategy<readonly [Clock.Clock, Ref.Ref<number>], never, never, never> {
  constructor(readonly timeToLive: Duration.Duration) {}
  initial(): Effect.Effect<readonly [Clock.Clock, Ref.Ref<number>]> {
    return core.flatMap(effect.clock, (clock) =>
      core.flatMap(clock.currentTimeMillis, (now) =>
        core.map(
          ref.make(now),
          (ref) => [clock, ref] as const
        )))
  }
  track(state: readonly [Clock.Clock, Ref.Ref<number>]): Effect.Effect<void> {
    return core.asVoid(core.flatMap(
      state[0].currentTimeMillis,
      (now) => ref.set(state[1], now)
    ))
  }
  run(
    state: readonly [Clock.Clock, Ref.Ref<number>],
    getExcess: Effect.Effect<number>,
    shrink: Effect.Effect<void>
  ): Effect.Effect<void> {
    return core.flatMap(getExcess, (excess) =>
      excess <= 0
        ? core.zipRight(
          state[0].sleep(this.timeToLive),
          this.run(state, getExcess, shrink)
        )
        : pipe(
          core.zipWith(
            ref.get(state[1]),
            state[0].currentTimeMillis,
            (start, end) => end - start
          ),
          core.flatMap((duration) => {
            if (duration >= Duration.toMillis(this.timeToLive)) {
              return core.zipRight(shrink, this.run(state, getExcess, shrink))
            } else {
              return core.zipRight(state[0].sleep(this.timeToLive), this.run(state, getExcess, shrink))
            }
          })
        ))
  }
}

class PoolImpl<in out A, in out E> implements Pool.Pool<A, E> {
  readonly [PoolTypeId] = poolVariance
  constructor(
    readonly creator: Effect.Effect<A, E, Scope.Scope>,
    readonly min: number,
    readonly max: number,
    readonly isShuttingDown: Ref.Ref<boolean>,
    readonly state: Ref.Ref<PoolState>,
    readonly items: Queue.Queue<Attempted<A, E>>,
    readonly invalidated: Ref.Ref<HashSet.HashSet<A>>,
    readonly track: (exit: Exit.Exit<A, E>) => Effect.Effect<unknown>
  ) {}

  [Hash.symbol](): number {
    return pipe(
      Hash.hash(this.creator),
      Hash.combine(Hash.number(this.min)),
      Hash.combine(Hash.number(this.max)),
      Hash.combine(Hash.hash(this.isShuttingDown)),
      Hash.combine(Hash.hash(this.state)),
      Hash.combine(Hash.hash(this.items)),
      Hash.combine(Hash.hash(this.invalidated)),
      Hash.combine(Hash.hash(this.track)),
      Hash.cached(this)
    )
  }

  [Equal.symbol](that: unknown): boolean {
    return isPool(that) &&
      Equal.equals(this.creator, (that as PoolImpl<A, E>).creator) &&
      this.min === (that as PoolImpl<A, E>).min &&
      this.max === (that as PoolImpl<A, E>).max &&
      Equal.equals(this.isShuttingDown, (that as PoolImpl<A, E>).isShuttingDown) &&
      Equal.equals(this.state, (that as PoolImpl<A, E>).state) &&
      Equal.equals(this.items, (that as PoolImpl<A, E>).items) &&
      Equal.equals(this.invalidated, (that as PoolImpl<A, E>).invalidated) &&
      Equal.equals(this.track, (that as PoolImpl<A, E>).track)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  get get(): Effect.Effect<A, E, Scope.Scope> {
    const acquire = (
      restore: <AX, EX, RX>(effect: Effect.Effect<AX, EX, RX>) => Effect.Effect<AX, EX, RX>
    ): Effect.Effect<Attempted<A, E>> =>
      core.flatMap(ref.get(this.isShuttingDown), (down) =>
        down
          ? core.interrupt
          : core.flatten(ref.modify(this.state, (state) => {
            if (state.free > 0 || state.size >= this.max) {
              return [
                core.flatMap(
                  queue.take(this.items),
                  (attempted) =>
                    core.exitMatch(attempted.result, {
                      onFailure: () => core.succeed(attempted),
                      onSuccess: (item) =>
                        core.flatMap(
                          ref.get(this.invalidated),
                          (set) => {
                            if (pipe(set, HashSet.has(item))) {
                              return core.zipRight(finalizeInvalid(this, attempted), acquire(restore))
                            }
                            return core.succeed(attempted)
                          }
                        )
                    })
                ),
                { ...state, free: state.free - 1 }
              ] as const
            }
            if (state.size >= 0) {
              return [
                core.zipRight(allocate(this, restore), acquire(restore)),
                { size: state.size + 1, free: state.free + 1 }
              ] as const
            }
            return [core.interrupt, state] as const
          })))

    const release = (attempted: Attempted<A, E>): Effect.Effect<unknown> =>
      core.exitMatch(attempted.result, {
        onFailure: () =>
          core.flatten(ref.modify(this.state, (state) => {
            if (state.size <= this.min) {
              return [allocateUinterruptible(this), { ...state, free: state.free + 1 }] as const
            }
            return [core.void, { ...state, size: state.size - 1 }] as const
          })),
        onSuccess: (item) =>
          core.flatMap(ref.get(this.invalidated), (set) => {
            if (pipe(set, HashSet.has(item))) {
              return finalizeInvalid(this, attempted)
            }
            return pipe(
              ref.update(this.state, (state) => ({ ...state, free: state.free + 1 })),
              core.zipRight(queue.offer(this.items, attempted)),
              core.zipRight(this.track(attempted.result)),
              core.zipRight(core.whenEffect(getAndShutdown(this), ref.get(this.isShuttingDown)))
            )
          })
      })

    return pipe(
      core.uninterruptibleMask((restore) =>
        core.tap(acquire(restore), (a) => fiberRuntime.addFinalizer((_exit) => release(a)))
      ),
      fiberRuntime.withEarlyRelease,
      fiberRuntime.disconnect,
      core.flatMap(([release, attempted]) =>
        pipe(
          effect.when(release, () => isFailure(attempted)),
          core.zipRight(toEffect(attempted))
        )
      )
    )
  }

  invalidate(item: A): Effect.Effect<void> {
    return ref.update(this.invalidated, HashSet.add(item))
  }
}

const allocate = <A, E>(
  self: PoolImpl<A, E>,
  restore: <AX, EX, RX>(effect: Effect.Effect<AX, EX, RX>) => Effect.Effect<AX, EX, RX>
): Effect.Effect<unknown> =>
  core.flatMap(fiberRuntime.scopeMake(), (scope) =>
    core.flatMap(
      core.exit(restore(fiberRuntime.scopeExtend(self.creator, scope))),
      (exit) =>
        core.flatMap(
          core.succeed<Attempted<A, E>>({
            result: exit as Exit.Exit<A, E>,
            finalizer: core.scopeClose(scope, core.exitSucceed(void 0))
          }),
          (attempted) =>
            pipe(
              queue.offer(self.items, attempted),
              core.zipRight(self.track(attempted.result)),
              core.zipRight(core.whenEffect(getAndShutdown(self), ref.get(self.isShuttingDown))),
              core.as(attempted)
            )
        )
    ))

const allocateUinterruptible = <A, E>(
  self: PoolImpl<A, E>
): Effect.Effect<unknown> => core.uninterruptibleMask((restore) => allocate(self, restore))

/**
 * Returns the number of items in the pool in excess of the minimum size.
 */
const excess = <A, E>(self: PoolImpl<A, E>): Effect.Effect<number> =>
  core.map(ref.get(self.state), (state) => state.size - Math.min(self.min, state.free))

const finalizeInvalid = <A, E>(
  self: PoolImpl<A, E>,
  attempted: Attempted<A, E>
): Effect.Effect<unknown> =>
  pipe(
    forEach(attempted, (a) => ref.update(self.invalidated, HashSet.remove(a))),
    core.zipRight(attempted.finalizer),
    core.zipRight(
      core.flatten(ref.modify(self.state, (state) => {
        if (state.size <= self.min) {
          return [allocateUinterruptible(self), { ...state, free: state.free + 1 }] as const
        }
        return [core.void, { ...state, size: state.size - 1 }] as const
      }))
    )
  )

/**
 * Gets items from the pool and shuts them down as long as there are items
 * free, signalling shutdown of the pool if the pool is empty.
 */
const getAndShutdown = <A, E>(self: PoolImpl<A, E>): Effect.Effect<void> =>
  core.flatten(ref.modify(self.state, (state) => {
    if (state.free > 0) {
      return [
        core.matchCauseEffect(queue.take(self.items), {
          onFailure: () => core.void,
          onSuccess: (attempted) =>
            pipe(
              forEach(attempted, (a) => ref.update(self.invalidated, HashSet.remove(a))),
              core.zipRight(attempted.finalizer),
              core.zipRight(ref.update(self.state, (state) => ({ ...state, size: state.size - 1 }))),
              core.flatMap(() => getAndShutdown(self))
            )
        }),
        { ...state, free: state.free - 1 }
      ] as const
    }
    if (state.size > 0) {
      return [core.void, state] as const
    }
    return [queue.shutdown(self.items), { ...state, size: state.size - 1 }] as const
  }))

/**
 * Begins pre-allocating pool entries based on minimum pool size.
 */
const initialize = <A, E>(self: PoolImpl<A, E>): Effect.Effect<void> =>
  fiberRuntime.replicateEffect(
    core.uninterruptibleMask((restore) =>
      core.flatten(ref.modify(self.state, (state) => {
        if (state.size < self.min && state.size >= 0) {
          return [
            allocate(self, restore),
            { size: state.size + 1, free: state.free + 1 }
          ] as const
        }
        return [core.void, state] as const
      }))
    ),
    self.min,
    { discard: true }
  )

/**
 * Shrinks the pool down, but never to less than the minimum size.
 */
const shrink = <A, E>(self: PoolImpl<A, E>): Effect.Effect<void> =>
  core.uninterruptible(
    core.flatten(ref.modify(self.state, (state) => {
      if (state.size > self.min && state.free > 0) {
        return [
          pipe(
            queue.take(self.items),
            core.flatMap((attempted) =>
              pipe(
                forEach(attempted, (a) => ref.update(self.invalidated, HashSet.remove(a))),
                core.zipRight(attempted.finalizer),
                core.zipRight(ref.update(self.state, (state) => ({ ...state, size: state.size - 1 })))
              )
            )
          ),
          { ...state, free: state.free - 1 }
        ] as const
      }
      return [core.void, state] as const
    }))
  )

const shutdown = <A, E>(self: PoolImpl<A, E>): Effect.Effect<void> =>
  core.flatten(ref.modify(self.isShuttingDown, (down) =>
    down
      ? [queue.awaitShutdown(self.items), true] as const
      : [core.zipRight(getAndShutdown(self), queue.awaitShutdown(self.items)), true]))

const isFailure = <A, E>(self: Attempted<A, E>): boolean => core.exitIsFailure(self.result)

const forEach = <E, A, E2, R>(
  self: Attempted<A, E>,
  f: (a: A) => Effect.Effect<unknown, E2, R>
): Effect.Effect<unknown, E2, R> =>
  core.exitMatch(self.result, {
    onFailure: () => core.void,
    onSuccess: f
  })

const toEffect = <A, E>(self: Attempted<A, E>): Effect.Effect<A, E> => self.result

/**
 * A more powerful variant of `make` that allows specifying a `Strategy` that
 * describes how a pool whose excess items are not being used will be shrunk
 * down to the minimum size.
 */
const makeWith = <A, E, R, S, R2>(
  options: {
    readonly acquire: Effect.Effect<A, E, R>
    readonly min: number
    readonly max: number
    readonly strategy: Strategy<S, R2, E, A>
  }
): Effect.Effect<Pool.Pool<A, E>, never, R | R2 | Scope.Scope> =>
  core.uninterruptibleMask((restore) =>
    pipe(
      fiberRuntime.all([
        core.context<R>(),
        ref.make(false),
        ref.make<PoolState>({ size: 0, free: 0 }),
        queue.bounded<Attempted<A, E>>(options.max),
        ref.make(HashSet.empty<A>()),
        options.strategy.initial()
      ]),
      core.flatMap(([context, down, state, items, inv, initial]) => {
        const pool = new PoolImpl<A, E>(
          core.mapInputContext(options.acquire, (old) => Context.merge(old)(context)),
          options.min,
          options.max,
          down,
          state,
          items,
          inv,
          (exit) => options.strategy.track(initial, exit)
        )
        return pipe(
          fiberRuntime.forkDaemon(restore(initialize(pool))),
          core.flatMap((fiber) =>
            core.flatMap(
              fiberRuntime.forkDaemon(restore(options.strategy.run(initial, excess(pool), shrink(pool)))),
              (shrink) =>
                fiberRuntime.addFinalizer(() =>
                  pipe(
                    shutdown(pool),
                    core.zipRight(core.interruptFiber(fiber)),
                    core.zipRight(core.interruptFiber(shrink))
                  )
                )
            )
          ),
          core.as<Pool.Pool<A, E>>(pool)
        )
      })
    )
  )

/** @internal */
export const isPool = (u: unknown): u is Pool.Pool<unknown, unknown> => hasProperty(u, PoolTypeId)

/** @internal */
export const make = <A, E, R>(
  options: {
    readonly acquire: Effect.Effect<A, E, R>
    readonly size: number
  }
): Effect.Effect<Pool.Pool<A, E>, never, R | Scope.Scope> =>
  makeWith({
    acquire: options.acquire,
    min: options.size,
    max: options.size,
    strategy: new NoneStrategy()
  })

/** @internal */
export const makeWithTTL = <A, E, R>(
  options: {
    readonly acquire: Effect.Effect<A, E, R>
    readonly min: number
    readonly max: number
    readonly timeToLive: Duration.DurationInput
  }
): Effect.Effect<Pool.Pool<A, E>, never, R | Scope.Scope> =>
  makeWith({
    acquire: options.acquire,
    min: options.min,
    max: options.max,
    strategy: new TimeToLiveStrategy(Duration.decode(options.timeToLive))
  })

/** @internal */
export const get = <A, E>(self: Pool.Pool<A, E>): Effect.Effect<A, E, Scope.Scope> => self.get

/** @internal */
export const invalidate = dual<
  <A>(value: A) => <E>(self: Pool.Pool<A, E>) => Effect.Effect<void, never, Scope.Scope>,
  <A, E>(self: Pool.Pool<A, E>, value: A) => Effect.Effect<void, never, Scope.Scope>
>(2, (self, value) => self.invalidate(value))
