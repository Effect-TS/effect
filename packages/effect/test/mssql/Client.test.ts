import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Queue, Redacted, Stream } from "effect"
import * as Protocol from "effect/mssql/internal/protocol"
import * as Client from "effect/mssql/MssqlClient"
import * as Connection from "effect/mssql/MssqlConnection"
import * as Procedure from "effect/mssql/Procedure"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SocketConnector from "effect/socket/SocketConnector"

const done = Uint8Array.of(0xfd, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
const login = Protocol.concat([Uint8Array.of(0xad, 10, 0, 1, 0x74, 0, 0, 4, 0, 16, 0, 0, 0), done])
const metadata = Uint8Array.of(0x81, 1, 0, 0, 0, 0, 0, 0, 0, 0x38, 2, 0x69, 0, 0x64, 0)
const row = (n: number) => Uint8Array.of(0xd1, n, 0, 0, 0)
const rows = Protocol.concat([metadata, row(42), done])
const u16 = (n: number) => Uint8Array.of(n & 255, n >>> 8 & 255)
const u32 = (n: number) => Uint8Array.of(n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255)
const errorToken = (number: number, message: string, severity = 16) => {
  const body = Protocol.concat([
    u32(number),
    Uint8Array.of(1, severity),
    u16(message.length),
    Protocol.unicode(message),
    Uint8Array.of(0, 0),
    u32(1)
  ])
  return Protocol.concat([
    Uint8Array.of(0xaa),
    u16(body.length),
    body,
    Uint8Array.of(0xfd, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
  ])
}

const server = Effect.fnUntraced(function*(options: {
  readonly negotiate?: number
  readonly response?: (type: number, payload: Uint8Array, query: number) => ReadonlyArray<Uint8Array>
  readonly fragment?: boolean
  readonly stallWrite?: boolean
} = {}) {
  const writes: Array<{ type: number; bytes: Uint8Array }> = []
  const endpoints: Array<SocketConnector.Endpoint> = []
  let closed = 0
  let connections = 0
  let query = 0
  const connector: SocketConnector.SocketConnector["Service"]["connect"] = (endpoint) =>
    Effect.gen(function*() {
      connections++
      endpoints.push(endpoint)
      const incoming = yield* Queue.unbounded<Uint8Array>()
      return {
        pull: Effect.map(Queue.take(incoming), (bytes) => [bytes] as const),
        run: (f) => Effect.forever(Effect.flatMap(Queue.take(incoming), (bytes) => f(bytes) ?? Effect.void)),
        upgrade: () => Effect.die("Native client must use TLS-first; raw STARTTLS is invalid for TDS7"),
        write: () => Effect.die("Expected packet writeAll"),
        writeAll: (chunks) =>
          Effect.sync(() => {
            const packets = chunks as ReadonlyArray<Uint8Array>
            const type = packets[0][0]
            const bytes = Protocol.concat(packets.map((p) => p.subarray(8)))
            writes.push({ type, bytes })
            const payloads = type === 0x12
              ? [Uint8Array.of(1, 0, 6, 0, 1, 255, options.negotiate ?? 2)]
              : type === 0x10
              ? [login]
              : options.response?.(type, bytes, ++query) ?? [rows]
            for (const payload of payloads) {
              for (const packet of Protocol.packets(4, payload, 512)) {
                if (options.fragment) { for (const byte of packet) Queue.offerUnsafe(incoming, Uint8Array.of(byte)) }
                else Queue.offerUnsafe(incoming, packet)
              }
            }
            return type
          }).pipe(
            Effect.flatMap((type) => options.stallWrite && type !== 0x12 && type !== 0x10 ? Effect.never : Effect.void)
          ),
        close: Effect.sync(() => {
          closed++
        })
      }
    })
  return { connector, writes, endpoints, closed: () => closed, connections: () => connections }
})

const unusedConnector = { connect: () => Effect.die("Unexpected default connector") }
const makeConnection = (options: Connection.Config) =>
  Connection.make(options).pipe(Effect.provideService(SocketConnector.SocketConnector, unusedConnector))
const makeClient = (options: Client.MssqlClientConfig) =>
  Client.makeClient(options).pipe(Effect.provideService(SocketConnector.SocketConnector, unusedConnector))
const makePool = (options: Client.MssqlClientConfig) =>
  Client.make(options).pipe(Effect.provideService(SocketConnector.SocketConnector, unusedConnector))

const plaintext = { encryption: "disable" as const, allowPlaintext: true }

it.effect("requires explicit plaintext opt-in before opening a socket", () =>
  Effect.gen(function*() {
    const peer = yield* server()
    const error = yield* Effect.flip(makeConnection({ encryption: "disable", connector: peer.connector }))
    assert.include(error.reason.message!, "allowPlaintext")
    assert.strictEqual(peer.connections(), 0)
  }))

it.effect("rejects legacy negotiated TLS before evaluating or sending credentials", () =>
  Effect.gen(function*() {
    const peer = yield* server({ negotiate: 3 })
    const error = yield* Effect.flip(
      makeConnection({
        ...plaintext,
        connector: peer.connector,
        password: Effect.die("Credentials must not be evaluated")
      })
    )
    assert.strictEqual(error.reason.operation, "prelogin")
    assert.deepStrictEqual(peer.writes.map((write) => write.type), [0x12])
    assert.strictEqual(peer.closed(), 1)
  }))

it.effect("defaults to strict TLS-first with ALPN and authenticates LOGIN7", () =>
  Effect.gen(function*() {
    const peer = yield* server({ negotiate: 1 })
    const sql = yield* makeConnection({ connector: peer.connector, password: Redacted.make("secret") })
    assert.deepStrictEqual(peer.endpoints[0].tls, { alpnProtocols: ["tds/8.0"] })
    assert.strictEqual(new DataView(peer.writes[1].bytes.buffer).getUint32(4, true), 0x08000000)
    const result = yield* sql.query("SELECT 42 AS id")
    assert.deepStrictEqual(result.rows, [{ id: 42 }])
    assert.deepStrictEqual(result.values, [[42]])
  }))

it.effect("executes bound queries, values, raw results, and result name transformations", () =>
  Effect.gen(function*() {
    const peer = yield* server({ fragment: true })
    const sql = yield* makeClient({
      ...plaintext,
      connector: peer.connector,
      transformResultNames: (name) => name.toUpperCase()
    })
    assert.deepStrictEqual(yield* sql`SELECT ${"'; DROP TABLE users;--"} AS id`, [{ ID: 42 }])
    assert.strictEqual(peer.writes[2].type, 3)
    assert.include(new TextDecoder("utf-16le").decode(peer.writes[2].bytes), "sp_executesql")
    assert.deepStrictEqual(yield* sql`SELECT 42 AS id`.values, [[42]])
    const raw = yield* sql`SELECT 42 AS id`.raw as Effect.Effect<Connection.Result, never>
    assert.deepStrictEqual(raw.columns, ["id"])
    assert.deepStrictEqual(raw.rows, [{ id: 42 }])
  }).pipe(Effect.provide(Reactivity.layer)))

it.effect("keeps transaction descriptors across queries and resets them after commit", () =>
  Effect.gen(function*() {
    const peer = yield* server({
      response: (_type, payload) => {
        const text = new TextDecoder("utf-16le").decode(payload.subarray(22))
        if (text === "BEGIN TRANSACTION") {
          return [Protocol.concat([Uint8Array.of(0xe3, 11, 0, 8, 8, 1, 2, 3, 4, 5, 6, 7, 8, 0), done])]
        }
        if (text === "COMMIT TRANSACTION") {
          return [Protocol.concat([Uint8Array.of(0xe3, 11, 0, 9, 0, 8, 1, 2, 3, 4, 5, 6, 7, 8), done])]
        }
        return [rows]
      }
    })
    const sql = yield* makeClient({ ...plaintext, connector: peer.connector })
    yield* sql.withTransaction(Effect.gen(function*() {
      yield* sql`SELECT 42`
      yield* sql.withTransaction(sql`SELECT ${42}`)
      yield* sql`SELECT 42`
    }))
    yield* sql`SELECT 42`
    const requests = peer.writes.slice(2)
    assert.deepStrictEqual(requests[0].bytes.subarray(10, 18), new Uint8Array(8))
    for (const request of requests.slice(1, -1)) {
      assert.deepStrictEqual(request.bytes.subarray(10, 18), Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8))
    }
    assert.deepStrictEqual(requests.at(-1)!.bytes.subarray(10, 18), new Uint8Array(8))
    assert.isTrue(
      requests.some((r) => new TextDecoder("utf-16le").decode(r.bytes.subarray(22)).startsWith("SAVE TRANSACTION"))
    )
  }).pipe(Effect.provide(Reactivity.layer)))

it.effect("calls procedures on the current transaction's connection", () =>
  Effect.gen(function*() {
    const peer = yield* server()
    const sql = yield* makePool({ ...plaintext, connector: peer.connector, maxConnections: 1 })
    const procedure = Procedure.make("getUsers").pipe(
      Procedure.param<number>()("limit", "Int"),
      Procedure.withRows<{ id: number }>(),
      Procedure.compile
    )({ limit: 1 })
    const result = yield* sql.withTransaction(sql.call(procedure))
    assert.deepStrictEqual(result.rows, [{ id: 42 }])
    assert.strictEqual(peer.connections(), 1)
    assert.isTrue(
      peer.writes.some((r) => r.type === 3 && new TextDecoder("utf-16le").decode(r.bytes).includes("getUsers"))
    )
  }).pipe(Effect.provide(Reactivity.layer)))

it.effect("streams rows before the last packet and retires an abandoned session", () =>
  Effect.gen(function*() {
    const large = Protocol.concat([metadata, ...Array.from({ length: 150 }, (_, n) => row(n)), done])
    const peer = yield* server({ response: () => [large] })
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    const first = yield* Stream.runCollect(connection.stream("SELECT many").pipe(Stream.take(1)))
    assert.deepStrictEqual(first, [{ id: 0 }])
    assert.isTrue(connection.isClosed())
    const error = yield* Effect.flip(connection.query("SELECT again"))
    assert.strictEqual(error.reason._tag, "ConnectionError")
  }))

it.effect("retires a stream interrupted immediately after its request is accepted", () =>
  Effect.gen(function*() {
    const sent = yield* Queue.unbounded<void>()
    const peer = yield* server({
      stallWrite: true,
      response: () => {
        Queue.offerUnsafe(sent, undefined)
        return []
      }
    })
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    const consumer = yield* Effect.forkScoped(Stream.runDrain(connection.stream("SELECT pending")))
    yield* Queue.take(sent)
    yield* Fiber.interrupt(consumer)
    assert.isTrue(connection.isClosed())
    assert.strictEqual(peer.closed(), 1)
    assert.strictEqual(peer.writes.length, 3)
    const error = yield* Effect.flip(connection.query("SELECT must not replay"))
    assert.strictEqual(error.reason._tag, "ConnectionError")
    assert.strictEqual(peer.writes.length, 3)
  }))

it.effect("cancels a stream waiting for an exclusive reservation without closing that session", () =>
  Effect.gen(function*() {
    const peer = yield* server()
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    const reserved = yield* connection.reserve
    const consumer = yield* Effect.forkScoped(Stream.runDrain(connection.stream("SELECT waiting")))
    yield* Effect.yieldNow
    yield* Fiber.interrupt(consumer)
    assert.isFalse(connection.isClosed())
    assert.strictEqual(peer.writes.length, 2)
    assert.deepStrictEqual((yield* reserved.query("SELECT owner")).rows, [{ id: 42 }])
  }))

it.effect("cancels an exclusive reservation waiting behind another reservation", () =>
  Effect.gen(function*() {
    const peer = yield* server()
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    const reserved = yield* connection.reserve
    const started = yield* Queue.unbounded<void>()
    const waiting = yield* Effect.forkScoped(
      Queue.offer(started, undefined).pipe(Effect.andThen(Effect.scoped(connection.reserve)))
    )
    yield* Queue.take(started)
    yield* Fiber.interrupt(waiting)
    assert.isFalse(connection.isClosed())
    assert.strictEqual(peer.writes.length, 2)
    assert.deepStrictEqual((yield* reserved.query("SELECT owner")).rows, [{ id: 42 }])
  }))

it.effect("serializes concurrent session queries", () =>
  Effect.gen(function*() {
    const peer = yield* server({ fragment: true })
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    const a = yield* connection.query("SELECT a").pipe(Effect.forkChild)
    const b = yield* connection.query("SELECT b").pipe(Effect.forkChild)
    assert.deepStrictEqual((yield* Fiber.join(a)).rows, [{ id: 42 }])
    assert.deepStrictEqual((yield* Fiber.join(b)).rows, [{ id: 42 }])
  }))

it.effect("classifies server constraint failures and safely reuses the drained session", () =>
  Effect.gen(function*() {
    const peer = yield* server({
      response: (_type, _payload, query) =>
        query === 1 ? [errorToken(2627, "Violation of UNIQUE KEY constraint 'users_email'")] : [rows]
    })
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    const error = yield* Effect.flip(connection.query("INSERT duplicate"))
    assert.strictEqual(error.reason._tag, "UniqueViolation")
    if (error.reason._tag === "UniqueViolation") assert.strictEqual(error.reason.constraint, "users_email")
    assert.isFalse(connection.isClosed())
    assert.deepStrictEqual((yield* connection.query("SELECT after error")).rows, [{ id: 42 }])
  }))

it.effect("retires malformed responses and fatal server errors", () =>
  Effect.gen(function*() {
    for (
      const response of [
        Protocol.concat([metadata, row(42)]),
        errorToken(233, "Connection terminated", 20),
        Uint8Array.of(0x99)
      ]
    ) {
      const peer = yield* server({ response: () => [response] })
      const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
      yield* Effect.flip(connection.query("SELECT malformed"))
      assert.isTrue(connection.isClosed())
      assert.strictEqual(peer.closed(), 1)
    }
  }))

it.effect("replaces abandoned pooled sessions without stalling a size-one pool", () =>
  Effect.gen(function*() {
    const large = Protocol.concat([metadata, ...Array.from({ length: 150 }, (_, n) => row(n)), done])
    const peer = yield* server({ response: (_type, _payload, query) => [query === 1 ? large : rows] })
    const sql = yield* makePool({ ...plaintext, connector: peer.connector, maxConnections: 1 })
    assert.deepStrictEqual(yield* Stream.runCollect(sql`SELECT many`.stream.pipe(Stream.take(1))), [{ id: 0 }])
    assert.deepStrictEqual(yield* sql`SELECT after stream`, [{ id: 42 }])
    assert.strictEqual(peer.connections(), 2)
  }).pipe(Effect.provide(Reactivity.layer)))

it.effect("returns typed procedure output parameters and preserves the return status", () =>
  Effect.gen(function*() {
    const name = "answer"
    const output = Protocol.concat([
      Uint8Array.of(0xac),
      u16(1),
      Uint8Array.of(name.length),
      Protocol.unicode(name),
      Uint8Array.of(1),
      u32(0),
      u16(0),
      Uint8Array.of(0x26, 4, 4),
      u32(42),
      Uint8Array.of(0x79),
      u32(7),
      done
    ])
    const peer = yield* server({ response: () => [output] })
    const sql = yield* makeClient({ ...plaintext, connector: peer.connector })
    const procedure = Procedure.make("answer").pipe(
      Procedure.outputParam<number>()("answer", "Int"),
      Procedure.compile
    )({})
    const result = yield* sql.call(procedure)
    assert.deepStrictEqual(result.output, { answer: 42 })
    const connection = yield* makeConnection({ ...plaintext, connector: peer.connector })
    assert.strictEqual((yield* connection.call("answer", [])).returnStatus, 7)
  }).pipe(Effect.provide(Reactivity.layer)))
