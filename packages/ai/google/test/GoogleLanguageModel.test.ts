import * as LanguageModel from "@effect/ai/LanguageModel"
import type * as Prompt from "@effect/ai/Prompt"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Generated from "../src/Generated.js"
import { GenerateContentResponse } from "../src/Generated.js"
import { GoogleClient } from "../src/GoogleClient.js"
import * as GoogleLanguageModel from "../src/GoogleLanguageModel.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const decodeResponse = Schema.decodeUnknownSync(GenerateContentResponse)

const textResponse = () =>
  decodeResponse({
    candidates: [{
      content: { role: "model", parts: [{ text: "ok" }] },
      finishReason: "STOP"
    }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
  })

const makeCapturingLayer = (
  captured: Array<typeof Generated.GenerateContentRequest.Encoded>
) =>
  GoogleLanguageModel.layer({ model: "gemini-2.5-flash" }).pipe(
    Layer.provide(
      Layer.succeed(GoogleClient, {
        client: null as any,
        streamRequest: null as any,
        generateContent: (request) =>
          Effect.sync(() => {
            captured.push(request)
            return textResponse()
          }),
        generateContentStream: null as any
      })
    )
  )

const toolResultPrompt = (result: unknown): Prompt.RawInput => [
  {
    role: "tool",
    content: [{
      type: "tool-result",
      id: "call_1",
      name: "get_time",
      isFailure: false,
      result,
      providerExecuted: false
    }]
  }
]

const capturedFunctionResponse = (
  captured: Array<typeof Generated.GenerateContentRequest.Encoded>
) => {
  assert.strictEqual(captured.length, 1)
  const parts = captured[0].contents[0]?.parts
  assert.isDefined(parts)
  const functionResponse = (parts![0] as any).functionResponse
  assert.isDefined(functionResponse)
  return functionResponse
}

// ---------------------------------------------------------------------------
// prepareMessages — Gemini requires `functionResponse.response` to be a JSON
// object (protobuf Struct); primitive / array / null results must be wrapped
// or the API rejects the request with INVALID_ARGUMENT
// ---------------------------------------------------------------------------

describe("GoogleLanguageModel", () => {
  describe("prepareMessages / tool results", () => {
    it.effect("wraps a string tool result in an object", () =>
      Effect.gen(function*() {
        const captured: Array<typeof Generated.GenerateContentRequest.Encoded> = []

        yield* LanguageModel.generateText({ prompt: toolResultPrompt("3:00 PM") }).pipe(
          Effect.provide(makeCapturingLayer(captured))
        )

        const functionResponse = capturedFunctionResponse(captured)
        assert.strictEqual(functionResponse.id, "call_1")
        assert.strictEqual(functionResponse.name, "get_time")
        assert.deepStrictEqual(functionResponse.response, { result: "3:00 PM" })
      }))

    it.effect("wraps number, boolean, and null tool results in an object", () =>
      Effect.gen(function*() {
        for (const result of [42, true, null]) {
          const captured: Array<typeof Generated.GenerateContentRequest.Encoded> = []

          yield* LanguageModel.generateText({ prompt: toolResultPrompt(result) }).pipe(
            Effect.provide(makeCapturingLayer(captured))
          )

          assert.deepStrictEqual(capturedFunctionResponse(captured).response, { result })
        }
      }))

    it.effect("wraps an array tool result in an object", () =>
      Effect.gen(function*() {
        const captured: Array<typeof Generated.GenerateContentRequest.Encoded> = []

        yield* LanguageModel.generateText({ prompt: toolResultPrompt(["a", "b"]) }).pipe(
          Effect.provide(makeCapturingLayer(captured))
        )

        assert.deepStrictEqual(capturedFunctionResponse(captured).response, { result: ["a", "b"] })
      }))

    it.effect("passes object tool results through unchanged", () =>
      Effect.gen(function*() {
        const captured: Array<typeof Generated.GenerateContentRequest.Encoded> = []
        const result = { temperature: 22, condition: "sunny" }

        yield* LanguageModel.generateText({ prompt: toolResultPrompt(result) }).pipe(
          Effect.provide(makeCapturingLayer(captured))
        )

        assert.deepStrictEqual(capturedFunctionResponse(captured).response, result)
      }))
  })
})
