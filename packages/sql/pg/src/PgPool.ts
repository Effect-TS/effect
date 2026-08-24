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
 * once; statements still run one at a time per connection. With it disabled
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
      concurrency: multiplex ? Number.MAX_SAFE_INTEGER : 1,
      timeToLive: options.idleTimeout ?? Duration.seconds(10),
      timeToLiveStrategy: "usage"
    })

    const get: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope> = Effect.gen(function*() {
      while (true) {
        if (deadConnections.size > 0) {
          const dead = Array.from(deadConnections)
          deadConnections.clear()
          yield* Effect.forEach(dead, (connection) => Pool.invalidate(pool, connection), { discard: true })
        }
        const connection = yield* Pool.get(pool)
        if (connectionInternals(connection).deadError() !== undefined) {
          yield* Pool.invalidate(pool, connection)
          continue
        }
        if (connectionTTL !== undefined) {
          const openedAt = createdAt.get(connection)
          const now = clock.currentTimeMillisUnsafe()
          if (openedAt !== undefined && now - openedAt >= connectionTTL) {
            yield* Pool.invalidate(pool, connection)
            continue
          }
        }
        return connection
      }
    })

    const pgPool: PgPool = {
      [TypeId]: TypeId,
      config: options,
      get,
      reserve: Effect.flatMap(get, (connection) => connection.pin),
      invalidate: (connection) =>
        Effect.scoped(
          Pool.invalidate(pool, connectionInternals(connection).base as PgConnection.PgConnection)
        )
    }
    return pgPool
  })
