/**
 * Pools of native `MysqlConnection` sessions.
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
import * as MysqlConnection from "./MysqlConnection.ts"

/**
 * The runtime type identifier for `MysqlPool`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-mysql/MysqlPool"

/**
 * The type-level identifier for `MysqlPool`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-mysql/MysqlPool"

/**
 * Connection and sizing settings for a MySQL session pool.
 *
 * **Details**
 *
 * The defaults are 0 to 10 connections and a 10-second idle timeout.
 * `connectionTTL` replaces connections that exceed the configured lifetime.
 * Every connection is used at least once, so a TTL of zero disables reuse.
 *
 * Every checkout is exclusive: MySQL answers one command at a time, so there
 * is no equivalent of the multiplexing a PostgreSQL pool can offer.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config extends MysqlConnection.Config {
  readonly idleTimeout?: Duration.Input | undefined
  readonly maxConnections?: number | undefined
  readonly minConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined
}

/**
 * A MySQL session pool.
 *
 * @category models
 * @since 4.0.0
 */
export interface MysqlPool {
  readonly [TypeId]: TypeId
  readonly config: Config
  /** Checks out a session for exclusive use until the scope closes. */
  readonly get: Effect.Effect<MysqlConnection.MysqlConnection, SqlError, Scope.Scope>
  /**
   * Lends a session for the duration of one effect and takes it back on any
   * exit, without opening a scope for it.
   *
   * **Details**
   *
   * For work that finishes with the effect that runs it. A lease that has to
   * outlive its effect - a stream, a transaction - takes `get`.
   */
  readonly use: <A, E, R>(
    f: (connection: MysqlConnection.MysqlConnection) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | SqlError, R>
  /**
   * Removes a session so the pool can replace it. Fatal protocol and socket
   * errors invalidate sessions automatically.
   */
  readonly invalidate: (connection: MysqlConnection.MysqlConnection) => Effect.Effect<void>
}

/**
 * The service tag for `MysqlPool`.
 *
 * @category services
 * @since 4.0.0
 */
export const MysqlPool = Context.Service<MysqlPool>("@effect/sql-mysql/MysqlPool")

/**
 * Creates a scoped MySQL session pool.
 *
 * **Details**
 *
 * Connections are opened lazily up to `maxConnections` and released down to
 * `minConnections` after `idleTimeout` without use. Closing the scope shuts
 * the pool down and releases every session.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: Config): Effect.fn.Return<MysqlPool, SqlError, Scope.Scope> {
  const clock = yield* Clock.Clock
  const runFork = Effect.runForkWith(yield* Effect.context())

  const connectionTTL = options.connectionTTL !== undefined
    ? Duration.toMillis(Duration.fromInputUnsafe(options.connectionTTL))
    : undefined
  const deadConnections = new Set<MysqlConnection.MysqlConnection>()
  const createdAt = new WeakMap<MysqlConnection.MysqlConnection, number>()
  const checkedOut = new WeakSet<MysqlConnection.MysqlConnection>()

  // Assigned below, once the pool exists. `acquire` only runs when the pool
  // opens a connection, which is always after that.
  let pool: Pool.Pool<MysqlConnection.MysqlConnection, SqlError>
  const acquire = Effect.tap(MysqlConnection.make(options), (connection) =>
    Effect.sync(() => {
      createdAt.set(connection, clock.currentTimeMillisUnsafe())
      connectionInternals(connection).fatalHooks.add(() => {
        deadConnections.add(connection)
        // `deadConnections` is only read by the next checkout, and a checkout
        // already waiting for this connection would never get that far. Tell
        // the pool now so it can replace the connection and admit them.
        runFork(Pool.invalidate(pool, connection))
      })
    }))

  pool = yield* Pool.makeWithTTL({
    acquire,
    min: options.minConnections ?? 0,
    max: options.maxConnections ?? 10,
    // MySQL numbers the packets of a command, so a session answers one command
    // at a time and cannot be shared between fibers.
    concurrency: 1,
    timeToLive: options.idleTimeout ?? Duration.seconds(10),
    timeToLiveStrategy: "usage"
  })

  const expired = (connection: MysqlConnection.MysqlConnection): boolean => {
    if (connectionInternals(connection).isDead()) return true
    if (connectionTTL === undefined) return false
    if (!checkedOut.has(connection)) {
      checkedOut.add(connection)
      return false
    }
    const openedAt = createdAt.get(connection)
    return openedAt !== undefined && clock.currentTimeMillisUnsafe() - openedAt >= connectionTTL
  }

  // A checkout runs per statement, so the case where nothing has died and the
  // first connection is usable stays a plain flatMap; retrying is the
  // exception and pays for the loop.
  const retry: Effect.Effect<MysqlConnection.MysqlConnection, SqlError, Scope.Scope> = Effect.gen(function*() {
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

  const get: Effect.Effect<MysqlConnection.MysqlConnection, SqlError, Scope.Scope> = Effect.suspend(() =>
    deadConnections.size > 0 ? retry : Effect.flatMap(Pool.get(pool), (connection) =>
      expired(connection)
        ? Effect.andThen(Pool.invalidate(pool, connection), retry)
        : Effect.succeed(connection))
  )

  // `Pool.use` cannot check the session it hands over before running the
  // effect, so it is only taken when there is nothing to check: no session is
  // known dead, and no lifetime can have run out. Otherwise the scoped
  // checkout does its replacement pass first. Checking inside the callback
  // instead would hold one lease while acquiring another, which deadlocks a
  // pool of one.
  const use = <A, E, R>(
    f: (connection: MysqlConnection.MysqlConnection) => Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | SqlError, R> =>
    Effect.suspend(() =>
      connectionTTL === undefined && deadConnections.size === 0
        ? Pool.use(pool, f)
        : Effect.scoped(Effect.flatMap(get, f))
    )

  const mysqlPool: MysqlPool = {
    [TypeId]: TypeId,
    config: options,
    get,
    use,
    invalidate: (connection) => Pool.invalidate(pool, connection)
  }
  return mysqlPool
})
