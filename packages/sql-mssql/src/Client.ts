/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import type { Connection } from "@effect/sql/Connection"
import { SqlError } from "@effect/sql/Error"
import * as Statement from "@effect/sql/Statement"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Pool from "effect/Pool"
import * as Scope from "effect/Scope"
import * as Secret from "effect/Secret"
import * as Tedious from "tedious"
import type { ConnectionOptions } from "tedious/lib/connection.js"
import type { DataType } from "tedious/lib/data-type.js"
import type { ParameterOptions } from "tedious/lib/request.js"
import type { Parameter } from "./Parameter.js"
import type * as Procedure from "./Procedure.js"

/**
 * @category models
 * @since 1.0.0
 */
export interface MssqlClient extends Client.Client {
  readonly config: MssqlClientConfig

  readonly param: (
    type: DataType,
    value: Statement.Primitive,
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
 * @category tags
 * @since 1.0.0
 */
export const MssqlClient = Context.GenericTag<MssqlClient>("@effect/sql-mssql/MssqlClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface MssqlClientConfig {
  readonly domain?: string | undefined
  readonly server: string
  readonly instanceName?: string | undefined
  readonly encrypt?: boolean | undefined
  readonly trustServer?: boolean | undefined
  readonly port?: number | undefined
  readonly authType?: string | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Secret.Secret | undefined
  readonly connectTimeout?: Duration.DurationInput | undefined

  readonly minConnections?: number | undefined
  readonly maxConnections?: number | undefined
  readonly connectionTTL?: Duration.DurationInput | undefined

  readonly parameterTypes?: Record<Statement.PrimitiveKind, DataType> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

interface MssqlConnection extends Connection {
  readonly call: (
    procedure: Procedure.ProcedureWithValues<any, any, any>
  ) => Effect.Effect<any, SqlError>

  readonly begin: Effect.Effect<void, SqlError>
  readonly commit: Effect.Effect<void, SqlError>
  readonly savepoint: (name: string) => Effect.Effect<void, SqlError>
  readonly rollback: (name?: string) => Effect.Effect<void, SqlError>
}

const TransactionConnection = Client.TransactionConnection as unknown as Context.Tag<
  readonly [conn: MssqlConnection, counter: number],
  readonly [conn: MssqlConnection, counter: number]
>

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  options: MssqlClientConfig
): Effect.Effect<MssqlClient, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const parameterTypes = options.parameterTypes ?? defaultParameterTypes
    const compiler = makeCompiler(options.transformQueryNames)

    const transformRows = Client.defaultTransforms(
      options.transformResultNames!
    ).array

    // eslint-disable-next-line prefer-const
    let pool: Pool.Pool<MssqlConnection, SqlError>

    const makeConnection = Effect.gen(function*(_) {
      const conn = new Tedious.Connection({
        options: {
          port: options.port,
          database: options.database,
          trustServerCertificate: options.trustServer ?? true,
          connectTimeout: options.connectTimeout
            ? Duration.toMillis(Duration.decode(options.connectTimeout))
            : undefined,
          rowCollectionOnRequestCompletion: true,
          useColumnNames: false,
          instanceName: options.instanceName,
          encrypt: options.encrypt ?? false
        } as ConnectionOptions,
        server: options.server,
        authentication: {
          type: (options.authType as any) ?? "default",
          options: {
            userName: options.username,
            password: options.password
              ? Secret.value(options.password)
              : undefined
          }
        }
      })

      yield* _(Effect.addFinalizer(() => Effect.sync(() => conn.close())))

      yield* _(
        Effect.async<void, SqlError>((resume) => {
          conn.connect((error) => {
            if (error) {
              resume(Effect.fail(new SqlError({ error })))
            } else {
              resume(Effect.void)
            }
          })
        })
      )

      const run = (
        sql: string,
        values?: ReadonlyArray<any>,
        transform = true,
        rowsAsArray = false
      ) =>
        Effect.async<any, SqlError>((resume) => {
          const req = new Tedious.Request(sql, (error, _rowCount, result) => {
            if (error) {
              resume(Effect.fail(new SqlError({ error })))
              return
            }

            if (rowsAsArray) {
              result = result.map((row: any) => row.map((_: any) => _.value))
            } else {
              result = rowsToObjects(result)

              if (transform && options.transformResultNames) {
                result = transformRows(result) as any
              }
            }

            resume(Effect.succeed(result))
          })

          if (values) {
            for (let i = 0, len = values.length; i < len; i++) {
              const value = values[i]
              const name = numberToAlpha(i)

              if (isMssqlParam(value)) {
                req.addParameter(name, value.i0, value.i1, value.i2)
              } else {
                const kind = Statement.primitiveKind(value)
                const type = parameterTypes[kind]
                req.addParameter(name, type, value)
              }
            }
          }

          conn.cancel()
          conn.execSql(req)
        })

      const runProcedure = (procedure: Procedure.ProcedureWithValues<any, any, any>) =>
        Effect.async<any, SqlError>((resume) => {
          const result: Record<string, any> = {}

          const req = new Tedious.Request(
            escape(procedure.name),
            (error, _, rows) => {
              if (error) {
                resume(Effect.fail(new SqlError({ error })))
              } else {
                rows = rowsToObjects(rows)
                if (options.transformResultNames) {
                  rows = transformRows(rows) as any
                }
                resume(
                  Effect.succeed({
                    params: result,
                    rows
                  })
                )
              }
            }
          )

          for (const name in procedure.params) {
            const param = procedure.params[name]
            const value = procedure.values[name]
            req.addParameter(name, param.type, value, param.options)
          }

          for (const name in procedure.outputParams) {
            const param = procedure.outputParams[name]
            req.addOutputParameter(name, param.type, undefined, param.options)
          }

          req.on("returnValue", (name, value) => {
            result[name] = value
          })

          conn.cancel()
          conn.callProcedure(req)
        })

      const connection = identity<MssqlConnection>({
        execute(sql, params) {
          return run(sql, params)
        },
        executeWithoutTransform(sql, params) {
          return run(sql, params, false)
        },
        executeValues(sql, params) {
          return run(sql, params, true, true)
        },
        executeRaw(sql, params) {
          return run(sql, params)
        },
        executeStream() {
          return Effect.dieMessage("executeStream not implemented")
        },
        call: (procedure) => {
          return runProcedure(procedure)
        },
        begin: Effect.async<void, SqlError>((resume) => {
          conn.beginTransaction((error) => {
            if (error) {
              resume(Effect.fail(new SqlError({ error })))
            } else {
              resume(Effect.void)
            }
          })
        }),
        commit: Effect.async<void, SqlError>((resume) => {
          conn.commitTransaction((error) => {
            if (error) {
              resume(Effect.fail(new SqlError({ error })))
            } else {
              resume(Effect.void)
            }
          })
        }),
        savepoint: (name: string) =>
          Effect.async<void, SqlError>((resume) => {
            conn.saveTransaction((error) => {
              if (error) {
                resume(Effect.fail(new SqlError({ error })))
              } else {
                resume(Effect.void)
              }
            }, name)
          }),
        rollback: (name?: string) =>
          Effect.async<void, SqlError>((resume) => {
            conn.rollbackTransaction((error) => {
              if (error) {
                resume(Effect.fail(new SqlError({ error })))
              } else {
                resume(Effect.void)
              }
            }, name)
          })
      })

      yield* _(
        Effect.async<never, unknown>((resume) => {
          conn.on("error", (_) => resume(Effect.fail(_)))
        }),
        Effect.catchAll(() => Pool.invalidate(pool, connection)),
        Effect.interruptible,
        Effect.forkScoped
      )

      return connection
    })

    pool = yield* _(
      Pool.makeWithTTL({
        acquire: makeConnection,
        min: options.minConnections ?? 1,
        max: options.maxConnections ?? 10,
        timeToLive: options.connectionTTL ?? Duration.minutes(45)
      })
    )

    const makeRootTx: Effect.Effect<
      readonly [Scope.CloseableScope | undefined, MssqlConnection, number],
      SqlError
    > = Effect.flatMap(
      Scope.make(),
      (scope) => Effect.map(Scope.extend(Pool.get(pool), scope), (conn) => [scope, conn, 0] as const)
    )

    const withTransaction = <R, E, A>(
      effect: Effect.Effect<A, E, R>
    ): Effect.Effect<A, E | SqlError, R> =>
      Effect.acquireUseRelease(
        pipe(
          Effect.serviceOption(TransactionConnection),
          Effect.flatMap(
            Option.match({
              onNone: () => makeRootTx,
              onSome: ([conn, count]) => Effect.succeed([undefined, conn, count + 1] as const)
            })
          ),
          Effect.tap(([, conn, id]) =>
            id > 0
              ? conn.savepoint(`effect_sql_${id}`)
              : conn.begin
          )
        ),
        ([, conn, id]) => Effect.provideService(effect, TransactionConnection, [conn, id]),
        ([scope, conn, id], exit) => {
          const effect = Exit.isSuccess(exit)
            ? id > 0
              ? Effect.void
              : Effect.orDie(conn.commit)
            : Effect.orDie(conn.rollback(id > 0 ? `effect_sql_${id}` : undefined))
          return scope !== undefined ? Effect.ensuring(effect, Scope.close(scope, exit)) : effect
        }
      )

    return identity<MssqlClient>(Object.assign(
      Client.make({
        acquirer: pool.get,
        compiler,
        transactionAcquirer: pool.get,
        spanAttributes: [
          ["db.system", "mssql"],
          ["db.name", options.database ?? "master"],
          ["server.address", options.server],
          ["server.port", options.port ?? 1433]
        ]
      }),
      {
        config: options,

        withTransaction,

        param: (
          type: DataType,
          value: Statement.Primitive,
          options: ParameterOptions = {}
        ) => mssqlParam(type, value, options),

        call: <
          I extends Record<string, Parameter<any>>,
          O extends Record<string, Parameter<any>>,
          A
        >(
          procedure: Procedure.ProcedureWithValues<I, O, A>
        ) => Effect.scoped(Effect.flatMap(pool.get, (_) => _.call(procedure)))
      }
    ))
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layer: (
  config: Config.Config.Wrap<MssqlClientConfig>
) => Layer.Layer<MssqlClient, ConfigError> = (
  config: Config.Config.Wrap<MssqlClientConfig>
) => Layer.scoped(MssqlClient, Effect.flatMap(Config.unwrap(config), make))

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler<MssqlCustom>({
    placeholder: (_) => `@${numberToAlpha(_ - 1)}`,
    onIdentifier: transform ? (_) => escape(transform(_)) : escape,
    onRecordUpdate: (placeholders, valueAlias, valueColumns, values) => [
      `(values ${placeholders}) AS ${valueAlias}${valueColumns}`,
      values.flat()
    ],
    onCustom: (type, placeholder) => {
      switch (type.kind) {
        case "MssqlParam": {
          return [placeholder(), [type] as any]
        }
      }
    },
    onInsert: (columns, placeholders, values) => [
      `(${columns.join(",")}) OUTPUT INSERTED.* VALUES ${placeholders}`,
      values.flat()
    ]
  })

/**
 * @since 1.0.0
 */
export const defaultParameterTypes: Record<Statement.PrimitiveKind, DataType> = {
  string: Tedious.TYPES.VarChar,
  number: Tedious.TYPES.Int,
  bigint: Tedious.TYPES.BigInt,
  boolean: Tedious.TYPES.Bit,
  Date: Tedious.TYPES.DateTime,
  Uint8Array: Tedious.TYPES.VarBinary,
  Int8Array: Tedious.TYPES.VarBinary,
  null: Tedious.TYPES.Bit
}

// compiler helpers

const escape = (str: string) => "[" + str.replace(/\]/g, "]]").replace(/\./g, "].[") + "]"

const charCodeA = "a".charCodeAt(0)
function numberToAlpha(n: number) {
  let s = ""
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + charCodeA) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function rowsToObjects(rows: ReadonlyArray<any>) {
  const newRows = new Array(rows.length)

  for (let i = 0, len = rows.length; i < len; i++) {
    const row = rows[i]
    const newRow: any = {}
    for (let j = 0, columnLen = row.length; j < columnLen; j++) {
      const column = row[j]
      newRow[column.metadata.colName] = column.value
    }
    newRows[i] = newRow
  }

  return newRows
}

// custom types

type MssqlCustom = MssqlParam

interface MssqlParam extends
  Statement.Custom<
    "MssqlParam",
    DataType,
    Statement.Primitive,
    ParameterOptions
  >
{}

const mssqlParam = Statement.custom<MssqlParam>("MssqlParam")
const isMssqlParam = Statement.isCustom<MssqlParam>("MssqlParam")
