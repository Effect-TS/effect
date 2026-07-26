import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import { McpConformanceTest, type TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Utilities", () => {
      describe("Ping", () => {
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/ping
        it.effect("MUST respond to a client ping with an empty result", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.ping(initialized, { id: 42 })
            const message = yield* test.decodeResult(response)

            assert.strictEqual(response.status, 200)
            assert.strictEqual(message.id, 42)
            assert.deepStrictEqual(message.result, {})
          }))
      })

      describe("Cancellation", () => {
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/cancellation
        it.effect("MUST not send a response to a cancellation notification", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              params: {
                requestId: "unknown-request",
                reason: "No longer needed"
              }
            })

            assert.strictEqual(response.status, 202)
            assert.strictEqual(yield* Effect.promise(() => response.text()), "")
          }))
        // HARNESS: Requires a deterministically gated in-flight request and an
        // observable server response stream.
        it.skip("SHOULD stop work and suppress the response after cancellation", () => {})
        it.effect("SHOULD ignore cancellation for an unknown request identifier", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              params: { requestId: 999 }
            })

            assert.strictEqual(response.status, 202)
            assert.strictEqual(yield* Effect.promise(() => response.text()), "")
          }))
        it.effect("SHOULD ignore cancellation for an already completed request identifier", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)
            yield* test.ping(initialized, { id: 11 })

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              params: { requestId: 11 }
            })

            assert.strictEqual(response.status, 202)
            assert.strictEqual(yield* Effect.promise(() => response.text()), "")
          }))
      })

      describe("Progress", () => {
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress
        it.effect("MUST accept string progress tokens", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              method: "notifications/progress",
              params: {
                progressToken: "task-1",
                progress: 1
              }
            })

            assert.strictEqual(response.status, 202)
            assert.strictEqual(yield* Effect.promise(() => response.text()), "")
          }))
        it.effect("MUST accept numeric progress tokens", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              method: "notifications/progress",
              params: {
                progressToken: 12,
                progress: 1
              }
            })

            assert.strictEqual(response.status, 202)
            assert.strictEqual(yield* Effect.promise(() => response.text()), "")
          }))
        it.effect("SCHEMA accepts the optional total", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              method: "notifications/progress",
              params: {
                progressToken: "task-with-total",
                progress: 1,
                total: 2
              }
            })

            assert.strictEqual(response.status, 202)
            assert.strictEqual(yield* Effect.promise(() => response.text()), "")
          }))
      })
    })
  })
