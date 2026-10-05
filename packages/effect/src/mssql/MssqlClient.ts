/**
 * Microsoft SQL Server support for Effect SQL using the native TDS protocol.
 *
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
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
import * as MssqlConnection from "./MssqlConnection.ts"
import * as MssqlPool from "./MssqlPool.ts"
import type { DataType, ParameterOptions } from "./MssqlTypes.ts"
import type * as Parameter from "./Parameter.ts"
import type * as Procedure from "./Procedure.ts"

/**
 * The runtime identifier for native SQL Server clients.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~effect/mssql/MssqlClient"

/**
 * The type-level identifier for native SQL Server clients.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~effect/mssql/MssqlClient"

/**
 * SQL Server pool settings and SQL name transformation options.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlClientConfig extends MssqlPool.Config {
  readonly transformResultNames?: ((name: string) => string) | undefined
  readonly transformQueryNames?: ((name: string) => string) | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
}

/**
 * A native SQL Server client with explicit parameter types and procedure calls.
 *
 * @category services
 * @since 4.0.0
 */
export interface MssqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: MssqlClientConfig
  readonly param: (type: DataType, value: unknown, options?: ParameterOptions) => Statement.Fragment
  readonly call: <
    I extends Record<string, Parameter.Parameter<any>>,
    O extends Record<string, Parameter.Parameter<any>>,
    A
  >(procedure: Procedure.ProcedureWithValues<I, O, A>) => Effect.Effect<Procedure.Procedure.Result<O, A>, SqlError>
}

/**
 * The service tag for native SQL Server clients.
 *
 * @category services
 * @since 4.0.0
 */
export const MssqlClient = Context.Service<MssqlClient>("effect/mssql/MssqlClient")

interface MssqlParam extends Statement.Custom<"MssqlParam", DataType, unknown, ParameterOptions> {}
const mssqlParam = Statement.custom<MssqlParam>("MssqlParam")
const escape = (str: string) => "[" + str.replace(/\]/g, "]]").replace(/\./g, "].[") + "]"

/**
 * Creates the SQL Server compiler with bound `@1` parameters and `OUTPUT INSERTED` returning clauses.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (transform?: (name: string) => string): Statement.Compiler =>
  Statement.makeCompiler<MssqlParam>({
    dialect: "mssql",
    placeholder: (index) => `@${index}`,
    onIdentifier: (name, withoutTransform) => escape(transform && !withoutTransform ? transform(name) : name),
    onRecordUpdate(placeholders, valueAlias, valueColumns, values, returning) {
      const prefix = returning ? returning[0] === "*" ? "OUTPUT INSERTED.* " : `OUTPUT ${returning[0]} ` : ""
      return [
        `${prefix}FROM (values ${placeholders}) AS ${valueAlias}${valueColumns}`,
        returning ? returning[1].concat(values.flat()) : values.flat()
      ]
    },
    onInsert(columns, placeholders, values, returning) {
      const suffix = returning ? returning[0] === "*" ? " OUTPUT INSERTED.*" : ` OUTPUT ${returning[0]}` : ""
      return [
        `(${columns.join(",")})${suffix} VALUES ${placeholders}`,
        returning ? returning[1].concat(values.flat()) : values.flat()
      ]
    },
    onCustom: (type, placeholder) => [placeholder(undefined), [type] as any]
  })

const facade = (connection: MssqlConnection.MssqlConnection): Connection => {
  const rows = (sql: string, params: ReadonlyArray<unknown>, transform: Parameters<Connection["execute"]>[2]) =>
    Effect.map(connection.query(sql, params), (result) => transform ? transform(result.rows) : result.rows)
  return {
    native: connection,
    execute: rows,
    executeUnprepared: rows,
    executeRaw: (sql, params) => connection.query(sql, params),
    executeWithoutTransform: (sql: string, params: ReadonlyArray<unknown>) => rows(sql, params, undefined),
    executeValues: (sql, params) => Effect.map(connection.query(sql, params), (result) => result.values),
    executeValuesUnprepared: (sql, params) => Effect.map(connection.query(sql, params), (result) => result.values),
    executeStream: (sql, params, transform) =>
      transform
        ? Stream.mapArray(connection.stream(sql, params), (chunk) => transform(chunk) as typeof chunk)
        : connection.stream(sql, params)
  } as Connection
}

const makeImpl = Effect.fnUntraced(
  function*(
    options: MssqlClientConfig,
    acquirer: Effect.Effect<MssqlConnection.MssqlConnection, SqlError, Scope.Scope>,
    transactionAcquirer = acquirer
  ): Effect.fn.Return<MssqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> {
    const transform = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined
    const sql = yield* Client.make({
      acquirer: Effect.map(acquirer, facade),
      transactionAcquirer: Effect.map(transactionAcquirer, facade),
      compiler: makeCompiler(options.transformQueryNames),
      beginTransaction: "BEGIN TRANSACTION",
      commit: "COMMIT TRANSACTION",
      rollback: "ROLLBACK TRANSACTION",
      savepoint: (name) => `SAVE TRANSACTION ${name}`,
      rollbackSavepoint: (name) => `ROLLBACK TRANSACTION ${name}`,
      transformRows: transform,
      spanAttributes: [["db.system.name", "microsoft.sql_server"], ["server.address", options.host ?? "localhost"], [
        "server.port",
        options.port ?? 1433
      ], ...Object.entries(options.spanAttributes ?? {})]
    })
    return Object.assign(sql, {
      [TypeId]: TypeId as TypeId,
      config: options,
      param: (type: DataType, value: unknown, paramOptions: ParameterOptions = {}) =>
        Statement.fragment([mssqlParam(type, value, paramOptions)]),
      call: (procedure: Procedure.ProcedureWithValues<any, any, any>) =>
        Effect.scoped(Effect.gen(function*() {
          const transaction = yield* Effect.serviceOption(sql.transactionService)
          const connection = transaction._tag === "Some"
            ? (transaction.value[0] as Connection & { readonly native: MssqlConnection.MssqlConnection }).native
            : yield* acquirer
          const parameters = [
            ...Object.entries(procedure.params).map(([name, param]) => ({
              name,
              type: (param as Parameter.Parameter<any>).type,
              options: (param as Parameter.Parameter<any>).options,
              value: procedure.values[name]
            })),
            ...Object.entries(procedure.outputParams).map(([name, param]) => ({
              name,
              type: (param as Parameter.Parameter<any>).type,
              options: (param as Parameter.Parameter<any>).options,
              value: null,
              output: true
            }))
          ]
          const result = yield* connection.call(procedure.name, parameters)
          return { output: result.output, rows: transform ? transform(result.rows) : result.rows }
        }))
    }) as MssqlClient
  }
)

/**
 * Creates a pooled native SQL Server client.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: MssqlClientConfig
): Effect.Effect<MssqlClient, SqlError, Scope.Scope | Reactivity.Reactivity | SocketConnector.SocketConnector> =>
  Effect.flatMap(MssqlPool.make(options), (pool) => makeImpl(options, pool.get))

/**
 * Creates a native SQL Server client backed by one serialized physical session.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClient = (
  options: MssqlClientConfig
): Effect.Effect<MssqlClient, SqlError, Scope.Scope | Reactivity.Reactivity | SocketConnector.SocketConnector> =>
  Effect.flatMap(
    MssqlConnection.make(options),
    (connection) => makeImpl(options, Effect.succeed(connection), connection.reserve)
  )

/**
 * Provides both native SQL Server and shared SQL services from an acquisition effect.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<MssqlClient, E, R>
): Layer.Layer<MssqlClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) => Context.make(MssqlClient, client).pipe(Context.add(Client.SqlClient, client)))
  ).pipe(Layer.provide(Reactivity.layer)) as any

/**
 * Provides native SQL Server and shared SQL services from pool configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: MssqlClientConfig
): Layer.Layer<MssqlClient | Client.SqlClient, SqlError, SocketConnector.SocketConnector> => layerFrom(make(options))

/**
 * Provides native SQL Server and shared SQL services from wrapped configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<MssqlClientConfig>
): Layer.Layer<MssqlClient | Client.SqlClient, SqlError | Config.ConfigError, SocketConnector.SocketConnector> =>
  layerFrom(Effect.flatMap(Config.unwrap(options), make))
