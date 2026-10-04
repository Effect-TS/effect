/**
 * Native ClickHouse HTTP support for Effect SQL.
 *
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as Layer from "../Layer.ts"
import * as Reactivity from "../reactivity/Reactivity.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as Client from "../sql/SqlClient.ts"
import type { Connection } from "../sql/SqlConnection.ts"
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  SqlError,
  SqlSyntaxError,
  StatementTimeoutError,
  UnknownError
} from "../sql/SqlError.ts"
import * as Statement from "../sql/Statement.ts"
import * as Stream from "../Stream.ts"

/**
 * Runtime identifier for native ClickHouse clients.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/clickhouse/ClickhouseClient" as const

/**
 * ClickHouse query settings sent as HTTP URL parameters.
 *
 * @category models
 * @since 4.0.0
 */
export type Settings = Readonly<Record<string, string | number | boolean>>

/**
 * Connection, query and name transformation options for ClickHouse HTTP.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClickhouseClientConfig {
  readonly url?: string | URL | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined
  readonly database?: string | undefined
  readonly requestTimeout?: Duration.Input | undefined
  readonly clickhouseSettings?: Settings | undefined
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((name: string) => string) | undefined
  readonly transformQueryNames?: ((name: string) => string) | undefined
}

/**
 * Decoded ClickHouse JSON query result with column and execution metadata.
 *
 * @category models
 * @since 4.0.0
 */
export interface QueryResult {
  readonly meta: ReadonlyArray<{ readonly name: string; readonly type: string }>
  readonly data: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly rows: number
  readonly statistics?: Readonly<Record<string, number>> | undefined
  readonly query_id: string
}

/**
 * Result metadata from a ClickHouse command or insert request.
 *
 * @category models
 * @since 4.0.0
 */
export interface CommandResult {
  readonly query_id: string
  readonly executed: boolean
}

/**
 * Options for inserting object rows or an encoded byte stream into ClickHouse.
 *
 * **Details**
 *
 * Object rows use `JSONEachRow`. Byte streams are already encoded in `format`.
 *
 * @category models
 * @since 4.0.0
 */
export interface InsertOptions {
  readonly table: string
  readonly values: ReadonlyArray<Readonly<Record<string, unknown>>> | Stream.Stream<Uint8Array, SqlError>
  readonly format?: string | undefined
  readonly columns?: ReadonlyArray<string> | undefined
}

/**
 * ClickHouse SQL service with typed parameters, commands and streaming inserts.
 *
 * @category services
 * @since 4.0.0
 */
export interface ClickhouseClient extends Client.SqlClient {
  readonly [TypeId]: typeof TypeId
  readonly config: ClickhouseClientConfig
  readonly param: (dataType: string, value: unknown) => Statement.Fragment
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly insertQuery: (options: InsertOptions) => Effect.Effect<CommandResult, SqlError>
  readonly withQueryId: {
    (queryId: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string): Effect.Effect<A, E, R>
  }
  readonly withClickhouseSettings: {
    (settings: Settings): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(effect: Effect.Effect<A, E, R>, settings: Settings): Effect.Effect<A, E, R>
  }
}

/**
 * Service for the native ClickHouse SQL client.
 *
 * @category services
 * @since 4.0.0
 */
export const ClickhouseClient = Context.Service<ClickhouseClient>("effect/clickhouse/ClickhouseClient")

/**
 * Selects query or command mode for SQL statement execution.
 *
 * @category services
 * @since 4.0.0
 */
export const ClientMethod = Context.Reference<"query" | "command">("effect/clickhouse/ClientMethod", {
  defaultValue: () => "query"
})

/**
 * Sets the query identifier sent with ClickHouse queries and inserts.
 *
 * @category services
 * @since 4.0.0
 */
export const QueryId = Context.Reference<string | undefined>("effect/clickhouse/QueryId", {
  defaultValue: () => undefined
})

/**
 * Sets per-effect ClickHouse settings, overriding connection defaults.
 *
 * @category services
 * @since 4.0.0
 */
export const ClickhouseSettings = Context.Reference<Settings>("effect/clickhouse/Settings", {
  defaultValue: () => ({})
})

const classify = (cause: unknown, message: string, operation: string, status?: number): SqlError => {
  const text = typeof cause === "string" ? cause : String((cause as any)?.message ?? "")
  const code = Number((cause as any)?.code ?? /(?:^|\n)Code:\s*(\d+)/.exec(text)?.[1])
  const props = { cause, message, operation }
  const reason = code === 516 || status === 401 ?
    new AuthenticationError(props)
    : code === 497 || status === 403 ?
    new AuthorizationError(props)
    : [36, 60, 62, 242].includes(code) ?
    new SqlSyntaxError(props)
    : code === 159 || code === 469 ?
    new StatementTimeoutError(props)
    : status === 502 || status === 503 || status === 504 || operation === "connect" ?
    new ConnectionError(props)
    : new UnknownError(props)
  return new SqlError({ reason })
}

const paramValue = (value: unknown, nested = false): string => {
  if (value === null || value === undefined) return nested ? "NULL" : "\\N"
  if (Array.isArray(value)) return `[${value.map((item) => paramValue(item, true)).join(",")}]`
  if (value instanceof Date) value = value.toISOString().replace("T", " ").replace("Z", "")
  if (typeof value === "boolean") return value ? "1" : "0"
  if (typeof value === "number" || typeof value === "bigint") return String(value)
  const text = typeof value === "string" ? value : JSON.stringify(value)
  const escaped = text.replaceAll("\\", "\\\\")
    .replaceAll("\0", "\\0")
    .replaceAll("\t", "\\t")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\b", "\\b")
    .replaceAll("\f", "\\f")
  return nested ? `'${escaped.replaceAll("'", "\\'")}'` : escaped
}

const escape = Statement.defaultEscape("\"")
interface ClickhouseParam extends Statement.Custom<"ClickhouseParam", string, unknown> {}
const clickhouseParam = Statement.custom<ClickhouseParam>("ClickhouseParam")
const isClickhouseParam = Statement.isCustom<ClickhouseParam>("ClickhouseParam")
const typeFromUnknown = (value: unknown): string => {
  if (value === null || value === undefined) return "Nullable(String)"
  if (Statement.isFragment(value)) return typeFromUnknown(value.segments[0])
  if (isClickhouseParam(value)) return value.paramA
  if (Array.isArray(value)) return `Array(${typeFromUnknown(value[0])})`
  if (value instanceof Date) return "DateTime64(3)"
  switch (typeof value) {
    case "number":
      return "Float64"
    case "bigint":
      return "Int64"
    case "boolean":
      return "Bool"
    default:
      return "String"
  }
}

/**
 * Creates a ClickHouse compiler with typed placeholders and escaped identifiers.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (transform?: (name: string) => string): Statement.Compiler =>
  Statement.makeCompiler<ClickhouseParam>({
    dialect: "clickhouse",
    placeholder: (i, value) => `{p${i}: ${typeFromUnknown(value)}}`,
    onIdentifier: (value, withoutTransform) => escape(transform && !withoutTransform ? transform(value) : value),
    onRecordUpdate: () => ["", []],
    onCustom: (type, placeholder) => [placeholder(type), [type.paramB]]
  })

const Row = Schema.Record(Schema.String, Schema.Unknown)
const envelope = {
  meta: Schema.Array(Schema.Struct({ name: Schema.String, type: Schema.String })),
  rows: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  statistics: Schema.optional(Schema.Record(Schema.String, Schema.Number))
}
const decodeRows = Schema.decodeUnknownEffect(Schema.Struct({ ...envelope, data: Schema.Array(Row) }))
const decodeValues = Schema.decodeUnknownEffect(
  Schema.Struct({ ...envelope, data: Schema.Array(Schema.Array(Schema.Unknown)) })
)
const decodeRow = Schema.decodeUnknownEffect(Schema.fromJsonString(Row))

/**
 * Creates a native ClickHouse HTTP client and verifies its ping endpoint.
 *
 * **Gotchas**
 *
 * Transactions fail with a typed `SqlError`; this HTTP client does not reserve
 * server sessions for experimental ClickHouse transactions.
 * Interruption aborts the HTTP request and attempts a bounded `KILL QUERY`.
 * The server may require additional permissions to cancel a query.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: ClickhouseClientConfig
  ): Effect.fn.Return<ClickhouseClient, SqlError, Scope.Scope | Reactivity.Reactivity | HttpClient.HttpClient> {
    const base = yield* Effect.try({
      try: () => {
        const url = new URL(options.url?.toString() ?? "http://localhost:8123")
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new TypeError("ClickHouse requires an HTTP URL")
        }
        if (url.username || url.password || url.hash) {
          throw new TypeError("Use username and password options for ClickHouse credentials")
        }
        return url
      },
      catch: (cause) => classify(cause, "Invalid ClickHouse URL", "connect")
    })
    const http = yield* HttpClient.HttpClient
    const auth = (request: HttpClientRequest.HttpClientRequest) => {
      request = HttpClientRequest.setHeaders(request, options.headers ?? {})
      return HttpClientRequest.basicAuth(request, options.username ?? "default", options.password ?? Redacted.make(""))
    }
    const executeHttp = (request: HttpClientRequest.HttpClientRequest, operation: string) => {
      const execute = http.execute(auth(request)).pipe(
        Effect.mapError((cause) =>
          new SqlError({ reason: new ConnectionError({ cause, message: "ClickHouse HTTP request failed", operation }) })
        )
      )
      return options.requestTimeout === undefined
        ? execute
        : execute.pipe(Effect.timeoutOrElse({
          duration: options.requestTimeout,
          orElse: () =>
            Effect.fail(
              new SqlError({
                reason: new StatementTimeoutError({
                  cause: new Error("ClickHouse request timeout"),
                  message: "ClickHouse request timeout",
                  operation
                })
              })
            )
        }))
    }
    const kill = (queryId: string) =>
      executeHttp(
        HttpClientRequest.post(base.toString()).pipe(
          HttpClientRequest.setUrlParams({ database: options.database ?? "default", param_queryId: queryId }),
          HttpClientRequest.bodyText("KILL QUERY WHERE query_id = {queryId:String} SYNC")
        ),
        "cancel"
      ).pipe(
        Effect.flatMap((response) => response.text),
        Effect.interruptible,
        Effect.timeoutOption("5 seconds"),
        Effect.ignore
      )
    const check = (response: HttpClientResponse.HttpClientResponse, operation: string) => {
      if (
        response.status >= 200 && response.status < 300 && response.headers["x-clickhouse-exception-code"] === undefined
      ) return Effect.succeed(response)
      return Effect.flatMap(
        response.text.pipe(Effect.orElseSucceed(() => "ClickHouse HTTP error")),
        (text) =>
          Effect.fail(
            classify(
              { message: text, code: response.headers["x-clickhouse-exception-code"] },
              text,
              operation,
              response.status
            )
          )
      )
    }
    const ping = new URL(base)
    ping.pathname = `${ping.pathname.replace(/\/$/, "")}/ping`
    yield* executeHttp(HttpClientRequest.get(ping.toString()), "connect").pipe(
      Effect.flatMap((response) => check(response, "connect")),
      Effect.flatMap((response) => response.text),
      Effect.mapError((cause) =>
        cause instanceof SqlError ? cause : classify(cause, "Failed to ping ClickHouse", "connect")
      ),
      Effect.timeoutOrElse({
        duration: "5 seconds",
        orElse: () =>
          Effect.fail(classify(new Error("ClickHouse connection timeout"), "ClickHouse connection timeout", "connect"))
      })
    )
    const request = (
      sql: string,
      params: ReadonlyArray<unknown>,
      format?: string,
      body?: Stream.Stream<Uint8Array, SqlError>
    ) =>
      Effect.gen(function*() {
        const queryId = (yield* QueryId) ?? globalThis.crypto.randomUUID()
        const settings = { ...options.clickhouseSettings, ...(yield* ClickhouseSettings) }
        const urlParams: Record<string, string> = {
          database: options.database ?? "default",
          query_id: queryId,
          wait_end_of_query: format === "JSONEachRow" ? "0" : "1"
        }
        for (const [key, value] of Object.entries(settings)) urlParams[key] = String(value)
        const encoded = yield* Effect.try({
          try: () => params.map((value) => paramValue(value)),
          catch: (cause) => classify(cause, "Failed to encode ClickHouse parameter", "encode")
        })
        for (let i = 0; i < encoded.length; i++) urlParams[`param_p${i + 1}`] = encoded[i]
        if (format) urlParams.default_format = format
        let req = HttpClientRequest.post(base.toString()).pipe(HttpClientRequest.setUrlParams(urlParams))
        req = body === undefined
          ? HttpClientRequest.bodyText(req, sql)
          : req.pipe(HttpClientRequest.appendUrlParam("query", sql), HttpClientRequest.bodyStream(body))
        const response = yield* executeHttp(req, "execute").pipe(
          Effect.flatMap((response) => check(response, "execute")),
          Effect.onInterrupt(() => kill(queryId))
        )
        return { response, query_id: response.headers["x-clickhouse-query-id"] ?? queryId, cancel: kill(queryId) }
      })
    const raw = (sql: string, params: ReadonlyArray<unknown>, format = "JSON"): Effect.Effect<any, SqlError> =>
      Effect.gen(function*() {
        const command = (yield* ClientMethod) === "command"
        const result = yield* request(sql, params, command ? undefined : format)
        return yield* Effect.gen(function*() {
          if (command) {
            yield* result.response.text.pipe(
              Effect.mapError((cause) => classify(cause, "Failed to read command response", "parseResult"))
            )
            return { query_id: result.query_id, executed: true }
          }
          const decodeResult = format === "JSONCompact"
            ? (body: unknown) =>
              Effect.map(decodeValues(body), (result) => ({ ...result, data: result.data as ReadonlyArray<unknown> }))
            : (body: unknown) =>
              Effect.map(decodeRows(body), (result) => ({ ...result, data: result.data as ReadonlyArray<unknown> }))
          const data = yield* result.response.json.pipe(
            Effect.flatMap(decodeResult),
            Effect.mapError((cause) => classify(cause, "Failed to parse ClickHouse result", "parseResult"))
          )
          return { ...data, query_id: result.query_id }
        }).pipe(Effect.onInterrupt(() => result.cancel))
      })
    const execute: Connection["execute"] = (sql, params, transform) =>
      Effect.map(raw(sql, params), (result) => transform ? transform(result.data ?? []) : result.data ?? [])
    const values: Connection["executeValues"] = (sql, params) =>
      Effect.map(raw(sql, params, "JSONCompact"), (result) => result.data ?? [])
    const connection: Connection = {
      execute,
      executeRaw: raw,
      executeUnprepared: execute,
      executeValues: values,
      executeValuesUnprepared: values,
      executeStream: (sql, params, transform) =>
        Stream.unwrap(Effect.map(request(sql, params, "JSONEachRow"), ({ response, cancel }) => {
          let completed = false
          return response.stream.pipe(
            Stream.mapError((cause) => classify(cause, "Failed to read ClickHouse stream", "stream")),
            Stream.decodeText(),
            Stream.splitLines,
            Stream.filter((line) => line.trim().length > 0),
            Stream.mapEffect((line) =>
              decodeRow(line).pipe(
                Effect.mapError((cause) =>
                  classify({ message: line, cause }, "Failed to parse ClickHouse row", "parseRow")
                )
              )
            ),
            Stream.map((row) => transform ? transform([row])[0] : row),
            Stream.concat(Stream.drain(Stream.fromEffect(Effect.sync(() => {
              completed = true
            })))),
            Stream.ensuring(Effect.suspend(() => completed ? Effect.void : cancel))
          )
        }))
    }
    const client = yield* Client.make({
      acquirer: Effect.succeed(connection),
      transactionAcquirer: Effect.fail(
        classify(
          new Error("ClickHouse HTTP transactions are unsupported"),
          "ClickHouse HTTP transactions are unsupported",
          "beginTransaction"
        )
      ),
      compiler: makeCompiler(options.transformQueryNames),
      beginTransaction: "BEGIN TRANSACTION",
      spanAttributes: [...Object.entries(options.spanAttributes ?? {}), ["db.system.name", "clickhouse"], [
        "db.namespace",
        options.database ?? "default"
      ]],
      transformRows: options.transformResultNames
        ? Statement.defaultTransforms(options.transformResultNames).array
        : undefined
    })
    const insertQuery: ClickhouseClient["insertQuery"] = (insert) =>
      Effect.gen(function*() {
        if (Array.isArray(insert.values) && insert.values.length === 0) return { query_id: "", executed: false }
        const format = insert.format ?? "JSONEachRow"
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(format)) {
          return yield* Effect.fail(classify(format, "Invalid ClickHouse insert format", "insert"))
        }
        if (Array.isArray(insert.values) && format !== "JSONEachRow") {
          return yield* Effect.fail(
            classify(
              format,
              "Object inserts require JSONEachRow; provide an encoded byte stream for other formats",
              "insert"
            )
          )
        }
        const body = Stream.isStream(insert.values)
          ? insert.values
          : Stream.fromArray(insert.values as ReadonlyArray<Record<string, unknown>>).pipe(Stream.mapEffect((row) =>
            Effect.try({
              try: () => new TextEncoder().encode(JSON.stringify(row) + "\n"),
              catch: (cause) => classify(cause, "Failed to encode ClickHouse insert", "insert")
            })
          ))
        const columns = insert.columns ? ` (${insert.columns.map(escape).join(", ")})` : ""
        const result = yield* request(
          `INSERT INTO ${escape(insert.table)}${columns} FORMAT ${format}`,
          [],
          undefined,
          body
        )
        yield* result.response.text.pipe(
          Effect.mapError((cause) =>
            classify(cause, "Failed to read insert response", "insert")
          ),
          Effect.onInterrupt(() => result.cancel)
        )
        return { query_id: result.query_id, executed: true }
      })
    return Object.assign(client, {
      [TypeId]: TypeId,
      config: options,
      param: (dataType: string, value: unknown) => Statement.fragment([clickhouseParam(dataType, value)]),
      asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provideService(effect, ClientMethod, "command"),
      insertQuery,
      withQueryId: dual(
        2,
        <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) => Effect.provideService(effect, QueryId, queryId)
      ),
      withClickhouseSettings: dual(
        2,
        <A, E, R>(effect: Effect.Effect<A, E, R>, settings: Settings) =>
          Effect.provideService(effect, ClickhouseSettings, settings)
      )
    })
  }
)

/**
 * Provides native ClickHouse and shared SQL client services from an acquisition effect.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<ClickhouseClient, E, R>
): Layer.Layer<ClickhouseClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) => Context.make(ClickhouseClient, client).pipe(Context.add(Client.SqlClient, client)))
  ).pipe(Layer.provide(Reactivity.layer)) as any

/**
 * Creates a native ClickHouse HTTP client layer.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: ClickhouseClientConfig
): Layer.Layer<ClickhouseClient | Client.SqlClient, SqlError, HttpClient.HttpClient> => layerFrom(make(options))

/**
 * Creates a native ClickHouse client layer from configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<ClickhouseClientConfig>
): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError, HttpClient.HttpClient> =>
  layerFrom(Effect.flatMap(Config.unwrap(options), make))
