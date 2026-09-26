/**
 * Native MySQL sessions built on the `MysqlProtocol` wire codec.
 *
 * A session owns one socket. It negotiates capabilities, authenticates, and
 * runs one command at a time: MySQL numbers every packet within a command and
 * has no equivalent of the sync points that let a PostgreSQL connection
 * pipeline, so commands are serialized on the wire rather than interleaved.
 *
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as EffectResult from "effect/Result"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import { AuthenticationError, ConnectionError, SqlError } from "effect/unstable/sql/SqlError"
import * as SqlStream from "effect/unstable/sql/SqlStream"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"
import type { ConnectionOptions } from "node:tls"
import { configError, parseUrl, type UrlConfig } from "./internal/config.ts"
import { type ConnectionInternals, internalsKey } from "./internal/connection.ts"
import { bindParameters as bindText } from "./internal/escape.ts"
import {
  binaryRows,
  Completed,
  decodedAs,
  drainReply,
  makeReader,
  type PacketReader,
  type Prepared,
  readAcknowledgement,
  readPrepared,
  readReply,
  readStream,
  type RowDecoder,
  type Take,
  take,
  textRows
} from "./internal/reply.ts"
import { classifyErr, connectionError, queryError } from "./internal/sqlError.ts"
import * as MysqlAuth from "./MysqlAuth.ts"
import * as MysqlProtocol from "./MysqlProtocol.ts"
import * as MysqlTypes from "./MysqlTypes.ts"

/**
 * The runtime type identifier for `MysqlConnection`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-mysql/MysqlConnection"

/**
 * The type-level identifier for `MysqlConnection`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-mysql/MysqlConnection"

/**
 * Connection settings for a MySQL session.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config {
  /**
   * A `mysql://` connection string. The fields below override whatever it
   * carries, so a URL can supply the defaults and an option correct one.
   */
  readonly url?: Redacted.Redacted | undefined

  /** Defaults to `localhost`. */
  readonly host?: string | undefined
  /** Defaults to `3306`. */
  readonly port?: number | undefined
  /** A Unix domain socket path, used in place of `host` and `port`. */
  readonly path?: string | undefined
  /**
   * Upgrades the connection to TLS. Off by default, which is why
   * `mysql_clear_password` is refused unless this is set.
   */
  readonly ssl?: boolean | ConnectionOptions | undefined
  readonly database?: string | undefined
  /** Falls back to the `USER` or `USERNAME` environment variable. */
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined

  /** How long the socket and handshake have to complete. Defaults to 5s. */
  readonly connectTimeout?: Duration.Input | undefined

  /**
   * Supplies the transport, in place of opening a socket. Use it for a proxy
   * or a cloud connector that hands back an already-routed duplex stream.
   */
  readonly stream?: (() => Duplex) | undefined

  /**
   * The session time zone, set once the connection is established. Defaults to
   * `+00:00`, which makes `DATETIME` and `TIMESTAMP` decode deterministically
   * rather than following the server's zone.
   */
  readonly timezone?: string | undefined

  /**
   * Decodes `BIGINT` as a `number` rather than a `bigint`. Convenient, and
   * lossy above 2^53, so it is off by default.
   */
  readonly bigintAsNumber?: boolean | undefined

  /**
   * Decodes `DATETIME`, `TIMESTAMP` and `TIME` as strings rather than as epoch
   * milliseconds and microsecond durations.
   */
  readonly dateStrings?: boolean | undefined

  /**
   * Prepares statements and caches them per connection. Enabled by default.
   * Disable it for proxies that cannot keep a statement between commands.
   */
  readonly prepare?: boolean | undefined

  /** How many statements a connection keeps prepared. Defaults to `100`. */
  readonly preparedStatementCacheSize?: number | undefined

  /** Maximum joined message size in bytes. Defaults to 64 MiB. */
  readonly maxMessageSize?: number | undefined
}

/**
 * A result row, keyed by column name.
 *
 * @category models
 * @since 4.0.0
 */
export interface Row {
  readonly [column: string]: unknown
}

/**
 * The outcome of one statement.
 *
 * **Details**
 *
 * A statement either returns a result set or returns counters, and which of
 * the two it was is carried rather than left to be inferred from an empty
 * column list. `affectedRows` and `lastInsertId` appear only where they mean
 * something, so a `SELECT` cannot be asked for an insert id.
 *
 * @category models
 * @since 4.0.0
 */
export type Result = Data.TaggedEnum<{
  /** A statement that returned a result set. */
  readonly ResultSet: {
    readonly rows: ReadonlyArray<Row>
    readonly columns: ReadonlyArray<MysqlProtocol.Column>
    readonly warnings: number
    readonly info: string
  }
  /** A statement that returned counters instead of rows. */
  readonly Ok: {
    readonly affectedRows: number | bigint
    readonly lastInsertId: number | bigint
    readonly warnings: number
    readonly info: string
  }
}>

/**
 * Constructors and refinements for `Result`, plus `rowsOf` for the common
 * case of wanting a statement's rows and treating one that produced none as
 * empty.
 *
 * @category models
 * @since 4.0.0
 */
export const Result = {
  // Spelled out rather than assigned onto `Data.taggedEnum`'s result: that is
  // a proxy which manufactures a constructor for any property read from it,
  // so an added helper is shadowed by a constructor of the same name.
  ...(({ $is, $match, Ok, ResultSet }) => ({ $is, $match, Ok, ResultSet }))(Data.taggedEnum<Result>()),
  /** A statement's rows, or none when it returned counters instead. */
  rowsOf: (self: Result): ReadonlyArray<Row> => self._tag === "ResultSet" ? self.rows : []
} as const

/**
 * A MySQL session.
 *
 * @category services
 * @since 4.0.0
 */
export interface MysqlConnection {
  readonly [TypeId]: TypeId
  readonly config: Config
  /** The server's id for this session, which `KILL` takes. */
  readonly connectionId: number
  readonly serverVersion: string
  /** The capability flags both sides agreed on. */
  readonly capabilities: number

  /**
   * Runs a text statement and returns one entry per result the server sent.
   * A multi-statement request produces one entry per statement, in order.
   */
  readonly query: (sql: string) => Effect.Effect<ReadonlyArray<Result>, SqlError>

  /** Runs a text statement and returns each result's rows as arrays. */
  readonly queryValues: (sql: string) => Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError>

  /**
   * Prepares a statement, binds its parameters and runs it over the binary
   * protocol. The statement is cached, so preparing it costs an extra round
   * trip only the first time.
   *
   * **Gotchas**
   *
   * A prepared statement carries exactly one statement, so a multi-statement
   * request has to go through `query`.
   */
  readonly execute: (
    sql: string,
    params: ReadonlyArray<unknown>
  ) => Effect.Effect<ReadonlyArray<Result>, SqlError>

  /** Runs a prepared statement and returns its rows as arrays. */
  readonly executeValues: (
    sql: string,
    params: ReadonlyArray<unknown>
  ) => Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError>

  /**
   * Runs a statement and emits its rows as they arrive, pausing the socket
   * when the consumer falls behind.
   *
   * **Gotchas**
   *
   * The session is held for as long as the stream is open. Abandoning a stream
   * before its last row cancels the statement with `KILL QUERY` and drains the
   * rest of the reply, because a half-read result would desync the next
   * command.
   */
  readonly stream: (
    sql: string,
    params: ReadonlyArray<unknown>
  ) => Stream.Stream<Row, SqlError>

  readonly ping: Effect.Effect<void, SqlError>
}

/**
 * The service tag for `MysqlConnection`.
 *
 * @category services
 * @since 4.0.0
 */
export const MysqlConnection = Context.Service<MysqlConnection>("@effect/sql-mysql/MysqlConnection")

/**
 * Opens a MySQL session, closing it when the scope closes.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Config): Effect.Effect<MysqlConnection, SqlError, Scope.Scope> =>
  Effect.flatMap(resolveConfig(options), (config) =>
    Effect.acquireRelease(
      connect(config).pipe(
        Effect.timeoutOrElse({
          duration: config.connectTimeout,
          orElse: () =>
            Effect.fail(
              new SqlError({
                reason: new ConnectionError({
                  cause: new Error("Connection timed out"),
                  message: "MysqlConnection: Connection timed out",
                  operation: "connect"
                })
              })
            )
        }),
        Effect.flatMap((session) => {
          const connection = new MysqlConnectionImpl(options, config, session)
          return Effect.as(connection.initialize(config), connection)
        })
      ),
      (connection) => Effect.sync(() => connection.closeUnsafe()),
      { interruptible: true }
    ))

// -----------------------------------------------------------------------------
// session
// -----------------------------------------------------------------------------

interface Session {
  socket: Duplex
  readonly parser: MysqlProtocol.Parser
  readonly handshake: MysqlProtocol.Handshake
  readonly capabilities: number
}

/**
 * Receives the packets of the command currently on the wire. A command
 * installs one for as long as it runs.
 */
interface Consumer {
  readonly onPacket: (packet: MysqlProtocol.Packet) => void
  readonly onFatal: (error: SqlError) => void
}

/**
 * What a session is doing.
 *
 * Being dead and having a command in flight are not combinable, and neither
 * is being idle and holding a consumer, so the two are one value rather than
 * two fields that could disagree.
 */
type SessionState = Data.TaggedEnum<{
  readonly Idle: {}
  readonly Busy: { readonly consumer: Consumer }
  readonly Dead: { readonly error: SqlError }
}>

const SessionState = Data.taggedEnum<SessionState>()

const idle = SessionState.Idle()

/** How long a cancelled command has to drain before the session is written off. */
const drainTimeoutMillis = 5000

/** How many statements a connection keeps prepared unless told otherwise. */
const defaultPreparedStatements = 100

/** A statement the server has prepared on this connection. */

/**
 * Keeps prepared statements per connection, evicting the least recently used.
 *
 * Statement handles belong to the connection that made them, and the cache key
 * is the SQL alone: unlike a PostgreSQL `Parse`, a MySQL prepare does not fix
 * the parameter types, which are sent with each execution instead.
 *
 * `COM_STMT_CLOSE` has no reply, so an eviction costs no round trip: its frame
 * rides along with the next request.
 */
class PreparedCache {
  private readonly entries = new Map<string, Prepared>()
  private closes: Array<Uint8Array> = []
  readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
  }

  get(sql: string): Prepared | undefined {
    const entry = this.entries.get(sql)
    if (entry === undefined) return undefined
    // Re-inserting moves the entry to the end, which is what makes the map's
    // insertion order an LRU order.
    this.entries.delete(sql)
    this.entries.set(sql, entry)
    return entry
  }

  set(sql: string, prepared: Prepared): void {
    this.entries.set(sql, prepared)
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next()
      if (oldest.done === true) break
      const evicted = this.entries.get(oldest.value)!
      this.entries.delete(oldest.value)
      this.closes.push(MysqlProtocol.encodeStmtClose(evicted.statementId))
    }
  }

  takeCloses(): Array<Uint8Array> {
    if (this.closes.length === 0) return []
    const taken = this.closes
    this.closes = []
    return taken
  }
}

/** Joins request frames into the single write that carries them. */
const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  if (parts.length === 1) return parts[0]
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

class MysqlConnectionImpl implements MysqlConnection {
  readonly [TypeId]: TypeId = TypeId
  readonly config: Config
  readonly resolved: ResolvedConfig
  readonly session: Session
  readonly connectionId: number
  readonly serverVersion: string
  readonly capabilities: number

  /** Serializes commands: MySQL answers one request at a time. */
  readonly wire = Semaphore.makeUnsafe(1)

  readonly prepared: PreparedCache | undefined

  state: SessionState = idle
  closed = false
  readonly fatalHooks = new Set<() => void>()

  readonly [internalsKey]: ConnectionInternals

  constructor(config: Config, resolved: ResolvedConfig, session: Session) {
    this.config = config
    this.resolved = resolved
    this.session = session
    this.connectionId = session.handshake.connectionId
    this.serverVersion = session.handshake.serverVersion
    this.capabilities = session.capabilities
    this.prepared = resolved.prepare ? new PreparedCache(resolved.preparedStatementCacheSize) : undefined
    this[internalsKey] = {
      isDead: () => SessionState.$is("Dead")(this.state),
      fatalHooks: this.fatalHooks
    }
    session.socket.on("data", this.onData)
    session.socket.on("error", this.onSocketError)
    session.socket.on("close", this.onSocketClose)
  }

  /** Applies the session settings that make decoding deterministic. */
  initialize(config: ResolvedConfig): Effect.Effect<void, SqlError> {
    return Effect.asVoid(this.query(`SET time_zone = '${config.timezone.replaceAll("'", "''")}'`))
  }

  private readonly onData = (chunk: Uint8Array): void => {
    try {
      this.session.parser.pushEach(chunk, this.dispatch)
    } catch (cause) {
      this.fatal(connectionError(cause, "MysqlConnection: Failed to parse server response", "execute"))
    }
  }

  private readonly dispatch = (packet: MysqlProtocol.Packet): void => {
    const state = this.state
    if (!SessionState.$is("Busy")(state)) {
      this.fatal(connectionError(
        new Error("Received a packet with no command in flight"),
        "MysqlConnection: Protocol desync",
        "execute"
      ))
      return
    }
    state.consumer.onPacket(packet)
  }

  private readonly onSocketError = (cause: Error): void => {
    this.fatal(connectionError(cause, "MysqlConnection: Connection failed", "execute"))
  }

  private readonly onSocketClose = (): void => {
    this.fatal(connectionError(
      new Error("Connection closed unexpectedly"),
      "MysqlConnection: Connection closed",
      "execute"
    ))
  }

  /** Kills the session and fails whatever was on the wire. */
  fatal(error: SqlError, destroySocket = true): void {
    if (SessionState.$is("Dead")(this.state)) return
    const previous = this.state
    this.state = SessionState.Dead({ error })
    if (destroySocket) this.session.socket.destroy()
    if (SessionState.$is("Busy")(previous)) previous.consumer.onFatal(error)
    if (this.closed) return
    for (const hook of this.fatalHooks) hook()
    this.fatalHooks.clear()
  }

  closeUnsafe(): void {
    if (this.closed) return
    this.closed = true
    const socket = this.session.socket
    socket.off("data", this.onData)
    socket.off("error", this.onSocketError)
    socket.off("close", this.onSocketClose)
    socket.on("error", ignoreError)
    try {
      socket.end(MysqlProtocol.encodeQuit())
    } catch {
      socket.destroy()
    }
  }

  /**
   * Writes a request and feeds every packet of its reply to `machine`, which
   * settles the effect when the command completes.
   */
  query(sql: string): Effect.Effect<ReadonlyArray<Result>, SqlError> {
    return runCommand(
      this,
      MysqlProtocol.encodeQuery(sql),
      "execute",
      (reader) => readResults(reader, textRows(this.resolved.decode))
    )
  }

  queryValues(sql: string): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> {
    return runCommand(
      this,
      MysqlProtocol.encodeQuery(sql),
      "execute",
      (reader) => readValues(reader, textRows(this.resolved.decode))
    )
  }

  /**
   * Returns the server's handle for `sql`, preparing it when the cache misses.
   */
  private prepareStatement(sql: string): Effect.Effect<Prepared, SqlError> {
    return Effect.suspend(() => {
      const cache = this.prepared
      const cached = cache?.get(sql)
      if (cached !== undefined) return Effect.succeed(cached)
      const closes = cache?.takeCloses() ?? []
      const request = concat([...closes, MysqlProtocol.encodeStmtPrepare(sql)])
      return Effect.tap(
        runCommand(this, request, "prepare", (reader) => readPrepared(reader.one)),
        (prepared) => Effect.sync(() => cache?.set(sql, prepared))
      )
    })
  }

  /**
   * Builds the request that runs a statement, preparing it when preparation is
   * enabled and writing the parameters into the SQL when it is not.
   */
  private request(
    sql: string,
    params: ReadonlyArray<unknown>,
    operation: string
  ): Effect.Effect<{ readonly bytes: Uint8Array; readonly rows: RowDecoder }, SqlError> {
    if (!this.resolved.prepare) {
      return Effect.map(
        Effect.try({
          try: () => bindText(sql, params),
          catch: (cause) => queryError(cause, "MysqlConnection: Failed to bind statement parameters", operation)
        }),
        (text) => ({ bytes: MysqlProtocol.encodeQuery(text), rows: textRows(this.resolved.decode) })
      )
    }
    return Effect.flatMap(this.prepareStatement(sql), (prepared) => {
      if (prepared.parameterCount !== params.length) {
        return Effect.fail(queryError(
          new Error(`Statement takes ${prepared.parameterCount} parameter(s) but ${params.length} were supplied`),
          "MysqlConnection: Wrong number of parameters",
          operation
        ))
      }
      const bound = MysqlTypes.bindParameters(params)
      if (EffectResult.isFailure(bound)) {
        return Effect.fail(queryError(
          bound.failure,
          "MysqlConnection: Failed to bind statement parameters",
          operation
        ))
      }
      // Preparing this statement may have evicted another. Its close frame
      // rides along here rather than waiting for the next prepare, which may
      // never come.
      return Effect.succeed({
        bytes: concat([
          ...(this.prepared?.takeCloses() ?? []),
          MysqlProtocol.encodeStmtExecute({
            statementId: prepared.statementId,
            parameters: bound.success
          })
        ]),
        rows: binaryRows(this.resolved.decode)
      })
    })
  }

  private runPrepared(sql: string, params: ReadonlyArray<unknown>): Effect.Effect<ReadonlyArray<Result>, SqlError> {
    return Effect.flatMap(
      this.request(sql, params, "execute"),
      (plan) => runCommand(this, plan.bytes, "execute", (reader) => readResults(reader, plan.rows))
    )
  }

  private runPreparedValues(
    sql: string,
    params: ReadonlyArray<unknown>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> {
    return Effect.flatMap(
      this.request(sql, params, "execute"),
      (plan) => runCommand(this, plan.bytes, "execute", (reader) => readValues(reader, plan.rows))
    )
  }

  /** Cancels the statement on the wire, on a connection of its own. */
  get killQuery(): Effect.Effect<void> {
    return Effect.scoped(
      Effect.flatMap(make(this.config), (side) => side.query(`KILL QUERY ${this.connectionId}`))
    ).pipe(
      Effect.timeoutOrElse({ duration: Duration.millis(drainTimeoutMillis), orElse: () => Effect.void }),
      Effect.ignore
    )
  }

  stream(sql: string, params: ReadonlyArray<unknown>): Stream.Stream<Row, SqlError> {
    return Stream.unwrap(Effect.map(
      this.request(sql, params, "stream"),
      (plan) => streamOf(this, plan.bytes, plan.rows)
    ))
  }

  execute(sql: string, params: ReadonlyArray<unknown>): Effect.Effect<ReadonlyArray<Result>, SqlError> {
    return this.runPrepared(sql, params)
  }

  executeValues(
    sql: string,
    params: ReadonlyArray<unknown>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> {
    return this.runPreparedValues(sql, params)
  }

  get ping(): Effect.Effect<void, SqlError> {
    return runCommand(
      this,
      MysqlProtocol.encodePing(),
      "ping",
      (reader) => readAcknowledgement(reader.one, "MysqlConnection: Ping failed", "ping")
    )
  }
}

const ignoreError = (_: Error) => {}

// -----------------------------------------------------------------------------
// text query machine
// -----------------------------------------------------------------------------

/**
 * Builds the row decoder for a result set, once its columns are known.
 */

const rowsOfCompleted = <A>(completed: Completed<A>): ReadonlyArray<A> =>
  Completed.$match(completed, {
    ResultSet: ({ rows }) => rows,
    Ok: () => []
  })

const asResult = <A>(completed: Completed<A>): Result =>
  Completed.$match(completed, {
    ResultSet: ({ columns, ok, rows }) =>
      Result.ResultSet({
        rows: rows as ReadonlyArray<Row>,
        columns,
        warnings: ok.warnings,
        info: ok.info
      }),
    Ok: ({ ok }) =>
      Result.Ok({
        affectedRows: ok.affectedRows,
        lastInsertId: ok.lastInsertId,
        warnings: ok.warnings,
        info: ok.info
      })
  })

/**
 * Reads the reply to `COM_STMT_PREPARE`.
 *
 * One column definition per parameter follows, then one per result column,
 * with no EOF packet between the groups because `CLIENT_DEPRECATE_EOF` is
 * negotiated. None is kept: the execution's own reply describes its columns
 * again.
 */

/** Reads a reply as rows keyed by column name. */
const readResults = (reader: PacketReader, rowDecoder: RowDecoder): Effect.Effect<ReadonlyArray<Result>, SqlError> =>
  Effect.map(readReply(reader, rowDecoder, toRow), (statements) => statements.map(asResult))

/** Reads a reply as bare value arrays, reporting the last statement's rows. */
const readValues = (
  reader: PacketReader,
  rowDecoder: RowDecoder
): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> =>
  Effect.map(
    readReply(reader, rowDecoder, (_, values) => values),
    (statements) => statements.length === 0 ? [] : rowsOfCompleted(statements[statements.length - 1])
  )

/** Reads the reply to a command that answers with a single OK packet. */

/**
 * Writes a request on a connection and hands its reply to `read`, one packet
 * at a time.
 *
 * The wire is held for the whole exchange, because MySQL numbers the packets
 * of a command and answers one at a time. The connection is passed in rather
 * than captured, so the generator needs no binding of its own.
 */
const runCommand = <A>(
  connection: MysqlConnectionImpl,
  request: Uint8Array,
  operation: string,
  read: (reader: PacketReader) => Effect.Effect<A, SqlError>
): Effect.Effect<A, SqlError> =>
  connection.wire.withPermit(Effect.gen(function*() {
    if (SessionState.$is("Dead")(connection.state)) return yield* Effect.fail(connection.state.error)
    const queue = yield* Queue.make<MysqlProtocol.Packet, SqlError>()
    connection.state = SessionState.Busy({
      consumer: {
        onPacket: (packet) => {
          Queue.offerUnsafe(queue, packet)
        },
        onFatal: (error) => {
          Queue.failCauseUnsafe(queue, Cause.fail(error))
        }
      }
    })
    // The server restarts the count at zero for each command, so its first
    // reply packet carries the id after our request's.
    connection.session.parser.expectedSequenceId = 1
    connection.session.socket.write(request)
    return yield* read(makeReader(queue)).pipe(
      // A reader that fails has still read the reply to its end. One that is
      // interrupted has not, and a half-read reply would desync the next
      // command, which MySQL offers no way to abandon in place. Writing the
      // session off is the honest outcome; the pool replaces it.
      Effect.onInterrupt(() =>
        Effect.sync(() =>
          connection.fatal(connectionError(
            new Error("Command interrupted"),
            "MysqlConnection: Command interrupted",
            operation
          ))
        )
      ),
      Effect.onExit(() =>
        Effect.sync(() => {
          if (SessionState.$is("Busy")(connection.state)) connection.state = idle
        })
      )
    )
  }))

/** Reads the column definitions that open a result set. */

/** Builds a row object from a column-ordered list of values. */
const toRow = (columns: ReadonlyArray<MysqlProtocol.Column>, values: ReadonlyArray<unknown>): Row => {
  const row: Record<string, unknown> = {}
  for (let index = 0; index < columns.length; index++) row[columns[index].name] = values[index]
  return row
}

/** Reads a streamed result set's rows, handing each one to `push`. */

/**
 * Streams a result set off a connection.
 *
 * The connection is passed in rather than captured, so the generator needs no
 * binding of its own.
 */
const streamOf = (
  connection: MysqlConnectionImpl,
  request: Uint8Array,
  rowDecoder: RowDecoder
): Stream.Stream<Row, SqlError> =>
  SqlStream.asyncPauseResume<Row, SqlError>((emit) =>
    Effect.gen(function*() {
      let done = false

      yield* Effect.acquireRelease(
        // The session answers one command at a time, so the stream holds the
        // wire until its result set ends.
        connection.wire.take(1),
        () =>
          Effect.suspend(() => {
            // Backpressure pauses the socket when the stream's queue fills and
            // resumes it only once that queue drains. A consumer that walks
            // away mid-result-set never drains it, so the socket can be left
            // paused with the rest of the reply still on the wire. Nothing
            // below can read a paused socket, so lift it first — the stream is
            // gone and the wire is ours. Resuming a flowing socket is a no-op.
            connection.session.socket.resume()

            if (done || SessionState.$is("Dead")(connection.state)) {
              if (SessionState.$is("Busy")(connection.state)) connection.state = idle
              return connection.wire.release(1)
            }
            // Abandoned before the last row. The reader has already been
            // interrupted, so nothing is consuming the rest of the reply:
            // stop the server sending and read to the terminator here, or the
            // next command starts mid-result-set.
            return connection.killQuery.pipe(
              Effect.andThen(Effect.ignore(drainReply(reader.one))),
              Effect.timeoutOrElse({
                duration: Duration.millis(drainTimeoutMillis),
                orElse: () =>
                  Effect.sync(() =>
                    connection.fatal(connectionError(
                      new Error("Timed out draining a cancelled stream"),
                      "MysqlConnection: Failed to cancel a stream",
                      "stream"
                    ))
                  )
              }),
              Effect.andThen(Effect.sync(() => {
                if (SessionState.$is("Busy")(connection.state)) connection.state = idle
              })),
              Effect.andThen(connection.wire.release(1))
            )
          })
      )

      if (SessionState.$is("Dead")(connection.state)) return yield* Effect.fail(connection.state.error)

      const queue = yield* Queue.make<MysqlProtocol.Packet, SqlError>()
      // One reader for the stream and for the drain that may follow it, so the
      // drain continues from where the reader stopped.
      const reader = makeReader(queue)
      connection.state = SessionState.Busy({
        consumer: {
          onPacket: (packet) => {
            Queue.offerUnsafe(queue, packet)
          },
          onFatal: (error) => {
            Queue.failCauseUnsafe(queue, Cause.fail(error))
          }
        }
      })
      connection.session.parser.expectedSequenceId = 1
      connection.session.socket.write(request)

      // Scoped, so closing the stream interrupts this before the finalizer
      // below runs. Only a reader that reached the terminator has read the
      // reply to its end; one that was interrupted leaves the rest in flight.
      yield* Effect.forkScoped(
        Effect.matchEffect(readStream(reader, rowDecoder, toRow, emit), {
          onFailure: (error) =>
            Effect.sync(() => {
              done = true
              emit.fail(error)
            }),
          onSuccess: () =>
            Effect.sync(() => {
              done = true
              emit.end()
            })
        })
      )

      return {
        onPause: () => {
          connection.session.socket.pause()
        },
        onResume: () => {
          connection.session.socket.resume()
        }
      }
    })
  )

// -----------------------------------------------------------------------------
// connecting
// -----------------------------------------------------------------------------

/** Capabilities this client cannot work without. Every one is MySQL 8 standard. */
const requiredCapabilities: ReadonlyArray<readonly [name: string, flag: MysqlProtocol.Capability]> = [
  ["CLIENT_PROTOCOL_41", MysqlProtocol.Capability.protocol41],
  ["CLIENT_PLUGIN_AUTH", MysqlProtocol.Capability.pluginAuth],
  ["CLIENT_SECURE_CONNECTION", MysqlProtocol.Capability.secureConnection],
  ["CLIENT_DEPRECATE_EOF", MysqlProtocol.Capability.deprecateEof],
  ["CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA", MysqlProtocol.Capability.pluginAuthLenencClientData]
]

/** Capabilities taken when offered. */
const optionalCapabilities: ReadonlyArray<MysqlProtocol.Capability> = [
  MysqlProtocol.Capability.longPassword,
  MysqlProtocol.Capability.longFlag,
  MysqlProtocol.Capability.transactions,
  MysqlProtocol.Capability.multiStatements,
  MysqlProtocol.Capability.multiResults,
  MysqlProtocol.Capability.psMultiResults
]

/**
 * The packets arriving on a socket, and the handlers that put them there.
 *
 * A TLS upgrade replaces the socket underneath, so attaching and detaching is
 * separate from the stream itself: the parser and the packets already read
 * carry across the swap.
 */
interface PacketSource {
  readonly parser: MysqlProtocol.Parser
  readonly take: Take
  readonly attach: (socket: Duplex) => void
  readonly detach: (socket: Duplex) => void
}

const makePacketSource = (maxMessageSize: number | undefined): Effect.Effect<PacketSource> =>
  Effect.map(Queue.make<MysqlProtocol.Packet, SqlError>(), (queue) => {
    const parser = MysqlProtocol.makeParser({ maxMessageSize })
    const offer = (packet: MysqlProtocol.Packet): void => {
      Queue.offerUnsafe(queue, packet)
    }
    const die = (error: SqlError): void => {
      Queue.failCauseUnsafe(queue, Cause.fail(error))
    }
    const onData = (chunk: Uint8Array): void => {
      try {
        parser.pushEach(chunk, offer)
      } catch (cause) {
        die(connectionError(cause, "MysqlConnection: Failed to parse the server handshake", "connect"))
      }
    }
    const onError = (cause: Error): void => die(connectionError(cause, "MysqlConnection: Failed to connect", "connect"))
    const onClose = (): void =>
      die(connectionError(
        new Error("Connection closed unexpectedly"),
        "MysqlConnection: Connection closed during startup",
        "connect"
      ))
    return {
      parser,
      take: makeReader(queue).one,
      attach: (socket) => {
        socket.on("data", onData)
        socket.on("error", onError)
        socket.on("close", onClose)
      },
      detach: (socket) => {
        socket.off("data", onData)
        socket.off("error", onError)
        socket.off("close", onClose)
      }
    }
  })

/** Opens the transport, waiting for it to be connected. */
const openSocket = (config: ResolvedConfig): Effect.Effect<Duplex, SqlError> =>
  Effect.callback<Duplex, SqlError>((resume) => {
    let socket: Duplex
    try {
      socket = Transport.$match(config.transport, {
        // A statement is one write and then a wait for its answer, so Nagle
        // has nothing to coalesce and only holds the write back.
        Tcp: ({ host, port }) => Net.connect({ host, port, noDelay: true }),
        Unix: ({ path }) => Net.connect({ path }),
        Supplied: ({ open }) => open()
      })
    } catch (cause) {
      resume(Effect.fail(connectionError(cause, "MysqlConnection: Failed to connect", "connect")))
      return
    }
    // A caller-supplied transport arrives ready, so there is no connect to wait for.
    if (Transport.$is("Supplied")(config.transport)) {
      resume(Effect.succeed(socket))
      return
    }
    const settled = { done: false }
    const clear = (): void => {
      socket.off("connect", onConnect)
      socket.off("error", onError)
    }
    function onConnect(): void {
      if (settled.done) return
      settled.done = true
      clear()
      resume(Effect.succeed(socket))
    }
    function onError(cause: Error): void {
      if (settled.done) return
      settled.done = true
      clear()
      socket.destroy()
      resume(Effect.fail(connectionError(cause, "MysqlConnection: Failed to connect", "connect")))
    }
    socket.once("connect", onConnect)
    socket.once("error", onError)
    return Effect.sync(() => {
      if (settled.done) return
      settled.done = true
      clear()
      socket.destroy()
    })
  })

/** Upgrades a connected socket to TLS in place. */
const upgradeTls = (raw: Duplex, config: ResolvedConfig): Effect.Effect<Duplex, SqlError> =>
  Effect.callback<Duplex, SqlError>((resume) => {
    const secure = Tls.connect({
      // Only a TCP transport has a name to present; a socket path or a
      // caller's duplex has none, and a caller who needs one sets it through
      // `ssl`, which is spread after this and so still wins.
      ...(Transport.$is("Tcp")(config.transport) ? { host: config.transport.host } : {}),
      ...(typeof config.ssl === "object" ? config.ssl : {}),
      socket: raw as Net.Socket
    })
    const settled = { done: false }
    const clear = (): void => {
      secure.off("secureConnect", onSecure)
      secure.off("error", onError)
    }
    function onSecure(): void {
      if (settled.done) return
      settled.done = true
      clear()
      resume(Effect.succeed(secure))
    }
    function onError(cause: Error): void {
      if (settled.done) return
      settled.done = true
      clear()
      resume(Effect.fail(connectionError(cause, "MysqlConnection: TLS negotiation failed", "connect")))
    }
    secure.once("secureConnect", onSecure)
    secure.once("error", onError)
    return Effect.sync(() => {
      if (settled.done) return
      settled.done = true
      clear()
      secure.destroy()
    })
  })

/** Settles on the capabilities both sides can agree on, or refuses the server. */
const negotiate = (
  server: MysqlProtocol.Capabilities,
  config: ResolvedConfig,
  useTls: boolean
): Effect.Effect<MysqlProtocol.Capabilities, SqlError> => {
  for (const [name, flag] of requiredCapabilities) {
    if (!MysqlProtocol.Capabilities.has(server, flag)) {
      return Effect.fail(connectionError(
        new Error(`The server does not offer ${name}`),
        "MysqlConnection: Unsupported server, MySQL 8.0 or newer is required",
        "connect"
      ))
    }
  }
  if (useTls && !MysqlProtocol.Capabilities.has(server, MysqlProtocol.Capability.ssl)) {
    return Effect.fail(connectionError(
      new Error("The server does not support TLS"),
      "MysqlConnection: Server refused TLS",
      "connect"
    ))
  }
  return Effect.succeed(MysqlProtocol.Capabilities.of([
    ...requiredCapabilities.map(([, flag]) => flag),
    ...optionalCapabilities.filter((flag) => MysqlProtocol.Capabilities.has(server, flag)),
    ...(config.database === undefined ? [] : [MysqlProtocol.Capability.connectWithDb]),
    ...(useTls ? [MysqlProtocol.Capability.ssl] : [])
  ]))
}

const authError = (cause: unknown, message: string): SqlError =>
  new SqlError({ reason: new AuthenticationError({ cause, message, operation: "connect" }) })

/** Computes the response a named plugin owes to a challenge. */
const authResponse = (
  plugin: string,
  password: string,
  scramble: Uint8Array,
  usingTls: boolean
): Effect.Effect<MysqlAuth.Reply, SqlError> => {
  const computed = MysqlAuth.respond({ plugin, password, scramble, usingTls })
  return EffectResult.isSuccess(computed)
    ? Effect.succeed(computed.success)
    : Effect.fail(authError(computed.failure, `MysqlConnection: ${computed.failure.message}`))
}

/**
 * Where a reply leaves the exchange: asking for a key means the next packet is
 * the key rather than a verdict.
 */
const stateAfter = (reply: MysqlAuth.Reply, plugin: string, scramble: Uint8Array): AuthState =>
  MysqlAuth.Reply.$is("RequestPublicKey")(reply)
    ? AuthState.AwaitingPublicKey({ scramble })
    : AuthState.Exchanging({ plugin, scramble })

/**
 * Where an authentication exchange has got to.
 *
 * The plugin and its challenge change when the server switches plugins, and
 * `caching_sha2_password` adds one step where the next packet is a public key
 * rather than a verdict. Holding that as one value keeps the states apart;
 * as separate fields any combination of them would be expressible.
 */
type AuthState = Data.TaggedEnum<{
  readonly Exchanging: { readonly plugin: string; readonly scramble: Uint8Array }
  readonly AwaitingPublicKey: { readonly scramble: Uint8Array }
}>

const AuthState = Data.taggedEnum<AuthState>()

/**
 * Runs the exchange that follows the handshake response, until the server
 * accepts the client or refuses it.
 */
const authenticate = Effect.fnUntraced(function*(options: {
  readonly source: PacketSource
  readonly socket: () => Duplex
  readonly password: string
  readonly usingTls: boolean
  readonly state: AuthState
}): Effect.fn.Return<void, SqlError> {
  /** Writes a reply to the packet just read and advances the count. */
  const respond = (received: number, build: (sequenceId: number) => Uint8Array): void => {
    const sequenceId = (received + 1) & 0xff
    options.source.parser.expectedSequenceId = (sequenceId + 1) & 0xff
    options.socket().write(build(sequenceId))
  }

  let state: AuthState = options.state

  while (true) {
    const packet = yield* options.source.take
    const payload = packet.payload
    const first = payload.length === 0 ? -1 : payload[0]

    if (first === 0xff) {
      const err = yield* take(
        Effect.succeed(packet),
        MysqlProtocol.decodeErr,
        "MysqlConnection: Failed to read an error response",
        "connect"
      )
      return yield* Effect.fail(
        new SqlError({ reason: classifyErr(err, "MysqlConnection: Failed to connect", "connect") })
      )
    }

    // An OK packet is the server accepting the client.
    if (first === 0x00) return

    if (first === 0xfe) {
      const request = yield* take(
        Effect.succeed(packet),
        MysqlProtocol.decodeAuthSwitchRequest,
        "MysqlConnection: Failed to read an AuthSwitchRequest",
        "connect"
      )
      const reply = yield* authResponse(request.plugin, options.password, request.scramble, options.usingTls)
      state = stateAfter(reply, request.plugin, request.scramble)
      respond(packet.sequenceId, (sequenceId) => MysqlProtocol.encodeAuthData(reply.bytes, sequenceId))
      continue
    }

    if (first !== 0x01) {
      return yield* Effect.fail(connectionError(
        new Error(`Unexpected packet 0x${first.toString(16)} during authentication`),
        "MysqlConnection: Protocol desync",
        "connect"
      ))
    }

    const data = yield* take(
      Effect.succeed(packet),
      MysqlProtocol.decodeAuthMoreData,
      "MysqlConnection: Failed to read an AuthMoreData packet",
      "connect"
    )

    if (AuthState.$is("AwaitingPublicKey")(state)) {
      const encrypted = MysqlAuth.encryptedPassword({
        password: options.password,
        scramble: state.scramble,
        publicKey: Buffer.from(data).toString("utf8")
      })
      if (EffectResult.isFailure(encrypted)) {
        return yield* Effect.fail(
          authError(encrypted.failure, "MysqlConnection: Failed to encrypt the password")
        )
      }
      state = AuthState.Exchanging({ plugin: MysqlProtocol.AuthPlugin.cachingSha2Password, scramble: state.scramble })
      respond(packet.sequenceId, (sequenceId) => MysqlProtocol.encodeAuthData(encrypted.success, sequenceId))
      continue
    }

    if (state.plugin !== MysqlProtocol.AuthPlugin.cachingSha2Password) {
      return yield* Effect.fail(authError(
        new Error(`Plugin ${state.plugin} sent unexpected data`),
        "MysqlConnection: Authentication failed"
      ))
    }

    const status = data[0]
    // The password matched the server's cache; the OK packet follows.
    if (status === MysqlAuth.CachingSha2.fastAuthSuccess) continue
    if (status !== MysqlAuth.CachingSha2.fullAuthRequired) {
      return yield* Effect.fail(authError(
        new Error(`Unexpected caching_sha2_password status 0x${(status ?? 0).toString(16)}`),
        "MysqlConnection: Authentication failed"
      ))
    }
    if (options.usingTls) {
      // The server has to see the password to fill its cache. Over TLS the
      // socket already protects it.
      respond(
        packet.sequenceId,
        (sequenceId) => MysqlProtocol.encodeAuthData(MysqlAuth.cleartextPassword(options.password), sequenceId)
      )
      continue
    }
    state = AuthState.AwaitingPublicKey({ scramble: state.scramble })
    respond(
      packet.sequenceId,
      (sequenceId) => MysqlProtocol.encodeAuthData(new Uint8Array([MysqlAuth.CachingSha2.requestPublicKey]), sequenceId)
    )
  }
})

/**
 * Opens a session: connect, read the server's greeting, agree on capabilities,
 * upgrade to TLS if asked, and authenticate.
 */
const connect = Effect.fnUntraced(function*(config: ResolvedConfig): Effect.fn.Return<Session, SqlError> {
  const useTls = config.ssl !== false
  const source = yield* makePacketSource(config.maxMessageSize)
  // The TLS upgrade replaces the socket, so it lives in a cell the rest of
  // the handshake reads through rather than in a binding.
  const transport = { socket: yield* openSocket(config) }
  source.attach(transport.socket)

  return yield* Effect.gen(function*() {
    // The reply's sequence id comes from the packet, not from the greeting
    // it carries, so the two are read separately.
    const greetingPacket = yield* source.take
    // A server that will not take the connection at all says so instead of
    // greeting: too many connections, or a host blocked after repeated
    // failures. Reading that as a malformed handshake would bury the one
    // thing the caller can act on, so it is decoded as the error it is.
    if (MysqlProtocol.isErr(greetingPacket.payload)) {
      const err = yield* decodedAs(
        MysqlProtocol.decodeErr(greetingPacket.payload),
        "MysqlConnection: Failed to read the server error",
        "connect"
      )
      return yield* Effect.fail(
        new SqlError({ reason: classifyErr(err, "MysqlConnection: Failed to connect", "connect") })
      )
    }
    const greeting = yield* decodedAs(
      MysqlProtocol.decodeHandshake(greetingPacket.payload),
      "MysqlConnection: Failed to read the server handshake",
      "connect"
    )
    const capabilities = yield* negotiate(greeting.capabilities, config, useTls)
    const plugin = greeting.authPlugin === ""
      ? MysqlProtocol.AuthPlugin.cachingSha2Password
      : greeting.authPlugin
    const password = config.password ?? ""
    const reply = yield* authResponse(plugin, password, greeting.scramble, useTls)

    const writeHandshakeResponse = (sequenceId: number): void => {
      source.parser.expectedSequenceId = (sequenceId + 1) & 0xff
      transport.socket.write(MysqlProtocol.encodeHandshakeResponse({
        capabilities,
        collation: MysqlProtocol.defaultCollation,
        username: config.username,
        authResponse: reply.bytes,
        database: config.database,
        authPlugin: plugin,
        sequenceId
      }))
    }

    if (useTls) {
      // TLS is negotiated in place: the 32-byte header goes out in the clear,
      // the socket is upgraded, and the full response follows encrypted.
      const sslSequenceId = (greetingPacket.sequenceId + 1) & 0xff
      transport.socket.write(MysqlProtocol.encodeSslRequest({
        capabilities,
        collation: MysqlProtocol.defaultCollation,
        sequenceId: sslSequenceId
      }))
      const raw = transport.socket
      source.detach(raw)
      transport.socket = yield* upgradeTls(raw, config)
      source.attach(transport.socket)
      writeHandshakeResponse((sslSequenceId + 1) & 0xff)
    } else {
      writeHandshakeResponse((greetingPacket.sequenceId + 1) & 0xff)
    }

    yield* authenticate({
      source,
      socket: () => transport.socket,
      password,
      usingTls: useTls,
      state: stateAfter(reply, plugin, greeting.scramble)
    })

    // The session's own handlers replace these once it is running.
    source.detach(transport.socket)
    return { socket: transport.socket, parser: source.parser, handshake: greeting, capabilities }
  }).pipe(
    Effect.onError(() =>
      Effect.sync(() => {
        source.detach(transport.socket)
        transport.socket.destroy()
      })
    )
  )
})

// -----------------------------------------------------------------------------
// configuration
// -----------------------------------------------------------------------------

/**
 * How a session reaches the server.
 *
 * The three ways are mutually exclusive, so they are one value rather than a
 * host, a port, a socket path and a stream factory that could all be set at
 * once. Resolution decides which applies, and `openSocket` reads the decision
 * instead of re-deriving it from a precedence of `undefined` checks.
 */
type Transport = Data.TaggedEnum<{
  readonly Tcp: { readonly host: string; readonly port: number }
  readonly Unix: { readonly path: string }
  /** A duplex the caller supplies, already routed and already connected. */
  readonly Supplied: { readonly open: () => Duplex }
}>
const Transport = Data.taggedEnum<Transport>()

interface ResolvedConfig {
  readonly transport: Transport
  readonly ssl: boolean | ConnectionOptions
  readonly database: string | undefined
  readonly username: string
  readonly password: string | undefined
  readonly connectTimeout: Duration.Duration
  readonly timezone: string
  readonly decode: MysqlTypes.DecodeOptions
  readonly prepare: boolean
  readonly preparedStatementCacheSize: number
  readonly maxMessageSize: number | undefined
}

const resolveConfig = (options: Config): Effect.Effect<ResolvedConfig, SqlError> =>
  Effect.suspend(() => {
    const parsed: EffectResult.Result<UrlConfig, SqlError> = options.url !== undefined
      ? parseUrl(Redacted.value(options.url))
      : EffectResult.succeed({})
    if (EffectResult.isFailure(parsed)) return Effect.fail(parsed.failure)
    const url = parsed.success
    const host = options.host ?? url.host ?? "localhost"
    const port = options.port ?? url.port ?? 3306
    const username = options.username ?? url.username ?? process.env.USER ?? process.env.USERNAME
    if (username === undefined) {
      return Effect.fail(configError("No username configured"))
    }
    // A leading slash in `host` is how MySQL clients have always spelled a
    // socket path, so it is honoured here and then never looked at again.
    const path = options.path ?? (host.startsWith("/") ? host : undefined)
    return Effect.succeed<ResolvedConfig>({
      transport: options.stream !== undefined
        ? Transport.Supplied({ open: options.stream })
        : path !== undefined
        ? Transport.Unix({ path })
        : Transport.Tcp({ host, port }),
      ssl: options.ssl ?? url.ssl ?? false,
      database: options.database ?? url.database,
      username,
      password: options.password !== undefined ? Redacted.value(options.password) : url.password,
      connectTimeout: Duration.fromInputUnsafe(options.connectTimeout ?? Duration.seconds(5)),
      timezone: options.timezone ?? "+00:00",
      decode: { bigintAsNumber: options.bigintAsNumber, dateStrings: options.dateStrings },
      prepare: options.prepare ?? true,
      preparedStatementCacheSize: options.preparedStatementCacheSize ?? defaultPreparedStatements,
      maxMessageSize: options.maxMessageSize
    })
  })
