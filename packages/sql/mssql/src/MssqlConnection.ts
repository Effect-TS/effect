/**
 * Native SQL Server sessions built on the `MssqlProtocol` wire codec.
 *
 * **Details**
 *
 * A session negotiates TLS inside TDS `PRELOGIN` packets, logs in with SQL,
 * NTLMv2, or Security Token federated authentication, follows Azure routing,
 * and retries transient login errors. After login it runs one request at a
 * time: SQL batches, `sp_executesql` statements, and stored procedure calls.
 * Interrupting a request sends `ATTENTION` and waits for the server to
 * acknowledge it before the session runs anything else.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as EffectResult from "effect/Result"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import { AuthenticationError, ConnectionError, SqlError, UnknownError } from "effect/sql/SqlError"
import { Buffer } from "node:buffer"
import { randomBytes } from "node:crypto"
import * as Net from "node:net"
import { Duplex } from "node:stream"
import * as Tls from "node:tls"
import { lookupInstancePort } from "./internal/browser.ts"
import { type ConnectionInternals, internalsKey } from "./internal/connection.ts"
import { classifyError, errorNumber, transientLoginErrors } from "./internal/sqlError.ts"
import * as MssqlAuth from "./MssqlAuth.ts"
import * as MssqlProtocol from "./MssqlProtocol.ts"

/**
 * The runtime type identifier for `MssqlConnection`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-mssql/MssqlConnection"

/**
 * The type-level identifier for `MssqlConnection`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-mssql/MssqlConnection"

/**
 * Connection settings for a SQL Server session.
 *
 * **Details**
 *
 * `connectTimeout` (15 seconds by default) bounds the whole connection
 * attempt, including SQL Browser lookup, routing, transient-error retries, and
 * session initialization. An access token is acquired before that budget
 * starts, under its own `connectTimeout`.
 *
 * With `initializeSession` (the default) every new session runs the `SET`
 * statements tedious uses, so session defaults match between the drivers.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config {
  readonly server: string
  /** TCP port. Defaults to 1433, or to the SQL Browser's answer for `instanceName`. */
  readonly port?: number | undefined
  /** A named instance, resolved through the SQL Server Browser unless `port` is set. */
  readonly instanceName?: string | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined
  /** The Windows domain for NTLM authentication. */
  readonly domain?: string | undefined
  /**
   * `default` for SQL authentication, `ntlm` (requires `domain`), or
   * `azure-active-directory-access-token` (requires `accessToken`).
   */
  readonly authType?: "default" | "ntlm" | "azure-active-directory-access-token" | undefined
  /** Effect obtaining a fresh Azure SQL access token for each physical connection. Requires TLS. */
  readonly accessToken?: Effect.Effect<Redacted.Redacted, SqlError> | undefined
  /**
   * Whether to encrypt traffic between the client and server. Defaults to `true`. Setting this to `false` disables transport encryption and transmits credentials in cleartext.
   */
  readonly encrypt?: boolean | undefined
  /**
   * Whether to trust the server certificate without validating it. Defaults to `false`. Setting this to `true` disables TLS certificate validation.
   */
  readonly trustServer?: boolean | undefined
  readonly applicationName?: string | undefined
  /** The requested packet size in bytes, 512 to 32767. Defaults to 4096; the server may choose another. */
  readonly packetSize?: number | undefined
  readonly connectTimeout?: Duration.Input | undefined
  /** How long to wait for the server to acknowledge a cancellation before closing the session. Defaults to 5 seconds. */
  readonly cancelTimeout?: Duration.Input | undefined
  /** Time before requesting cancellation. Defaults to 15 seconds; zero disables the request timer. Cancellation is drained before reuse. */
  readonly requestTimeout?: Duration.Input | undefined
  /** Delay between retries of transient login errors. Defaults to 500 milliseconds. */
  readonly connectionRetryInterval?: Duration.Input | undefined
  /** Retries of transient login errors. Defaults to 3. */
  readonly maxRetriesOnTransientErrors?: number | undefined
  /** Races address families quickly, for availability group listeners. */
  readonly multiSubnetFailover?: boolean | undefined
  /** Maximum size of one token, and so of one value, in bytes. Defaults to 16 MiB. */
  readonly maxTokenSize?: number | undefined
  /** Runs tedious's session defaults after login. Defaults to `true`. */
  readonly initializeSession?: boolean | undefined
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
 * The result of a request.
 *
 * @category models
 * @since 4.0.0
 */
export interface Result<A = Row> {
  readonly rows: ReadonlyArray<A>
  /** Output parameters by name, without their leading `@`. */
  readonly output: Readonly<Record<string, unknown>>
  readonly rowCount: number
  /** The stored procedure's return status, or 0. */
  readonly returnStatus: number
}

/**
 * A connected and authenticated SQL Server session.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlConnection {
  readonly [TypeId]: TypeId
  readonly config: Config
  /**
   * Runs a statement through `sp_executesql` and returns rows keyed by
   * column name.
   *
   * **Details**
   *
   * Requests on one session run one at a time. On interruption or
   * `requestTimeout`, the session sends `ATTENTION` and admits no other
   * request until the server acknowledges it; without an acknowledgement
   * within `cancelTimeout` the session closes.
   */
  readonly query: (
    sql: string,
    params?: ReadonlyArray<MssqlProtocol.Parameter>
  ) => Effect.Effect<Result, SqlError>
  /** Runs a statement like `query` and returns positional rows. */
  readonly queryValues: (
    sql: string,
    params?: ReadonlyArray<MssqlProtocol.Parameter>
  ) => Effect.Effect<Result<ReadonlyArray<unknown>>, SqlError>
  /**
   * Runs an unparameterized SQL batch. Unlike `sp_executesql`, a batch runs
   * in the session's own scope, so temporary tables and transactions it opens
   * outlive it.
   */
  readonly batch: (sql: string) => Effect.Effect<Result, SqlError>
  /** Calls a stored procedure by name. */
  readonly call: (
    procedure: string,
    params: ReadonlyArray<MssqlProtocol.Parameter>
  ) => Effect.Effect<Result, SqlError>
}

/**
 * The service tag for `MssqlConnection`.
 *
 * @category services
 * @since 4.0.0
 */
export const MssqlConnection = Context.Service<MssqlConnection>("@effect/sql-mssql/MssqlConnection")

/**
 * Connects and authenticates a single SQL Server session.
 *
 * **Details**
 *
 * Closing the scope closes the socket. A session that fails fatally closes
 * itself and fails every later request.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Config): Effect.Effect<MssqlConnection, SqlError, Scope.Scope> =>
  Effect.flatMap(
    Effect.fromResult(resolveConfig(options)),
    (config) =>
      Effect.flatMap(accessToken(options, config), (token) => {
        // The deadline starts after the token, which has its own timeout.
        const deadline = Date.now() + config.connectTimeout
        return Effect.acquireRelease(
          establish(config, token, deadline),
          (connection) => Effect.sync(() => connection.closeUnsafe())
        ).pipe(
          Effect.tap((connection) =>
            config.initializeSession
              ? connection.request(
                () => MssqlProtocol.encodeSqlBatch(initialSql, connection.transaction),
                MssqlProtocol.PacketType.SqlBatch,
                false,
                Math.max(1, deadline - Date.now())
              )
              : Effect.void
          )
        )
      })
  )

// -----------------------------------------------------------------------------
// configuration
// -----------------------------------------------------------------------------

interface ResolvedConfig {
  readonly options: Config
  readonly server: string
  readonly port: number | undefined
  readonly instanceName: string | undefined
  readonly database: string | undefined
  readonly username: string | undefined
  readonly password: string | undefined
  readonly domain: string | undefined
  readonly ntlm: boolean
  readonly encrypt: boolean
  readonly trustServer: boolean
  readonly applicationName: string | undefined
  readonly packetSize: number
  readonly connectTimeout: number
  readonly cancelTimeout: number
  readonly requestTimeout: number
  readonly retryInterval: number
  readonly maxRetries: number
  readonly multiSubnetFailover: boolean
  readonly maxTokenSize: number
  readonly initializeSession: boolean
}

const defaultPort = 1433
const defaultConnectTimeoutMillis = 15000
const defaultCancelTimeoutMillis = 5000
const defaultRequestTimeoutMillis = 15000
const defaultRetryIntervalMillis = 500
const defaultMaxRetries = 3
/** The most redirects followed for one connection attempt. */
const maxRedirects = 5
/** `setTimeout` treats longer delays as 1 ms. */
const maxTimerMillis = 2147483647
/** How long each address family gets under `multiSubnetFailover`. */
const multiSubnetAttemptMillis = 100

const configError = (message: string, authentication = false): SqlError =>
  new SqlError({
    reason: authentication
      ? new AuthenticationError({
        cause: new Error(message),
        message: `MssqlConnection: ${message}`,
        operation: "connect"
      })
      : new ConnectionError({ cause: new Error(message), message: `MssqlConnection: ${message}`, operation: "connect" })
  })

const millis = (input: Duration.Input | undefined, fallback: number): number =>
  input === undefined ? fallback : Duration.toMillis(Duration.fromInputUnsafe(input))

const resolveConfig = (options: Config): EffectResult.Result<ResolvedConfig, SqlError> => {
  const authType = options.authType ?? "default"
  if (authType !== "default" && authType !== "ntlm" && authType !== "azure-active-directory-access-token") {
    return EffectResult.fail(configError(`Unsupported native TDS authentication: ${authType}`, true))
  }
  if (
    (authType === "azure-active-directory-access-token" && options.accessToken === undefined) ||
    (options.accessToken !== undefined && (authType === "ntlm" || options.encrypt === false))
  ) {
    return EffectResult.fail(
      configError("Access-token authentication requires an accessToken effect, TLS, and no NTLM authentication", true)
    )
  }
  if (authType === "ntlm" && !options.domain) return EffectResult.fail(configError("NTLM requires a domain", true))
  const packetSize = options.packetSize ?? MssqlProtocol.defaultPacketSize
  if (!MssqlProtocol.isPacketSize(packetSize)) return EffectResult.fail(configError("Invalid packet size"))
  let connectTimeout: number
  let cancelTimeout: number
  let requestTimeout: number
  let retryInterval: number
  try {
    connectTimeout = millis(options.connectTimeout, defaultConnectTimeoutMillis)
    cancelTimeout = millis(options.cancelTimeout, defaultCancelTimeoutMillis)
    requestTimeout = millis(options.requestTimeout, defaultRequestTimeoutMillis)
    retryInterval = millis(options.connectionRetryInterval, defaultRetryIntervalMillis)
  } catch {
    return EffectResult.fail(configError("Invalid duration"))
  }
  for (const timeout of [connectTimeout, cancelTimeout]) {
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > maxTimerMillis) {
      return EffectResult.fail(configError("Invalid timeout"))
    }
  }
  if (!Number.isFinite(requestTimeout) || requestTimeout < 0 || requestTimeout > maxTimerMillis) {
    return EffectResult.fail(configError("Invalid request timeout"))
  }
  const maxRetries = options.maxRetriesOnTransientErrors ?? defaultMaxRetries
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || !Number.isFinite(retryInterval) || retryInterval <= 0) {
    return EffectResult.fail(configError("Invalid connection retry options"))
  }
  const maxTokenSize = options.maxTokenSize ?? MssqlProtocol.defaultMaxMessageSize
  if (!Number.isSafeInteger(maxTokenSize) || maxTokenSize < 1) {
    return EffectResult.fail(configError("Invalid token size limit"))
  }
  const config: ResolvedConfig = {
    options,
    server: options.server,
    port: options.port,
    instanceName: options.instanceName,
    database: options.database,
    username: options.username,
    password: options.password === undefined ? undefined : Redacted.value(options.password),
    domain: options.domain,
    ntlm: authType === "ntlm",
    encrypt: options.encrypt ?? true,
    trustServer: options.trustServer ?? false,
    applicationName: options.applicationName,
    packetSize,
    connectTimeout,
    cancelTimeout,
    requestTimeout,
    retryInterval,
    maxRetries,
    multiSubnetFailover: options.multiSubnetFailover ?? false,
    maxTokenSize,
    initializeSession: options.initializeSession ?? true
  }
  // Fail invalid login fields, such as an overlong user name, before connecting.
  const login = MssqlProtocol.encodeLogin7(login7(config, undefined, false))
  if (EffectResult.isFailure(login)) return EffectResult.fail(configError(login.failure.message))
  login.success.fill(0)
  return EffectResult.succeed(config)
}

const login7 = (
  config: ResolvedConfig,
  accessToken: string | undefined,
  fedAuthEcho: boolean
): MssqlProtocol.Login7 => ({
  server: config.server,
  username: config.username,
  password: config.password,
  database: config.database,
  applicationName: config.applicationName,
  packetSize: config.packetSize,
  processId: (globalThis as any).process?.pid ?? 0,
  sspi: config.ntlm ? MssqlAuth.ntlmNegotiate() : undefined,
  accessToken,
  fedAuthEcho
})

const accessToken = (options: Config, config: ResolvedConfig): Effect.Effect<string | undefined, SqlError> =>
  options.accessToken === undefined
    ? Effect.undefined
    : options.accessToken.pipe(
      Effect.timeout(config.connectTimeout),
      Effect.map(Redacted.value),
      Effect.mapError((cause) =>
        new SqlError({
          reason: new AuthenticationError({
            cause,
            message: "MssqlConnection: Failed to obtain SQL access token",
            operation: "connect"
          })
        })
      )
    )

// -----------------------------------------------------------------------------
// connecting
// -----------------------------------------------------------------------------

const connectionError = (cause: unknown, message: string): SqlError =>
  new SqlError({ reason: new ConnectionError({ cause, message: `MssqlConnection: ${message}`, operation: "connect" }) })

const timedOut = (): SqlError => connectionError(new Error("TDS connection timeout"), "Connection timed out")

/**
 * Resolves the instance port, then connects, following routing responses and
 * retrying transient login errors until `deadline`.
 */
const establish = (
  config: ResolvedConfig,
  accessToken: string | undefined,
  deadline: number
): Effect.Effect<MssqlConnectionImpl, SqlError> => {
  const attempt = (
    server: string,
    port: number | undefined,
    redirects: number,
    retries: number
  ): Effect.Effect<MssqlConnectionImpl, SqlError> =>
    Effect.suspend(() => {
      const remaining = deadline - Date.now()
      if (remaining <= 0) return Effect.fail(timedOut())
      return Effect.flatMap(
        Effect.catch(connect(config, server, port ?? defaultPort, accessToken, remaining), (error) => {
          const number = errorNumber(error.reason.cause)
          if (number === undefined || !transientLoginErrors.has(number) || retries >= config.maxRetries) {
            return Effect.fail(error)
          }
          return Effect.flatMap(
            sleep(Math.min(config.retryInterval, Math.max(1, deadline - Date.now()))),
            () => Effect.map(attempt(server, port, redirects, retries + 1), ready)
          )
        }),
        (startup): Effect.Effect<MssqlConnectionImpl, SqlError> => {
          if (startup._tag === "Ready") return Effect.succeed(startup.connection)
          if (redirects >= maxRedirects) return Effect.fail(connectionError(startup, "Too many routing redirects"))
          return attempt(startup.server, startup.port, redirects + 1, retries)
        }
      )
    })
  if (config.instanceName === undefined || config.port !== undefined) {
    return attempt(config.server, config.port, 0, 0)
  }
  return Effect.flatMap(
    Effect.suspend(() =>
      lookupInstancePort({
        server: config.server,
        instanceName: config.instanceName!,
        timeoutMillis: Math.max(1, deadline - Date.now())
      })
    ),
    (port) => attempt(config.server, port, 0, 0)
  )
}

const sleep = (millis: number): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const timer = setTimeout(() => resume(Effect.void), millis)
    return Effect.sync(() => clearTimeout(timer))
  })

/** How a login ended: a ready session, or a redirect to another server. */
type Startup =
  | { readonly _tag: "Ready"; readonly connection: MssqlConnectionImpl }
  | { readonly _tag: "Routed"; readonly server: string; readonly port: number }

const ready = (connection: MssqlConnectionImpl): Startup => ({ _tag: "Ready", connection })

const connect = (
  config: ResolvedConfig,
  server: string,
  port: number,
  accessToken: string | undefined,
  timeoutMillis: number
): Effect.Effect<Startup, SqlError> =>
  Effect.callback<Startup, SqlError>((resume) => {
    const connection = new MssqlConnectionImpl(config, server, port, accessToken, timeoutMillis, resume)
    return Effect.sync(() => connection.closeUnsafe())
  })

// -----------------------------------------------------------------------------
// session
// -----------------------------------------------------------------------------

/** One request on the wire. */
interface Pending {
  readonly resume: (result: Effect.Effect<Result<any>, SqlError>) => void
  readonly rows: Array<unknown>
  readonly output: Record<string, unknown>
  readonly values: boolean
  rowCount: number
  returnStatus: number
  error: SqlError | undefined
  done: boolean
  attention: boolean
  cancelRequested: boolean
  requestTimer: ReturnType<typeof setTimeout> | undefined
  cancelResume: (() => void) | undefined
  cancelTimer: ReturnType<typeof setTimeout> | undefined
}

type State = "prelogin" | "handshake" | "login" | "ready" | "closed"

/** A request payload that has not been framed yet. */
type Payload = () => EffectResult.Result<Uint8Array, MssqlProtocol.EncodeError>

/** The collation until the server sends its own: Latin1_General_CI_AS. */
const defaultCollation = new Uint8Array([0x09, 0x04, 0xd0, 0x00, 0x34])

const noTransaction = new Uint8Array(8)

const emptyPayload = new Uint8Array(0)

/** Server errors of this severity or higher terminate the session. */
const fatalSeverity = 20

/** TLS record type for application data (RFC 8446 5.1). */
const tlsApplicationData = 23
/** TLS records carry at most 16 KiB of plaintext. */
const maxTlsFragment = 16384

const requestError = (cause: unknown): SqlError =>
  new SqlError({
    reason: new UnknownError({
      cause,
      message: cause instanceof Error ? cause.message : "MssqlConnection: Request failed",
      operation: "execute"
    })
  })

/** A server `ERROR` token as the tedious-shaped error that `classifyError` reads. */
const serverError = (message: MssqlProtocol.ServerMessage): Error =>
  Object.assign(new Error(message.message), message, { code: "EREQUEST" })

class MssqlConnectionImpl implements MssqlConnection {
  readonly [TypeId]: TypeId = TypeId
  readonly config: Config
  readonly [internalsKey]: ConnectionInternals

  private readonly settings: ResolvedConfig
  private readonly server: string
  private readonly accessToken: string | undefined
  private readonly socket: Net.Socket
  private tls: Tls.TLSSocket | undefined
  private bridge: Duplex | undefined
  private readonly packets = MssqlProtocol.makePacketParser()
  private readonly messages = MssqlProtocol.makeMessageParser()
  private readonly tokens: MssqlProtocol.TokenParser
  private state: State = "prelogin"
  private pending: Pending | undefined
  private deadWith: SqlError | undefined
  private startup: ((result: Effect.Effect<Startup, SqlError>) => void) | undefined
  private loginAck = false
  private loginDone = false
  private fedAuthRequired = false
  private fedAuthAck = false
  private loginError: SqlError | undefined
  private route: { readonly server: string; readonly port: number } | undefined
  private ntlmNegotiate: Uint8Array | undefined
  private ntlmChallenge: Uint8Array | undefined
  private ntlmSent = false
  private readonly connectTimer: ReturnType<typeof setTimeout>
  transaction: Uint8Array = noTransaction
  private collation: Uint8Array = defaultCollation
  private packetSize: number
  private readonly semaphore = Semaphore.makeUnsafe(1)
  private readonly writes: Array<Uint8Array> = []
  private writing = false
  private readonly retireHooks = new Set<() => void>()

  constructor(
    settings: ResolvedConfig,
    server: string,
    port: number,
    accessToken: string | undefined,
    timeoutMillis: number,
    startup: (result: Effect.Effect<Startup, SqlError>) => void
  ) {
    this.config = settings.options
    this.settings = settings
    this.server = server
    this.accessToken = accessToken
    this.startup = startup
    this.packetSize = settings.packetSize
    this.tokens = MssqlProtocol.makeTokenParser({ maxTokenSize: settings.maxTokenSize })
    this[internalsKey] = { deadError: () => this.deadWith, retireHooks: this.retireHooks }
    this.socket = Net.createConnection({
      host: server,
      port,
      autoSelectFamily: true,
      ...(settings.multiSubnetFailover ? { autoSelectFamilyAttemptTimeout: multiSubnetAttemptMillis } : {})
    })
    this.socket.setNoDelay(true)
    this.connectTimer = setTimeout(() => this.fatal(timedOut()), timeoutMillis)
    this.socket.on("error", (error) => this.fatal(error))
    this.socket.on("close", () => this.fatal(new Error("TDS connection closed")))
    this.socket.on("data", this.onData)
    this.socket.once("connect", () => {
      this.write(
        this.frame(
          MssqlProtocol.PacketType.Prelogin,
          MssqlProtocol.encodePrelogin({ encrypt: settings.encrypt, fedAuth: accessToken !== undefined })
        )
      )
    })
  }

  query(sql: string, params: ReadonlyArray<MssqlProtocol.Parameter> = []): Effect.Effect<Result, SqlError> {
    return this.request(
      () => MssqlProtocol.encodeExecuteSql(sql, params, this.context()),
      MssqlProtocol.PacketType.Rpc,
      false
    )
  }

  queryValues(
    sql: string,
    params: ReadonlyArray<MssqlProtocol.Parameter> = []
  ): Effect.Effect<Result<ReadonlyArray<unknown>>, SqlError> {
    return this.request(
      () => MssqlProtocol.encodeExecuteSql(sql, params, this.context()),
      MssqlProtocol.PacketType.Rpc,
      true
    )
  }

  batch(sql: string): Effect.Effect<Result, SqlError> {
    return this.request(
      () => MssqlProtocol.encodeSqlBatch(sql, this.transaction),
      MssqlProtocol.PacketType.SqlBatch,
      false
    )
  }

  call(procedure: string, params: ReadonlyArray<MssqlProtocol.Parameter>): Effect.Effect<Result, SqlError> {
    return this.request(
      () => MssqlProtocol.encodeRpc(procedure, params, this.context()),
      MssqlProtocol.PacketType.Rpc,
      false
    )
  }

  private context(): MssqlProtocol.RequestContext {
    return { transaction: this.transaction, collation: this.collation }
  }

  closeUnsafe(): void {
    this.fatal(new Error("TDS session released"))
  }

  request<A>(
    payload: Payload,
    type: number,
    values: boolean,
    timeoutMillis = this.settings.requestTimeout
  ): Effect.Effect<Result<A>, SqlError> {
    return this.semaphore.withPermit(Effect.callback<Result<A>, SqlError>((resume) => {
      if (this.state !== "ready") {
        resume(
          Effect.fail(this.deadWith ?? connectionError(new Error("TDS session is not ready"), "Session is not ready"))
        )
        return
      }
      const encoded = payload()
      if (EffectResult.isFailure(encoded)) {
        resume(Effect.fail(requestError(encoded.failure)))
        return
      }
      const pending: Pending = {
        resume,
        rows: [],
        output: {},
        values,
        rowCount: 0,
        returnStatus: 0,
        error: undefined,
        done: false,
        attention: false,
        cancelRequested: false,
        requestTimer: undefined,
        cancelResume: undefined,
        cancelTimer: undefined
      }
      this.pending = pending
      this.tokens.columns = undefined
      if (timeoutMillis > 0) {
        pending.requestTimer = setTimeout(() => {
          pending.error = requestError(Object.assign(new Error("TDS request timeout"), { code: "ETIMEOUT" }))
          this.cancel(pending)
        }, timeoutMillis)
      }
      this.write(this.frame(type, encoded.success))
      return Effect.callback<void>((cancelResume) => {
        if (this.pending !== pending) {
          cancelResume(Effect.void)
          return
        }
        pending.cancelResume = () => cancelResume(Effect.void)
        this.cancel(pending)
      })
    }))
  }

  /** Frames a payload with the current packet size, which is always valid. */
  private frame(type: number, payload: Uint8Array): Uint8Array {
    const packet = MssqlProtocol.encodePacket(type, payload, this.packetSize)
    if (EffectResult.isFailure(packet)) throw packet.failure
    return packet.success
  }

  private cancel(pending: Pending): void {
    if (pending.cancelRequested || this.pending !== pending) return
    pending.cancelRequested = true
    clearTimeout(pending.requestTimer)
    pending.cancelTimer = setTimeout(
      () => this.fatal(connectionError(new Error("TDS cancellation timeout"), "Cancellation was not acknowledged")),
      this.settings.cancelTimeout
    )
    this.write(this.frame(MssqlProtocol.PacketType.Attention, emptyPayload))
  }

  /**
   * Queues whole messages, so cancellation cannot insert `ATTENTION` inside
   * an unfinished request.
   */
  private write(data: Uint8Array): void {
    if (this.state === "closed") return
    this.writes.push(data)
    if (this.writing) return
    this.writing = true
    this.drainWrites()
  }

  private drainWrites(): void {
    const data = this.writes.shift()
    if (data === undefined || this.state === "closed") {
      this.writing = false
      return
    }
    let offset = 0
    const next = (): void => {
      if (this.state === "closed") return
      // Some Node-compatible runtimes do not implement setMaxSendFragment.
      // Await each TLS write so _writev cannot combine packets into a record
      // larger than SQL Server's negotiated receive size.
      const end = this.tls ? Math.min(offset + this.packetSize, data.length) : data.length
      const chunk = data.subarray(offset, end)
      offset = end
      try {
        ;(this.tls ?? this.socket).write(chunk, (error) => {
          if (error) this.fatal(error)
          else if (offset < data.length) next()
          else this.drainWrites()
        })
      } catch (error) {
        this.fatal(error)
      }
    }
    next()
  }

  /**
   * Closes the session for good. Idempotent. A startup in progress fails, as
   * does the pending request, and pools are told to retire the session.
   */
  private fatal(cause: unknown): void {
    if (this.state === "closed") return
    const connecting = this.state !== "ready"
    const error = cause instanceof SqlError
      ? cause
      : connectionError(cause, cause instanceof Error ? cause.message : "Connection failed")
    this.close()
    this.deadWith = error
    if (connecting) this.finishStartup(Effect.fail(error))
    const pending = this.pending
    this.pending = undefined
    if (pending) {
      clearTimeout(pending.requestTimer)
      clearTimeout(pending.cancelTimer)
      pending.resume(Effect.fail(error))
      pending.cancelResume?.()
    }
    for (const hook of this.retireHooks) hook()
    this.retireHooks.clear()
  }

  private close(): void {
    this.state = "closed"
    this.writes.length = 0
    clearTimeout(this.connectTimer)
    this.tls?.destroy()
    this.bridge?.destroy()
    this.socket.destroy()
  }

  private finishStartup(result: Effect.Effect<Startup, SqlError>): void {
    const startup = this.startup
    this.startup = undefined
    startup?.(result)
  }

  private readonly onData = (chunk: Uint8Array): void => {
    try {
      if (this.bridge && this.state !== "handshake") this.bridge.push(chunk)
      else this.packets.push(chunk, this.onPacket)
    } catch (error) {
      this.fatal(error)
    }
  }

  private readonly onPacket = (packet: MssqlProtocol.Packet): void => {
    if (this.state === "handshake") {
      if (packet.type !== MssqlProtocol.PacketType.Response && packet.type !== MssqlProtocol.PacketType.Prelogin) {
        throw new MssqlProtocol.ParseError({ message: "Unexpected TLS packet type" })
      }
      this.bridge!.push(packet.data)
      return
    }
    if (packet.type !== MssqlProtocol.PacketType.Response) {
      throw new MssqlProtocol.ParseError({ message: "Expected TDS response packet" })
    }
    if (this.state === "prelogin") return this.onPrelogin(packet)
    if (this.state !== "login" && this.state !== "ready") return
    this.tokens.push(packet.data, this.onToken)
    if ((packet.status & 1) === 0) return
    this.tokens.end()
    if (this.state === "login") return this.onLoginResponse()
    this.onResponse()
  }

  private onPrelogin(packet: MssqlProtocol.Packet): void {
    const message = this.messages.push(packet)
    if (!message) return
    const prelogin = MssqlProtocol.decodePrelogin(message)
    if (EffectResult.isFailure(prelogin)) throw prelogin.failure
    const { encryption, fedAuthRequired } = prelogin.success
    this.fedAuthRequired = fedAuthRequired
    if (encryption === MssqlProtocol.Encryption.On || encryption === MssqlProtocol.Encryption.Required) {
      this.startTls()
    } else if (this.settings.encrypt) {
      throw new MssqlProtocol.ParseError({ message: "Server refused required encryption" })
    } else if (encryption === MssqlProtocol.Encryption.NotSupported) {
      this.sendLogin()
    } else {
      throw new MssqlProtocol.ParseError({ message: "Server requested unsupported login-only encryption" })
    }
  }

  private onLoginResponse(): void {
    if (this.route) {
      const route = this.route
      this.close()
      this.deadWith = connectionError(new Error("SQL Server requested routing"), "Routed to another server")
      this.finishStartup(Effect.succeed({ _tag: "Routed", server: route.server, port: route.port }))
      return
    }
    if (this.ntlmChallenge) {
      const response = MssqlAuth.ntlmAuthenticate({
        challenge: this.ntlmChallenge,
        credentials: {
          username: this.settings.username ?? "",
          password: this.settings.password ?? "",
          domain: this.settings.domain!
        },
        clientNonce: randomBytes(8),
        time: Date.now(),
        negotiate: this.ntlmNegotiate
      })
      if (EffectResult.isFailure(response)) throw response.failure
      this.ntlmChallenge = undefined
      this.ntlmSent = true
      this.write(this.frame(MssqlProtocol.PacketType.Sspi, response.success))
      response.success.fill(0)
      return
    }
    if (this.loginError) return this.fatal(this.loginError)
    if (!this.loginAck || !this.loginDone) {
      throw new MssqlProtocol.ParseError({ message: "Incomplete LOGIN7 response" })
    }
    if (this.accessToken !== undefined && !this.fedAuthAck) {
      throw new MssqlProtocol.ParseError({ message: "Missing federated authentication acknowledgement" })
    }
    this.state = "ready"
    clearTimeout(this.connectTimer)
    this.finishStartup(Effect.succeed(ready(this)))
  }

  private onResponse(): void {
    const pending = this.pending
    if (!pending) throw new MssqlProtocol.ParseError({ message: "Unsolicited TDS response" })
    if (!pending.done && !pending.attention) {
      throw new MssqlProtocol.ParseError({ message: "Response ended without final DONE" })
    }
    // A normal completion raced with ATTENTION; the acknowledgement follows.
    if (pending.cancelRequested && !pending.attention) return
    this.pending = undefined
    clearTimeout(pending.requestTimer)
    clearTimeout(pending.cancelTimer)
    pending.resume(
      pending.error ? Effect.fail(pending.error) : Effect.succeed({
        rows: pending.rows,
        output: pending.output,
        rowCount: pending.rowCount,
        returnStatus: pending.returnStatus
      })
    )
    pending.cancelResume?.()
  }

  private startTls(): void {
    this.state = "handshake"
    let buffered: Uint8Array = emptyPayload
    let applicationData = false
    this.bridge = new Duplex({
      read() {},
      write: (chunk: Uint8Array, _encoding, callback) => {
        if (applicationData && buffered.length === 0) {
          this.socket.write(chunk, callback)
          return
        }
        // secureConnect can precede the final outgoing handshake records on
        // resumed sessions in Node-compatible runtimes. Frame complete TLS
        // records, retaining the TDS wrapper until application traffic begins.
        buffered = buffered.length === 0 ? chunk : Buffer.concat([buffered, chunk])
        const output: Array<Uint8Array> = []
        const handshake: Array<Uint8Array> = []
        const flushHandshake = () => {
          if (handshake.length === 0) return
          output.push(this.frame(MssqlProtocol.PacketType.Prelogin, Buffer.concat(handshake)))
          handshake.length = 0
        }
        while (buffered.length >= 5) {
          const length = 5 + ((buffered[3] << 8) | buffered[4])
          if (buffered.length < length) break
          const record = buffered.subarray(0, length)
          buffered = buffered.subarray(length)
          if (this.state !== "handshake" && record[0] === tlsApplicationData) applicationData = true
          if (applicationData) {
            flushHandshake()
            output.push(record)
          } else {
            handshake.push(record)
          }
        }
        flushHandshake()
        if (output.length === 0) callback()
        else this.socket.write(Buffer.concat(output), callback)
      }
    })
    this.bridge.on("error", (error) => this.fatal(error))
    const tls = this.tls = Tls.connect({
      socket: this.bridge,
      servername: Net.isIP(this.server) ? undefined : this.server,
      rejectUnauthorized: !this.settings.trustServer,
      checkServerIdentity: (_hostname, cert) => Tls.checkServerIdentity(this.server, cert)
    })
    tls.setMaxSendFragment(Math.min(this.packetSize, maxTlsFragment))
    tls.on("error", (error) => this.fatal(error))
    const packets = MssqlProtocol.makePacketParser()
    tls.on("data", (chunk: Uint8Array) => {
      try {
        packets.push(chunk, this.onPacket)
      } catch (error) {
        this.fatal(error)
      }
    })
    tls.once("secureConnect", () => this.sendLogin())
  }

  private sendLogin(): void {
    this.state = "login"
    const options = login7(this.settings, this.accessToken, this.fedAuthRequired)
    this.ntlmNegotiate = options.sspi
    const login = MssqlProtocol.encodeLogin7(options)
    if (EffectResult.isFailure(login)) throw login.failure
    this.write(this.frame(MssqlProtocol.PacketType.Login7, login.success))
    login.success.fill(0)
  }

  private readonly onToken = (token: MssqlProtocol.Token): void => {
    const pending = this.pending
    switch (token._tag) {
      case "Row": {
        if (!pending) throw new MssqlProtocol.ParseError({ message: "Row without active request" })
        if (pending.cancelRequested) return
        if (pending.values) {
          pending.rows.push(token.values)
          return
        }
        const columns = this.tokens.columns!
        const values = token.values
        const row: Record<string, unknown> = {}
        for (let i = 0; i < columns.length; i++) {
          const name = columns[i].name
          if (name !== "__proto__") {
            row[name] = values[i]
            continue
          }
          Object.defineProperty(row, name, { value: values[i], writable: true, configurable: true, enumerable: true })
        }
        pending.rows.push(row)
        return
      }
      case "Done":
        if (this.state === "login") {
          this.loginDone = (token.status & MssqlProtocol.DoneStatus.More) === 0
        } else if (pending) {
          pending.done = (token.status & MssqlProtocol.DoneStatus.More) === 0 && token.kind !== 0xff
          pending.attention ||= (token.status & MssqlProtocol.DoneStatus.Attention) !== 0
          if (token.status & MssqlProtocol.DoneStatus.Count) pending.rowCount += token.rowCount
          if (
            (token.status & (MssqlProtocol.DoneStatus.Error | MssqlProtocol.DoneStatus.ServerError)) &&
            !pending.error
          ) {
            pending.error = requestError(new Error("SQL Server reported a failed statement"))
          }
        }
        return
      case "Error": {
        const cause = serverError(token.message)
        if (this.state === "login") {
          this.loginError = new SqlError({
            reason: classifyError({ cause, message: token.message.message, operation: "connect" }, "connection")
          })
        } else if (pending) {
          pending.error ??= new SqlError({
            reason: classifyError({ cause, message: token.message.message, operation: "execute" })
          })
        }
        if (token.message.class >= fatalSeverity) this.fatal(cause)
        return
      }
      case "ReturnValue":
        if (pending) {
          Object.defineProperty(pending.output, token.name, {
            value: token.value,
            enumerable: true,
            configurable: true,
            writable: true
          })
        }
        return
      case "ReturnStatus":
        if (pending) pending.returnStatus = token.value
        return
      case "EnvChange":
        return this.onEnvChange(token.change)
      case "LoginAck":
        if (token.version !== MssqlProtocol.tdsVersion) {
          throw new MssqlProtocol.ParseError({ message: "Server did not negotiate TDS 7.4" })
        }
        this.loginAck = true
        return
      case "FeatureAck": {
        if (this.state !== "login") {
          throw new MssqlProtocol.ParseError({ message: "Unexpected feature acknowledgement" })
        }
        const fedAuth = token.features.get(0x02)
        if (fedAuth !== undefined) {
          if (this.accessToken === undefined || this.fedAuthAck || fedAuth.length !== 0) {
            throw new MssqlProtocol.ParseError({ message: "Invalid federated authentication acknowledgement" })
          }
          this.fedAuthAck = true
        }
        return
      }
      case "Sspi":
        if (!this.settings.ntlm || this.state !== "login" || this.ntlmSent || this.ntlmChallenge) {
          throw new MssqlProtocol.ParseError({ message: "Unexpected SSPI challenge" })
        }
        this.ntlmChallenge = token.data
        return
    }
  }

  private onEnvChange(change: MssqlProtocol.EnvChange): void {
    switch (change._tag) {
      case "PacketSize":
        this.packetSize = change.size
        this.tls?.setMaxSendFragment(Math.min(change.size, maxTlsFragment))
        return
      case "Collation":
        this.collation = change.collation
        return
      case "BeginTransaction":
        this.transaction = change.descriptor
        return
      case "EndTransaction":
        this.transaction = noTransaction
        return
      case "Routing":
        if (this.state !== "login" || this.route) {
          throw new MssqlProtocol.ParseError({ message: "Unexpected SQL Server routing" })
        }
        this.route = { server: change.server, port: change.port }
        return
    }
  }
}

/** The session defaults tedious sets, so results match between the drivers. */
const initialSql = `SET ANSI_NULLS ON
SET ANSI_NULL_DFLT_ON ON
SET ANSI_PADDING ON
SET ANSI_WARNINGS ON
SET ARITHABORT ON
SET CONCAT_NULL_YIELDS_NULL ON
SET IMPLICIT_TRANSACTIONS OFF
SET NUMERIC_ROUNDABORT OFF
SET QUOTED_IDENTIFIER ON
SET TEXTSIZE 2147483647
SET TRANSACTION ISOLATION LEVEL READ COMMITTED
SET XACT_ABORT OFF
SET LANGUAGE us_english
SET DATEFORMAT mdy
SET DATEFIRST 7`
