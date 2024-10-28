/**
 * @since 1.0.0
 */
import * as Clickhouse from "@clickhouse/client"
import * as NodeStream from "@effect/platform-node/NodeStream"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import type { Primitive } from "@effect/sql/Statement"
import * as Statement from "@effect/sql/Statement"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Crypto from "node:crypto"
import type { Readable } from "node:stream"

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
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly insertQuery: <T = unknown>(options: {
    readonly table: string
    readonly values: Clickhouse.InsertValues<Readable, T>
    readonly format?: Clickhouse.DataFormat
  }) => Effect.Effect<Clickhouse.InsertResult, SqlError>
  readonly withQueryId: {
    (queryId: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string): Effect.Effect<A, E, R>
  }
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
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : identity

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
        const paramsObj: Record<string, unknown> = {}
        for (let i = 0; i < params.length; i++) {
          paramsObj[`p${i + 1}`] = params[i]
        }
        return Effect.withFiberRuntime<Clickhouse.ResultSet<"JSON"> | Clickhouse.CommandResult, SqlError>((fiber) => {
          const method = fiber.getFiberRef(currentClientMethod)
          return Effect.async<Clickhouse.ResultSet<"JSON"> | Clickhouse.CommandResult, SqlError>((resume) => {
            const queryId = fiber.getFiberRef(currentQueryId) ?? Crypto.randomUUID()
            const controller = new AbortController()
            if (method === "command") {
              this.conn.command({
                query: sql,
                query_params: paramsObj,
                abort_signal: controller.signal,
                query_id: queryId
              }).then(
                (result) => resume(Effect.succeed(result)),
                (cause) => resume(Effect.fail(new SqlError({ cause, message: "Failed to execute statement" })))
              )
            } else {
              this.conn.query({
                query: sql,
                query_params: paramsObj,
                abort_signal: controller.signal,
                query_id: queryId,
                format
              }).then(
                (result) => resume(Effect.succeed(result)),
                (cause) => resume(Effect.fail(new SqlError({ cause, message: "Failed to execute statement" })))
              )
            }
            return Effect.suspend(() => {
              controller.abort()
              return Effect.promise(() => this.conn.command({ query: `KILL QUERY WHERE query_id = '${queryId}'` }))
            })
          })
        })
      }

      private run(sql: string, params: ReadonlyArray<Primitive>, format?: Clickhouse.DataFormat) {
        return this.runRaw(sql, params, format).pipe(
          Effect.flatMap((result) => {
            if ("json" in result) {
              return Effect.promise(() =>
                result.json().then(
                  (result) => "data" in result ? result.data : result as any,
                  () => []
                )
              )
            }
            return Effect.succeed([])
          })
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
      executeStream(sql: string, params: ReadonlyArray<Primitive>) {
        return this.runRaw(sql, params, "JSONEachRow").pipe(
          Effect.map((result) => {
            if (!("stream" in result)) {
              return Stream.empty
            }
            return NodeStream.fromReadable<SqlError, ReadonlyArray<Clickhouse.Row<any, "JSONEachRow">>>(
              () => result.stream() as any,
              (cause) => new SqlError({ cause, message: "Failed to execute stream" })
            )
          }),
          Stream.unwrap,
          Stream.chunks,
          Stream.mapEffect((chunk) => {
            const promises: Array<Promise<any>> = []
            for (const rows of chunk) {
              for (const row of rows) {
                promises.push(row.json())
              }
            }
            return Effect.tryPromise({
              try: () => Promise.all(promises).then((rows) => Chunk.unsafeFromArray(transformRows(rows))),
              catch: (cause) => new SqlError({ cause, message: "Failed to parse row" })
            })
          }),
          Stream.flattenChunks
        )
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
        },
        asCommand<A, E, R>(effect: Effect.Effect<A, E, R>) {
          return Effect.locally(effect, currentClientMethod, "command")
        },
        insertQuery<T = unknown>(options: {
          readonly table: string
          readonly values: Clickhouse.InsertValues<Readable, T>
          readonly format?: Clickhouse.DataFormat
        }) {
          return FiberRef.getWith(currentQueryId, (queryId_) =>
            Effect.async<Clickhouse.InsertResult, SqlError>((resume) => {
              const queryId = queryId_ ?? Crypto.randomUUID()
              const controller = new AbortController()
              client.insert({
                format: "JSONEachRow",
                ...options,
                abort_signal: controller.signal,
                query_id: queryId
              }).then(
                (result) =>
                  resume(Effect.succeed(result)),
                (cause) => resume(Effect.fail(new SqlError({ cause, message: "Failed to insert data" })))
              )
              return Effect.suspend(() => {
                controller.abort()
                return Effect.promise(() => client.command({ query: `KILL QUERY WHERE query_id = '${queryId}'` }))
              })
            }))
        },
        withQueryId: dual(2, <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) =>
          Effect.locally(effect, currentQueryId, queryId))
      }
    )
  })

/**
 * @category fiber refs
 * @since 1.0.0
 */
export const currentClientMethod: FiberRef.FiberRef<"query" | "command" | "insert"> = globalValue(
  "@effect/sql-clickhouse/ClickhouseClient/currentClientMethod",
  () => FiberRef.unsafeMake<"query" | "command" | "insert">("query")
)

/**
 * @category fiber refs
 * @since 1.0.0
 */
export const currentQueryId: FiberRef.FiberRef<string | undefined> = globalValue(
  "@effect/sql-clickhouse/ClickhouseClient/currentQueryId",
  () => FiberRef.unsafeMake<string | undefined>(undefined)
)

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
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

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: ClickhouseClientConfig
): Layer.Layer<ClickhouseClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(ClickhouseClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  )

const typeFromUnknown = (value: unknown): string => {
  if (Statement.isFragment(value)) {
    return typeFromUnknown(value.segments[0])
  } else if (isClickhouseParam(value)) {
    return value.i0
  } else if (Array.isArray(value)) {
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
