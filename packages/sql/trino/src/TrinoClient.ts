/**
 * Trino driver for Effect SQL, speaking Trino's HTTP client protocol through
 * an `HttpClient`.
 *
 * This module provides the Trino-specific {@link TrinoClient} service and the
 * generic `SqlClient` service. A statement is submitted with
 * `POST /v1/statement` and its results are read by following `nextUri` until
 * the query finishes. Statements with parameters are sent as
 * `EXECUTE IMMEDIATE ... USING` with each parameter rendered as a SQL literal,
 * and rows are decoded from the response text using each column's type, so
 * `bigint` values keep their full precision.
 *
 * Catalog, schema, session property and prepared statement changes returned
 * by the server apply to later statements on the same session. Statements
 * outside a transaction share the client's session; a reserved connection or a
 * transaction starts from a copy of it, and its changes stay with it.
 * Transactions use Trino's transaction id header and cannot be nested.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as Clock from "effect/Clock"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Hex from "effect/encoding/Hex"
import { identity } from "effect/Function"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
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

/**
 * Unique runtime identifier used to tag `TrinoClient` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId: TypeId = "~@effect/sql-trino/TrinoClient"

/**
 * Type-level literal for the `TrinoClient` runtime identifier.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.5
 */
export type TypeId = "~@effect/sql-trino/TrinoClient"

/**
 * Trino-specific `SqlClient` extension with access to its configuration.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export interface TrinoClient extends Client.Base {
  readonly [TypeId]: TypeId
  readonly config: TrinoClientConfig
}

/**
 * Service tag for the active Trino SQL client.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export const TrinoClient = Context.Service<TrinoClient, TrinoClient & Client.SqlClient>(
  "@effect/sql-trino/TrinoClient"
)

/**
 * Configuration for a Trino client.
 *
 * **Details**
 *
 * `url` is the coordinator's base URL, such as `http://localhost:8080`.
 * `user` is sent as `X-Trino-User` on every request, and with `password`
 * the client also sends HTTP Basic authentication, which Trino only accepts
 * over HTTPS. `catalog`, `schema`, `timeZone` and `sessionProperties` set
 * the initial session.
 *
 * `retryTimeout` bounds how long a request keeps being retried. The request
 * that submits a statement is only retried when the server answers 429 or 503,
 * because any other failure leaves it unknown whether the statement started.
 * Requests that read results are also retried on 502, 504 and network
 * failures. It defaults to 2 minutes.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface TrinoClientConfig {
  readonly url: string
  readonly user: string
  readonly password?: Redacted.Redacted | undefined
  readonly source?: string | undefined
  readonly catalog?: string | undefined
  readonly schema?: string | undefined
  readonly timeZone?: string | undefined
  readonly sessionProperties?: Readonly<Record<string, string>> | undefined
  readonly retryTimeout?: Duration.Input | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * Creates a `TrinoClient` that sends requests with the `HttpClient` in the
 * environment.
 *
 * **Details**
 *
 * No request is made until the first statement runs. Interrupting a statement,
 * or ending a stream before its last row, cancels the query on the server.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const make = (
  options: TrinoClientConfig
): Effect.Effect<TrinoClient & Client.SqlClient, never, Scope.Scope | Reactivity.Reactivity | HttpClient.HttpClient> =>
  Effect.gen(function*() {
    const httpClient = yield* HttpClient.HttpClient
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined
    const baseUrl = options.url.replace(/\/+$/, "")
    const retryTimeout = Duration.toMillis(options.retryTimeout ?? Duration.minutes(2))
    const authorization = options.password === undefined
      ? undefined
      : `Basic ${Base64.encode(`${options.user}:${Redacted.value(options.password)}`)}`

    const scopedClient = HttpClient.withScope(httpClient)

    const headersFor = (state: ConnectionState, transactionId: string | undefined): Record<string, string> => {
      const session = state.session
      const headers: Record<string, string> = {
        "X-Trino-User": options.user,
        "X-Trino-Source": options.source ?? "effect-sql-trino"
      }
      if (authorization !== undefined) headers["Authorization"] = authorization
      if (session.catalog !== undefined) headers["X-Trino-Catalog"] = session.catalog
      if (session.schema !== undefined) headers["X-Trino-Schema"] = session.schema
      if (options.timeZone !== undefined) headers["X-Trino-Time-Zone"] = options.timeZone
      if (session.properties.size > 0) headers["X-Trino-Session"] = joinPairs(session.properties)
      if (session.preparedStatements.size > 0) {
        headers["X-Trino-Prepared-Statement"] = joinPairs(session.preparedStatements)
      }
      if (transactionId !== undefined) headers["X-Trino-Transaction-Id"] = transactionId
      return headers
    }

    const applySessionHeaders = (state: ConnectionState, headers: Readonly<Record<string, string | undefined>>) => {
      const session = state.session
      const catalog = headers["x-trino-set-catalog"]
      if (catalog !== undefined) session.catalog = catalog
      const schema = headers["x-trino-set-schema"]
      if (schema !== undefined) session.schema = schema
      for (const [name, value] of splitPairs(headers["x-trino-set-session"])) session.properties.set(name, value)
      for (const name of splitList(headers["x-trino-clear-session"])) session.properties.delete(name)
      for (const [name, value] of splitPairs(headers["x-trino-added-prepare"])) {
        session.preparedStatements.set(name, value)
      }
      for (const name of splitList(headers["x-trino-deallocated-prepare"])) session.preparedStatements.delete(name)
      const started = headers["x-trino-started-transaction-id"]
      if (started !== undefined) state.transactionId = started
      if (headers["x-trino-clear-transaction-id"] !== undefined) state.transactionId = undefined
    }

    // Sends a request, retrying while `retryDelay` returns a delay and the
    // retry budget lasts. Returns the response body text of a 200 response.
    // Each attempt runs in its own scope, so a response that is not read, such
    // as an error before a retry, is released before the next attempt.
    const send = (
      state: ConnectionState,
      request: HttpClientRequest.HttpClientRequest,
      retryDelay: (failure: HttpFailure, now: number) => number | undefined,
      operation: string
    ): Effect.Effect<string, SqlError> =>
      Effect.flatMap(Clock.currentTimeMillis, (startedAt) => {
        const attempt: Effect.Effect<string, SqlError> = Effect.scoped(
          scopedClient.execute(request).pipe(
            Effect.mapError((cause): HttpFailure => ({ _tag: "Transport", cause })),
            Effect.flatMap((response) =>
              response.status === 200
                ? response.text.pipe(
                  Effect.mapError((cause): HttpFailure => ({ _tag: "Transport", cause })),
                  Effect.tap(() => Effect.sync(() => applySessionHeaders(state, response.headers)))
                )
                : Effect.fail<HttpFailure>({ _tag: "Status", response })
            )
          )
        ).pipe(Effect.catch((failure) =>
          Effect.flatMap(Clock.currentTimeMillis, (now) => {
            const delay = retryDelay(failure, now)
            return delay === undefined || now + delay - startedAt > retryTimeout
              ? Effect.fail(httpError(failure, operation))
              : Effect.andThen(Effect.sleep(delay), attempt)
          })
        ))
        return attempt
      })

    const submit = (state: ConnectionState, sql: string, transactionId: string | undefined) =>
      send(
        state,
        HttpClientRequest.post(`${baseUrl}/v1/statement`, { headers: headersFor(state, transactionId) }).pipe(
          HttpClientRequest.bodyText(sql)
        ),
        submitRetryDelay,
        "execute"
      )

    const fetchPage = (state: ConnectionState, uri: string) =>
      send(
        state,
        HttpClientRequest.get(uri, { headers: headersFor(state, state.transactionId) }),
        pollRetryDelay,
        "fetch"
      )

    const cancel = (state: ConnectionState, uri: string) =>
      Effect.scoped(
        scopedClient.execute(HttpClientRequest.make("DELETE")(uri, { headers: headersFor(state, undefined) }))
      ).pipe(
        Effect.timeout(Duration.seconds(5)),
        Effect.ignore
      )

    class TrinoConnection implements Connection {
      readonly state: ConnectionState
      constructor(session: Session) {
        this.state = { transactionId: undefined, session }
      }

      // Starts the query and returns a stream of decoded pages. The query is
      // cancelled on the server if the stream ends before the last page.
      private query(
        sql: string,
        params: ReadonlyArray<unknown>,
        transactionId: string | undefined = this.state.transactionId
      ): Stream.Stream<QueryPage, SqlError> {
        const state = this.state
        return Stream.suspend(() => {
          const body = renderStatement(sql, params)
          if (Result.isFailure(body)) return Stream.fail(body.failure)
          let nextUri: string | undefined
          let columns: ReadonlyArray<Column> | undefined
          // A pagination step: the page that was read and the next URI to read.
          const readPage = (
            text: string
          ): Effect.Effect<readonly [ReadonlyArray<QueryPage>, Option.Option<string>], SqlError> => {
            const parsed = parseResults(text)
            if (Result.isFailure(parsed)) return Effect.fail(parsed.failure)
            const results = parsed.success
            if (results.error !== undefined) {
              nextUri = undefined
              return Effect.fail(queryError(results.error))
            }
            nextUri = typeof results.nextUri === "string" ? results.nextUri : undefined
            columns ??= results.columns
            const page: QueryPage = {
              columns,
              rows: columns === undefined || results.data === undefined ? [] : decodeRows(columns, results.data),
              updateType: results.updateType,
              updateCount: results.updateCount
            }
            return Effect.succeed([[page], Option.fromUndefinedOr(nextUri)] as const)
          }
          // The first step submits the statement, and each later one reads the
          // URI the previous step returned.
          return Stream.paginate(undefined as string | undefined, (uri) =>
            Effect.flatMap(
              uri === undefined ? submit(state, body.success, transactionId) : fetchPage(state, uri),
              readPage
            )).pipe(
              Stream.ensuring(Effect.suspend(() => nextUri === undefined ? Effect.void : cancel(state, nextUri)))
            )
        })
      }

      private collect(sql: string, params: ReadonlyArray<unknown>, transactionId?: string | undefined) {
        return Stream.runFold(
          this.query(sql, params, transactionId),
          () =>
            ({ columns: undefined, rows: [], updateType: undefined, updateCount: undefined }) as {
              columns: ReadonlyArray<Column> | undefined
              rows: Array<ReadonlyArray<unknown>>
              updateType: string | undefined
              updateCount: number | undefined
            },
          (acc, page) => {
            acc.columns ??= page.columns
            for (const row of page.rows) acc.rows.push(row)
            acc.updateType ??= page.updateType
            acc.updateCount ??= page.updateCount
            return acc
          }
        )
      }

      begin(statement: string | undefined) {
        return Effect.asVoid(this.collect(statement ?? "START TRANSACTION", [], "NONE"))
      }

      execute(
        sql: string,
        params: ReadonlyArray<unknown>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return Effect.map(this.collect(sql, params), (result) => {
          const rows = result.columns === undefined ? [] : toObjects(result.columns, result.rows)
          return transformRows ? transformRows(rows) : rows
        })
      }
      executeRaw(sql: string, params: ReadonlyArray<unknown>) {
        return this.collect(sql, params)
      }
      executeValues(sql: string, params: ReadonlyArray<unknown>) {
        return Effect.map(this.collect(sql, params), (result) => result.rows)
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
        return this.query(sql, params).pipe(
          Stream.flatMap((page) => {
            if (page.columns === undefined || page.rows.length === 0) return Stream.empty
            const rows = toObjects(page.columns, page.rows)
            return Stream.fromIterable(transformRows ? transformRows(rows) : rows)
          })
        )
      }
    }

    // Statements outside a transaction share the client's session. A reserved
    // or transaction connection starts from a copy of it, so its `USE` or
    // `SET SESSION` changes stay on that connection.
    const connection = new TrinoConnection({
      catalog: options.catalog,
      schema: options.schema,
      properties: new Map(Object.entries(options.sessionProperties ?? {})),
      preparedStatements: new Map()
    })
    const transactionAcquirer = Effect.sync(() => new TrinoConnection(copySession(connection.state.session)))
    const spanAttributes: ReadonlyArray<readonly [string, unknown]> = [
      ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
      [ATTR_DB_SYSTEM_NAME, "trino"],
      ...(options.catalog === undefined ? [] : [[ATTR_DB_NAMESPACE, options.catalog] as const])
    ]

    const client = yield* Client.make({
      driver: "trino",
      acquirer: Effect.succeed(connection),
      transactionAcquirer,
      compiler,
      spanAttributes,
      transformRows
    })

    const asTrino = (conn: unknown) => conn as TrinoConnection
    const rollback = (conn: Connection) =>
      asTrino(conn).state.transactionId === undefined
        ? Effect.void
        : Effect.asVoid(conn.executeUnprepared("ROLLBACK", [], undefined))
    const withTransaction = Client.makeWithTransaction({
      transactionService: client.transactionService,
      spanAttributes,
      acquireConnection: (restore) => restore(transactionAcquirer),
      begin: (conn, statement) => asTrino(conn).begin(statement),
      savepoint: () =>
        Effect.fail(
          new SqlError({
            reason: new UnknownError({
              cause: undefined,
              message: "Trino does not support nested transactions",
              operation: "savepoint"
            })
          })
        ),
      commit: (conn) => Effect.asVoid(conn.executeUnprepared("COMMIT", [], undefined)),
      // A failed COMMIT can leave the transaction open on the server.
      onCommitFailure: rollback,
      rollback,
      rollbackSavepoint: () => Effect.void
    })

    return Object.assign(client, {
      [TypeId]: TypeId as TypeId,
      config: options,
      withTransaction
    })
  })

/**
 * Provides both `TrinoClient` and generic `SqlClient` services from a
 * `Config`-backed Trino client configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layerConfig = (
  config: Config.Wrap<TrinoClientConfig>
): Layer.Layer<TrinoClient | Client.SqlClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effectContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) => Context.make(TrinoClient, client).pipe(Context.add(Client.SqlClient, client)))
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Provides both `TrinoClient` and generic `SqlClient` services from a Trino
 * client configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (
  config: TrinoClientConfig
): Layer.Layer<TrinoClient | Client.SqlClient, never, HttpClient.HttpClient> =>
  Layer.effectContext(
    Effect.map(make(config), (client) => Context.make(TrinoClient, client).pipe(Context.add(Client.SqlClient, client)))
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Creates the Trino statement compiler, using `?` placeholders and
 * double-quoted identifiers.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler({
    dialect: "trino",
    placeholder() {
      return "?"
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      } :
      escape,
    onCustom() {
      return ["", []]
    },
    onRecordUpdate() {
      return ["", []]
    }
  })

const escape = Statement.defaultEscape("\"")

// session

interface Session {
  catalog: string | undefined
  schema: string | undefined
  readonly properties: Map<string, string>
  readonly preparedStatements: Map<string, string>
}

interface ConnectionState {
  transactionId: string | undefined
  readonly session: Session
}

const copySession = (session: Session): Session => ({
  catalog: session.catalog,
  schema: session.schema,
  properties: new Map(session.properties),
  preparedStatements: new Map(session.preparedStatements)
})

// Session headers carry comma-separated `name=value` pairs whose values are
// URL encoded, so they never contain a comma. They are stored and sent back
// still encoded.
const splitList = (header: string | undefined): Array<string> =>
  header === undefined ? [] : header.split(",").map((s) => s.trim()).filter((s) => s.length > 0)

const splitPairs = (header: string | undefined): Array<readonly [string, string]> =>
  splitList(header).flatMap((pair) => {
    const i = pair.indexOf("=")
    return i === -1 ? [] : [[pair.slice(0, i).trim(), pair.slice(i + 1).trim()] as const]
  })

const joinPairs = (pairs: ReadonlyMap<string, string>): string =>
  Array.from(pairs, ([name, value]) => `${name}=${value}`).join(",")

// http

type HttpFailure =
  | { readonly _tag: "Transport"; readonly cause: unknown }
  | { readonly _tag: "Status"; readonly response: HttpClientResponse.HttpClientResponse }

const transientDelayMillis = 100

// Retry-After is either a number of seconds or an HTTP date.
const retryAfterMillis = (response: HttpClientResponse.HttpClientResponse, now: number): number => {
  const header = response.headers["retry-after"]?.trim()
  if (header === undefined) return transientDelayMillis
  if (/^\d+$/.test(header)) return Number(header) * 1000
  const date = Date.parse(header)
  return Number.isNaN(date) ? transientDelayMillis : Math.max(0, date - now)
}

// The statement may already be running after any failure other than 429 and
// 503, so submitting it again could run it twice.
const submitRetryDelay = (failure: HttpFailure, now: number): number | undefined => {
  if (failure._tag === "Transport") return undefined
  switch (failure.response.status) {
    case 429:
      return retryAfterMillis(failure.response, now)
    case 503:
      return transientDelayMillis
    default:
      return undefined
  }
}

// Reading a page is idempotent, so network failures and gateway errors retry
// as well.
const pollRetryDelay = (failure: HttpFailure, now: number): number | undefined =>
  failure._tag === "Transport" || failure.response.status === 502 || failure.response.status === 504
    ? transientDelayMillis
    : submitRetryDelay(failure, now)

const httpError = (failure: HttpFailure, operation: string): SqlError => {
  if (failure._tag === "Transport") {
    return new SqlError({
      reason: new ConnectionError({ cause: failure.cause, message: "Failed to reach the Trino server", operation })
    })
  }
  const status = failure.response.status
  const props = { cause: failure.response, message: `Trino server responded with status ${status}`, operation }
  switch (status) {
    case 401:
      return new SqlError({ reason: new AuthenticationError(props) })
    case 403:
      return new SqlError({ reason: new AuthorizationError(props) })
    default:
      return new SqlError({ reason: new ConnectionError(props) })
  }
}

interface QueryErrorBody {
  readonly message?: string
  readonly errorName?: string
  readonly errorType?: string
  readonly errorCode?: number
}

const queryError = (error: QueryErrorBody): SqlError => {
  const props = {
    cause: error,
    message: error.errorName === undefined ? String(error.message) : `${error.errorName}: ${error.message}`,
    operation: "execute"
  }
  switch (error.errorName) {
    case "SYNTAX_ERROR":
      return new SqlError({ reason: new SqlSyntaxError(props) })
    case "PERMISSION_DENIED":
      return new SqlError({ reason: new AuthorizationError(props) })
    case "EXCEEDED_TIME_LIMIT":
      return new SqlError({ reason: new StatementTimeoutError(props) })
    default:
      return new SqlError({ reason: new UnknownError(props) })
  }
}

// parameters

const renderError = (message: string) =>
  Result.fail(new SqlError({ reason: new UnknownError({ cause: undefined, message, operation: "bind" }) }))

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`

const renderLiteral = (value: unknown): Result.Result<string, SqlError> => {
  if (value === null || value === undefined) return Result.succeed("NULL")
  switch (typeof value) {
    case "string":
      return Result.succeed(quote(value))
    case "bigint":
      return Result.succeed(String(value))
    case "boolean":
      return Result.succeed(value ? "true" : "false")
    case "number":
      return Result.succeed(Number.isSafeInteger(value) ? String(value) : `DOUBLE '${String(value)}'`)
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return renderError("Cannot send an invalid Date as a Trino parameter")
    return Result.succeed(`TIMESTAMP '${value.toISOString().replace("T", " ").replace("Z", "")} UTC'`)
  }
  if (value instanceof Uint8Array) return Result.succeed(`X'${Hex.encode(value)}'`)
  if (Array.isArray(value)) return Result.map(renderLiterals(value), (elements) => `ARRAY[${elements}]`)
  return renderError(`Cannot send a value of type ${typeof value} as a Trino parameter`)
}

const renderLiterals = (values: ReadonlyArray<unknown>): Result.Result<string, SqlError> =>
  Result.map(Result.all(Array.from(values, (value) => renderLiteral(value))), (literals) => literals.join(", "))

// Trino has no protocol-level parameters, so parameters are inlined as
// literals into an EXECUTE IMMEDIATE statement, which still parses the query
// text separately from the values.
const renderStatement = (sql: string, params: ReadonlyArray<unknown>): Result.Result<string, SqlError> =>
  params.length === 0
    ? Result.succeed(sql)
    : Result.map(renderLiterals(params), (literals) => `EXECUTE IMMEDIATE ${quote(sql)} USING ${literals}`)

// results

interface TypeSignature {
  readonly rawType: string
  readonly arguments?: ReadonlyArray<{ readonly kind: string; readonly value: unknown }>
}

interface Column {
  readonly name: string
  readonly type: string
  readonly typeSignature?: TypeSignature
}

interface QueryResults {
  readonly nextUri?: unknown
  readonly columns?: ReadonlyArray<Column>
  readonly data?: ReadonlyArray<ReadonlyArray<unknown>>
  readonly error?: QueryErrorBody
  readonly updateType?: string
  readonly updateCount?: number
}

interface QueryPage {
  readonly columns: ReadonlyArray<Column> | undefined
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
  readonly updateType: string | undefined
  readonly updateCount: number | undefined
}

const parseResults = (text: string): Result.Result<QueryResults, SqlError> => {
  try {
    return Result.succeed(parseJson(text) as QueryResults)
  } catch (cause) {
    return Result.fail(
      new SqlError({
        reason: new ConnectionError({ cause, message: "Trino server sent an invalid response", operation: "fetch" })
      })
    )
  }
}

// Assigning `__proto__` would set the prototype instead of adding a key, and
// it is a valid column name, map key or row field name.
const setOwn = (object: Record<string, unknown>, key: string, value: unknown) => {
  if (key === "__proto__") {
    Object.defineProperty(object, key, { value, writable: true, enumerable: true, configurable: true })
  } else {
    object[key] = value
  }
}

const toObjects = (columns: ReadonlyArray<Column>, rows: ReadonlyArray<ReadonlyArray<unknown>>) =>
  rows.map((row) => {
    const object: Record<string, unknown> = {}
    for (let i = 0; i < columns.length; i++) setOwn(object, columns[i].name, row[i])
    return object
  })

const decodeRows = (columns: ReadonlyArray<Column>, data: ReadonlyArray<ReadonlyArray<unknown>>) => {
  const decoders = columns.map((column) => decoderFor(column.typeSignature ?? { rawType: column.type }))
  return data.map((row) => row.map((value, i) => decoders[i](value)))
}

type Decoder = (value: unknown) => unknown

const typeArgument = (signature: TypeSignature, index: number): TypeSignature => {
  const argument = signature.arguments?.[index]
  return (argument?.value ?? { rawType: "unknown" }) as TypeSignature
}

const nullable = (decode: Decoder): Decoder => (value) => value === null ? null : decode(value)

const decoderFor = (signature: TypeSignature): Decoder => {
  switch (signature.rawType) {
    case "bigint":
      return nullable((value) => typeof value === "bigint" ? value : BigInt(value as number))
    case "real":
    case "double":
      return nullable((value) => typeof value === "string" ? Number(value) : value)
    case "timestamp":
      return nullable((value) => parseTimestamp(value as string, "UTC"))
    case "timestamp with time zone":
      return nullable((value) => {
        const text = value as string
        const i = text.lastIndexOf(" ")
        return parseTimestamp(text.slice(0, i), text.slice(i + 1))
      })
    case "varbinary":
      return nullable((value) => Result.getOrThrow(Base64.decode(value as string)))
    case "json":
      return nullable((value) => JSON.parse(value as string))
    case "array": {
      const element = decoderFor(typeArgument(signature, 0))
      return nullable((value) => (value as ReadonlyArray<unknown>).map(element))
    }
    case "map": {
      const decodeValue = decoderFor(typeArgument(signature, 1))
      return nullable((value) => {
        const out: Record<string, unknown> = {}
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) setOwn(out, key, decodeValue(item))
        return out
      })
    }
    case "row": {
      const fields = (signature.arguments ?? []).map((argument) =>
        argument.value as { readonly fieldName?: { readonly name: string }; readonly typeSignature: TypeSignature }
      )
      const decoders = fields.map((field) => decoderFor(field.typeSignature))
      const names = fields.every((field) => field.fieldName !== undefined)
        ? fields.map((field) => field.fieldName!.name)
        : undefined
      return nullable((value) => {
        const items = (value as ReadonlyArray<unknown>).map((item, i) => decoders[i](item))
        if (names === undefined) return items
        const out: Record<string, unknown> = {}
        for (let i = 0; i < names.length; i++) setOwn(out, names[i], items[i])
        return out
      })
    }
    default:
      return identity
  }
}

const timestampPattern = /^([+-]?\d+)-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/

const parseTimestamp = (text: string, timeZone: string): Date | string => {
  const match = timestampPattern.exec(text)
  if (match === null) return text
  const zoned = DateTime.makeZoned({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    millisecond: match[7] === undefined ? 0 : Number(match[7].slice(0, 3).padEnd(3, "0"))
  }, { timeZone, adjustForTimeZone: true })
  return Option.isSome(zoned) ? DateTime.toDateUtc(zoned.value) : text
}

// A JSON parser that keeps integers outside the safe integer range as
// `bigint`, because Trino sends `bigint` values as bare JSON numbers.
const parseJson = (text: string): unknown => {
  let i = 0
  const fail = (): never => {
    throw new SyntaxError(`Unexpected JSON input at position ${i}`)
  }
  const skipWhitespace = () => {
    while (i < text.length) {
      const c = text.charCodeAt(i)
      if (c === 32 || c === 9 || c === 10 || c === 13) i++
      else break
    }
  }
  const parseString = (): string => {
    const start = i
    i++
    let simple = true
    while (i < text.length) {
      const c = text.charCodeAt(i)
      if (c === 34) {
        i++
        return simple ? text.slice(start + 1, i - 1) : JSON.parse(text.slice(start, i))
      }
      if (c === 92) {
        simple = false
        i++
      }
      i++
    }
    return fail()
  }
  const numberPattern = /-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y
  const parseNumber = (): number | bigint => {
    numberPattern.lastIndex = i
    const match = numberPattern.exec(text)
    if (match === null) return fail()
    i = numberPattern.lastIndex
    const value = Number(match[0])
    return match[1] === undefined && match[2] === undefined && !Number.isSafeInteger(value) ? BigInt(match[0]) : value
  }
  const parseLiteral = (literal: string, value: unknown) => {
    if (!text.startsWith(literal, i)) fail()
    i += literal.length
    return value
  }
  const parseValue = (): unknown => {
    skipWhitespace()
    switch (text[i]) {
      case "{": {
        i++
        const object: Record<string, unknown> = {}
        skipWhitespace()
        if (text[i] === "}") {
          i++
          return object
        }
        while (true) {
          skipWhitespace()
          if (text[i] !== "\"") fail()
          const key = parseString()
          skipWhitespace()
          if (text[i++] !== ":") fail()
          setOwn(object, key, parseValue())
          skipWhitespace()
          const c = text[i++]
          if (c === "}") return object
          if (c !== ",") fail()
        }
      }
      case "[": {
        i++
        const array: Array<unknown> = []
        skipWhitespace()
        if (text[i] === "]") {
          i++
          return array
        }
        while (true) {
          array.push(parseValue())
          skipWhitespace()
          const c = text[i++]
          if (c === "]") return array
          if (c !== ",") fail()
        }
      }
      case "\"":
        return parseString()
      case "t":
        return parseLiteral("true", true)
      case "f":
        return parseLiteral("false", false)
      case "n":
        return parseLiteral("null", null)
      default:
        return parseNumber()
    }
  }
  const value = parseValue()
  skipWhitespace()
  if (i !== text.length) fail()
  return value
}
