/**
 * Scoped pools of native SQL Server sessions.
 *
 * @since 4.0.0
 */
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Pool from "../Pool.ts"
import * as Scope from "../Scope.ts"
import type * as SocketConnector from "../socket/SocketConnector.ts"
import type { SqlError } from "../sql/SqlError.ts"
import { failure } from "./internal/errors.ts"
import * as MssqlConnection from "./MssqlConnection.ts"

/**
 * Connection settings and sizing limits for a SQL Server session pool.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config extends MssqlConnection.Config {
  readonly minConnections?: number | undefined
  readonly maxConnections?: number | undefined
  readonly idleTimeout?: Duration.Input | undefined
}

/**
 * A pool that leases SQL Server sessions exclusively until the caller's scope closes.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlPool {
  readonly get: Effect.Effect<MssqlConnection.MssqlConnection, SqlError, Scope.Scope>
  readonly reserve: Effect.Effect<MssqlConnection.MssqlConnection, SqlError, Scope.Scope>
  readonly invalidate: (connection: MssqlConnection.MssqlConnection) => Effect.Effect<void>
}

/**
 * Creates a SQL Server session pool, replacing retired sessions before reuse.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(options: Config): Effect.fn.Return<MssqlPool, SqlError, Scope.Scope | SocketConnector.SocketConnector> {
    const min = options.minConnections ?? 0
    const max = options.maxConnections ?? 10
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < 1 || min > max) {
      return yield* Effect.fail(
        failure(
          new Error("SQL Server pool requires 0 <= minConnections <= maxConnections and maxConnections >= 1"),
          "pool"
        )
      )
    }
    const pool = yield* Pool.makeWithTTL({
      acquire: MssqlConnection.make(options),
      min,
      max,
      concurrency: 1,
      timeToLive: options.idleTimeout ?? "60 seconds",
      timeToLiveStrategy: "usage"
    })
    const get: MssqlPool["get"] = Effect.gen(function*() {
      while (true) {
        const scope = yield* Scope.fork(yield* Effect.scope)
        const connection = yield* Scope.provide(Pool.get(pool), scope).pipe(
          Effect.onError(() => Scope.close(scope, Exit.void))
        )
        if (!connection.isClosed()) {
          yield* Scope.addFinalizer(
            scope,
            Effect.suspend(() => connection.isClosed() ? Pool.invalidate(pool, connection) : Effect.void)
          )
          return connection
        }
        yield* Pool.invalidate(pool, connection)
        yield* Scope.close(scope, Exit.void)
      }
    })
    return { get, reserve: get, invalidate: (connection) => Pool.invalidate(pool, connection) }
  }
)
