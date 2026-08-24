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
import * as EffectResult from "effect/Result"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import {
  AuthenticationError,
  ConnectionError,
  SqlError,
  type SqlErrorReason,
  UnknownError
} from "effect/unstable/sql/SqlError"
import { randomBytes } from "node:crypto"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"
import type { ConnectionOptions } from "node:tls"
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
      Effect.map((session) => new PgConnectionImpl(options, session, options.types ?? PgTypes.makeRegistry()))
    )
  })

interface Session {
  readonly socket: Duplex
  readonly parser: PgProtocol.Parser
  readonly processId: number
  readonly secretKey: number
  readonly parameters: Map<string, string>
}

class PgConnectionImpl implements PgConnection {
  readonly [TypeId]: TypeId = TypeId
  readonly config: Config
  readonly processId: number
  readonly session: Session
  readonly registry: PgTypes.Registry
  readonly semaphore = Semaphore.makeUnsafe(1)

  constructor(config: Config, session: Session, registry: PgTypes.Registry) {
    this.config = config
    this.session = session
    this.processId = session.processId
    this.registry = registry
  }

  private readonly execute = (sql: string, params: ReadonlyArray<unknown>): Effect.Effect<QueryOutput, SqlError> =>
    this.semaphore.withPermit(
      Effect.try({
        try: () => encodeQuery(sql, params, this.registry),
        catch: (cause) => queryError(cause, "PgConnection: Failed to encode query")
      }).pipe(Effect.flatMap((frame) => runQuery(this.session, this.registry, frame)))
    )

  readonly query = (sql: string, params?: ReadonlyArray<unknown>): Effect.Effect<Result, SqlError> =>
    this.execute(sql, params ?? []).pipe(Effect.map((output) => output.result))

  readonly queryValues = (
    sql: string,
    params?: ReadonlyArray<unknown>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError> =>
    this.execute(sql, params ?? []).pipe(Effect.map((output) => output.values))
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

const encodeQuery = (
  sql: string,
  params: ReadonlyArray<unknown>,
  registry: PgTypes.Registry
): Uint8Array => {
  const parameters = params.map((value) => inferParameter(value, registry))
  const parse = PgProtocol.encodeParse({
    name: "",
    query: sql,
    parameterTypes: parameters.map((parameter) => parameter.oid)
  })
  if (EffectResult.isFailure(parse)) throw parse.failure
  const encodeBind = PgProtocol.makeBindEncoder(
    (sink: PgProtocol.ValueSink, parameter: PgTypes.Parameter) => PgTypes.writeParameter(sink, parameter, registry)
  )
  const bind = encodeBind({ portal: "", statement: "", parameters })
  if (EffectResult.isFailure(bind)) throw bind.failure
  return concat([
    parse.success,
    bind.success,
    PgProtocol.encodeDescribe({ target: "portal", name: "" }),
    PgProtocol.encodeExecute({ portal: "", maxRows: 0 }),
    PgProtocol.encodeSync()
  ])
}

const concat = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  let length = 0
  for (const chunk of chunks) length += chunk.length
  const output = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

const queryError = (cause: unknown, message: string): SqlError =>
  new SqlError({ reason: new UnknownError({ cause, message, operation: "query" }) })

const connectionQueryError = (cause: unknown, message: string): SqlError =>
  new SqlError({ reason: new ConnectionError({ cause, message, operation: "query" }) })

type QueryPhase = "parse" | "bind" | "describe" | "rows" | "complete" | "error"

const parseCommandTag = (tag: string): { command: string; rowCount: number; oid: number | null } => {
  const parts = tag.split(" ")
  const command = parts[0] ?? ""
  if (command === "INSERT" && parts.length >= 3) {
    return { command, oid: Number(parts[1]), rowCount: Number(parts[2]) }
  }
  const last = parts[parts.length - 1]
  const rowCount = last !== undefined && /^\d+$/.test(last) ? Number(last) : 0
  return { command, oid: null, rowCount }
}

const runQuery = (
  session: Session,
  registry: PgTypes.Registry,
  frame: Uint8Array
): Effect.Effect<QueryOutput, SqlError> =>
  Effect.callback<QueryOutput, SqlError>((resume) => {
    const socket = session.socket
    let done = false
    let phase: QueryPhase = "parse"
    let fields: ReadonlyArray<PgProtocol.FieldDescription> = []
    let readField: PgProtocol.FieldReader<unknown> | undefined
    const rows: Array<Row> = []
    const values: Array<ReadonlyArray<unknown>> = []
    let command = ""
    let rowCount = 0
    let oid: number | null = null
    let failure: SqlError | undefined

    const cleanup = (): void => {
      socket.off("data", onData)
      socket.off("error", onError)
      socket.off("close", onClose)
    }
    const finish = (effect: Effect.Effect<QueryOutput, SqlError>): void => {
      if (done) return
      done = true
      cleanup()
      resume(effect)
    }
    const failFatal = (error: SqlError): void => {
      if (done) return
      socket.destroy()
      finish(Effect.fail(error))
    }
    const failDesync = (message: string): void =>
      failFatal(connectionQueryError(new Error(message), `PgConnection: ${message}`))
    const onError = (cause: Error): void => failFatal(connectionQueryError(cause, "PgConnection: Query socket error"))
    const onClose = (): void =>
      finish(Effect.fail(connectionQueryError(new Error("Connection closed"), "PgConnection: Connection closed")))

    const handleMessage = (message: PgProtocol.BackendMessage): void => {
      if (phase === "error") {
        switch (message._tag) {
          case "NoticeResponse":
          case "ParameterStatus":
            return
          case "ReadyForQuery":
            return finish(Effect.fail(failure!))
          default:
            return failDesync(`Unexpected ${message._tag} after ErrorResponse`)
        }
      }
      switch (message._tag) {
        case "NoticeResponse":
          return
        case "ParameterStatus":
          session.parameters.set(message.name, message.value)
          return
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
          fields = message.fields
          const reader = PgTypes.makeFieldReader(fields, registry)
          if (EffectResult.isFailure(reader)) {
            return failFatal(queryError(reader.failure, "PgConnection: Failed to decode row"))
          }
          readField = reader.success
          phase = "rows"
          return
        }
        case "NoData":
          if (phase !== "describe") return failDesync(`Unexpected NoData during ${phase}`)
          phase = "rows"
          return
        case "DataRow": {
          if (phase !== "rows" || readField === undefined) {
            return failDesync(`Unexpected DataRow during ${phase}`)
          }
          if (message.values.length !== fields.length) {
            return failDesync(`DataRow has ${message.values.length} values for ${fields.length} fields`)
          }
          try {
            const rowValues = message.values.map((value, index) =>
              value === null ? null : readField!(value, 0, value.length, index)
            )
            const row: Record<string, unknown> = {}
            for (let index = 0; index < fields.length; index++) {
              Object.defineProperty(row, fields[index].name, {
                value: rowValues[index],
                enumerable: true,
                configurable: true,
                writable: true
              })
            }
            values.push(rowValues)
            rows.push(row)
          } catch (cause) {
            return failFatal(queryError(cause, "PgConnection: Failed to decode row"))
          }
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
          const error = new SqlError({
            reason: classifyFields(message.fields, "PgConnection: Query failed", "query")
          })
          if (phase === "parse") return failFatal(error)
          failure = error
          phase = "error"
          return
        }
        case "ReadyForQuery": {
          if (phase !== "complete") return failDesync(`Unexpected ReadyForQuery during ${phase}`)
          const result: Result = {
            command,
            rowCount,
            oid,
            rows,
            fields: fields.map((field) => ({ name: field.name, dataTypeId: field.dataTypeOid }))
          }
          return finish(Effect.succeed({ result, values }))
        }
        case "CopyInResponse":
        case "CopyOutResponse":
        case "CopyBothResponse":
        case "CopyData":
        case "CopyDone":
          return failDesync(`Unexpected ${message._tag}; COPY is not supported`)
        case "NotificationResponse":
          return
        default:
          return failDesync(`Unexpected ${message._tag} during ${phase}`)
      }
    }

    const onData = (chunk: Uint8Array): void => {
      let messages: ReadonlyArray<PgProtocol.BackendMessage>
      try {
        messages = session.parser.push(chunk)
      } catch (cause) {
        return failFatal(connectionQueryError(cause, "PgConnection: Failed to parse query response"))
      }
      for (const message of messages) {
        if (done) return
        handleMessage(message)
      }
    }

    if (socket.destroyed || !socket.writable) {
      finish(Effect.fail(connectionQueryError(new Error("Connection is closed"), "PgConnection: Connection is closed")))
      return
    }
    socket.on("data", onData)
    socket.on("error", onError)
    socket.on("close", onClose)
    try {
      socket.write(frame)
    } catch (cause) {
      failFatal(connectionQueryError(cause, "PgConnection: Failed to write query"))
    }

    return Effect.sync(() => {
      if (done) return
      done = true
      cleanup()
      socket.destroy()
    })
  })

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
