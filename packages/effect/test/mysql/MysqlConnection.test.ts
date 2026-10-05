import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as P from "effect/mysql/internal/protocol"
import * as MysqlClient from "effect/mysql/MysqlClient"
import * as MysqlConnection from "effect/mysql/MysqlConnection"
import * as MysqlPool from "effect/mysql/MysqlPool"
import * as Queue from "effect/Queue"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Redacted from "effect/Redacted"
import * as Scheduler from "effect/Scheduler"
import * as Socket from "effect/socket/Socket"
import * as SocketConnector from "effect/socket/SocketConnector"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"

const capabilities = 0x1 | 0x4 | 0x8 | 0x200 | 0x800 | 0x2000 | 0x8000 | 0x20000 | 0x40000 | 0x80000
const salt = P.encoder.encode("12345678901234567890")
const greeting = (plugin: string) =>
  P.concat(
    Uint8Array.of(10),
    P.encoder.encode("8.4.0\0"),
    P.u32(42),
    salt.subarray(0, 8),
    Uint8Array.of(
      0,
      capabilities & 255,
      (capabilities >>> 8) & 255,
      45,
      2,
      0,
      (capabilities >>> 16) & 255,
      capabilities >>> 24,
      21
    ),
    new Uint8Array(10),
    salt.subarray(8),
    Uint8Array.of(0),
    P.encoder.encode(plugin + "\0")
  )
const eof = (status = 2) => Uint8Array.of(254, 0, 0, status & 255, status >>> 8)
const ok = Uint8Array.of(0, 0, 0, 2, 0, 0, 0)
const col = (name = "answer", type = 3) =>
  P.concat(
    ...["def", "db", "table", "table", name, name].map((s) => P.lengthEncoded(P.encoder.encode(s))),
    Uint8Array.of(12, 45, 0),
    P.u32(20),
    Uint8Array.of(type, 0, 0, 0, 0, 0)
  )
const result = (
  binary: boolean,
  name = "answer",
  value = 42
): Array<Uint8Array> => [
  Uint8Array.of(1),
  col(name),
  eof(),
  binary ? P.concat(Uint8Array.of(0, 0), P.u32(value)) : P.lengthEncoded(P.encoder.encode(String(value))),
  eof()
]
const fixture = (
  options?: {
    readonly plugin?: string
    readonly fullAuth?: boolean
    readonly fragment?: boolean
    readonly stall?: boolean
    readonly multi?: boolean
    readonly onQuery?: (sql: string) => void
  }
) =>
  Effect.gen(function*() {
    const incoming = yield* Queue.unbounded<Uint8Array>()
    const written: Array<Uint8Array> = []
    const commands: Array<string> = []
    const events: Array<string> = []
    let closed = false
    let authenticated = false
    let sslRequested = false
    let latestSql = ""
    let connects = 0
    const send = (packets: ReadonlyArray<Uint8Array>, start = 1) =>
      Effect.forEach(packets, (packet, i) => {
        const bytes = P.frame(packet, start + i)
        return options?.fragment
          ? Effect.forEach(Array.from(bytes, (b) => Uint8Array.of(b)), (chunk) => Queue.offer(incoming, chunk), {
            discard: true
          })
          : Queue.offer(incoming, bytes).pipe(Effect.asVoid)
      }, { discard: true })
    const write = (chunk: string | Uint8Array | Socket.CloseEvent) =>
      Effect.gen(function*() {
        if (Socket.isCloseEvent(chunk)) {
          closed = true
          return
        }
        const bytes = typeof chunk === "string" ? P.encoder.encode(chunk) : chunk
        const payload = bytes.subarray(4)
        written.push(bytes.slice())
        events.push("write")
        if (!authenticated) {
          if (payload.length === 32) {
            sslRequested = true
            return
          }
          if (options?.fullAuth && payload.length > 32) {
            yield* send([Uint8Array.of(1, 4)], sslRequested ? 3 : 2)
            return
          }
          authenticated = true
          yield* send([ok], options?.fullAuth ? 5 : sslRequested ? 3 : 2)
          return
        }
        const command = payload[0]
        if (command === 25) {
          commands.push("CLOSE")
          return
        }
        if (command === 22) {
          latestSql = P.decoder.decode(payload.subarray(1))
          commands.push(`PREPARE ${latestSql}`)
          const count = latestSql.includes("?") ? 1 : 0
          const metadata = P.concat(Uint8Array.of(0), P.u32(99), Uint8Array.of(1, 0, count, 0, 0, 0, 0))
          yield* send([metadata, ...(count ? [col("parameter"), eof()] : []), col(), eof()])
          return
        }
        const sql = command === 3 ? P.decoder.decode(payload.subarray(1)) : latestSql
        commands.push(sql)
        options?.onQuery?.(sql)
        if (options?.stall) return
        if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/.test(sql)) {
          yield* send([ok])
          return
        }
        if (sql === "BROKEN") {
          yield* send([P.concat(Uint8Array.of(255, 40, 4), P.encoder.encode("#42000Syntax error"))])
          return
        }
        if (options?.multi) {
          const first = result(command === 23)
          first[first.length - 1] = eof(10)
          yield* send([...first, ...result(command === 23, "other", 7)])
          return
        }
        yield* send(result(command === 23))
      })
    const connector: SocketConnector.SocketConnector["Service"]["connect"] = () =>
      Effect.gen(function*() {
        connects++
        closed = false
        authenticated = false
        yield* send([greeting(options?.plugin ?? "mysql_native_password")], 0)
        return {
          pull: Effect.map(Queue.take(incoming), (bytes) => [bytes] as const),
          run: () => Effect.never,
          write,
          writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true }),
          upgrade: () =>
            Effect.sync(() => {
              events.push("upgrade")
            }),
          close: Effect.sync(() => {
            closed = true
            events.push("close")
          })
        }
      })
    return { connector, written, commands, events, closed: () => closed, connects: () => connects }
  })
const services = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(NodeCrypto.layer),
    Effect.provide(Reactivity.layer),
    Effect.provideService(SocketConnector.SocketConnector, { connect: () => Effect.die("Unexpected connector") })
  )

describe("native MySQL connections", () => {
  it.effect("reads fragmented packets and runs text and prepared values queries", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture({ fragment: true })
      const connection = yield* MysqlConnection.make({ connector: server.connector })
      assert.deepStrictEqual((yield* connection.query("SELECT ?", [42])).rows, [{ answer: 42 }])
      assert.deepStrictEqual((yield* connection.query("SELECT 42", [], false)).values, [[42]])
      assert.deepStrictEqual(server.commands, ["PREPARE SELECT ?", "SELECT ?", "CLOSE", "SELECT 42"])
      assert.strictEqual(connection.isClosed(), false)
    })))
  it.effect("streams and drains multiple result sets before a subsequent command", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture({ multi: true })
      const connection = yield* MysqlConnection.make({ connector: server.connector })
      assert.deepStrictEqual(yield* Stream.runCollect(connection.stream("CALL procedure()", [], false)), [{
        answer: 42
      }, { other: 7 }])
      assert.deepStrictEqual((yield* connection.query("CALL procedure()", [], false)).rows, [{ answer: 42 }, {
        other: 7
      }])
      assert.strictEqual(connection.isClosed(), false)
    })))
  it.effect("closes a session when a stream stops before the server terminator", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture()
      const connection = yield* MysqlConnection.make({ connector: server.connector })
      assert.deepStrictEqual(yield* Stream.runCollect(connection.stream("SELECT 42", [], false).pipe(Stream.take(1))), [
        { answer: 42 }
      ])
      assert.strictEqual(connection.isClosed(), true)
      const error = yield* Effect.flip(connection.query("SELECT 42", [], false))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.deepStrictEqual(server.commands, ["SELECT 42"])
    })))
  it.effect("interrupts an active query without replaying it", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture({ stall: true })
      const connection = yield* MysqlConnection.make({ connector: server.connector })
      const fiber = yield* Effect.forkScoped(connection.query("SELECT 42", [], false))
      yield* Effect.yieldNow
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(connection.isClosed(), true)
      assert.deepStrictEqual(server.commands, ["SELECT 42"])
    })))
  it.effect("retires text streams interrupted immediately after their request is accepted", () =>
    services(Effect.gen(function*() {
      for (const budget of [8, 16, 32, 64]) {
        const sent = yield* Queue.unbounded<void>()
        const server = yield* fixture({
          stall: true,
          onQuery: () => {
            Queue.offerUnsafe(sent, undefined)
          }
        })
        const connection = yield* MysqlConnection.make({ connector: server.connector })
        const consumer = yield* Effect.forkScoped(
          Stream.runDrain(connection.stream("SELECT pending", [], false)).pipe(
            Effect.provideService(Scheduler.MaxOpsBeforeYield, budget)
          )
        )
        yield* Queue.take(sent)
        yield* Fiber.interrupt(consumer)
        assert.strictEqual(connection.isClosed(), true)
        assert.deepStrictEqual(server.commands, ["SELECT pending"])
        const error = yield* Effect.flip(connection.query("SELECT must not replay", [], false))
        assert.strictEqual(error.reason._tag, "ConnectionError")
        assert.deepStrictEqual(server.commands, ["SELECT pending"])
      }
    })))
  it.effect("cancels a stream waiting for the current query without retiring its session", () =>
    services(Effect.gen(function*() {
      const sent = yield* Queue.unbounded<void>()
      const server = yield* fixture({
        stall: true,
        onQuery: () => {
          Queue.offerUnsafe(sent, undefined)
        }
      })
      const connection = yield* MysqlConnection.make({ connector: server.connector })
      const query = yield* Effect.forkScoped(connection.query("SELECT owner", [], false))
      yield* Queue.take(sent)
      const consumer = yield* Effect.forkScoped(Stream.runDrain(connection.stream("SELECT waiting", [], false)))
      yield* Effect.yieldNow
      yield* Fiber.interrupt(consumer)
      assert.strictEqual(connection.isClosed(), false)
      assert.deepStrictEqual(server.commands, ["SELECT owner"])
      yield* Fiber.interrupt(query)
      assert.strictEqual(connection.isClosed(), true)
    })))
  it.effect("rejects full caching SHA authentication without sending a cleartext password", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture({ plugin: "caching_sha2_password", fullAuth: true })
      const error = yield* Effect.flip(
        MysqlConnection.make({ connector: server.connector, password: Redacted.make("secret") })
      )
      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.strictEqual(server.written.length, 1)
      assert.strictEqual(server.closed(), true)
    })))
  it.effect("upgrades TLS before full caching SHA authentication", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture({ plugin: "caching_sha2_password", fullAuth: true })
      const connection = yield* MysqlConnection.make({
        connector: server.connector,
        ssl: true,
        password: Redacted.make("secret")
      })
      assert.deepStrictEqual(server.events.slice(0, 4), ["write", "upgrade", "write", "write"])
      assert.strictEqual(server.written.length, 3)
      assert.strictEqual(P.decoder.decode(server.written[2].subarray(4)), "secret\0")
      assert.strictEqual(connection.isClosed(), false)
    })))
  it.effect("bounds password providers by the authentication timeout and closes the session", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture()
      const fiber = yield* Effect.forkScoped(
        Effect.flip(
          MysqlConnection.make({ connector: server.connector, password: Effect.never, connectTimeout: "1 second" })
        )
      )
      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(fiber)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.message, "Authentication timed out")
      assert.strictEqual(server.closed(), true)
      assert.strictEqual(server.written.length, 0)
    })))
  it.effect("closes prepared handles on SQL failures and preserves the session for the next command", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture()
      const connection = yield* MysqlConnection.make({ connector: server.connector })
      const error = yield* Effect.flip(connection.query("BROKEN"))
      assert.strictEqual(error.reason._tag, "SqlSyntaxError")
      assert.strictEqual(connection.isClosed(), false)
      assert.deepStrictEqual(server.commands, ["PREPARE BROKEN", "BROKEN", "CLOSE"])
      assert.deepStrictEqual((yield* connection.query("SELECT 42")).rows, [{ answer: 42 }])
    })))
  it.effect("releases expired size-one checkout leases before acquiring a replacement", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture()
      const pool = yield* MysqlPool.make({ connector: server.connector, maxConnections: 1, connectionTTL: 0 })
      yield* Effect.scoped(Effect.flatMap(pool.get, (connection) => connection.query("SELECT 42", [], false)))
      yield* Effect.scoped(Effect.flatMap(pool.get, (connection) => connection.query("SELECT 42", [], false)))
      assert.strictEqual(server.connects(), 2)
    })))
  it.effect("pins nested transactions and replaces retired pool sessions", () =>
    services(Effect.gen(function*() {
      const server = yield* fixture()
      const client = yield* MysqlClient.make({
        connector: server.connector,
        maxConnections: 1,
        disablePreparedStatements: true
      })
      yield* client.withTransaction(Effect.gen(function*() {
        yield* client`SELECT ${42}`
        yield* client.withTransaction(client`SELECT ${7}`)
      }))
      assert.deepStrictEqual(server.commands, [
        "BEGIN",
        "SELECT 42",
        "SAVEPOINT effect_sql_1",
        "SELECT 7",
        "RELEASE SAVEPOINT effect_sql_1",
        "COMMIT"
      ])
      assert.strictEqual(server.connects(), 1)
      const pool = yield* MysqlPool.make({ connector: server.connector, maxConnections: 1 })
      yield* Effect.scoped(Effect.flatMap(pool.get, (connection) => connection.close))
      yield* Effect.scoped(Effect.flatMap(pool.get, (connection) => connection.query("SELECT 42", [], false)))
      assert.strictEqual(server.connects(), 3)
    })))
})
