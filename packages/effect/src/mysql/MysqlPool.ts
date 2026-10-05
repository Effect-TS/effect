/**
 * Scoped pools of native MySQL sessions.
 *
 * @since 4.0.0
 */
import * as Clock from "../Clock.ts"
import type * as Crypto from "../Crypto.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Pool from "../Pool.ts"
import * as Scope from "../Scope.ts"
import type * as SocketConnector from "../socket/SocketConnector.ts"
import { ConnectionError, SqlError } from "../sql/SqlError.ts"
import * as MysqlConnection from "./MysqlConnection.ts"
/**
 * Connection settings and limits for a MySQL pool.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config extends MysqlConnection.Config {
  readonly minConnections?: number | undefined
  readonly maxConnections?: number | undefined
  readonly idleTimeout?: Duration.Input | undefined
  readonly connectionTTL?: Duration.Input | undefined
}
/**
 * A pool that lends each session exclusively until its checkout scope closes.
 *
 * @category models
 * @since 4.0.0
 */
export interface MysqlPool {
  readonly get: Effect.Effect<MysqlConnection.MysqlConnection, SqlError, Scope.Scope>
  readonly invalidate: (connection: MysqlConnection.MysqlConnection) => Effect.Effect<void>
}
/**
 * Creates a scoped MySQL pool with lazy connections and idle retirement.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: Config
  ): Effect.fn.Return<MysqlPool, SqlError, Scope.Scope | SocketConnector.SocketConnector | Crypto.Crypto> {
    const min = options.minConnections ?? 0
    const max = options.maxConnections ?? 10
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < 1 || min > max) {
      return yield* Effect.fail(
        new SqlError({
          reason: new ConnectionError({ message: "MySQL: Invalid pool size", cause: undefined, operation: "pool" })
        })
      )
    }
    const clock = yield* Clock.Clock
    const created = new WeakMap<MysqlConnection.MysqlConnection, number>()
    const used = new WeakSet<MysqlConnection.MysqlConnection>()
    const ttl = options.connectionTTL === undefined
      ? undefined
      : Duration.toMillis(Duration.fromInputUnsafe(options.connectionTTL))
    const pool = yield* Pool.makeWithTTL({
      acquire: Effect.tap(
        MysqlConnection.make(options),
        (connection) => Effect.sync(() => created.set(connection, clock.currentTimeMillisUnsafe()))
      ),
      min,
      max,
      concurrency: 1,
      timeToLive: options.idleTimeout ?? "60 seconds",
      timeToLiveStrategy: "usage"
    })
    const get = Effect.gen(function*() {
      while (true) {
        const lease = yield* Scope.fork(yield* Effect.scope)
        const connection = yield* Scope.provide(Pool.get(pool), lease)
        if (
          connection.isClosed() ||
          (ttl !== undefined && used.has(connection) &&
            clock.currentTimeMillisUnsafe() - created.get(connection)! >= ttl)
        ) {
          yield* Pool.invalidate(pool, connection)
          yield* Scope.close(lease, Exit.void)
          continue
        }
        used.add(connection)
        yield* Scope.addFinalizer(
          lease,
          Effect.suspend(() => connection.isClosed() ? Pool.invalidate(pool, connection) : Effect.void)
        )
        return connection
      }
    })
    return {
      get,
      invalidate: (connection) => Pool.invalidate(pool, connection)
    }
  }
)
