import * as LanguageModel from "@effect/ai/LanguageModel"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Generated from "../src/Generated.js"
import { OpenAiClient } from "../src/OpenAiClient.js"
import * as OpenAiLanguageModel from "../src/OpenAiLanguageModel.js"

const responseWithCommentary = (finalAnswer: string) =>
  Schema.decodeUnknownSync(Generated.Response)({
    id: "resp_123",
    object: "response",
    created_at: 1,
    model: "gpt-5.6",
    status: "completed",
    output: [
      makeTextOutput({ id: "msg_commentary", text: "Thinking. ", phase: "commentary" }),
      makeTextOutput({ id: "msg_final", text: finalAnswer, phase: "final_answer" })
    ],
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

const makeTextOutput = (options: { readonly id: string; readonly text: string; readonly phase: string }) => ({
  type: "message",
  id: options.id,
  role: "assistant",
  status: "completed",
  phase: options.phase,
  content: [{ type: "output_text", text: options.text, annotations: [] }]
})

const makeClientLayer = (response: Generated.Response) =>
  Layer.succeed(OpenAiClient, {
    client: null as any,
    streamRequest: null as any,
    createResponse: () => Effect.succeed(response),
    createResponseStream: null as any,
    createEmbedding: null as any
  })

describe("OpenAiLanguageModel", () => {
  it.effect("ignores commentary messages for structured output", () =>
    Effect.gen(function*() {
      const result = yield* LanguageModel.generateObject({
        prompt: "Give me a person",
        schema: Schema.Struct({ name: Schema.String, age: Schema.Number })
      })

      assert.deepStrictEqual(result.value, { name: "John", age: 30 })
    }).pipe(
      Effect.provide(OpenAiLanguageModel.layer({ model: "gpt-5.6" })),
      Effect.provide(makeClientLayer(responseWithCommentary(JSON.stringify({ name: "John", age: 30 }))))
    ))

  it.effect("keeps commentary messages for text output", () =>
    Effect.gen(function*() {
      const result = yield* LanguageModel.generateText({ prompt: "Hello" })

      assert.strictEqual(result.text, "Thinking. Hello!")
    }).pipe(
      Effect.provide(OpenAiLanguageModel.layer({ model: "gpt-5.6" })),
      Effect.provide(makeClientLayer(responseWithCommentary("Hello!")))
    ))
})
