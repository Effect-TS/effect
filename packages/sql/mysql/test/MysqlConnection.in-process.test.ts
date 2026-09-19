import { MysqlConnection, MysqlProtocol } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Result } from "effect"
import * as TestClock from "effect/testing/TestClock"
import * as Net from "node:net"

/**
 * A MySQL server that exists only to say something specific. The real server
 * is reliable, which is exactly what makes it useless for these cases: a
 * sequence-id gap, a capability it will never withhold, a socket that dies
 * mid-command. Each test scripts the bytes it needs and asserts what the
 * client makes of them.
 */

const write = (run: Parameters<typeof MysqlProtocol.encodeWith>[0]): Uint8Array => {
  const result = MysqlProtocol.encodeWith(run)
  assert.isTrue(Result.isSuccess(result), "failed to encode test bytes")
  return (result as Result.Success<Uint8Array, never>).success
}

const offeredFlags: ReadonlyArray<MysqlProtocol.Capability> = [
  MysqlProtocol.Capability.protocol41,
  MysqlProtocol.Capability.pluginAuth,
  MysqlProtocol.Capability.secureConnection,
  MysqlProtocol.Capability.deprecateEof,
  MysqlProtocol.Capability.pluginAuthLenencClientData,
  MysqlProtocol.Capability.multiStatements,
  MysqlProtocol.Capability.multiResults,
  MysqlProtocol.Capability.transactions,
  MysqlProtocol.Capability.connectWithDb
]

/** A `HandshakeV10` greeting, minus whichever capabilities a test withholds. */
const greeting = (options: {
  readonly without?: ReadonlyArray<MysqlProtocol.Capability> | undefined
  readonly authPlugin?: string | undefined
} = {}): Uint8Array => {
  const without = options.without ?? []
  const offered = MysqlProtocol.Capabilities.of(offeredFlags.filter((flag) => !without.includes(flag)))
  const wire = MysqlProtocol.Capabilities.wire(offered)
  const plugin = options.authPlugin ?? "mysql_native_password"
  return MysqlProtocol.frame(
    write((w) => {
      w.uint8(10)
      w.cString("8.4.0")
      w.uint32(42)
      w.fill(0x61, 8) // scramble head
      w.uint8(0)
      w.uint16(wire & 0xffff)
      w.uint8(MysqlProtocol.defaultCollation)
      w.uint16(2) // autocommit
      w.uint16((wire >>> 16) & 0xffff)
      w.uint8(21) // scramble length
      w.fill(0, 10)
      w.fill(0x62, 12)
      w.uint8(0)
      w.cString(plugin)
    }),
    0
  )
}

const okPacket = (sequenceId: number): Uint8Array =>
  MysqlProtocol.frame(
    write((w) => {
      w.uint8(0x00)
      w.lenencInt(0)
      w.lenencInt(0)
      w.uint16(2)
      w.uint16(0)
    }),
    sequenceId
  )

const errPacket = (sequenceId: number, code: number, state: string, message: string): Uint8Array =>
  MysqlProtocol.frame(
    write((w) => {
      w.uint8(0xff)
      w.uint16(code)
      w.utf8("#")
      w.utf8(state)
      w.utf8(message)
    }),
    sequenceId
  )

/**
 * Starts a server that greets each connection and then answers every packet
 * the client sends with the next entry of `replies`. A reply of `undefined`
 * means "say nothing", which is how the silent cases are scripted.
 */
const withServer = (options: {
  readonly hello?: Uint8Array | undefined
  readonly replies: ReadonlyArray<Uint8Array | undefined>
  readonly onExhausted?: ((socket: Net.Socket) => void) | undefined
}) =>
  Effect.acquireRelease(
    Effect.callback<{ readonly port: number; readonly server: Net.Server }>((resume) => {
      const server = Net.createServer((socket) => {
        let index = 0
        if (options.hello !== undefined) socket.write(options.hello)
        socket.on("error", () => {})
        socket.on("data", () => {
          if (index < options.replies.length) {
            const reply = options.replies[index++]
            if (reply !== undefined) socket.write(reply)
            return
          }
          options.onExhausted?.(socket)
        })
      })
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()
        assert.isTrue(address !== null && typeof address !== "string", "server did not bind")
        resume(Effect.succeed({ port: (address as Net.AddressInfo).port, server }))
      })
    }),
    ({ server }) =>
      Effect.callback<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
  )

const connect = (port: number, overrides: Partial<MysqlConnection.Config> = {}) =>
  MysqlConnection.make({
    host: "127.0.0.1",
    port,
    username: "root",
    password: undefined,
    ...overrides
  })

/** The reply pair a clean session needs: auth OK, then OK for `SET time_zone`. */
const established = [okPacket(2), okPacket(1)]

describe("MysqlConnection against a scripted server", () => {
  it.effect("refuses a server that does not offer CLIENT_DEPRECATE_EOF", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting({ without: [MysqlProtocol.Capability.deprecateEof] }),
        replies: established
      })
      const error = yield* Effect.flip(connect(port))
      assert.include(error.message, "MySQL 8.0 or newer is required")
      assert.include(String(error.reason.cause), "CLIENT_DEPRECATE_EOF")
    }).pipe(Effect.scoped))

  it.effect("refuses a server that does not offer CLIENT_PROTOCOL_41", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting({ without: [MysqlProtocol.Capability.protocol41] }),
        replies: established
      })
      const error = yield* Effect.flip(connect(port))
      assert.include(String(error.reason.cause), "CLIENT_PROTOCOL_41")
    }).pipe(Effect.scoped))

  it.effect("surfaces an ERR sent in place of a greeting", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: errPacket(0, 1040, "08004", "Too many connections"),
        replies: []
      })
      const error = yield* Effect.flip(connect(port))
      assert.include(String(error.reason.cause), "Too many connections")
    }).pipe(Effect.scoped))

  it.effect("fails the connection when authentication is refused", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting(),
        replies: [errPacket(2, 1045, "28000", "Access denied for user 'root'@'localhost'")]
      })
      const error = yield* Effect.flip(connect(port))
      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.include(String(error.reason.cause), "Access denied")
    }).pipe(Effect.scoped))

  it.effect("rejects an authentication plugin it does not implement", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting({ authPlugin: "auth_gssapi_client" }),
        replies: established
      })
      const error = yield* Effect.flip(connect(port))
      assert.include(String(error.reason.cause), "auth_gssapi_client")
    }).pipe(Effect.scoped))

  it.effect("fails a command whose reply carries the wrong sequence id", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting(),
        // The reply to a command must start at 1. Answering with 7 is the
        // desync a real server never produces and the client must not ignore.
        replies: [...established, okPacket(7)]
      })
      const connection = yield* connect(port)
      const error = yield* Effect.flip(connection.query("SELECT 1"))
      assert.include(String(error.reason.cause), "sequence id")
    }).pipe(Effect.scoped))

  it.effect("refuses a LOCAL INFILE request", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting(),
        // 0xfb opens a LOCAL INFILE request. The capability is never
        // negotiated, so a server asking for one is in violation.
        replies: [...established, MysqlProtocol.frame(new Uint8Array([0xfb, 0x61]), 1)]
      })
      const connection = yield* connect(port)
      const error = yield* Effect.flip(connection.query("SELECT 1"))
      assert.include(error.message, "LOCAL INFILE")
    }).pipe(Effect.scoped))

  it.effect("fails an in-flight command when the socket closes under it", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({
        hello: greeting(),
        replies: established,
        onExhausted: (socket) => socket.destroy()
      })
      const connection = yield* connect(port)
      const error = yield* Effect.flip(connection.query("SELECT 1"))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      // The session is written off rather than left half-read.
      const next = yield* Effect.flip(connection.query("SELECT 2"))
      assert.strictEqual(next.reason._tag, "ConnectionError")
    }).pipe(Effect.scoped))

  it.effect("gives up on a server that accepts the socket and never greets", () =>
    Effect.gen(function*() {
      const { port } = yield* withServer({ replies: [] })
      const fiber = yield* Effect.forkChild(
        Effect.scoped(Effect.flip(connect(port, { connectTimeout: "2 seconds" })))
      )
      yield* TestClock.adjust("2 seconds")
      const error = yield* Fiber.join(fiber)
      assert.include(error.message, "Connection timed out")
    }).pipe(Effect.scoped))
})
