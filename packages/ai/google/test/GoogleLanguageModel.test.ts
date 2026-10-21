import * as LanguageModel from "@effect/ai/LanguageModel"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Generated from "../src/Generated.js"
import { GenerateContentResponse } from "../src/Generated.js"
import { GoogleClient } from "../src/GoogleClient.js"
import * as GoogleLanguageModel from "../src/GoogleLanguageModel.js"

const textResponse = Schema.decodeUnknownSync(GenerateContentResponse)({
  candidates: [{
    content: { role: "model", parts: [{ text: "ok" }] },
    finishReason: "STOP"
  }]
})

const encodeToolResult = (result: unknown) =>
  Effect.gen(function*() {
    const captured: Array<typeof Generated.GenerateContentRequest.Encoded> = []
    yield* LanguageModel.generateText({
      prompt: [{
        role: "tool",
        content: [{
          type: "tool-result",
          id: "call_1",
          name: "tool",
          isFailure: false,
          providerExecuted: false,
          result
        }]
      }]
    }).pipe(
      Effect.provide(GoogleLanguageModel.layer({ model: "gemini-2.5-flash" })),
      Effect.provide(Layer.succeed(GoogleClient, {
        client: null as any,
        streamRequest: null as any,
        generateContent: (request) =>
          Effect.sync(() => {
            captured.push(request)
            return textResponse
          }),
        generateContentStream: null as any
      }))
    )
    return captured[0].contents[0].parts![0].functionResponse!.response
  })

describe("GoogleLanguageModel", () => {
  it.effect("wraps non-object tool results in an object", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* encodeToolResult("3:00 PM"), { result: "3:00 PM" })
      assert.deepStrictEqual(yield* encodeToolResult(null), { result: null })
      assert.deepStrictEqual(yield* encodeToolResult(["a", "b"]), { result: ["a", "b"] })
    }))

  it.effect("passes object tool results through unchanged", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* encodeToolResult({ temperature: 22 }), { temperature: 22 })
    }))
})
