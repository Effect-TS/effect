import { NodeDocker, NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Queue, Redacted } from "effect"
import { DockerConfig, DockerEngine, DockerRegistryAuth } from "effect/docker"
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
      const clientCertificate = { cert, key: Redacted.make(key) }
      const cases: ReadonlyArray<readonly [string, typeof DockerConfig.Tls.Type, Connection]> = [
        // SNI for a domain name, never for an IP address
        ["localhost", { verify: true, ca: cert }, { servername: "localhost", clientCertificate: false }],
        ["127.0.0.1", { verify: true, ca: cert }, { servername: false, clientCertificate: false }],
        ["localhost", { verify: true, ca: cert, clientCertificate }, {
          servername: "localhost",
          clientCertificate: true
        }],
        ["localhost", { verify: false }, { servername: "localhost", clientCertificate: false }]
      ]
      for (const [host, tls, expected] of cases) {
        yield* Effect.scoped(Effect.gen(function*() {
          const { connections, server } = yield* makeTlsEngine
          const port = (server.address() as Net.AddressInfo).port
          assert.strictEqual(yield* connect({ _tag: "Tcp", host, port, tls }), "hello")
          // the request and the upgraded connection
          assert.deepStrictEqual(yield* Queue.takeN(connections, 2), [expected, expected], host)
        }))
      }
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

  it.effect("fails with a permanent ConnectionFailed when the client speaks TLS to a plain Engine", () =>
    Effect.gen(function*() {
      const { server } = yield* makeEngine(
        () => Http.createServer(),
        (server, ready) => server.listen(0, ready),
        () => ({ servername: false, clientCertificate: false })
      )
      const port = (server.address() as Net.AddressInfo).port
      const error = yield* connect({ _tag: "Tcp", host: "localhost", port, tls: { verify: false } }).pipe(Effect.flip)
      assert(error._tag === "DockerError" && error.reason._tag === "ConnectionFailed")
      assert.strictEqual(error.reason.hint, "TLS/plain mismatch: the Engine and the client disagree about TLS")
      assert.isFalse(error.isRetryable)
    }))

  it.effect("fails with a hint when the socket doesn't exist", () =>
    Effect.gen(function*() {
      const error = yield* connect({ _tag: "Unix", path: "/nonexistent/docker.sock" }).pipe(Effect.flip)
      assert(error._tag === "DockerError" && error.reason._tag === "ConnectionFailed")
      assert.strictEqual(error.reason.hint, "the socket /nonexistent/docker.sock doesn't exist: is the Engine running?")
      assert.isTrue(error.isRetryable)
    }))

  it.effect("runs credential helpers as child processes", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const bin = yield* fs.makeTempDirectoryScoped()
      // answers for ghcr.io, "not found" for everything else
      yield* fs.writeFileString(
        path.join(bin, "docker-credential-test"),
        `#!/bin/sh
read registry
case "$registry" in
  ghcr.io) echo '{"ServerURL":"ghcr.io","Username":"helper-user","Secret":"helper-secret"}' ;;
  *) echo "credentials not found in native keychain"; exit 1 ;;
esac
`,
        { mode: 0o755 }
      )
      const originalPath = process.env.PATH
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          process.env.PATH = `${bin}:${originalPath}`
        }),
        () =>
          Effect.sync(() => {
            process.env.PATH = originalPath
          })
      )
      const [ghcr, other] = yield* Effect.gen(function*() {
        const registryAuth = yield* DockerRegistryAuth.DockerRegistryAuth
        return yield* Effect.all([registryAuth.credential("ghcr.io"), registryAuth.credential("quay.io")])
      }).pipe(Effect.provide(NodeDocker.layer.pipe(Layer.provide(DockerConfig.layer({ credsStore: "test" })))))
      assert.strictEqual(ghcr?.username, "helper-user")
      assert.strictEqual(ghcr?.password && Redacted.value(ghcr.password), "helper-secret")
      assert.isUndefined(other)
    }).pipe(Effect.provide(NodeServices.layer)))
})
