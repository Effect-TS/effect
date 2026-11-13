/**
 * Shared client behavior. Keep driver imports in the entry modules so the
 * web entry stays free of Node built-ins.
 */
import * as Context from "effect/Context"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import { dual, identity } from "effect/Function"
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

type Result = ResultSet | { readonly query_id: string }

/**
 * The methods both `@clickhouse/client` and `@clickhouse/client-web` clients
 * provide. The drivers' own types are not assignable to each other, so the
 * parameters here are only as specific as the core needs.
 */
export interface Driver {
  ping(): Promise<{ readonly success: boolean; readonly error?: unknown }>
  close(): Promise<void>
  query(params: Request & { readonly format: DataFormat }): Promise<ResultSet>
  command(params: Request): Promise<Result>
  // The values type is checked by each entry's `insertQuery` signature.
  insert(
    params: RequestBase & { readonly table: string; readonly values: any; readonly format: "JSONEachRow" }
  ): Promise<Result>
}

/**
 * Reads a result body as a stream of row batches. `evaluate` returns the
 * driver's stream: a Node `Readable` or a web `ReadableStream`.
 */
export type FromStream = (options: {
  readonly evaluate: () => any
  readonly onError: (cause: unknown) => SqlError
}) => Stream.Stream<ReadonlyArray<{ json(): unknown }>, SqlError>

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

const classifyError = (cause: unknown, message: string, operation: string, fallback?: "connection") => {
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

const sqlError = (message: string, operation: string, fallback?: "connection") => (cause: unknown) =>
  new SqlError({ reason: classifyError(cause, message, operation, fallback) })

// Keep cancellation bounded and best effort; timeout aborts the kill request.
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

/**
 * Keeps body reads inside the interruptible request. Close the result before
 * killing the query: Node stops listening for aborts after headers arrive,
 * and an open response can hold the only connection available for the kill.
 */
const runAbortable = <A>(
  client: Driver,
  message: string,
  operation: string,
  request: (base: Required<RequestBase>, fiber: Fiber.Fiber<unknown, unknown>) => Promise<Result>,
  read: (result: Result, queryId: string) => A | Promise<A>
): Effect.Effect<A, SqlError> =>
  Effect.withFiber((fiber) =>
    Effect.callback<A, SqlError>((resume, signal) => {
      const queryId = fiber.getRef(QueryId) ?? SecureRandom.uuidV4Unsafe()
      let reading: Result | undefined
      request({
        abort_signal: signal,
        query_id: queryId,
        clickhouse_settings: fiber.getRef(ClickhouseSettings)
      }, fiber).then((result) => read(reading = result, queryId)).then(
        (result) => resume(Effect.succeed(result)),
        (cause) => resume(Effect.fail(cause instanceof SqlError ? cause : sqlError(message, operation)(cause)))
      )
      // `signal` is aborted before this runs.
      return Effect.suspend(() => {
        if (reading !== undefined && "close" in reading) {
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

const readRows = (result: Result): ReadonlyArray<any> | Promise<ReadonlyArray<any>> =>
  "json" in result
    ? result.json().then(
      // `JSON` wraps rows in `{ data }`; `JSONCompact` rows are arrays.
      (body: any) => "data" in body ? body.data : body,
      (cause) => {
        throw sqlError("Failed to parse result", "parseResult")(cause)
      }
    )
    : []

class ConnectionImpl implements Connection {
  private readonly client: Driver
  private readonly fromStream: FromStream
  constructor(client: Driver, fromStream: FromStream) {
    this.client = client
    this.fromStream = fromStream
  }

  private runRaw<A>(
    sql: string,
    params: ReadonlyArray<unknown>,
    format: DataFormat,
    read: (result: Result, queryId: string) => A | Promise<A>
  ) {
    const query_params: Record<string, unknown> = {}
    for (let i = 0; i < params.length; i++) {
      query_params[`p${i + 1}`] = params[i]
    }
    return runAbortable(
      this.client,
      "Failed to execute statement",
      "execute",
      (base, fiber) =>
        fiber.getRef(ClientMethod) === "command"
          ? this.client.command({ query: sql, query_params, ...base })
          : this.client.query({ query: sql, query_params, ...base, format }),
      read
    )
  }

  execute(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const rows = this.runRaw(sql, params, "JSON", readRows)
    return transformRows ? Effect.map(rows, transformRows) : rows
  }
  executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return this.runRaw(sql, params, "JSON", identity)
  }
  executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return this.runRaw(sql, params, "JSONCompact", readRows)
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
    return this.runRaw(sql, params, "JSONEachRow", (result, queryId) => {
      if (!("stream" in result)) {
        return Stream.empty
      }
      // Closing the socket does not stop a query the server is still
      // computing, so kill it unless the response was read to the end.
      let done = false
      return this.fromStream({
        evaluate: () => result.stream(),
        onError: sqlError("Failed to execute stream", "stream")
      }).pipe(
        Stream.onEnd(Effect.sync(() => {
          done = true
        })),
        Stream.ensuring(Effect.suspend(() => done ? Effect.void : killQuery(this.client, queryId)))
      )
    }).pipe(
      Stream.unwrap,
      Stream.chunks,
      Stream.mapEffect((chunk) =>
        Effect.tryPromise({
          // Rows may decode synchronously, so decoding stays inside `try`.
          try: () =>
            Promise.all(chunk.flat().map((row) => row.json())).then((rows: Array<any>) =>
              transformRows ? transformRows(rows) : rows
            ),
          catch: sqlError("Failed to parse row", "parseRow")
        })
      ),
      Stream.flattenIterable
    )
  }
}

/**
 * Builds the shared service members; each entry narrows the result to its
 * driver-specific interface.
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
      catch: sqlError("ClickhouseClient: Failed to connect", "connect", "connection")
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
          (base) => client.insert({ format: "JSONEachRow", ...options, ...base }),
          identity
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
