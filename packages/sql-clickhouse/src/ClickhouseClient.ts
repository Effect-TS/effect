/**
 * @since 1.0.0
 */
import * as Clickhouse from "@clickhouse/client"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeStream from "@effect/platform-node/NodeStream"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Crypto from "node:crypto"
import type { Readable } from "node:stream"

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"

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
  readonly param: (dataType: string, value: unknown) => Statement.Fragment
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
  readonly withClickhouseSettings: {
    (
      settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
    ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
    ): Effect.Effect<A, E, R>
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
): Effect.Effect<ClickhouseClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined

    const client = Clickhouse.createClient(options)

    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => client.exec({ query: "SELECT 1" }),
        catch: (cause) => new SqlError({ cause, message: "ClickhouseClient: Failed to connect" })
      }),
      () => Effect.promise(() => client.close())
    ).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(5),
        onTimeout: () =>
          new SqlError({
            message: "ClickhouseClient: Connection timeout",
            cause: new Error("connection timeout")
          })
      })
    )

    class ConnectionImpl implements Connection {
      constructor(private readonly conn: Clickhouse.ClickHouseClient) {}

      private runRaw(sql: string, params: ReadonlyArray<unknown>, format: Clickhouse.DataFormat = "JSON") {
        const paramsObj: Record<string, unknown> = {}
        for (let i = 0; i < params.length; i++) {
          paramsObj[`p${i + 1}`] = params[i]
        }
        return Effect.withFiberRuntime<Clickhouse.ResultSet<"JSON"> | Clickhouse.CommandResult, SqlError>((fiber) => {
          const method = fiber.getFiberRef(currentClientMethod)
          return Effect.async<Clickhouse.ResultSet<"JSON"> | Clickhouse.CommandResult, SqlError>((resume) => {
            const queryId = fiber.getFiberRef(currentQueryId) ?? Crypto.randomUUID()
            const settings = fiber.getFiberRef(currentClickhouseSettings) ?? {}
            const controller = new AbortController()
            if (method === "command") {
              this.conn.command({
                query: sql,
                query_params: paramsObj,
                abort_signal: controller.signal,
                query_id: queryId,
                clickhouse_settings: settings
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
                clickhouse_settings: settings,
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

      private run(sql: string, params: ReadonlyArray<unknown>, format?: Clickhouse.DataFormat) {
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
        return this.run(sql, params, "JSONCompact")
      }
      executeUnprepared(sql: string, params: ReadonlyArray<unknown>, transformRows?: any) {
        return this.execute(sql, params, transformRows)
      }
      executeStream(
        sql: string,
        params: ReadonlyArray<unknown>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
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
              try: () =>
                Promise.all(promises).then((rows) => Chunk.unsafeFromArray(transformRows ? transformRows(rows) : rows)),
              catch: (cause) => new SqlError({ cause, message: "Failed to parse row" })
            })
          }),
          Stream.flattenChunks
        )
      }
    }

    const connection = new ConnectionImpl(client)

    return Object.assign(
      yield* Client.make({
        acquirer: Effect.succeed(connection),
        compiler,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [ATTR_DB_SYSTEM_NAME, "clickhouse"],
          [ATTR_DB_NAMESPACE, options.database ?? "default"]
        ],
        beginTransaction: "BEGIN TRANSACTION",
        transformRows
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        param(dataType: string, value: unknown) {
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
          return Effect.withFiberRuntime<Clickhouse.InsertResult, SqlError>((fiber) =>
            Effect.async((resume) => {
              const queryId = fiber.getFiberRef(currentQueryId) ?? Crypto.randomUUID()
              const settings = fiber.getFiberRef(currentClickhouseSettings)
              const controller = new AbortController()
              client.insert({
                format: "JSONEachRow",
                ...options,
                abort_signal: controller.signal,
                query_id: queryId,
                clickhouse_settings: settings
              }).then(
                (result) => resume(Effect.succeed(result)),
                (cause) => resume(Effect.fail(new SqlError({ cause, message: "Failed to insert data" })))
              )
              return Effect.suspend(() => {
                controller.abort()
                return Effect.promise(() => client.command({ query: `KILL QUERY WHERE query_id = '${queryId}'` }))
              })
            })
          )
        },
        withQueryId: dual(2, <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) =>
          Effect.locally(effect, currentQueryId, queryId)),
        withClickhouseSettings: dual(
          2,
          <A, E, R>(
            effect: Effect.Effect<A, E, R>,
            settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
          ) =>
            Effect.locally(effect, currentClickhouseSettings, settings)
        )
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
 * @category fiber refs
 * @since 1.0.0
 */
export const currentClickhouseSettings: FiberRef.FiberRef<
  NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
> = globalValue(
  "@effect/sql-clickhouse/ClickhouseClient/currentClickhouseSettings",
  () => FiberRef.unsafeMake({})
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
  ).pipe(Layer.provide(Reactivity.layer))

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
  ).pipe(Layer.provide(Reactivity.layer))

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
interface ClickhouseParam extends Statement.Custom<"ClickhouseParam", string, unknown> {}

const clickhouseParam = Statement.custom<ClickhouseParam>("ClickhouseParam")
const isClickhouseParam = Statement.isCustom<ClickhouseParam>("ClickhouseParam")
