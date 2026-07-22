/**
 * Turso adapter for Effect SQL, backed by `@tursodatabase/database`.
 *
 * This module provides a {@link TursoClient} and the generic SQL client service
 * for the in-process Rust Turso engine. It uses Effect SQL's SQLite compiler,
 * supports a managed engine connection or a caller-owned live connection,
 * classifies Turso and SQLite failures as `SqlError`s, and provides transaction
 * support with savepoints. Streaming queries are not implemented by this driver.
 *
 * @since 4.0.0
 */
import { connect } from "@tursodatabase/database"
import type { DatabaseOpts, DatabasePromise, StatementPromise } from "@tursodatabase/database-common"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Client from "effect/unstable/sql/SqlClient"
import type { Connection } from "effect/unstable/sql/SqlConnection"
import { classifySqliteError, SqlError } from "effect/unstable/sql/SqlError"
import * as Statement from "effect/unstable/sql/Statement"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

const classifyError = (cause: unknown, message: string, operation: string) =>
  classifySqliteError(cause, { message, operation })

/**
 * Runtime type identifier used to mark `TursoClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-tursodatabase/TursoClient"

/**
 * Type-level identifier used to mark `TursoClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-tursodatabase/TursoClient"

/**
 * Turso-backed SQL client service, extending `SqlClient` with its runtime type marker and client configuration.
 *
 * @category models
 * @since 4.0.0
 */
export interface TursoClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: TursoClientConfig
  readonly sdk: DatabasePromise
}

/**
 * Service tag for the Turso client service.
 *
 * **When to use**
 *
 * Use to access or provide a Turso client through the Effect context.
 *
 * @category services
 * @since 4.0.0
 */
export const TursoClient = Context.Service<TursoClient>("@effect/sql-tursodatabase/TursoClient")

/**
 * Configuration for a Turso client, either by supplying connection options or an existing live connection.
 *
 * @category models
 * @since 4.0.0
 */
export type TursoClientConfig = TursoClientConfig.Full | TursoClientConfig.Live

/**
 * Namespace containing the configuration variants for `TursoClient`.
 *
 * @since 4.0.0
 */
export declare namespace TursoClientConfig {
  /**
   * Shared Turso client options for span attributes and query/result name transformations.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Base {
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly transformResultNames?: ((str: string) => string) | undefined
    readonly transformQueryNames?: ((str: string) => string) | undefined
  }

  /**
   * Connection-based Turso configuration used to open a managed engine connection.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Full extends Base, DatabaseOpts {
    /**
     * The database path.
     *
     * **Details**
     *
     * The in-process Turso engine opens a local database file by path, or an
     * in-memory database with `":memory:"`. Unlike libSQL, the engine does not
     * accept `file:`/`libsql:`/`http:` URLs — pass a filesystem path.
     */
    readonly url: string | URL
  }

  /**
   * Configuration that uses an existing Turso connection. The supplied `liveClient` is caller-owned and is not closed by the Effect client.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Live extends Base {
    readonly liveClient: DatabasePromise
  }
}

/**
 * Creates a scoped Turso SQL client with transaction support. When given connection options it opens and closes the engine connection; when given `liveClient`, the caller retains ownership.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: TursoClientConfig
): Effect.Effect<TursoClient, never, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(
        options.transformResultNames
      ).array :
      undefined

    const spanAttributes: Array<[string, unknown]> = [
      ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
      [ATTR_DB_SYSTEM_NAME, "sqlite"]
    ]

    const db = "liveClient" in options
      ? options.liveClient
      : yield* Effect.acquireRelease(
        Effect.promise(() => {
          const { spanAttributes: _s, transformQueryNames: _q, transformResultNames: _r, url, ...opts } = options
          return connect(url.toString(), opts as DatabaseOpts)
        }),
        (db) => Effect.promise(() => db.close())
      )

    // `@tursodatabase/database` types `prepare` as async, but some engine
    // versions return the statement synchronously. Wrapping in an async thunk
    // normalizes both shapes for `Effect.tryPromise`.
    const prepare = (sql: string) =>
      Effect.tryPromise({
        try: async () => db.prepare(sql),
        catch: (cause) => new SqlError({ reason: classifyError(cause, "Failed to prepare statement", "prepare") })
      })

    const runStatement = (
      statement: StatementPromise,
      params: ReadonlyArray<unknown>,
      raw: boolean
    ) =>
      Effect.withFiber<ReadonlyArray<any>, SqlError>((fiber) => {
        if (Context.get(fiber.context, Client.SafeIntegers)) {
          statement.safeIntegers(true)
        }
        return Effect.tryPromise({
          try: async () => {
            if (statement.reader) {
              return await statement.all(...params)
            }
            const result = await statement.run(...params)
            return raw ? result as unknown as ReadonlyArray<any> : []
          },
          catch: (cause) => new SqlError({ reason: classifyError(cause, "Failed to execute statement", "execute") })
        })
      })

    const runValues = (
      statement: StatementPromise,
      params: ReadonlyArray<unknown>
    ) =>
      Effect.tryPromise({
        try: async () => {
          if (statement.reader) {
            return await statement.raw(true).all(...params) as ReadonlyArray<ReadonlyArray<unknown>>
          }
          await statement.run(...params)
          return []
        },
        catch: (cause) => new SqlError({ reason: classifyError(cause, "Failed to execute statement", "execute") })
      })

    const run = (sql: string, params: ReadonlyArray<unknown>, raw = false) =>
      Effect.flatMap(prepare(sql), (statement) => runStatement(statement, params, raw))

    const connection = identity<Connection>({
      execute(sql, params, transformRows) {
        return transformRows
          ? Effect.map(run(sql, params), transformRows)
          : run(sql, params)
      },
      executeRaw(sql, params) {
        return run(sql, params, true)
      },
      executeValues(sql, params) {
        return Effect.flatMap(prepare(sql), (statement) => runValues(statement, params))
      },
      executeValuesUnprepared(sql, params) {
        return Effect.flatMap(prepare(sql), (statement) => runValues(statement, params))
      },
      executeUnprepared(sql, params, transformRows) {
        return transformRows
          ? Effect.map(run(sql, params), transformRows)
          : run(sql, params)
      },
      executeStream(_sql, _params) {
        return Stream.die("executeStream not implemented")
      }
    })

    const semaphore = yield* Semaphore.make(1)

    const acquirer = semaphore.withPermits(1)(Effect.succeed(connection))
    const transactionAcquirer = Effect.uninterruptibleMask((restore) => {
      const fiber = Fiber.getCurrent()!
      const scope = Context.getUnsafe(fiber.context, Scope.Scope)
      return Effect.as(
        Effect.tap(
          restore(semaphore.take(1)),
          () => Scope.addFinalizer(scope, semaphore.release(1))
        ),
        connection
      )
    })

    return Object.assign(
      yield* Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes,
        transformRows
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        sdk: db
      }
    )
  })

/**
 * Creates a layer from a `Config`-wrapped Turso client configuration, providing both `TursoClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  config: Config.Wrap<TursoClientConfig>
): Layer.Layer<TursoClient | Client.SqlClient, Config.ConfigError> =>
  Layer.effectContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(TursoClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Creates a layer from a concrete Turso client configuration, providing both `TursoClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: TursoClientConfig
): Layer.Layer<TursoClient | Client.SqlClient> =>
  Layer.effectContext(
    Effect.map(make(config), (client) =>
      Context.make(TursoClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))
