/**
 * Runtime-neutral core shared by the Node and web ClickHouse clients.
 *
 * Everything here is written against the small `Adapter` contract, never
 * against a concrete `@clickhouse/client*` package, so that the web entry can
 * reuse it without pulling the Node client (and its Node built-ins) into its
 * import graph. It imports nothing from the ClickHouse packages: they each
 * bundle their own copy of the shared types, which TypeScript treats as
 * unrelated (`SettingsMap` has a private field), so the settings type is a
 * parameter that each runtime entry fills in with its own.
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Reactivity from "effect/reactivity/Reactivity"
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

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"

export type DataFormat = "JSON" | "JSONCompact" | "JSONEachRow"

export interface CoreConfig {
  readonly database?: string | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

export interface QueryRequest<S> {
  readonly query: string
  readonly query_params: Record<string, unknown>
  readonly abort_signal: AbortSignal
  readonly query_id: string
  readonly clickhouse_settings: S
  readonly format: DataFormat
}

export interface CommandRequest<S> {
  readonly query: string
  readonly query_params: Record<string, unknown>
  readonly abort_signal?: AbortSignal
  readonly query_id?: string
  readonly clickhouse_settings?: S
}

export interface Row {
  readonly json: () => object | Promise<object>
}

export interface QueryResultLike {
  readonly json: () => Promise<unknown>
}

export type PingResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: unknown }

/**
 * The part of a ClickHouse client the SQL driver depends on. Each runtime
 * entry adapts its own `@clickhouse/client*` instance to this shape; `stream`
 * is the only place the response body type (Node `Readable` or web
 * `ReadableStream`) is visible.
 */
export interface Adapter<R extends QueryResultLike, S> {
  readonly ping: () => Promise<PingResult>
  readonly close: () => Promise<void>
  readonly query: (request: QueryRequest<S>) => Promise<R>
  readonly command: (request: CommandRequest<S>) => Promise<object>
  readonly stream: (result: R) => Stream.Stream<ReadonlyArray<Row>, SqlError>
}

export interface Backend<C, R extends QueryResultLike, S> {
  readonly client: C
  readonly adapter: Adapter<R, S>
  /** The runtime entry's typed reference for the `ClickhouseSettings` key. */
  readonly settings: Context.Reference<S>
}

export const ClientMethod = Context.Reference<"query" | "command" | "insert">(
  "@effect/sql-clickhouse/ClickhouseClient/ClientMethod",
  {
    defaultValue: () => "query"
  }
)

export const QueryId = Context.Reference<string | undefined>(
  "@effect/sql-clickhouse/ClickhouseClient/QueryId",
  { defaultValue: () => undefined }
)

/**
 * What a request needs from a backend: a way to kill the query on the server
 * and the typed settings reference.
 */
export interface Runner<S> {
  readonly adapter: Pick<Adapter<never, S>, "command">
  readonly settings: Context.Reference<S>
}

/**
 * Key of the settings reference. Each runtime entry declares its own typed
 * `Context.Reference` for it, so settings provided through one entry reach the
 * same requests as settings provided through another.
 */
export const ClickhouseSettingsKey = "@effect/sql-clickhouse/ClickhouseClient/ClickhouseSettings"

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

export const classifyError = (
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

export const killQuery = <S>(adapter: Runner<S>["adapter"], queryId: string) =>
  Effect.promise(() =>
    adapter.command({
      query: "KILL QUERY WHERE query_id = {queryId:String}",
      query_params: { queryId }
    })
  )

export const newQueryId = (): string => globalThis.crypto.randomUUID()

/**
 * Runs one request with the fiber's query id and ClickHouse settings. On
 * interruption the HTTP request is aborted and the query is killed on the
 * server, since closing the connection does not stop a query that is still
 * being computed.
 */
export const runAbortable = <A, S>(
  backend: Runner<S>,
  options: { readonly message: string; readonly operation: string },
  request: (base: {
    readonly abort_signal: AbortSignal
    readonly query_id: string
    readonly clickhouse_settings: S
  }) => Promise<A>
): Effect.Effect<A, SqlError> =>
  Effect.withFiber<A, SqlError>((fiber) =>
    Effect.callback<A, SqlError>((resume) => {
      const queryId = fiber.getRef(QueryId) ?? newQueryId()
      const controller = new AbortController()
      request({
        abort_signal: controller.signal,
        query_id: queryId,
        clickhouse_settings: fiber.getRef(backend.settings)
      }).then(
        (result) => resume(Effect.succeed(result)),
        (cause) =>
          resume(Effect.fail(new SqlError({ reason: classifyError(cause, options.message, options.operation) })))
      )
      return Effect.suspend(() => {
        controller.abort()
        return killQuery(backend.adapter, queryId)
      })
    })
  )

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
        return "DateTime"
      }
      return "String"
    default:
      return "String"
  }
}

const escape = Statement.defaultEscape("\"")

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

export type ClickhouseCustom = ClickhouseParam

interface ClickhouseParam extends Statement.Custom<"ClickhouseParam", string, unknown> {}

const clickhouseParam = Statement.custom<ClickhouseParam>("ClickhouseParam")
const isClickhouseParam = Statement.isCustom<ClickhouseParam>("ClickhouseParam")

export const param = (dataType: string, value: unknown): Statement.Fragment =>
  Statement.fragment([clickhouseParam(dataType, value)])

const dataOf = <A>(body: unknown): ReadonlyArray<A> =>
  // The caller picks the format, so the element type cannot be derived from `body`.
  (typeof body === "object" && body !== null && "data" in body ? body.data : body) as ReadonlyArray<A>

const isResultWith = <R extends QueryResultLike>(raw: R | object, key: "json" | "stream"): raw is R => key in raw

class ConnectionImpl<R extends QueryResultLike, S> implements Connection {
  private readonly backend: Pick<Backend<unknown, R, S>, "adapter" | "settings">
  constructor(backend: Pick<Backend<unknown, R, S>, "adapter" | "settings">) {
    this.backend = backend
  }

  private runRaw(sql: string, params: ReadonlyArray<unknown>, format: DataFormat = "JSON") {
    const paramsObj: Record<string, unknown> = {}
    for (let i = 0; i < params.length; i++) {
      paramsObj[`p${i + 1}`] = params[i]
    }
    return Effect.withFiber<R | object, SqlError>((fiber) => {
      const method = fiber.getRef(ClientMethod)
      return runAbortable<R | object, S>(
        this.backend,
        { message: "Failed to execute statement", operation: "execute" },
        (base) =>
          method === "command"
            ? this.backend.adapter.command({ query: sql, query_params: paramsObj, ...base })
            : this.backend.adapter.query({ query: sql, query_params: paramsObj, ...base, format })
      )
    })
  }

  private run<A>(sql: string, params: ReadonlyArray<unknown>, format?: DataFormat) {
    return this.runRaw(sql, params, format).pipe(
      Effect.flatMap((result): Effect.Effect<ReadonlyArray<A>, SqlError> => {
        if (isResultWith(result, "json")) {
          return Effect.tryPromise({
            // The row shape depends on the format the caller asked for: `JSON`
            // wraps rows in `{ data }`, `JSONCompact` rows are arrays.
            try: () => result.json().then((body) => dataOf<A>(body)),
            catch: (cause) => new SqlError({ reason: classifyError(cause, "Failed to parse result", "parseResult") })
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
      ? Effect.map(this.run<object>(sql, params), transformRows)
      : this.run<object>(sql, params)
  }
  executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return this.runRaw(sql, params)
  }
  executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return this.run<ReadonlyArray<unknown>>(sql, params, "JSONCompact")
  }
  executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
    return this.executeValues(sql, params)
  }
  executeUnprepared(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    return this.execute(sql, params, transformRows)
  }
  executeStream(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const adapter = this.backend.adapter
    return Effect.withFiber((fiber) => {
      const queryId = fiber.getRef(QueryId) ?? newQueryId()
      return this.runRaw(sql, params, "JSONEachRow").pipe(
        Effect.provideService(QueryId, queryId),
        Effect.map((result) => {
          if (!isResultWith(result, "stream")) {
            return Stream.empty
          }
          // Closing the socket does not stop a query the server is still
          // computing, so kill it unless the response was read to the end.
          let done = false
          return adapter.stream(result).pipe(
            Stream.onEnd(Effect.sync(() => {
              done = true
            })),
            Stream.ensuring(Effect.suspend(() => done ? Effect.void : Effect.ignoreCause(killQuery(adapter, queryId))))
          )
        })
      )
    }).pipe(
      Stream.unwrap,
      Stream.chunks,
      Stream.mapEffect((chunk) => {
        const promises: Array<Promise<object>> = []
        for (const rows of chunk) {
          for (const row of rows) {
            promises.push(Promise.resolve(row.json()))
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
}

/**
 * Creates the backend client for `options`, verifies connectivity with a ping
 * (5 second limit), and builds the generic `SqlClient` over it. The backend
 * client is closed when the scope ends.
 */
export const make = <Config extends CoreConfig, C, R extends QueryResultLike, S>(
  options: Config,
  create: (options: Config) => Backend<C, R, S>
): Effect.Effect<
  { readonly sql: Client.SqlClient; readonly backend: Backend<C, R, S> },
  SqlError,
  Scope.Scope | Reactivity.Reactivity
> =>
  Effect.gen(function*() {
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined

    const backend = yield* Effect.acquireRelease(
      Effect.sync(() => create(options)),
      ({ adapter }) => Effect.promise(() => adapter.close())
    )

    yield* Effect.tryPromise({
      try: async () => {
        const result = await backend.adapter.ping()
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

    const sql = yield* Client.make({
      driver: "clickhouse",
      acquirer: Effect.succeed(new ConnectionImpl(backend)),
      compiler,
      spanAttributes: [
        ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
        [ATTR_DB_SYSTEM_NAME, "clickhouse"],
        [ATTR_DB_NAMESPACE, options.database ?? "default"]
      ],
      beginTransaction: "BEGIN TRANSACTION",
      transformRows
    })

    return { sql, backend }
  })
