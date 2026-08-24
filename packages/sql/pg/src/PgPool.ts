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

/**
 * How many statements a multiplexed pool lets share one connection.
 *
 * The backend runs a connection's pipelined statements in the order it received
 * them, so everything queued behind a slow statement waits for it. Letting an
 * unlimited number share a connection means the pool never has a reason to open
 * a second one, and a single slow statement then holds up every other statement
 * in flight.
 *
 * Spreading instead across the connections the pool is allowed to open costs
 * nothing: the statements that do share a connection still leave in one write.
 * The product with `maxConnections` is what keeps the pipeline deep enough to
 * be worth batching, so a pool of one still stacks statements while a pool of
 * ten spreads them four to a connection.
 */
const multiplexPoolConcurrency = (maxConnections: number): number => Math.max(4, Math.ceil(32 / maxConnections))

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
 * With `multiplex` enabled a pool item may be checked out by several fibers at
 * once and their statements are pipelined together, spread across the
 * connections the pool is allowed to open. A reserved connection is removed
 * from shared circulation until its scope closes. With multiplexing disabled
 * (the default) every checkout is exclusive.
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
export const make = Effect.fnUntraced(function*(options: Config): Effect.fn.Return<PgPool, SqlError, Scope.Scope> {
  const clock = yield* Clock.Clock
  const runFork = Effect.runForkWith(yield* Effect.context())

  const multiplex = options.multiplex ?? false
  const connectionTTL = options.connectionTTL !== undefined
    ? Duration.toMillis(Duration.fromInputUnsafe(options.connectionTTL))
    : undefined
  const deadConnections = new Set<PgConnection.PgConnection>()
  const createdAt = new WeakMap<PgConnection.PgConnection, number>()

  // Assigned below, once the pool exists. `acquire` only runs when the pool
  // opens a connection, which is always after that.
  let pool: Pool.Pool<PgConnection.PgConnection, SqlError>
  const acquire = Effect.tap(PgConnection.make(options), (connection) =>
    Effect.sync(() => {
      createdAt.set(connection, clock.currentTimeMillisUnsafe())
      const internals = connectionInternals(connection)
      internals.fatalHooks.add(() => {
        deadConnections.add(connection)
        // `deadConnections` is only read by the next checkout, and a checkout
        // already waiting for this connection would never get that far. Tell
        // the pool now so it can replace the connection and admit them.
        runFork(Pool.invalidate(pool, connection))
      })
      // Pinning a shared session has to take it out of circulation, or a
      // second checkout lands on the connection its own stream is holding.
      if (multiplex) internals.reserve = Pool.reserve(pool, connection)
    }))

  const maxConnections = options.maxConnections ?? 10
  pool = yield* Pool.makeWithTTL({
    acquire,
    min: options.minConnections ?? 0,
    max: maxConnections,
    concurrency: multiplex ? multiplexPoolConcurrency(maxConnections) : 1,
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

  // `pin` reserves the pool item itself, so this needs no help.
  const reserve = Effect.flatMap(get, (connection) => connection.pin)

  const pgPool: PgPool = {
    [TypeId]: TypeId,
    config: options,
    get,
    reserve,
    invalidate: (connection) => Pool.invalidate(pool, connectionInternals(connection).base as PgConnection.PgConnection)
  }
  return pgPool
})
