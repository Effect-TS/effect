import * as DenoSocket from "@effect/platform-deno/DenoSocket"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Queue } from "effect"
import * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"
import * as Tls from "node:tls"

const ca = Deno.readTextFileSync(new URL("./fixtures/tls/ca.pem", import.meta.url))
const cert = Deno.readTextFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url))
const key = Deno.readTextFileSync(new URL("./fixtures/tls/key.pem", import.meta.url))
const clientCa = Deno.readTextFileSync(new URL("./fixtures/tls/client-ca.pem", import.meta.url))
const clientCert = Deno.readTextFileSync(new URL("./fixtures/tls/client-cert.pem", import.meta.url))
const clientKey = Deno.readTextFileSync(new URL("./fixtures/tls/client-key.pem", import.meta.url))

const makeTcpServer = Effect.acquireRelease(
  Effect.sync(() => Deno.listen({ hostname: "127.0.0.1", port: 0 })),
  (listener) => Effect.sync(() => listener.close())
)

const makeTlsServer = Effect.acquireRelease(
  Effect.sync(() => Deno.listenTls({ hostname: "127.0.0.1", port: 0, cert, key })),
  (listener) => Effect.sync(() => listener.close())
)

const runTlsEchoServer = (listener: Deno.TlsListener) =>
  Effect.tryPromise({
    try: () => listener.accept().then((conn) => conn.readable.pipeTo(conn.writable)),
    catch: (cause) => cause
  }).pipe(Effect.ignore)

// `Deno.listenTls` cannot require client certificates, so mutual TLS uses `node:tls`.
const makeMutualTlsServer = Effect.acquireRelease(
  Effect.callback<Tls.Server>((resume) => {
    const server = Tls.createServer({
      cert,
      key,
      ca: [clientCa],
      requestCert: true,
      rejectUnauthorized: true,
      allowHalfOpen: true
    }, (socket) => {
      let received = ""
      socket.setEncoding("utf8")
      socket.on("data", (chunk: string) => {
        received += chunk
      })
      socket.on("end", () => socket.end(`Received ${received}`))
      socket.on("error", () => {})
    })
    server.on("tlsClientError", () => {})
    server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
  }),
  (server) => Effect.sync(() => server.close())
)

const makeTempDir = Effect.acquireRelease(
  Effect.promise(() => Deno.makeTempDir()),
  (path) => Effect.promise(() => Deno.remove(path, { recursive: true }))
)

const runEchoServer = (listener: Deno.Listener) =>
  Effect.forever(
    Effect.promise(() => listener.accept().then((conn) => conn.readable.pipeTo(conn.writable)))
  )

const makeTestConn = (options?: {
  readonly data?: Uint8Array | undefined
  readonly pendingRead?: boolean | undefined
  readonly closeReadableOnCloseWrite?: boolean | undefined
  readonly setNoDelay?: ((value?: boolean) => void) | undefined
  readonly setKeepAlive?: ((value?: boolean) => void) | undefined
}) => {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  let readableClosed = false
  let closeWrites = 0
  const readable = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value
      if (options?.data) value.enqueue(options.data)
      if (options?.pendingRead !== true) {
        readableClosed = true
        value.close()
      }
    }
  })
  const conn = {
    readable,
    writable: new WritableStream<Uint8Array>(),
    read: () => Promise.resolve(null),
    write: (data: Uint8Array) => Promise.resolve(data.length),
    close() {
      if (readableClosed) return
      readableClosed = true
      controller.close()
    },
    closeWrite() {
      closeWrites++
      if (options?.closeReadableOnCloseWrite && !readableClosed) {
        readableClosed = true
        controller.close()
      }
      return Promise.resolve()
    },
    ref() {},
    unref() {},
    localAddr: { transport: "tcp", hostname: "127.0.0.1", port: 0 },
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 0 },
    [Symbol.dispose]() {
      this.close()
    },
    ...(options?.setNoDelay ? { setNoDelay: options.setNoDelay } : {}),
    ...(options?.setKeepAlive ? { setKeepAlive: options.setKeepAlive } : {})
  } as Deno.Conn
  return { conn, closeWrites: () => closeWrites }
}

const replaceDenoConnect = (
  connect: (options: Deno.ConnectOptions | Deno.UnixConnectOptions) => Promise<Deno.Conn>
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const descriptor = Object.getOwnPropertyDescriptor(Deno, "connect")!
      Object.defineProperty(Deno, "connect", { ...descriptor, value: connect })
      return descriptor
    }),
    (descriptor) => Effect.sync(() => Object.defineProperty(Deno, "connect", descriptor))
  )

// Tests that replace Deno APIs must not overlap native connection tests.
describe("DenoSocket", { concurrent: false }, () => {
  for (const servername of ["mail.example.test", undefined]) {
    it.effect(
      servername === undefined
        ? "preserves remote hostname when client TLS upgrade servername is omitted"
        : "forwards explicit client TLS upgrade servername as hostname",
      () =>
        Effect.gen(function*() {
          const { conn } = makeTestConn({ pendingRead: true })
          const cause = new Error("stop before TLS handshake")
          let receivedConn: Deno.TcpConn | undefined
          let received: Deno.StartTlsOptions | undefined
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const descriptor = Object.getOwnPropertyDescriptor(Deno, "startTls")!
              Object.defineProperty(Deno, "startTls", {
                ...descriptor,
                value: (raw: Deno.TcpConn, options: Deno.StartTlsOptions) => {
                  receivedConn = raw
                  received = options
                  return Promise.reject(cause)
                }
              })
              return descriptor
            }),
            (descriptor) => Effect.sync(() => Object.defineProperty(Deno, "startTls", descriptor))
          )
          const socket = yield* DenoSocket.fromConn(Effect.succeed(conn))
          const { upgrade } = yield* socket.reader
          // Use a variable so this runtime regression can run before the public option is added.
          const options = servername === undefined
            ? { rejectUnauthorized: true }
            : { rejectUnauthorized: true, servername }
          const error = yield* upgrade(options).pipe(Effect.flip)

          assert.strictEqual(error.reason._tag, "SocketUpgradeError")
          if (error.reason._tag === "SocketUpgradeError") assert.strictEqual(error.reason.cause, cause)
          assert.strictEqual(receivedConn, conn)
          assert.strictEqual(received?.unsafelyDisableHostnameVerification, false)
          assert.strictEqual(received?.hostname, servername ?? (conn.remoteAddr as Deno.NetAddr).hostname)
        })
    )
  }

  it.effect("upgrades a TCP reader to TLS", () =>
    Effect.gen(function*() {
      const listener = yield* makeTlsServer
      yield* runTlsEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr
      const socket = yield* DenoSocket.makeTcp({ hostname: address.hostname, port: address.port })
      const writer = yield* socket.writer
      const { pull, upgrade } = yield* socket.reader

      yield* upgrade({ ca: [ca] })
      yield* writer.writeAll(["Hello", "World"])

      const decoder = new TextDecoder()
      let output = ""
      while (output.length < 10) {
        for (const chunk of yield* pull) output += typeof chunk === "string" ? chunk : decoder.decode(chunk)
      }
      assert.strictEqual(output, "HelloWorld")
    }))

  it.effect("reports TLS handshake failures as SocketUpgradeError", () =>
    Effect.gen(function*() {
      const listener = yield* makeTlsServer
      yield* runTlsEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr
      const socket = yield* DenoSocket.makeTcp({ hostname: address.hostname, port: address.port })
      const { pull, upgrade } = yield* socket.reader

      const error = yield* upgrade().pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "SocketUpgradeError")
      if (error.reason._tag === "SocketUpgradeError") assert.instanceOf(error.reason.cause, Error)
      assert.strictEqual(yield* pull.pipe(Effect.flip), error)
    }))

  it.effect("echoes over TLS", () =>
    Effect.gen(function*() {
      const listener = yield* makeTlsServer
      yield* runTlsEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr

      const output = yield* Stream.make("Hello", "TLS").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(
          DenoSocket.makeTlsChannel({ hostname: address.hostname, port: address.port, caCerts: [ca] })
        ),
        Stream.catchIf(
          (error) => error.reason._tag === "SocketCloseError",
          () => Stream.empty
        ),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "HelloTLS")
    }))

  it.effect("keeps reading after the TLS write side closes", () =>
    Effect.gen(function*() {
      const listener = yield* makeTlsServer
      const address = listener.addr as Deno.NetAddr
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      yield* Effect.gen(function*() {
        const conn = yield* Effect.promise(() => listener.accept())
        // `conn.read` keeps the resource open at EOF, unlike `conn.readable`.
        let received = ""
        while (true) {
          const buffer = new Uint8Array(16)
          const size = yield* Effect.promise(() => conn.read(buffer))
          if (size === null) break
          received += decoder.decode(buffer.subarray(0, size))
        }
        const writer = conn.writable.getWriter()
        yield* Effect.promise(() => writer.write(encoder.encode(`Received ${received}`)))
        writer.releaseLock()
        yield* Effect.promise(() => conn.closeWrite())
      }).pipe(Effect.forkScoped)

      const socket = yield* DenoSocket.makeTls({ hostname: address.hostname, port: address.port, caCerts: [ca] })
      const messages = yield* Queue.unbounded<Uint8Array>()
      const runFiber = yield* Effect.gen(function*() {
        const pull = yield* Socket.readerBytes(socket)
        while (true) {
          yield* Queue.offerAll(messages, yield* pull)
        }
      }).pipe(Effect.scoped, Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void), Effect.forkChild)
      yield* Effect.scoped(
        socket.writer.pipe(Effect.flatMap((writer) => writer.write("Hello")))
      )
      yield* Fiber.join(runFiber)

      const received = Array.from(yield* Queue.clear(messages), (chunk) => decoder.decode(chunk)).join("")
      assert.strictEqual(received, "Received Hello")
    }))

  it.effect("presents a client certificate for mutual TLS", () =>
    Effect.gen(function*() {
      const server = yield* makeMutualTlsServer
      const address = server.address() as { readonly port: number }

      const output = yield* Stream.make("Hello").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(DenoSocket.makeTlsChannel({
          hostname: "127.0.0.1",
          port: address.port,
          caCerts: [ca],
          cert: clientCert,
          key: clientKey
        })),
        Stream.catchIf(
          (error) => error.reason._tag === "SocketCloseError",
          () => Stream.empty
        ),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "Received Hello")
    }))

  it.effect("fails when mutual TLS requires a missing client certificate", () =>
    Effect.gen(function*() {
      const server = yield* makeMutualTlsServer
      const address = server.address() as { readonly port: number }
      const socket = yield* DenoSocket.makeTls({ hostname: "127.0.0.1", port: address.port, caCerts: [ca] })

      const error = yield* Effect.gen(function*() {
        const { pull } = yield* socket.reader
        while (true) {
          yield* pull
        }
      }).pipe(Effect.scoped, Effect.flip)

      // TLS 1.3 servers reject the client certificate after the client handshake completes.
      assert.include(["SocketOpenError", "SocketReadError"], error.reason._tag)
      assert.match(String((error.reason as { readonly cause?: unknown }).cause), /CertificateRequired/)
    }))

  it.effect("maps TLS handshake failures to SocketOpenError", () =>
    Effect.gen(function*() {
      const listener = yield* makeTlsServer
      yield* runTlsEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr
      const socket = yield* DenoSocket.makeTls({ hostname: address.hostname, port: address.port })

      const error = yield* Effect.scoped(Effect.asVoid(socket.reader)).pipe(Effect.flip)

      assert.strictEqual(error.reason._tag, "SocketOpenError")
      if (error.reason._tag === "SocketOpenError") assert.strictEqual(error.reason.kind, "Unknown")
    }))

  it.effect("rejects TLS upgrades on TLS sockets without disrupting the connection", () =>
    Effect.gen(function*() {
      const listener = yield* makeTlsServer
      yield* runTlsEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr
      const socket = yield* DenoSocket.makeTls({ hostname: address.hostname, port: address.port, caCerts: [ca] })
      const writer = yield* socket.writer
      const { pull, upgrade } = yield* socket.reader

      const error = yield* upgrade({ ca: [ca] }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "SocketUpgradeError")

      yield* writer.write("HelloTLS")
      const [received] = yield* pull
      assert.strictEqual(new TextDecoder().decode(received as Uint8Array), "HelloTLS")
    }))

  it.effect("echoes over TCP", () =>
    Effect.gen(function*() {
      const listener = yield* makeTcpServer
      yield* runEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr

      const output = yield* Stream.make("Hello", "World").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(DenoSocket.makeTcpChannel({ hostname: address.hostname, port: address.port })),
        Stream.catchIf(
          (error) => error.reason._tag === "SocketCloseError",
          () => Stream.empty
        ),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "HelloWorld")
    }))

  it.effect("keeps reading after the write side closes", () =>
    Effect.gen(function*() {
      const listener = yield* makeTcpServer
      const address = listener.addr as Deno.NetAddr
      const writeClosed = yield* Deferred.make<void>()
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      yield* Effect.gen(function*() {
        const conn = yield* Effect.promise(() => listener.accept())
        const chunks: Array<string> = []
        const read: Effect.Effect<void> = Effect.suspend(() => {
          const buffer = new Uint8Array(5)
          return Effect.promise(() => conn.read(buffer)).pipe(
            Effect.flatMap((size) => {
              if (size === null) return Effect.void
              chunks.push(decoder.decode(buffer.subarray(0, size)))
              return read
            })
          )
        })
        yield* read
        assert.strictEqual(chunks.join(""), "Hello")
        yield* Deferred.succeed(writeClosed, undefined)
        const writer = conn.writable.getWriter()
        yield* Effect.promise(() => writer.ready.then(() => writer.write(encoder.encode("Hello"))))
        writer.releaseLock()
        yield* Effect.promise(() => conn.closeWrite())
      }).pipe(Effect.forkScoped)

      const socket = yield* DenoSocket.makeTcp({ hostname: address.hostname, port: address.port })
      const messages = yield* Queue.unbounded<Uint8Array>()
      const runFiber = yield* Effect.gen(function*() {
        const pull = yield* Socket.readerBytes(socket)
        while (true) {
          yield* Queue.offerAll(messages, yield* pull)
        }
      }).pipe(Effect.scoped, Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void), Effect.forkChild)
      yield* Effect.scoped(
        socket.writer.pipe(Effect.flatMap((writer) => writer.write(encoder.encode("Hello"))))
      )
      yield* Deferred.await(writeClosed)

      assert.deepStrictEqual(yield* Queue.take(messages), encoder.encode("Hello"))
      yield* Fiber.join(runFiber)
    }))

  it.effect("half-closes an empty channel input", () =>
    Effect.gen(function*() {
      const listener = yield* makeTcpServer
      const address = listener.addr as Deno.NetAddr
      const encoder = new TextEncoder()

      yield* Effect.gen(function*() {
        const conn = yield* Effect.promise(() => listener.accept())
        assert.strictEqual(yield* Effect.promise(() => conn.read(new Uint8Array(1))), null)
        const writer = conn.writable.getWriter()
        yield* Effect.promise(() => writer.write(encoder.encode("Closed")))
        writer.releaseLock()
        yield* Effect.promise(() => conn.closeWrite())
      }).pipe(Effect.forkScoped)

      const output = yield* Stream.empty.pipe(
        Stream.pipeThroughChannel(DenoSocket.makeTcpChannel({ hostname: address.hostname, port: address.port })),
        Stream.catchIf(
          (error) => error.reason._tag === "SocketCloseError",
          () => Stream.empty
        ),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "Closed")
    }))

  it.effect("does not carry a consumed half-close into a second acquisition", () =>
    Effect.gen(function*() {
      const encoder = new TextEncoder()
      const first = makeTestConn({ pendingRead: true, closeReadableOnCloseWrite: true })
      const second = makeTestConn({ data: encoder.encode("Second") })
      const connections = [first.conn, second.conn]
      let index = 0
      const socket = yield* DenoSocket.fromConn(Effect.sync(() => connections[index++]!))
      const opened = yield* Deferred.make<void>()

      const firstRun = yield* Effect.gen(function*() {
        const { pull } = yield* socket.reader
        yield* Deferred.succeed(opened, undefined)
        while (true) {
          yield* pull
        }
      }).pipe(Effect.scoped, Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void), Effect.forkChild)
      yield* Deferred.await(opened)
      yield* Effect.scoped(socket.writer)
      yield* Fiber.join(firstRun)

      const received: Array<Uint8Array> = []
      yield* Effect.gen(function*() {
        const pull = yield* Socket.readerBytes(socket)
        while (true) {
          const chunk = yield* pull
          for (const data of chunk) {
            received.push(data)
          }
        }
      }).pipe(Effect.scoped, Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void))

      assert.deepStrictEqual(received, [encoder.encode("Second")])
      assert.strictEqual(first.closeWrites(), 1)
      assert.strictEqual(second.closeWrites(), 0)
    }))

  it.effect("maps connection refusal to SocketOpenError", () =>
    Effect.gen(function*() {
      const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 })
      const address = listener.addr as Deno.NetAddr
      listener.close()
      const socket = yield* DenoSocket.makeTcp({ hostname: address.hostname, port: address.port })

      const error = yield* Effect.scoped(Effect.asVoid(socket.reader)).pipe(Effect.flip)

      assert.instanceOf(error, Socket.SocketError)
      assert.strictEqual(error.reason._tag, "SocketOpenError")
      if (error.reason._tag === "SocketOpenError") {
        assert.strictEqual(error.reason.kind, "Unknown")
        assert.instanceOf(error.reason.cause, Deno.errors.ConnectionRefused)
      }
    }))

  it.effect("applies TCP tuning options and ignores them for Unix", () =>
    Effect.gen(function*() {
      const noDelay: Array<boolean | undefined> = []
      const keepAlive: Array<boolean | undefined> = []
      const tcp = makeTestConn({
        setNoDelay: (value) => noDelay.push(value),
        setKeepAlive: (value) => keepAlive.push(value)
      })
      const unix = makeTestConn()
      const connections = [tcp.conn, unix.conn]
      const connectOptions: Array<Deno.ConnectOptions | Deno.UnixConnectOptions> = []
      let index = 0
      yield* replaceDenoConnect((options) => {
        connectOptions.push(options)
        return Promise.resolve(connections[index++]!)
      })

      const tcpSocket = yield* DenoSocket.makeTcp({ port: 1, noDelay: false, keepAlive: true })
      yield* Effect.scoped(Effect.asVoid(tcpSocket.reader))
      const unixSocket = yield* DenoSocket.makeTcp({
        transport: "unix",
        path: "/unused.sock",
        noDelay: true,
        keepAlive: false
      })
      yield* Effect.scoped(Effect.asVoid(unixSocket.reader))

      assert.deepStrictEqual(noDelay, [false])
      assert.deepStrictEqual(keepAlive, [true])
      assert.deepStrictEqual(connectOptions, [
        { port: 1 },
        { transport: "unix", path: "/unused.sock" }
      ])
    }))

  it.effect("echoes over Unix sockets", () =>
    Effect.gen(function*() {
      const directory = yield* makeTempDir
      const path = `${directory}/echo.sock`
      const listener = yield* Effect.acquireRelease(
        Effect.sync(() => Deno.listen({ transport: "unix", path })),
        (listener) => Effect.sync(() => listener.close())
      )
      yield* runEchoServer(listener).pipe(Effect.forkScoped)

      const output = yield* Stream.make("Hello", "Unix").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(DenoSocket.makeTcpChannel({ transport: "unix", path })),
        Stream.catchIf(
          (error) => error.reason._tag === "SocketCloseError",
          () => Stream.empty
        ),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "HelloUnix")
    }))

  it.effect("rejects TLS upgrades on Unix sockets without disrupting the connection", () =>
    Effect.gen(function*() {
      const directory = yield* makeTempDir
      const path = `${directory}/upgrade.sock`
      const listener = yield* Effect.acquireRelease(
        Effect.sync(() => Deno.listen({ transport: "unix", path })),
        (listener) => Effect.sync(() => listener.close())
      )
      yield* runEchoServer(listener).pipe(Effect.forkScoped)

      const socket = yield* DenoSocket.makeTcp({ transport: "unix", path })
      const writer = yield* socket.writer
      const { pull, upgrade } = yield* socket.reader

      const error = yield* upgrade().pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "SocketUpgradeError")

      yield* writer.write("HelloUnix")
      const [received] = yield* pull
      assert.strictEqual(new TextDecoder().decode(received as Uint8Array), "HelloUnix")
    }))

  it.effect("uses Deno's native WebSocket", () =>
    Effect.gen(function*() {
      const server = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Deno.serve(
            { hostname: "127.0.0.1", port: 0, onListen: () => {} },
            (request) => {
              const { response, socket } = Deno.upgradeWebSocket(request)
              socket.onmessage = (event) => socket.send(event.data)
              return response
            }
          )
        ),
        (server) => Effect.promise(() => server.shutdown())
      )
      const address = server.addr as Deno.NetAddr
      const messages = yield* Queue.unbounded<Uint8Array>()

      yield* Effect.gen(function*() {
        const socket = yield* Socket.Socket
        const runFiber = yield* Effect.gen(function*() {
          const pull = yield* Socket.readerBytes(socket)
          while (true) {
            yield* Queue.offerAll(messages, yield* pull)
          }
        }).pipe(
          Effect.scoped,
          Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void),
          Effect.forkChild
        )
        const writer = yield* socket.writer
        yield* writer.write("Hello WebSocket")

        assert.deepStrictEqual(yield* Queue.take(messages), new TextEncoder().encode("Hello WebSocket"))
        yield* Fiber.interrupt(runFiber)
      }).pipe(
        Effect.scoped,
        Effect.provide(DenoSocket.layerWebSocket(`ws://${address.hostname}:${address.port}`))
      )
    }))

  it.effect("adapts a TransformStream", () =>
    Effect.gen(function*() {
      const readable = Stream.make("A", "B", "C").pipe(
        Stream.tap(() => Effect.sleep(50)),
        Stream.toReadableStream()
      )
      const decoder = new TextDecoder()
      const chunks: Array<string> = []
      const writable = new WritableStream<Uint8Array>({
        write(chunk) {
          chunks.push(decoder.decode(chunk))
        }
      })

      const socket = yield* Socket.fromTransformStream(
        Effect.succeed({ readable, writable })
      )
      yield* socket.writer.pipe(
        Effect.tap((writer) => writer.write("Hello").pipe(Effect.andThen(writer.write("World")))),
        Effect.scoped,
        Effect.forkChild
      )
      const received: Array<string> = []
      yield* Effect.gen(function*() {
        const pull = yield* Socket.readerString(socket)
        while (true) {
          const chunk = yield* pull
          for (const data of chunk) {
            received.push(data)
          }
        }
      }).pipe(Effect.scoped, Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void))

      assert.deepStrictEqual(chunks, ["Hello", "World"])
      assert.deepStrictEqual(received, ["A", "B", "C"])
    }))
})
