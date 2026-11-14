/**
 * Trino driver for Effect SQL, speaking the Trino client REST protocol over
 * Effect's `HttpClient`.
 *
 * The client keeps the Trino session (catalog, schema, path, time zone,
 * session properties, roles, prepared statements, authorization user and
 * transaction id) on the client side, as the protocol requires, and folds the
 * coordinator's `X-Trino-Set-*` headers back into it after every statement.
 * Statements with parameters are sent as `EXECUTE IMMEDIATE ... USING`, rows
 * are decoded as `pg` rows are (`Date` timestamps, `bigint`, decimals as text;
 * see `TrinoTypes`), and interrupting a statement cancels the query on the
 * coordinator.
 *
 * @stability unstable
 * @since 4.2.0
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Record from "effect/Record"
import type * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Client from "effect/sql/SqlClient"
import type { Connection } from "effect/sql/SqlConnection"
import { ConnectionError, SqlError, UnknownError } from "effect/sql/SqlError"
import * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"
import * as Codec from "./internal/codec.ts"
import { ProtocolViolation, type TrinoFailure } from "./internal/failure.ts"
import type { JsonValue } from "./internal/json.ts"
import * as Literals from "./internal/literals.ts"
import * as Protocol from "./internal/protocol.ts"
import * as Spooling from "./internal/spooling.ts"
import { toSqlError } from "./internal/sqlError.ts"
import type * as TrinoTypes from "./TrinoTypes.ts"

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"

/**
 * Runtime type identifier used to mark `TrinoClient` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.2.0
 */
export const TypeId: TypeId = "~@effect/sql-trino/TrinoClient"

/**
 * Type-level identifier used to mark `TrinoClient` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.2.0
 */
export type TypeId = "~@effect/sql-trino/TrinoClient"

/**
 * Trino-specific `SqlClient` extension with its configuration, typed
 * parameters and access to the current client-side session.
 *
 * **Gotchas**
 *
 * - Trino has no savepoints, so a `withTransaction` nested in another fails
 *   with a `SqlError` instead of starting a savepoint.
 * - Trino has no multi-row `UPDATE ... FROM (VALUES ...)`, so `updateValues`
 *   is not available.
 * - Trino has no `RETURNING`, so `SqlModel`'s `insert` and `update` fail. Use
 *   `insertVoid` or `updateVoid`, then `findById`. `UPDATE` and `DELETE` also
 *   depend on the connector.
 * - `Model` fields accept the default decoding, so `Model.Date`,
 *   `Model.DateTimeInsertFromDate` and `Schema.BigDecimalFromString` decode
 *   rows. Rows decoded with `TrinoTypes.makeEffectRegistry()` need
 *   `Schema.BigDecimal` and `Schema.DateTimeUtc` instead.
 * - Statements outside a transaction share one client-side session and run
 *   concurrently, so concurrent `USE` or `SET SESSION` statements race and the
 *   last one to finish wins. Run session-changing work on a connection from
 *   `reserve`, or in a transaction, where it has a session of its own.
 *
 * @stability unstable
 * @category services
 * @since 4.2.0
 */
export interface TrinoClient extends Client.Base {
  readonly [TypeId]: TypeId
  readonly config: TrinoClientConfig
  /**
   * Binds a parameter with an explicit Trino type, rendered as
   * `CAST(<literal> AS <type>)`.
   */
  readonly param: (type: string, value: unknown) => Statement.Fragment
  /**
   * The client-side session that statements outside a transaction run with.
   */
  readonly session: Effect.Effect<Session>
}

/**
 * Service tag for the Trino SQL client.
 *
 * @stability unstable
 * @category services
 * @since 4.2.0
 */
export const TrinoClient = Context.Service<TrinoClient, TrinoClient & Client.SqlClient>(
  "@effect/sql-trino/TrinoClient"
)

/**
 * The client-side Trino session.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export type Session = Protocol.Session

/**
 * A role selected for a catalog, or for the whole session under `"system"`.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export type SelectedRole = Protocol.SelectedRole

/**
 * How a query ended.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface Completion {
  readonly queryId: string
  /** The kind of update, such as `INSERT`, when the statement was one. */
  readonly updateType: string | undefined
  readonly updateCount: bigint | undefined
  readonly warnings: ReadonlyArray<{ readonly code: string; readonly message: string }>
}

/**
 * The result of `Statement.raw`: column metadata, decoded positional rows
 * and the query's completion details.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface RawResult {
  readonly columns: ReadonlyArray<TrinoTypes.Column>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
  readonly completion: Completion
}

/**
 * Configuration for a Trino client.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface TrinoClientConfig {
  /** Coordinator base URL, such as `http://localhost:8080`. */
  readonly url: string | URL
  readonly user: string
  /** HTTP basic authentication; Trino requires HTTPS for it unless the coordinator allows insecure authentication. */
  readonly password?: Redacted.Redacted | undefined
  /** Bearer token (JWT or OAuth 2.0 access token). Takes precedence over `password`. */
  readonly accessToken?: Redacted.Redacted | undefined

  readonly catalog?: string | undefined
  readonly schema?: string | undefined
  readonly path?: string | undefined
  /** IANA time zone id for the session, such as `UTC`. */
  readonly timeZone?: string | undefined
  readonly language?: string | undefined
  /** Session properties; catalog properties use `catalog.property` keys. */
  readonly sessionProperties?: Readonly<Record<string, string>> | undefined
  /** Roles per catalog, `"system"` for the system role; `"ALL"` and `"NONE"` select all or no roles. */
  readonly roles?: Readonly<Record<string, string>> | undefined
  /** Starts the session as this user, like `SET SESSION AUTHORIZATION`. */
  readonly authorizationUser?: string | undefined

  /**
   * Codecs that replace the built-in decoding of result values, such as
   * `TrinoTypes.makeEffectRegistry()` for `BigDecimal` and `DateTime`.
   */
  readonly types?: TrinoTypes.Registry | undefined

  /** Defaults to `effect-sql-trino`. */
  readonly source?: string | undefined
  readonly clientInfo?: string | undefined
  readonly clientTags?: ReadonlyArray<string> | undefined
  readonly traceToken?: string | undefined
  /** Defaults to `PATH`, `PARAMETRIC_DATETIME`, `PARAMETRIC_INTERVAL`, `NUMBER` and `SESSION_AUTHORIZATION`. */
  readonly clientCapabilities?: ReadonlyArray<string> | undefined
  /** Resource estimates for resource group selection, such as `EXECUTION_TIME: "5m"`. */
  readonly resourceEstimates?: Readonly<Record<string, string>> | undefined
  /** Extra credentials passed to connectors. */
  readonly extraCredentials?: Readonly<Record<string, Redacted.Redacted>> | undefined

  /**
   * Result encodings to ask the coordinator for, in preference order. Defaults
   * to every spooling encoding this runtime decodes; pass `[]` to use the
   * direct protocol only.
   */
  readonly encodings?: ReadonlyArray<string> | undefined
  /** Retries transient HTTP failures; defaults to 5 jittered exponential retries from 100 ms. */
  readonly retrySchedule?: Schedule.Schedule<unknown, unknown> | undefined
  /** How long a query keeps being resubmitted while the cluster has no nodes; defaults to 30 seconds. */
  readonly resumeWindow?: Duration.Input | undefined
  /** Bounds cancelling a query on interruption; defaults to 5 seconds. */
  readonly cancelTimeout?: Duration.Input | undefined
  /**
   * How often an idle stream tells the coordinator its client is still there,
   * so a slow consumer does not get the query abandoned; defaults to 30 seconds
   * and must stay below the coordinator's `query.client.timeout`.
   */
  readonly heartbeatInterval?: Duration.Input | undefined
  /** Bounds the connection check that `make` runs; defaults to 5 seconds. */
  readonly connectTimeout?: Duration.Input | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

const defaultRetrySchedule: Schedule.Schedule<unknown, unknown> = Schedule.exponential("100 millis").pipe(
  Schedule.jittered,
  Schedule.upTo({ times: 5 })
)

const recordToMap = <A>(record: Readonly<Record<string, A>> | undefined): ReadonlyMap<string, A> =>
  new Map(record === undefined ? [] : Object.entries(record))

const makeProtocolConfig = (config: TrinoClientConfig, url: URL): Protocol.ProtocolConfig => ({
  url,
  user: config.user,
  auth: config.accessToken !== undefined
    ? { _tag: "Bearer", token: config.accessToken }
    : config.password !== undefined
    ? { _tag: "Basic", password: config.password }
    : { _tag: "None" },
  source: config.source ?? "effect-sql-trino",
  clientInfo: config.clientInfo,
  clientTags: config.clientTags ?? [],
  traceToken: config.traceToken,
  language: config.language,
  clientCapabilities: config.clientCapabilities ??
    ["PATH", "PARAMETRIC_DATETIME", "PARAMETRIC_INTERVAL", "NUMBER", "SESSION_AUTHORIZATION"],
  resourceEstimates: recordToMap(config.resourceEstimates),
  extraCredentials: recordToMap(config.extraCredentials),
  encodings: config.encodings ?? Spooling.supportedEncodings,
  retry: config.retrySchedule ?? defaultRetrySchedule,
  resumeWindow: Duration.fromInputUnsafe(config.resumeWindow ?? Duration.seconds(30)),
  cancelTimeout: Duration.fromInputUnsafe(config.cancelTimeout ?? Duration.seconds(5)),
  heartbeatInterval: Duration.fromInputUnsafe(config.heartbeatInterval ?? Protocol.defaultHeartbeatInterval)
})

const makeSession = (config: TrinoClientConfig): Session => ({
  ...Protocol.emptySession,
  catalog: config.catalog,
  schema: config.schema,
  path: config.path,
  timeZone: config.timeZone,
  authorizationUser: config.authorizationUser,
  properties: recordToMap(config.sessionProperties),
  roles: new Map(
    Object.entries(config.roles ?? {}).map(([catalog, role]): [string, SelectedRole] => [
      catalog,
      role === "ALL" || role === "NONE" ? { type: role, role: undefined } : { type: "ROLE", role }
    ])
  )
})

/** The session a connection runs with, updated after every statement. */
class SessionCell {
  current: Session
  constructor(session: Session) {
    this.current = session
  }
}

const sessionCells = new WeakMap<Connection, SessionCell>()

/**
 * Returns the client-side session a connection from a Trino client runs
 * with, such as one from `sql.reserve`, or `Option.none()` for a connection
 * from another driver.
 *
 * @stability unstable
 * @category accessors
 * @since 4.2.0
 */
export const connectionSession = (connection: Connection): Effect.Effect<Option.Option<Session>> =>
  Effect.sync(() => Option.map(Option.fromNullishOr(sessionCells.get(connection)), (cell) => cell.current))

type TransformRows = <A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>

interface CollectState {
  columns: ReadonlyArray<TrinoTypes.Column>
  readonly rows: Array<ReadonlyArray<unknown>>
  completion: Protocol.Completion | undefined
}

type Output =
  | { readonly _tag: "Columns"; readonly columns: ReadonlyArray<TrinoTypes.Column> }
  | { readonly _tag: "Rows"; readonly rows: ReadonlyArray<ReadonlyArray<unknown>> }
  | { readonly _tag: "Finished"; readonly completion: Protocol.Completion }

const decodeRows = (
  decoder: Codec.RowDecoder | undefined,
  rows: ReadonlyArray<ReadonlyArray<JsonValue>>
): Effect.Effect<Output, TrinoFailure> =>
  Effect.suspend((): Effect.Effect<Output, TrinoFailure> => {
    if (decoder === undefined) {
      return rows.length === 0
        ? Effect.succeed<Output>({ _tag: "Rows", rows: [] })
        : Effect.fail(
          new ProtocolViolation({ message: "TrinoClient: rows arrived before their columns", operation: "decode" })
        )
    }
    const decoded: Array<ReadonlyArray<unknown>> = new Array(rows.length)
    for (let i = 0; i < rows.length; i++) {
      const result = decoder.decode(rows[i])
      if (result._tag === "Failure") {
        return Effect.fail(result.failure)
      }
      decoded[i] = result.success
    }
    return Effect.succeed<Output>({ _tag: "Rows", rows: decoded })
  })

const toObjects = (
  columns: ReadonlyArray<TrinoTypes.Column>,
  rows: ReadonlyArray<ReadonlyArray<unknown>>
): Array<Record<string, unknown>> => {
  const objects: Array<Record<string, unknown>> = new Array(rows.length)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const object: Record<string, unknown> = {}
    for (let j = 0; j < columns.length; j++) {
      Record.assignProperty(object, columns[j].name, row[j])
    }
    objects[i] = object
  }
  return objects
}

class TrinoConnection implements Connection {
  readonly transport: Protocol.Transport
  readonly config: Protocol.ProtocolConfig
  readonly cell: SessionCell
  readonly types: TrinoTypes.Registry | undefined

  constructor(
    transport: Protocol.Transport,
    config: Protocol.ProtocolConfig,
    cell: SessionCell,
    types: TrinoTypes.Registry | undefined
  ) {
    this.transport = transport
    this.config = config
    this.cell = cell
    this.types = types
    sessionCells.set(this, cell)
  }

  /** Runs one statement, decoding rows and applying the session changes it reports. */
  run(sql: string, params: ReadonlyArray<unknown>): Stream.Stream<Output, TrinoFailure> {
    const cell = this.cell
    const transport = this.transport
    const config = this.config
    const types = this.types
    return Stream.unwrap(Effect.map(
      Effect.fromResult(Literals.renderStatement(sql, params)),
      (statement) => {
        let decoder: Codec.RowDecoder | undefined
        return Protocol.execute({ transport, config, session: cell.current, statement }).pipe(
          Stream.mapEffect((event): Effect.Effect<Stream.Stream<Output, TrinoFailure>, TrinoFailure> => {
            switch (event._tag) {
              case "Started":
                return Effect.succeed(Stream.empty)
              case "Columns":
                decoder = Codec.rowDecoder(event.columns, types)
                return Effect.succeed(Stream.succeed<Output>({ _tag: "Columns", columns: event.columns }))
              case "Rows":
                return Effect.map(decodeRows(decoder, event.rows), Stream.succeed)
              case "Segments":
                return Effect.succeed(
                  Spooling.resolve({ http: transport.segments, encoding: event.encoding, segments: event.segments })
                    .pipe(
                      Stream.mapArrayEffect((rows) =>
                        Effect.map(decodeRows(decoder, rows), (output) => [output] as const)
                      )
                    )
                )
              case "Finished":
                return Effect.sync(() => {
                  cell.current = event.result.delta.apply(cell.current)
                  return Stream.succeed<Output>({ _tag: "Finished", completion: event.result })
                })
            }
          }),
          Stream.flatten(),
          // COMMIT and ROLLBACK clear the transaction id even when they fail.
          Stream.tapError((failure) =>
            failure._tag === "QueryFailed" && failure.delta !== undefined
              ? Effect.sync(() => {
                cell.current = failure.delta!.apply(cell.current)
              })
              : Effect.void
          )
        )
      }
    ))
  }

  collect(sql: string, params: ReadonlyArray<unknown>): Effect.Effect<RawResult, SqlError> {
    return Stream.runFold(
      this.run(sql, params),
      (): CollectState => ({ columns: [], rows: [], completion: undefined }),
      (state, output) => {
        switch (output._tag) {
          case "Columns":
            state.columns = output.columns
            break
          case "Rows":
            for (const row of output.rows) state.rows.push(row)
            break
          case "Finished":
            state.completion = output.completion
            break
        }
        return state
      }
    ).pipe(
      Effect.flatMap((state) =>
        state.completion === undefined
          ? Effect.fail(
            new ProtocolViolation({ message: "TrinoClient: the query ended without finishing", operation: "execute" })
          )
          : Effect.succeed<RawResult>({
            columns: state.columns,
            rows: state.rows,
            completion: {
              queryId: state.completion.queryId,
              updateType: state.completion.updateType,
              updateCount: state.completion.updateCount,
              warnings: state.completion.warnings
            }
          })
      ),
      Effect.mapError(toSqlError)
    )
  }

  execute(sql: string, params: ReadonlyArray<unknown>, transformRows: TransformRows | undefined) {
    return Effect.map(this.collect(sql, params), (result) => {
      const rows = toObjects(result.columns, result.rows)
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
  executeUnprepared(sql: string, params: ReadonlyArray<unknown>, transformRows: TransformRows | undefined) {
    return this.execute(sql, params, transformRows)
  }
  executeStream(sql: string, params: ReadonlyArray<unknown>, transformRows: TransformRows | undefined) {
    let columns: ReadonlyArray<TrinoTypes.Column> = []
    return this.run(sql, params).pipe(
      Stream.mapError(toSqlError),
      Stream.flatMap((output) => {
        switch (output._tag) {
          case "Columns":
            columns = output.columns
            return Stream.empty
          case "Finished":
            return Stream.empty
          case "Rows": {
            const rows = toObjects(columns, output.rows)
            return Stream.fromIterable(transformRows ? transformRows(rows) : rows)
          }
        }
      })
    )
  }
}

/**
 * Creates a scoped Trino client, checking that the coordinator is reachable
 * and has finished starting.
 *
 * **Details**
 *
 * Statements outside a transaction share one client-side session, so `USE`,
 * `SET SESSION`, `SET ROLE` and `SET PATH` apply to the statements that
 * follow. A transaction, or a connection from `reserve`, runs on a copy of
 * that session; after a successful `COMMIT` the copy's session changes are
 * kept, otherwise they are dropped.
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const make = (
  config: TrinoClientConfig
): Effect.Effect<
  TrinoClient & Client.SqlClient,
  SqlError,
  Scope.Scope | Reactivity.Reactivity | HttpClient.HttpClient
> =>
  Effect.gen(function*() {
    const http = yield* HttpClient.HttpClient
    const url = yield* Effect.try({
      try: () => new URL(config.url),
      catch: (cause) =>
        new SqlError({
          reason: new ConnectionError({ cause, message: "TrinoClient: invalid coordinator URL", operation: "connect" })
        })
    })
    const protocolConfig = makeProtocolConfig(config, url)
    const credentials = Protocol.validateAuth(protocolConfig)
    if (Result.isFailure(credentials)) {
      return yield* new SqlError({
        reason: new ConnectionError({
          cause: new Error(credentials.failure),
          message: `TrinoClient: ${credentials.failure}`,
          operation: "connect"
        })
      })
    }
    const transport = Protocol.makeTransport(http, protocolConfig)
    const compiler = makeCompiler(config.transformQueryNames)
    const transformRows = config.transformResultNames
      ? Statement.defaultTransforms(config.transformResultNames).array
      : undefined

    yield* Protocol.serverInfo(transport, protocolConfig).pipe(
      Effect.mapError(toSqlError),
      Effect.flatMap((info) =>
        info.starting
          ? Effect.fail(
            new SqlError({
              reason: new ConnectionError({
                cause: new Error("Trino coordinator is still starting"),
                message: "TrinoClient: the coordinator is still starting",
                operation: "connect"
              })
            })
          )
          : Effect.void
      ),
      Effect.timeoutOrElse({
        duration: config.connectTimeout ?? Duration.seconds(5),
        orElse: () =>
          Effect.fail(
            new SqlError({
              reason: new ConnectionError({
                cause: new Error("connection timeout"),
                message: "TrinoClient: Connection timeout",
                operation: "connect"
              })
            })
          )
      })
    )

    const base = new SessionCell(makeSession(config))
    const connection = new TrinoConnection(transport, protocolConfig, base, config.types)
    const transactionAcquirer = Effect.sync((): Connection =>
      new TrinoConnection(transport, protocolConfig, new SessionCell(base.current), config.types)
    )
    const control = (conn: Connection, sql: string) => Effect.asVoid(conn.executeUnprepared(sql, [], undefined))

    const spanAttributes: Array<readonly [string, unknown]> = [
      ...(config.spanAttributes ? Object.entries(config.spanAttributes) : []),
      [ATTR_DB_SYSTEM_NAME, "trino"],
      [ATTR_SERVER_ADDRESS, url.hostname],
      [ATTR_SERVER_PORT, url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port)]
    ]
    if (config.catalog !== undefined) {
      spanAttributes.push([ATTR_DB_NAMESPACE, config.catalog])
    }
    const client = yield* Client.make({
      driver: "trino",
      acquirer: Effect.succeed(connection),
      borrower: (f) => f(connection),
      transactionAcquirer,
      compiler,
      spanAttributes,
      transformRows,
      begin: (conn, statement) => control(conn, statement ?? "START TRANSACTION"),
      // A transaction's connection runs on a copy of the session; a commit keeps the copy's changes.
      commit: (conn) =>
        Effect.andThen(
          control(conn, "COMMIT"),
          Effect.sync(() => {
            base.current = { ...(conn as TrinoConnection).cell.current, transactionId: undefined }
          })
        ),
      // The server ends a transaction its own failure aborted: nothing is left to roll back.
      isTransaction: (conn) => (conn as TrinoConnection).cell.current.transactionId !== undefined
    })

    // Core would send `SAVEPOINT` inside the transaction, which Trino answers with a syntax error
    // that aborts it; a nested transaction fails before reaching the server instead.
    const coreWithTransaction = client.withTransaction
    const withTransaction: Client.SqlClient["withTransaction"] = (effect) =>
      Effect.flatMap(
        Effect.serviceOption(client.transactionService),
        Option.match({
          onNone: () => coreWithTransaction(effect),
          onSome: () =>
            Effect.suspend(() =>
              Effect.fail(
                new SqlError({
                  reason: new UnknownError({
                    cause: new Error("Trino does not support savepoints"),
                    message: "TrinoClient: nested transactions are not supported because Trino has no savepoints",
                    operation: "savepoint"
                  })
                })
              )
            )
        })
      )

    const extension: Omit<TrinoClient, keyof Client.Base> & Pick<TrinoClient, "withTransaction"> = {
      [TypeId]: TypeId,
      config,
      param: (type: string, value: unknown) => Statement.fragment([trinoParam(type, value, undefined)]),
      session: Effect.sync(() => base.current),
      withTransaction
    }
    return Object.assign(client, extension)
  })

/**
 * Provides both `TrinoClient` and `SqlClient` from a `Config`-backed
 * configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const layerConfig = (
  config: Config.Wrap<TrinoClientConfig>
): Layer.Layer<TrinoClient | Client.SqlClient, Config.ConfigError | SqlError, HttpClient.HttpClient> =>
  Layer.effectContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(TrinoClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Provides both `TrinoClient` and `SqlClient` from a configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const layer = (
  config: TrinoClientConfig
): Layer.Layer<TrinoClient | Client.SqlClient, SqlError, HttpClient.HttpClient> =>
  Layer.effectContext(
    Effect.map(make(config), (client) =>
      Context.make(TrinoClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Creates the Trino statement compiler: `?` placeholders, double-quoted
 * identifiers and `TrinoClient.param` typed parameters.
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const makeCompiler = (transform?: (_: string) => string): Statement.Compiler =>
  Statement.makeCompiler<TrinoCustom>({
    dialect: "trino",
    placeholder() {
      return "?"
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
      const value = new Literals.TypedValue(type.paramA, type.paramB)
      return [placeholder(value), [value]]
    }
  })

const escape = Statement.defaultEscape("\"")

/**
 * Custom statement segments understood by the Trino compiler.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export type TrinoCustom = TrinoParam

/**
 * A parameter with an explicit Trino type.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface TrinoParam extends Statement.Custom<"TrinoParam", string, unknown> {}

const trinoParam = Statement.custom<TrinoParam>("TrinoParam")
