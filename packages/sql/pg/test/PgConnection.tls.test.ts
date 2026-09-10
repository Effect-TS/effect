import { PgConnection } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { Duplex } from "node:stream"
import type * as Tls from "node:tls"
import { vi } from "vitest"

const tlsOptions = new WeakMap<Duplex, Tls.ConnectionOptions>()

// Exercise PostgreSQL startup and cancellation over simulated streams, recording
// the options at the TLS boundary. Per-stream observations let tests run
// concurrently without sharing mock call counts or implementations.
vi.mock("node:tls", () => ({
  connect(options: Tls.ConnectionOptions) {
    const socket = options.socket!
    tlsOptions.set(socket, options)
    queueMicrotask(() => socket.emit("secureConnect"))
    return socket
  }
}))

const int32 = (value: number): Buffer => {
  const bytes = Buffer.alloc(4)
  bytes.writeInt32BE(value)
  return bytes
}

const backendMessage = (tag: string, payload: Buffer): Buffer =>
  Buffer.concat([Buffer.from(tag), int32(payload.length + 4), payload])

const startupResponse = Buffer.concat([
  backendMessage("R", int32(0)),
  backendMessage("K", Buffer.concat([int32(1234), int32(5678)])),
  backendMessage("Z", Buffer.from("I"))
])

const makeStream = (cancel: boolean) => {
  const writes: Array<Buffer> = []
  const socket: Duplex = new Duplex({
    read() {},
    write(chunk: Buffer, _encoding, callback) {
      writes.push(Buffer.from(chunk))
      queueMicrotask(() => {
        if (writes.length === 1) {
          socket.push(Buffer.from("S"))
        } else if (cancel) {
          socket.destroy()
        } else if (writes.length === 2) {
          socket.push(startupResponse)
        }
      })
      callback()
    }
  })
  return { socket, writes }
}

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

describe("PgConnection TLS servername", () => {
  for (const path of ["startup", "cancel"] as const) {
    describe(path, () => {
      it.effect.each(cases)("$name", ({ config, servername }) =>
        Effect.gen(function*() {
          const streams: Array<ReturnType<typeof makeStream>> = []
          const connection = yield* PgConnection.make({
            username: "test",
            ...config,
            stream: () => {
              const stream = makeStream(streams.length > 0)
              streams.push(stream)
              return stream.socket
            }
          })
          if (path === "cancel") {
            yield* connection.interrupt
          }

          assert.strictEqual(streams.length, path === "cancel" ? 2 : 1)
          const stream = streams[path === "cancel" ? 1 : 0]
          assert.deepStrictEqual(stream.writes[0], Buffer.concat([int32(8), int32(80877103)]))
          if (path === "cancel") {
            assert.deepStrictEqual(
              stream.writes[1],
              Buffer.concat([int32(16), int32(80877102), int32(1234), int32(5678)])
            )
          }
          const options = tlsOptions.get(stream.socket)
          assert.isDefined(options)
          assert.strictEqual(options!.servername, servername)
          if (typeof config.ssl === "object") {
            assert.strictEqual(options!.rejectUnauthorized, config.ssl.rejectUnauthorized)
          }
        }))
    })
  }
})
