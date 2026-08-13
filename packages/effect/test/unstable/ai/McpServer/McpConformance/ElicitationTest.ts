import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import { McpConformance, type McpConformanceLayer } from "./McpConformance.ts"
import type { McpTestPeer } from "./McpTestPeer.ts"

const ElicitationRequest = Schema.Struct({
  message: Schema.String,
  requestedSchema: Schema.Record(Schema.String, Schema.Unknown)
})

const decodeElicitationRequest = Schema.decodeUnknownEffect(ElicitationRequest)

const request = {
  message: "Please provide your profile",
  requestedSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        title: "Name"
      },
      age: {
        type: "integer",
        minimum: 0
      },
      subscribed: {
        type: "boolean",
        default: false
      }
    },
    required: ["name"]
  }
} as const

const runElicitation = <S extends Schema.ConstraintEncoder<Record<string, unknown>, unknown>>(
  client: McpTestPeer["reverseClient"],
  protocolVersion: McpProtocol.ProtocolVersion,
  schema: S
) =>
  McpServer.elicit({
    message: request.message,
    schema
  }).pipe(
    Effect.provideService(
      McpSchema.McpServerClient,
      McpSchema.McpServerClient.of({
        clientId: 1,
        protocolVersion,
        clientCapabilities: { elicitation: {} },
        clientInfo: {
          name: "McpConformancePeer",
          version: "1.0.0"
        },
        initializePayload: {
          protocolVersion,
          capabilities: { elicitation: {} },
          clientInfo: {
            name: "McpConformancePeer",
            version: "1.0.0"
          }
        },
        getClient: Effect.succeed(client)
      })
    )
  )

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Elicitation", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation
      describe("Capabilities", () => {
        it.effect("MUST send elicitation requests when the client advertises elicitation", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { elicitation: {} },
              handlers: {
                "elicitation/create": () =>
                  Effect.succeed({
                    action: "accept",
                    content: { name: "Ada" }
                  })
              }
            })

            yield* peer.wireClient["elicitation/create"](request)

            assert.strictEqual((yield* peer.takeRequest).method, "elicitation/create")
          }))
      })

      describe("Form Mode", () => {
        it.effect("MUST send the message and requested primitive form schema", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { elicitation: {} },
              handlers: {
                "elicitation/create": () =>
                  Effect.succeed({
                    action: "accept",
                    content: { name: "Ada", age: 37, subscribed: true }
                  })
              }
            })

            const result = yield* peer.wireClient["elicitation/create"](request)
            const recorded = yield* peer.takeRequest
            const payload = yield* decodeElicitationRequest(recorded.payload)

            assert.strictEqual(payload.message, request.message)
            assert.deepStrictEqual(payload.requestedSchema, request.requestedSchema)
            assert.strictEqual(result.action, "accept")
            if (result.action === "accept") {
              assert.deepStrictEqual(result.content, {
                name: "Ada",
                age: 37,
                subscribed: true
              })
            }
          }))

        it.effect("MUST decode accepted content against the requested schema", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { elicitation: {} },
              handlers: {
                "elicitation/create": () =>
                  Effect.succeed({
                    action: "accept",
                    content: { name: "Ada", age: "37" }
                  })
              }
            })

            const result = yield* runElicitation(
              peer.reverseClient,
              protocol.protocolVersion,
              Schema.Struct({
                name: Schema.String,
                age: Schema.NumberFromString
              })
            )

            assert.deepStrictEqual(result, { name: "Ada", age: 37 })
          }))

        it.effect("SCENARIO returns a typed failure when the user declines", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { elicitation: {} },
              handlers: {
                "elicitation/create": () => Effect.succeed({ action: "decline" })
              }
            })

            const error = yield* runElicitation(
              peer.reverseClient,
              protocol.protocolVersion,
              Schema.Struct({ name: Schema.String })
            ).pipe(Effect.flip)

            assert.instanceOf(error, McpSchema.ElicitationDeclined)
          }))

        it.effect("SCENARIO interrupts the operation when the user cancels", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { elicitation: {} },
              handlers: {
                "elicitation/create": () => Effect.succeed({ action: "cancel" })
              }
            })

            const exit = yield* Effect.exit(runElicitation(
              peer.reverseClient,
              protocol.protocolVersion,
              Schema.Struct({ name: Schema.String })
            ))

            assert.isTrue(Exit.isFailure(exit))
            if (Exit.isFailure(exit)) {
              assert.isTrue(Cause.hasInterrupts(exit.cause))
            }
          }))

        it.effect("MUST reject accepted content that does not match the requested schema", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { elicitation: {} },
              handlers: {
                "elicitation/create": () =>
                  Effect.succeed({
                    action: "accept",
                    content: { name: 123 }
                  })
              }
            })

            const exit = yield* Effect.exit(runElicitation(
              peer.reverseClient,
              protocol.protocolVersion,
              Schema.Struct({ name: Schema.String })
            ))

            assert.isTrue(Exit.isFailure(exit))
            if (Exit.isFailure(exit)) {
              assert.isTrue(Cause.hasDies(exit.cause))
            }
          }))
      })
    })
  })
