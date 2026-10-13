import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { HttpClient } from "effect/http"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Fs from "node:fs"
import * as Http from "node:http"
import * as Https from "node:https"
import type * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import type * as Tls from "node:tls"
import { fileURLToPath } from "node:url"

// Throwaway P-256 test PKI valid until 2126: a CA, a server certificate for
// DNS:docker.test and a client certificate. The CA key was not kept.
const fixture = (name: string) =>
  Fs.readFileSync(fileURLToPath(new URL(`./fixtures/mtls/${name}`, import.meta.url)), "utf8")
const ca = fixture("ca.pem")
const serverCert = fixture("server-cert.pem")
const serverKey = fixture("server-key.pem")
const clientCert = fixture("client-cert.pem")
const clientKey = fixture("client-key.pem")
// The server certificate is only valid for this name, so requests to
// 127.0.0.1 succeed only if `servername` is applied.
const servername = "docker.test"

interface TestServer {
  readonly origin: string
  readonly socketPath?: string
  /** Resolves when the connection that served the latest `/stream` request closes. */
  readonly streamClosed: () => Promise<void>
  /** Codes of TLS handshakes the server rejected. */
  readonly tlsClientErrors: ReadonlyArray<string>
}

const handler = (streamClosed: Array<Promise<void>>): Http.RequestListener => (req, res) => {
  switch (req.url) {
    case "/ping": {
      const socket = req.socket as Tls.TLSSocket
      const peer = typeof socket.getPeerCertificate === "function" ? socket.getPeerCertificate().subject?.CN : "none"
      res.end(`pong ${req.headers.host} ${peer}`)
      return
    }
    case "/slow": {
      setTimeout(() => res.end("slow"), 100)
      return
    }
    case "/stream": {
      streamClosed.push(new Promise((resolve) => req.socket.once("close", () => resolve())))
      res.writeHead(200, { "content-type": "text/plain" })
      const interval = setInterval(() => res.write("chunk\n"), 5)
      res.once("close", () => clearInterval(interval))
      return
    }
    default: {
      res.statusCode = 404
      res.end()
    }
  }
}

const listen = (server: Http.Server, listenOptions: Net.ListenOptions) =>
  Effect.acquireRelease(
    Effect.callback<void>((resume) => {
      server.listen(listenOptions, () => resume(Effect.void))
    }),
    () =>
      Effect.callback<void>((resume) => {
        server.close(() => resume(Effect.void))
        server.closeAllConnections()
      })
  )

const makeUnixServer = Effect.gen(function*() {
  const dir = yield* Effect.acquireRelease(
    Effect.sync(() => Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-http-"))),
    (dir) => Effect.sync(() => Fs.rmSync(dir, { recursive: true, force: true }))
  )
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\${Path.basename(dir)}`
    : Path.join(dir, "http.sock")
  const streamClosed: Array<Promise<void>> = []
  yield* listen(Http.createServer(handler(streamClosed)), { path: socketPath })
  return {
    origin: "http://localhost",
    socketPath,
    streamClosed: () => streamClosed.at(-1)!,
    tlsClientErrors: []
  } satisfies TestServer
})

const makeTlsServer = Effect.gen(function*() {
  const streamClosed: Array<Promise<void>> = []
  const server = Https.createServer({
    ca,
    cert: serverCert,
    key: serverKey,
    requestCert: true,
    rejectUnauthorized: true
  }, handler(streamClosed))
  const tlsClientErrors: Array<string> = []
  server.on("tlsClientError", (error: NodeJS.ErrnoException) => tlsClientErrors.push(error.code ?? error.message))
  yield* listen(server, { host: "127.0.0.1", port: 0 })
  const { port } = server.address() as Net.AddressInfo
  return {
    origin: `https://127.0.0.1:${port}`,
    streamClosed: () => streamClosed.at(-1)!,
    tlsClientErrors
  } satisfies TestServer
})

const transports: ReadonlyArray<{
  readonly name: string
  readonly server: Effect.Effect<TestServer, never, Scope.Scope>
  readonly undici: (server: TestServer) => Layer.Layer<HttpClient.HttpClient>
  readonly nodeHttp: (server: TestServer) => Layer.Layer<HttpClient.HttpClient>
  readonly expectedPeer: string
}> = [
  {
    name: "unix socket",
    server: makeUnixServer,
    undici: (server) => NodeClient.layerUndiciOptions({ connect: { socketPath: server.socketPath! } }),
    nodeHttp: (server) => NodeClient.layerNodeHttpOptions({ socketPath: server.socketPath! }),
    expectedPeer: "none"
  },
  {
    name: "mTLS",
    server: makeTlsServer,
    undici: () =>
      NodeClient.layerUndiciOptions({
        connect: { ca, cert: clientCert, key: clientKey, servername }
      }),
    nodeHttp: () => NodeClient.layerNodeHttpOptions({ ca, cert: clientCert, key: clientKey, servername }),
    expectedPeer: "effect-test-client"
  }
]

const backends = [
  { name: "undici", layer: "undici" },
  { name: "node:http", layer: "nodeHttp" }
] as const

describe("NodeHttpClient connect options", () => {
  for (const transport of transports) {
    for (const backend of backends) {
      describe(`${backend.name} over ${transport.name}`, () => {
        const withClient = <A, E>(
          f: (server: TestServer) => Effect.Effect<A, E, HttpClient.HttpClient>
        ) =>
          Effect.gen(function*() {
            const server = yield* transport.server
            return yield* f(server).pipe(Effect.provide(transport[backend.layer](server)))
          }).pipe(Effect.scoped)

        it.live("sends requests", () =>
          withClient((server) =>
            Effect.gen(function*() {
              const response = yield* HttpClient.get(`${server.origin}/ping`)
              assert.strictEqual(response.status, 200)
              const host = new URL(server.origin).host
              assert.strictEqual(yield* response.text, `pong ${host} ${transport.expectedPeer}`)
            })
          ))

        it.live("closes the connection when a stream stops early", () =>
          withClient((server) =>
            Effect.gen(function*() {
              const chunks = yield* HttpClient.get(`${server.origin}/stream`).pipe(
                Effect.map((response) => response.stream),
                Stream.unwrap,
                Stream.decodeText(),
                Stream.take(3),
                Stream.runCollect
              )
              assert.strictEqual(chunks.length, 3)
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
    }
  }

  it.live("undici ignores dispatcher timeouts in favor of Effect timeouts", () =>
    Effect.gen(function*() {
      const server = yield* makeUnixServer
      const response = yield* HttpClient.get(`${server.origin}/slow`).pipe(
        Effect.provide(NodeClient.layerUndiciOptions({
          headersTimeout: 1,
          bodyTimeout: 1,
          connect: { socketPath: server.socketPath! }
        }))
      )
      assert.strictEqual(yield* response.text, "slow")
    }).pipe(Effect.scoped))

  describe("mTLS is enforced", () => {
    const requestWith = (layer: Layer.Layer<HttpClient.HttpClient>) =>
      Effect.gen(function*() {
        const server = yield* makeTlsServer
        const error = yield* HttpClient.get(`${server.origin}/ping`).pipe(
          Effect.flatMap((response) => response.text),
          Effect.provide(layer),
          Effect.flip
        )
        assert(error.reason._tag === "TransportError")
        return { cause: error.reason.cause as NodeJS.ErrnoException, tlsClientErrors: server.tlsClientErrors }
      }).pipe(Effect.scoped)

    it.live("undici fails without a client certificate", () =>
      Effect.gen(function*() {
        const { tlsClientErrors } = yield* requestWith(NodeClient.layerUndiciOptions({ connect: { ca, servername } }))
        assert.deepStrictEqual(tlsClientErrors, ["ERR_SSL_PEER_DID_NOT_RETURN_A_CERTIFICATE"])
      }))

    it.live("node:http fails without a client certificate", () =>
      Effect.gen(function*() {
        const { cause, tlsClientErrors } = yield* requestWith(NodeClient.layerNodeHttpOptions({ ca, servername }))
        assert.strictEqual(cause.code, "ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED")
        assert.deepStrictEqual(tlsClientErrors, ["ERR_SSL_PEER_DID_NOT_RETURN_A_CERTIFICATE"])
      }))

    it.live("undici fails when the server certificate is not trusted", () =>
      Effect.gen(function*() {
        const { cause } = yield* requestWith(NodeClient.layerUndiciOptions({
          connect: { cert: clientCert, key: clientKey, servername }
        }))
        assert.strictEqual(cause.code, "SELF_SIGNED_CERT_IN_CHAIN")
      }))
  })
})
