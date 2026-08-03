import { OpenAiClient, OpenAiLanguageModel, OpenAiTool } from "@effect/ai-openai"
import type * as Generated from "@effect/ai-openai/Generated"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { LanguageModel, Prompt, Toolkit } from "effect/unstable/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("OpenAiLanguageModel specialized tool output", () => {
  it.effect("emits only the specialized output for apply_patch results", () =>
    Effect.gen(function*() {
      let captured: HttpClientRequest.HttpClientRequest | undefined
      const tool = OpenAiTool.ApplyPatch()
      const toolkit = Toolkit.make(tool)
      yield* LanguageModel.generateText({
        prompt: Prompt.make([
          { role: "user", content: "apply a patch" },
          {
            role: "assistant",
            content: [Prompt.toolCallPart({
              id: "call_1",
              name: "OpenAiApplyPatch",
              params: {
                call_id: "call_1",
                operation: { type: "delete_file", path: "old.ts" }
              },
              providerExecuted: false
            })]
          },
          {
            role: "tool",
            content: [Prompt.toolResultPart({
              id: "call_1",
              name: "OpenAiApplyPatch",
              isFailure: false,
              result: { status: "completed", output: "deleted" }
            })]
          }
        ]),
        toolkit,
        disableToolCallResolution: true
      }).pipe(
        Effect.provide(OpenAiLanguageModel.model("gpt-4o-mini")),
        Effect.provide(makeCaptureLayer((request) => {
          captured = request
        }))
      )

      assert.isDefined(captured)
      const body = yield* requestBody(captured!)
      const outputs = body.input.filter((item: any) => item.call_id === "call_1" && item.type.endsWith("_output"))
      assert.deepStrictEqual(outputs.map((item: any) => item.type), ["apply_patch_call_output"])
    }))
})

const makeCaptureLayer = (capture: (request: HttpClientRequest.HttpClientRequest) => void) =>
  OpenAiClient.layer({ apiKey: Redacted.make("sk-test") }).pipe(
    Layer.provide(Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.makeWith(
        Effect.fnUntraced(function*(requestEffect) {
          const request = yield* requestEffect
          capture(request)
          return HttpClientResponse.fromWeb(
            request,
            new Response(
              JSON.stringify(makeResponse({
                output: [{
                  type: "message",
                  id: "msg_1",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "output_text", text: "ok", annotations: [], logprobs: [] }]
                }]
              })),
              { headers: { "content-type": "application/json" } }
            )
          )
        }),
        Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
      )
    ))
  )

const makeResponse = (overrides: Partial<Generated.Response> = {}): Generated.Response => ({
  id: "resp_1",
  object: "response",
  created_at: 1,
  model: "gpt-4o-mini",
  status: "completed",
  output: [],
  metadata: null,
  temperature: null,
  top_p: null,
  tools: [],
  tool_choice: "auto",
  error: null,
  incomplete_details: null,
  instructions: null,
  parallel_tool_calls: false,
  ...overrides
})

const requestBody = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.sync(() => {
    if (request.body._tag !== "Uint8Array") throw new Error("Expected Uint8Array body")
    return JSON.parse(new TextDecoder().decode(request.body.body))
  })
