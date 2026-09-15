/**
 * MySQL support for Effect SQL, backed by the native wire protocol client.
 *
 * @since 4.0.0
 */
import type * as Arr from "effect/Array"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Client from "effect/unstable/sql/SqlClient"
import type { Borrower, Connection } from "effect/unstable/sql/SqlConnection"
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError"
import type { Custom, Fragment } from "effect/unstable/sql/Statement"
import * as Statement from "effect/unstable/sql/Statement"
import { resolveAddress } from "./internal/config.ts"
import { bindParameters } from "./internal/escape.ts"
import * as MysqlConnection from "./MysqlConnection.ts"
import * as MysqlPool from "./MysqlPool.ts"

/**
 * The runtime type identifier for `MysqlClient`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-mysql/MysqlClient"

/**
 * The type-level identifier for `MysqlClient`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-mysql/MysqlClient"

/**
 * A MySQL `SqlClient` with a JSON helper.
 *
 * @category services
 * @since 4.0.0
 */
export interface MysqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: MysqlClientConfig
  readonly json: (_: unknown) => Fragment
}

/**
 * The service tag for `MysqlClient`.
 *
 * @category services
 * @since 4.0.0
 */
export const MysqlClient = Context.Service<MysqlClient>("@effect/sql-mysql/MysqlClient")

/**
 * Connection and query settings for a MySQL client.
 *
 * @category models
 * @since 4.0.0
 */
export interface MysqlClientConfig extends MysqlConnection.Config {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * MySQL client settings with connection pool limits and timeouts.
 *
 * @category models
 * @since 4.0.0
 */
export interface MysqlPoolConfig extends MysqlClientConfig {
  readonly idleTimeout?: Duration.Input | undefined
  readonly maxConnections?: number | undefined
  readonly minConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined
}

/**
 * Creates a scoped MySQL client backed by a connection pool.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: MysqlPoolConfig
): Effect.Effect<MysqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> => {
  const prepare = options.prepare !== false
  return Effect.flatMap(MysqlPool.make(options), (pool) =>
    makeImpl({
      acquirer: Effect.map(pool.get, (connection) => makeConnection(connection, prepare)),
      borrower: (f) => pool.use((connection) => f(makeConnection(connection, prepare))),
      transactionAcquirer: Effect.map(pool.get, (connection) => makeConnection(connection, prepare)),
      config: options
    }))
}

/**
 * Creates a scoped MySQL client backed by one connection.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClient = (
  options: MysqlClientConfig
): Effect.Effect<MysqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.flatMap(MysqlConnection.make(options), (connection) => {
    const acquirer = Effect.succeed(makeConnection(connection, options.prepare !== false))
    return makeImpl({ acquirer, transactionAcquirer: acquirer, config: options })
  })

const makeImpl = Effect.fnUntraced(function*(
  options: {
    readonly acquirer: Effect.Effect<Connection, SqlError, Scope.Scope>
    readonly borrower?: Borrower | undefined
    readonly transactionAcquirer: Effect.Effect<Connection, SqlError, Scope.Scope>
    readonly config: MysqlClientConfig
  }
): Effect.fn.Return<MysqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> {
  const config = options.config
  const address = resolveAddress(config)
  const compiler = makeCompiler(config.transformQueryNames)
  const transformRows = config.transformResultNames
    ? Statement.defaultTransforms(config.transformResultNames).array
    : undefined

  return Object.assign(
    yield* Client.make({
      acquirer: options.acquirer,
      borrower: options.borrower,
      // MySQL cannot prepare BEGIN, START TRANSACTION or any of the savepoint
      // statements. COMMIT and ROLLBACK it can, but the setting is all or
      // nothing, so transaction control goes out on the text protocol.
      prepareTransactionControls: false,
      transactionAcquirer: options.transactionAcquirer,
      compiler,
      spanAttributes: [
        ...(config.spanAttributes ? Object.entries(config.spanAttributes) : []),
        [ATTR_DB_SYSTEM_NAME, "mysql"],
        [ATTR_SERVER_ADDRESS, address.host],
        [ATTR_SERVER_PORT, address.port],
        ...(address.database === undefined ? [] : [[ATTR_DB_NAMESPACE, address.database] as const])
      ],
      transformRows
    }),
    {
      [TypeId]: TypeId as TypeId,
      config,
      json: (_: unknown) => Statement.fragment([MysqlJson(_)])
    }
  )
})

const bindError = (cause: unknown): SqlError =>
  new SqlError({
    reason: new UnknownError({
      cause,
      message: "MysqlClient: Failed to bind statement parameters",
      operation: "execute"
    })
  })

/**
 * The text protocol carries a finished statement, so parameters are written
 * into the SQL here. Prepared statements bind them out of band instead.
 */
const bind = (sql: string, params: ReadonlyArray<unknown>): Effect.Effect<string, SqlError> =>
  params.length === 0
    ? Effect.succeed(sql)
    : Effect.try({ try: () => bindParameters(sql, params), catch: bindError })

/**
 * The counters of a statement that returned no rows, named as the `mysql2`
 * client names them.
 *
 * **Details**
 *
 * This is what a multi-statement request yields for each statement that
 * produced no result set — see `Shaped`. A single statement does not produce
 * one: `.raw` surfaces the connection's own `Result`, whose equivalent fields
 * are `lastInsertId` and `warnings`.
 *
 * @category models
 * @since 4.0.0
 */
export interface OkHeader {
  readonly affectedRows: number | bigint
  readonly insertId: number | bigint
  readonly warningStatus: number
}

/**
 * What one entry of a shaped reply can be: the rows of a result set, one row,
 * or the header of a statement that produced none.
 *
 * @category models
 * @since 4.0.0
 */
export type Shaped = MysqlConnection.Row | ReadonlyArray<MysqlConnection.Row> | OkHeader

/**
 * Shapes a command's results the way the `mysql2` client does, which is what
 * `SqlModel` reads: one result set returns its rows, one OK packet returns no
 * rows, and several statements return one entry each.
 */
const shape = (results: ReadonlyArray<MysqlConnection.Result>): ReadonlyArray<Shaped> => {
  if (results.length === 0) return []
  if (results.length === 1) return MysqlConnection.Result.rowsOf(results[0])
  return results.map((result): Shaped =>
    MysqlConnection.Result.$match(result, {
      ResultSet: ({ rows }) => rows,
      Ok: ({ affectedRows, lastInsertId, warnings }) => ({
        affectedRows,
        insertId: lastInsertId,
        warningStatus: warnings
      })
    })
  )
}

class ConnectionImpl implements Connection {
  readonly connection: MysqlConnection.MysqlConnection
  /** Whether the default path prepares, or falls back to the text protocol. */
  readonly prepare: boolean

  constructor(connection: MysqlConnection.MysqlConnection, prepare: boolean) {
    this.connection = connection
    this.prepare = prepare
  }

  /** The text protocol, where parameters are written into the statement. */
  private textResults(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.flatMap(bind(sql, params), (text) => this.connection.query(text))
  }

  private results(sql: string, params: ReadonlyArray<unknown>) {
    return this.prepare ? this.connection.execute(sql, params) : this.textResults(sql, params)
  }

  private run(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.results(sql, params), shape)
  }

  execute(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    return transformRows ? Effect.map(this.run(sql, params), transformRows) : this.run(sql, params)
  }
  executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.results(sql, params), (results) => results.length === 1 ? results[0] : results)
  }
  executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return this.prepare
      ? this.connection.executeValues(sql, params)
      : this.executeValuesUnprepared(sql, params)
  }
  executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.flatMap(bind(sql, params), (text) => this.connection.queryValues(text))
  }
  executeUnprepared(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const operation = Effect.map(this.textResults(sql, params), shape)
    return transformRows ? Effect.map(operation, transformRows) : operation
  }
  executeStream(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const stream = this.connection.stream(sql, params)
    return transformRows
      ? Stream.mapArray(stream, (rows) => transformRows(rows) as Arr.NonEmptyReadonlyArray<MysqlConnection.Row>)
      : stream
  }
}

const makeConnection = (
  connection: MysqlConnection.MysqlConnection,
  prepare: boolean
): Connection => new ConnectionImpl(connection, prepare)

/**
 * Provides both `MysqlClient` and `SqlClient` from an acquisition effect.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<MysqlClient, E, R>
): Layer.Layer<MysqlClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) =>
      Context.make(MysqlClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer)) as any

/**
 * Creates a client layer from wrapped pool configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  config: Config.Wrap<MysqlPoolConfig>
): Layer.Layer<MysqlClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  layerFrom(Effect.flatMap(Config.unwrap(config), make))

/**
 * Creates a client layer from pool configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: MysqlPoolConfig
): Layer.Layer<MysqlClient | Client.SqlClient, SqlError> => layerFrom(make(config))

/**
 * Creates the MySQL statement compiler.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (transform?: (_: string) => string): Statement.Compiler => {
  const transformValue = transform ? Statement.defaultTransforms(transform).value : undefined
  return Statement.makeCompiler<MysqlCustom>({
    dialect: "mysql",
    placeholder() {
      return `?`
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      } :
      escape,
    onCustom(type, placeholder, withoutTransform) {
      switch (type.kind) {
        case "MysqlJson": {
          const value = withoutTransform || transformValue === undefined ? type.paramA : transformValue(type.paramA)
          return [placeholder(undefined), [JSON.stringify(value)]]
        }
      }
    },
    // MySQL has no multi-row update form, so `sql.updateValues` compiles away.
    onRecordUpdate() {
      return ["", []]
    }
  })
}

const escape = Statement.defaultEscape("`")

/**
 * MySQL-specific statement fragments.
 *
 * @category models
 * @since 4.0.0
 */
export type MysqlCustom = MysqlJson

/**
 * @category models
 * @since 4.0.0
 */
interface MysqlJson extends Custom<"MysqlJson", unknown> {}
/**
 * @category constructors
 * @since 4.0.0
 */
const MysqlJson = Statement.custom<MysqlJson>("MysqlJson")

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"
