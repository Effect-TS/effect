import { NodeDocker, NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Queue, Redacted } from "effect"
import { DockerConfig, DockerEngine, DockerExec } from "effect/docker"
import { HttpClientRequest } from "effect/http"
import * as Fs from "node:fs"
import * as Http from "node:http"
import * as Https from "node:https"
import type * as Net from "node:net"
import type * as Tls from "node:tls"
import { fileURLToPath } from "node:url"

// a self-signed certificate for localhost and 127.0.0.1
const cert = Fs.readFileSync(fileURLToPath(new URL("./fixtures/tls/cert.pem", import.meta.url)), "utf8")
const key = Fs.readFileSync(fileURLToPath(new URL("./fixtures/tls/key.pem", import.meta.url)), "utf8")

/** What the Engine saw of a connection. */
interface Connection {
  readonly servername: string | false
  readonly clientCertificate: boolean
}

/**
 * An Engine stand-in: answers `/_ping`, switches upgrade requests to `tcp`
 * and writes `hello` on the upgraded connection, and reports each connection.
 */
const makeEngine = <S extends Http.Server>(
  makeServer: () => S,
  listen: (server: S, ready: () => void) => void,
  connection: (socket: Net.Socket) => Connection
) =>
  Effect.flatMap(Queue.unbounded<Connection>(), (connections) =>
    Effect.acquireRelease(
      Effect.callback<{ readonly server: S; readonly connections: Queue.Dequeue<Connection> }>((resume) => {
        const server = makeServer()
        server.on("request", (_, response: Http.ServerResponse) => {
          response.writeHead(200, { "Api-Version": "1.50", "Ostype": "linux" }).end("OK")
        })
        server.on("upgrade", (_, socket: Net.Socket) => {
          socket.end("HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\nhello")
        })
        server.on(server instanceof Https.Server ? "secureConnection" : "connection", (socket: Net.Socket) => {
          Queue.offerUnsafe(connections, connection(socket))
        })
        listen(server, () => resume(Effect.succeed({ server, connections })))
      }),
      ({ server }) =>
        Effect.callback<void>((resume) => {
          server.closeAllConnections()
          server.close(() => resume(Effect.void))
        })
    ))

const makeTlsEngine = makeEngine(
  () => Https.createServer({ cert, key, requestCert: true, rejectUnauthorized: false }),
  (server, ready) => server.listen(0, ready),
  (socket) => ({
    servername: (socket as Tls.TLSSocket).servername ?? false,
    clientCertificate: Object.keys((socket as Tls.TLSSocket).getPeerCertificate()).length > 0
  })
)

const decoder = new TextDecoder()

// Keep the engine alive while checking that a failed exec setup closes its upgrade.
const makeFailingUpgradeEngine = Effect.flatMap(Queue.unbounded<Net.Socket>(), (upgraded) => {
  const sockets: Array<Net.Socket> = []
  return Effect.acquireRelease(
    Effect.callback<Http.Server>((resume) => {
      const server = Http.createServer((_, response) => {
        response.writeHead(200, { "Content-Type": "application/json" })
          .end(JSON.stringify({ ID: "e", Running: true, OpenStdin: false, ProcessConfig: { tty: false } }))
      })
      server.on("connection", (socket: Net.Socket) => sockets.push(socket))
      server.on("upgrade", (_: Http.IncomingMessage, socket: Net.Socket) => {
        socket.write("HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\nContent-Type: text/plain\r\n\r\n")
        Queue.offerUnsafe(upgraded, socket)
      })
      server.listen(0, () => resume(Effect.succeed(server)))
    }),
    (server) =>
      Effect.callback<void>((resume) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resume(Effect.void))
      })
  ).pipe(
    Effect.flatMap((server) =>
      Layer.build(NodeDocker.layer.pipe(Layer.provide(DockerConfig.layer({
        endpoint: { _tag: "Tcp", host: "127.0.0.1", port: (server.address() as Net.AddressInfo).port },
        apiVersion: "1.50"
      }))))
    ),
    Effect.map((services) => ({ upgraded, services }))
  )
})

/** Waits until the client closes its side of a connection: the server sees its end, or the connection closes. */
const closed = (socket: Net.Socket) =>
  Effect.callback<void>((resume) => {
    if (socket.readableEnded || socket.destroyed) return resume(Effect.void)
    const done = () => resume(Effect.void)
    socket.once("end", done)
    socket.once("close", done)
    // the server side must read for `end` to arrive
    socket.resume()
  }).pipe(Effect.timeout("2 seconds"))

/**
 * Negotiates through `NodeDocker.layer` (a request), then sends an upgrade
 * request and reads the upgraded connection until it closes.
 */
const connect = (endpoint: typeof DockerConfig.Endpoint.Type) =>
  Effect.gen(function*() {
    const engine = yield* DockerEngine.DockerEngine
    assert.strictEqual(yield* engine.apiVersion, "1.50")
    const response = yield* engine.client.execute(
      HttpClientRequest.post("/containers/x/attach").pipe(HttpClientRequest.upgrade("tcp"))
    )
    const socket = yield* response.upgrade
    const reader = yield* socket.reader
    let text = ""
    while (true) {
      const chunks = yield* reader.pull.pipe(
        Effect.catchReason("SocketError", "SocketCloseError", () => Effect.succeed(undefined))
      )
      if (chunks === undefined) return text
      for (const chunk of chunks) text += typeof chunk === "string" ? chunk : decoder.decode(chunk)
    }
  }).pipe(
    Effect.scoped,
    Effect.provide(NodeDocker.layer.pipe(Layer.provide(DockerConfig.layer({ endpoint }))))
  )

describe("NodeDocker", () => {
  it.effect("connects over TLS with the Endpoint's settings, for requests and upgrades alike", () =>
    Effect.gen(function*() {
      const { connections, server } = yield* makeTlsEngine
      const port = (server.address() as Net.AddressInfo).port
      assert.strictEqual(
        yield* connect({
          _tag: "Tcp",
          host: "localhost",
          port,
          tls: { verify: true, ca: cert, clientCertificate: { cert, key: Redacted.make(key) } }
        }),
        "hello"
      )
      const expected = { servername: "localhost", clientCertificate: true }
      assert.deepStrictEqual(yield* Queue.takeN(connections, 2), [expected, expected])
    }))
  it.effect("connects over a unix socket, for requests and upgrades alike", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const socketPath = path.join(yield* fs.makeTempDirectoryScoped(), "docker.sock")
      const { connections } = yield* makeEngine(
        () => Http.createServer(),
        (server, ready) => server.listen(socketPath, ready),
        () => ({ servername: false, clientCertificate: false })
      )
      assert.strictEqual(yield* connect({ _tag: "Unix", path: socketPath }), "hello")
      assert.strictEqual((yield* Queue.takeAll(connections)).length, 2)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("fails with a permanent ConnectionFailed when the Engine's certificate can't be verified", () =>
    Effect.gen(function*() {
      const { server } = yield* makeTlsEngine
      const port = (server.address() as Net.AddressInfo).port
      const error = yield* connect({ _tag: "Tcp", host: "localhost", port, tls: { verify: true } }).pipe(Effect.flip)
      assert(error._tag === "DockerError" && error.reason._tag === "ConnectionFailed")
      assert.strictEqual(error.reason.hint, "the Engine's TLS certificate couldn't be verified")
      assert.isFalse(error.isRetryable)
    }))

  it.live("closes an upgraded connection when exec start fails before handing it over", () =>
    Effect.gen(function*() {
      const { services, upgraded } = yield* makeFailingUpgradeEngine
      const error = yield* DockerExec.DockerExec.use((exec) => Effect.scoped(exec.start("e"))).pipe(
        Effect.provideContext(services),
        Effect.flip
      )
      assert.strictEqual(error.reason._tag, "InvalidResponse")
      yield* closed(yield* Queue.take(upgraded))
    }))
})
