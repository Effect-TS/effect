/**
 * ClickHouse driver for Effect SQL, backed by `@clickhouse/client`.
 *
 * This module provides both the ClickHouse-specific {@link ClickhouseClient}
 * service and the generic {@link Client.SqlClient} service. `make` creates a
 * scoped client, checks the connection with `ping()`, maps ClickHouse errors
 * to `SqlError`, and aborts in-flight queries when interrupted. The
 * ClickHouse-specific service adds typed parameters, command execution, insert
 * queries, format-aware streaming with progress events, query id and settings
 * helpers, a statement compiler, and direct or config-backed layers.
 *
 * @since 4.0.0
 */
import * as Clickhouse from "@clickhouse/client"
import * as NodeStream from "@effect/platform-node/NodeStream"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"
import * as Client from "effect/sql/SqlClient"
import type { Connection } from "effect/sql/SqlConnection"
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  SqlError,
  SqlSyntaxError,
  StatementTimeoutError,
  UnknownError
} from "effect/sql/SqlError"
import * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"
import * as Crypto from "node:crypto"
import type { Readable } from "node:stream"

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"

const clickhouseCodeFromCause = (cause: unknown): number | undefined => {
  if (typeof cause !== "object" || cause === null || !("code" in cause)) {
    return undefined
  }
  const code = cause.code
  if (typeof code === "number") {
    return code
  }
  if (typeof code === "string") {
    const parsed = Number(code)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

const clickhouseSyntaxErrorCodes = new Set([36, 60, 62, 242])

const classifyError = (
  cause: unknown,
  message: string,
  operation: string,
  fallback: "connection" | "unknown" = "unknown"
) => {
  const props = { cause, message, operation }
  const code = clickhouseCodeFromCause(cause)
  if (code !== undefined) {
    if (code === 516) {
      return new AuthenticationError(props)
    }
    if (code === 497) {
      return new AuthorizationError(props)
    }
    if (clickhouseSyntaxErrorCodes.has(code)) {
      return new SqlSyntaxError(props)
    }
    if (code === 159 || code === 469) {
      return new StatementTimeoutError(props)
    }
  }
  return fallback === "connection" ? new ConnectionError(props) : new UnknownError(props)
}

const rawDataFormats = {
  CSV: true,
  CSVWithNames: true,
  CSVWithNamesAndTypes: true,
  TabSeparated: true,
  TabSeparatedRaw: true,
  TabSeparatedWithNames: true,
  TabSeparatedWithNamesAndTypes: true,
  CustomSeparated: true,
  CustomSeparatedWithNames: true,
  CustomSeparatedWithNamesAndTypes: true,
  Parquet: true
} satisfies Record<Clickhouse.RawDataFormat, true>

// The compiler renders placeholders as `{p1: Type}`, `{p2: Type}`, ...
const toQueryParams = (params: ReadonlyArray<unknown>) => {
  const paramsObj: Record<string, unknown> = {}
  for (let i = 0; i < params.length; i++) {
    paramsObj[`p${i + 1}`] = params[i]
  }
  return paramsObj
}

const isRawFormat = (format: Clickhouse.StreamableDataFormat): format is Clickhouse.RawDataFormat =>
  format in rawDataFormats

const streamError = (cause: unknown) =>
  new SqlError({ reason: classifyError(cause, "Failed to execute stream", "stream") })

// `JSONEachRowWithProgress` events whose payload is a result row
const rowEventKeys = ["row", "totals", "min", "max"] as const

// In `JSONEachRowWithProgress` streams the server reports mid-stream failures
// as a `{exception: string}` event instead of an HTTP error.
const isExceptionEvent = (value: unknown): value is { exception: string } =>
  typeof value === "object" && value !== null && "exception" in value &&
  typeof (value as { exception: unknown }).exception === "string"

const exceptionEventError = (event: { exception: string }) => {
  // exception text starts with "Code: <n>. DB::Exception: ..."
  const code = /^Code: (\d+)\./.exec(event.exception)
  return new SqlError({
    reason: classifyError(
      code ? { code: Number(code[1]), message: event.exception } : event,
      "Query failed while streaming",
      "stream"
    )
  })
}

/**
 * Unique runtime identifier used to tag `ClickhouseClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-clickhouse/ClickhouseClient"

/**
 * Type-level literal for the `ClickhouseClient` runtime identifier.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-clickhouse/ClickhouseClient"

/**
 * ClickHouse-specific `SqlClient` extension with access to its configuration,
 * typed parameter fragments, command-mode execution, insert queries,
 * format-aware query streaming, and per-effect query ID and ClickHouse
 * settings.
 *
 * @category services
 * @since 4.0.0
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
    readonly columns?: NonNullable<Clickhouse.InsertParams<Readable, T>["columns"]>
  }) => Effect.Effect<Clickhouse.InsertResult, SqlError>
  readonly queryStream: <A, Format extends Clickhouse.StreamableDataFormat = "JSONEachRow">(
    statement: Statement.Statement<A>,
    options?: {
      readonly format?: Format | undefined
    }
  ) => Stream.Stream<QueryStreamRow<A, Format>, SqlError>
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
 * Service tag for the active ClickHouse SQL client.
 *
 * **When to use**
 *
 * Use to access or provide a ClickHouse SQL client through the Effect context.
 *
 * @category services
 * @since 4.0.0
 */
export const ClickhouseClient = Context.Service<ClickhouseClient>("@effect/sql-clickhouse/ClickhouseClient")

/**
 * Configuration for creating a ClickHouse client, combining
 * `@clickhouse/client` options with optional span attributes and query/result
 * name transforms.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClickhouseClientConfig extends Clickhouse.ClickHouseClientConfigOptions {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * Element type emitted by `ClickhouseClient.queryStream` for a given streamable
 * format: decoded rows for streamable JSON formats, rows interleaved with
 * progress events for `JSONEachRowWithProgress`, and raw `Uint8Array` chunks
 * for raw formats such as `CSV`, `TabSeparated` (TSV), or `Parquet`.
 *
 * **Details**
 *
 * `transformResultNames` is applied to decoded rows, including the `row`,
 * `totals`, `min`, and `max` payloads of `JSONEachRowWithProgress` events; raw
 * chunks are emitted untouched.
 *
 * `{exception: string}` events reported by the server in
 * `JSONEachRowWithProgress` streams are never emitted; they fail the stream
 * with a classified `SqlError` instead. These streams enable the
 * `http_write_exception_in_output_format` setting unless it is set in the
 * client config or per request, so failures after streaming has started are
 * reliably classified.
 *
 * **Gotchas**
 *
 * In other formats a failure after streaming has started still fails the
 * stream, but it may surface as an `UnknownError` instead of a classified
 * reason.
 *
 * @category utility types
 * @since 4.0.0
 */
export type QueryStreamRow<T, Format extends Clickhouse.StreamableDataFormat = "JSONEachRow"> = Format extends
  "JSONEachRowWithProgress" ? Exclude<Clickhouse.RowOrProgress<T>, { exception: string }>
  : Format extends Clickhouse.StreamableJSONDataFormat ? T
  : Uint8Array

/**
 * Creates a scoped `ClickhouseClient`, verifies connectivity with `ping()`,
 * closes the underlying client when the scope ends, maps ClickHouse failures
 * to `SqlError`, and aborts plus kills in-flight queries when interrupted.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: ClickhouseClientConfig
): Effect.Effect<ClickhouseClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = makeCompiler(options.transformQueryNames)
    const transforms = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames)
      : undefined
    const transformRows = transforms?.array
    const clientSettings = options.clickhouse_settings

    const client = yield* Effect.acquireRelease(
      Effect.sync(() => Clickhouse.createClient(options)),
      (client) => Effect.promise(() => client.close())
    )

    yield* Effect.tryPromise({
      try: async () => {
        const result = await client.ping()
        if (!result.success) {
          throw result.error
        }
        return result
      },
      catch: (cause) =>
        new SqlError({ reason: classifyError(cause, "ClickhouseClient: Failed to connect", "connect", "connection") })
    }).pipe(
      Effect.timeoutOrElse({
        duration: Duration.seconds(5),
        orElse: () =>
          Effect.fail(
            new SqlError({
              reason: new ConnectionError({
                message: "ClickhouseClient: Connection timeout",
                cause: new Error("connection timeout"),
                operation: "connect"
              })
            })
          )
      })
    )

    class ConnectionImpl implements Connection {
      private conn: Clickhouse.ClickHouseClient
      constructor(conn: Clickhouse.ClickHouseClient) {
        this.conn = conn
      }

      private killQuery(queryId: string) {
        return Effect.promise(() =>
          this.conn.command({
            query: "KILL QUERY WHERE query_id = {queryId:String}",
            query_params: { queryId }
          })
        )
      }

      private runRaw(sql: string, params: ReadonlyArray<unknown>, format: Clickhouse.DataFormat = "JSON") {
        const paramsObj = toQueryParams(params)
        return Effect.gen({ self: this }, function*() {
          const method = yield* ClientMethod
          const queryId = (yield* QueryId) ?? Crypto.randomUUID()
          const settings = yield* ClickhouseSettings
          return yield* Effect.callback<Clickhouse.ResultSet<"JSON"> | Clickhouse.CommandResult, SqlError>((resume) => {
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
                (cause) =>
                  resume(
                    Effect.fail(
                      new SqlError({ reason: classifyError(cause, "Failed to execute statement", "execute") })
                    )
                  )
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
                (cause) =>
                  resume(
                    Effect.fail(
                      new SqlError({ reason: classifyError(cause, "Failed to execute statement", "execute") })
                    )
                  )
              )
            }
            return Effect.suspend(() => {
              controller.abort()
              return this.killQuery(queryId)
            })
          })
        })
      }

      private run(sql: string, params: ReadonlyArray<unknown>, format?: Clickhouse.DataFormat) {
        return this.runRaw(sql, params, format).pipe(
          Effect.flatMap((result) => {
            if ("json" in result) {
              return Effect.tryPromise({
                try: () => result.json().then((result) => "data" in result ? result.data : result as any),
                catch: (cause) =>
                  new SqlError({ reason: classifyError(cause, "Failed to parse result", "parseResult") })
              })
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
      executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
        return this.executeValues(sql, params)
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
            return NodeStream.fromReadable<ReadonlyArray<Clickhouse.Row<any, "JSONEachRow">>, SqlError>({
              evaluate: () => result.stream() as any,
              onError: streamError
            })
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
              try: () => Promise.all(promises).then((rows) => transformRows ? transformRows(rows) : rows),
              catch: (cause) => new SqlError({ reason: classifyError(cause, "Failed to parse row", "parseRow") })
            })
          }),
          Stream.flattenIterable
        )
      }
      insertQuery<T = unknown>(options: {
        readonly table: string
        readonly values: Clickhouse.InsertValues<Readable, T>
        readonly format?: Clickhouse.DataFormat
        readonly columns?: NonNullable<Clickhouse.InsertParams<Readable, T>["columns"]>
      }) {
        return Effect.gen({ self: this }, function*() {
          const queryId = (yield* QueryId) ?? Crypto.randomUUID()
          const settings = yield* ClickhouseSettings
          const controller = new AbortController()
          return yield* Effect.callback<Clickhouse.InsertResult, SqlError>((resume) => {
            this.conn.insert({
              format: "JSONEachRow",
              ...options,
              abort_signal: controller.signal,
              query_id: queryId,
              clickhouse_settings: settings
            }).then(
              (result) => resume(Effect.succeed(result)),
              (cause) =>
                resume(Effect.fail(new SqlError({ reason: classifyError(cause, "Failed to insert data", "insert") })))
            )
            return Effect.suspend(() => {
              controller.abort()
              return this.killQuery(queryId)
            })
          })
        })
      }
      queryStream<A, Format extends Clickhouse.StreamableDataFormat = "JSONEachRow">(
        sql: string,
        params: ReadonlyArray<unknown>,
        format: Format
      ): Stream.Stream<QueryStreamRow<A, Format>, SqlError> {
        const query_params = toQueryParams(params)
        const stream = isRawFormat(format)
          ? this.rawQueryStream({ query: sql, format, query_params })
          : this.jsonQueryStream({ query: sql, format, query_params })
        return stream as Stream.Stream<QueryStreamRow<A, Format>, SqlError>
      }
      // Runs the request and streams its response. Unless the response is read
      // to the end (or the server rejected the request), closing the stream
      // aborts the request and kills the query: this covers interruption, early
      // termination such as `Stream.take`, and downstream failures. Closing the
      // socket alone does not stop a query that is still computing.
      private streamResponse<Result, A>(
        run: (params: {
          readonly abort_signal: AbortSignal
          readonly query_id: string
          readonly clickhouse_settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
        }) => Promise<Result>,
        toStream: (result: Result) => Stream.Stream<A, SqlError>
      ): Stream.Stream<A, SqlError> {
        return Stream.unwrap(Effect.gen({ self: this }, function*() {
          const queryId = (yield* QueryId) ?? Crypto.randomUUID()
          const settings = yield* ClickhouseSettings
          const controller = new AbortController()
          let settled = false
          yield* Effect.addFinalizer(() => {
            if (settled) return Effect.void
            controller.abort()
            return this.killQuery(queryId)
          })
          const result = yield* Effect.callback<Result, SqlError>((resume) => {
            run({
              abort_signal: controller.signal,
              query_id: queryId,
              clickhouse_settings: settings
            }).then(
              (result) => resume(Effect.succeed(result)),
              (cause) => {
                settled = true
                resume(
                  Effect.fail(
                    new SqlError({ reason: classifyError(cause, "Failed to execute statement", "execute") })
                  )
                )
              }
            )
          })
          return toStream(result).pipe(Stream.onEnd(Effect.sync(() => {
            settled = true
          })))
        }))
      }
      // Raw formats go through `exec` with an explicit FORMAT clause and stream
      // the response body untouched: `ResultSet.stream()` splits rows on newline
      // bytes, which corrupts binary formats such as Parquet. Trailing
      // semicolons are stripped so the appended clause stays in one statement,
      // and the clause starts on a new line so a trailing `--` comment cannot
      // swallow it.
      private rawQueryStream(options: {
        readonly query: string
        readonly format: Clickhouse.RawDataFormat
        readonly query_params: Record<string, unknown>
      }): Stream.Stream<Uint8Array, SqlError> {
        return this.streamResponse(
          (params) =>
            this.conn.exec({
              query: `${options.query.replace(/[\s;]+$/, "")}\nFORMAT ${options.format}`,
              query_params: options.query_params,
              ...params
            }),
          (result) =>
            NodeStream.fromReadable<Uint8Array, SqlError>({
              evaluate: () => result.stream,
              onError: streamError
            })
        )
      }
      private jsonQueryStream(options: {
        readonly query: string
        readonly format: Clickhouse.StreamableJSONDataFormat
        readonly query_params: Record<string, unknown>
      }): Stream.Stream<unknown, SqlError> {
        return this.streamResponse(
          (params) =>
            this.conn.query({
              query: options.query,
              query_params: options.query_params,
              format: options.format,
              ...params,
              // Without this setting a mid-stream failure is sent as a tagged
              // trailer that is lost when the connection resets before a slow
              // consumer reads it. With it, the failure arrives as a final
              // `{exception}` event that is classified below. Client-level and
              // per-request settings still take precedence.
              clickhouse_settings: options.format === "JSONEachRowWithProgress"
                ? {
                  http_write_exception_in_output_format: 1,
                  ...clientSettings,
                  ...params.clickhouse_settings
                }
                : params.clickhouse_settings
            }),
          (result) =>
            NodeStream.fromReadable<
              ReadonlyArray<Clickhouse.Row<unknown, Clickhouse.StreamableJSONDataFormat>>,
              SqlError
            >({
              evaluate: () => result.stream() as any,
              onError: streamError
            })
        ).pipe(
          Stream.mapEffect((rows) =>
            Effect.suspend(() => {
              let parsed: Array<any>
              try {
                parsed = rows.map((row) => row.json())
              } catch (cause) {
                return Effect.fail(new SqlError({ reason: classifyError(cause, "Failed to parse row", "parseRow") }))
              }
              if (options.format !== "JSONEachRowWithProgress") {
                return Effect.succeed(transformRows ? transformRows(parsed) : parsed)
              }
              for (let i = 0; i < parsed.length; i++) {
                const value = parsed[i]
                if (isExceptionEvent(value)) {
                  return Effect.fail(exceptionEventError(value))
                }
                if (transforms) {
                  for (const key of rowEventKeys) {
                    if (key in value) {
                      parsed[i] = { [key]: transforms.object(value[key]) }
                      break
                    }
                  }
                }
              }
              return Effect.succeed(parsed)
            })
          ),
          Stream.flattenIterable
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
          return Statement.fragment([clickhouseParam(dataType, value)])
        },
        asCommand<A, E, R>(effect: Effect.Effect<A, E, R>) {
          return Effect.provideService(effect, ClientMethod, "command")
        },
        insertQuery<T = unknown>(options: {
          readonly table: string
          readonly values: Clickhouse.InsertValues<Readable, T>
          readonly format?: Clickhouse.DataFormat
          readonly columns?: NonNullable<Clickhouse.InsertParams<Readable, T>["columns"]>
        }) {
          return connection.insertQuery(options)
        },
        queryStream<A, Format extends Clickhouse.StreamableDataFormat = "JSONEachRow">(
          statement: Statement.Statement<A>,
          options?: {
            readonly format?: Format | undefined
          }
        ): Stream.Stream<QueryStreamRow<A, Format>, SqlError> {
          return Stream.suspend(() => {
            const [sql, params] = statement.compile()
            return connection.queryStream<A, Format>(sql, params, options?.format ?? "JSONEachRow" as Format)
          })
        },
        withQueryId: dual(
          2,
          <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) => Effect.provideService(effect, QueryId, queryId)
        ),
        withClickhouseSettings: dual(
          2,
          <A, E, R>(
            effect: Effect.Effect<A, E, R>,
            settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
          ) => Effect.provideService(effect, ClickhouseSettings, settings)
        )
      }
    )
  })

/**
 * Context reference read by the low-level ClickHouse connection to choose query
 * or command execution for statements; defaults to `query`.
 *
 * @category services
 * @since 4.0.0
 */
export const ClientMethod = Context.Reference<"query" | "command" | "insert">(
  "@effect/sql-clickhouse/ClickhouseClient/ClientMethod",
  {
    defaultValue: () => "query"
  }
)

/**
 * Context reference for the ClickHouse `query_id` applied to queries and
 * inserts; a random UUID is generated when no query ID is set.
 *
 * @category services
 * @since 4.0.0
 */
export const QueryId = Context.Reference<string | undefined>(
  "@effect/sql-clickhouse/ClickhouseClient/QueryId",
  { defaultValue: () => undefined }
)

/**
 * Context reference containing ClickHouse settings to attach to queries,
 * commands, and inserts.
 *
 * @category services
 * @since 4.0.0
 */
export const ClickhouseSettings: Context.Reference<
  NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
> = Context.Reference("@effect/sql-clickhouse/ClickhouseClient/ClickhouseSettings", {
  defaultValue: () => ({})
})

/**
 * Provides both `ClickhouseClient` and generic `SqlClient` services from a
 * `Config`-backed ClickHouse client configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig: (
  config: Config.Wrap<ClickhouseClientConfig>
) => Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError> = (
  config: Config.Wrap<ClickhouseClientConfig>
): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  Layer.effectContext(
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
 * Provides both `ClickhouseClient` and generic `SqlClient` services from a
 * ClickHouse client configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: ClickhouseClientConfig
): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  Layer.effectContext(
    Effect.map(make(config), (client) =>
      Context.make(ClickhouseClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))

const typeFromUnknown = (value: unknown): string => {
  if (Statement.isFragment(value)) {
    return typeFromUnknown(value.segments[0])
  } else if (isClickhouseParam(value)) {
    return value.paramA
  } else if (Array.isArray(value)) {
    return `Array(${typeFromUnknown(value[0])})`
  }
  switch (typeof value) {
    case "number":
      return "Float64"
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
 * Creates the SQL statement compiler for ClickHouse, emitting typed
 * `{pN: Type}` placeholders and escaping identifiers with an optional query
 * name transform.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler<ClickhouseCustom>({
    dialect: "clickhouse",
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
      return [placeholder(type), [type.paramB]]
    }
  })

// compiler helpers

const escape = Statement.defaultEscape("\"")

/**
 * Custom SQL fragment type used for ClickHouse typed parameters created by
 * `ClickhouseClient.param`.
 *
 * @category models
 * @since 4.0.0
 */
export type ClickhouseCustom = ClickhouseParam

/**
 * @category models
 * @since 4.0.0
 */
interface ClickhouseParam extends Statement.Custom<"ClickhouseParam", string, unknown> {}

const clickhouseParam = Statement.custom<ClickhouseParam>("ClickhouseParam")
const isClickhouseParam = Statement.isCustom<ClickhouseParam>("ClickhouseParam")
