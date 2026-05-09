/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Libsql from "@libsql/client"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-libsql/LibsqlClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface LibsqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: LibsqlClientConfig
}

/**
 * @category tags
 * @since 1.0.0
 */
export const LibsqlClient = Context.GenericTag<LibsqlClient>("@effect/sql-libsql/LibsqlClient")

const LibsqlTransaction = Context.GenericTag<readonly [LibsqlConnection, counter: number]>(
  "@effect/sql-libsql/LibsqlClient/LibsqlTransaction"
)

/**
 * @category models
 * @since 1.0.0
 */
export type LibsqlClientConfig = LibsqlClientConfig.Full | LibsqlClientConfig.Live

/**
 * @category models
 * @since 1.0.0
 */
export declare namespace LibsqlClientConfig {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface Base {
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly transformResultNames?: ((str: string) => string) | undefined
    readonly transformQueryNames?: ((str: string) => string) | undefined
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Full extends Base {
    /** The database URL.
     *
     * The client supports `libsql:`, `http:`/`https:`, `ws:`/`wss:` and `file:` URL. For more infomation,
     * please refer to the project README:
     *
     * https://github.com/libsql/libsql-client-ts#supported-urls
     */
    readonly url: string | URL
    /** Authentication token for the database. */
    readonly authToken?: Redacted.Redacted | undefined
    /** Encryption key for the database. */
    readonly encryptionKey?: Redacted.Redacted | undefined
    /** URL of a remote server to synchronize database with. */
    readonly syncUrl?: string | URL | undefined
    /** Sync interval in seconds. */
    readonly syncInterval?: number | undefined
    /** Enables or disables TLS for `libsql:` URLs.
     *
     * By default, `libsql:` URLs use TLS. You can set this option to `false` to disable TLS.
     */
    readonly tls?: boolean | undefined
    /** How to convert SQLite integers to JavaScript values:
     *
     * - `"number"` (default): returns SQLite integers as JavaScript `number`-s (double precision floats).
     * `number` cannot precisely represent integers larger than 2^53-1 in absolute value, so attempting to read
     * larger integers will throw a `RangeError`.
     * - `"bigint"`: returns SQLite integers as JavaScript `bigint`-s (arbitrary precision integers). Bigints can
     * precisely represent all SQLite integers.
     * - `"string"`: returns SQLite integers as strings.
     */
    readonly intMode?: "number" | "bigint" | "string" | undefined
    /** Concurrency limit.
     *
     * By default, the client performs up to 20 concurrent requests. You can set this option to a higher
     * number to increase the concurrency limit or set it to 0 to disable concurrency limits completely.
     */
    readonly concurrency?: number | undefined
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Live extends Base {
    readonly liveClient: Libsql.Client
  }
}

interface LibsqlConnection extends Connection {
  readonly beginTransaction: Effect.Effect<LibsqlConnection, SqlError>
  readonly commit: Effect.Effect<void, SqlError>
  readonly rollback: Effect.Effect<void, SqlError>
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: LibsqlClientConfig
): Effect.Effect<LibsqlClient, never, Scope.Scope | Reactivity.Reactivity> =>
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

    class LibsqlConnectionImpl implements LibsqlConnection {
      constructor(readonly sdk: Libsql.Client | Libsql.Transaction) {}

      run(
        sql: string,
        params: ReadonlyArray<unknown> = []
      ) {
        return Effect.map(
          Effect.tryPromise({
            try: () => this.sdk.execute({ sql, args: params as Array<any> }),
            catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
          }),
          (results) => results.rows
        )
      }

      runRaw(
        sql: string,
        params: ReadonlyArray<unknown> = []
      ) {
        return Effect.tryPromise({
          try: () => this.sdk.execute({ sql, args: params as Array<any> }),
          catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
        })
      }

      execute(
        sql: string,
        params: ReadonlyArray<unknown>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return transformRows
          ? Effect.map(this.run(sql, params), transformRows)
          : this.run(sql, params)
      }
      executeRaw(sql: string, params: ReadonlyArray<unknown>) {
        return this.runRaw(sql, params)
      }
      executeValues(sql: string, params: ReadonlyArray<unknown>) {
        return Effect.map(this.run(sql, params), (rows) => rows.map((row) => Array.from(row) as Array<any>))
      }
      executeUnprepared(
        sql: string,
        params: ReadonlyArray<unknown>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return this.execute(sql, params, transformRows)
      }
      executeStream() {
        return Effect.dieMessage("executeStream not implemented")
      }
      get beginTransaction() {
        return Effect.map(
          Effect.tryPromise({
            try: () => (this.sdk as Libsql.Client).transaction("write"),
            catch: (cause) => new SqlError({ cause, message: "Failed to begin transaction" })
          }),
          (tx) => new LibsqlConnectionImpl(tx)
        )
      }
      get commit() {
        return Effect.tryPromise({
          try: () => (this.sdk as Libsql.Transaction).commit(),
          catch: (cause) => new SqlError({ cause, message: "Failed to commit transaction" })
        })
      }
      get rollback() {
        return Effect.tryPromise({
          try: () => (this.sdk as Libsql.Transaction).rollback(),
          catch: (cause) => new SqlError({ cause, message: "Failed to rollback transaction" })
        })
      }
    }

    const connection = "liveClient" in options
      ? new LibsqlConnectionImpl(options.liveClient)
      : yield* Effect.map(
        Effect.acquireRelease(
          Effect.sync(() =>
            Libsql.createClient(
              {
                ...options,
                authToken: Redacted.isRedacted(options.authToken)
                  ? Redacted.value(options.authToken)
                  : options.authToken,
                encryptionKey: Redacted.isRedacted(options.encryptionKey)
                  ? Redacted.value(options.encryptionKey)
                  : options.encryptionKey,
                url: options.url.toString(),
                syncUrl: options.syncUrl?.toString()
              } as Libsql.Config
            )
          ),
          (sdk) => Effect.sync(() => sdk.close())
        ),
        (sdk) => new LibsqlConnectionImpl(sdk)
      )
    const semaphore = yield* Effect.makeSemaphore(1)

    const withTransaction = Client.makeWithTransaction({
      transactionTag: LibsqlTransaction,
      spanAttributes,
      acquireConnection: Effect.uninterruptibleMask((restore) =>
        Scope.make().pipe(
          Effect.bindTo("scope"),
          Effect.bind("conn", ({ scope }) =>
            restore(semaphore.take(1)).pipe(
              Effect.zipRight(Scope.addFinalizer(scope, semaphore.release(1))),
              Effect.zipRight(connection.beginTransaction)
            )),
          Effect.map(({ conn, scope }) => [scope, conn] as const)
        )
      ),
      begin: () => Effect.void, // already begun in acquireConnection
      savepoint: (conn, id) => conn.executeRaw(`SAVEPOINT effect_sql_${id};`, []),
      commit: (conn) => conn.commit,
      rollback: (conn) => conn.rollback,
      rollbackSavepoint: (conn, id) => conn.executeRaw(`ROLLBACK TO SAVEPOINT effect_sql_${id};`, [])
    })

    const acquirer = Effect.flatMap(
      Effect.serviceOption(LibsqlTransaction),
      Option.match({
        onNone: () => semaphore.withPermits(1)(Effect.succeed(connection as LibsqlConnection)),
        onSome: ([conn]) => Effect.succeed(conn)
      })
    )

    return Object.assign(
      yield* Client.make({
        acquirer,
        compiler,
        spanAttributes,
        transformRows
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        withTransaction,
        sdk: connection.sdk
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<LibsqlClientConfig>
): Layer.Layer<LibsqlClient | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(LibsqlClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: LibsqlClientConfig
): Layer.Layer<LibsqlClient | Client.SqlClient> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(LibsqlClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))
