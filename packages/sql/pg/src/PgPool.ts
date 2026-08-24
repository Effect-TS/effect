/**
 * A pool of native `PgConnection` sessions.
 *
 * `make` wraps `PgConnection.make` in an Effect `Pool`: `get` checks a session
 * out for the lifetime of a scope, `reserve` additionally pins it for
 * exclusive use (transactions, `listen`), and `invalidate` drops a dead
 * session so the pool can replace it. Sessions that die from a fatal protocol
 * or socket error are invalidated automatically. This module never imports
 * `pg`.
 *
 * @since 4.0.0
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Pool from "effect/Pool"
import type * as Scope from "effect/Scope"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { connectionInternals } from "./internal/connection.ts"
import * as PgConnection from "./PgConnection.ts"

// This needs to stay beyond any practical number of simultaneous statement
// leases. Effect Pool currently wakes one waiter when a saturated shared item
// becomes available, even if many concurrency slots reopen at once.
const multiplexPoolConcurrency = 1_048_576

/**
 * Runtime type identifier used to mark `PgPool` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-pg/PgPool"

/**
 * Type-level identifier used to mark `PgPool` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-pg/PgPool"

/**
 * Configuration for a pool of PostgreSQL sessions.
 *
 * Every `PgConnection.Config` field is accepted and applied to each session
 * the pool opens. Unspecified pool sizes match the `pg.Pool` defaults: at most
 * `10` connections, no minimum, and a `10` second idle timeout. When
 * `connectionTTL` is set, connections older than the TTL are discarded at
 * checkout and replaced.
 *
 * With `multiplex` enabled a pool item may be checked out by many fibers at
 * once and their statements are pipelined together. A reserved connection is
 * removed from shared circulation until its scope closes. With multiplexing
 * disabled (the default) every checkout is exclusive.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config extends PgConnection.Config {
  readonly idleTimeout?: Duration.Input | undefined
  readonly maxConnections?: number | undefined
  readonly minConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined
}

/**
 * A pool of PostgreSQL sessions.
 *
 * @category models
 * @since 4.0.0
 */
export interface PgPool {
  readonly [TypeId]: TypeId
  readonly config: Config
  /**
   * Checks a session out until the scope closes.
   *
   * With `multiplex` disabled the checkout is exclusive. With it enabled the
   * session may be shared with other fibers, so multi-statement work should
   * use `reserve` instead.
   */
  readonly get: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope>
  /**
   * Checks a session out and pins it: `get` plus `PgConnection.pin`.
   *
   * The returned connection is exclusively owned until the scope closes,
   * making it safe for transactions and `listen` even on a multiplexed pool.
   */
  readonly reserve: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope>
  /**
   * Drops a dead session so the pool can replace it. Sessions that die from a
   * fatal protocol or socket error are invalidated automatically; call this
   * when application code detects a broken connection the session machine
   * could not see.
   */
  readonly invalidate: (connection: PgConnection.PgConnection) => Effect.Effect<void>
}

/**
 * Service tag for a pool of PostgreSQL sessions.
 *
 * @category services
 * @since 4.0.0
 */
export const PgPool = Context.Service<PgPool>("@effect/sql-pg/PgPool")

/**
 * Creates a pool of PostgreSQL sessions.
 *
 * Connections are opened lazily up to `maxConnections` and released down to
 * `minConnections` after `idleTimeout` without use. Closing the scope shuts
 * the pool down and releases every session.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Config): Effect.Effect<PgPool, SqlError, Scope.Scope> =>
  Effect.gen(function*() {
    const clock = yield* Clock.Clock
    const multiplex = options.multiplex ?? false
    const connectionTTL = options.connectionTTL !== undefined
      ? Duration.toMillis(Duration.fromInputUnsafe(options.connectionTTL))
      : undefined
    const deadConnections = new Set<PgConnection.PgConnection>()
    const createdAt = new WeakMap<PgConnection.PgConnection, number>()

    const acquire = Effect.tap(PgConnection.make(options), (connection) =>
      Effect.sync(() => {
        createdAt.set(connection, clock.currentTimeMillisUnsafe())
        connectionInternals(connection).fatalHooks.add(() => deadConnections.add(connection))
      }))

    const pool = yield* Pool.makeWithTTL({
      acquire,
      min: options.minConnections ?? 0,
      max: options.maxConnections ?? 10,
      concurrency: multiplex ? multiplexPoolConcurrency : 1,
      timeToLive: options.idleTimeout ?? Duration.seconds(10),
      timeToLiveStrategy: "usage"
    })

    const expired = (connection: PgConnection.PgConnection): boolean => {
      if (connectionInternals(connection).deadError() !== undefined) return true
      if (connectionTTL === undefined) return false
      const openedAt = createdAt.get(connection)
      return openedAt !== undefined && clock.currentTimeMillisUnsafe() - openedAt >= connectionTTL
    }

    // A checkout runs per statement, so the case where nothing has died and the
    // first connection is usable stays a plain flatMap; retrying is the
    // exception and pays for the loop.
    const retry: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope> = Effect.gen(function*() {
      while (true) {
        if (deadConnections.size > 0) {
          const dead = Array.from(deadConnections)
          deadConnections.clear()
          yield* Effect.forEach(dead, (connection) => Pool.invalidate(pool, connection), { discard: true })
        }
        const connection = yield* Pool.get(pool)
        if (expired(connection)) {
          yield* Pool.invalidate(pool, connection)
          continue
        }
        return connection
      }
    })

    const get: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope> = Effect.suspend(() =>
      deadConnections.size > 0 ? retry : Effect.flatMap(Pool.get(pool), (connection) =>
        expired(connection)
          ? Effect.andThen(Pool.invalidate(pool, connection), retry)
          : Effect.succeed(connection))
    )

    const reserve = multiplex
      ? Effect.flatMap(get, (connection) =>
        Effect.andThen(
          reservePoolItem(pool, connectionInternals(connection).base),
          connection.pin
        ))
      : Effect.flatMap(get, (connection) => connection.pin)

    const pgPool: PgPool = {
      [TypeId]: TypeId,
      config: options,
      get,
      reserve,
      invalidate: (connection) =>
        Effect.scoped(
          Pool.invalidate(pool, connectionInternals(connection).base as PgConnection.PgConnection)
        )
    }
    return pgPool
  })

/**
 * Temporarily consumes the rest of a multiplexed pool item's capacity and
 * removes it from the availability list. The ordinary `Pool.get` lease counts
 * as one unit; the synthetic usage makes the reservation count as a full item,
 * so another checkout grows the pool when `maxConnections` permits it.
 */
const reservePoolItem = <A, E>(pool: Pool.Pool<A, E>, value: object): Effect.Effect<void, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      for (const item of pool.state.items) {
        if (item.exit._tag !== "Success" || item.exit.value !== value) continue
        pool.state.usage += pool.config.concurrency - 1
        removeAvailable(pool, item)
        return item
      }
      throw new Error("PgPool invariant violated: reserved connection is not in its pool")
    }),
    (item) =>
      Effect.sync(() => {
        pool.state.usage -= pool.config.concurrency - 1
        if (
          pool.state.items.has(item) &&
          !pool.state.invalidated.has(item) &&
          item.refCount < pool.config.concurrency
        ) {
          addAvailable(pool, item)
        }
        for (const notify of Array.from(pool.state.waiters)) notify()
      })
  ).pipe(Effect.asVoid)

const addAvailable = <A, E>(pool: Pool.Pool<A, E>, item: Pool.PoolItem<A, E>): void => {
  if (item.isAvailable) return
  item.isAvailable = true
  item.availablePrevious = pool.state.availableTail
  item.availableNext = undefined
  if (pool.state.availableTail !== undefined) {
    pool.state.availableTail.availableNext = item
  } else {
    pool.state.availableHead = item
  }
  pool.state.availableTail = item
}

const removeAvailable = <A, E>(pool: Pool.Pool<A, E>, item: Pool.PoolItem<A, E>): void => {
  if (!item.isAvailable) return
  item.isAvailable = false
  if (item.availablePrevious !== undefined) {
    item.availablePrevious.availableNext = item.availableNext
  } else {
    pool.state.availableHead = item.availableNext
  }
  if (item.availableNext !== undefined) {
    item.availableNext.availablePrevious = item.availablePrevious
  } else {
    pool.state.availableTail = item.availablePrevious
  }
  item.availablePrevious = undefined
  item.availableNext = undefined
}
