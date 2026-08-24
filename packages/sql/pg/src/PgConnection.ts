/**
 * A native PostgreSQL session built on the `PgProtocol` wire codec.
 *
 * `make` opens the transport (`node:net`, `node:tls`, a unix socket, or a
 * caller-supplied `Duplex` factory), performs the startup and authentication
 * exchange (trust, cleartext, MD5, and SCRAM-SHA-256), and resolves once the
 * backend sends `ReadyForQuery`. Releasing the scope sends `Terminate` and
 * destroys the socket. This module never imports `pg`.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import type * as Scope from "effect/Scope"
import { AuthenticationError, ConnectionError, SqlError, type SqlErrorReason } from "effect/unstable/sql/SqlError"
import { randomBytes } from "node:crypto"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"
import type { ConnectionOptions } from "node:tls"
import { classifySqlState } from "./internal/sqlError.ts"
import * as PgAuth from "./PgAuth.ts"
import * as PgProtocol from "./PgProtocol.ts"

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
}

/**
 * A single PostgreSQL session, connected and authenticated.
 *
 * The query surface lands in later slices; for now a connection carries its
 * configuration and the backend process id from `BackendKeyData`. The
 * `CancelRequest` secret stays private.
 *
 * @category models
 * @since 4.0.0
 */
export interface PgConnection {
  readonly [TypeId]: TypeId
  readonly config: Config
  readonly processId: number
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
    if (Result.isFailure(resolved)) return Effect.fail(resolved.failure)
    const config = resolved.success
    return Effect.acquireRelease(
      connect(config),
      (session) =>
        Effect.sync(() => {
          if (session.socket.writable) {
            session.socket.write(PgProtocol.encodeTerminate())
          }
          session.socket.destroy()
        }),
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
      }),
      Effect.map((session) => new PgConnectionImpl(options, session))
    )
  })

interface Session {
  readonly socket: Duplex
  readonly parser: PgProtocol.Parser
  readonly processId: number
  readonly secretKey: number
  readonly parameters: ReadonlyMap<string, string>
}

class PgConnectionImpl implements PgConnection {
  readonly [TypeId]: TypeId = TypeId
  readonly config: Config
  readonly processId: number
  readonly session: Session

  constructor(config: Config, session: Session) {
    this.config = config
    this.session = session
    this.processId = session.processId
  }
}

const connect = (config: ResolvedConfig): Effect.Effect<Session, SqlError> =>
  Effect.callback<Session, SqlError>((resume) => {
    let done = false
    let socket: Duplex
    let parser: PgProtocol.Parser | undefined
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

    const handleMessage = (message: PgProtocol.BackendMessage): void => {
      switch (message._tag) {
        case "NoticeResponse":
        case "NegotiateProtocolVersion":
          return
        case "AuthenticationOk":
          if (scram !== undefined) {
            return failAuth(
              new Error("The server completed authentication without proving its identity"),
              "PgConnection: SCRAM exchange did not complete"
            )
          }
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
          if (Result.isFailure(hashed)) {
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
          if (Result.isFailure(init)) {
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
          if (Result.isFailure(next)) {
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
          if (Result.isFailure(verified)) {
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
      let messages: ReadonlyArray<PgProtocol.BackendMessage>
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
      parser = PgProtocol.makeParser()
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
      if (Result.isFailure(response)) {
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

const resolveConfig = (options: Config): Result.Result<ResolvedConfig, SqlError> => {
  try {
    return Result.succeed(resolveConfigUnsafe(options))
  } catch (error) {
    if (error instanceof SqlError) return Result.fail(error)
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
