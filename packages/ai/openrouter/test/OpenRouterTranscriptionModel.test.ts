import { OpenRouterClient, OpenRouterTranscriptionModel } from "@effect/ai-openrouter"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer, Redacted } from "effect"
import { TranscriptionModel } from "effect/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"

describe("OpenRouterTranscriptionModel", () => {
  it.effect.each([
    { mediaType: "audio/mpeg", data: new Uint8Array([1, 2, 3]), extension: "mp3" },
    { mediaType: "audio/webm;codecs=opus", data: "AQID", extension: "webm" }
  ])("posts $mediaType as JSON and maps the response", ({ mediaType, data, extension }) =>
    Effect.gen(function*() {
      const { request, response } = yield* transcribe({
        audio: { mediaType, data },
        language: "en"
      }, { response_format: "verbose_json", diarize: true })

      assert.strictEqual(request.url, "https://openrouter.ai/api/v1/audio/transcriptions")
      assert.deepStrictEqual(request.body, {
        model: "openai/whisper-large-v3",
        response_format: "verbose_json",
        diarize: true,
        language: "en",
        input_audio: { data: "AQID", format: extension }
      })

      assert.strictEqual(response.text, sttResponse.text)
      assert.strictEqual(response.language, "en")
      assert.deepStrictEqual(response.duration, Duration.seconds(sttResponse.duration))
      assert.deepStrictEqual(response.segments, [{
        text: "Hello, how are you?",
        start: Duration.zero,
        end: Duration.seconds(sttResponse.segments[0].end)
      }])
      assert.deepStrictEqual(response.usage.audioDuration, Duration.seconds(sttResponse.usage.seconds))
      assert.deepStrictEqual(response.metadata.openrouter, {
        cost: 0.000508,
        confidence: 0.94,
        segments: [{ id: 0, start: 0, end: 1.9, text: "Hello, how are you?", speaker: 0, speaker_label: "A" }],
        words: sttResponse.words
      })
    }))

  it.effect("passes a URL on for the provider to download", () =>
    Effect.gen(function*() {
      const { request } = yield* transcribe({
        audio: { mediaType: "audio/wav", data: new URL("https://example.com/meeting.wav") }
      })
      assert.deepStrictEqual(request.body.input_audio, { url: "https://example.com/meeting.wav", format: "wav" })
    }))
})

// Wire fixture, in the shape of OpenRouter's API reference.
const sttResponse = {
  text: "Hello, how are you?",
  language: "en",
  duration: 2.1,
  confidence: 0.94,
  segments: [{ id: 0, start: 0, end: 1.9, text: "Hello, how are you?", speaker: 0, speaker_label: "A" }],
  words: [
    { word: "Hello,", start: 0, end: 0.4, confidence: 0.98, speaker: 0, speaker_label: "A" },
    { word: "how", start: 0.6, end: 0.8, confidence: 0.97, speaker: 0, speaker_label: "A" }
  ],
  usage: { seconds: 2.1, cost: 0.000508 }
}

const transcribe = Effect.fnUntraced(function*(
  options: TranscriptionModel.TranscribeOptions,
  config?: typeof OpenRouterTranscriptionModel.Config.Service
) {
  let request: HttpClientRequest.HttpClientRequest | undefined
  const response = yield* TranscriptionModel.transcribe(options).pipe(
    Effect.provide(OpenRouterTranscriptionModel.layer({ model: "openai/whisper-large-v3", config })),
    Effect.provide(makeClient((_) => {
      request = _
      return Effect.succeed(HttpClientResponse.fromWeb(
        _,
        new Response(JSON.stringify(sttResponse), { status: 200, headers: { "content-type": "application/json" } })
      ))
    }))
  )
  if (request === undefined || request.body._tag !== "Uint8Array") {
    return yield* Effect.die(new Error("Expected a JSON request"))
  }
  return {
    request: { url: request.url, body: JSON.parse(new TextDecoder().decode(request.body.body)) },
    response
  }
})

const makeClient = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>
) =>
  OpenRouterClient.layer({ apiKey: Redacted.make("sk-test-key") }).pipe(
    Layer.provide(Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.makeWith(
        Effect.fnUntraced(function*(requestEffect) {
          return yield* handler(yield* requestEffect)
        }),
        Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
      )
    ))
  )
