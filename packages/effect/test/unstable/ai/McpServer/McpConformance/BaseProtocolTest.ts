import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { TestClock } from "effect/testing"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import { makeMcpStdioHarness } from "../TestUtils/McpStdioHarness.ts"
import { McpConformance, type McpConformanceLayer } from "./McpConformance.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Base Protocol > General fields", () => {
      // https://modelcontextprotocol.io/specification/2026-07-28/basic#general-fields
      it.effect("should preserve additional result metadata fields when decoding a result", () =>
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

export const statelessModernSuite = (
  protocol: McpProtocol.ProtocolAdapter,
  layer: McpConformanceLayer
) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    const requestMetadata = {
      "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": { name: "stdio-client", version: "1.0.0" }
    }

    describe("Base Protocol > Stateless messages", () => {
      // https://modelcontextprotocol.io/specification/2026-07-28/basic#requests
      it.effect("should preserve string and numeric identifiers when requests succeed", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          for (const id of ["discover-1", 42] as const) {
            const message = yield* fixture.sendRequest("server/discover", {}, id)
            assert.strictEqual(message.id, id)
          }
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#requests
      it.effect("should reject a request when its JSON-RPC version is invalid", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const discovered = yield* test.initialize()
          const response = yield* test.send(discovered, {
            jsonrpc: "1.0",
            id: 2,
            method: "server/discover",
            params: {}
          })
          const message = yield* test.decodeError(response)

          assert.strictEqual(message.id, 2)
          assert.strictEqual(message.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#requests
      it.effect("should reject a request when its identifier is not a string or integer", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const discovered = yield* test.initialize()
          const response = yield* test.send(discovered, {
            jsonrpc: "2.0",
            id: true,
            method: "server/discover",
            params: {}
          })
          const message = yield* test.decodeError(response)

          assert.strictEqual(message.id, null)
          assert.strictEqual(message.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#requests
      it.effect("should return method not found when the requested method is unknown", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          const message = yield* fixture.sendRequest("unknown/method", {}, 3)

          assert.strictEqual(message.id, 3)
          const error = Schema.decodeUnknownSync(McpSchema.McpError)(message.error)
          assert.strictEqual(error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#requests
      it.effect("should return invalid params when request parameters do not match the method schema", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          const message = yield* fixture.sendRequest("tools/list", { cursor: 1 }, 7)

          assert.strictEqual(message.id, 7)
          const error = Schema.decodeUnknownSync(McpSchema.McpError)(message.error)
          assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#notifications
      it.effect("should send no response when an unknown notification is received", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          yield* fixture.sendNotification("unknown/method", {})
          const response = yield* fixture.takeMessage.pipe(Effect.timeoutOption("1 millis"), Effect.forkChild)
          yield* TestClock.adjust("1 millis")

          assert.isTrue(Option.isNone(yield* Fiber.join(response)))
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#notifications
      it.effect("should send no response when notification parameters are invalid", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          yield* fixture.sendNotification("notifications/cancelled", { requestId: true })
          const response = yield* fixture.takeMessage.pipe(Effect.timeoutOption("1 millis"), Effect.forkChild)
          yield* TestClock.adjust("1 millis")

          assert.isTrue(Option.isNone(yield* Fiber.join(response)))
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#responses
      it.effect("should send exactly one result response when a request succeeds", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          yield* fixture.sendRaw({
            jsonrpc: "2.0",
            id: 4,
            method: "server/discover",
            params: { _meta: requestMetadata }
          })
          const message = yield* fixture.takeMessage
          assert.strictEqual(message.id, 4)
          assert.property(message, "result")
          assert.notProperty(message, "error")

          const duplicate = yield* fixture.takeMessage.pipe(Effect.timeoutOption("1 millis"), Effect.forkChild)
          yield* TestClock.adjust("1 millis")
          assert.isTrue(Option.isNone(yield* Fiber.join(duplicate)))
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#responses
      it.effect("should send exactly one error response when a request fails", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol)
          yield* fixture.sendRaw({
            jsonrpc: "2.0",
            id: 8,
            method: "unknown/method",
            params: { _meta: requestMetadata }
          })
          const message = yield* fixture.takeMessage
          assert.strictEqual(message.id, 8)
          assert.property(message, "error")
          assert.notProperty(message, "result")

          const duplicate = yield* fixture.takeMessage.pipe(Effect.timeoutOption("1 millis"), Effect.forkChild)
          yield* TestClock.adjust("1 millis")
          assert.isTrue(Option.isNone(yield* Fiber.join(duplicate)))
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#messages
      it.effect("should return a parse error when a JSON message is malformed", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const discovered = yield* test.initialize()
          const response = yield* test.sendText(discovered, "{")
          const message = yield* test.decodeError(response)

          assert.strictEqual(message.id, null)
          assert.strictEqual(message.error.code, McpSchema.PARSE_ERROR_CODE)
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic#messages
      it.effect("should return invalid request when a JSON-RPC message omits its method", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const discovered = yield* test.initialize()
          const response = yield* test.send(discovered, { jsonrpc: "2.0", id: 10, params: {} })
          const message = yield* test.decodeError(response)

          assert.strictEqual(message.id, 10)
          assert.strictEqual(message.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)
        }))
    })
  })

export const statefulLegacySuite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
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

          it.effect("MUST reject requests with an invalid JSON-RPC version", () =>
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
              assert.strictEqual(message.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)
            }))

          it.effect("MUST return method not found for unknown request methods", () =>
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
              assert.strictEqual(message.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
            }))
          it.effect("MUST return invalid params for request payloads that do not match the method schema", () =>
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
              assert.strictEqual(message.error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
            }))

          it.effect("MUST not reply to unknown notifications", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                method: "unknown/method"
              })

              assert.strictEqual(response.status, 202)
              assert.strictEqual(yield* Effect.promise(() => response.text()), "")
            }))

          it.effect("MUST not reply to notifications with invalid params", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                method: "ping",
                params: "invalid"
              })

              assert.strictEqual(response.status, 202)
              assert.strictEqual(yield* Effect.promise(() => response.text()), "")
            }))

          it.effect("MUST reject requests with invalid identifiers", () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize()
              yield* test.notifyInitialized(initialized)

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: true,
                method: "ping"
              })
              const message = yield* test.decodeError(response)

              assert.strictEqual(message.id, null)
              assert.strictEqual(message.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)
            }))
        })

        describe("Responses", () => {
          it.effect("MUST return exactly one result response for a successful request", () =>
            Effect.gen(function*() {
              const fixture = yield* makeMcpStdioHarness(protocol)
              yield* fixture.initialize()
              yield* fixture.sendRaw({ jsonrpc: "2.0", id: 4, method: "ping" })
              const message = yield* fixture.takeMessage
              assert.strictEqual(message.id, 4)
              assert.deepStrictEqual(message.result, {})

              const duplicate = yield* fixture.takeMessage.pipe(
                Effect.timeoutOption("1 millis"),
                Effect.forkChild
              )
              yield* TestClock.adjust("1 millis")

              assert.isTrue(Option.isNone(yield* Fiber.join(duplicate)))
            }))

          it.effect("MUST return exactly one error response for a failed request", () =>
            Effect.gen(function*() {
              const fixture = yield* makeMcpStdioHarness(protocol)
              yield* fixture.initialize()
              yield* fixture.sendRaw({
                jsonrpc: "2.0",
                id: 8,
                method: "unknown/method"
              })
              const message = yield* fixture.takeMessage
              assert.strictEqual(message.id, 8)
              assert.property(message, "error")
              assert.notProperty(message, "result")

              const duplicate = yield* fixture.takeMessage.pipe(
                Effect.timeoutOption("1 millis"),
                Effect.forkChild
              )
              yield* TestClock.adjust("1 millis")

              assert.isTrue(Option.isNone(yield* Fiber.join(duplicate)))
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

        it.effect("MUST return a parse error for malformed JSON", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const initialized = yield* test.initialize()
            yield* test.notifyInitialized(initialized)

            const response = yield* test.sendText(initialized, "{")
            const message = yield* test.decodeError(response)

            assert.strictEqual(message.id, null)
            assert.strictEqual(message.error.code, McpSchema.PARSE_ERROR_CODE)
          }))

        it.effect("MUST return an invalid request error for malformed JSON-RPC messages", () =>
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
            assert.strictEqual(message.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)
          }))
      })
    })
  })
