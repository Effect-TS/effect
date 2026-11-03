import * as LanguageModel from "@effect/ai/LanguageModel"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Generated from "../src/Generated.js"
import { OpenAiClient } from "../src/OpenAiClient.js"
import * as OpenAiLanguageModel from "../src/OpenAiLanguageModel.js"

const message = (phase: string, text: string) => ({
  type: "message",
  id: `msg_${phase}`,
  role: "assistant",
  status: "completed",
  phase,
  content: [{ type: "output_text", text, annotations: [] }]
})

const layerWithCommentary = (finalAnswer: string) =>
  OpenAiLanguageModel.layer({ model: "gpt-5.6" }).pipe(
    Layer.provide(Layer.succeed(OpenAiClient, {
      client: null as any,
      streamRequest: null as any,
      createResponse: () =>
        Effect.succeed(
          Schema.decodeUnknownSync(Generated.Response)({
            id: "resp_1",
            object: "response",
            created_at: 1,
            model: "gpt-5.6",
            output: [message("commentary", "Thinking. "), message("final_answer", finalAnswer)],
            parallel_tool_calls: false,
            tool_choice: "auto",
            tools: [],
            error: null,
            incomplete_details: null,
            instructions: null,
            metadata: null,
            temperature: null,
            top_p: null
          })
        ),
      createResponseStream: null as any,
      createEmbedding: null as any
    }))
  )

describe("OpenAiLanguageModel", () => {
  it.effect("generateObject ignores commentary messages", () =>
    Effect.gen(function*() {
      const result = yield* LanguageModel.generateObject({
        prompt: "Give me a person",
        schema: Schema.Struct({ name: Schema.String, age: Schema.Number })
      })
      assert.deepStrictEqual(result.value, { name: "John", age: 30 })
    }).pipe(Effect.provide(layerWithCommentary(`{"name":"John","age":30}`))))

  it.effect("generateText keeps commentary messages", () =>
    Effect.gen(function*() {
      const result = yield* LanguageModel.generateText({ prompt: "Hello" })
      assert.strictEqual(result.text, "Thinking. Hello!")
    }).pipe(Effect.provide(layerWithCommentary("Hello!"))))
})
