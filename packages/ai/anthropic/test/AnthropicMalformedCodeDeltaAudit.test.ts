import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import { LanguageModel } from "effect/unstable/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("AnthropicLanguageModel malformed code delta", () => {
  it.effect("emits valid JSON for streamed code execution parameters", () =>
    Effect.gen(function*() {
      const layer = AnthropicClient.layer({ apiKey: Redacted.make("sk-test-key") }).pipe(
        Layer.provide(Layer.succeed(
          HttpClient.HttpClient,
          makeHttpClient((request) =>
            Effect.succeed(sseResponse(request, [
              {
                type: "message_start",
                message: {
                  id: "msg_1",
                  type: "message",
                  role: "assistant",
                  model: "claude-sonnet-4-20250514",
                  content: [],
                  stop_reason: null,
                  stop_sequence: null,
                  usage: {
                    cache_creation: null,
                    cache_creation_input_tokens: null,
                    cache_read_input_tokens: null,
                    inference_geo: null,
                    input_tokens: 1,
                    output_tokens: 0,
                    service_tier: null
                  }
                }
              },
              {
                type: "content_block_start",
                index: 0,
                content_block: {
                  type: "server_tool_use",
                  id: "srvtoolu_1",
                  name: "bash_code_execution",
                  input: {}
                }
              },
              {
                type: "content_block_delta",
                index: 0,
                delta: {
                  type: "input_json_delta",
                  partial_json: "{\"command\":\"pwd\"}"
                }
              }
            ]))
          )
        ))
      )

      const parts = yield* LanguageModel.streamText({
        prompt: "run pwd",
        disableToolCallResolution: true
      }).pipe(
        Stream.runCollect,
        Effect.provide(AnthropicLanguageModel.model("claude-sonnet-4-20250514")),
        Effect.provide(layer)
      )
      const delta = globalThis.Array.from(parts).find((part) => part.type === "tool-params-delta")
      assert.isDefined(delta)
      if (delta?.type === "tool-params-delta") {
        assert.deepStrictEqual(JSON.parse(delta.delta), {
          type: "bash_code_execution",
          command: "pwd"
        })
      }
    }))
})

const makeHttpClient = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>
) =>
  HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      return yield* handler(yield* requestEffect)
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )

const sseResponse = (request: HttpClientRequest.HttpClientRequest, events: ReadonlyArray<unknown>) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(
      events.map((event) => `event: message_stream\ndata: ${JSON.stringify(event)}\n\n`).join(""),
      { status: 200, headers: { "content-type": "text/event-stream" } }
    )
  )
