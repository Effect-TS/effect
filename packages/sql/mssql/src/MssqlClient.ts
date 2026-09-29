/**
 * Microsoft SQL Server support for Effect SQL, backed by the native TDS client.
 *
 * This module provides the `MssqlClient` service, constructors, layers, and SQL
 * Server statement compiler. `make` creates a client over an `MssqlPool`,
 * checks the connection with `SELECT 1`, and supports transactions with
 * savepoints. The SQL Server-specific service adds typed SQL Server parameters
 * with `param` and stored procedure calls with `call`. Streaming queries are
 * not implemented by this driver.
 *
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Scope from "effect/Scope"
import * as Client from "effect/sql/SqlClient"
import type { Connection } from "effect/sql/SqlConnection"
import { ConnectionError, SqlError } from "effect/sql/SqlError"
import * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"
import type * as MssqlConnection from "./MssqlConnection.ts"
import * as MssqlPool from "./MssqlPool.ts"
import type * as MssqlProtocol from "./MssqlProtocol.ts"
import * as MssqlTypes from "./MssqlTypes.ts"
import type { Parameter } from "./Parameter.ts"
import type * as Procedure from "./Procedure.ts"

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"

/**
 * Runtime type identifier used to mark `MssqlClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-mssql/MssqlClient")

/**
 * Type-level identifier used to mark `MssqlClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = typeof TypeId

/**
 * Microsoft SQL Server client service, extending `SqlClient` with typed parameter fragments and stored procedure calls.
 *
 * @category services
 * @since 4.0.0
 */
export interface MssqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId

  readonly config: MssqlClientConfig

  /**
   * Creates a statement parameter with an explicit `MssqlTypes` data type.
   *
   * @stability unstable
   */
  readonly param: (
    type: MssqlTypes.DataType,
    value: unknown,
    options?: MssqlTypes.ParameterOptions
  ) => Statement.Fragment

  readonly call: <
    I extends Record<string, Parameter<any>>,
    O extends Record<string, Parameter<any>>,
    A extends object
  >(
    procedure: Procedure.ProcedureWithValues<I, O, A>
  ) => Effect.Effect<Procedure.Procedure.Result<O, A>, SqlError>
}

/**
 * Service tag for the Microsoft SQL Server client service.
 *
 * **When to use**
 *
 * Use to access or provide a Microsoft SQL Server client through the Effect
 * context.
 *
 * @category services
 * @since 4.0.0
 */
export const MssqlClient = Context.Service<MssqlClient>("@effect/sql-mssql/MssqlClient")

/**
 * Configuration for a Microsoft SQL Server client: the `MssqlPool` settings
 * plus parameter types, span attributes, and query/result name transforms.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlClientConfig extends MssqlPool.Config {
  /**
   * The `MssqlTypes` data type bound for each kind of interpolated value.
   * Defaults to `defaultParameterTypes`.
   *
   * @stability unstable
   */
  readonly parameterTypes?: Record<Statement.PrimitiveKind, MssqlTypes.DataType> | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/** A pooled session as the SQL facade and transactions see it. */
interface ClientConnection extends Connection {
  readonly call: (
    procedure: Procedure.ProcedureWithValues<any, any, any>,
    transformRows: ((rows: ReadonlyArray<any>) => ReadonlyArray<any>) | undefined
  ) => Effect.Effect<any, SqlError>

  readonly begin: Effect.Effect<void, SqlError>
  readonly commit: Effect.Effect<void, SqlError>
  readonly savepoint: (name: string) => Effect.Effect<void, SqlError>
  readonly rollback: (name?: string) => Effect.Effect<void, SqlError>
}

const TransactionConnection = Client.TransactionConnection as unknown as (clientId: number) => Context.Service<
  readonly [conn: ClientConnection, counter: number],
  readonly [conn: ClientConnection, counter: number]
>

let clientIdCounter = 0

/**
 * Creates a scoped Microsoft SQL Server client backed by a connection pool, with transaction and stored procedure support. Streaming queries are not implemented.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: MssqlClientConfig
): Effect.Effect<MssqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.flatMap(MssqlPool.make(options), (pool) => makeImpl(pool, options))

const makeImpl = Effect.fnUntraced(function*(
  pool: MssqlPool.MssqlPool,
  options: MssqlClientConfig
): Effect.fn.Return<MssqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> {
  const parameterTypes = options.parameterTypes ?? defaultParameterTypes
  const compiler = makeCompiler(options.transformQueryNames)
  const transformRows = options.transformResultNames ?
    Statement.defaultTransforms(options.transformResultNames).array :
    undefined
  const spanAttributes: ReadonlyArray<[string, unknown]> = [
    ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
    [ATTR_DB_SYSTEM_NAME, "microsoft.sql_server"],
    [ATTR_DB_NAMESPACE, options.database ?? "master"],
    [ATTR_SERVER_ADDRESS, options.server],
    [ATTR_SERVER_PORT, options.port ?? 1433]
  ]

  const acquire = Effect.map(pool.get, (connection) => new ConnectionImpl(connection, parameterTypes))

  yield* acquire.pipe(
    Effect.tap((connection) => connection.executeUnprepared("SELECT 1", [], undefined)),
    Effect.mapError((cause) =>
      new SqlError({
        reason: new ConnectionError({ cause, message: "MssqlClient: Failed to connect", operation: "connect" })
      })
    ),
    Effect.scoped,
    Effect.timeoutOrElse({
      duration: options.connectTimeout ?? Duration.seconds(5),
      orElse: () =>
        Effect.fail(
          new SqlError({
            reason: new ConnectionError({
              message: "MssqlClient: Connection timeout",
              cause: new Error("connection timeout"),
              operation: "connect"
            })
          })
        )
    })
  )

  const transactionService = TransactionConnection(clientIdCounter++)
  const getConnection = Effect.flatMap(
    Effect.serviceOption(transactionService),
    (transaction): Effect.Effect<ClientConnection, SqlError, Scope.Scope> =>
      transaction._tag === "Some" ? Effect.succeed(transaction.value[0]) : acquire
  )

  const withTransaction = Client.makeWithTransaction({
    transactionService,
    spanAttributes,
    acquireConnection: Effect.gen(function*() {
      const scope = Scope.makeUnsafe()
      const conn = yield* Scope.provide(acquire, scope)
      return [scope, conn] as const
    }),
    begin: (conn) => conn.begin,
    savepoint: (conn, id) => conn.savepoint(`effect_sql_${id}`),
    commit: (conn) => conn.commit,
    rollback: (conn) => conn.rollback(),
    rollbackSavepoint: (conn, id) => conn.rollback(`effect_sql_${id}`)
  })

  const call = <I extends Record<string, Parameter<any>>, O extends Record<string, Parameter<any>>, A>(
    procedure: Procedure.ProcedureWithValues<I, O, A>,
    transform: ((rows: ReadonlyArray<any>) => ReadonlyArray<any>) | undefined
  ) => Effect.scoped(Effect.flatMap(getConnection, (conn) => conn.call(procedure, transform)))

  return identity<MssqlClient>(Object.assign(
    yield* Client.make({
      acquirer: acquire,
      compiler,
      transactionService: transactionService as any,
      spanAttributes,
      transformRows
    }),
    {
      [TypeId]: TypeId as TypeId,
      config: options,
      withTransaction,
      param: (
        type: MssqlTypes.DataType,
        value: unknown,
        options: MssqlTypes.ParameterOptions = {}
      ) => Statement.fragment([mssqlParam(type, value, options)]),
      call: <I extends Record<string, Parameter<any>>, O extends Record<string, Parameter<any>>, A>(
        procedure: Procedure.ProcedureWithValues<I, O, A>
      ) => call(procedure, transformRows),
      withoutTransforms() {
        const statement = Statement.make(getConnection, compiler.withoutTransform, spanAttributes, undefined)
        const client = Object.assign(
          statement,
          this,
          statement,
          {
            call: <I extends Record<string, Parameter<any>>, O extends Record<string, Parameter<any>>, A>(
              procedure: Procedure.ProcedureWithValues<I, O, A>
            ) => call(procedure, undefined)
          }
        )
        ;(client as any).safe = client
        ;(client as any).withoutTransforms = () => client
        return client
      }
    }
  ))
})

class ConnectionImpl implements ClientConnection {
  readonly connection: MssqlConnection.MssqlConnection
  readonly parameterTypes: Record<Statement.PrimitiveKind, MssqlTypes.DataType>
  readonly begin: Effect.Effect<void, SqlError>
  readonly commit: Effect.Effect<void, SqlError>

  constructor(
    connection: MssqlConnection.MssqlConnection,
    parameterTypes: Record<Statement.PrimitiveKind, MssqlTypes.DataType>
  ) {
    this.connection = connection
    this.parameterTypes = parameterTypes
    this.begin = this.batch("BEGIN TRANSACTION")
    this.commit = this.batch("COMMIT TRANSACTION")
  }

  private parameters(values: ReadonlyArray<unknown>): Array<MssqlProtocol.Parameter> {
    const parameters = new Array<MssqlProtocol.Parameter>(values.length)
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      if (isMssqlParam(value)) {
        parameters[i] = { name: numberToParamName(i), type: value.paramA, value: value.paramB, options: value.paramC }
        continue
      }
      parameters[i] = {
        name: numberToParamName(i),
        type: this.parameterTypes[Statement.primitiveKind(value)],
        value: value instanceof Int8Array ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : value
      }
    }
    return parameters
  }

  private run(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.connection.query(sql, this.parameters(params)), (result) => result.rows)
  }

  private runValues(sql: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.connection.queryValues(sql, this.parameters(params)), (result) => result.rows)
  }

  /** Transaction control runs as a batch, in the session's own scope. */
  private batch(sql: string): Effect.Effect<void, SqlError> {
    return Effect.asVoid(this.connection.batch(sql))
  }

  execute(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    return transformRows ? Effect.map(this.run(sql, params), transformRows) : this.run(sql, params)
  }
  executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return this.run(sql, params)
  }
  executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return this.runValues(sql, params)
  }
  executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
    return this.runValues(sql, params)
  }
  executeUnprepared(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    return this.execute(sql, params, transformRows)
  }
  executeStream() {
    return Stream.die("executeStream not implemented")
  }

  call(
    procedure: Procedure.ProcedureWithValues<any, any, any>,
    transformRows: ((rows: ReadonlyArray<any>) => ReadonlyArray<any>) | undefined
  ) {
    const params: Array<MssqlProtocol.Parameter> = []
    for (const name in procedure.params) {
      const param = procedure.params[name]
      params.push({ name, type: param.type, value: procedure.values[name], options: param.options })
    }
    for (const name in procedure.outputParams) {
      const param = procedure.outputParams[name]
      params.push({ name, type: param.type, value: null, options: param.options, output: true })
    }
    return Effect.map(this.connection.call(procedure.name, params), (result) => ({
      output: result.output,
      rows: transformRows ? transformRows(result.rows) : result.rows
    }))
  }

  savepoint(name: string) {
    return this.batch(`SAVE TRANSACTION ${escape(name)}`)
  }
  rollback(name?: string) {
    return this.batch(name ? `ROLLBACK TRANSACTION ${escape(name)}` : "IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION")
  }
}

/**
 * Provides both `MssqlClient` and `SqlClient` from an acquisition effect.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<MssqlClient, E, R>
): Layer.Layer<MssqlClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) =>
      Context.make(MssqlClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer)) as any

/**
 * Creates a layer from a `Config`-wrapped SQL Server client configuration, providing both `MssqlClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  config: Config.Wrap<MssqlClientConfig>
): Layer.Layer<Client.SqlClient | MssqlClient, Config.ConfigError | SqlError> =>
  layerFrom(Effect.flatMap(Config.unwrap(config), make))

/**
 * Creates a layer from a concrete SQL Server client configuration, providing both `MssqlClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: MssqlClientConfig
): Layer.Layer<Client.SqlClient | MssqlClient, SqlError> => layerFrom(make(config))

/**
 * Creates the SQL Server statement compiler, using `@1`-style placeholders, bracket-escaped identifiers, and SQL Server `OUTPUT INSERTED` returning clauses.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler<MssqlCustom>({
    dialect: "mssql",
    placeholder(_) {
      return `@${numberToParamName(_ - 1)}`
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      } :
      escape,
    onRecordUpdate(placeholders, valueAlias, valueColumns, values, returning) {
      const returningSql = returning ? returning[0] === "*" ? "OUTPUT INSERTED.* " : `OUTPUT ${returning[0]} ` : ""
      return [
        `${returningSql}FROM (values ${placeholders}) AS ${valueAlias}${valueColumns}`,
        returning ?
          returning[1].concat(values.flat()) :
          values.flat()
      ]
    },
    onCustom(type, placeholder) {
      switch (type.kind) {
        case "MssqlParam": {
          return [placeholder(undefined), [type] as any]
        }
      }
    },
    onInsert(columns, placeholders, values, returning) {
      const returningSql = returning ? returning[0] === "*" ? " OUTPUT INSERTED.*" : ` OUTPUT ${returning[0]}` : ""
      return [
        `(${columns.join(",")})${returningSql} VALUES ${placeholders}`,
        returning ?
          returning[1].concat(values.flat()) :
          values.flat()
      ]
    }
  })

// compiler helpers

const escape = (str: string) => "[" + str.replace(/\]/g, "]]").replace(/\./g, "].[") + "]"

function numberToParamName(n: number) {
  return `${Math.ceil(n + 1)}`
}

/**
 * Default mapping from Effect SQL primitive value kinds to SQL Server parameter data types.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const defaultParameterTypes: Record<Statement.PrimitiveKind, MssqlTypes.DataType> = {
  string: MssqlTypes.NVarChar,
  number: MssqlTypes.Float,
  bigint: MssqlTypes.BigInt,
  boolean: MssqlTypes.Bit,
  Date: MssqlTypes.DateTime,
  Uint8Array: MssqlTypes.VarBinary,
  Int8Array: MssqlTypes.VarBinary,
  null: MssqlTypes.Bit
}

// custom types

type MssqlCustom = MssqlParam

interface MssqlParam extends
  Statement.Custom<
    "MssqlParam",
    MssqlTypes.DataType,
    unknown,
    MssqlTypes.ParameterOptions
  >
{}

const mssqlParam = Statement.custom<MssqlParam>("MssqlParam")
const isMssqlParam = Statement.isCustom<MssqlParam>("MssqlParam")
