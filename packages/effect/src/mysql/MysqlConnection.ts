/**
 * Native MySQL wire protocol sessions using portable socket and crypto services.
 *
 * @since 4.0.0
 */
import * as Cause from "../Cause.ts"
import * as Crypto from "../Crypto.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Redacted from "../Redacted.ts"
import type * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as SocketConnector from "../socket/SocketConnector.ts"
import { SqlError } from "../sql/SqlError.ts"
import * as Stream from "../Stream.ts"
import * as Auth from "./internal/auth.ts"
import { serverError } from "./internal/errors.ts"
import * as P from "./internal/protocol.ts"

/**
 * Connection and decoding settings for a native MySQL session.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config {
  readonly url?: Redacted.Redacted | undefined
  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly path?: string | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | Effect.Effect<Redacted.Redacted> | undefined
  readonly ssl?: boolean | SocketConnector.TlsOptions | undefined
  /**
   * The trusted server RSA public key as PEM or DER, used for SHA password authentication without TLS.
   */
  readonly serverPublicKey?: string | Uint8Array | undefined
  /**
   * Permits retrieving and trusting the server's RSA key over the connection. Disabled by default.
   */
  readonly allowPublicKeyRetrieval?: boolean | undefined
  readonly connectTimeout?: Duration.Input | undefined
  readonly connector?: SocketConnector.SocketConnector["Service"]["connect"] | undefined
  readonly maxPacketSize?: number | undefined
  readonly disablePreparedStatements?: boolean | undefined
}
/**
 * A result row indexed by the server's column names.
 *
 * @category models
 * @since 4.0.0
 */
export type Row = Readonly<Record<string, unknown>>
/**
 * Rows and command metadata returned by a MySQL statement.
 *
 * @category models
 * @since 4.0.0
 */
export interface Result {
  readonly rows: ReadonlyArray<Row>
  readonly values: ReadonlyArray<ReadonlyArray<unknown>>
  readonly columns: ReadonlyArray<P.Column>
  readonly affectedRows: number | bigint
  readonly insertId: number | bigint
  readonly warningStatus: number
}
/**
 * A serialized physical MySQL session with scoped streaming operations.
 *
 * @category models
 * @since 4.0.0
 */
export interface MysqlConnection {
  readonly query: (sql: string, params?: ReadonlyArray<unknown>, prepared?: boolean) => Effect.Effect<Result, SqlError>
  readonly stream: (sql: string, params?: ReadonlyArray<unknown>, prepared?: boolean) => Stream.Stream<Row, SqlError>
  readonly close: Effect.Effect<void>
  readonly isClosed: () => boolean
}
const attempt = <A>(f: () => A): Effect.Effect<A, SqlError> =>
  Effect.try({
    try: f,
    catch: (cause) => cause instanceof SqlError ? cause : P.protocolError("Invalid protocol data", cause)
  })
const asNumber = (n: number | bigint | null): number | bigint => {
  if (n === null) throw P.protocolError("Unexpected NULL integer")
  return typeof n === "bigint" && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n
}
const eof = (packet: Uint8Array): boolean => packet[0] === 254 && packet.length < 9
const rowObject = (columns: ReadonlyArray<P.Column>, values: ReadonlyArray<unknown>): Row =>
  Object.fromEntries(columns.map((c, i) => [c.name, values[i]]))

/**
 * Opens and authenticates one scoped native MySQL session.
 *
 * **Gotchas**
 *
 * SHA password authentication without TLS requires a pinned `serverPublicKey`
 * or explicit `allowPublicKeyRetrieval`. Retrieved keys are trusted without
 * independent verification. Interrupting an active query closes its session
 * to keep subsequent commands synchronized.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: Config
  ): Effect.fn.Return<MysqlConnection, SqlError, Scope.Scope | SocketConnector.SocketConnector | Crypto.Crypto> {
    const config = yield* attempt(() => {
      if (options.url === undefined) return options
      let url: URL
      try {
        url = new URL(Redacted.value(options.url))
      } catch {
        throw P.protocolError("Invalid MySQL connection URL")
      }
      if (url.protocol !== "mysql:") throw P.protocolError("Expected a mysql URL")
      return {
        ...options,
        host: url.hostname || options.host,
        port: url.port ? Number(url.port) : options.port,
        username: decodeURIComponent(url.username),
        password: Redacted.make(decodeURIComponent(url.password)),
        database: url.pathname.length > 1 ? decodeURIComponent(url.pathname.slice(1)) : options.database
      }
    })
    const maxPacketSize = config.maxPacketSize ?? 64 * 1024 * 1024
    yield* attempt(() => {
      if (!Number.isSafeInteger(maxPacketSize) || maxPacketSize < 1024 || maxPacketSize > 0xffffffff) {
        throw P.protocolError("maxPacketSize must be between 1024 and 4294967295")
      }
      for (const name of [config.username, config.database]) {
        if (name?.includes("\0")) throw Auth.authError("Connection fields cannot contain NUL bytes")
      }
    })
    const crypto = yield* Crypto.Crypto
    const connect = config.connector ?? (yield* SocketConnector.SocketConnector).connect
    const socket = yield* connect({
      host: config.host ?? "localhost",
      port: config.port ?? 3306,
      path: config.path,
      connectTimeout: config.connectTimeout
    }).pipe(Effect.mapError((cause) => P.protocolError("Connection failed", cause)))
    let closed = false
    const close = Effect.suspend(() => {
      if (closed) return Effect.void
      closed = true
      return socket.close
    })
    yield* Effect.addFinalizer(() => close)
    const io = P.packetIO(socket, maxPacketSize)
    const resolvePassword = config.password === undefined
      ? Effect.succeed("")
      : Effect.map(Effect.isEffect(config.password) ? config.password : Effect.succeed(config.password), Redacted.value)
    yield* Effect.gen(function*() {
      const password = yield* resolvePassword
      const greeting = yield* io.read
      if (greeting[0] === 255) return yield* Effect.fail(yield* attempt(() => serverError(greeting, "authenticate")))
      const handshake = yield* attempt(() => Auth.handshake(greeting))
      if (config.ssl && (handshake.capabilities & 0x800) === 0) {
        return yield* Effect.fail(Auth.authError("Server does not support TLS"))
      }
      const flags = yield* attempt(() =>
        Auth.capabilities(handshake.capabilities, config.database !== undefined, !!config.ssl)
      )
      if (config.ssl) {
        yield* io.write(Auth.header(flags, maxPacketSize))
        yield* socket.upgrade(typeof config.ssl === "object" ? config.ssl : {}).pipe(
          Effect.mapError((cause) => P.protocolError("TLS upgrade failed", cause))
        )
      }
      let plugin = handshake.plugin
      let salt = handshake.salt
      let awaitingKey = false
      let finalAuthSent = false
      const clearPassword = () =>
        Effect.suspend(() =>
          password.includes("\0")
            ? Effect.fail(Auth.authError("SHA password authentication does not support NUL bytes in passwords"))
            : Effect.succeed(P.encoder.encode(password + "\0"))
        )
      const rsaPassword = () =>
        Effect.suspend(() => {
          if (password.length === 0) {
            finalAuthSent = true
            return Effect.succeed(Uint8Array.of(0))
          }
          if (config.serverPublicKey !== undefined) {
            finalAuthSent = true
            return Auth.encryptPassword(crypto, config.serverPublicKey, password, salt)
          }
          if (config.allowPublicKeyRetrieval !== true) {
            return Effect.fail(
              Auth.authError(
                "RSA password authentication requires a trusted serverPublicKey or allowPublicKeyRetrieval: true"
              )
            )
          }
          awaitingKey = true
          return Effect.succeed(Uint8Array.of(plugin === "sha256_password" ? 1 : 2))
        })
      const initialResponse = () =>
        Effect.suspend(() => {
          awaitingKey = false
          finalAuthSent = false
          if (plugin === "sha256_password") {
            if (config.ssl) {
              finalAuthSent = true
              return clearPassword()
            }
            return rsaPassword()
          }
          return Auth.token(crypto, plugin, password, salt)
        })
      const auth = yield* initialResponse()
      const response = yield* attempt(() =>
        Auth.response(flags, maxPacketSize, config.username ?? "root", config.database, plugin, auth)
      )
      yield* io.write(response)
      for (let steps = 0; steps < 10; steps++) {
        const packet = yield* io.read
        if (packet[0] === 0 && !awaitingKey) return
        if (packet[0] === 255) return yield* Effect.fail(yield* attempt(() => serverError(packet, "authenticate")))
        if (packet[0] === 254) {
          const switchData = yield* attempt(() => {
            const r = new P.Reader(packet)
            r.u8()
            const plugin = r.nul()
            const salt = r.take(r.remaining)
            return { plugin, salt: salt[salt.length - 1] === 0 ? salt.subarray(0, salt.length - 1) : salt }
          })
          plugin = switchData.plugin
          salt = switchData.salt
          yield* io.write(yield* initialResponse())
        } else if (packet[0] === 1 && awaitingKey) {
          const key = packet.subarray(1, packet[packet.length - 1] === 0 ? packet.length - 1 : packet.length)
          const encrypted = yield* Auth.encryptPassword(crypto, key, password, salt)
          awaitingKey = false
          finalAuthSent = true
          yield* io.write(encrypted)
        } else if (
          packet[0] === 1 && plugin === "caching_sha2_password" && !finalAuthSent && packet.length === 2 &&
          packet[1] === 3
        ) {
          finalAuthSent = true
        } else if (
          packet[0] === 1 && plugin === "caching_sha2_password" && !finalAuthSent && packet.length === 2 &&
          packet[1] === 4
        ) {
          if (config.ssl) {
            finalAuthSent = true
            yield* io.write(yield* clearPassword())
          } else yield* io.write(yield* rsaPassword())
        } else return yield* Effect.fail(Auth.authError("Unexpected authentication response"))
      }
      return yield* Effect.fail(Auth.authError("Too many authentication exchanges"))
    }).pipe(
      Effect.timeoutOrElse({
        duration: config.connectTimeout ?? "10 seconds",
        orElse: () => Effect.fail(P.protocolError("Authentication timed out"))
      }),
      Effect.onError(() => close)
    )
    const semaphore = Semaphore.makeUnsafe(1)
    let commandReady = true
    const command = (payload: Uint8Array) =>
      Effect.gen(function*() {
        if (closed) return yield* Effect.fail(P.protocolError("Session is closed"))
        commandReady = payload[0] === 25
        io.reset()
        yield* io.write(payload)
      })
    const read = Effect.flatMap(io.read, (packet) => {
      if (packet[0] === 255) {
        commandReady = true
        return Effect.flatMap(attempt(() => serverError(packet)), Effect.fail)
      }
      return Effect.succeed(packet)
    })
    const start = Effect.fnUntraced(function*(sql: string, params: ReadonlyArray<unknown>, prepared: boolean) {
      let statement: number | undefined
      if (prepared) {
        yield* command(P.concat(Uint8Array.of(22), P.encoder.encode(sql)))
        const preparedPacket = yield* read
        const metadata = yield* attempt(() => {
          const r = new P.Reader(preparedPacket)
          if (r.u8() !== 0) throw P.protocolError("Invalid prepare response")
          const id = r.u32()
          const columns = r.u16()
          const parameters = r.u16()
          return { id, columns, parameters }
        })
        statement = metadata.id
        let finalized = false
        yield* Effect.addFinalizer(() =>
          Effect.suspend(() => {
            if (finalized || closed) return Effect.void
            finalized = true
            return commandReady
              ? command(P.concat(Uint8Array.of(25), P.u32(metadata.id))).pipe(Effect.catch(() => close))
              : close
          })
        )
        // Consume the preparation metadata before validating the parameter count.
        for (const count of [metadata.parameters, metadata.columns]) {
          if (count > 0) {
            for (let i = 0; i < count; i++) yield* read
            const end = yield* read
            if (!eof(end)) return yield* Effect.fail(P.protocolError("Missing prepare metadata terminator"))
          }
        }
        commandReady = true
        if (metadata.parameters !== params.length) {
          return yield* Effect.fail(P.protocolError("Prepared parameter count does not match"))
        }
        const packet = yield* attempt(() => P.executePacket(statement!, params))
        yield* command(packet)
      } else {
        const text = yield* attempt(() => P.interpolate(sql, params))
        yield* command(P.concat(Uint8Array.of(3), P.encoder.encode(text)))
      }
      let columns: Array<P.Column> = []
      let firstColumns: ReadonlyArray<P.Column> = []
      let affectedRows: number | bigint = 0
      let insertId: number | bigint = 0
      let warningStatus = 0
      let complete = false
      const readHeader = Effect.gen(function*() {
        while (true) {
          const first = yield* read
          if (first[0] === 251) return yield* Effect.fail(P.protocolError("LOCAL INFILE requests are disabled"))
          if (first[0] === 0) {
            const ok = yield* attempt(() => {
              const r = new P.Reader(first)
              r.u8()
              const affectedRows = asNumber(r.len())
              const insertId = asNumber(r.len())
              const status = r.u16()
              const warnings = r.u16()
              return { affectedRows, insertId, status, warnings }
            })
            affectedRows = ok.affectedRows
            insertId = ok.insertId
            warningStatus = ok.warnings
            if ((ok.status & 8) !== 0) continue
            complete = true
            commandReady = true
            return
          }
          const count = yield* attempt(() => Number(new P.Reader(first).len()))
          if (!Number.isSafeInteger(count) || count < 1 || count > 65535) {
            return yield* Effect.fail(P.protocolError("Invalid column count"))
          }
          columns = []
          for (let i = 0; i < count; i++) {
            const packet = yield* read
            columns.push(yield* attempt(() => P.column(packet)))
          }
          if (firstColumns.length === 0) firstColumns = columns
          const end = yield* read
          if (!eof(end)) return yield* Effect.fail(P.protocolError("Missing column terminator"))
          return
        }
      })
      yield* readHeader
      const finish = Effect.void
      const next = Effect.gen(function*() {
        while (!complete) {
          const packet = yield* read
          if (eof(packet)) {
            const metadata = yield* attempt(() => {
              const r = new P.Reader(packet)
              r.u8()
              const warnings = r.u16()
              const status = r.u16()
              return { warnings, status }
            })
            warningStatus = metadata.warnings
            if ((metadata.status & 8) !== 0) {
              yield* readHeader
              continue
            }
            complete = true
            commandReady = true
            return null
          }
          const values = yield* attempt(() => prepared ? P.binaryRow(packet, columns) : P.textRow(packet, columns))
          return { values, row: rowObject(columns, values) }
        }
        return null
      })
      return {
        next,
        finish,
        complete: () => complete,
        result: (rows: Array<Row>, values: Array<Array<unknown>>): Result => ({
          rows,
          values,
          columns: firstColumns,
          affectedRows,
          insertId,
          warningStatus
        })
      }
    })

    const guard = <A, R>(effect: Effect.Effect<A, SqlError, R>) =>
      effect.pipe(Effect.onError((cause) => {
        const errors = cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error)
        return errors.some((e) => e.reason._tag === "ConnectionError") || Cause.hasInterrupts(cause) ||
            Cause.hasDies(cause)
          ? close
          : Effect.void
      }))
    const query: MysqlConnection["query"] = (sql, params = [], prepared = !config.disablePreparedStatements) =>
      semaphore.withPermit(guard(Effect.scoped(Effect.gen(function*() {
        const result = yield* start(sql, params, prepared)
        const values: Array<Array<unknown>> = []
        const rows: Array<Row> = []
        while (true) {
          const row = yield* result.next
          if (row === null) break
          values.push(row.values)
          rows.push(row.row)
        }
        yield* result.finish
        return result.result(rows, values)
      }))))
    const stream: MysqlConnection["stream"] = (sql, params = [], prepared = !config.disablePreparedStatements) =>
      Stream.unwrap(Effect.gen(function*() {
        yield* Effect.acquireRelease(semaphore.take(1), () => semaphore.release(1), { interruptible: true })
        const result = yield* Effect.acquireRelease(
          guard(start(sql, params, prepared)).pipe(Effect.onInterrupt(() => close)),
          (result) => result.complete() ? result.finish.pipe(Effect.catch(() => close)) : close,
          { interruptible: true }
        )
        return Stream.fromPull(
          Effect.succeed(
            Effect.flatMap(
              guard(result.next),
              (values) => values === null ? Cause.done() : Effect.succeed([values.row] as const)
            )
          )
        )
      }))
    return {
      query,
      stream,
      close,
      isClosed: () => closed
    }
  }
)
