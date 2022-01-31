// ets_tracing: off

import * as CS from "../Cause/index.js"
import type * as CL from "../Clock/index.js"
import * as HS from "../Collections/Immutable/HashSet/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as T from "../Effect/index.js"
import * as Ex from "../Exit/index.js"
import * as F from "../Fiber/index.js"
import { pipe } from "../Function/index.js"
import * as M from "../Managed/index.js"
import * as Q from "../Queue/index.js"
import * as Ref from "../Ref/index.js"
import * as AT from "./Attempted.js"
import * as STR from "./Strategy.js"

abstract class Pool<Error, Item> {
  readonly [T._E]: () => Error;
  readonly [T._A]: () => Item
}

abstract class PoolInternal<Error, Item> extends Pool<Error, Item> {
  readonly [T._E]: () => Error;
  readonly [T._A]: () => Item

  abstract get(): M.IO<Error, Item>

  abstract invalidate(item: Item): T.UIO<void>
}

function concrete<Error, Item>(
  pool: Pool<Error, Item>
): asserts pool is PoolInternal<Error, Item> {
  //
}

export function get<Error, Item>(self: Pool<Error, Item>): M.IO<Error, Item> {
  concrete(self)

  return self.get()
}

export function invalidate_<Error, Item>(
  self: Pool<Error, Item>,
  item: Item
): T.UIO<void> {
  concrete(self)

  return self.invalidate(item)
}

export function invalidate<Item>(item: Item) {
  return <Error>(self: Pool<Error, Item>) => invalidate_(self, item)
}

export type Range = Tp.Tuple<[begin: number, end: number]>

interface State {
  readonly size: number
  readonly free: number
}

export class DefaultPool<R, E, A, S> extends PoolInternal<E, A> {
  constructor(
    readonly creator: M.IO<E, A>,
    readonly range: Range,
    readonly isShuttingDown: Ref.Ref<boolean>,
    readonly state: Ref.Ref<State>,
    readonly items: Q.Queue<AT.Attempted<E, A>>,
    readonly invalidated: Ref.Ref<HS.HashSet<A>>,
    readonly track: (exit: Ex.Exit<E, A>) => T.UIO<void>
  ) {
    super()
    this.excess = this.excess.bind(this)
    this.get = this.get.bind(this)
    this.initialize = this.initialize.bind(this)
    this.invalidate = this.invalidate.bind(this)
    this.shrink = this.shrink.bind(this)
    this.allocate = this.allocate.bind(this)
    this.getAndShutdown = this.getAndShutdown.bind(this)
    this.shutdown = this.shutdown.bind(this)
  }

  /**
   * Returns the number of items in the pool in excess of the minimum size.
   */
  excess(): T.UIO<number> {
    return T.map_(
      this.state.get,
      ({ free, size }) => size - Math.min(Tp.get_(this.range, 0), free)
    )
  }

  get(): M.IO<E, A> {
    const acquire: T.UIO<AT.Attempted<E, A>> = T.chain_(
      this.isShuttingDown.get,
      (down) => {
        if (down) {
          return T.interrupt
        } else {
          return T.flatten(
            Ref.modify_(this.state, ({ free, size }) => {
              if (free > 0 || size >= Tp.get_(this.range, 1)) {
                return Tp.tuple(
                  T.chain_(Q.take(this.items), (acquired) => {
                    if (acquired.result._tag === "Success") {
                      const item = acquired.result.value

                      return T.chain_(this.invalidated.get, (set) => {
                        if (HS.has_(set, item)) {
                          return pipe(
                            Ref.update_(this.state, (state) => ({
                              ...state,
                              free: state.free + 1
                            })),
                            T.zipRight(this.allocate()),
                            T.zipRight(acquire)
                          )
                        } else {
                          return T.succeed(acquired)
                        }
                      })
                    } else {
                      return T.succeed(acquired)
                    }
                  }),
                  { size, free: free - 1 }
                )
              } else if (size >= 0) {
                return Tp.tuple(T.zipRight_(this.allocate(), acquire), {
                  size: size + 1,
                  free: free + 1
                })
              } else {
                return Tp.tuple(T.interrupt, { size, free })
              }
            })
          )
        }
      }
    )

    const release = (attempted: AT.Attempted<E, A>): T.UIO<void> => {
      if (AT.isFailure(attempted)) {
        return T.flatten(
          Ref.modify_(this.state, ({ free, size }) => {
            if (size <= Tp.get_(this.range, 0)) {
              return Tp.tuple(this.allocate(), { size, free: free + 1 })
            } else {
              return Tp.tuple(T.unit, { size: size - 1, free })
            }
          })
        )
      } else {
        return pipe(
          Ref.update_(this.state, (state) => ({ ...state, free: state.free + 1 })),
          T.zipRight(Q.offer_(this.items, attempted)),
          T.zipRight(this.track(attempted.result)),
          T.zipRight(T.whenM_(this.getAndShutdown(), this.isShuttingDown.get))
        )
      }
    }

    return M.chain_(M.make_(acquire, release), AT.toManaged)
  }

  /**
   * Begins pre-allocating pool entries based on minimum pool size.
   */
  initialize(): T.UIO<void> {
    return T.replicateMUnit_(
      T.uninterruptibleMask(({ restore }) =>
        T.flatten(
          Ref.modify_(this.state, ({ free, size }) => {
            if (size < Tp.get_(this.range, 0) && size >= 0) {
              return Tp.tuple(
                pipe(
                  T.do,
                  T.bind("reservation", () => M.managedReserve(this.creator)),
                  T.bind("exit", ({ reservation }) =>
                    T.result(restore(reservation.acquire))
                  ),
                  T.bind("attempted", ({ exit, reservation }) =>
                    T.succeed(
                      new AT.Attempted(exit, reservation.release(Ex.succeed(undefined)))
                    )
                  ),
                  T.tap(({ attempted }) => Q.offer_(this.items, attempted)),
                  T.tap(({ attempted }) => this.track(attempted.result)),
                  T.tap(() => T.whenM_(this.getAndShutdown(), this.isShuttingDown.get)),
                  T.map(({ attempted }) => attempted)
                ),
                { size: size + 1, free: free + 1 }
              )
            } else {
              return Tp.tuple(T.unit, { size, free })
            }
          })
        )
      ),
      Tp.get_(this.range, 0)
    )
  }

  invalidate(item: A): T.UIO<void> {
    return Ref.update_(this.invalidated, (_) => HS.add_(_, item))
  }

  /**
   * Shrinks the pool down, but never to less than the minimum size.
   */
  shrink(): T.UIO<unknown> {
    return T.uninterruptible(
      T.flatten(
        Ref.modify_(this.state, ({ free, size }) => {
          if (size > Tp.get_(this.range, 0) && free > 0) {
            return Tp.tuple(
              T.chain_(Q.take(this.items), (attempted) =>
                pipe(
                  attempted,
                  AT.forEachUnit((a) =>
                    Ref.update_(this.invalidated, (_) => HS.remove_(_, a))
                  ),
                  T.zipRight(attempted.finalizer),
                  T.zipRight(
                    Ref.update_(this.state, (state) => ({
                      ...state,
                      size: state.size - 1
                    }))
                  )
                )
              ),
              { size, free: free - 1 }
            )
          } else {
            return Tp.tuple(T.unit, { size, free })
          }
        })
      )
    )
  }

  allocate(): T.UIO<unknown> {
    return T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bind("reservation", () => M.managedReserve(this.creator)),
        T.bind("exit", ({ reservation }) => T.result(restore(reservation.acquire))),
        T.bind("attempted", ({ exit, reservation }) =>
          T.succeed(new AT.Attempted(exit, reservation.release(Ex.succeed(undefined))))
        ),
        T.tap(({ attempted }) => Q.offer_(this.items, attempted)),
        T.tap(({ attempted }) => this.track(attempted.result)),
        T.tap(() => T.whenM_(this.getAndShutdown(), this.isShuttingDown.get)),
        T.map(({ attempted }) => attempted)
      )
    )
  }

  /**
   * Gets items from the pool and shuts them down as long as there are items
   * free, signalling shutdown of the pool if the pool is empty.
   */
  getAndShutdown(): T.UIO<void> {
    return T.flatten(
      Ref.modify_(this.state, ({ free, size }) => {
        if (free > 0) {
          return Tp.tuple(
            T.foldCauseM_(
              Q.take(this.items),
              (_) => T.unit,
              (attempted) =>
                pipe(
                  attempted,
                  AT.forEachUnit((a) =>
                    Ref.update_(this.invalidated, (_) => HS.remove_(_, a))
                  ),
                  T.zipRight(attempted.finalizer),
                  T.zipRight(
                    Ref.update_(this.state, (state) => ({
                      ...state,
                      size: state.size - 1
                    }))
                  ),
                  T.zipRight(this.getAndShutdown())
                )
            ),
            { size, free: free - 1 }
          )
        } else if (size > 0) {
          return Tp.tuple(T.unit, { size, free })
        } else {
          return Tp.tuple(Q.shutdown(this.items), { size: size - 1, free })
        }
      })
    )
  }

  shutdown(): T.UIO<void> {
    return T.flatten(
      Ref.modify_(this.isShuttingDown, (down) => {
        if (down) {
          return Tp.tuple(Q.awaitShutdown(this.items), true)
        } else {
          return Tp.tuple(
            T.zipRight_(this.getAndShutdown(), Q.awaitShutdown(this.items)),
            true
          )
        }
      })
    )
  }
}

/**
 * Creates a pool from a fixed number of pre-allocated items. This method
 * should only be used when there is no cleanup or release operation
 * associated with items in the pool. If cleanup or release is required,
 * then the `make` constructor should be used instead.
 */
export function fromIterable<A>(
  iterable0: Iterable<A>
): M.UIO<Pool<never, NonNullable<A>>> {
  return pipe(
    M.do,
    M.bind("iterable", () => M.succeed(Array.from(iterable0))),
    M.bind("source", ({ iterable }) => T.toManaged(Ref.makeRef(iterable))),
    M.let("get", ({ iterable, source }) => {
      if (!iterable.length) {
        return T.never
      } else {
        return Ref.modify_(source, (a) => {
          if (a.length > 0) {
            return Tp.tuple(a[0]!, a.slice(1))
          }

          throw new CS.IllegalArgumentException("No item in array")
        })
      }
    }),
    M.bind("pool", ({ get, iterable }) =>
      makeFixed(M.fromEffect(get), iterable.length)
    ),
    M.map(({ pool }) => pool)
  )
}

/**
 * Makes a new pool of the specified fixed size. The pool is returned in a
 * `Managed`, which governs the lifetime of the pool. When the pool is
 * shutdown because the `Managed` is used, the individual items allocated by
 * the pool will be released in some unspecified order.
 */
export function makeFixed<R, E, A>(
  get: M.Managed<R, E, A>,
  min: number
): M.RIO<R, Pool<E, A>> {
  return makeWith(get, Tp.tuple(min, min), new STR.None())
}

/**
 * Makes a new pool with the specified minimum and maximum sizes and time to
 * live before a pool whose excess items are not being used will be shrunk
 * down to the minimum size. The pool is returned in a `Managed`, which
 * governs the lifetime of the pool. When the pool is shutdown because the
 * `Managed` is used, the individual items allocated by the pool will be
 * released in some unspecified order.
 */
export function make<R, E, A>(
  get: M.IO<E, A>,
  range: Range,
  timeToLive: number
): M.RIO<R & CL.HasClock, Pool<E, A>> {
  return makeWith(get, range, new STR.TimeToLive(timeToLive))
}

/**
 * A more powerful variant of `make` that allows specifying a `Strategy` that
 * describes how a pool whose excess items are not being used will be shrunk
 * down to the minimum size.
 */
export function makeWith<R, R1, E, A>(
  get: M.Managed<R, E, A>,
  range: Range,
  strategy: STR.Strategy<R1, E, A>
): M.RIO<R & R1, Pool<E, A>> {
  return pipe(
    M.do,
    M.bind("env", () => M.environment<R>()),
    M.bind("down", () => T.toManaged(Ref.makeRef(false))),
    M.bind("state", () => T.toManaged(Ref.makeRef<State>({ size: 0, free: 0 }))),
    M.bind("items", () =>
      T.toManaged(Q.makeBounded<AT.Attempted<E, A>>(Tp.get_(range, 1)))
    ),
    M.bind("inv", () => T.toManaged(Ref.makeRef(HS.make<A>()))),
    M.bind("initial", () => T.toManaged(strategy.initial())),
    M.let(
      "pool",
      ({ down, env, initial, inv, items, state }) =>
        new DefaultPool(
          M.provideAll_(get, env),
          range,
          down,
          state,
          items,
          inv,
          strategy.track(initial)
        )
    ),
    M.bind("fiber", ({ pool }) => T.toManaged(T.forkDaemon(pool.initialize()))),
    M.bind("shrink", ({ initial, pool }) =>
      T.toManaged(T.forkDaemon(strategy.run(initial, pool.excess(), pool.shrink())))
    ),
    M.tap(({ fiber, pool, shrink }) =>
      M.finalizer(
        pipe(
          F.interrupt(fiber),
          T.zipRight(F.interrupt(shrink)),
          T.zipRight(pool.shutdown())
        )
      )
    ),
    M.map(({ pool }) => pool)
  )
}
