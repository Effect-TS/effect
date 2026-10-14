import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { HttpClient } from "effect/http"
import type * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as Fs from "node:fs"
import * as Http from "node:http"
import * as Https from "node:https"
import type * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"

// Throwaway P-256 test PKI valid until 2126: a CA, a server certificate for
// DNS:docker.test and a client certificate. The CA key was not kept.
const fixture = (name: string) =>
  Fs.readFileSync(fileURLToPath(new URL(`./fixtures/mtls/${name}`, import.meta.url)), "utf8")
const ca = fixture("ca.pem")
const cert = fixture("client-cert.pem")
const key = fixture("client-key.pem")
// The server certificate is only valid for this name, so requests to
// 127.0.0.1 succeed only if `servername` is applied.
const servername = "docker.test"

interface TestServer {
  readonly origin: string
  readonly socketPath?: string
  /** Resolves when the connection that served the latest `/stream` request closes. */
  readonly streamClosed: () => Promise<void>
}

const serve = (server: Http.Server, listenOptions: Net.ListenOptions) =>
  Effect.gen(function*() {
    let streamClosed: Promise<void> | undefined
    server.on("request", (req: Http.IncomingMessage, res: Http.ServerResponse) => {
      if (req.url === "/stream") {
        streamClosed = new Promise((resolve) => req.socket.once("close", () => resolve()))
        const interval = setInterval(() => res.write("chunk\n"), 5)
        res.once("close", () => clearInterval(interval))
      } else if (req.url === "/slow") {
        setTimeout(() => res.end("slow"), 100)
      } else {
        res.end("pong")
      }
    })
    yield* Effect.acquireRelease(
      Effect.callback<void>((resume) => {
        server.listen(listenOptions, () => resume(Effect.void))
      }),
      () =>
        Effect.callback<void>((resume) => {
          server.close(() => resume(Effect.void))
          server.closeAllConnections()
        })
    )
    return () => streamClosed!
  })

const unixServer = Effect.gen(function*() {
  const dir = yield* Effect.acquireRelease(
    Effect.sync(() => Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-http-"))),
    (dir) => Effect.sync(() => Fs.rmSync(dir, { recursive: true, force: true }))
  )
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\${Path.basename(dir)}`
    : Path.join(dir, "http.sock")
  const streamClosed = yield* serve(Http.createServer(), { path: socketPath })
  return { origin: "http://localhost", socketPath, streamClosed } satisfies TestServer
})

const mtlsServer = Effect.gen(function*() {
  const server = Https.createServer({
    ca,
    cert: fixture("server-cert.pem"),
    key: fixture("server-key.pem"),
    requestCert: true,
    rejectUnauthorized: true
  })
  const streamClosed = yield* serve(server, { host: "127.0.0.1", port: 0 })
  const { port } = server.address() as Net.AddressInfo
  return { origin: `https://127.0.0.1:${port}`, streamClosed } satisfies TestServer
})

const cases: ReadonlyArray<{
  readonly name: string
  readonly server: typeof unixServer | typeof mtlsServer
  readonly client: (server: TestServer) => Layer.Layer<HttpClient.HttpClient>
}> = [
  {
    name: "undici over a unix socket",
    server: unixServer,
    client: (server) => NodeClient.layerUndiciOptions({ connect: { socketPath: server.socketPath! } })
  },
  {
    name: "node:http over a unix socket",
    server: unixServer,
    client: (server) => NodeClient.layerNodeHttpOptions({ socketPath: server.socketPath! })
  },
  {
    name: "undici over mTLS",
    server: mtlsServer,
    client: () => NodeClient.layerUndiciOptions({ connect: { ca, cert, key, servername } })
  },
  {
    name: "node:http over mTLS",
    server: mtlsServer,
    client: () => NodeClient.layerNodeHttpOptions({ ca, cert, key, servername })
  }
]

describe("NodeHttpClient connect options", () => {
  describe.each(cases)("$name", ({ client, server: makeServer }) => {
    const withClient = <A, E>(f: (server: TestServer) => Effect.Effect<A, E, HttpClient.HttpClient>) =>
      Effect.gen(function*() {
        const server = yield* makeServer
        return yield* f(server).pipe(Effect.provide(client(server)))
      }).pipe(Effect.scoped)

    it.live("sends requests", () =>
      withClient((server) =>
        Effect.gen(function*() {
          const response = yield* HttpClient.get(`${server.origin}/ping`)
          assert.strictEqual(yield* response.text, "pong")
        })
      ))

    it.live("closes the connection when a stream stops early", () =>
      withClient((server) =>
        Effect.gen(function*() {
          yield* HttpClient.get(`${server.origin}/stream`).pipe(
            Effect.map((response) => response.stream),
            Stream.unwrap,
            Stream.take(3),
            Stream.runDrain
          )
          yield* Effect.promise(server.streamClosed).pipe(Effect.timeout("2 seconds"))
        })
      ))

    it.live("closes the connection when a stream is interrupted", () =>
      withClient((server) =>
        Effect.gen(function*() {
          const received = yield* Deferred.make<void>()
          const fiber = yield* HttpClient.get(`${server.origin}/stream`).pipe(
            Effect.map((response) => response.stream),
            Stream.unwrap,
            Stream.tap(() => Deferred.succeed(received, undefined)),
            Stream.runDrain,
            Effect.forkChild
          )
          yield* Deferred.await(received)
          yield* Fiber.interrupt(fiber)
          yield* Effect.promise(server.streamClosed).pipe(Effect.timeout("2 seconds"))
        })
      ))
  })

  it.live.each([
    { name: "undici", client: NodeClient.layerUndiciOptions({ connect: { ca, servername } }) },
    { name: "node:http", client: NodeClient.layerNodeHttpOptions({ ca, servername }) }
  ])("$name fails over mTLS without a client certificate", ({ client }) =>
    Effect.gen(function*() {
      const server = yield* mtlsServer
      const error = yield* HttpClient.get(`${server.origin}/ping`).pipe(
        Effect.flatMap((response) => response.text),
        Effect.provide(client),
        Effect.flip
      )
      assert.strictEqual(error.reason._tag, "TransportError")
    }).pipe(Effect.scoped))

  it.live("undici keeps Effect in charge of timeouts", () =>
    Effect.gen(function*() {
      const server = yield* unixServer
      const response = yield* HttpClient.get(`${server.origin}/slow`).pipe(
        Effect.provide(NodeClient.layerUndiciOptions({
          headersTimeout: 1,
          bodyTimeout: 1,
          connect: { socketPath: server.socketPath }
        }))
      )
      assert.strictEqual(yield* response.text, "slow")
    }).pipe(Effect.scoped))
})
