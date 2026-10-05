/**
 * Native remote libSQL client using the Hrana HTTP pipeline protocol.
 *
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Base64 from "../encoding/Base64.ts"
import * as Exit from "../Exit.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as Reactivity from "../reactivity/Reactivity.ts"
import type * as Redacted from "../Redacted.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Client from "../sql/SqlClient.ts"
import type { Connection } from "../sql/SqlConnection.ts"
import {
  AuthenticationError,
  AuthorizationError,
  classifySqliteError,
  ConnectionError,
  SqlError,
  SqlSyntaxError,
  UnknownError
} from "../sql/SqlError.ts"
import * as Statement from "../sql/Statement.ts"
import * as Stream from "../Stream.ts"

/**
 * Runtime identifier for native libSQL clients.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/libsql/LibsqlClient" as const

/**
 * Remote libSQL client with the shared SQL statement and transaction interface.
 *
 * @category services
 * @since 4.0.0
 */
export interface LibsqlClient extends Client.SqlClient {
  readonly [TypeId]: typeof TypeId
  readonly config: LibsqlClientConfig
}

/**
 * Service for the native remote libSQL client.
 *
 * @category services
 * @since 4.0.0
 */
export const LibsqlClient = Context.Service<LibsqlClient>("effect/libsql/LibsqlClient")

/**
 * HTTP connection and value conversion settings for remote libSQL databases.
 *
 * **Gotchas**
 *
 * Only `libsql:`, `https:` and `http:` URLs are supported. Local files,
 * embedded replicas and WebSocket transports require a platform engine.
 *
 * @category models
 * @since 4.0.0
 */
export interface LibsqlClientConfig {
  readonly url: string | URL
  readonly authToken?: Redacted.Redacted | undefined
  readonly tls?: boolean | undefined
  readonly intMode?: "number" | "bigint" | "string" | undefined
  readonly protocolVersion?: 2 | 3 | undefined
  readonly concurrency?: number | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((name: string) => string) | undefined
  readonly transformQueryNames?: ((name: string) => string) | undefined
}

/**
 * Decoded Hrana statement result, including ordered values and affected rows.
 *
 * @category models
 * @since 4.0.0
 */
export interface ResultSet {
  readonly columns: ReadonlyArray<string>
  readonly columnTypes: ReadonlyArray<string>
  readonly rows: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly values: ReadonlyArray<ReadonlyArray<unknown>>
  readonly rowsAffected: number
  readonly lastInsertRowid: bigint | undefined
}

const Value = Schema.Union([
  Schema.Struct({ type: Schema.Literal("null") }),
  Schema.Struct({ type: Schema.Literal("integer"), value: Schema.String.check(Schema.isPattern(/^-?\d+$/)) }),
  Schema.Struct({ type: Schema.Literal("float"), value: Schema.Number }),
  Schema.Struct({ type: Schema.Literal("text"), value: Schema.String }),
  Schema.Struct({ type: Schema.Literal("blob"), base64: Schema.String })
])
type Value = typeof Value.Type

const StatementResult = Schema.Struct({
  cols: Schema.Array(Schema.Struct({ name: Schema.String, decltype: Schema.optional(Schema.NullOr(Schema.String)) })),
  rows: Schema.Array(Schema.Array(Value)),
  affected_row_count: Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
  ),
  last_insert_rowid: Schema.optional(Schema.NullOr(Schema.String.check(Schema.isPattern(/^-?\d+$/))))
})
const PipelineResult = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("error"),
    error: Schema.Struct({ message: Schema.String, code: Schema.optional(Schema.String) })
  }),
  Schema.Struct({
    type: Schema.Literal("ok"),
    response: Schema.Union([
      Schema.Struct({ type: Schema.Literal("execute"), result: StatementResult }),
      Schema.Struct({ type: Schema.Literal("close") })
    ])
  })
])
const decodePipeline = Schema.decodeUnknownEffect(Schema.Struct({
  baton: Schema.NullOr(Schema.String),
  base_url: Schema.optional(Schema.NullOr(Schema.String)),
  results: Schema.Array(Schema.Unknown)
}))
const decodePipelineResult = Schema.decodeUnknownEffect(PipelineResult)

const failure = (cause: unknown, operation = "execute"): SqlError => {
  const props = {
    cause,
    message: Predicate.hasProperty(cause, "message") ? String(cause.message) : String(cause),
    operation
  }
  return new SqlError({
    reason: Predicate.hasProperty(cause, "code") && cause.code === "SQL_PARSE_ERROR"
      ? new SqlSyntaxError(props)
      : classifySqliteError(cause, props)
  })
}

const protocolError = (message: string) =>
  new SqlError({ reason: new UnknownError({ cause: new Error(message), message, operation: "protocol" }) })

const encode = (value: unknown): Value => {
  if (value === null || value === undefined) return { type: "null" }
  if (typeof value === "string") return { type: "text", value }
  if (typeof value === "boolean") return { type: "integer", value: value ? "1" : "0" }
  if (typeof value === "bigint") {
    if (value < BigInt("-9223372036854775808") || value > BigInt("9223372036854775807")) {
      throw new RangeError("libSQL integers must fit in signed 64 bits")
    }
    return { type: "integer", value: String(value) }
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError("libSQL numbers must be finite")
    if (Number.isInteger(value)) {
      if (!Number.isSafeInteger(value)) throw new RangeError("Use bigint for integers outside the safe number range")
      return { type: "integer", value: String(value) }
    }
    return { type: "float", value }
  }
  if (value instanceof Date) return encode(value.getTime())
  if (value instanceof ArrayBuffer) return { type: "blob", base64: Base64.encode(new Uint8Array(value)) }
  if (ArrayBuffer.isView(value)) {
    return { type: "blob", base64: Base64.encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) }
  }
  throw new TypeError("Unsupported libSQL parameter; use null, string, number, bigint, boolean, Date or binary data")
}

const decode = (value: Value, intMode: NonNullable<LibsqlClientConfig["intMode"]>): unknown => {
  switch (value.type) {
    case "null":
      return null
    case "text":
      return value.value
    case "float":
      return value.value
    case "integer": {
      const integer = BigInt(value.value)
      if (integer < BigInt("-9223372036854775808") || integer > BigInt("9223372036854775807")) {
        throw new RangeError("Hrana integer outside signed 64-bit range")
      }
      if (intMode === "bigint") return integer
      if (intMode === "string") return value.value
      const number = Number(integer)
      if (!Number.isSafeInteger(number)) {
        throw new RangeError("libSQL integer exceeds the safe number range; configure intMode")
      }
      return number
    }
    case "blob": {
      const decoded = Base64.decode(value.base64)
      if (Result.isFailure(decoded)) throw decoded.failure
      return decoded.success
    }
  }
}

/**
 * Creates a native HTTP libSQL client with scoped pipeline sessions and savepoints.
 *
 * **Details**
 *
 * Each reserved connection has its own server baton. Transactions retain that
 * connection until commit or rollback, and scope closure closes the remote stream.
 * Query streams emit the rows of a buffered HTTP statement result.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: LibsqlClientConfig
  ): Effect.fn.Return<LibsqlClient, SqlError, Scope.Scope | Reactivity.Reactivity | HttpClient.HttpClient> {
    const base = yield* Effect.try({
      try: () => {
        const input = options.url.toString()
        const url = new URL(
          input.startsWith("libsql:") ? input.replace(/^libsql:/, options.tls === false ? "http:" : "https:") : input
        )
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new TypeError(
            "Native libSQL supports remote HTTP URLs only; use a platform SQLite engine for local files"
          )
        }
        if (url.username || url.password || url.hash) {
          throw new TypeError("libSQL URLs cannot contain credentials or fragments")
        }
        if (options.concurrency !== undefined && (!Number.isInteger(options.concurrency) || options.concurrency < 0)) {
          throw new RangeError("libSQL concurrency must be a non-negative integer")
        }
        if (options.protocolVersion !== undefined && options.protocolVersion !== 2 && options.protocolVersion !== 3) {
          throw new RangeError("libSQL protocolVersion must be 2 or 3")
        }
        if (options.intMode !== undefined && !["number", "bigint", "string"].includes(options.intMode)) {
          throw new RangeError("Invalid libSQL intMode")
        }
        url.pathname = `${url.pathname.replace(/\/$/, "")}/v${options.protocolVersion ?? 2}/pipeline`
        return url
      },
      catch: (cause) => failure(cause, "connect")
    })
    const http = yield* HttpClient.HttpClient
    let open = true
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        open = false
      })
    )
    const permits = yield* Semaphore.make(
      options.concurrency === 0 ? Number.MAX_SAFE_INTEGER : options.concurrency ?? 20
    )
    const acquirer = Effect.gen(function*() {
      if (!open) return yield* Effect.fail(protocolError("libSQL client is closed"))
      const serial = yield* Semaphore.make(1)
      let baton: string | null = null
      let endpoint = base.toString()
      let closed = false
      const pipeline = (requests: ReadonlyArray<unknown>, closing = false) =>
        permits.withPermits(1)(Effect.suspend(() => {
          if (!closing && (!open || closed)) return Effect.fail(protocolError("libSQL connection is closed"))
          let dispatched = false
          let confirmed = false
          return Effect.gen(function*() {
            let request = HttpClientRequest.post(endpoint).pipe(HttpClientRequest.bodyJsonUnsafe({ baton, requests }))
            if (options.authToken !== undefined) request = HttpClientRequest.bearerToken(request, options.authToken)
            dispatched = true
            const response = yield* http.execute(request).pipe(Effect.mapError((cause) =>
              new SqlError({
                reason: new ConnectionError({ cause, message: "libSQL HTTP request failed", operation: "execute" })
              })
            ))
            if (response.status < 200 || response.status >= 300) {
              const message = yield* response.text.pipe(Effect.orElseSucceed(() => "libSQL HTTP request failed"))
              const props = { cause: { status: response.status, message }, message, operation: "execute" }
              return yield* Effect.fail(
                new SqlError({
                  reason: response.status === 401
                    ? new AuthenticationError(props)
                    : response.status === 403
                    ? new AuthorizationError(props)
                    : response.status >= 500
                    ? new ConnectionError(props)
                    : new UnknownError(props)
                })
              )
            }
            const data = yield* response.json.pipe(
              Effect.flatMap(decodePipeline),
              Effect.mapError((cause) => failure(cause, "parseResult"))
            )
            baton = data.baton
            if (data.base_url !== undefined && data.base_url !== null) {
              const target = yield* Effect.try({
                try: () => new URL(data.base_url!),
                catch: () => protocolError("Invalid Hrana base URL")
              })
              if (target.origin !== base.origin || target.username || target.password) {
                return yield* Effect.fail(protocolError("Hrana base URL must preserve the server origin"))
              }
              target.pathname = `${target.pathname.replace(/\/$/, "")}/v${options.protocolVersion ?? 2}/pipeline`
              endpoint = target.toString()
            }
            if (data.results.length !== requests.length) {
              return yield* Effect.fail(protocolError("Hrana pipeline result count mismatch"))
            }
            const results = yield* Effect.forEach(
              data.results,
              (result) => decodePipelineResult(result).pipe(Effect.mapError((cause) => failure(cause, "parseResult")))
            )
            confirmed = true
            if (baton === null) closed = true
            return results
          }).pipe(Effect.onExit((exit) =>
            Exit.isFailure(exit) && dispatched && !confirmed
              ? Effect.sync(() => {
                closed = true
              })
              : Effect.void
          ))
        }))
      const run = (sql: string, params: ReadonlyArray<unknown>): Effect.Effect<ResultSet, SqlError> =>
        Effect.suspend(() => {
          if (!open || closed) return Effect.fail(protocolError("libSQL connection is closed"))
          return serial.withPermits(1)(Effect.gen(function*() {
            if (!open || closed) return yield* Effect.fail(protocolError("libSQL connection is closed"))
            const args = yield* Effect.try({
              try: () => params.map(encode),
              catch: (cause) => failure(cause, "encode")
            })
            const results = yield* pipeline([{ type: "execute", stmt: { sql, args, want_rows: true } }])
            const result = results[0]
            if (result.type === "error") return yield* Effect.fail(failure(result.error))
            if (result.response.type !== "execute") {
              return yield* Effect.fail(protocolError("Invalid Hrana execute response"))
            }
            const raw = result.response.result
            return yield* Effect.try({
              try: () => {
                const columns = raw.cols.map((col) => col.name)
                const values = raw.rows.map((row) => {
                  if (row.length !== columns.length) {
                    throw new TypeError("Invalid Hrana row width")
                  }
                  return row.map((value) => decode(value, options.intMode ?? "number"))
                })
                return {
                  columns,
                  columnTypes: raw.cols.map((col) => col.decltype ?? ""),
                  values,
                  rows: values.map((row) =>
                    Object.fromEntries(columns.map((column: string, i: number) => [column, row[i]]))
                  ),
                  rowsAffected: raw.affected_row_count,
                  lastInsertRowid: raw.last_insert_rowid == null
                    ? undefined
                    : decode({ type: "integer", value: raw.last_insert_rowid }, "bigint") as bigint
                }
              },
              catch: (cause) => failure(cause, "parseResult")
            })
          }))
        })
      const execute: Connection["execute"] = (sql, params, transform) =>
        Effect.map(run(sql, params), (result) => transform ? transform(result.rows) : result.rows)
      const values: Connection["executeValues"] = (sql, params) =>
        Effect.map(run(sql, params), (result) => result.values)
      const connection: Connection = {
        execute,
        executeRaw: run,
        executeUnprepared: execute,
        executeValues: values,
        executeValuesUnprepared: values,
        executeStream: (sql, params, transform) => Stream.fromIterableEffect(execute(sql, params, transform))
      }
      yield* Effect.addFinalizer(() =>
        Effect.gen(function*() {
          closed = true
          yield* serial.withPermits(1)(
            Effect.suspend(() => baton === null ? Effect.void : pipeline([{ type: "close" }], true))
          )
        }).pipe(Effect.interruptible, Effect.timeoutOption("5 seconds"), Effect.ignore)
      )
      return connection
    })
    const client = yield* Client.make({
      acquirer,
      compiler: Statement.makeCompilerSqlite(options.transformQueryNames),
      beginTransaction: "BEGIN IMMEDIATE",
      releaseSavepoint: (name) => `RELEASE SAVEPOINT ${name}`,
      onCommitFailure: (connection) => Effect.asVoid(connection.executeUnprepared("ROLLBACK", [], undefined)),
      spanAttributes: [...Object.entries(options.spanAttributes ?? {}), ["db.system.name", "sqlite"]],
      transformRows: options.transformResultNames
        ? Statement.defaultTransforms(options.transformResultNames).array
        : undefined
    })
    return Object.assign(client, { [TypeId]: TypeId, config: options })
  }
)

/**
 * Provides the native libSQL and shared SQL client services from an acquisition effect.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<LibsqlClient, E, R>
): Layer.Layer<LibsqlClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) => Context.make(LibsqlClient, client).pipe(Context.add(Client.SqlClient, client)))
  ).pipe(Layer.provide(Reactivity.layer)) as any

/**
 * Creates a native remote libSQL client layer.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: LibsqlClientConfig
): Layer.Layer<LibsqlClient | Client.SqlClient, SqlError, HttpClient.HttpClient> => layerFrom(make(options))

/**
 * Creates a native remote libSQL client layer from configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<LibsqlClientConfig>
): Layer.Layer<LibsqlClient | Client.SqlClient, Config.ConfigError | SqlError, HttpClient.HttpClient> =>
  layerFrom(Effect.flatMap(Config.unwrap(options), make))
