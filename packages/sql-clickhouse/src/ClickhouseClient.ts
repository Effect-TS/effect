/**
 * @since 1.0.0
 */
import * as Clickhouse from "@clickhouse/client"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import type { Primitive } from "@effect/sql/Statement"
import * as Statement from "@effect/sql/Statement"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-clickhouse/ClickhouseClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface ClickhouseClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: ClickhouseClientConfig
  readonly param: (dataType: string, value: Statement.Primitive) => Statement.Fragment
}

/**
 * @category tags
 * @since 1.0.0
 */
export const ClickhouseClient = Context.GenericTag<ClickhouseClient>("@effect/sql-clickhouse/ClickhouseClient")

/**
 * @category constructors
 * @since 1.0.0
 */
export interface ClickhouseClientConfig extends Clickhouse.ClickHouseClientConfigOptions {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  options: ClickhouseClientConfig
): Effect.Effect<ClickhouseClient, SqlError, Scope.Scope> =>
  Effect.gen(function*(_) {
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = Statement.defaultTransforms(options.transformResultNames!).array

    const client = Clickhouse.createClient(options)

    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => client.exec({ query: "SELECT 1" }),
        catch: (cause) => new SqlError({ cause, message: "ClickhouseClient: Failed to connect" })
      }),
      () => Effect.promise(() => client.close())
    )

    class ConnectionImpl implements Connection {
      constructor(private readonly conn: Clickhouse.ClickHouseClient) {}

      private runRaw(sql: string, params: ReadonlyArray<Primitive>, format: Clickhouse.DataFormat = "JSON") {
        return Effect.tryPromise({
          try: (abort_signal) => {
            const paramsObj: Record<string, unknown> = {}
            for (let i = 0; i < params.length; i++) {
              paramsObj[`p${i + 1}`] = params[i]
            }
            return this.conn.query({
              query: sql,
              query_params: paramsObj,
              abort_signal,
              format
            })
          },
          catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
        })
      }

      private run(sql: string, params: ReadonlyArray<Primitive>, format?: Clickhouse.DataFormat) {
        return this.runRaw(sql, params, format).pipe(
          Effect.flatMap((result) =>
            Effect.orElseSucceed(
              Effect.tryPromise(() => result.json()),
              () => []
            )
          ),
          Effect.map((result) => "data" in result ? result.data : result as any)
        )
      }

      private runTransform(sql: string, params: ReadonlyArray<Primitive>) {
        return options.transformResultNames
          ? Effect.map(this.run(sql, params), transformRows)
          : this.run(sql, params)
      }

      execute(sql: string, params: ReadonlyArray<Primitive>) {
        return this.runTransform(sql, params)
      }
      executeRaw(sql: string, params: ReadonlyArray<Primitive>) {
        return this.runRaw(sql, params)
      }
      executeWithoutTransform(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(sql, params)
      }
      executeValues(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(sql, params, "JSONCompact")
      }
      executeUnprepared(sql: string, params?: ReadonlyArray<Primitive>) {
        return this.runTransform(sql, params ?? [])
      }
      executeStream(_sql: string, _params: ReadonlyArray<Primitive>) {
        return Effect.dieMessage("Not implemented")
      }
    }

    const connection = new ConnectionImpl(client)

    return Object.assign(
      Client.make({
        acquirer: Effect.succeed(connection),
        compiler,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [Otel.SEMATTRS_DB_SYSTEM, "clickhouse"],
          [Otel.SEMATTRS_DB_NAME, options.database ?? "default"]
        ],
        beginTransaction: "BEGIN TRANSACTION"
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        param(dataType: string, value: Statement.Primitive) {
          return clickhouseParam(dataType, value)
        }
      }
    )
  })

/**
 * @category constructor
 * @since 1.0.0
 */
export const layer = (
  config: Config.Config.Wrap<ClickhouseClientConfig>
): Layer.Layer<ClickhouseClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(ClickhouseClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  )

const typeFromUnknown = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `Array(${typeFromUnknown(value[0])})`
  }
  switch (typeof value) {
    case "number":
      return "Decimal"
    case "bigint":
      return "Int64"
    case "boolean":
      return "Bool"
    case "object":
      if (value instanceof Date) {
        return "DateTime()"
      }
      return "String"
    default:
      return "String"
  }
}

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler<ClickhouseCustom>({
    dialect: "sqlite",
    placeholder(i, u) {
      if (isClickhouseParam(u)) {
        return `{p${i}: ${u.i0}}`
      }
      return `{p${i}: ${typeFromUnknown(u)}}`
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      } :
      escape,
    onRecordUpdate() {
      return ["", []]
    },
    onCustom(type, placeholder) {
      return [placeholder(type), [type.i1]]
    }
  })

// compiler helpers

const escape = Statement.defaultEscape("\"")

/**
 * @category custom types
 * @since 1.0.0
 */
export type ClickhouseCustom = ClickhouseParam

/**
 * @category custom types
 * @since 1.0.0
 */
interface ClickhouseParam extends Statement.Custom<"ClickhouseParam", string, Statement.Primitive> {}

const clickhouseParam = Statement.custom<ClickhouseParam>("ClickhouseParam")
const isClickhouseParam = Statement.isCustom<ClickhouseParam>("ClickhouseParam")
