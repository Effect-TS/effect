import * as OpenAiClientGenerated from "@effect/ai-openai/OpenAiClientGenerated"
import * as OpenAiConfig from "@effect/ai-openai/OpenAiConfig"
import * as OpenAiSpeechModel from "@effect/ai-openai/OpenAiSpeechModel"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import * as SpeechModel from "effect/ai/SpeechModel"
import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http"

describe("OpenAiSpeechModel", () => {
  it.effect("collects audio bytes and sends configured credentials and overrides", () =>
    Effect.gen(function*() {
      let request: HttpClientRequest.HttpClientRequest | undefined
      const response = yield* SpeechModel.generateSpeech({ text: "Hello", voice: "coral" }).pipe(
        OpenAiSpeechModel.withConfigOverride({ model: "override", response_format: "wav", voice: "nova" }),
        OpenAiConfig.withClientTransform(HttpClient.mapRequest(HttpClientRequest.setHeader("x-speech-test", "scoped"))),
        Effect.provide(OpenAiSpeechModel.layer({ model: "base", config: { response_format: "mp3" } })),
        Effect.provide(clientLayer((req) => {
          request = req
          return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/wav" } })
        }))
      )
      assert.deepStrictEqual(response.audio, new Uint8Array([1, 2, 3]))
      assert.strictEqual(response.mediaType, "audio/wav")
      assert.isDefined(request)
      if (request === undefined) return
      assert.strictEqual(request.url, "https://audio.example.test/v1/audio/speech")
      assert.strictEqual(request.headers.authorization, "Bearer test-key")
      assert.strictEqual(request.headers["x-speech-test"], "scoped")
      assert.deepStrictEqual(requestJson(request), {
        model: "override",
        voice: "coral",
        response_format: "wav",
        input: "Hello",
        stream_format: "audio"
      })
    }))

  it.effect("streams split PCM samples without buffering or adding alignment bytes", () =>
    Effect.gen(function*() {
      let requests = 0
      let cancelled = false
      const stream = SpeechModel.streamSpeech({ text: "Hello" })
      assert.strictEqual(requests, 0)
      const parts = yield* Stream.runCollect(stream.pipe(Stream.take(3))).pipe(
        Effect.provide(OpenAiSpeechModel.layer({ model: "gpt-4o-mini-tts", config: { response_format: "pcm" } })),
        Effect.provide(clientLayer(() => {
          requests++
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array([1]))
                controller.enqueue(new Uint8Array([2, 3]))
                // Leave the response open: incremental consumption must still finish.
              },
              cancel() {
                cancelled = true
              }
            })
          )
        }))
      )
      assert.strictEqual(requests, 1)
      assert.strictEqual(cancelled, true)
      assert.deepStrictEqual(parts, [
        { type: "speech-start", mediaType: "audio/pcm; rate=24000; channels=1; encoding=pcm_s16le" },
        { type: "speech-delta", delta: new Uint8Array([1]) },
        { type: "speech-delta", delta: new Uint8Array([2, 3]) }
      ])
    }))

  it.effect("emits one terminal event after successful audio streaming", () =>
    Effect.gen(function*() {
      const parts = yield* Stream.runCollect(SpeechModel.streamSpeech({ text: "Hello" })).pipe(
        Effect.provide(OpenAiSpeechModel.model("gpt-4o-mini-tts")),
        Effect.provide(clientLayer(() => new Response(new Uint8Array([4, 5]))))
      )
      assert.deepStrictEqual(parts, [
        { type: "speech-start", mediaType: "audio/mpeg" },
        { type: "speech-delta", delta: new Uint8Array([4, 5]) },
        { type: "speech-end" }
      ])
    }))

  it.effect("maps HTTP rate limits using the shared OpenAI error mapping", () =>
    Effect.gen(function*() {
      const error = yield* SpeechModel.generateSpeech({ text: "Hello" }).pipe(
        Effect.flip,
        Effect.provide(OpenAiSpeechModel.layer({ model: "gpt-4o-mini-tts" })),
        Effect.provide(clientLayer(() =>
          new Response(
            JSON.stringify({
              error: { message: "Slow down", type: "rate_limit_error", code: "rate_limit_exceeded" }
            }),
            { status: 429, headers: { "content-type": "application/json", "retry-after": "2" } }
          )
        ))
      )
      assert.strictEqual(error._tag, "AiError")
      assert.strictEqual(error.reason._tag, "RateLimitError")
    }))

  it.effect("propagates streaming errors without emitting successful completion", () =>
    Effect.gen(function*() {
      const seen: Array<SpeechModel.StreamPart> = []
      const error = yield* Stream.runCollect(
        SpeechModel.streamSpeech({ text: "Hello" }).pipe(
          Stream.tap((part) => Effect.sync(() => seen.push(part)))
        )
      ).pipe(
        Effect.flip,
        Effect.provide(OpenAiSpeechModel.layer({ model: "gpt-4o-mini-tts" })),
        Effect.provide(clientLayer(() =>
          new Response(
            JSON.stringify({
              error: { message: "Unavailable", type: "server_error", code: null }
            }),
            { status: 503, headers: { "content-type": "application/json" } }
          )
        ))
      )
      assert.strictEqual(error.reason._tag, "InternalProviderError")
      assert.strictEqual(error.method, "streamSpeech")
      assert.deepStrictEqual(seen, [{ type: "speech-start", mediaType: "audio/mpeg" }])
    }))
})

const clientLayer = (respond: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  OpenAiClientGenerated.layer({ apiKey: Redacted.make("test-key"), apiUrl: "https://audio.example.test/v1" }).pipe(
    Layer.provide(Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.makeWith(
        Effect.fnUntraced(function*(requestEffect) {
          const request = yield* requestEffect
          return HttpClientResponse.fromWeb(request, respond(request))
        }),
        Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
      )
    ))
  )

const requestJson = (request: HttpClientRequest.HttpClientRequest): unknown => {
  assert.strictEqual(request.body._tag, "Uint8Array")
  return request.body._tag === "Uint8Array" ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined
}
