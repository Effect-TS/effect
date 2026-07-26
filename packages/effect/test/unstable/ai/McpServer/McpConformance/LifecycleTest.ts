import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import { McpConformanceTest, type TestLayer } from "./McpConformanceTest.ts"

export const suite = (
  protocol: McpProtocol.ProtocolAdapter,
  layer: TestLayer
) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Lifecycle", () => {
      // Shared lifecycle behavior. Dated transport requirements stay in the
      // version entrypoints that compose this suite.
      describe("Lifecycle Phases", () => {
        describe("Initialization", () => {
          it.effect("MUST requires initialize to be the first request", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const response = yield* test.post(test.pingRequest())

              assert.isAtLeast(response.status, 400)
            }))

          it.effect("MUST rejects initialized notifications before initialize", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const response = yield* test.post(test.initializedNotification)

              assert.isAtLeast(response.status, 400)
            }))

          it.effect("SCHEMA requires protocolVersion, capabilities, and clientInfo", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const invalidParams = [
                {
                  capabilities: {},
                  clientInfo: { name: "McpConformanceClient", version: "1.0.0" }
                },
                {
                  protocolVersion: protocol.protocolVersion,
                  clientInfo: { name: "McpConformanceClient", version: "1.0.0" }
                },
                {
                  protocolVersion: protocol.protocolVersion,
                  capabilities: {}
                }
              ]

              for (let i = 0; i < invalidParams.length; i++) {
                const response = yield* test.post({
                  jsonrpc: "2.0",
                  id: i + 1,
                  method: "initialize",
                  params: invalidParams[i]
                })
                const error = yield* test.decodeError(response)

                assert.strictEqual(error.id, i + 1)
                assert.isNumber(error.error.code)
                assert.isNull(response.headers.get("Mcp-Session-Id"))
              }
            }))

          it.effect("SCHEMA returns server capabilities and implementation information", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const { message, response, sessionId } = yield* test.initialize()

              assert.strictEqual(response.status, 200)
              assert.strictEqual(message.id, 1)
              assert.isObject(message.result.capabilities)
              assert.deepStrictEqual(message.result.serverInfo, test.serverInfo)
              assert.isNotNull(sessionId)
              assert.match(sessionId, /^[\x21-\x7e]+$/)
            }))

          it.effect("MUST accepts initialized after a successful initialize response", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const initialized = yield* test.initialize()
              assert.isNotNull(initialized.sessionId)

              const response = yield* test.notifyInitialized(initialized)

              assert.strictEqual(response.status, 202)
              assert.strictEqual(yield* Effect.promise(() => response.text()), "")
            }))
        })

        describe("Version Negotiation", () => {
          it.effect("MUST echoes a requested version supported by the server", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const { message } = yield* test.initialize()

              assert.strictEqual(message.result.protocolVersion, protocol.protocolVersion)
            }))

          it.effect("MUST negotiates an unsupported requested version to a supported version", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const { message } = yield* test.initialize({
                protocolVersion: "unsupported-version"
              })

              assert.strictEqual(message.result.protocolVersion, protocol.protocolVersion)
            }))
        })

        describe("Capability Negotiation", () => {
          it.effect("SCHEMA advertises the capabilities provided by the server", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const { message } = yield* test.initialize({ server: "features" })

              assert.deepStrictEqual(message.result.capabilities.prompts, { listChanged: true })
              assert.deepStrictEqual(message.result.capabilities.resources, {
                listChanged: true,
                subscribe: false
              })
              assert.deepStrictEqual(message.result.capabilities.tools, { listChanged: true })
            }))
        })

        describe("Operation", () => {
          it.effect("MUST continues to use the version negotiated during initialization", () =>
            Effect.gen(function*() {
              const test = yield* McpConformanceTest
              const initialized = yield* test.initialize()
              assert.isNotNull(initialized.sessionId)

              const response = yield* test.ping(initialized)

              assert.strictEqual(response.status, 200)
              assert.strictEqual(response.headers.get("Mcp-Protocol-Version"), protocol.protocolVersion)
            }))
        })
      })

      describe("Error Handling", () => {
        it.effect("SCENARIO handles protocol version mismatch through version negotiation", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const { message } = yield* test.initialize({
              protocolVersion: "invalid-version"
            })

            assert.strictEqual(message.result.protocolVersion, protocol.protocolVersion)
          }))
      })
    })
  })
