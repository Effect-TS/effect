import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import { McpConformance, type McpConformanceLayer } from "./McpConformance.ts"

const SamplingRequest = Schema.Struct({
  messages: Schema.Array(Schema.Struct({
    role: Schema.String,
    content: Schema.Record(Schema.String, Schema.Unknown)
  })),
  modelPreferences: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  systemPrompt: Schema.optionalKey(Schema.String),
  includeContext: Schema.optionalKey(Schema.String),
  maxTokens: Schema.Number,
  stopSequences: Schema.optionalKey(Schema.Array(Schema.String)),
  metadata: Schema.Unknown
})

const decodeSamplingRequest = Schema.decodeUnknownEffect(SamplingRequest)
const decodeSamplingResult = Schema.decodeUnknownEffect(Schema.Struct({
  role: Schema.String,
  content: Schema.Record(Schema.String, Schema.Unknown),
  model: Schema.String,
  stopReason: Schema.optionalKey(Schema.String)
}))

const textResponse = {
  role: "assistant",
  content: { type: "text", text: "sampled" },
  model: "test-model",
  stopReason: "endTurn"
} as const

const samplingRequest = McpSchema.CreateMessage.payloadSchema.make({
  messages: [
    McpSchema.SamplingMessage.make({
      role: "user",
      content: McpSchema.TextContent.make({ text: "sample" })
    })
  ],
  maxTokens: 64,
  metadata: {}
})

const samplingRequestWithOptions = McpSchema.CreateMessage.payloadSchema.make({
  messages: [
    McpSchema.SamplingMessage.make({
      role: "user",
      content: McpSchema.TextContent.make({ text: "first" })
    }),
    McpSchema.SamplingMessage.make({
      role: "assistant",
      content: McpSchema.TextContent.make({ text: "second" })
    })
  ],
  modelPreferences: new McpSchema.ModelPreferences({
    hints: [McpSchema.ModelHint.make({ name: "test-model" })],
    costPriority: 0.2,
    speedPriority: 0.4,
    intelligencePriority: 0.8
  }),
  systemPrompt: "System",
  includeContext: "thisServer",
  maxTokens: 64,
  stopSequences: ["STOP"],
  metadata: { request: "metadata" }
})

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Sampling", () => {
      // Text and image sampling are shared by all three dated specifications.
      // Audio sampling was added in 2025-03-26.
      describe("Capabilities", () => {
        it.effect("MUST send sampling requests when the client advertises sampling", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { sampling: {} },
              handlers: {
                "sampling/createMessage": () => Effect.succeed(textResponse)
              }
            })

            yield* peer.wireClient["sampling/createMessage"](samplingRequest)

            assert.strictEqual((yield* peer.takeRequest).method, "sampling/createMessage")
          }))
      })

      describe("Creating Messages", () => {
        it.effect("MUST preserve message order and sampling request options", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { sampling: {} },
              handlers: {
                "sampling/createMessage": () => Effect.succeed(textResponse)
              }
            })

            yield* peer.wireClient["sampling/createMessage"](samplingRequestWithOptions)
            const recorded = yield* peer.takeRequest
            const payload = yield* decodeSamplingRequest(recorded.payload)

            assert.deepStrictEqual(
              payload.messages.map((message) => ({
                role: message.role,
                text: message.content.text
              })),
              [
                { role: "user", text: "first" },
                { role: "assistant", text: "second" }
              ]
            )
            assert.strictEqual(payload.systemPrompt, "System")
            assert.deepStrictEqual(payload.modelPreferences, {
              hints: [{ name: "test-model" }],
              costPriority: 0.2,
              speedPriority: 0.4,
              intelligencePriority: 0.8
            })
            assert.strictEqual(payload.maxTokens, 64)
            assert.deepStrictEqual(payload.stopSequences, ["STOP"])
            assert.deepStrictEqual(payload.metadata, { request: "metadata" })
            assert.strictEqual(payload.includeContext, "thisServer")
          }))

        it.effect("MUST accept and decode text sampling content", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { sampling: {} },
              handlers: {
                "sampling/createMessage": () => Effect.succeed(textResponse)
              }
            })

            const result = yield* peer.wireClient["sampling/createMessage"](samplingRequest).pipe(
              Effect.flatMap(decodeSamplingResult)
            )

            assert.strictEqual(result.role, "assistant")
            assert.strictEqual(result.model, "test-model")
            assert.strictEqual(result.stopReason, "endTurn")
            assert.deepStrictEqual(result.content, {
              type: "text",
              text: "sampled"
            })
          }))

        it.effect("MUST accept image sampling content", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { sampling: {} },
              handlers: {
                "sampling/createMessage": () =>
                  Effect.succeed({
                    role: "assistant",
                    content: {
                      type: "image",
                      data: "AQID",
                      mimeType: "image/png"
                    },
                    model: "vision-model"
                  })
              }
            })

            const result = yield* peer.wireClient["sampling/createMessage"](samplingRequest).pipe(
              Effect.flatMap(decodeSamplingResult)
            )

            assert.deepStrictEqual(result.content, {
              type: "image",
              data: "AQID",
              mimeType: "image/png"
            })
          }))

        it.effect.skipIf(["2024-11-05"].includes(protocol.protocolVersion))(
          "MUST accept audio sampling content",
          () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const peer = yield* test.makePeer({
                capabilities: { sampling: {} },
                handlers: {
                  "sampling/createMessage": () =>
                    Effect.succeed({
                      role: "assistant",
                      content: {
                        type: "audio",
                        data: "BAUG",
                        mimeType: "audio/wav"
                      },
                      model: "audio-model"
                    })
                }
              })

              const result = yield* peer.wireClient["sampling/createMessage"](samplingRequest).pipe(
                Effect.flatMap(decodeSamplingResult)
              )

              assert.deepStrictEqual(result.content, {
                type: "audio",
                data: "BAUG",
                mimeType: "audio/wav"
              })
            })
        )

        it.effect("MUST surface sampling errors returned by the client", () =>
          Effect.gen(function*() {
            const test = yield* McpConformance
            const peer = yield* test.makePeer({
              capabilities: { sampling: {} },
              handlers: {
                "sampling/createMessage": () =>
                  Effect.fail(
                    new McpSchema.InternalError({
                      message: "Sampling failed"
                    })
                  )
              }
            })

            const error = yield* peer.wireClient["sampling/createMessage"](samplingRequest).pipe(Effect.flip)

            assert.isTrue("code" in error)
            if ("code" in error) assert.strictEqual(error.code, McpSchema.INTERNAL_ERROR_CODE)
            assert.strictEqual(error.message, "Sampling failed")
          }))
      })
    })
  })
