import * as DenoSocket from "@effect/platform-deno/DenoSocket"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Queue } from "effect"
import * as Stream from "effect/Stream"
import * as Socket from "effect/unstable/socket/Socket"

const makeTcpServer = Effect.acquireRelease(
  Effect.sync(() => Deno.listen({ hostname: "127.0.0.1", port: 0 })),
  (listener) => Effect.sync(() => listener.close())
)

const makeTempDir = Effect.acquireRelease(
  Effect.promise(() => Deno.makeTempDir()),
  (path) => Effect.promise(() => Deno.remove(path, { recursive: true }))
)

const runEchoServer = (listener: Deno.Listener) =>
  Effect.forever(
    Effect.promise(() => listener.accept().then((conn) => conn.readable.pipeTo(conn.writable)))
  )

describe("DenoSocket", () => {
  it.effect("echoes over TCP", () =>
    Effect.gen(function*() {
      const listener = yield* makeTcpServer
      yield* runEchoServer(listener).pipe(Effect.forkScoped)
      const address = listener.addr as Deno.NetAddr

      const output = yield* Stream.make("Hello", "World").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(DenoSocket.makeTcpChannel({ hostname: address.hostname, port: address.port })),
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
      const runFiber = yield* socket.run((chunk) => Queue.offer(messages, chunk)).pipe(Effect.forkChild)
      yield* Effect.scoped(
        socket.writer.pipe(Effect.flatMap((write) => write(encoder.encode("Hello"))))
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
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "Closed")
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
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(output, "HelloUnix")
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
        const runFiber = yield* socket.run((chunk) => Queue.offer(messages, chunk)).pipe(Effect.forkChild)
        const write = yield* socket.writer
        yield* write("Hello WebSocket")

        assert.deepStrictEqual(yield* Queue.take(messages), new TextEncoder().encode("Hello WebSocket"))
        yield* Fiber.interrupt(runFiber)
      }).pipe(
        Effect.scoped,
        Effect.provide(DenoSocket.layerWebSocket(`ws://${address.hostname}:${address.port}`, {
          closeCodeIsError: () => false
        }))
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
        Effect.succeed({ readable, writable }),
        { closeCodeIsError: () => false }
      )
      yield* socket.writer.pipe(
        Effect.tap((write) => write("Hello").pipe(Effect.andThen(write("World")))),
        Effect.scoped,
        Effect.forkChild
      )
      const received: Array<string> = []
      yield* socket.run((chunk) =>
        Effect.sync(() => {
          received.push(decoder.decode(chunk))
        })
      ).pipe(Effect.scoped)

      assert.deepStrictEqual(chunks, ["Hello", "World"])
      assert.deepStrictEqual(received, ["A", "B", "C"])
    }))
})
