import type * as Generated from "@effect/ai-openai/Generated"
import * as OpenAiClient from "@effect/ai-openai/OpenAiClient"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import type * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"

describe("OpenAiClient failed stream termination", () => {
  it.live("terminates an SSE stream at response.failed", () =>
    Effect.gen(function*() {
      const event = {
        type: "response.failed",
        sequence_number: 1,
        response: makeResponse({ status: "failed" })
      }
      const bytes = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
      const httpClient = makeHttpClient((request) => {
        const response = HttpClientResponse.fromWeb(
          request,
          new Response(null, {
            status: 200,
            headers: { "content-type": "text/event-stream" }
          })
        )
        const stream = Stream.concat(Stream.succeed(bytes), Stream.never)
        return Effect.succeed(
          new Proxy(response, {
            get(target, property) {
              if (property === "stream") return stream
              const value = Reflect.get(target, property, target)
              return typeof value === "function" ? value.bind(target) : value
            }
          })
        )
      })
      const layer = OpenAiClient.layer({ apiKey: Redacted.make("sk-test") }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
      )
      const result = yield* Effect.gen(function*() {
        const client = yield* OpenAiClient.OpenAiClient
        const [, stream] = yield* client.createResponseStream({ model: "gpt-4o", input: "test" })
        return yield* Stream.runCollect(stream)
      }).pipe(Effect.provide(layer), Effect.timeoutOption("100 millis"))

      assert.strictEqual(result._tag, "Some")
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

const makeResponse = (
  overrides: Partial<typeof Generated.Response.Encoded> = {}
): typeof Generated.Response.Encoded => ({
  id: "resp_1",
  object: "response",
  created_at: 1,
  model: "gpt-4o",
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
