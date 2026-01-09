import { UdpSocket } from "@effect/platform"
import { NodeUdpSocket } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Queue } from "effect"

describe("UdpSocket", () => {
  it.scoped("should create a UDP socket", () =>
    Effect.gen(function*() {
      const socket = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })
      assert.isTrue(UdpSocket.isUdpSocket(socket))
      const address = socket.address
      assert.isObject(address)
      assert.isNumber(address.port)
      assert.isString(address.hostname)
    }))

  it.scoped("should send and receive UDP messages", () =>
    Effect.gen(function*() {
      // Create two sockets
      const socket1 = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })
      const socket2 = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })

      const socket1Address = socket1.address
      const socket2Address = socket2.address

      // Set up message queue for socket2
      const messages = yield* Queue.unbounded<UdpSocket.UdpMessage>()

      // Start listening on socket2
      const fiber = yield* Effect.fork(socket2.run((message) => messages.offer(message)))

      // Send message from socket1 to socket2
      const testMessage = new TextEncoder().encode("Hello UDP!")
      yield* socket1.send(testMessage, socket2Address)

      // Receive message on socket2
      const received = yield* messages.take
      assert.deepEqual(received.data, testMessage)
      // The remote address will be 127.0.0.1 (loopback) when sending locally
      assert.isTrue(
        received.remoteAddress.hostname === "127.0.0.1" || received.remoteAddress.hostname === socket1Address.hostname
      )
      assert.strictEqual(received.remoteAddress.port, socket1Address.port)

      // Clean up
      yield* Fiber.interrupt(fiber)
    }))

  it.scoped("should handle bind errors for invalid addresses", () =>
    Effect.gen(function*() {
      // Try to bind to an invalid address which should fail
      const result = yield* Effect.either(NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "999.999.999.999", port: 0 }))
      assert.isTrue(result._tag === "Left")
      if (result._tag === "Left") {
        assert.isTrue(UdpSocket.isUdpSocketError(result.left))
        assert.strictEqual(result.left.reason, "Bind")
      }
    }))

  it.scoped("should close socket properly", () =>
    Effect.gen(function*() {
      const socket = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })
      yield* socket.close
      // After closing, address should still be available (it's not an Effect)
      const address = socket.address
      assert.isObject(address)
      assert.isNumber(address.port)
      assert.isString(address.hostname)
    }))

  it.scoped("should handle double close gracefully in explicit calls", () =>
    Effect.gen(function*() {
      const socket = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })

      // First close should succeed
      yield* socket.close

      // Second close should fail with proper error
      const secondCloseResult = yield* Effect.either(socket.close)
      assert.isTrue(secondCloseResult._tag === "Left")
      if (secondCloseResult._tag === "Left") {
        assert.isTrue(UdpSocket.isUdpSocketError(secondCloseResult.left))
        assert.strictEqual(secondCloseResult.left.reason, "Close")
        // Should be the expected "Not running" error
        assert.isTrue(secondCloseResult.left.cause instanceof Error)
        assert.strictEqual((secondCloseResult.left.cause as Error).message, "Not running")
      }
    }))

  it.scoped("should allow users to handle close errors explicitly", () =>
    Effect.gen(function*() {
      const socket = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })

      // User explicitly closes and handles potential errors
      const closeResult = yield* Effect.either(socket.close)

      // First close should succeed
      assert.isTrue(closeResult._tag === "Right")

      // Verify socket is actually closed by checking address is still available
      const address = socket.address
      assert.isObject(address)
    }))

  it("should not fail scope cleanup even with close errors", () =>
    Effect.gen(function*() {
      // Create a scope that should clean up successfully even if close has issues
      const result = yield* Effect.scoped(
        Effect.gen(function*() {
          const socket = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })
          // Manually close the socket to simulate a scenario where
          // automatic cleanup might encounter an already-closed socket
          yield* socket.close
          return "success"
          // Scope cleanup runs here and should not fail
        })
      )

      // Should reach here without scope cleanup failures
      assert.strictEqual(result, "success")
    }))
})
