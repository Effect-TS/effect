/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import type { Connection } from "@effect/sql/Connection"
import { SqlError } from "@effect/sql/Error"
import * as Statement from "@effect/sql/Statement"
import { asyncPauseResume } from "@effect/sql/Stream"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import * as Secret from "effect/Secret"
import * as Stream from "effect/Stream"
import * as Mysql from "mysql2"

/**
 * @category models
 * @since 1.0.0
 */
export interface MysqlClient extends Client.Client {
  readonly config: MysqlClientConfig
}

/**
 * @category tags
 * @since 1.0.0
 */
export const MysqlClient = Context.GenericTag<MysqlClient>("sqlfx/mysql2/MysqlClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface MysqlClientConfig {
  /**
   * Connection URI. Setting this will override the other connection options
   */
  readonly url?: Secret.Secret

  readonly host?: string
  readonly port?: number
  readonly database?: string
  readonly username?: string
  readonly password?: Secret.Secret

  readonly maxConnections?: number
  readonly connectionTTL?: Duration.DurationInput

  readonly poolConfig?: Mysql.PoolOptions

  readonly transformResultNames?: (str: string) => string
  readonly transformQueryNames?: (str: string) => string
}

const escape = Statement.defaultEscape("`")

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  options: MysqlClientConfig
): Effect.Effect<MysqlClient, never, Scope> =>
  Effect.gen(function*(_) {
    const compiler = makeCompiler(options.transformQueryNames)

    const transformRows = Client.defaultTransforms(
      options.transformResultNames!
    ).array

    class ConnectionImpl implements Connection {
      constructor(private readonly conn: Mysql.PoolConnection | Mysql.Pool) {}

      private run(
        sql: string,
        values?: ReadonlyArray<any>,
        transform = true,
        rowsAsArray = false,
        method: "execute" | "query" = "execute"
      ) {
        return Effect.async<ReadonlyArray<any>, SqlError>((resume) => {
          this.conn[method]({
            sql,
            values,
            rowsAsArray
          }, (error: unknown | null, results: ReadonlyArray<any>, _fields: any) => {
            if (error) {
              resume(Effect.fail(new SqlError({ error })))
            } else if (transform && !rowsAsArray && options.transformResultNames) {
              resume(Effect.succeed(transformRows(results)))
            } else {
              resume(Effect.succeed(results))
            }
          })
        })
      }

      execute(sql: string, params: ReadonlyArray<Statement.Primitive>) {
        return this.run(sql, params)
      }
      executeWithoutTransform(sql: string, params: ReadonlyArray<Statement.Primitive>) {
        return this.run(sql, params, false)
      }
      executeValues(sql: string, params: ReadonlyArray<Statement.Primitive>) {
        return this.run(sql, params, true, true)
      }
      executeRaw(sql: string, params?: ReadonlyArray<Statement.Primitive>) {
        return this.run(sql, params, true, false, "query")
      }
      executeStream(sql: string, params: ReadonlyArray<Statement.Primitive>) {
        const stream = queryStream(this.conn as any, sql, params)
        return options.transformResultNames
          ? Stream.mapChunks(stream, (_) =>
            Chunk.unsafeFromArray(
              transformRows(Chunk.toReadonlyArray(_) as Array<object>)
            ))
          : stream
      }
    }

    const pool = options.url
      ? Mysql.createPool(Secret.value(options.url))
      : Mysql.createPool({
        ...(options.poolConfig ?? {}),
        host: options.host,
        port: options.port,
        database: options.database,
        user: options.username,
        password: options.password
          ? Secret.value(options.password)
          : undefined,
        connectionLimit: options.maxConnections,
        idleTimeout: options.connectionTTL
          ? Duration.toMillis(options.connectionTTL)
          : undefined
      } as Mysql.PoolOptions)

    yield* _(Effect.addFinalizer(() =>
      Effect.async<void>((resume) => {
        pool.end(() => resume(Effect.void))
      })
    ))

    const poolConnection = new ConnectionImpl(pool)

    const acquireConn = Effect.acquireRelease(
      Effect.async<Mysql.PoolConnection, SqlError>((resume) => {
        pool.getConnection((error, conn) => {
          if (error) {
            resume(new SqlError({ error }))
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
      ["db.system", "mysql"],
      ["server.address", options.host ?? "localhost"],
      ["server.port", options.port ?? 3306]
    ]

    if (options.database) {
      spanAttributes.push(["db.name", options.database])
    }

    return Object.assign(
      Client.make({
        acquirer: Effect.succeed(poolConnection),
        transactionAcquirer,
        compiler,
        spanAttributes
      }),
      { config: options }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layer: (
  config: Config.Config.Wrap<MysqlClientConfig>
) => Layer.Layer<MysqlClient, ConfigError> = (
  config: Config.Config.Wrap<MysqlClientConfig>
) => Layer.scoped(MysqlClient, Effect.flatMap(Config.unwrap(config), make))

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler({
    placeholder: (_) => `?`,
    onIdentifier: transform ? (_) => escape(transform(_)) : escape,
    onCustom: () => ["", []],
    onRecordUpdate: () => ["", []]
  })

function queryStream(
  conn: Mysql.PoolConnection,
  sql: string,
  params?: ReadonlyArray<any>
) {
  return asyncPauseResume<any, SqlError>((emit) => {
    const query = conn.query(sql, params).stream()
    let buffer: Array<any> = []
    let taskPending = false
    query.on("error", (error: unknown) => emit.fail(new SqlError({ error })))
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
