import { assert, describe, it } from "@effect/vitest"
import {
  ConfigProvider,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Queue,
  Redacted,
  Result,
  Scheduler,
  Scope,
  Stream
} from "effect"
import type { PgConnection } from "effect/postgres"
import type * as Socket from "effect/socket/Socket"
import * as TestClock from "effect/testing/TestClock"
import { mkdtemp, rm } from "node:fs/promises"
import * as Net from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Duplex } from "node:stream"
import type * as Tls from "node:tls"
import { vi } from "vitest"
import { makeConnection } from "./transport.ts"

describe("PgConnection config", () => {
  it.effect.each([
    { startupParameters: { REPLICATION: "database" } },
    { startupParameters: { client_encoding: "LATIN1" } },
    { startupParameters: { "": "value" } },
    { startupParameters: { search_path: "public\0private" } },
    { startupOptions: "-c lock_timeout=2345\0" },
    { url: Redacted.make("postgres://test@localhost/db?options=%00") }
  ])("rejects invalid startup config %j before connecting", (config) =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(makeConnection({
        ...config,
        username: "test",
        stream: () => {
          connected = true
          throw new Error("unexpected connection")
        }
      }))
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
    }))

  it.effect("interrupts a stalled password provider when connectTimeout expires", () =>
    Effect.gen(function*() {
      let connected = false
      let interrupted = false
      const fiber = yield* makeConnection({
        username: "test",
        password: Effect.never.pipe(Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true
          })
        )),
        connectTimeout: "1 second",
        stream: () => {
          connected = true
          throw new Error("unexpected connection")
        }
      }).pipe(Effect.flip, Effect.forkScoped)

      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(fiber)

      assert.isTrue(interrupted)
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Connection timed out")
      assert.isTrue(error.isRetryable)
    }))

  it.effect.each(["prefer", "allow"])("accepts sslmode=%s in a URL", (sslmode) =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(makeConnection({
        url: Redacted.make(`postgres://user@localhost/db?sslmode=${sslmode}`),
        stream: () => {
          connected = true
          throw new Error("test connection")
        }
      }))
      assert.isTrue(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Failed to connect")
    }))

  it.effect("rejects an unrecognized sslmode before connecting", () =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(makeConnection({
        url: Redacted.make("postgresql://user@localhost/db?sslmode=invalid"),
        stream: () => {
          connected = true
          throw new Error("test connection")
        }
      }))
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Unrecognized sslmode in URL: \"invalid\"")
    }))

  it.effect("rejects a non-postgres URL protocol", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(makeConnection({
        url: Redacted.make("mysql://user@localhost/db")
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
    }))
})

const tlsOptions = new WeakMap<Duplex, Tls.ConnectionOptions | undefined>()

// Only simulate TLS for registered streams; other connections use native TLS.
vi.mock("node:tls", async (importOriginal) => {
  const original = await importOriginal<typeof Tls>()
  return {
    ...original,
    connect(options: Tls.ConnectionOptions) {
      const socket = options.socket
      if (socket === undefined || !tlsOptions.has(socket)) {
        return original.connect(options)
      }
      tlsOptions.set(socket, options)
      queueMicrotask(() => socket.emit("secureConnect"))
      return socket
    }
  }
})

const backendMessage = (tag: string, payload: Uint8Array): Buffer => {
  const length = Buffer.allocUnsafe(4)
  length.writeInt32BE(payload.length + 4)
  return Buffer.concat([Buffer.from(tag), length, payload])
}

const int32 = (value: number): Buffer => {
  const bytes = Buffer.allocUnsafe(4)
  bytes.writeInt32BE(value)
  return bytes
}

const int16 = (value: number): Buffer => {
  const bytes = Buffer.allocUnsafe(2)
  bytes.writeInt16BE(value)
  return bytes
}

const authentication = (method: number, payload: Uint8Array = Buffer.alloc(0)): Buffer =>
  backendMessage("R", Buffer.concat([int32(method), payload]))

const authenticationOk = authentication(0)
const backendKeyData = backendMessage("K", Buffer.concat([int32(1234), int32(5678)]))
const readyForQuery = backendMessage("Z", Buffer.from("I"))
const sslRequest = Buffer.concat([int32(8), int32(80877103)])
const cancelRequest = Buffer.concat([int32(16), int32(80877102), int32(1234), int32(5678)])

const makeSslStream = (reply: "S" | "N", cancel: boolean) => {
  const writes: Array<Buffer> = []
  const socket: Duplex = new Duplex({
    read() {},
    write(chunk: Buffer, _encoding, callback) {
      writes.push(Buffer.from(chunk))
      queueMicrotask(() => {
        if (writes.length === 1) {
          socket.push(Buffer.from(reply))
        } else if (cancel) {
          socket.destroy()
        } else if (writes.length === 2) {
          socket.push(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
        }
      })
      callback()
    }
  })
  tlsOptions.set(socket, undefined)
  return { socket, writes }
}

const emptyQueryResult = Buffer.concat([
  backendMessage("1", Buffer.alloc(0)),
  backendMessage("2", Buffer.alloc(0)),
  backendMessage("n", Buffer.alloc(0)),
  backendMessage("C", Buffer.from("SELECT 0\0")),
  readyForQuery
])

const frontendTags = (message: Buffer): ReadonlyArray<string> => {
  const tags: Array<string> = []
  let offset = 0
  while (offset < message.length) {
    tags.push(String.fromCharCode(message[offset]))
    offset += 1 + message.readInt32BE(offset + 1)
  }
  return tags
}

const frontendPreparedNames = (message: Buffer): ReadonlyArray<string> => {
  const names: Array<string> = []
  let offset = 0
  while (offset < message.length) {
    const tag = String.fromCharCode(message[offset])
    const length = message.readInt32BE(offset + 1)
    if (tag === "P") {
      const nameStart = offset + 5
      const nameEnd = message.indexOf(0, nameStart)
      names.push(message.subarray(nameStart, nameEnd).toString())
    }
    offset += 1 + length
  }
  return names
}

const consumeFrontend = (
  socket: Net.Socket,
  onMessage: (tag: string | undefined, message: Buffer) => void
): void => {
  let startup = true
  let buffered = Buffer.alloc(0)
  socket.on("data", (chunk: Buffer) => {
    buffered = Buffer.concat([buffered, chunk])
    while (true) {
      const lengthOffset = startup ? 0 : 1
      if (buffered.length < lengthOffset + 4) return
      const length = buffered.readInt32BE(lengthOffset)
      const messageLength = lengthOffset + length
      if (buffered.length < messageLength) return
      const message = buffered.subarray(0, messageLength)
      buffered = buffered.subarray(messageLength)
      const tag = startup ? undefined : String.fromCharCode(message[0])
      startup = false
      onMessage(tag, message)
    }
  })
}

const startupParameters = (message: Buffer): ReadonlyMap<string, string> => {
  const values = message.subarray(8, -1).toString().split("\0")
  const parameters = new Map<string, string>()
  for (let index = 0; index < values.length - 1 && values[index] !== ""; index += 2) {
    parameters.set(values[index], values[index + 1])
  }
  return parameters
}

const errorResponse = (fields: ReadonlyArray<readonly [string, string]>): Buffer =>
  backendMessage(
    "E",
    Buffer.concat([
      ...fields.map(([code, value]) => Buffer.from(`${code}${value}\0`)),
      Buffer.from([0])
    ])
  )

const withTcpServer = (
  onConnection: (socket: Net.Socket) => void
) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () =>
        new Promise<{ readonly port: number; readonly server: Net.Server }>((resolve, reject) => {
          const server = Net.createServer(onConnection)
          server.once("error", reject)
          server.listen(0, "127.0.0.1", () => {
            server.off("error", reject)
            const address = server.address()
            if (address === null || typeof address === "string") {
              reject(new Error("Test server did not bind to a TCP port"))
              return
            }
            resolve({ port: address.port, server })
          })
        }),
      catch: (cause) => cause
    }),
    ({ server }) =>
      Effect.promise(() =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        })
      )
  )

const withUnixServer = (
  onConnection: (socket: Net.Socket) => void
) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const directory = await mkdtemp(join(tmpdir(), "effect-pg-"))
        const socketPath = join(directory, ".s.PGSQL.5432")
        const server = Net.createServer(onConnection)
        await new Promise<void>((resolve, reject) => {
          server.once("error", reject)
          server.listen(socketPath, () => {
            server.off("error", reject)
            resolve()
          })
        })
        return { directory, server }
      },
      catch: (cause) => cause
    }),
    ({ directory, server }) =>
      Effect.promise(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()))
        await rm(directory, { recursive: true, force: true })
      })
  )

describe("PgConnection in-process server", () => {
  it.live("forwards startup defaults and lets explicit fields override URL values", () =>
    Effect.scoped(Effect.gen(function*() {
      let parameters: ReadonlyMap<string, string> | undefined
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag, message) => {
          if (tag === undefined) {
            parameters = startupParameters(message)
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })
      const config = {
        host: "127.0.0.1",
        port,
        url: Redacted.make(
          "postgres://test@localhost/db?application_name=url-app&options=-c%20statement_timeout%3D1234"
        ),
        startupParameters: { SEARCH_PATH: "public", CLIENT_ENCODING: "uTf-8", application_name: "named-app" }
      }
      yield* makeConnection(config)
      assert.deepStrictEqual(Object.fromEntries(parameters!), {
        user: "test",
        database: "db",
        application_name: "named-app",
        search_path: "public",
        client_encoding: "UTF8",
        options: "-c statement_timeout=1234"
      })

      yield* makeConnection({ ...config, applicationName: "explicit-app", startupOptions: "-c lock_timeout=2345" })
      assert.strictEqual(parameters!.get("application_name"), "explicit-app")
      assert.strictEqual(parameters!.get("options"), "-c lock_timeout=2345")
    })))

  it.effect("accepts backend messages over the default limit when configured", () =>
    Effect.gen(function*() {
      const fieldSize = 16 * 1024 * 1024
      const field = Buffer.alloc(fieldSize, 0x78)
      const rowDescription = backendMessage(
        "T",
        Buffer.concat([
          int16(1),
          Buffer.from("big\0"),
          int32(0),
          int16(0),
          int32(25),
          int16(-1),
          int32(-1),
          int16(1)
        ])
      )
      const dataRow = backendMessage("D", Buffer.concat([int16(1), int32(field.length), field]))
      const result = Buffer.concat([
        backendMessage("1", Buffer.alloc(0)),
        backendMessage("2", Buffer.alloc(0)),
        rowDescription,
        dataRow,
        backendMessage("C", Buffer.from("SELECT 1\0")),
        readyForQuery
      ])
      let writes = 0
      const socket: Duplex = new Duplex({
        read() {},
        write(_chunk: Buffer, _encoding, callback) {
          writes++
          queueMicrotask(() => {
            socket.push(
              writes === 1
                ? Buffer.concat([authenticationOk, backendKeyData, readyForQuery])
                : writes === 2
                ? result
                : emptyQueryResult
            )
          })
          callback()
        }
      })
      const connection = yield* makeConnection({
        username: "test",
        stream: () => socket,
        maxMessageSize: 17 * 1024 * 1024
      })

      const oversized = yield* connection.query("SELECT repeat('x', 16777216) AS big")
      assert.strictEqual(typeof oversized.rows[0].big, "string")
      assert.strictEqual((oversized.rows[0].big as string).length, fieldSize)
      assert.deepStrictEqual((yield* connection.query("SELECT 1")).rows, [])
    }))

  it.effect("flushes concurrently submitted multiplexed queries in one write", () =>
    Effect.gen(function*() {
      const writes: Array<Buffer> = []
      const socket: Duplex = new Duplex({
        read() {},
        write(chunk: Buffer, _encoding, callback) {
          const message = Buffer.from(chunk)
          writes.push(message)
          if (writes.length === 1) {
            queueMicrotask(() => socket.push(Buffer.concat([authenticationOk, backendKeyData, readyForQuery])))
          } else {
            const syncs = frontendTags(message).filter((tag) => tag === "S").length
            queueMicrotask(() => socket.push(Buffer.concat(Array.from({ length: syncs }, () => emptyQueryResult))))
          }
          callback()
        }
      })
      const connection = yield* makeConnection({
        username: "test",
        stream: () => socket,
        multiplex: true
      })

      yield* Effect.all([
        connection.query("SELECT 1"),
        connection.query("SELECT 2")
      ], { concurrency: "unbounded" })

      // Both cycles left in one write, each keeping its own Sync.
      assert.strictEqual(writes.length, 2)
      assert.deepStrictEqual(frontendTags(writes[1]), ["P", "B", "D", "E", "S", "P", "B", "D", "E", "S"])
    }))

  it.effect("uses distinct prepared statement names across connections", () =>
    Effect.gen(function*() {
      const writes: Array<Array<Buffer>> = []
      const makeStream = () => {
        const connectionWrites: Array<Buffer> = []
        const socket: Duplex = new Duplex({
          read() {},
          write(chunk: Buffer, _encoding, callback) {
            connectionWrites.push(Buffer.from(chunk))
            queueMicrotask(() => {
              socket.push(
                connectionWrites.length === 1
                  ? Buffer.concat([authenticationOk, backendKeyData, readyForQuery])
                  : emptyQueryResult
              )
            })
            callback()
          }
        })
        writes.push(connectionWrites)
        return socket
      }

      const first = yield* makeConnection({ username: "test", stream: makeStream })
      const second = yield* makeConnection({ username: "test", stream: makeStream })
      yield* first.query("SELECT $1", [1])
      yield* second.query("SELECT $1, $2", [1, 2])

      const firstName = frontendPreparedNames(writes[0][1])
      const secondName = frontendPreparedNames(writes[1][1])
      assert.strictEqual(firstName.length, 1)
      assert.strictEqual(secondName.length, 1)
      assert.notStrictEqual(firstName[0], secondName[0])
    }))

  it.effect("reuses a prepared name after a pending pipeline query is interrupted", () =>
    Effect.gen(function*() {
      const writes: Array<Buffer> = []
      const socket: Duplex = new Duplex({
        read() {},
        write(chunk: Buffer, _encoding, callback) {
          const message = Buffer.from(chunk)
          writes.push(message)
          if (writes.length === 1) {
            queueMicrotask(() => socket.push(Buffer.concat([authenticationOk, backendKeyData, readyForQuery])))
          } else {
            queueMicrotask(() => socket.push(emptyQueryResult))
          }
          callback()
        }
      })
      const connection = yield* makeConnection({
        username: "test",
        stream: () => socket,
        multiplex: true
      })

      const interrupted = Effect.runFork(connection.query("SELECT 1"))
      interrupted.interruptUnsafe()
      yield* Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))
      yield* connection.query("SELECT 1")

      assert.strictEqual(writes.length, 2)
      const names = frontendPreparedNames(writes[1])
      assert.strictEqual(names.length, 1)
      assert.match(names[0], /^effect_[0-9a-f]{16}_1$/)
    }))

  it.effect("ends a custom stream after writing Terminate", () =>
    Effect.gen(function*() {
      const writes: Array<Buffer> = []
      const socket: Duplex = new Duplex({
        read() {},
        write(chunk: Buffer, _encoding, callback) {
          writes.push(Buffer.from(chunk))
          if (writes.length === 1) {
            queueMicrotask(() => socket.push(Buffer.concat([authenticationOk, backendKeyData, readyForQuery])))
          }
          callback()
        }
      })

      yield* Effect.scoped(makeConnection({ username: "test", stream: () => socket }))

      assert.strictEqual(writes.at(-1)?.toString("hex"), "5800000004")
      assert.isTrue(socket.writableEnded)
      assert.isTrue(socket.destroyed)
    }))

  describe("TLS servername", () => {
    const cases: ReadonlyArray<{
      readonly name: string
      readonly config: PgConnection.Config
      readonly servername: string | undefined
    }> = [
      { name: "DNS host with ssl=true", config: { host: "db.example.com", ssl: true }, servername: "db.example.com" },
      {
        name: "DNS host with SSL options",
        config: { host: "db.example.com", ssl: { rejectUnauthorized: false } },
        servername: "db.example.com"
      },
      {
        name: "DNS host from a URL",
        config: { url: Redacted.make("postgres://test@db.example.com/db?sslmode=require") },
        servername: "db.example.com"
      },
      {
        name: "ssl=true overrides sslmode=disable",
        config: { url: Redacted.make("postgres://test@db.example.com/db?sslmode=disable"), ssl: true },
        servername: "db.example.com"
      },
      ...["prefer", "allow"].flatMap((sslmode) => [
        {
          name: `sslmode=${sslmode} enables TLS`,
          config: { url: Redacted.make(`postgresql://test@db.example.com/db?sslmode=${sslmode}`) },
          servername: "db.example.com"
        },
        {
          name: `SSL options override sslmode=${sslmode}`,
          config: {
            url: Redacted.make(`postgres://test@db.example.com/db?sslmode=${sslmode}`),
            ssl: { servername: "routing.example.com", rejectUnauthorized: false }
          },
          servername: "routing.example.com"
        }
      ]),
      { name: "IPv4 host", config: { host: "127.0.0.1", ssl: true }, servername: undefined },
      { name: "IPv6 host", config: { host: "::1", ssl: true }, servername: undefined },
      ...["db.example.com", "127.0.0.1", "::1"].map((host) => ({
        name: `explicit servername for ${host}`,
        config: { host, ssl: { servername: "routing.example.com", rejectUnauthorized: false } },
        servername: "routing.example.com"
      })),
      {
        name: "explicit empty servername",
        config: { host: "db.example.com", ssl: { servername: "" } },
        servername: ""
      }
    ]

    for (const path of ["startup", "cancel"] as const) {
      describe(path, () => {
        it.effect.each(cases)("$name", ({ config, servername }) =>
          Effect.gen(function*() {
            const streams: Array<ReturnType<typeof makeSslStream>> = []
            const connection = yield* makeConnection({
              username: "test",
              ...config,
              stream: () => {
                const stream = makeSslStream("S", streams.length > 0)
                streams.push(stream)
                return stream.socket
              }
            })
            if (path === "cancel") {
              yield* connection.interrupt
            }

            assert.strictEqual(streams.length, path === "cancel" ? 2 : 1)
            const stream = streams[path === "cancel" ? 1 : 0]
            assert.deepStrictEqual(stream.writes[0], sslRequest)
            if (path === "cancel") {
              assert.deepStrictEqual(stream.writes[1], cancelRequest)
            } else {
              assert.strictEqual(stream.writes[1].readInt32BE(4), 196608)
              assert.strictEqual(startupParameters(stream.writes[1]).get("user"), "test")
            }
            const options = tlsOptions.get(stream.socket)
            assert.isDefined(options)
            assert.strictEqual(options!.servername, servername)
            if (typeof config.ssl === "object") {
              assert.strictEqual(options!.rejectUnauthorized, config.ssl.rejectUnauthorized)
            } else {
              assert.notStrictEqual(options!.rejectUnauthorized, false)
            }
          }))
      })
    }
  })

  it.effect.each(["prefer", "allow"])(
    "ssl=false overrides sslmode=%s with plaintext startup",
    (sslmode) =>
      Effect.gen(function*() {
        const writes: Array<Buffer> = []
        const socket: Duplex = new Duplex({
          read() {},
          write(chunk: Buffer, _encoding, callback) {
            writes.push(Buffer.from(chunk))
            if (writes.length === 1) {
              queueMicrotask(() => socket.push(Buffer.concat([authenticationOk, backendKeyData, readyForQuery])))
            }
            callback()
          }
        })
        tlsOptions.set(socket, undefined)

        yield* makeConnection({
          url: Redacted.make(`postgresql://test@db.example.com/db?sslmode=${sslmode}`),
          ssl: false,
          stream: () => socket
        })

        assert.strictEqual(writes.length, 1)
        assert.strictEqual(writes[0].readInt32BE(4), 196608)
        assert.strictEqual(startupParameters(writes[0]).get("user"), "test")
        assert.isUndefined(tlsOptions.get(socket))
      })
  )

  it.effect.each(["require", "verify-ca", "verify-full"])(
    "sslmode=%s fails when the server refuses TLS",
    (sslmode) =>
      Effect.gen(function*() {
        const writes: Array<Buffer> = []
        const socket: Duplex = new Duplex({
          read() {},
          write(chunk: Buffer, _encoding, callback) {
            writes.push(Buffer.from(chunk))
            queueMicrotask(() => socket.push(Buffer.from("N")))
            callback()
          }
        })
        const error = yield* Effect.flip(makeConnection({
          url: Redacted.make(`postgres://test@db.example.com/db?sslmode=${sslmode}`),
          stream: () => socket
        }))

        assert.deepStrictEqual(writes, [Buffer.concat([int32(8), int32(80877103)])])
        assert.strictEqual(error.reason._tag, "ConnectionError")
        assert.strictEqual(error.reason.message, "PgConnection: Server refused TLS")
        assert.isTrue(socket.destroyed)
      })
  )

  describe("TLS fallback", () => {
    it.effect.each(["prefer", "allow"])("sslmode=%s starts in plaintext after N", (sslmode) =>
      Effect.gen(function*() {
        const stream = makeSslStream("N", false)
        let connections = 0
        yield* makeConnection({
          url: Redacted.make(`postgres://test@db.example.com/db?sslmode=${sslmode}`),
          stream: () => {
            connections++
            return stream.socket
          }
        })

        assert.strictEqual(connections, 1)
        assert.strictEqual(stream.writes.length, 2)
        assert.deepStrictEqual(stream.writes[0], sslRequest)
        assert.strictEqual(stream.writes[1].readInt32BE(4), 196608)
        assert.strictEqual(startupParameters(stream.writes[1]).get("user"), "test")
        assert.isUndefined(tlsOptions.get(stream.socket))
      }))

    it.effect.each(["prefer", "allow"])(
      "sslmode=%s allows plaintext cancellation for a plaintext session",
      (sslmode) =>
        Effect.gen(function*() {
          const streams: Array<ReturnType<typeof makeSslStream>> = []
          const connection = yield* makeConnection({
            url: Redacted.make(`postgres://test@db.example.com/db?sslmode=${sslmode}`),
            stream: () => {
              const stream = makeSslStream("N", streams.length > 0)
              streams.push(stream)
              return stream.socket
            }
          })
          yield* connection.interrupt

          assert.strictEqual(streams.length, 2)
          assert.isUndefined(tlsOptions.get(streams[0].socket))
          assert.deepStrictEqual(streams[0].writes[0], sslRequest)
          assert.strictEqual(streams[0].writes[1].readInt32BE(4), 196608)
          assert.deepStrictEqual(streams[1].writes, [sslRequest, cancelRequest])
          assert.isUndefined(tlsOptions.get(streams[1].socket))
          assert.isTrue(streams[1].socket.destroyed)
        })
    )

    it.effect.each(["prefer", "allow", "require"])(
      "sslmode=%s refuses plaintext cancellation for a TLS session",
      (sslmode) =>
        Effect.gen(function*() {
          const streams: Array<ReturnType<typeof makeSslStream>> = []
          const connection = yield* makeConnection({
            url: Redacted.make(`postgres://test@db.example.com/db?sslmode=${sslmode}`),
            stream: () => {
              const cancel = streams.length > 0
              const stream = makeSslStream(cancel ? "N" : "S", cancel)
              streams.push(stream)
              return stream.socket
            }
          })
          yield* connection.interrupt

          assert.strictEqual(streams.length, 2)
          assert.isDefined(tlsOptions.get(streams[0].socket))
          assert.deepStrictEqual(streams[1].writes, [sslRequest])
          assert.isUndefined(tlsOptions.get(streams[1].socket))
          assert.isTrue(streams[1].socket.destroyed)
        })
    )

    for (const sslmode of ["prefer", "allow"]) {
      it.effect.each([true, { rejectUnauthorized: false }] as const)(
        `explicit ssl=%j prevents sslmode=${sslmode} fallback`,
        (ssl) =>
          Effect.gen(function*() {
            const stream = makeSslStream("N", false)
            const error = yield* Effect.flip(makeConnection({
              url: Redacted.make(`postgres://test@db.example.com/db?sslmode=${sslmode}`),
              ssl,
              stream: () => stream.socket
            }))

            assert.deepStrictEqual(stream.writes, [sslRequest])
            assert.strictEqual(error.reason._tag, "ConnectionError")
            assert.strictEqual(error.reason.message, "PgConnection: Server refused TLS")
            assert.isUndefined(tlsOptions.get(stream.socket))
            assert.isTrue(stream.socket.destroyed)
          })
      )
    }
  })

  it.live("preserves an ErrorResponse returned for SSLRequest", () =>
    Effect.scoped(Effect.gen(function*() {
      const { port } = yield* withTcpServer((socket) => {
        socket.once("data", () => {
          socket.end(errorResponse([
            ["S", "FATAL"],
            ["C", "08004"],
            ["M", "TLS is disabled by the proxy"]
          ]))
        })
      })

      const error = yield* Effect.flip(makeConnection({
        host: "127.0.0.1",
        port,
        username: "test",
        ssl: true
      }))

      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Failed to negotiate TLS")
      assert.instanceOf(error.reason.cause, Error)
      assert.strictEqual(error.reason.cause.message, "TLS is disabled by the proxy")
    })))

  it.live("rejects SCRAM authentication without server verification", () =>
    Effect.scoped(Effect.gen(function*() {
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            socket.write(authentication(10, Buffer.from("SCRAM-SHA-256\0\0")))
          } else if (tag === "p") {
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const error = yield* Effect.flip(makeConnection({
        host: "127.0.0.1",
        port,
        username: "test",
        password: Redacted.make("secret")
      }))

      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.strictEqual(error.reason.message, "PgConnection: SCRAM exchange did not complete")
    })))

  it.live("rejects incomplete SCRAM when AuthenticationOk is omitted", () =>
    Effect.scoped(Effect.gen(function*() {
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            socket.write(authentication(10, Buffer.from("SCRAM-SHA-256\0\0")))
          } else if (tag === "p") {
            socket.write(Buffer.concat([backendKeyData, readyForQuery]))
          }
        })
      })

      const error = yield* Effect.flip(makeConnection({
        host: "127.0.0.1",
        port,
        username: "test",
        password: Redacted.make("secret")
      }))

      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.strictEqual(error.reason.message, "PgConnection: SCRAM exchange did not complete")
    })))

  it.live("lets URL query host and port override the authority", () =>
    Effect.scoped(Effect.gen(function*() {
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const connection = yield* makeConnection({
        url: Redacted.make(`postgres://test@invalid.invalid:1/db?host=127.0.0.1&port=${port}`)
      })

      assert.strictEqual(connection.processId, 1234)
    })))

  it.effect("treats URL connect_timeout=0 as no timeout", () =>
    Effect.scoped(Effect.gen(function*() {
      let sendReady: (() => void) | undefined
      let signalStartup!: () => void
      const startup = new Promise<void>((resolve) => {
        signalStartup = resolve
      })
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            sendReady = () => socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
            signalStartup()
          }
        })
      })

      const fiber = yield* makeConnection({
        url: Redacted.make(`postgres://test@127.0.0.1:${port}/db?connect_timeout=0`)
      }).pipe(Effect.forkScoped)
      yield* Effect.promise(() => startup)
      yield* TestClock.adjust("6 seconds")
      sendReady!()

      const connection = yield* Fiber.join(fiber)
      assert.strictEqual(connection.processId, 1234)
    })))

  it.live("classifies startup SQLSTATE errors with the shared table", () =>
    Effect.scoped(Effect.gen(function*() {
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            socket.end(errorResponse([
              ["S", "ERROR"],
              ["C", "23505"],
              ["M", "duplicate key value violates unique constraint"],
              ["n", "  users_email_key  "]
            ]))
          }
        })
      })

      const error = yield* Effect.flip(makeConnection({
        host: "127.0.0.1",
        port,
        username: "test"
      }))

      assert.strictEqual(error.reason._tag, "UniqueViolation")
      if (error.reason._tag === "UniqueViolation") {
        assert.strictEqual(error.reason.constraint, "users_email_key")
      }
    })))

  it.live("sends Terminate when the connection scope closes", () =>
    Effect.scoped(Effect.gen(function*() {
      let signalTerminate!: (message: Buffer) => void
      const terminated = new Promise<Buffer>((resolve) => {
        signalTerminate = resolve
      })
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag, message) => {
          if (tag === undefined) {
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          } else if (tag === "X") {
            signalTerminate(message)
          }
        })
      })

      yield* Effect.scoped(makeConnection({ host: "127.0.0.1", port, username: "test" }))
      const message = yield* Effect.promise(() => terminated)

      assert.strictEqual(message.toString("hex"), "5800000004")
    })))

  it.live("authenticates with a cleartext password request", () =>
    Effect.scoped(Effect.gen(function*() {
      let password: string | undefined
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag, message) => {
          if (tag === undefined) {
            socket.write(authentication(3))
          } else if (tag === "p") {
            password = message.subarray(5, -1).toString()
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const connection = yield* makeConnection({
        host: "127.0.0.1",
        port,
        username: "test",
        password: Redacted.make("secret")
      })

      assert.strictEqual(connection.processId, 1234)
      assert.strictEqual(password, "secret")
    })))

  it.live("resolves a password Effect for each connection", () =>
    Effect.gen(function*() {
      const passwords: Array<string> = []
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag, message) => {
          if (tag === undefined) {
            socket.write(authentication(3))
          } else if (tag === "p") {
            passwords.push(message.subarray(5, -1).toString())
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })
      let calls = 0
      const acquire = makeConnection({
        host: "127.0.0.1",
        port,
        username: "test",
        password: Effect.sync(() => Redacted.make(`secret-${++calls}`))
      })

      yield* Effect.scoped(acquire)
      yield* acquire

      assert.strictEqual(calls, 2)
      assert.deepStrictEqual(passwords, ["secret-1", "secret-2"])
    }))

  it.live("authenticates with an MD5 password request", () =>
    Effect.scoped(Effect.gen(function*() {
      let password: string | undefined
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag, message) => {
          if (tag === undefined) {
            socket.write(authentication(5, Buffer.from([1, 2, 3, 4])))
          } else if (tag === "p") {
            password = message.subarray(5, -1).toString()
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const connection = yield* makeConnection({
        host: "127.0.0.1",
        port,
        username: "test",
        password: Redacted.make("secret")
      })

      assert.strictEqual(connection.processId, 1234)
      assert.strictEqual(password, "md5594f15006e55e17dff918116ee00778f")
    })))

  it.live("uses a caller-supplied stream factory", () =>
    Effect.scoped(Effect.gen(function*() {
      let streamCalls = 0
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const connection = yield* makeConnection({
        host: "invalid.invalid",
        port: 1,
        username: "test",
        stream: () => {
          streamCalls++
          return Net.connect({ host: "127.0.0.1", port })
        }
      })

      assert.strictEqual(connection.processId, 1234)
      assert.strictEqual(streamCalls, 1)
    })))

  it.live("derives a unix socket path from a slash-prefixed host", () =>
    Effect.scoped(Effect.gen(function*() {
      const { directory } = yield* withUnixServer((socket) => {
        consumeFrontend(socket, (tag) => {
          if (tag === undefined) {
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const connection = yield* makeConnection({ host: directory, username: "test" })

      assert.strictEqual(connection.processId, 1234)
    })))

  it.live("lets explicit fields override URL connection and startup values", () =>
    Effect.scoped(Effect.gen(function*() {
      let parameters: ReadonlyMap<string, string> | undefined
      const { port } = yield* withTcpServer((socket) => {
        consumeFrontend(socket, (tag, message) => {
          if (tag === undefined) {
            parameters = startupParameters(message)
            socket.write(Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
          }
        })
      })

      const connection = yield* makeConnection({
        url: Redacted.make("postgres://url-user@invalid.invalid:1/url-db?application_name=url-app"),
        host: "127.0.0.1",
        port,
        username: "explicit-user",
        database: "explicit-db",
        applicationName: "explicit-app"
      })

      assert.strictEqual(connection.processId, 1234)
      assert.strictEqual(parameters!.get("user"), "explicit-user")
      assert.strictEqual(parameters!.get("database"), "explicit-db")
      assert.strictEqual(parameters!.get("application_name"), "explicit-app")
      assert.strictEqual(parameters!.get("client_encoding"), "UTF8")
    })))
})

describe("PgConnection transport", () => {
  it.effect("admits the next query when a connector replies synchronously", () =>
    Effect.gen(function*() {
      const incoming = yield* Queue.unbounded<Uint8Array>()
      const reading = yield* Deferred.make<void>()
      let receive: Parameters<Socket.Reader["run"]>[0] | undefined
      let writes = 0
      let activeWrites = 0
      let maxActiveWrites = 0
      const connection = yield* makeConnection({
        username: "test",
        prepare: false,
        connector: () =>
          Effect.succeed({
            pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
            run: (onChunk) =>
              Effect.andThen(
                Effect.sync(() => {
                  receive = onChunk
                }),
                Effect.andThen(Deferred.succeed(reading, undefined), Effect.never)
              ),
            upgrade: () => Effect.void,
            write: (chunk) =>
              Effect.sync(() => {
                if (chunk instanceof Uint8Array && chunk[0] !== 0x58) {
                  Queue.offerUnsafe(incoming, Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
                }
              }),
            writeAll: () =>
              Effect.suspend(() => {
                writes++
                activeWrites++
                maxActiveWrites = Math.max(maxActiveWrites, activeWrites)
                if (writes === 1) {
                  return Effect.callback<void>((resume) => {
                    queueMicrotask(() => {
                      receive!(emptyQueryResult)
                      activeWrites--
                      resume(Effect.void)
                    })
                  })
                }
                return Effect.sync(() => {
                  receive!(emptyQueryResult)
                  activeWrites--
                })
              }),
            close: Effect.void
          })
      })
      yield* Deferred.await(reading)
      for (let i = 0; i < 1500; i++) assert.deepStrictEqual((yield* connection.query(`SELECT ${i}`)).rows, [])
      assert.strictEqual(writes, 1500)
      assert.strictEqual(maxActiveWrites, 1)
    }).pipe(Effect.provideService(Scheduler.MaxOpsBeforeYield, 16)))

  it.effect("batches queued queries in order after write backpressure clears", () =>
    Effect.gen(function*() {
      const incoming = yield* Queue.unbounded<Uint8Array>()
      const writing = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const batches: Array<ReadonlyArray<Uint8Array | string>> = []
      const connection = yield* makeConnection({
        username: "test",
        multiplex: true,
        connector: () =>
          Effect.succeed({
            pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
            run: (onChunk) =>
              Effect.forever(Effect.flatMap(Queue.take(incoming), (chunk) => onChunk(chunk) ?? Effect.void)),
            upgrade: () => Effect.void,
            write: (chunk) =>
              Effect.sync(() => {
                if (chunk instanceof Uint8Array && chunk[0] !== 0x58) {
                  Queue.offerUnsafe(incoming, Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
                }
              }),
            writeAll: (chunks) =>
              Effect.gen(function*() {
                batches.push(chunks)
                if (batches.length === 1) {
                  yield* Deferred.succeed(writing, undefined)
                  yield* Deferred.await(release)
                }
                const frames = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
                const queries = frontendTags(frames).filter((tag) => tag === "S").length
                Queue.offerUnsafe(incoming, Buffer.concat(Array.from({ length: queries }, () => emptyQueryResult)))
              }),
            close: Effect.void
          })
      })
      const first = yield* connection.query("SELECT 1").pipe(Effect.forkScoped)
      yield* Deferred.await(writing)
      const second = yield* connection.query("SELECT 2").pipe(Effect.forkScoped({ startImmediately: true }))
      yield* Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))
      const third = yield* connection.query("SELECT 3").pipe(Effect.forkScoped({ startImmediately: true }))
      yield* Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))
      assert.strictEqual(batches.length, 1)
      yield* Deferred.succeed(release, undefined)
      yield* Effect.all([Fiber.join(first), Fiber.join(second), Fiber.join(third)])
      assert.strictEqual(batches.length, 2)
      assert.strictEqual(batches[1].length, 2)
      assert.include(Buffer.from(batches[1][0]).toString(), "SELECT 2")
      assert.include(Buffer.from(batches[1][1]).toString(), "SELECT 3")
    }))

  it.effect("pauses incoming rows until a slow stream consumer resumes", () =>
    Effect.gen(function*() {
      const incoming = yield* Queue.unbounded<Uint8Array>()
      const paused = yield* Deferred.make<void>()
      const resume = yield* Deferred.make<void>()
      const rows: Array<number> = []
      let received = 0
      const description = backendMessage(
        "T",
        Buffer.concat([
          int16(1),
          Buffer.from("value\0"),
          int32(0),
          int16(0),
          int32(23),
          int16(4),
          int32(-1),
          int16(1)
        ])
      )
      const batches = Array.from({ length: 3 }, (_, batch) => {
        const messages = Array.from({ length: 600 }, (_, i) => {
          const value = int32(batch * 600 + i)
          return backendMessage("D", Buffer.concat([int16(1), int32(value.length), value]))
        })
        if (batch === 0) {
          messages.unshift(backendMessage("1", Buffer.alloc(0)), backendMessage("2", Buffer.alloc(0)), description)
        }
        if (batch === 2) messages.push(backendMessage("C", Buffer.from("SELECT 1800\0")), readyForQuery)
        return Buffer.concat(messages)
      })
      const connection = yield* makeConnection({
        username: "test",
        connector: () =>
          Effect.succeed({
            pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
            run: (onChunk) =>
              Effect.forever(Effect.flatMap(Queue.take(incoming), (chunk) => {
                received++
                const pending = onChunk(chunk)
                return pending === undefined
                  ? Effect.void
                  : Effect.andThen(Deferred.succeed(paused, undefined), pending)
              })),
            upgrade: () => Effect.void,
            write: (chunk) =>
              Effect.sync(() => {
                if (chunk instanceof Uint8Array && chunk[0] !== 0x58) {
                  Queue.offerUnsafe(incoming, Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
                }
              }),
            writeAll: () =>
              Effect.sync(() => {
                for (const batch of batches) Queue.offerUnsafe(incoming, batch)
              }),
            close: Effect.void
          })
      })
      const streaming = yield* connection.stream("SELECT value").pipe(
        Stream.runForEach((row) =>
          Effect.andThen(
            rows.length === 0 ? Deferred.await(resume) : Effect.void,
            Effect.sync(() => {
              rows.push(row.value as number)
            })
          )
        ),
        Effect.forkScoped
      )
      yield* Deferred.await(paused)
      assert.strictEqual(received, 2)
      assert.deepStrictEqual(rows, [])
      yield* Deferred.succeed(resume, undefined)
      yield* Fiber.join(streaming)
      assert.strictEqual(received, 3)
      assert.deepStrictEqual(rows, Array.from({ length: 1800 }, (_, i) => i))
    }))

  it.effect("stops queued writes before terminating a connection under backpressure", () =>
    Effect.gen(function*() {
      const incoming = yield* Queue.unbounded<Uint8Array>()
      const writing = yield* Deferred.make<void>()
      const scope = yield* Scope.fork(yield* Effect.scope)
      const writes: Array<Uint8Array> = []
      let interrupted = false
      let closed = false
      const connection = yield* Scope.provide(
        makeConnection({
          username: "test",
          multiplex: true,
          connector: () =>
            Effect.succeed({
              pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
              run: (onChunk) =>
                Effect.forever(Effect.flatMap(Queue.take(incoming), (chunk) => onChunk(chunk) ?? Effect.void)),
              upgrade: () => Effect.void,
              write: (chunk) =>
                Effect.sync(() => {
                  assert.instanceOf(chunk, Uint8Array)
                  writes.push(chunk as Uint8Array)
                  if (writes.length === 1) {
                    Queue.offerUnsafe(incoming, Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
                  }
                }),
              writeAll: (chunks) =>
                Effect.gen(function*() {
                  for (const chunk of chunks) {
                    assert.instanceOf(chunk, Uint8Array)
                    writes.push(chunk as Uint8Array)
                  }
                  yield* Deferred.succeed(writing, undefined)
                  return yield* Effect.never.pipe(Effect.onInterrupt(() =>
                    Effect.sync(() => {
                      interrupted = true
                    })
                  ))
                }),
              close: Effect.sync(() => {
                closed = true
              })
            })
        }),
        scope
      )
      const first = yield* connection.query("SELECT 1").pipe(Effect.result, Effect.forkScoped)
      yield* Deferred.await(writing)
      const second = yield* connection.query("SELECT 2").pipe(Effect.result, Effect.forkScoped)
      yield* Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(interrupted)
      assert.isTrue(closed)
      assert.strictEqual(writes.length, 3)
      assert.deepStrictEqual(writes[2], new Uint8Array([0x58, 0, 0, 0, 4]))
      assert.isTrue(Result.isFailure(yield* Fiber.join(first)))
      assert.isTrue(Result.isFailure(yield* Fiber.join(second)))
    }))
})

it.effect("closes the socket when Terminate cannot drain", () =>
  Effect.gen(function*() {
    const incoming = yield* Queue.unbounded<Uint8Array>()
    const terminating = yield* Deferred.make<void>()
    const scope = yield* Scope.fork(yield* Effect.scope)
    let closed = false
    yield* Scope.provide(
      makeConnection({
        username: "test",
        connector: () =>
          Effect.succeed({
            pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
            run: (onChunk) =>
              Effect.forever(Effect.flatMap(Queue.take(incoming), (chunk) => onChunk(chunk) ?? Effect.void)),
            upgrade: () => Effect.void,
            write: (chunk) => {
              if (chunk instanceof Uint8Array && chunk[0] === 0x58) {
                return Effect.andThen(Deferred.succeed(terminating, undefined), Effect.never)
              }
              return Effect.sync(() => {
                Queue.offerUnsafe(incoming, Buffer.concat([authenticationOk, backendKeyData, readyForQuery]))
              })
            },
            writeAll: () => Effect.void,
            close: Effect.sync(() => {
              closed = true
            })
          })
      }),
      scope
    )
    const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkScoped)
    yield* Deferred.await(terminating)
    yield* TestClock.adjust("1 second")
    yield* Fiber.join(closing)
    assert.isTrue(closed)
  }))

it.effect.each([
  { values: { USER: "portable-user", USERNAME: "fallback-user" }, expected: "portable-user" },
  { values: { USERNAME: "fallback-user" }, expected: "fallback-user" }
])("resolves the default username through ConfigProvider: $expected", ({ values, expected }) =>
  Effect.gen(function*() {
    let username: string | undefined
    const socket: Duplex = new Duplex({
      read() {},
      write(chunk: Buffer, _encoding, callback) {
        username ??= startupParameters(chunk).get("user")
        queueMicrotask(() => socket.push(Buffer.concat([authenticationOk, backendKeyData, readyForQuery])))
        callback()
      }
    })
    yield* makeConnection({ stream: () => socket }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromUnknown(values))
    )
    assert.strictEqual(username, expected)
  }))
