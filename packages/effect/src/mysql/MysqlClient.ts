/**
 * MySQL support for Effect SQL backed by the native MySQL wire protocol.
 *
 * @since 4.0.0
 */
import type * as Arr from "../Array.ts"
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import type * as Crypto from "../Crypto.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Reactivity from "../reactivity/Reactivity.ts"
import type * as Scope from "../Scope.ts"
import type * as SocketConnector from "../socket/SocketConnector.ts"
import * as Client from "../sql/SqlClient.ts"
import type { Connection } from "../sql/SqlConnection.ts"
import type { SqlError } from "../sql/SqlError.ts"
import * as Statement from "../sql/Statement.ts"
import * as Stream from "../Stream.ts"
import type * as MysqlConnection from "./MysqlConnection.ts"
import * as MysqlPool from "./MysqlPool.ts"
/**
 * The runtime identifier for native MySQL clients.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~effect/mysql/MysqlClient"
/**
 * The type-level identifier for native MySQL clients.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~effect/mysql/MysqlClient"
/**
 * A MySQL SQL client with its connection configuration.
 *
 * @category services
 * @since 4.0.0
 */
export interface MysqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: MysqlClientConfig
}
/**
 * The service tag for native MySQL clients.
 *
 * @category services
 * @since 4.0.0
 */
export const MysqlClient = Context.Service<MysqlClient>("effect/mysql/MysqlClient")
/**
 * MySQL connection pool settings and query name transformations.
 *
 * @category models
 * @since 4.0.0
 */
export interface MysqlClientConfig extends MysqlPool.Config {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}
class ConnectionImpl implements Connection {
  readonly connection: MysqlConnection.MysqlConnection
  constructor(connection: MysqlConnection.MysqlConnection) {
    this.connection = connection
  }
  execute(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const rows = this.executeWithoutTransform(sql, params)
    return transformRows ? Effect.map(rows, transformRows) : rows
  }
  executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return this.connection.query(sql, params)
  }
  executeWithoutTransform(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.connection.query(sql, params), (result) => result.rows)
  }
  executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.connection.query(sql, params), (result) => result.values)
  }
  executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.connection.query(sql, params, false), (result) => result.values)
  }
  executeUnprepared(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const rows = Effect.map(this.connection.query(sql, params, false), (result) => result.rows)
    return transformRows ? Effect.map(rows, transformRows) : rows
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
const makeImpl = Effect.fnUntraced(
  function*(
    config: MysqlClientConfig,
    acquirer: Effect.Effect<Connection, SqlError, Scope.Scope>
  ): Effect.fn.Return<MysqlClient, never, Reactivity.Reactivity> {
    return Object.assign(
      yield* Client.make({
        acquirer,
        transactionAcquirer: acquirer,
        releaseSavepoint: (name) => `RELEASE SAVEPOINT ${name}`,
        compiler: makeCompiler(config.transformQueryNames),
        transformRows: config.transformResultNames
          ? Statement.defaultTransforms(config.transformResultNames).array
          : undefined,
        spanAttributes: [
          ...Object.entries(config.spanAttributes ?? {}),
          ["db.system.name", "mysql"],
          ["db.namespace", config.database ?? ""],
          ["server.address", config.host ?? "localhost"],
          ["server.port", config.port ?? 3306]
        ]
      }),
      { [TypeId]: TypeId as TypeId, config }
    )
  }
)
/**
 * Creates a scoped native MySQL SQL client backed by an exclusive session pool.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  config: MysqlClientConfig
): Effect.Effect<
  MysqlClient,
  SqlError,
  Scope.Scope | Reactivity.Reactivity | SocketConnector.SocketConnector | Crypto.Crypto
> =>
  Effect.flatMap(
    MysqlPool.make(config),
    (pool) => makeImpl(config, Effect.map(pool.get, (connection) => new ConnectionImpl(connection)))
  )
/**
 * Provides both the native MySQL client and the generic SQL client from an acquisition effect.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<MysqlClient, E, R>
): Layer.Layer<MysqlClient | Client.SqlClient, E, Exclude<Exclude<R, Scope.Scope>, Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) => Context.make(MysqlClient, client).pipe(Context.add(Client.SqlClient, client)))
  ).pipe(Layer.provide(Reactivity.layer))
/**
 * Provides a native MySQL SQL client configured with concrete settings.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: MysqlClientConfig
): Layer.Layer<MysqlClient | Client.SqlClient, SqlError, SocketConnector.SocketConnector | Crypto.Crypto> =>
  layerFrom(make(config))
/**
 * Provides a native MySQL SQL client from Effect configuration values.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  config: Config.Wrap<MysqlClientConfig>
): Layer.Layer<
  MysqlClient | Client.SqlClient,
  SqlError | Config.ConfigError,
  SocketConnector.SocketConnector | Crypto.Crypto
> => layerFrom(Effect.flatMap(Config.unwrap(config), make))
/**
 * Creates a MySQL statement compiler with question mark parameters and escaped backtick identifiers.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (transform?: (name: string) => string) =>
  Statement.makeCompiler({
    dialect: "mysql",
    placeholder: () => "?",
    onIdentifier: transform ? (value, withoutTransform) => escape(withoutTransform ? value : transform(value)) : escape,
    onCustom: () => ["", []],
    onRecordUpdate: () => ["", []]
  })
const escape = Statement.defaultEscape("`")
