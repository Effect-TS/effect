/**
 * A native PostgreSQL session built on the `PgProtocol` wire codec.
 *
 * `make` opens the transport (`node:net`, `node:tls`, a unix socket, or a
 * caller-supplied `Duplex` factory), performs the startup and authentication
 * exchange (trust, cleartext, MD5, and SCRAM-SHA-256), and resolves once the
 * backend sends `ReadyForQuery`. Releasing the scope sends `Terminate` and
 * destroys the socket. This module never imports `pg`.
 *
 * Beyond one-shot queries the session supports incremental result streaming,
 * `LISTEN`/`NOTIFY` subscriptions, best-effort query cancellation through a
 * `CancelRequest` side connection, and `pin` for exclusive ownership during
 * transactions.
 *
 * @since 4.0.0
 */
import type * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as EffectResult from "effect/Result"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import {
  AuthenticationError,
  ConnectionError,
  SqlError,
  type SqlErrorReason,
  UnknownError
} from "effect/unstable/sql/SqlError"
import { Buffer } from "node:buffer"
import { randomBytes } from "node:crypto"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"
import type { ConnectionOptions } from "node:tls"
import { type ConnectionInternals, internalsKey } from "./internal/connection.ts"
import { classifySqlState } from "./internal/sqlError.ts"
import * as PgAuth from "./PgAuth.ts"
import * as PgProtocol from "./PgProtocol.ts"
import * as PgTypes from "./PgTypes.ts"

/**
 * Runtime type identifier used to mark `PgConnection` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-pg/PgConnection"

/**
 * Type-level identifier used to mark `PgConnection` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-pg/PgConnection"

/**
 * Configuration for a single PostgreSQL session.
 *
 * A `url` is parsed as a libpq URI (`postgres://` or `postgresql://`);
 * explicit fields win over anything the URL carries. A `stream` factory wins
 * over `host`, `port`, and `path`. A `path` is used verbatim as the unix
 * socket path, while a `host` beginning with `/` is treated as a socket
 * directory and expands to `${host}/.s.PGSQL.${port}`.
 *
 * `prepare` keeps statements the session has run under a backend name, so a
 * repeated statement costs `Bind` / `Execute` / `Sync` and no planning. It is
 * on by default, bounded by `preparedStatementCacheSize`, and applies to
 * `query` and `queryValues`; `stream` always parses its statement. Turn it off
 * for a backend that cannot keep named statements between statements, such as
 * a connection pooler in statement mode. A cached plan is bound to the
 * `search_path` in force when it was parsed, the usual caveat for prepared
 * statements anywhere.
 *
 * `multiplex` marks the session as shareable between fibers. It does not
 * change how statements run - the wire always carries one statement at a
 * time - but it makes `interrupt` a no-op unless the connection is pinned,
 * because on a shared connection a `CancelRequest` could hit an unrelated
 * fiber's statement.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config {
  readonly url?: Redacted.Redacted | undefined
  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly path?: string | undefined
  readonly ssl?: boolean | ConnectionOptions | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined
  readonly connectTimeout?: Duration.Input | undefined
  readonly applicationName?: string | undefined
  readonly stream?: (() => Duplex) | undefined
  readonly types?: PgTypes.Registry | undefined
  readonly multiplex?: boolean | undefined
  readonly prepare?: boolean | undefined
  readonly preparedStatementCacheSize?: number | undefined
}

/**
 * Builds the prepared-statement cache a session should use, or `undefined`
 * when `prepare` is off or the cache is sized to nothing.
 */
const preparedCacheFor = (config: Config): PreparedCache | undefined => {
  if (config.prepare === false) return undefined
  const max = config.preparedStatementCacheSize ?? defaultPreparedStatements
  return max > 0 ? new PreparedCache(max) : undefined
}

/**
 * An object result row keyed by column name.
 *
 * @category models
 * @since 4.0.0
 */
export interface Row {
  readonly [column: string]: unknown
}

/**
 * Metadata for one result column.
 *
 * @category models
 * @since 4.0.0
 */
export interface Field {
  readonly name: string
  readonly dataTypeId: number
}

/**
 * The result of an unnamed extended query.
 *
 * @category models
 * @since 4.0.0
 */
export interface Result {
  readonly command: string
  readonly rowCount: number
  readonly oid: number | null
  readonly rows: ReadonlyArray<Row>
  readonly fields: ReadonlyArray<Field>
}

/**
 * A `NOTIFY` message received while listening on a channel.
 *
 * @category models
 * @since 4.0.0
 */
export interface Notification {
  readonly processId: number
  readonly channel: string
  readonly payload: string
}

/**
 * A single PostgreSQL session, connected and authenticated.
 *
 * Statements use the unnamed extended protocol and run one at a time. The
 * `CancelRequest` secret stays private.
 *
 * @category models
 * @since 4.0.0
 */
export interface PgConnection {
  readonly [TypeId]: TypeId
  readonly config: Config
  readonly processId: number
  /**
   * Exclusive ownership of the session until the scope closes.
   *
   * The returned `PgConnection` is a pinned view of the same session:
   * statements on it skip the ownership queue, and pinning it again is a
   * no-op, so `stream` and `listen` - which pin themselves - compose with an
   * enclosing transaction pin. Statements on the unpinned connection wait
   * until the pin is released.
   */
  readonly pin: Effect.Effect<PgConnection, never, Scope.Scope>
  /** Runs one unnamed extended query and returns object rows. */
  readonly query: (
    sql: string,
    params?: ReadonlyArray<unknown>
  ) => Effect.Effect<Result, SqlError>
  /** Runs one unnamed extended query and returns positional rows. */
  readonly queryValues: (
    sql: string,
    params?: ReadonlyArray<unknown>
  ) => Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError>
  /**
   * Runs one unnamed extended query, emitting object rows as they arrive
   * instead of collecting the full result.
   *
   * The session is pinned for the lifetime of the stream. Aborting the stream
   * before the result completes cancels the statement with a `CancelRequest`
   * and drains the connection back to `ReadyForQuery`.
   */
  readonly stream: (
    sql: string,
    params?: ReadonlyArray<unknown>
  ) => Stream.Stream<Row, SqlError>
  /**
   * `LISTEN` on a channel and emit each `Notification`.
   *
   * The session is pinned for the lifetime of the stream, and the finalizer
   * issues `UNLISTEN` before releasing the pin. Notifications are only
   * delivered while a listen stream is active.
   */
  readonly listen: (channel: string) => Stream.Stream<Notification, SqlError>
  /**
   * Best-effort cancellation of the statement currently running on this
   * session, via a `CancelRequest` on a side connection using the same
   * transport and TLS configuration. A no-op when `multiplex` is enabled and
   * the connection is not pinned, since the in-flight statement could belong
   * to another fiber. Never fails.
   */
  readonly interrupt: Effect.Effect<void>
}

/**
 * Service tag for a PostgreSQL session.
 *
 * @category services
 * @since 4.0.0
 */
export const PgConnection = Context.Service<PgConnection>("@effect/sql-pg/PgConnection")

/**
 * Connects and authenticates a single PostgreSQL session.
 *
 * The connect exchange - transport, optional `SSLRequest`, startup, and
 * authentication - runs under `connectTimeout` (default 5 seconds) and
 * resolves once the backend sends `ReadyForQuery`. When the scope closes the
 * session sends `Terminate` and destroys the socket.
 *
 * TLS is never downgraded: with `ssl` set, a server that answers `N` to
 * `SSLRequest` fails the connect. Certificate verification follows Node
 * defaults for `ssl: true` and the given `ConnectionOptions` otherwise. Unix
 * sockets and custom streams should set `ssl.servername` explicitly because
 * they do not provide a usable TLS hostname.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Config): Effect.Effect<PgConnection, SqlError, Scope.Scope> =>
  Effect.suspend(() => {
    const resolved = resolveConfig(options)
    if (EffectResult.isFailure(resolved)) return Effect.fail(resolved.failure)
    const config = resolved.success
    return Effect.acquireRelease(
      Effect.map(
        connect(config),
        (session) => new PgConnectionImpl(options, config, session, options.types ?? PgTypes.makeRegistry())
      ),
      (connection) => Effect.sync(() => connection.closeUnsafe()),
      { interruptible: true }
    ).pipe(
      Effect.timeoutOrElse({
        duration: config.connectTimeout,
        orElse: () =>
          Effect.fail(
            new SqlError({
              reason: new ConnectionError({
                cause: new Error("Connection timed out"),
                message: "PgConnection: Connection timed out",
                operation: "connect"
              })
            })
          )
      })
    )
  })

interface Session {
  readonly socket: Duplex
  readonly parser: PgProtocol.Parser<unknown>
  readonly processId: number
  readonly secretKey: number
  readonly parameters: Map<string, string>
}

/**
 * The active protocol consumer: the state machine of the statement currently
 * on the wire. Messages the pump does not handle itself are forwarded here.
 */
interface Consumer {
  readonly onMessage: (message: PgProtocol.BackendMessage<unknown>) => void
  readonly onBatchEnd?: (() => void) | undefined
  readonly onFatal: (error: SqlError) => void
}

const abortDrainTimeoutMillis = 5000
const cancelRequestTimeoutMillis = 5000
const streamPauseThreshold = 512

class PgConnectionImpl implements PgConnection {
  readonly [TypeId]: TypeId = TypeId
  readonly config: Config
  readonly processId: number
  readonly session: Session
  readonly registry: PgTypes.Registry
  readonly bindEncoder: BindEncoder
  /** The statements this session has named, or `undefined` when disabled. */
  readonly prepared: PreparedCache | undefined
  readonly resolved: ResolvedConfig
  readonly multiplex: boolean
  /** Serializes statements: one in-flight extended-query cycle. */
  readonly wire = Semaphore.makeUnsafe(1)
  /** Exclusive-ownership queue used by `pin` and unpinned statements. */
  readonly owner = Semaphore.makeUnsafe(1)
  pinned = false
  consumer: Consumer | undefined
  deadWith: SqlError | undefined
  closed = false
  readonly channels = new Map<string, Set<Queue.Queue<Notification, SqlError | Cause.Done>>>()
  readonly fatalHooks = new Set<() => void>()
  readonly pinnedView: PgConnection
  readonly [internalsKey]: ConnectionInternals

  constructor(config: Config, resolved: ResolvedConfig, session: Session, registry: PgTypes.Registry) {
    this.config = config
    this.resolved = resolved
    this.session = session
    this.processId = session.processId
    this.registry = registry
    this.bindEncoder = makeBindEncoder(registry)
    this.prepared = preparedCacheFor(config)
    this.multiplex = config.multiplex ?? false
    this.pinnedView = new PinnedPgConnection(this)
    this[internalsKey] = {
      base: this,
      deadError: () => this.deadWith,
      fatalHooks: this.fatalHooks
    }
    session.socket.on("data", this.onData)
    session.socket.on("error", this.onSocketError)
    session.socket.on("close", this.onSocketClose)
  }

  private readonly onData = (chunk: Uint8Array): void => {
    try {
      this.session.parser.pushEach(chunk, this.dispatch)
    } catch (cause) {
      // A field reader that threw reports the row it could not decode; anything
      // else came out of the framing itself.
      return this.fatal(
        cause instanceof PgProtocol.ParseError
          ? connectionQueryError(cause, "PgConnection: Failed to parse server messages")
          : queryError(cause, "PgConnection: Failed to decode row")
      )
    }
    if (this.deadWith === undefined) this.consumer?.onBatchEnd?.()
  }

  private readonly onSocketError = (cause: Error): void =>
    this.fatal(connectionQueryError(cause, "PgConnection: Socket error"))

  private readonly onSocketClose = (): void =>
    this.fatal(connectionQueryError(new Error("Connection closed"), "PgConnection: Connection closed"))

  private readonly dispatch = (message: PgProtocol.BackendMessage<unknown>): void => {
    if (this.deadWith !== undefined) return
    switch (message._tag) {
      case "NotificationResponse": {
        const queues = this.channels.get(message.channel)
        if (queues !== undefined) {
          const notification: Notification = {
            processId: message.pid,
            channel: message.channel,
            payload: message.payload
          }
          for (const queue of queues) Queue.offerUnsafe(queue, notification)
        }
        return
      }
      case "ParameterStatus":
        this.session.parameters.set(message.name, message.value)
        return
      case "NoticeResponse":
        return
    }
    if (this.consumer !== undefined) return this.consumer.onMessage(message)
    if (message._tag === "ErrorResponse") {
      return this.fatal(
        new SqlError({
          reason: classifyFields(message.fields, "PgConnection: The server reported an error", "query")
        })
      )
    }
    this.fatal(
      connectionQueryError(
        new Error(`Unexpected ${message._tag} while idle`),
        `PgConnection: Unexpected ${message._tag} while idle`
      )
    )
  }

  /** Marks the session dead: destroys the socket, fails the active statement
   * and every listen queue, and notifies pool hooks unless the session's own
   * scope is being released. */
  fatal(error: SqlError): void {
    if (this.deadWith !== undefined) return
    this.deadWith = error
    this.session.socket.destroy()
    const consumer = this.consumer
    this.consumer = undefined
    consumer?.onFatal(error)
    const sets = Array.from(this.channels.values())
    this.channels.clear()
    const cause = Cause.fail(error)
    for (const set of sets) {
      for (const queue of set) Queue.failCauseUnsafe(queue, cause)
    }
    if (!this.closed) {
      for (const hook of this.fatalHooks) hook()
    }
  }

  closeUnsafe(): void {
    this.closed = true
    if (this.deadWith === undefined && this.session.socket.writable) {
      this.session.socket.write(PgProtocol.encodeTerminate())
    }
    this.fatal(
      new SqlError({
        reason: new ConnectionError({
          cause: new Error("Connection is closed"),
          message: "PgConnection: Connection is closed",
          operation: "query"
        })
      })
    )
  }

  /** Plans one execution. `cache` is `undefined` to force the unnamed path. */
  readonly encodeQuery = (
    sql: string,
    params: ReadonlyArray<unknown>,
    cache: PreparedCache | undefined
  ): Plan => encodeQuery(sql, params, this.registry, this.bindEncoder, cache)

  /** One extended-query cycle guarded by the wire permit. */
  readonly cycle = (
    sql: string,
    params: ReadonlyArray<unknown>,
    wantRows: boolean
  ): Effect.Effect<QueryOutput, SqlError> =>
    this.wire.withPermit(Effect.suspend(() => this.attempt(sql, params, wantRows, this.prepared)))

  /**
   * Runs one cycle. A reused statement the backend has since dropped, or whose
   * plan no longer matches its columns, is parsed again on a second attempt;
   * that attempt skips the cache, so it cannot loop.
   */
  private readonly attempt = (
    sql: string,
    params: ReadonlyArray<unknown>,
    wantRows: boolean,
    cache: PreparedCache | undefined
  ): Effect.Effect<QueryOutput, SqlError> => {
    if (this.deadWith !== undefined) return Effect.fail(this.deadWith)
    let plan: Plan
    try {
      plan = this.encodeQuery(sql, params, cache)
    } catch (cause) {
      return Effect.fail(queryError(cause, "PgConnection: Failed to encode query"))
    }
    const run = runQuery(this, plan, wantRows)
    if (cache === undefined || plan.parses) return run
    return Effect.catchCause(run, (cause) => {
      if (!plan.stale) return Effect.failCause(cause)
      cache.evict(plan.prepared!)
      return this.attempt(sql, params, wantRows, undefined)
    })
  }

  /** Sends a `CancelRequest` for this session on a side connection. */
  readonly cancel: Effect.Effect<void> = Effect.suspend(() => {
    if (this.deadWith !== undefined) return Effect.void
    return sendCancelRequest(this.resolved, this.session.processId, this.session.secretKey)
  })

  readonly pin: Effect.Effect<PgConnection, never, Scope.Scope> = Effect.acquireRelease(
    Effect.map(this.owner.take(1), () => {
      this.pinned = true
      return this.pinnedView
    }),
    () =>
      Effect.suspend(() => {
        this.pinned = false
        return this.owner.release(1)
      })
  )

  readonly query = (sql: string, params?: ReadonlyArray<unknown>): Effect.Effect<Result, SqlError> =>
    Effect.map(this.owner.withPermit(this.cycle(sql, params ?? emptyParams, true)), takeResult)

  readonly queryValues = (
    sql: string,
    params?: ReadonlyArray<unknown>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> =>
    Effect.map(this.owner.withPermit(this.cycle(sql, params ?? emptyParams, false)), takeValues)

  readonly stream = (sql: string, params?: ReadonlyArray<unknown>): Stream.Stream<Row, SqlError> =>
    streamRows(this, this.pin, sql, params ?? emptyParams)

  readonly listen = (channel: string): Stream.Stream<Notification, SqlError> => listenChannel(this, this.pin, channel)

  readonly interrupt: Effect.Effect<void> = Effect.suspend(() =>
    this.multiplex && !this.pinned ? Effect.void : this.cancel
  )
}

/**
 * The view of a session returned by `pin`: statements skip the ownership
 * queue and re-pinning is a no-op, making `pin` reentrant for `stream` and
 * `listen` running inside a transaction.
 */
class PinnedPgConnection implements PgConnection {
  readonly [TypeId]: TypeId = TypeId
  readonly base: PgConnectionImpl
  readonly [internalsKey]: ConnectionInternals

  constructor(base: PgConnectionImpl) {
    this.base = base
    this[internalsKey] = base[internalsKey]
  }

  get config(): Config {
    return this.base.config
  }

  get processId(): number {
    return this.base.processId
  }

  readonly pin: Effect.Effect<PgConnection, never, Scope.Scope> = Effect.sync(() => this as PgConnection)

  readonly query = (sql: string, params?: ReadonlyArray<unknown>): Effect.Effect<Result, SqlError> =>
    Effect.map(this.base.cycle(sql, params ?? emptyParams, true), takeResult)

  readonly queryValues = (
    sql: string,
    params?: ReadonlyArray<unknown>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> =>
    Effect.map(this.base.cycle(sql, params ?? emptyParams, false), takeValues)

  readonly stream = (sql: string, params?: ReadonlyArray<unknown>): Stream.Stream<Row, SqlError> =>
    streamRows(this.base, this.pin, sql, params ?? emptyParams)

  readonly listen = (channel: string): Stream.Stream<Notification, SqlError> =>
    listenChannel(this.base, this.pin, channel)

  readonly interrupt: Effect.Effect<void> = Effect.suspend(() => this.base.cancel)
}

interface QueryOutput {
  readonly result: Result
  readonly values: ReadonlyArray<ReadonlyArray<unknown>>
}

const INT32_MIN = -2147483648
const INT32_MAX = 2147483647

const inferredParameter = (oid: number, value: unknown): PgTypes.Parameter => ({
  [PgTypes.ParameterTypeId]: PgTypes.ParameterTypeId,
  oid,
  value
})

const inferScalar = (value: unknown): PgTypes.Parameter => {
  if (PgTypes.isParameter(value)) return value
  if (value === null || value === undefined) return inferredParameter(0, null)
  switch (typeof value) {
    case "boolean":
      return inferredParameter(PgTypes.OID.bool, value)
    case "bigint":
      return inferredParameter(PgTypes.OID.int8, value)
    case "number":
      if (Number.isInteger(value)) {
        if (value < INT32_MIN || value > INT32_MAX) {
          throw new PgTypes.CodecError({
            message: `Integer parameter ${value} is outside the int4 range; use bigint or PgTypes.int8`
          })
        }
        return inferredParameter(PgTypes.OID.int4, value)
      }
      return inferredParameter(PgTypes.OID.float8, value)
    case "string":
      return inferredParameter(PgTypes.OID.text, value)
  }
  if (value instanceof Date) {
    const time = value.getTime()
    if (Number.isNaN(time)) throw new PgTypes.CodecError({ message: "Invalid Date parameter" })
    return inferredParameter(PgTypes.OID.timestamptz, time)
  }
  if (value instanceof Uint8Array) return inferredParameter(PgTypes.OID.bytea, value)
  if (value instanceof Int8Array) {
    return inferredParameter(
      PgTypes.OID.bytea,
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    )
  }
  throw new PgTypes.CodecError({ message: `Cannot infer a PostgreSQL type for ${String(value)}` })
}

const inferParameter = (value: unknown, registry: PgTypes.Registry): PgTypes.Parameter => {
  if (!Array.isArray(value)) return inferScalar(value)
  if (value.length === 0) {
    throw new PgTypes.CodecError({ message: "Cannot infer the type of an empty array; use PgTypes.array" })
  }
  let elementOid: number | undefined
  const values: Array<unknown> = new Array(value.length)
  for (let index = 0; index < value.length; index++) {
    const element = value[index]
    if (Array.isArray(element)) {
      throw new PgTypes.CodecError({ message: "Nested array parameters are not supported" })
    }
    const parameter = inferScalar(element)
    if (parameter.oid === 0) {
      values[index] = null
      continue
    }
    if (Array.isArray(parameter.value)) {
      throw new PgTypes.CodecError({ message: "Nested array parameters are not supported" })
    }
    if (elementOid === undefined) elementOid = parameter.oid
    else if (elementOid !== parameter.oid) {
      throw new PgTypes.CodecError({ message: "Array parameter elements must have the same inferred OID" })
    }
    values[index] = parameter.value
  }
  if (elementOid === undefined) {
    throw new PgTypes.CodecError({ message: "Cannot infer the type of an array containing only null values" })
  }
  const arrayOid = PgTypes.arrayOidFor(elementOid, registry)
  if (arrayOid === undefined) {
    throw new PgTypes.CodecError({ message: `No array type known for element OID ${elementOid}` })
  }
  return inferredParameter(arrayOid, values)
}

/**
 * Joins the parts of a frame into the buffer that goes on the wire.
 *
 * `Buffer.allocUnsafe` hands out a slice of Node's pool, which costs a
 * fraction of a fresh `Uint8Array` of the same size and saves `socket.write`
 * the conversion it does for a plain view. Every byte is written before the
 * buffer is handed on, so the uninitialized memory never escapes.
 */
const concat = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  let length = 0
  for (let index = 0; index < chunks.length; index++) length += chunks[index].length
  const output = Buffer.allocUnsafe(length)
  let offset = 0
  for (let index = 0; index < chunks.length; index++) {
    output.set(chunks[index], offset)
    offset += chunks[index].length
  }
  return output
}

const emptyParams: ReadonlyArray<unknown> = []

const takeResult = (output: QueryOutput): Result => output.result
const takeValues = (output: QueryOutput): ReadonlyArray<ReadonlyArray<unknown>> => output.values

/**
 * The tail of every extended-query frame. `Describe` names the unnamed portal,
 * `Execute` runs it without a row limit, and `Sync` closes the cycle; none of
 * the three carries per-query state, so the bytes are encoded once.
 */
const describeExecuteSync: Uint8Array = concat([
  PgProtocol.encodeDescribe({ target: "portal", name: "" }),
  PgProtocol.encodeExecute({ portal: "", maxRows: 0 }),
  PgProtocol.encodeSync()
])

/** The same tail for a statement whose columns are already known. */
const executeSync: Uint8Array = concat([
  PgProtocol.encodeExecute({ portal: "", maxRows: 0 }),
  PgProtocol.encodeSync()
])

/** The default number of statements a connection keeps prepared. */
const defaultPreparedStatements = 100

/**
 * A statement the backend has parsed and holds under a name.
 *
 * `ready` turns true once `ParseComplete` confirms the backend has it and the
 * first execution has reported its columns. Until then the entry is treated as
 * a miss, which is safe because one cycle runs at a time. A `ready` entry with
 * no `description` describes a statement that returns no rows.
 */
interface Prepared {
  readonly name: string
  readonly key: string
  ready: boolean
  description: Description | undefined
}

/** One planned execution: the bytes to write and what to expect back. */
interface Plan {
  readonly frame: Uint8Array
  /** `CloseComplete` messages to consume before the cycle proper. */
  readonly closes: number
  /** Whether the frame carries a `Parse`. */
  readonly parses: boolean
  /** Whether the frame carries a `Describe`, so the columns arrive on the wire. */
  readonly describes: boolean
  /** The statement being filled in or reused, if this execution names one. */
  readonly prepared: Prepared | undefined
  /** Set when the columns were already known, so no `RowDescription` is coming. */
  readonly description: Description | undefined
  /** Set by the cycle when the backend rejected the name or the cached plan. */
  stale: boolean
}

/**
 * Builds one extended-query cycle as a single buffer, so a statement costs one
 * socket write.
 *
 * A statement the backend already holds under a name needs only
 * `Bind` / `Execute` / `Sync`: no `Parse` for the backend to plan and no
 * `Describe`, because the columns came back the first time and are cached with
 * the name. Statements evicted from the cache ride along as `Close` messages
 * rather than paying a round trip of their own.
 */
const encodeQuery = (
  sql: string,
  params: ReadonlyArray<unknown>,
  registry: PgTypes.Registry,
  encodeBind: BindEncoder,
  cache: PreparedCache | undefined
): Plan => {
  const count = params.length
  const parameters: Array<PgTypes.Parameter> = new Array(count)
  const parameterTypes: Array<number> = new Array(count)
  for (let index = 0; index < count; index++) {
    const parameter = inferParameter(params[index], registry)
    parameters[index] = parameter
    parameterTypes[index] = parameter.oid
  }

  if (cache === undefined) {
    const parse = PgProtocol.encodeParse({ name: "", query: sql, parameterTypes })
    if (EffectResult.isFailure(parse)) throw parse.failure
    const bind = encodeBind({ portal: "", statement: "", parameters })
    if (EffectResult.isFailure(bind)) throw bind.failure
    return {
      frame: concat([parse.success, bind.success, describeExecuteSync]),
      closes: 0,
      parses: true,
      describes: true,
      prepared: undefined,
      description: undefined,
      stale: false
    }
  }

  const prepared = cache.get(sql, parameterTypes)
  const bind = encodeBind({ portal: "", statement: prepared.name, parameters })
  if (EffectResult.isFailure(bind)) throw bind.failure
  const parse = prepared.ready ? undefined : PgProtocol.encodeParse({ name: prepared.name, query: sql, parameterTypes })
  if (parse !== undefined && EffectResult.isFailure(parse)) throw parse.failure
  const closeFrames = cache.takeCloses()

  if (parse === undefined) {
    return {
      frame: closeFrames === undefined
        ? concat([bind.success, executeSync])
        : concat([closeFrames.frames, bind.success, executeSync]),
      closes: closeFrames?.count ?? 0,
      parses: false,
      describes: false,
      prepared,
      description: prepared.description,
      stale: false
    }
  }

  return {
    frame: closeFrames === undefined
      ? concat([parse.success, bind.success, describeExecuteSync])
      : concat([closeFrames.frames, parse.success, bind.success, describeExecuteSync]),
    closes: closeFrames?.count ?? 0,
    parses: true,
    describes: true,
    prepared,
    description: undefined,
    stale: false
  }
}

/**
 * The statements one connection has prepared, keyed by SQL text and the
 * parameter OIDs inferred for it: the same text with differently typed
 * parameters is a different statement to the backend.
 *
 * The cache is bounded and evicts least-recently-used. An evicted statement is
 * closed on the backend, but its `Close` waits for the next statement to go
 * out rather than taking a round trip of its own.
 */
class PreparedCache {
  readonly max: number
  private readonly statements = new Map<string, Prepared>()
  private closes: Array<Uint8Array> | undefined
  private counter = 0

  constructor(max: number) {
    this.max = max
  }

  get(sql: string, parameterTypes: ReadonlyArray<number>): Prepared {
    const key = parameterTypes.length === 0 ? sql : `${sql}\u0000${parameterTypes.join(",")}`
    const found = this.statements.get(key)
    if (found !== undefined) {
      // Re-insert to move it to the end: `Map` iterates in insertion order, so
      // the first key is the least recently used one.
      this.statements.delete(key)
      this.statements.set(key, found)
      return found
    }
    const prepared: Prepared = { name: `effect${++this.counter}`, key, ready: false, description: undefined }
    this.statements.set(key, prepared)
    if (this.statements.size > this.max) {
      const oldest = this.statements.keys().next()
      if (!oldest.done) {
        const evicted = this.statements.get(oldest.value)!
        this.statements.delete(oldest.value)
        if (evicted.ready) this.close(evicted.name)
      }
    }
    return prepared
  }

  /**
   * Drops a statement the backend no longer holds, or whose plan went stale.
   *
   * The name is closed either way. A plan that went stale is still held under
   * it, and re-parsing would collide; a name the backend has already lost
   * ignores the `Close`, which Postgres treats as a success.
   */
  evict(prepared: Prepared): void {
    if (this.statements.delete(prepared.key) && prepared.ready) this.close(prepared.name)
  }

  private close(name: string): void {
    ;(this.closes ??= []).push(PgProtocol.encodeClose({ target: "statement", name }))
  }

  takeCloses(): { readonly frames: Uint8Array; readonly count: number } | undefined {
    const closes = this.closes
    if (closes === undefined) return undefined
    this.closes = undefined
    return { frames: closes.length === 1 ? closes[0] : concat(closes), count: closes.length }
  }
}

/**
 * SQLSTATEs that mean "this name is no longer usable": the backend lost the
 * statement, or the plan behind it no longer matches the columns it was
 * prepared for. Both are recovered by parsing the statement again.
 */
const isStalePreparedStatement = (code: string | undefined): boolean => code === "26000" || code === "0A000"

type BindEncoder = (options: {
  readonly portal: string
  readonly statement: string
  readonly parameters: ReadonlyArray<PgTypes.Parameter>
}) => EffectResult.Result<Uint8Array, PgProtocol.EncodeError | PgTypes.CodecError>

/** One bind encoder per registry, since building one allocates a closure. */
const makeBindEncoder = (registry: PgTypes.Registry): BindEncoder =>
  PgProtocol.makeBindEncoder(
    (sink: PgProtocol.ValueSink, parameter: PgTypes.Parameter) => PgTypes.writeParameter(sink, parameter, registry)
  )

const queryError = (cause: unknown, message: string): SqlError =>
  new SqlError({ reason: new UnknownError({ cause, message, operation: "query" }) })

const connectionQueryError = (cause: unknown, message: string): SqlError =>
  new SqlError({ reason: new ConnectionError({ cause, message, operation: "query" }) })

const escapeIdentifier = (identifier: string): string => `"${identifier.replaceAll("\"", "\"\"")}"`

type QueryPhase = "close" | "parse" | "bind" | "describe" | "rows" | "complete" | "error"

/**
 * Splits a command tag such as `SELECT 3` or `INSERT 0 1`. Reading the two
 * spaces directly keeps a completed statement from allocating the parts array
 * that splitting on every space would.
 */
const parseCommandTag = (tag: string): { command: string; rowCount: number; oid: number | null } => {
  const firstSpace = tag.indexOf(" ")
  if (firstSpace < 0) return { command: tag, oid: null, rowCount: 0 }
  const command = tag.slice(0, firstSpace)
  const secondSpace = tag.indexOf(" ", firstSpace + 1)
  if (command === "INSERT" && secondSpace > 0) {
    return {
      command,
      oid: Number(tag.slice(firstSpace + 1, secondSpace)),
      rowCount: Number(tag.slice(secondSpace + 1))
    }
  }
  const last = tag.slice((secondSpace < 0 ? firstSpace : secondSpace) + 1)
  return { command, oid: null, rowCount: isDigits(last) ? Number(last) : 0 }
}

const isDigits = (value: string): boolean => {
  if (value.length === 0) return false
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 48 || code > 57) return false
  }
  return true
}

const runQuery = (
  conn: PgConnectionImpl,
  plan: Plan,
  wantRows: boolean
): Effect.Effect<QueryOutput, SqlError> =>
  Effect.callback<QueryOutput, SqlError>((resume) => {
    if (conn.deadWith !== undefined) {
      resume(Effect.fail(conn.deadWith))
      return
    }
    const socket = conn.session.socket
    let done = false
    let aborted = false
    let drainDone: (() => void) | undefined
    const parser = conn.session.parser
    let closes = plan.closes
    let phase: QueryPhase = closes > 0 ? "close" : plan.parses ? "parse" : "bind"
    let fieldCount = plan.description?.resultFields.length ?? 0
    let resultFields: ReadonlyArray<Field> = plan.description?.resultFields ?? emptyFields
    let rowBuilder: RowBuilder | undefined = plan.description?.rowBuilder
    const rows: Array<Row> = []
    const values: Array<ReadonlyArray<unknown>> = []
    let command = ""
    let rowCount = 0
    let oid: number | null = null
    let failure: SqlError | undefined

    const finish = (effect: Effect.Effect<QueryOutput, SqlError>): void => {
      if (done) return
      done = true
      conn.consumer = undefined
      resume(effect)
    }
    const onFatal = (error: SqlError): void => {
      if (done) return
      done = true
      if (aborted) {
        drainDone?.()
      } else {
        resume(Effect.fail(error))
      }
    }
    // `conn.fatal` notifies the registered consumer; the direct `onFatal` call
    // covers the case where the connection was already dead.
    const failFatal = (error: SqlError): void => {
      conn.fatal(error)
      onFatal(error)
    }
    const failDesync = (message: string): void =>
      failFatal(connectionQueryError(new Error(message), `PgConnection: ${message}`))

    const onMessage = (message: PgProtocol.BackendMessage<unknown>): void => {
      if (aborted) {
        if (message._tag === "ReadyForQuery") {
          done = true
          conn.consumer = undefined
          drainDone?.()
        }
        return
      }
      if (phase === "error") {
        switch (message._tag) {
          case "ReadyForQuery":
            return finish(Effect.fail(failure!))
          default:
            return failDesync(`Unexpected ${message._tag} after ErrorResponse`)
        }
      }
      switch (message._tag) {
        case "CloseComplete":
          if (phase !== "close") return failDesync(`Unexpected CloseComplete during ${phase}`)
          if (--closes === 0) phase = plan.parses ? "parse" : "bind"
          return
        case "ParseComplete":
          if (phase !== "parse") return failDesync(`Unexpected ParseComplete during ${phase}`)
          phase = "bind"
          return
        case "BindComplete":
          if (phase !== "bind") return failDesync(`Unexpected BindComplete during ${phase}`)
          phase = plan.describes ? "describe" : "rows"
          return
        case "RowDescription": {
          if (phase !== "describe") return failDesync(`Unexpected RowDescription during ${phase}`)
          const description = describe(message.fields, conn.registry)
          if (EffectResult.isFailure(description)) {
            return failFatal(queryError(description.failure, "PgConnection: Failed to decode row"))
          }
          fieldCount = message.fields.length
          resultFields = description.success.resultFields
          rowBuilder = description.success.rowBuilder
          // The parser hands this message over before it reads the rows behind
          // it, so the columns decode in place from here on.
          parser.readField = description.success.readField
          if (plan.prepared !== undefined) {
            plan.prepared.description = description.success
            plan.prepared.ready = true
          }
          phase = "rows"
          return
        }
        case "NoData":
          if (phase !== "describe") return failDesync(`Unexpected NoData during ${phase}`)
          if (plan.prepared !== undefined) {
            plan.prepared.description = undefined
            plan.prepared.ready = true
          }
          phase = "rows"
          return
        case "DataRow": {
          if (phase !== "rows" || rowBuilder === undefined) {
            return failDesync(`Unexpected DataRow during ${phase}`)
          }
          const rowValues = message.values
          if (rowValues.length !== fieldCount) {
            return failDesync(`DataRow has ${rowValues.length} values for ${fieldCount} fields`)
          }
          if (wantRows) rows.push(rowBuilder(rowValues))
          else values.push(rowValues)
          return
        }
        case "CommandComplete": {
          if (phase !== "rows") return failDesync(`Unexpected CommandComplete during ${phase}`)
          const parsed = parseCommandTag(message.commandTag)
          command = parsed.command
          rowCount = parsed.rowCount
          oid = parsed.oid
          phase = "complete"
          return
        }
        case "EmptyQueryResponse":
          if (phase !== "rows") return failDesync(`Unexpected EmptyQueryResponse during ${phase}`)
          phase = "complete"
          return
        case "ErrorResponse": {
          if (isStalePreparedStatement(message.fields.code)) plan.stale = true
          // Every phase drains the same way: the backend skips the rest of the
          // cycle and sends `ReadyForQuery` after the `Sync` that closes it, so
          // a statement it refused to parse leaves the session usable.
          failure = new SqlError({
            reason: classifyFields(message.fields, "PgConnection: Query failed", "query")
          })
          phase = "error"
          return
        }
        case "ReadyForQuery": {
          if (phase !== "complete") return failDesync(`Unexpected ReadyForQuery during ${phase}`)
          return finish(Effect.succeed({
            result: { command, rowCount, oid, rows, fields: resultFields },
            values
          }))
        }
        case "CopyInResponse":
        case "CopyOutResponse":
        case "CopyBothResponse":
        case "CopyData":
        case "CopyDone":
          return failDesync(`Unexpected ${message._tag}; COPY is not supported`)
        default:
          return failDesync(`Unexpected ${message._tag} during ${phase}`)
      }
    }

    conn.consumer = { onMessage, onFatal }
    // A reused statement has no `RowDescription` coming, so its reader has to
    // be in place before the rows are.
    parser.readField = plan.description?.readField
    try {
      socket.write(plan.frame)
    } catch (cause) {
      failFatal(connectionQueryError(cause, "PgConnection: Failed to write query"))
    }

    // On interruption: cancel the statement and drain the connection back to
    // ReadyForQuery so it stays usable, destroying it when the drain stalls.
    return Effect.suspend(() => {
      if (done) return Effect.void
      aborted = true
      const wait = Effect.callback<void>((resumeWait) => {
        if (done) return resumeWait(Effect.void)
        const timer = setTimeout(
          () =>
            conn.fatal(connectionQueryError(
              new Error("Query cancellation timed out"),
              "PgConnection: Query cancellation timed out"
            )),
          abortDrainTimeoutMillis
        )
        drainDone = () => {
          clearTimeout(timer)
          resumeWait(Effect.void)
        }
      })
      return Effect.andThen(conn.cancel, wait)
    })
  })

/** Turns one decoded row into an object keyed by column name. */
type RowBuilder = (rowValues: ReadonlyArray<unknown>) => Row

/** Everything a query needs from one `RowDescription`. */
interface Description {
  readonly readField: PgProtocol.FieldReader<unknown>
  readonly rowBuilder: RowBuilder
  readonly resultFields: ReadonlyArray<Field>
}

const emptyFields: ReadonlyArray<Field> = []

/** Derives the per-column readers and the row constructor for a description. */
const describe = (
  fields: ReadonlyArray<PgProtocol.FieldDescription>,
  registry: PgTypes.Registry
): EffectResult.Result<Description, PgTypes.CodecError> => {
  const reader = PgTypes.makeFieldReader(fields, registry)
  if (EffectResult.isFailure(reader)) return EffectResult.fail(reader.failure)
  const resultFields: Array<Field> = new Array(fields.length)
  for (let index = 0; index < fields.length; index++) {
    resultFields[index] = { name: fields[index].name, dataTypeId: fields[index].dataTypeOid }
  }
  return EffectResult.succeed({
    readField: reader.success,
    rowBuilder: makeRowBuilder(fields),
    resultFields
  })
}

/**
 * Builds the row constructor for one `RowDescription`.
 *
 * Assignment is an order of magnitude faster than `Object.defineProperty` and
 * stores the same own, enumerable, writable, configurable property - except
 * for `__proto__`, which assignment routes to the prototype setter instead. A
 * description carrying that column name falls back to the slow spelling.
 */
const makeRowBuilder = (fields: ReadonlyArray<PgProtocol.FieldDescription>): RowBuilder => {
  const names: Array<string> = new Array(fields.length)
  let hasProto = false
  for (let index = 0; index < fields.length; index++) {
    const name = fields[index].name
    names[index] = name
    if (name === "__proto__") hasProto = true
  }
  if (hasProto) {
    return (rowValues) => {
      const row: Record<string, unknown> = {}
      for (let index = 0; index < names.length; index++) {
        Object.defineProperty(row, names[index], {
          value: rowValues[index],
          enumerable: true,
          configurable: true,
          writable: true
        })
      }
      return row
    }
  }
  return (rowValues) => {
    const row: Record<string, unknown> = {}
    for (let index = 0; index < names.length; index++) {
      row[names[index]] = rowValues[index]
    }
    return row
  }
}

const streamRows = (
  conn: PgConnectionImpl,
  pin: Effect.Effect<PgConnection, never, Scope.Scope>,
  sql: string,
  params: ReadonlyArray<unknown>
): Stream.Stream<Row, SqlError> =>
  Stream.fromChannel(Channel.fromTransform(Effect.fnUntraced(function*(_, scope) {
    yield* Scope.provide(pin, scope)
    yield* Scope.provide(
      Effect.acquireRelease(conn.wire.take(1), () => conn.wire.release(1)),
      scope
    )
    if (conn.deadWith !== undefined) return yield* Effect.fail(conn.deadWith)
    // Streams stay on the unnamed path: a stream pays its setup once over the
    // whole result, so naming the statement buys little and would need the
    // stale-plan retry to unwind rows already delivered.
    const plan = yield* Effect.try({
      try: () => conn.encodeQuery(sql, params, undefined),
      catch: (cause) => queryError(cause, "PgConnection: Failed to encode query")
    })
    const frame = plan.frame

    const socket = conn.session.socket
    const parser = conn.session.parser
    let phase: QueryPhase = "parse"
    let fieldCount = 0
    let rowBuilder: RowBuilder | undefined
    let buffer: Array<Row> = []
    let failure: SqlError | undefined
    let finished = false
    let done = false
    let aborted = false
    let paused = false
    let pending:
      | ((effect: Effect.Effect<Arr.NonEmptyReadonlyArray<Row>, SqlError | Cause.Done>) => void)
      | undefined
    let drainDone: (() => void) | undefined

    const setPaused = (value: boolean): void => {
      if (paused === value) return
      paused = value
      if (value) socket.pause()
      else socket.resume()
    }

    const deliver = (): void => {
      if (pending === undefined) return
      const resume = pending
      if (buffer.length > 0) {
        const chunk = buffer as Arr.NonEmptyArray<Row>
        buffer = []
        pending = undefined
        resume(Effect.succeed(chunk))
      } else if (finished) {
        pending = undefined
        resume(failure !== undefined ? Effect.fail(failure) : Cause.done())
      }
    }

    const onFatal = (error: SqlError): void => {
      if (done) return
      done = true
      finished = true
      if (failure === undefined) failure = error
      drainDone?.()
      deliver()
    }
    // `conn.fatal` notifies the registered consumer; the direct `onFatal` call
    // covers the case where the connection was already dead.
    const failFatal = (error: SqlError): void => {
      conn.fatal(error)
      onFatal(error)
    }
    const failDesync = (message: string): void =>
      failFatal(connectionQueryError(new Error(message), `PgConnection: ${message}`))

    const onMessage = (message: PgProtocol.BackendMessage<unknown>): void => {
      if (aborted) {
        if (message._tag === "ReadyForQuery") {
          done = true
          conn.consumer = undefined
          drainDone?.()
        }
        return
      }
      if (phase === "error") {
        switch (message._tag) {
          case "ReadyForQuery":
            finished = true
            done = true
            conn.consumer = undefined
            deliver()
            return
          default:
            return failDesync(`Unexpected ${message._tag} after ErrorResponse`)
        }
      }
      switch (message._tag) {
        case "ParseComplete":
          if (phase !== "parse") return failDesync(`Unexpected ParseComplete during ${phase}`)
          phase = "bind"
          return
        case "BindComplete":
          if (phase !== "bind") return failDesync(`Unexpected BindComplete during ${phase}`)
          phase = "describe"
          return
        case "RowDescription": {
          if (phase !== "describe") return failDesync(`Unexpected RowDescription during ${phase}`)
          const description = describe(message.fields, conn.registry)
          if (EffectResult.isFailure(description)) {
            return failFatal(queryError(description.failure, "PgConnection: Failed to decode row"))
          }
          fieldCount = message.fields.length
          rowBuilder = description.success.rowBuilder
          parser.readField = description.success.readField
          phase = "rows"
          return
        }
        case "NoData":
          if (phase !== "describe") return failDesync(`Unexpected NoData during ${phase}`)
          phase = "rows"
          return
        case "DataRow": {
          if (phase !== "rows" || rowBuilder === undefined) {
            return failDesync(`Unexpected DataRow during ${phase}`)
          }
          const rowValues = message.values
          if (rowValues.length !== fieldCount) {
            return failDesync(`DataRow has ${rowValues.length} values for ${fieldCount} fields`)
          }
          buffer.push(rowBuilder(rowValues))
          return
        }
        case "CommandComplete":
          if (phase !== "rows") return failDesync(`Unexpected CommandComplete during ${phase}`)
          phase = "complete"
          return
        case "EmptyQueryResponse":
          if (phase !== "rows") return failDesync(`Unexpected EmptyQueryResponse during ${phase}`)
          phase = "complete"
          return
        case "ErrorResponse": {
          failure = new SqlError({
            reason: classifyFields(message.fields, "PgConnection: Query failed", "query")
          })
          phase = "error"
          return
        }
        case "ReadyForQuery":
          if (phase !== "complete") return failDesync(`Unexpected ReadyForQuery during ${phase}`)
          finished = true
          done = true
          conn.consumer = undefined
          deliver()
          return
        case "CopyInResponse":
        case "CopyOutResponse":
        case "CopyBothResponse":
        case "CopyData":
        case "CopyDone":
          return failDesync(`Unexpected ${message._tag}; COPY is not supported`)
        default:
          return failDesync(`Unexpected ${message._tag} during ${phase}`)
      }
    }

    const onBatchEnd = (): void => {
      if (done || aborted) return
      if (pending !== undefined) deliver()
      else if (buffer.length >= streamPauseThreshold) setPaused(true)
    }

    // On early abort: cancel the statement and drain back to ReadyForQuery so
    // the pinned connection stays usable, destroying it when the drain stalls.
    yield* Scope.addFinalizer(
      scope,
      Effect.suspend(() => {
        if (done) return Effect.void
        aborted = true
        setPaused(false)
        const wait = Effect.callback<void>((resumeWait) => {
          if (done) return resumeWait(Effect.void)
          const timer = setTimeout(
            () =>
              conn.fatal(connectionQueryError(
                new Error("Stream cancellation timed out"),
                "PgConnection: Stream cancellation timed out"
              )),
            abortDrainTimeoutMillis
          )
          drainDone = () => {
            clearTimeout(timer)
            resumeWait(Effect.void)
          }
        })
        return Effect.andThen(conn.cancel, wait)
      })
    )

    conn.consumer = { onMessage, onBatchEnd, onFatal }
    parser.readField = undefined
    try {
      socket.write(frame)
    } catch (cause) {
      failFatal(connectionQueryError(cause, "PgConnection: Failed to write query"))
    }

    // @effect-diagnostics-next-line returnEffectInGen:off
    return Effect.callback<Arr.NonEmptyReadonlyArray<Row>, SqlError | Cause.Done>((resume) => {
      pending = resume
      setPaused(false)
      deliver()
      if (pending === undefined) return
      return Effect.sync(() => {
        if (pending === resume) pending = undefined
      })
    })
  })))

const listenChannel = (
  conn: PgConnectionImpl,
  pin: Effect.Effect<PgConnection, never, Scope.Scope>,
  channel: string
): Stream.Stream<Notification, SqlError> =>
  Stream.callback<Notification, SqlError>(
    Effect.fnUntraced(function*(queue) {
      const pinned = yield* pin
      if (conn.deadWith !== undefined) return yield* Effect.fail(conn.deadWith)
      const identifier = escapeIdentifier(channel)
      let queues = conn.channels.get(channel)
      if (queues === undefined) {
        queues = new Set()
        conn.channels.set(channel, queues)
      }
      queues.add(queue)
      yield* Effect.addFinalizer(() =>
        Effect.suspend(() => {
          const current = conn.channels.get(channel)
          // Cleaned up by a fatal error, or another stream still listens.
          if (current === undefined) return Effect.void
          current.delete(queue)
          if (current.size > 0) return Effect.void
          conn.channels.delete(channel)
          if (conn.deadWith !== undefined) return Effect.void
          return Effect.ignore(pinned.query(`UNLISTEN ${identifier}`))
        })
      )
      yield* pinned.query(`LISTEN ${identifier}`)
    }),
    { bufferSize: Number.MAX_SAFE_INTEGER }
  )

const sendCancelRequest = (config: ResolvedConfig, pid: number, secret: number): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    let done = false
    let socket: Duplex
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (): void => {
      if (done) return
      done = true
      if (timer !== undefined) clearTimeout(timer)
      socket?.destroy()
      resume(Effect.void)
    }
    const frame = PgProtocol.encodeCancelRequest({ pid, secret })
    // After the frame is written the server processes the request and closes
    // the connection, which lands in the `close` handler.
    const send = (): void => {
      socket.write(frame)
    }
    const begin = (): void => {
      if (config.ssl === false) return send()
      socket.once("data", (chunk: Uint8Array) => {
        if (done) return
        // Never send the cancel secret over a connection the server refused
        // to upgrade.
        if (chunk.length !== 1 || chunk[0] !== 0x53) return finish()
        const raw = socket
        raw.off("error", finish)
        raw.off("close", finish)
        socket = Tls.connect({
          host: config.host,
          ...(typeof config.ssl === "object" ? config.ssl : {}),
          socket: raw as Net.Socket
        })
        socket.on("error", finish)
        socket.on("close", finish)
        socket.once("secureConnect", send)
      })
      socket.write(PgProtocol.encodeSslRequest())
    }
    try {
      socket = config.stream !== undefined
        ? config.stream()
        : config.path !== undefined
        ? Net.connect({ path: config.path })
        : Net.connect({ host: config.host, port: config.port, noDelay: true })
    } catch {
      resume(Effect.void)
      return
    }
    timer = setTimeout(finish, cancelRequestTimeoutMillis)
    socket.on("error", finish)
    socket.on("close", finish)
    if (config.stream !== undefined) begin()
    else socket.once("connect", begin)
    return Effect.sync(finish)
  })

const connect = (config: ResolvedConfig): Effect.Effect<Session, SqlError> =>
  Effect.callback<Session, SqlError>((resume) => {
    let done = false
    let socket: Duplex
    let parser: PgProtocol.Parser<unknown> | undefined
    let sslErrorParser: PgProtocol.Parser | undefined
    let scram: PgAuth.ScramState | undefined
    let processId = 0
    let secretKey = 0
    const parameters = new Map<string, string>()

    const fail = (reason: SqlErrorReason): void => {
      if (done) return
      done = true
      socket?.destroy()
      resume(Effect.fail(new SqlError({ reason })))
    }
    const failConnect = (cause: unknown, message: string): void =>
      fail(new ConnectionError({ cause, message, operation: "connect" }))
    const failAuth = (cause: unknown, message: string): void =>
      fail(new AuthenticationError({ cause, message, operation: "connect" }))

    const onError = (cause: Error) => failConnect(cause, "PgConnection: Failed to connect")
    const onClose = () =>
      failConnect(new Error("Connection closed unexpectedly"), "PgConnection: Connection closed during startup")

    const password = (): string | undefined => {
      if (config.password === undefined) {
        failAuth(
          new Error("The server requested password authentication"),
          "PgConnection: No password configured"
        )
        return undefined
      }
      return config.password
    }

    const handleMessage = (message: PgProtocol.BackendMessage<unknown>): void => {
      switch (message._tag) {
        case "AuthenticationOk":
        case "NoticeResponse":
        case "NegotiateProtocolVersion":
          return
        case "AuthenticationCleartextPassword": {
          const secret = password()
          if (secret === undefined) return
          socket.write(PgProtocol.encodePasswordMessage({ password: secret }))
          return
        }
        case "AuthenticationMD5Password": {
          const secret = password()
          if (secret === undefined) return
          const hashed = PgAuth.md5Password({ user: config.username, password: secret, salt: message.salt })
          if (EffectResult.isFailure(hashed)) {
            return failAuth(hashed.failure, "PgConnection: MD5 authentication failed")
          }
          socket.write(PgProtocol.encodePasswordMessage({ password: hashed.success }))
          return
        }
        case "AuthenticationSASL": {
          if (!message.mechanisms.includes(PgAuth.SCRAM_SHA_256)) {
            return failAuth(
              new Error(`Unsupported SASL mechanisms: ${message.mechanisms.join(", ")}`),
              `PgConnection: Only ${PgAuth.SCRAM_SHA_256} is supported`
            )
          }
          const secret = password()
          if (secret === undefined) return
          const init = PgAuth.scramInit({ password: secret, nonce: randomBytes(18).toString("base64") })
          if (EffectResult.isFailure(init)) {
            return failAuth(init.failure, "PgConnection: SCRAM authentication failed")
          }
          scram = init.success.state
          socket.write(PgProtocol.encodeSASLInitialResponse({
            mechanism: PgAuth.SCRAM_SHA_256,
            initialResponse: init.success.response
          }))
          return
        }
        case "AuthenticationSASLContinue": {
          if (scram === undefined || scram._tag !== "ScramFirst") {
            return failConnect(new Error("Unexpected AuthenticationSASLContinue"), "PgConnection: Protocol desync")
          }
          const next = PgAuth.scramContinue(scram, message.data)
          if (EffectResult.isFailure(next)) {
            return failAuth(next.failure, "PgConnection: SCRAM authentication failed")
          }
          scram = next.success.state
          socket.write(PgProtocol.encodeSASLResponse({ data: next.success.response }))
          return
        }
        case "AuthenticationSASLFinal": {
          if (scram === undefined || scram._tag !== "ScramFinal") {
            return failConnect(new Error("Unexpected AuthenticationSASLFinal"), "PgConnection: Protocol desync")
          }
          const verified = PgAuth.scramFinish(scram, message.data)
          if (EffectResult.isFailure(verified)) {
            return failAuth(verified.failure, "PgConnection: SCRAM server verification failed")
          }
          scram = undefined
          return
        }
        case "AuthenticationUnsupported":
          return failAuth(
            new Error(`Authentication method ${message.method} is not supported`),
            "PgConnection: Unsupported authentication method"
          )
        case "ParameterStatus":
          parameters.set(message.name, message.value)
          return
        case "BackendKeyData":
          processId = message.pid
          secretKey = message.secret
          return
        case "ErrorResponse":
          return fail(classifyFields(message.fields, "PgConnection: Failed to connect", "connect"))
        case "ReadyForQuery":
          if (scram !== undefined) {
            return failAuth(
              new Error("The server completed authentication without proving its identity"),
              "PgConnection: SCRAM exchange did not complete"
            )
          }
          done = true
          socket.off("data", onData)
          socket.off("error", onError)
          socket.off("close", onClose)
          socket.on("error", ignoreError)
          resume(Effect.succeed({ socket, parser: parser!, processId, secretKey, parameters }))
          return
        default:
          return failConnect(
            new Error(`Unexpected ${message._tag} message during startup`),
            "PgConnection: Protocol desync"
          )
      }
    }

    const onData = (chunk: Uint8Array): void => {
      let messages: ReadonlyArray<PgProtocol.BackendMessage<unknown>>
      try {
        messages = parser!.push(chunk)
      } catch (cause) {
        return failConnect(cause, "PgConnection: Failed to parse server response")
      }
      for (const message of messages) {
        if (done) return
        handleMessage(message)
      }
    }

    const startup = (): void => {
      parser = PgProtocol.makeParser<unknown>()
      socket.on("data", onData)
      socket.write(PgProtocol.encodeStartupMessage({
        user: config.username,
        database: config.database,
        application_name: config.applicationName
      }))
    }

    const onSslResponse = (chunk: Uint8Array): void => {
      if (done) return
      if (sslErrorParser !== undefined || chunk[0] === 0x45) {
        sslErrorParser ??= PgProtocol.makeParser()
        let messages: ReadonlyArray<PgProtocol.BackendMessage>
        try {
          messages = sslErrorParser.push(chunk)
        } catch (cause) {
          return failConnect(cause, "PgConnection: Failed to parse SSLRequest error response")
        }
        if (messages.length === 0) return
        socket.off("data", onSslResponse)
        const message = messages[0]
        if (messages.length !== 1 || message._tag !== "ErrorResponse") {
          return failConnect(
            new Error("Expected one ErrorResponse after SSLRequest"),
            "PgConnection: Invalid SSLRequest response"
          )
        }
        return fail(classifyFields(message.fields, "PgConnection: Failed to negotiate TLS", "connect"))
      }
      socket.off("data", onSslResponse)
      if (chunk.length !== 1) {
        return failConnect(
          new Error(`Received ${chunk.length} bytes in response to SSLRequest`),
          "PgConnection: Invalid SSLRequest response"
        )
      }
      const response = PgProtocol.decodeSslResponse(chunk[0])
      if (EffectResult.isFailure(response)) {
        return failConnect(response.failure, "PgConnection: Invalid SSLRequest response")
      }
      if (response.success === "N") {
        return failConnect(new Error("The server does not support TLS"), "PgConnection: Server refused TLS")
      }
      const raw = socket
      raw.off("error", onError)
      raw.off("close", onClose)
      socket = Tls.connect({
        host: config.host,
        ...(typeof config.ssl === "object" ? config.ssl : {}),
        socket: raw as Net.Socket
      })
      socket.on("error", onError)
      socket.on("close", onClose)
      socket.once("secureConnect", startup)
    }

    const begin = (): void => {
      if (config.ssl === false) return startup()
      socket.on("data", onSslResponse)
      socket.write(PgProtocol.encodeSslRequest())
    }

    try {
      socket = config.stream !== undefined
        ? config.stream()
        : config.path !== undefined
        ? Net.connect({ path: config.path })
        : Net.connect({ host: config.host, port: config.port })
    } catch (cause) {
      resume(Effect.fail(
        new SqlError({
          reason: new ConnectionError({ cause, message: "PgConnection: Failed to connect", operation: "connect" })
        })
      ))
      return
    }
    socket.on("error", onError)
    socket.on("close", onClose)
    if (config.stream !== undefined) {
      begin()
    } else {
      socket.once("connect", begin)
    }

    return Effect.sync(() => {
      if (done) return
      done = true
      socket.destroy()
    })
  })

const ignoreError = (_: Error) => {}

interface ResolvedConfig {
  readonly host: string
  readonly port: number
  readonly path: string | undefined
  readonly ssl: boolean | ConnectionOptions
  readonly database: string | undefined
  readonly username: string
  readonly password: string | undefined
  readonly connectTimeout: Duration.Duration
  readonly applicationName: string
  readonly stream: (() => Duplex) | undefined
}

const configError = (message: string, cause?: unknown): SqlError =>
  new SqlError({
    reason: new ConnectionError({
      cause: cause ?? new Error(message),
      message: `PgConnection: ${message}`,
      operation: "connect"
    })
  })

const resolveConfig = (options: Config): EffectResult.Result<ResolvedConfig, SqlError> => {
  try {
    return EffectResult.succeed(resolveConfigUnsafe(options))
  } catch (error) {
    if (error instanceof SqlError) return EffectResult.fail(error)
    throw error
  }
}

const resolveConfigUnsafe = (options: Config): ResolvedConfig => {
  const url = options.url !== undefined ? parseUrl(Redacted.value(options.url)) : {}
  const host = options.host ?? url.host ?? "localhost"
  const port = options.port ?? url.port ?? 5432
  const username = options.username ?? url.username ?? process.env.USER ?? process.env.USERNAME
  if (username === undefined) {
    throw configError("No username configured")
  }
  return {
    host,
    port,
    path: options.path ?? (host.startsWith("/") ? `${host}/.s.PGSQL.${port}` : undefined),
    ssl: options.ssl ?? url.ssl ?? false,
    database: options.database ?? url.database,
    username,
    password: options.password !== undefined ? Redacted.value(options.password) : url.password,
    connectTimeout: Duration.fromInputUnsafe(options.connectTimeout ?? url.connectTimeout ?? Duration.seconds(5)),
    applicationName: options.applicationName ?? url.applicationName ?? "@effect/sql-pg",
    stream: options.stream
  }
}

interface UrlConfig {
  host?: string | undefined
  port?: number | undefined
  database?: string | undefined
  username?: string | undefined
  password?: string | undefined
  applicationName?: string | undefined
  connectTimeout?: Duration.Duration | undefined
  ssl?: boolean | undefined
}

const decodeComponent = (value: string, what: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    throw configError(`Invalid percent-encoding in URL ${what}`)
  }
}

const parsePort = (value: string, what: string): number => {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw configError(`Invalid port in URL ${what}: "${value}"`)
  }
  return port
}

const parseUrl = (raw: string): UrlConfig => {
  let url: URL
  try {
    url = new URL(raw)
  } catch (cause) {
    throw configError("Invalid connection URL", cause)
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw configError(`Unsupported connection URL protocol: "${url.protocol}"`)
  }

  const config: UrlConfig = {}
  if (url.hostname !== "") {
    config.host = url.hostname.startsWith("[") && url.hostname.endsWith("]")
      ? url.hostname.slice(1, -1)
      : decodeComponent(url.hostname, "host")
  }
  if (url.port !== "") config.port = parsePort(url.port, "authority")
  if (url.username !== "") config.username = decodeComponent(url.username, "username")
  if (url.password !== "") config.password = decodeComponent(url.password, "password")
  const database = decodeComponent(url.pathname.replace(/^\//, ""), "database")
  if (database !== "") config.database = database

  for (const [key, value] of url.searchParams) {
    switch (key) {
      case "host":
        config.host = value
        break
      case "port":
        config.port = parsePort(value, "port parameter")
        break
      case "user":
        config.username = value
        break
      case "password":
        config.password = value
        break
      case "dbname":
        config.database = value
        break
      case "application_name":
        config.applicationName = value
        break
      case "connect_timeout": {
        const seconds = Number(value)
        if (!Number.isInteger(seconds) || seconds < 0) {
          throw configError(`Invalid connect_timeout in URL: "${value}"`)
        }
        config.connectTimeout = seconds === 0 ? Duration.infinity : Duration.seconds(seconds)
        break
      }
      case "sslmode":
        switch (value) {
          case "disable":
            config.ssl = false
            break
          case "require":
          case "verify-ca":
          case "verify-full":
            config.ssl = true
            break
          case "prefer":
          case "allow":
            throw configError(`sslmode "${value}" is not supported: set ssl explicitly to true or false`)
          default:
            throw configError(`Unrecognized sslmode in URL: "${value}"`)
        }
        break
        // Unknown query parameters are ignored, matching libpq.
    }
  }
  return config
}

const classifyFields = (
  fields: PgProtocol.ErrorFields,
  message: string,
  operation: string
): SqlErrorReason => {
  const cause = Object.assign(new Error(fields.message ?? "Unknown PostgreSQL error"), fields)
  return classifySqlState(fields.code, fields.constraint, { cause, message, operation })
}
