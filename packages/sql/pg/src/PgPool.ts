/**
 * Pools of native `PgConnection` sessions.
 *
 * @since 4.0.0
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Pool from "effect/Pool"
import type * as Scope from "effect/Scope"
import type { SqlError } from "effect/sql/SqlError"
import { SpanPropagationEnabled } from "effect/sql/Statement"
import * as Tracer from "effect/Tracer"
import { connectionInternals } from "./internal/connection.ts"
import * as PgConnection from "./PgConnection.ts"

const defaultMultiplexConcurrency = 32

/**
 * The runtime type identifier for `PgPool`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-pg/PgPool"

/**
 * The type-level identifier for `PgPool`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-pg/PgPool"

/**
 * Connection and sizing settings for a PostgreSQL session pool.
 *
 * **Details**
 *
 * The defaults are 0 to 10 connections and a 10-second idle timeout.
 * `connectionTTL` replaces connections that exceed the configured lifetime.
 * Every connection is used at least once, so a TTL of zero disables reuse.
 *
 * With `multiplex` enabled, fibers may share pooled connections for pipelined
 * queries. Reserved connections remain exclusive. Without multiplexing, every
 * checkout is exclusive.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config extends PgConnection.Config {
  readonly idleTimeout?: Duration.Input | undefined
  readonly maxConnections?: number | undefined
  readonly minConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined
  /**
   * How many statements may share one connection when `multiplex` is on.
   * Defaults to `32`. Statements are pipelined into one write, so a higher
   * number means fewer round trips, but it also means a slow statement holds
   * up more of the statements queued behind it.
   */
  readonly multiplexConcurrency?: number | undefined
}

/**
 * A PostgreSQL session pool.
 *
 * @category models
 * @since 4.0.0
 */
export interface PgPool {
  readonly [TypeId]: TypeId
  readonly config: Config
  /**
   * Checks out a session until the scope closes. Without multiplexing the
   * checkout is exclusive. With multiplexing the
   * session may be shared with other fibers, so multi-statement work should
   * use `reserve` instead.
   */
  readonly get: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope>
  /**
   * Checks out a session for exclusive use until the scope closes. Use this for
   * transactions and listeners on a multiplexed pool.
   */
  readonly reserve: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope>
  /**
   * Removes a session so the pool can replace it. Fatal protocol and socket
   * errors invalidate sessions automatically.
   */
  /**
   * Lends a session for the duration of one effect and takes it back on any
   * exit, without opening a scope for it.
   *
   * **Details**
   *
   * For work that finishes with the effect that runs it. A lease that has to
   * outlive its effect - a stream, a transaction - takes `get` or `reserve`.
   */
  readonly use: <A, E, R>(
    f: (connection: PgConnection.PgConnection) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | SqlError, R>
  readonly invalidate: (connection: PgConnection.PgConnection) => Effect.Effect<void>
}

/**
 * The service tag for `PgPool`.
 *
 * @category services
 * @since 4.0.0
 */
export const PgPool = Context.Service<PgPool>("@effect/sql-pg/PgPool")

/**
 * Creates a scoped PostgreSQL session pool.
 *
 * **Details**
 *
 * Connections are opened lazily up to `maxConnections` and released down to
 * `minConnections` after `idleTimeout` without use. Closing the scope shuts
 * the pool down and releases every session.
 *
 * With `SpanPropagationEnabled`, a statement that waited for a new session gets
 * a `db.connect` child span covering the part of the connect it waited for.
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
  const checkedOut = new WeakSet<PgConnection.PgConnection>()

  // The pool opens sessions on its own fiber, so a connect span made there has
  // no parent. Record when each session opened, and on its first checkout report
  // the part of the connect that statement waited for, under its span. A session
  // that was ready before the statement began cost it nothing. `unreported`
  // keeps checkouts on their plain path once every open has been reported.
  const openedDuring = new WeakMap<
    PgConnection.PgConnection,
    { readonly startTime: bigint; readonly endTime: bigint }
  >()
  let unreported = 0
  const connect = Effect.suspend(() => {
    const startTime = clock.currentTimeNanosUnsafe()
    return Effect.tap(PgConnection.make(options), (connection) =>
      Effect.sync(() => {
        openedDuring.set(connection, { startTime, endTime: clock.currentTimeNanosUnsafe() })
        unreported++
      }))
  })
  const forgetOpen = (connection: PgConnection.PgConnection) => {
    if (openedDuring.delete(connection)) unreported--
  }

  const reportConnect = (connection: PgConnection.PgConnection): Effect.Effect<void> =>
    Effect.withFiber((fiber) => {
      const opened = openedDuring.get(connection)
      if (opened === undefined) return Effect.void
      forgetOpen(connection)
      const statement = fiber.cache.span
      if (!fiber.cache.tracerEnabled || !fiber.getRef(SpanPropagationEnabled) || statement?._tag !== "Span") {
        return Effect.void
      }
      const waitedFrom = statement.status.startTime
      if (opened.endTime < waitedFrom) return Effect.void
      const span = fiber.getRef(Tracer.Tracer).span({
        name: "db.connect",
        parent: Option.some(statement),
        annotations: Context.empty(),
        links: [],
        startTime: opened.startTime > waitedFrom ? opened.startTime : waitedFrom,
        kind: "client",
        root: false,
        sampled: statement.sampled
      })
      span.attribute("db.system.name", "postgresql")
      if (options.applicationName !== undefined) {
        span.attribute("db.client.connection.pool.name", options.applicationName)
      }
      span.attribute("db.client.connection.connect_time_ms", Number(opened.endTime - opened.startTime) / 1e6)
      span.end(opened.endTime, Exit.void)
      return Effect.void
    })

  const handOut = (connection: PgConnection.PgConnection) =>
    unreported === 0 ? Effect.succeed(connection) : Effect.as(reportConnect(connection), connection)

  // Assigned below, once the pool exists. `acquire` only runs when the pool
  // opens a connection, which is always after that.
  let pool: Pool.Pool<PgConnection.PgConnection, SqlError>
  const acquire = Effect.tap(connect, (connection) =>
    Effect.sync(() => {
      createdAt.set(connection, clock.currentTimeMillisUnsafe())
      const internals = connectionInternals(connection)
      internals.retireHooks.add(() => {
        forgetOpen(connection)
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
    concurrency: multiplex
      ? Math.max(1, options.multiplexConcurrency ?? defaultMultiplexConcurrency)
      : 1,
    timeToLive: options.idleTimeout ?? Duration.seconds(10),
    timeToLiveStrategy: "usage"
  })

  const expired = (connection: PgConnection.PgConnection): boolean => {
    if (connectionInternals(connection).deadError() !== undefined) return true
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
    deadConnections.size > 0 ?
      Effect.flatMap(retry, handOut) :
      Effect.flatMap(Pool.get(pool), (connection) =>
        expired(connection)
          ? Effect.andThen(Pool.invalidate(pool, connection), Effect.flatMap(retry, handOut))
          : handOut(connection))
  )

  // `pin` reserves the pool item itself, so this needs no help.
  const reserve = Effect.flatMap(get, (connection) => connection.pin)

  // `Pool.use` cannot pre-check a session. Use it only when no TTL applies and
  // no connection awaits retirement. Checking inside its callback can deadlock
  // a size-one pool while acquiring a replacement.
  const use = <A, E, R>(
    f: (connection: PgConnection.PgConnection) => Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | SqlError, R> =>
    Effect.suspend(() =>
      connectionTTL === undefined && deadConnections.size === 0
        ? Pool.use(
          pool,
          unreported === 0 ? f : (connection) => Effect.andThen(reportConnect(connection), f(connection))
        )
        : Effect.scoped(Effect.flatMap(get, f))
    )

  const pgPool: PgPool = {
    [TypeId]: TypeId,
    config: options,
    get,
    reserve,
    use,
    invalidate: (connection) => Pool.invalidate(pool, connectionInternals(connection).base as PgConnection.PgConnection)
  }
  return pgPool
})
