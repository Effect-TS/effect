import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import { McpConformance, type McpConformanceLayer } from "./McpConformance.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Base Protocol", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/basic
      describe("Messages", () => {
        describe("Requests", () => {
          it.effect("SCHEMA accepts JSON-RPC 2.0 requests with string identifiers", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: "ping-1",
                method: "ping"
              })
              const message = yield* test.decodeResult(response)

              assert.strictEqual(message.id, "ping-1")
            }))

          it.effect("SCHEMA accepts JSON-RPC 2.0 requests with numeric identifiers", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.ping(initialized, { id: 42 })
              const message = yield* test.decodeResult(response)

              assert.strictEqual(message.id, 42)
            }))

          // FIX: The server currently accepts jsonrpc "1.0" and returns a successful ping result.
          it.effect.skip("MUST reject requests with an invalid JSON-RPC version", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "1.0",
                id: 2,
                method: "ping"
              })
              const message = yield* test.decodeError(response)

              assert.strictEqual(message.id, 2)
              assert.strictEqual(message.error.code, -32600)
            }))

          // FIX: Unknown methods currently return error code 0 instead of JSON-RPC -32601.
          it.effect.skip("MUST return method not found for unknown request methods", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: 3,
                method: "unknown/method"
              })
              const message = yield* test.decodeError(response)

              assert.strictEqual(message.id, 3)
              assert.strictEqual(message.error.code, -32601)
            }))
          // FIX: Invalid method params currently return error code 0 instead of JSON-RPC -32602.
          it.effect.skip("MUST return invalid params for request payloads that do not match the method schema", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: 7,
                method: "ping",
                params: "invalid"
              })
              const message = yield* test.decodeError(response)

              assert.strictEqual(message.id, 7)
              assert.strictEqual(message.error.code, -32602)
            }))
        })

        describe("Responses", () => {
          it.effect("MUST return exactly one result response for a successful request", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.ping(initialized, { id: 4 })
              const raw = yield* Effect.promise<unknown>(() => response.clone().json()).pipe(
                Effect.map(Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown)))
              )
              const message = yield* test.decodeResult(response)

              assert.strictEqual(message.id, 4)
              assert.property(raw, "result")
              assert.notProperty(raw, "error")
            }))

          it.effect("MUST return exactly one error response for a failed request", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: 8,
                method: "unknown/method"
              })
              const raw = yield* Effect.promise<unknown>(() => response.clone().json()).pipe(
                Effect.map(Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown)))
              )
              const message = yield* test.decodeError(response)

              assert.strictEqual(message.id, 8)
              assert.property(raw, "error")
              assert.notProperty(raw, "result")
            }))
          it.effect("SCHEMA preserves the request identifier in result responses", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const message = yield* test.ping(initialized, { id: 5 }).pipe(
                Effect.flatMap(test.decodeResult)
              )

              assert.strictEqual(message.id, 5)
            }))

          it.effect("SCHEMA preserves the request identifier in error responses", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const message = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: "unknown-1",
                method: "unknown/method"
              }).pipe(Effect.flatMap(test.decodeError))

              assert.strictEqual(message.id, "unknown-1")
            }))
          it.effect("MUST not include both result and error in a response", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: 9,
                method: "unknown/method"
              })
              const raw = yield* Effect.promise<unknown>(() => response.json()).pipe(
                Effect.map(Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown)))
              )

              assert.property(raw, "error")
              assert.notProperty(raw, "result")
            }))
        })

        describe("Notifications", () => {
          it.effect("MUST accept notifications without an identifier and send no response", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()

              const response = yield* test.send(initialized, test.initializedNotification)

              assert.strictEqual(response.status, 202)
              assert.strictEqual(yield* Effect.promise(() => response.text()), "")
            }))
        })

        // FIX: Malformed JSON currently becomes an internal -32603 response instead of a -32700 parse error with a null id.
        it.effect.skip("MUST return a parse error for malformed JSON", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.sendText(initialized, "{")
            const message = yield* test.decodeError(response)

            assert.strictEqual(message.id, null)
            assert.strictEqual(message.error.code, -32700)
          }))

        // FIX: A JSON-RPC object without a method currently receives an empty response instead of error -32600.
        it.effect.skip("MUST return an invalid request error for malformed JSON-RPC messages", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 10
            })
            const message = yield* test.decodeError(response)

            assert.strictEqual(message.id, 10)
            assert.strictEqual(message.error.code, -32600)
          }))
      })

      describe("General fields", () => {
        it.effect("SCHEMA preserves additional result metadata fields", () =>
          Effect.gen(function*() {
            const result = yield* Schema.decodeUnknownEffect(McpSchema.ReadResourceResult)({
              contents: [],
              _meta: {
                "example/conformance": {
                  enabled: true,
                  labels: ["one", "two"]
                }
              }
            })

            assert.deepStrictEqual(result._meta, {
              "example/conformance": {
                enabled: true,
                labels: ["one", "two"]
              }
            })
          }))
      })
    })
  })
