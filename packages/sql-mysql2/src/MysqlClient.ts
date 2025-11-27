/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import { asyncPauseResume } from "@effect/sql/SqlStream"
import * as Statement from "@effect/sql/Statement"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Mysql from "mysql2"

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-mysql2/MysqlClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface MysqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: MysqlClientConfig
}

/**
 * @category tags
 * @since 1.0.0
 */
export const MysqlClient = Context.GenericTag<MysqlClient>("@effect/sql-mysql2/MysqlClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface MysqlClientConfig {
  /**
   * Connection URI. Setting this will override the other connection options
   */
  readonly url?: Redacted.Redacted | undefined

  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined

  readonly maxConnections?: number | undefined
  readonly connectionTTL?: Duration.DurationInput | undefined

  readonly poolConfig?: Mysql.PoolOptions | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  options: MysqlClientConfig
): Effect.Effect<MysqlClient, SqlError, Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(
        options.transformResultNames
      ).array :
      undefined

    class ConnectionImpl implements Connection {
      constructor(private readonly conn: Mysql.PoolConnection | Mysql.Pool) {}

      private runRaw(
        sql: string,
        values?: ReadonlyArray<any>,
        rowsAsArray = false,
        method: "execute" | "query" = "execute"
      ) {
        return Effect.async<unknown, SqlError>((resume) => {
          ;(this.conn as any)[method]({
            sql,
            values,
            rowsAsArray
          }, (cause: unknown | null, results: unknown, _fields: any) => {
            if (cause) {
              resume(Effect.fail(new SqlError({ cause, message: "Failed to execute statement" })))
            } else {
              resume(Effect.succeed(results))
            }
          })
        })
      }

      private run(
        sql: string,
        values?: ReadonlyArray<any>,
        rowsAsArray = false,
        method: "execute" | "query" = "execute"
      ) {
        return this.runRaw(sql, values, rowsAsArray, method).pipe(
          Effect.map((results) => Array.isArray(results) ? results : [])
        )
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
        return this.run(sql, params, true)
      }
      executeUnprepared(
        sql: string,
        params: ReadonlyArray<unknown>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return transformRows
          ? Effect.map(this.run(sql, params, false, "query"), transformRows)
          : this.run(sql, params, false, "query")
      }
      executeStream(
        sql: string,
        params: ReadonlyArray<unknown>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        const stream = queryStream(this.conn as any, sql, params)
        return transformRows
          ? Stream.mapChunks(stream, (_) =>
            Chunk.unsafeFromArray(
              transformRows(Chunk.toReadonlyArray(_) as Array<object>)
            ))
          : stream
      }
    }

    const pool = options.url
      ? Mysql.createPool({
        uri: Redacted.value(options.url),
        multipleStatements: true,
        supportBigNumbers: true,
        connectionLimit: options.maxConnections!,
        idleTimeout: options.connectionTTL
          ? Duration.toMillis(options.connectionTTL)
          : undefined as any
      })
      : Mysql.createPool({
        ...(options.poolConfig ?? {}),
        host: options.host,
        port: options.port,
        database: options.database,
        user: options.username,
        password: options.password
          ? Redacted.value(options.password)
          : undefined,
        multipleStatements: true,
        supportBigNumbers: true,
        connectionLimit: options.maxConnections,
        maxIdle: options.poolConfig?.maxIdle ?? 0,
        idleTimeout: options.connectionTTL
          ? Duration.toMillis(options.connectionTTL)
          : undefined
      } as Mysql.PoolOptions)

    yield* Effect.acquireRelease(
      Effect.async<void, SqlError>((resume) => {
        ;(pool as any).query("SELECT 1", (cause: Error) => {
          if (cause) {
            resume(Effect.fail(
              new SqlError({
                cause,
                message: "MysqlClient: Failed to connect"
              })
            ))
          } else {
            resume(Effect.void)
          }
        })
      }),
      () =>
        Effect.async<void>((resume) => {
          pool.end(() => resume(Effect.void))
        })
    ).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(5),
        onTimeout: () =>
          new SqlError({
            message: "MysqlClient: Connection timeout",
            cause: new Error("connection timeout")
          })
      })
    )

    const poolConnection = new ConnectionImpl(pool)

    const acquireConn = Effect.acquireRelease(
      Effect.async<Mysql.PoolConnection, SqlError>((resume) => {
        pool.getConnection((cause, conn) => {
          if (cause) {
            resume(new SqlError({ cause, message: "Failed to acquire connection" }))
          } else {
            resume(Effect.succeed(conn))
          }
        })
      }),
      (conn) => Effect.sync(() => conn.release())
    )

    const transactionAcquirer = Effect.map(
      acquireConn,
      (conn) => new ConnectionImpl(conn)
    )

    const spanAttributes: Array<[string, unknown]> = [
      ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
      [ATTR_DB_SYSTEM_NAME, "mysql"],
      [ATTR_SERVER_ADDRESS, options.host ?? "localhost"],
      [ATTR_SERVER_PORT, options.port ?? 3306]
    ]

    if (options.database) {
      spanAttributes.push([ATTR_DB_NAMESPACE, options.database])
    }

    return Object.assign(
      yield* Client.make({
        acquirer: Effect.succeed(poolConnection),
        transactionAcquirer,
        compiler,
        spanAttributes,
        transformRows
      }),
      { [TypeId]: TypeId as TypeId, config: options }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<MysqlClientConfig>
): Layer.Layer<MysqlClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(MysqlClient, client).pipe(
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
  config: MysqlClientConfig
): Layer.Layer<MysqlClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(MysqlClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler({
    dialect: "mysql",
    placeholder(_) {
      return `?`
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      } :
      escape,
    onCustom() {
      return ["", []]
    },
    onRecordUpdate() {
      return ["", []]
    }
  })

const escape = Statement.defaultEscape("`")

function queryStream(
  conn: Mysql.PoolConnection,
  sql: string,
  params?: ReadonlyArray<any>
) {
  return asyncPauseResume<any, SqlError>((emit) => {
    const query = (conn as any).query(sql, params).stream()
    let buffer: Array<any> = []
    let taskPending = false
    query.on("error", (cause: unknown) => emit.fail(new SqlError({ cause, message: "Failed to stream statement" })))
    query.on("data", (row: any) => {
      buffer.push(row)
      if (!taskPending) {
        taskPending = true
        queueMicrotask(() => {
          const items = buffer
          buffer = []
          emit.array(items)
          taskPending = false
        })
      }
    })
    query.on("end", () => emit.end())
    return {
      onInterrupt: Effect.sync(() => query.destroy()),
      onPause: Effect.sync(() => query.pause()),
      onResume: Effect.sync(() => query.resume())
    }
  })
}
