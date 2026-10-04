/**
 * Native TDS sessions for Microsoft SQL Server.
 *
 * @since 4.0.0
 */
import type * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Pull from "../Pull.ts"
import * as Redacted from "../Redacted.ts"
import type * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as SocketConnector from "../socket/SocketConnector.ts"
import type { SqlError } from "../sql/SqlError.ts"
import * as Stream from "../Stream.ts"
import { failure } from "./internal/errors.ts"
import * as Protocol from "./internal/protocol.ts"
import type { BoundParameter, ServerError } from "./MssqlTypes.ts"

/**
 * Connection settings for native TDS sessions using SQL authentication.
 *
 * **Gotchas**
 *
 * Strict encryption requires SQL Server 2022 or another TDS 8.0 server.
 * TDS 7.x encapsulated TLS is unsupported. Disabling encryption also requires
 * `allowPlaintext: true` and a server that permits unencrypted connections.
 *
 * @category models
 * @since 4.0.0
 */
export interface Config {
  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | Effect.Effect<Redacted.Redacted> | undefined
  readonly applicationName?: string | undefined
  readonly encryption?: "strict" | "disable" | undefined
  readonly allowPlaintext?: boolean | undefined
  readonly tls?: SocketConnector.TlsOptions | undefined
  readonly connectTimeout?: Duration.Input | undefined
  readonly packetSize?: number | undefined
  readonly maxMessageSize?: number | undefined
  readonly connector?: SocketConnector.SocketConnector["Service"]["connect"] | undefined
}

/**
 * Native SQL Server results including row values, output parameters, and notices.
 *
 * @category models
 * @since 4.0.0
 */
export interface Result {
  readonly rows: ReadonlyArray<Record<string, unknown>>
  readonly values: ReadonlyArray<ReadonlyArray<unknown>>
  readonly columns: ReadonlyArray<string>
  readonly rowCount: bigint
  readonly output: Readonly<Record<string, unknown>>
  readonly returnStatus: number
  readonly notices: ReadonlyArray<ServerError>
}

/**
 * One physical TDS session with serialized queries and scoped reservations.
 *
 * @category models
 * @since 4.0.0
 */
export interface MssqlConnection {
  readonly config: Config
  readonly query: (sql: string, params?: ReadonlyArray<unknown>) => Effect.Effect<Result, SqlError>
  readonly call: (name: string, params: ReadonlyArray<BoundParameter>) => Effect.Effect<Result, SqlError>
  readonly stream: (sql: string, params?: ReadonlyArray<unknown>) => Stream.Stream<Record<string, unknown>, SqlError>
  readonly reserve: Effect.Effect<MssqlConnection, SqlError, Scope.Scope>
  readonly close: Effect.Effect<void>
  readonly isClosed: () => boolean
}

class PacketReader {
  private bytes: Uint8Array = new Uint8Array()
  private expectedId = 1
  readonly socket: SocketConnector.Connection
  readonly maximum: number
  constructor(socket: SocketConnector.Connection, maximum: number) {
    this.socket = socket
    this.maximum = maximum
  }
  readonly next = Effect.fnUntraced(function*(this: PacketReader) {
    while (true) {
      if (this.bytes.length >= 8) {
        const length = this.bytes[2] * 256 + this.bytes[3]
        if (length < 8 || length > this.maximum) {
          return yield* Effect.fail(failure(new Error("Invalid TDS packet length"), "read", true))
        }
        if (this.bytes.length >= length) {
          const packet = this.bytes.subarray(0, length)
          this.bytes = this.bytes.subarray(length)
          if (packet[0] !== 4 || (packet[1] & ~1) !== 0 || packet[6] !== this.expectedId) {
            return yield* Effect.fail(failure(new Error("Invalid TDS response packet header"), "read", true))
          }
          const end = (packet[1] & 1) !== 0
          this.expectedId = end ? 1 : (this.expectedId + 1) & 255
          return { bytes: packet.subarray(8), end }
        }
      }
      const chunks = yield* this.socket.pull.pipe(Effect.mapError((cause) => failure(cause, "read", true)))
      const binary: Array<Uint8Array> = []
      for (const chunk of chunks) {
        if (!(chunk instanceof Uint8Array)) {
          return yield* Effect.fail(failure(new Error("TDS requires a binary socket"), "read", true))
        }
        binary.push(chunk)
      }
      this.bytes = Protocol.concat([this.bytes, ...binary])
    }
  })
}

const bound = (params: ReadonlyArray<unknown>): ReadonlyArray<BoundParameter> =>
  params.map((param, index) => {
    if (typeof param === "object" && param !== null && "kind" in param && param.kind === "MssqlParam") {
      const custom = param as unknown as {
        paramA: BoundParameter["type"]
        paramB: unknown
        paramC: BoundParameter["options"]
      }
      return { name: String(index + 1), type: custom.paramA, value: custom.paramB, options: custom.paramC }
    }
    return { name: String(index + 1), type: Protocol.infer(param), value: param }
  })

/**
 * Opens a scoped native SQL Server session and authenticates with LOGIN7.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: Config
  ): Effect.fn.Return<MssqlConnection, SqlError, Scope.Scope | SocketConnector.SocketConnector> {
    const strict = options.encryption !== "disable"
    if (!strict && options.allowPlaintext !== true) {
      return yield* Effect.fail(
        failure(new Error("Disabling SQL Server encryption requires allowPlaintext: true"), "connect")
      )
    }
    const maximum = options.maxMessageSize ?? 16 * 1024 * 1024
    let packetSize = options.packetSize ?? 4096
    if (
      !Number.isSafeInteger(maximum) || maximum < 512 || !Number.isInteger(packetSize) || packetSize < 512 ||
      packetSize > 32767
    ) {
      return yield* Effect.fail(failure(new Error("Invalid TDS packet or message size"), "connect"))
    }
    const connector = options.connector ?? (yield* SocketConnector.SocketConnector).connect
    const socket = yield* connector({
      host: options.host ?? "localhost",
      port: options.port ?? 1433,
      connectTimeout: options.connectTimeout,
      tls: strict ? { ...options.tls, alpnProtocols: ["tds/8.0"] } : false
    }).pipe(Effect.mapError((cause) => failure(cause, "connect", true)))
    let closed = false
    const close = Effect.suspend(() => {
      if (closed) return Effect.void
      closed = true
      return socket.close
    })
    yield* Effect.addFinalizer(() => close)
    const reader = new PacketReader(socket, maximum)
    const send = (type: number, bytes: Uint8Array) =>
      Effect.try({ try: () => Protocol.packets(type, bytes, packetSize), catch: (cause) => failure(cause, "encode") })
        .pipe(
          Effect.flatMap((packets) => socket.writeAll(packets as Arr.NonEmptyReadonlyArray<Uint8Array>)),
          Effect.mapError((cause) =>
            "reason" in cause && cause._tag === "SqlError" ? cause : failure(cause, "write", true)
          )
        )
    const receive = Effect.gen(function*() {
      const parts: Array<Uint8Array> = []
      let total = 0
      while (true) {
        const packet = yield* reader.next()
        total += packet.bytes.length
        if (total > maximum) {
          return yield* Effect.fail(failure(new Error("TDS response exceeds maximum size"), "read", true))
        }
        parts.push(packet.bytes)
        if (packet.end) return Protocol.concat(parts)
      }
    })
    const startup = Effect.gen(function*() {
      yield* send(0x12, Protocol.prelogin(strict))
      const response = yield* receive
      const negotiated = yield* Effect.try({
        try: () => Protocol.encryption(response),
        catch: (cause) => failure(cause, "prelogin", true)
      })
      if (strict ? negotiated !== 1 && negotiated !== 3 : negotiated !== 2) {
        return yield* Effect.fail(
          failure(
            new Error("Server requires unsupported TDS 7.x encapsulated TLS or rejected strict encryption"),
            "prelogin",
            true
          )
        )
      }
      const password = options.password === undefined
        ? ""
        : Redacted.value(
          yield* (Effect.isEffect(options.password) ? options.password : Effect.succeed(options.password))
        )
      const payload = yield* Effect.try({
        try: () =>
          Protocol.login({
            host: options.host ?? "localhost",
            username: options.username ?? "sa",
            password,
            database: options.database ?? "master",
            applicationName: options.applicationName ?? "effect/mssql",
            packetSize,
            strict
          }),
        catch: (cause) => failure(cause, "login")
      })
      yield* send(0x10, payload)
      const loginBytes = yield* receive
      const parser = new Protocol.Parser(maximum)
      yield* Effect.try({ try: () => parser.feed(loginBytes, true), catch: (cause) => failure(cause, "login", true) })
      if (parser.errors.length > 0) return yield* Effect.fail(failure(parser.errors[0], "login"))
      if (!parser.loginAcknowledged || !parser.done || parser.doneError) {
        return yield* Effect.fail(failure(new Error("SQL Server did not acknowledge login"), "login", true))
      }
      if (parser.packetSize !== undefined) packetSize = parser.packetSize
    }).pipe(Effect.onError(() => close))
    yield* startup.pipe(
      Effect.timeoutOrElse({
        duration: options.connectTimeout ?? "5 seconds",
        orElse: () => Effect.fail(failure(new Error("SQL Server startup timed out"), "connect", true))
      }),
      Effect.onError(() => close)
    )
    const semaphore = Semaphore.makeUnsafe(1)
    const queries = Semaphore.makeUnsafe(1)
    let transaction = new Uint8Array(8)
    const check = Effect.suspend(() =>
      closed ? Effect.fail(failure(new Error("SQL Server connection is closed"), "query", true)) : Effect.void
    )
    const start = (sql: string, params: ReadonlyArray<unknown>, collect: boolean, procedure?: string) =>
      Effect.gen(function*() {
        yield* check
        const encoded = yield* Effect.try({
          try: () => {
            const parameters = procedure === undefined
              ? bound(params)
              : params as ReadonlyArray<BoundParameter>
            if (procedure !== undefined) return { type: 3, bytes: Protocol.rpc(procedure, parameters, transaction) }
            if (params.length === 0) return { type: 1, bytes: Protocol.batch(sql, transaction) }
            const declarations = parameters.map((p) => `@${p.name} ${Protocol.declaration(p)}`).join(",")
            return {
              type: 3,
              bytes: Protocol.rpc("sp_executesql", [{ name: "stmt", type: "NVarChar", value: sql }, {
                name: "params",
                type: "NVarChar",
                value: declarations
              }, ...parameters], transaction)
            }
          },
          catch: (cause) => failure(cause, "encode")
        })
        // From the first write onward, interruption or a protocol error retires
        // the session. No unconsumed response can leak into a subsequent query.
        yield* send(encoded.type, encoded.bytes).pipe(Effect.onError(() => close))
        const parser = new Protocol.Parser(maximum, collect)
        let finished = false
        const next = Effect.gen(function*() {
          if (finished) return yield* Cause.done()
          while (true) {
            const packet = yield* reader.next()
            const rows = yield* Effect.try({
              try: () => parser.feed(packet.bytes, packet.end),
              catch: (cause) => failure(cause, "decode", true)
            })
            if (packet.end) {
              if (parser.transactionChanged) transaction = parser.transaction
              finished = true
              if (!parser.done) {
                yield* close
                return yield* Effect.fail(failure(new Error("TDS response omitted final DONE"), "decode", true))
              }
              if (parser.errors.length > 0) {
                if (parser.errors.some((error) => error.severity >= 20)) yield* close
                return yield* Effect.fail(failure(parser.errors[0], "query"))
              }
              if (parser.doneError) {
                return yield* Effect.fail(failure(new Error("SQL Server reported an unsuccessful DONE"), "query"))
              }
            }
            if (rows.length > 0) return rows as Arr.NonEmptyReadonlyArray<Record<string, unknown>>
            if (finished) return yield* Cause.done()
          }
        }).pipe(Effect.onError((cause) => Pull.isDoneCause(cause) || finished ? Effect.void : close))
        const result = (): Result => ({
          rows: parser.rowObjects,
          values: parser.rows,
          columns: parser.columns.map((column) => column.name),
          rowCount: parser.rowCount,
          output: parser.output,
          returnStatus: parser.returnStatus,
          notices: parser.notices
        })
        return { next, result, finished: () => finished }
      })
    const execute = (sql: string, params: ReadonlyArray<unknown>, procedure?: string) =>
      Effect.gen(function*() {
        const operation = yield* start(sql, params, true, procedure)
        yield* Stream.runDrain(Stream.fromPull(Effect.succeed(operation.next)))
        return operation.result()
      }).pipe(Effect.onInterrupt(() => close))
    const create = (reserved: boolean): MssqlConnection => {
      const locked = <A>(effect: Effect.Effect<A, SqlError>) =>
        reserved ? queries.withPermit(effect) : semaphore.withPermit(queries.withPermit(effect))
      const connection: MssqlConnection = {
        config: options,
        query: (sql, params = []) => locked(execute(sql, params)),
        call: (name, params) => locked(execute("", params, name)),
        stream: (sql, params = []) =>
          Stream.scoped(Stream.fromPull(Effect.gen(function*() {
            if (!reserved) {
              yield* Effect.acquireRelease(semaphore.take(1), () => semaphore.release(1), { interruptible: true })
            }
            yield* Effect.acquireRelease(queries.take(1), () => queries.release(1), { interruptible: true })
            const operation = yield* Effect.acquireRelease(
              start(sql, params, false).pipe(Effect.onInterrupt(() => close)),
              (operation) => operation.finished() ? Effect.void : close,
              { interruptible: true }
            )
            return operation.next
          }))),
        reserve: Effect.gen(function*() {
          if (!reserved) {
            yield* Effect.acquireRelease(semaphore.take(1), () => semaphore.release(1), { interruptible: true })
          }
          yield* check
          return create(true)
        }),
        close,
        isClosed: () => closed
      }
      return connection
    }
    return create(false)
  }
)
