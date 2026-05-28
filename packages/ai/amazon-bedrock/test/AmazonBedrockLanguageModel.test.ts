import * as LanguageModel from "@effect/ai/LanguageModel"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { AmazonBedrockClient } from "../src/AmazonBedrockClient.js"
import * as AmazonBedrockLanguageModel from "../src/AmazonBedrockLanguageModel.js"
import { ConverseResponse } from "../src/AmazonBedrockSchema.js"
import type { ConverseRequest } from "../src/AmazonBedrockSchema.js"

// ---------------------------------------------------------------------------
// Schema decoders
// ---------------------------------------------------------------------------

const decodeConverseResponse = Schema.decodeUnknownSync(ConverseResponse)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TestModel = "us.anthropic.claude-3-5-sonnet-20241022-v2:0" as const
const TestObjectName = "MockResult"
const MockResultSchema = Schema.Struct({ field: Schema.String })

const textResponse = () =>
  decodeConverseResponse({
    output: {
      message: {
        role: "assistant",
        content: [{ text: "hello" }]
      }
    },
    metrics: { latencyMs: 100 },
    stopReason: "end_turn",
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }
  })

const toolUseResponse = (name: string) =>
  decodeConverseResponse({
    output: {
      message: {
        role: "assistant",
        content: [{
          toolUse: {
            toolUseId: "test-id",
            name,
            input: { field: "value" }
          }
        }]
      }
    },
    metrics: { latencyMs: 100 },
    stopReason: "tool_use",
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }
  })

const makeCapturingLayer = (
  captured: Array<typeof ConverseRequest.Encoded>,
  response: ConverseResponse
) =>
  AmazonBedrockLanguageModel.layer({ model: TestModel }).pipe(
    Layer.provide(
      Layer.succeed(AmazonBedrockClient, {
        client: null as any,
        streamRequest: null as any,
        converse: (opts) =>
          Effect.sync(() => {
            captured.push(opts.payload)
            return response
          }),
        converseStream: null as any
      })
    )
  )

// ---------------------------------------------------------------------------
// makeRequest — request construction tests
// ---------------------------------------------------------------------------

describe("AmazonBedrockLanguageModel", () => {
  describe("makeRequest / additionalModelRequestFields", () => {
    it.effect("strips thinking when using generateObject (forced toolChoice.tool)", () =>
      Effect.gen(function*() {
        const captured: Array<typeof ConverseRequest.Encoded> = []

        yield* LanguageModel.generateObject({
          prompt: [],
          schema: MockResultSchema,
          objectName: TestObjectName
        }).pipe(
          AmazonBedrockLanguageModel.withConfigOverride({
            additionalModelRequestFields: {
              thinking: { type: "enabled", budget_tokens: 5000 }
            }
          }),
          Effect.provide(makeCapturingLayer(captured, toolUseResponse(TestObjectName)))
        )

        assert.strictEqual(captured.length, 1)
        const req = captured[0]

        // Must force tool use for generateObject
        assert.deepStrictEqual(req.toolConfig?.toolChoice, { tool: { name: TestObjectName } })

        // Anthropic rejects thinking + forced tool use — must be stripped
        assert.isUndefined(req.additionalModelRequestFields?.["thinking"])
      }))

    it.effect("preserves thinking when using generateText (no forced toolChoice)", () =>
      Effect.gen(function*() {
        const captured: Array<typeof ConverseRequest.Encoded> = []

        yield* LanguageModel.generateText({ prompt: [] }).pipe(
          AmazonBedrockLanguageModel.withConfigOverride({
            additionalModelRequestFields: {
              thinking: { type: "enabled", budget_tokens: 5000 }
            }
          }),
          Effect.provide(makeCapturingLayer(captured, textResponse()))
        )

        assert.strictEqual(captured.length, 1)
        const req = captured[0]

        // thinking must flow through for non-forced-tool-use requests
        assert.deepStrictEqual(req.additionalModelRequestFields?.["thinking"], {
          type: "enabled",
          budget_tokens: 5000
        })
      }))

    it.effect("does not set additionalModelRequestFields when none configured and using generateObject", () =>
      Effect.gen(function*() {
        const captured: Array<typeof ConverseRequest.Encoded> = []

        yield* LanguageModel.generateObject({
          prompt: [],
          schema: MockResultSchema,
          objectName: TestObjectName
        }).pipe(
          Effect.provide(makeCapturingLayer(captured, toolUseResponse(TestObjectName)))
        )

        assert.strictEqual(captured.length, 1)
        // No additionalModelRequestFields should be injected when none was configured
        assert.isUndefined(captured[0].additionalModelRequestFields)
      }))

    it.effect("preserves non-thinking fields in additionalModelRequestFields with generateObject", () =>
      Effect.gen(function*() {
        const captured: Array<typeof ConverseRequest.Encoded> = []

        yield* LanguageModel.generateObject({
          prompt: [],
          schema: MockResultSchema,
          objectName: TestObjectName
        }).pipe(
          AmazonBedrockLanguageModel.withConfigOverride({
            additionalModelRequestFields: {
              thinking: { type: "enabled", budget_tokens: 5000 },
              someOtherField: "preserved"
            }
          }),
          Effect.provide(makeCapturingLayer(captured, toolUseResponse(TestObjectName)))
        )

        assert.strictEqual(captured.length, 1)
        const req = captured[0]

        // thinking stripped, other fields survive
        assert.isUndefined(req.additionalModelRequestFields?.["thinking"])
        assert.strictEqual(req.additionalModelRequestFields?.["someOtherField"], "preserved")
      }))
  })
})
