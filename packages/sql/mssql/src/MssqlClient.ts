/**
 * Microsoft SQL Server client implementation for Effect SQL, built on the native
 * TDS protocol.
 *
 * This module provides the `MssqlClient` service, constructors, layers, and SQL
 * Server statement compiler. `make` creates a pooled native TDS client, checks the
 * connection with `SELECT 1`, maps SQL Server failures to `SqlError`, and
 * supports transactions with savepoints. The SQL Server-specific service adds
 * typed SQL Server parameters with `param`, stored procedure calls with `call`,
 * direct or config-backed layers, and default parameter type mappings.
 * Streaming queries are not implemented by this driver.
 *
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Pool from "effect/Pool"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Client from "effect/unstable/sql/SqlClient"
import type { Connection } from "effect/unstable/sql/SqlConnection"
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SerializationError,
  SqlError,
  SqlSyntaxError,
  UniqueViolation,
  UnknownError
} from "effect/unstable/sql/SqlError"
import * as Statement from "effect/unstable/sql/Statement"
import * as TdsConnection from "./internal/tdsConnection.ts"
import * as TdsRequest from "./internal/tdsRequest.ts"
import type { DataType, ParameterOptions } from "./internal/tdsRequest.ts"
import type { Parameter } from "./Parameter.ts"
import type * as Procedure from "./Procedure.ts"

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"

const mssqlNumberFromCause = (cause: unknown): number | undefined => {
  if (typeof cause !== "object" || cause === null || !("number" in cause)) {
    return undefined
  }
  const number = cause.number
  return typeof number === "number" ? number : undefined
}

const mssqlConnectionErrorCodes = new Set([233, 10054])
const mssqlAuthenticationErrorCodes = new Set([4060, 18452, 18456])
const mssqlAuthorizationErrorCodes = new Set([229, 230, 262, 297, 300])
const mssqlSyntaxErrorCodes = new Set([102, 207, 208, 2714])
const mssqlConstraintErrorCodes = new Set([515, 547])

const UNKNOWN_CONSTRAINT = "unknown"

const normalizeConstraintIdentifier = (identifier: unknown): string => {
  if (typeof identifier !== "string") {
    return UNKNOWN_CONSTRAINT
  }
  const trimmed = identifier.trim()
  return trimmed.length === 0 ? UNKNOWN_CONSTRAINT : trimmed
}

const mssqlCauseProperty = (cause: unknown, property: "constraint" | "message"): unknown => {
  if (typeof cause !== "object" || cause === null || !(property in cause)) {
    return undefined
  }
  return (cause as Record<string, unknown>)[property]
}

const mssqlUniqueViolationConstraintFromMessage = (number: 2601 | 2627, message: unknown): string => {
  if (typeof message !== "string") {
    return UNKNOWN_CONSTRAINT
  }
  const match = number === 2627 ?
    /\bconstraint\s+'([^']*)'/i.exec(message) :
    /\bunique index\s+'([^']*)'/i.exec(message)
  return match === null ? UNKNOWN_CONSTRAINT : normalizeConstraintIdentifier(match[1])
}

const mssqlUniqueViolationConstraintFromCause = (number: 2601 | 2627, cause: unknown): string => {
  const constraint = normalizeConstraintIdentifier(mssqlCauseProperty(cause, "constraint"))
  if (constraint !== UNKNOWN_CONSTRAINT) {
    return constraint
  }
  return mssqlUniqueViolationConstraintFromMessage(number, mssqlCauseProperty(cause, "message"))
}

const classifyError = (
  cause: unknown,
  message: string,
  operation: string,
  fallback: "connection" | "unknown" = "unknown"
) => {
  const props = { cause, message, operation }
  const number = mssqlNumberFromCause(cause)
  if (number !== undefined) {
    if (mssqlConnectionErrorCodes.has(number)) {
      return new ConnectionError(props)
    }
    if (mssqlAuthenticationErrorCodes.has(number)) {
      return new AuthenticationError(props)
    }
    if (mssqlAuthorizationErrorCodes.has(number)) {
      return new AuthorizationError(props)
    }
    if (mssqlSyntaxErrorCodes.has(number)) {
      return new SqlSyntaxError(props)
    }
    if (number === 2601 || number === 2627) {
      return new UniqueViolation({ ...props, constraint: mssqlUniqueViolationConstraintFromCause(number, cause) })
    }
    if (mssqlConstraintErrorCodes.has(number)) {
      return new ConstraintError(props)
    }
    if (number === 1205) {
      return new DeadlockError(props)
    }
    if (number === 3960) {
      return new SerializationError(props)
    }
    if (number === 1222) {
      return new LockTimeoutError(props)
    }
  }
  return fallback === "connection" ? new ConnectionError(props) : new UnknownError(props)
}

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

  readonly param: (
    type: DataType,
    value: unknown,
    options?: ParameterOptions
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
 * Configuration for a Microsoft SQL Server client, including connection, authentication, pool, parameter type, span attribute, and query/result name transform options.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlClientConfig {
  readonly domain?: string | undefined
  readonly server: string
  readonly instanceName?: string | undefined
  /**
   * Whether to encrypt traffic between the client and server. Defaults to `true`. Setting this to `false` disables transport encryption and transmits credentials in cleartext.
   */
  readonly encrypt?: boolean | undefined
  /**
   * Whether to trust the server certificate without validating it. Defaults to `false`. Setting this to `true` disables TLS certificate validation.
   */
  readonly trustServer?: boolean | undefined
  readonly port?: number | undefined
  /** Authentication method: `default` (SQL credentials) or `ntlm` (requires `domain`). */
  readonly authType?: string | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined
  readonly connectTimeout?: Duration.Input | undefined
  readonly cancelTimeout?: Duration.Input | undefined
  /** Time before requesting cancellation. Defaults to 15 seconds; zero disables the request timer. Cancellation is drained before reuse. */
  readonly requestTimeout?: Duration.Input | undefined
  readonly connectionRetryInterval?: Duration.Input | undefined
  readonly multiSubnetFailover?: boolean | undefined
  readonly maxRetriesOnTransientErrors?: number | undefined

  readonly minConnections?: number | undefined
  readonly maxConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined

  readonly parameterTypes?: Record<Statement.PrimitiveKind, DataType> | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

interface MssqlConnection extends Connection {
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
  readonly [conn: MssqlConnection, counter: number],
  readonly [conn: MssqlConnection, counter: number]
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
  Effect.gen(function*() {
    const parameterTypes = options.parameterTypes ?? defaultParameterTypes
    const compiler = makeCompiler(options.transformQueryNames)

    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(
        options.transformResultNames
      ).array :
      undefined
    const spanAttributes: ReadonlyArray<[string, unknown]> = [
      ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
      [ATTR_DB_SYSTEM_NAME, "microsoft.sql_server"],
      [ATTR_DB_NAMESPACE, options.database ?? "master"],
      [ATTR_SERVER_ADDRESS, options.server],
      [ATTR_SERVER_PORT, options.port ?? 1433]
    ]

    // oxlint-disable-next-line prefer-const
    let pool: Pool.Pool<MssqlConnection, SqlError>

    const makeConnection = Effect.gen(function*() {
      if (options.authType && options.authType !== "default" && options.authType !== "ntlm") {
        return yield* Effect.fail(
          new SqlError({
            reason: new AuthenticationError({
              cause: undefined,
              message: `Unsupported native TDS authentication: ${options.authType}`,
              operation: "connect"
            })
          })
        )
      }
      const mapError = (error: SqlError) =>
        new SqlError({
          reason: classifyError(
            error.reason.cause ?? error,
            error.message,
            "execute",
            error.reason._tag === "ConnectionError" ? "connection" : "unknown"
          )
        })
      const conn = yield* TdsConnection.make({
        server: options.server,
        port: options.port,
        instanceName: options.instanceName,
        multiSubnetFailover: options.multiSubnetFailover,
        authType: options.authType as "default" | "ntlm" | undefined,
        domain: options.domain,
        maxRetriesOnTransientErrors: options.maxRetriesOnTransientErrors,
        connectionRetryIntervalMs: options.connectionRetryInterval
          ? Duration.toMillis(Duration.fromInputUnsafe(options.connectionRetryInterval))
          : undefined,
        database: options.database,
        username: options.username,
        password: options.password ? Redacted.value(options.password) : undefined,
        encrypt: options.encrypt,
        trustServer: options.trustServer,
        connectTimeoutMs: options.connectTimeout
          ? Duration.toMillis(Duration.fromInputUnsafe(options.connectTimeout))
          : undefined,
        cancelTimeoutMs: options.cancelTimeout
          ? Duration.toMillis(Duration.fromInputUnsafe(options.cancelTimeout))
          : undefined,
        requestTimeoutMs: options.requestTimeout !== undefined
          ? Duration.toMillis(Duration.fromInputUnsafe(options.requestTimeout))
          : undefined
      }).pipe(Effect.mapError(mapError))

      const parameters = (values: ReadonlyArray<unknown>): Array<TdsRequest.Parameter> =>
        values.map((value, i) => {
          if (isMssqlParam(value)) {
            return { name: numberToParamName(i), type: value.paramA, value: value.paramB, options: value.paramC }
          }
          const kind = Statement.primitiveKind(value)
          return {
            name: numberToParamName(i),
            type: parameterTypes[kind],
            value: value instanceof Int8Array
              ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
              : value
          }
        })

      const run = (sql: string, values: ReadonlyArray<unknown>, rowsAsArray = false) =>
        conn.query(sql, parameters(values), rowsAsArray).pipe(
          Effect.map((result) => result.rows),
          Effect.mapError(mapError)
        )
      const batch = (sql: string) => conn.batch(sql).pipe(Effect.asVoid, Effect.mapError(mapError))
      const connection = identity<MssqlConnection>({
        execute(sql, params, transformRows) {
          return transformRows ? Effect.map(run(sql, params), transformRows) : run(sql, params)
        },
        executeRaw: (sql, params) => run(sql, params),
        executeValues: (sql, params) => run(sql, params, true),
        executeValuesUnprepared: (sql, params) => run(sql, params, true),
        executeUnprepared(sql, params, transformRows) {
          return this.execute(sql, params, transformRows)
        },
        executeStream() {
          return Stream.die("executeStream not implemented")
        },
        call(procedure, transformRows) {
          const params: Array<TdsRequest.Parameter> = []
          for (const name in procedure.params) {
            const param = procedure.params[name]
            params.push({ name, type: param.type, value: procedure.values[name], options: param.options })
          }
          for (const name in procedure.outputParams) {
            const param = procedure.outputParams[name]
            params.push({ name, type: param.type, value: null, options: param.options, output: true })
          }
          return conn.call(procedure.name, params).pipe(
            Effect.map((result) => ({
              output: result.output,
              rows: transformRows ? transformRows(result.rows) : result.rows
            })),
            Effect.mapError(mapError)
          )
        },
        begin: batch("BEGIN TRANSACTION"),
        commit: batch("COMMIT TRANSACTION"),
        savepoint: (name) => batch(`SAVE TRANSACTION ${escape(name)}`),
        rollback: (name) =>
          batch(name ? `ROLLBACK TRANSACTION ${escape(name)}` : "IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION")
      })

      yield* Effect.callback<void>((resume) => {
        const remove = conn.onClose(() => resume(Effect.void))
        return Effect.sync(remove)
      }).pipe(
        Effect.flatMap(() => Pool.invalidate(pool, connection)),
        Effect.interruptible,
        Effect.forkScoped
      )
      return connection
    })

    pool = yield* Pool.makeWithTTL({
      acquire: makeConnection,
      min: options.minConnections ?? 1,
      max: options.maxConnections ?? 10,
      timeToLive: options.connectionTTL ?? Duration.minutes(45),
      timeToLiveStrategy: "creation"
    })

    yield* Pool.get(pool).pipe(
      Effect.tap((connection) => connection.executeUnprepared("SELECT 1", [], undefined)),
      Effect.mapError((cause) =>
        new SqlError({ reason: classifyError(cause, "MssqlClient: Failed to connect", "connect", "connection") })
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
      (transaction) => transaction._tag === "Some" ? Effect.succeed(transaction.value[0]) : Pool.get(pool)
    )

    const withTransaction = Client.makeWithTransaction({
      transactionService,
      spanAttributes,
      acquireConnection: Effect.gen(function*() {
        const scope = Scope.makeUnsafe()
        const conn = yield* Scope.provide(Pool.get(pool), scope)
        return [scope, conn] as const
      }),
      begin: (conn) => conn.begin,
      savepoint: (conn, id) => conn.savepoint(`effect_sql_${id}`),
      commit: (conn) => conn.commit,
      rollback: (conn) => conn.rollback(),
      rollbackSavepoint: (conn, id) => conn.rollback(`effect_sql_${id}`)
    })

    return identity<MssqlClient>(Object.assign(
      yield* Client.make({
        acquirer: Pool.get(pool),
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
          type: DataType,
          value: unknown,
          options: ParameterOptions = {}
        ) => Statement.fragment([mssqlParam(type, value, options)]),
        call: <
          I extends Record<string, Parameter<any>>,
          O extends Record<string, Parameter<any>>,
          A
        >(
          procedure: Procedure.ProcedureWithValues<I, O, A>
        ) => Effect.scoped(Effect.flatMap(getConnection, (_) => _.call(procedure, transformRows))),
        withoutTransforms() {
          const statement = Statement.make(getConnection, compiler.withoutTransform, spanAttributes, undefined)
          const client = Object.assign(
            statement,
            this,
            statement,
            {
              call: <
                I extends Record<string, Parameter<any>>,
                O extends Record<string, Parameter<any>>,
                A
              >(
                procedure: Procedure.ProcedureWithValues<I, O, A>
              ) => Effect.scoped(Effect.flatMap(getConnection, (_) => _.call(procedure, undefined)))
            }
          )
          ;(client as any).safe = client
          ;(client as any).withoutTransforms = () => client
          return client
        }
      }
    ))
  })

/**
 * Creates a layer from a `Config`-wrapped SQL Server client configuration, providing both `MssqlClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig: (
  config: Config.Wrap<MssqlClientConfig>
) => Layer.Layer<Client.SqlClient | MssqlClient, Config.ConfigError | SqlError> = (
  config: Config.Wrap<MssqlClientConfig>
): Layer.Layer<Client.SqlClient | MssqlClient, Config.ConfigError | SqlError> =>
  Layer.effectContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(MssqlClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Creates a layer from a concrete SQL Server client configuration, providing both `MssqlClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: MssqlClientConfig
): Layer.Layer<Client.SqlClient | MssqlClient, never | SqlError> =>
  Layer.effectContext(
    Effect.map(make(config), (client) =>
      Context.make(MssqlClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))

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
 * @category constants
 * @since 4.0.0
 */
export const defaultParameterTypes: Record<Statement.PrimitiveKind, DataType> = {
  string: TdsRequest.TYPES.NVarChar,
  number: TdsRequest.TYPES.Float,
  bigint: TdsRequest.TYPES.BigInt,
  boolean: TdsRequest.TYPES.Bit,
  Date: TdsRequest.TYPES.DateTime,
  Uint8Array: TdsRequest.TYPES.VarBinary,
  Int8Array: TdsRequest.TYPES.VarBinary,
  null: TdsRequest.TYPES.Bit
}

// custom types

type MssqlCustom = MssqlParam

interface MssqlParam extends
  Statement.Custom<
    "MssqlParam",
    DataType,
    unknown,
    ParameterOptions
  >
{}

const mssqlParam = Statement.custom<MssqlParam>("MssqlParam")
const isMssqlParam = Statement.isCustom<MssqlParam>("MssqlParam")
