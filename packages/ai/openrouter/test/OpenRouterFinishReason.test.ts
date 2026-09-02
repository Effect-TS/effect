import { Generated, OpenRouterClient, OpenRouterLanguageModel } from "@effect/ai-openrouter"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema, Stream } from "effect"
import { type AiError, LanguageModel, type Response, Tool, Toolkit } from "effect/unstable/ai"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("OpenRouter finish reason", () => {
  for (
    const { encrypted, mode, reason, tool, wireReason } of [
      { mode: "stream", encrypted: true, tool: true, wireReason: "stop", reason: "tool-calls" },
      { mode: "stream", encrypted: true, tool: true, wireReason: "tool_calls", reason: "tool-calls" },
      { mode: "stream", encrypted: false, tool: true, wireReason: "stop", reason: "stop" },
      { mode: "stream", encrypted: true, tool: false, wireReason: "stop", reason: "stop" },
      { mode: "stream", encrypted: false, tool: false, wireReason: "stop", reason: "stop" },
      { mode: "generate", encrypted: true, tool: true, wireReason: "stop", reason: "tool-calls" }
    ] as const
  ) {
    it.effect(`${mode}: encrypted=${encrypted}, tool=${tool}, ${wireReason} becomes ${reason}`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(Tool.make("ProbeTool", {
          parameters: Schema.Struct({ value: Schema.Number }),
          success: Schema.String
        }))
        const reasoningDetails = encrypted
          ? [{ type: "reasoning.encrypted", data: "opaque-signature", format: "unknown" } as const]
          : []
        const toolCalls = tool
          ? [{
            index: 0,
            id: "call-1",
            type: "function" as const,
            function: { name: "ProbeTool", arguments: "{\"value\":1}" }
          }]
          : []
        const metadata = {
          id: "response-1",
          model: "fictional/reasoning-model",
          created: 1
        }
        const usage = { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        const chunks = yield* Schema.decodeUnknownEffect(Schema.Array(Generated.ChatStreamChunk))([
          {
            ...metadata,
            object: "chat.completion.chunk",
            choices: [{ index: 0, delta: { reasoning_details: reasoningDetails, tool_calls: toolCalls } }]
          },
          {
            ...metadata,
            object: "chat.completion.chunk",
            choices: [{ index: 0, delta: {}, finish_reason: wireReason }],
            usage
          }
        ])
        const body = yield* Schema.decodeUnknownEffect(Generated.SendChatCompletionRequest200)({
          ...metadata,
          object: "chat.completion",
          system_fingerprint: null,
          choices: [{
            index: 0,
            finish_reason: wireReason,
            message: { role: "assistant", reasoning_details: reasoningDetails, tool_calls: toolCalls }
          }],
          usage
        })
        const response = HttpClientResponse.fromWeb(
          HttpClientRequest.post("https://example.com/chat/completions"),
          new globalThis.Response()
        )
        let requests = 0
        let handlerCalls = 0
        const client = OpenRouterClient.OpenRouterClient.of({
          client: Generated.make(HttpClient.make(() => Effect.die("Unexpected HTTP request"))),
          createChatCompletion: () =>
            Effect.sync(() => {
              requests++
              return [body, response]
            }),
          createChatCompletionStream: () =>
            Effect.sync(() => {
              requests++
              return [response, Stream.fromIterable(chunks)]
            })
        })
        const options = { prompt: "Use the probe tool", toolkit, disableToolCallResolution: true } as const
        const operation: Effect.Effect<Array<Response.AnyPart>, AiError.AiError, LanguageModel.LanguageModel> =
          mode === "stream"
            ? LanguageModel.streamText(options).pipe(Stream.runCollect)
            : LanguageModel.generateText(options).pipe(Effect.map((result) => result.content))
        const parts = yield* operation.pipe(
          Effect.provide(OpenRouterLanguageModel.model(metadata.model)),
          Effect.provide(toolkit.toLayer({
            ProbeTool: () =>
              Effect.sync(() => {
                handlerCalls++
                return "ok"
              })
          })),
          Effect.provideService(OpenRouterClient.OpenRouterClient, client)
        )

        assert.strictEqual(requests, 1)
        assert.strictEqual(handlerCalls, 0)
        assert.deepStrictEqual(
          parts.filter((part) => part.type === "tool-call").map(({ id, name, params }) => ({ id, name, params })),
          tool ? [{ id: "call-1", name: "ProbeTool", params: { value: 1 } }] : []
        )
        assert.deepStrictEqual(parts.filter((part) => part.type === "finish").map((part) => part.reason), [reason])
      }))
  }
})
