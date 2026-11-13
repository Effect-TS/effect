/**
 * Behaviour shared by `ClickhouseClient` and `ClickhouseWebClient`. Each
 * entry passes in its driver client and a way to read a result body as a
 * stream. This module must not import either driver, so that the web entry
 * stays free of Node built-ins.
 */
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

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"

type DataFormat = "JSON" | "JSONCompact" | "JSONEachRow"

// Opaque here: each entry types settings with its own driver's type.
type Settings = Record<string, any>

interface RequestBase {
  readonly abort_signal?: AbortSignal
  readonly query_id?: string
  readonly clickhouse_settings?: Settings
}

interface Request extends RequestBase {
  readonly query: string
  readonly query_params: Record<string, unknown>
}

interface ResultSet {
  json(): Promise<unknown>
  stream(): unknown
  close(): unknown
}

/**
 * The methods both `@clickhouse/client` and `@clickhouse/client-web` clients
 * provide. The drivers' own types are not assignable to each other, so the
 * parameters here are only as specific as the core needs.
 */
export interface Driver {
  ping(): Promise<{ readonly success: boolean; readonly error?: unknown }>
  close(): Promise<void>
  query(params: Request & { readonly format: DataFormat }): Promise<ResultSet>
  command(params: Request): Promise<unknown>
  // The values type is checked by each entry's `insertQuery` signature.
  insert(
    params: RequestBase & { readonly table: string; readonly values: any; readonly format: "JSONEachRow" }
  ): Promise<unknown>
}

/**
 * Reads a result body as a stream of row batches. `evaluate` returns the
 * driver's stream: a Node `Readable` or a web `ReadableStream`.
 */
export type FromStream = (
  evaluate: () => unknown,
  onError: (cause: unknown) => SqlError
) => Stream.Stream<ReadonlyArray<{ json(): unknown }>, SqlError>

export const ClientMethod = Context.Reference<"query" | "command" | "insert">(
  "@effect/sql-clickhouse/ClickhouseClient/ClientMethod",
  { defaultValue: () => "query" }
)

export const QueryId = Context.Reference<string | undefined>(
  "@effect/sql-clickhouse/ClickhouseClient/QueryId",
  { defaultValue: () => undefined }
)

export const ClickhouseSettings = Context.Reference<Settings>(
  "@effect/sql-clickhouse/ClickhouseClient/ClickhouseSettings",
  { defaultValue: () => ({}) }
)

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

// Cancellation is best effort: a kill that fails or does not answer in time
// must not turn an interruption into a defect or hold it up, and a kill that
// times out is aborted rather than left running.
const killQuery = (client: Driver, queryId: string) =>
  Effect.promise((signal) =>
    client.command({
      query: "KILL QUERY WHERE query_id = {queryId:String}",
      query_params: { queryId },
      abort_signal: signal
    })
  ).pipe(
    Effect.timeoutOption(Duration.seconds(5)),
    Effect.ignoreCause
  )

const newQueryId = (): string => globalThis.crypto.randomUUID()

/**
 * Runs one request with the fiber's query id and settings, then `read`s its
 * result. On interruption the HTTP request is aborted and the query is killed
 * on the server, since closing the connection does not stop a query that is
 * still being computed. A result being read is closed first: the Node driver
 * stops listening to the abort signal once headers arrive, and the open
 * response would otherwise hold the connection the kill needs.
 */
const runAbortable = <R, A = R>(
  client: Driver,
  message: string,
  operation: string,
  request: (base: {
    readonly abort_signal: AbortSignal
    readonly query_id: string
    readonly clickhouse_settings: Settings
  }) => Promise<R>,
  read: (result: R) => A | Promise<A> = (result) => result as unknown as A
): Effect.Effect<A, SqlError> =>
  Effect.withFiber((fiber) =>
    Effect.callback<A, SqlError>((resume) => {
      const queryId = fiber.getRef(QueryId) ?? newQueryId()
      const controller = new AbortController()
      let reading: R | undefined
      request({
        abort_signal: controller.signal,
        query_id: queryId,
        clickhouse_settings: fiber.getRef(ClickhouseSettings)
      }).then((result) => read(reading = result)).then(
        (result) => resume(Effect.succeed(result)),
        (cause) =>
          resume(Effect.fail(
            cause instanceof SqlError ? cause : new SqlError({ reason: classifyError(cause, message, operation) })
          ))
      )
      return Effect.suspend(() => {
        controller.abort()
        if (isResultSet(reading, "close")) {
          // The web driver's `close` rejects while a reader holds the body, which the abort already ends.
          Promise.resolve(reading.close()).catch(() => {})
        }
        return killQuery(client, queryId)
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

// Commands resolve to a summary without a body.
const isResultSet = (result: unknown, method: keyof ResultSet): result is ResultSet =>
  typeof result === "object" && result !== null && method in result

class ConnectionImpl implements Connection {
  private readonly client: Driver
  private readonly fromStream: FromStream
  constructor(client: Driver, fromStream: FromStream) {
    this.client = client
    this.fromStream = fromStream
  }

  private runRaw<A = unknown>(
    sql: string,
    params: ReadonlyArray<unknown>,
    format: DataFormat = "JSON",
    read?: (result: unknown) => A | Promise<A>
  ) {
    const query_params: Record<string, unknown> = {}
    for (let i = 0; i < params.length; i++) {
      query_params[`p${i + 1}`] = params[i]
    }
    return Effect.withFiber((fiber) => {
      const method = fiber.getRef(ClientMethod)
      return runAbortable<unknown, A>(
        this.client,
        "Failed to execute statement",
        "execute",
        (base) =>
          method === "command"
            ? this.client.command({ query: sql, query_params, ...base })
            : this.client.query({ query: sql, query_params, ...base, format }),
        read
      )
    })
  }

  // The body is read inside the request, so interrupting while it is still
  // arriving aborts the request and kills the query.
  private run(sql: string, params: ReadonlyArray<unknown>, format?: DataFormat) {
    return this.runRaw(
      sql,
      params,
      format,
      (result): ReadonlyArray<any> | Promise<ReadonlyArray<any>> =>
        isResultSet(result, "json")
          ? result.json().then(
            // `JSON` wraps rows in `{ data }`; `JSONCompact` rows are arrays.
            (body: any) => "data" in body ? body.data : body,
            (cause) => {
              throw new SqlError({ reason: classifyError(cause, "Failed to parse result", "parseResult") })
            }
          )
          : []
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
    return Effect.withFiber((fiber) => {
      const queryId = fiber.getRef(QueryId) ?? newQueryId()
      return this.runRaw(sql, params, "JSONEachRow").pipe(
        Effect.provideService(QueryId, queryId),
        Effect.map((result) => {
          if (!isResultSet(result, "stream")) {
            return Stream.empty
          }
          // Closing the socket does not stop a query the server is still
          // computing, so kill it unless the response was read to the end.
          let done = false
          return this.fromStream(
            () => result.stream(),
            (cause) => new SqlError({ reason: classifyError(cause, "Failed to execute stream", "stream") })
          ).pipe(
            Stream.onEnd(Effect.sync(() => {
              done = true
            })),
            Stream.ensuring(Effect.suspend(() => done ? Effect.void : killQuery(this.client, queryId)))
          )
        })
      )
    }).pipe(
      Stream.unwrap,
      Stream.chunks,
      Stream.mapEffect((chunk) =>
        Effect.tryPromise({
          // Rows may decode synchronously, so decoding stays inside `try`.
          try: () =>
            Promise.all(Array.from(chunk).flat().map((row) => row.json())).then((rows: Array<any>) =>
              transformRows ? transformRows(rows) : rows
            ),
          catch: (cause) => new SqlError({ reason: classifyError(cause, "Failed to parse row", "parseRow") })
        })
      ),
      Stream.flattenIterable
    )
  }
}

/**
 * Creates the driver client, verifies connectivity with a ping (5 second
 * limit), and builds the ClickHouse `SqlClient` over it. The driver client is
 * closed when the scope ends. The result has the members both entries'
 * service interfaces declare; each entry narrows it to its own.
 */
export const make = <
  Config extends {
    readonly database?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly transformResultNames?: ((str: string) => string) | undefined
    readonly transformQueryNames?: ((str: string) => string) | undefined
  }
>(
  typeId: string,
  options: Config,
  createClient: (options: Config) => Driver,
  fromStream: FromStream
): Effect.Effect<Client.SqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const client = yield* Effect.acquireRelease(
      Effect.sync(() => createClient(options)),
      (client) => Effect.promise(() => client.close())
    )

    yield* Effect.tryPromise({
      try: async () => {
        const result = await client.ping()
        if (!result.success) {
          throw result.error
        }
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
      acquirer: Effect.succeed(new ConnectionImpl(client, fromStream)),
      compiler: makeCompiler(options.transformQueryNames),
      spanAttributes: [
        ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
        [ATTR_DB_SYSTEM_NAME, "clickhouse"],
        [ATTR_DB_NAMESPACE, options.database ?? "default"]
      ],
      beginTransaction: "BEGIN TRANSACTION",
      transformRows: options.transformResultNames
        ? Statement.defaultTransforms(options.transformResultNames).array
        : undefined
    })

    return Object.assign(sql, {
      [typeId]: typeId,
      config: options,
      client,
      param: (dataType: string, value: unknown) => Statement.fragment([clickhouseParam(dataType, value)]),
      asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provideService(effect, ClientMethod, "command"),
      insertQuery: (options: { readonly table: string; readonly values: unknown }) =>
        runAbortable(
          client,
          "Failed to insert data",
          "insert",
          (base) => client.insert({ format: "JSONEachRow", ...options, ...base })
        ),
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
  })

/** Provides a client under its own tag and as the generic `SqlClient`. */
export const layer = <I, S extends Client.SqlClient, E>(
  tag: Context.Service<I, S>,
  make: Effect.Effect<S, E, Scope.Scope | Reactivity.Reactivity>
): Layer.Layer<I | Client.SqlClient, E> =>
  Layer.effectContext(
    Effect.map(make, (client) => Context.make(tag, client).pipe(Context.add(Client.SqlClient, client)))
  ).pipe(Layer.provide(Reactivity.layer))
