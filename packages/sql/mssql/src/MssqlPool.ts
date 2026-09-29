/**
 * Pools of native `MssqlConnection` sessions.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Pool from "effect/Pool"
import type * as Scope from "effect/Scope"
import type { SqlError } from "effect/sql/SqlError"
import { connectionInternals } from "./internal/connection.ts"
import * as MssqlConnection from "./MssqlConnection.ts"

/**
 * The runtime type identifier for `MssqlPool`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-mssql/MssqlPool"

/**
 * The type-level identifier for `MssqlPool`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-mssql/MssqlPool"

/**
 * Connection and sizing settings for a SQL Server session pool.
 *
 * **Details**
 *
 * The defaults are 1 to 10 connections, each replaced 45 minutes after it
 * was opened.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config extends MssqlConnection.Config {
  readonly minConnections?: number | undefined
  readonly maxConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined
}

/**
 * A SQL Server session pool.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlPool {
  readonly [TypeId]: TypeId
  readonly config: Config
  /** Checks out a session for exclusive use until the scope closes. */
  readonly get: Effect.Effect<MssqlConnection.MssqlConnection, SqlError, Scope.Scope>
  /**
   * Removes a session so the pool can replace it. Sessions that fail fatally
   * are removed automatically.
   */
  readonly invalidate: (connection: MssqlConnection.MssqlConnection) => Effect.Effect<void>
}

/**
 * The service tag for `MssqlPool`.
 *
 * @category services
 * @since 4.0.0
 */
export const MssqlPool = Context.Service<MssqlPool>("@effect/sql-mssql/MssqlPool")

/**
 * Creates a scoped SQL Server session pool.
 *
 * **Details**
 *
 * `minConnections` sessions open eagerly, and more open on demand up to
 * `maxConnections`. Closing the scope shuts the pool down and releases every
 * session.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: Config): Effect.fn.Return<MssqlPool, SqlError, Scope.Scope> {
  const runFork = Effect.runForkWith(yield* Effect.context())
  const deadConnections = new Set<MssqlConnection.MssqlConnection>()

  // Assigned below, once the pool exists. `acquire` only runs when the pool
  // opens a connection, which is always after that.
  let pool: Pool.Pool<MssqlConnection.MssqlConnection, SqlError>
  const acquire = Effect.tap(MssqlConnection.make(options), (connection) =>
    Effect.sync(() => {
      connectionInternals(connection).retireHooks.add(() => {
        deadConnections.add(connection)
        // A checkout already waiting for this connection would never reach
        // the next check of `deadConnections`. Tell the pool now so it can
        // replace the connection and admit them.
        runFork(Pool.invalidate(pool, connection))
      })
    }))

  pool = yield* Pool.makeWithTTL({
    acquire,
    min: options.minConnections ?? 1,
    max: options.maxConnections ?? 10,
    timeToLive: options.connectionTTL ?? Duration.minutes(45),
    timeToLiveStrategy: "creation"
  })

  const isDead = (connection: MssqlConnection.MssqlConnection): boolean =>
    connectionInternals(connection).deadError() !== undefined

  // A checkout runs per statement, so the case where nothing has died stays a
  // plain flatMap; retrying is the exception and pays for the loop.
  const retry: Effect.Effect<MssqlConnection.MssqlConnection, SqlError, Scope.Scope> = Effect.gen(function*() {
    while (true) {
      if (deadConnections.size > 0) {
        const dead = Array.from(deadConnections)
        deadConnections.clear()
        yield* Effect.forEach(dead, (connection) => Pool.invalidate(pool, connection), { discard: true })
      }
      const connection = yield* Pool.get(pool)
      if (isDead(connection)) {
        yield* Pool.invalidate(pool, connection)
        continue
      }
      return connection
    }
  })

  const get: Effect.Effect<MssqlConnection.MssqlConnection, SqlError, Scope.Scope> = Effect.suspend(() =>
    deadConnections.size > 0 ? retry : Effect.flatMap(Pool.get(pool), (connection) =>
      isDead(connection)
        ? Effect.andThen(Pool.invalidate(pool, connection), retry)
        : Effect.succeed(connection))
  )

  const mssqlPool: MssqlPool = {
    [TypeId]: TypeId,
    config: options,
    get,
    invalidate: (connection) => Pool.invalidate(pool, connection)
  }
  return mssqlPool
})
