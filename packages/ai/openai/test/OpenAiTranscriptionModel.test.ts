import * as OpenAiClientGenerated from "@effect/ai-openai/OpenAiClientGenerated"
import * as OpenAiTranscriptionModel from "@effect/ai-openai/OpenAiTranscriptionModel"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import * as TranscriptionModel from "effect/ai/TranscriptionModel"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"

describe("OpenAiTranscriptionModel", () => {
  it.effect("uploads recorded bytes with filename, media type, language and prompt", () =>
    Effect.gen(function*() {
      let request: HttpClientRequest.HttpClientRequest | undefined
      const response = yield* TranscriptionModel.transcribe({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: "audio/wav",
        fileName: "caller.wav",
        language: "en",
        prompt: "Menu names"
      }).pipe(
        OpenAiTranscriptionModel.withConfigOverride({ model: "override", language: "fr", temperature: 0.5 }),
        Effect.provide(OpenAiTranscriptionModel.layer({ model: "base", config: { temperature: 0 } })),
        Effect.provide(clientLayer((req) => {
          request = req
          return json({ text: "Hello", languages: [{ code: "en" }] })
        }))
      )
      assert.strictEqual(response.text, "Hello")
      assert.strictEqual(response.language, "en")
      assert.isDefined(request)
      if (request === undefined) return
      assert.strictEqual(request.url, "https://api.openai.com/v1/audio/transcriptions")
      assert.strictEqual(request.headers.authorization, "Bearer test-key")
      assert.strictEqual(request.body._tag, "FormData")
      if (request.body._tag !== "FormData") return
      const form = request.body.formData
      assert.strictEqual(form.get("model"), "override")
      assert.strictEqual(form.get("language"), "en")
      assert.strictEqual(form.get("prompt"), "Menu names")
      assert.strictEqual(form.get("temperature"), "0.5")
      assert.strictEqual(form.get("response_format"), "json")
      assert.strictEqual(form.get("stream"), "false")
      const file = form.get("file") as File
      assert.strictEqual(file.name, "caller.wav")
      assert.strictEqual(file.type, "audio/wav")
      const bytes = yield* Effect.promise(() => file.arrayBuffer())
      assert.deepStrictEqual(new Uint8Array(bytes), new Uint8Array([1, 2, 3]))
    }))

  it.effect("infers an upload extension without treating input as live microphone audio", () =>
    Effect.gen(function*() {
      let fileName: string | undefined
      const response = yield* TranscriptionModel.transcribe({
        audio: new Uint8Array([1]),
        mediaType: "audio/webm; codecs=opus"
      })
        .pipe(
          Effect.provide(OpenAiTranscriptionModel.model("gpt-4o-mini-transcribe")),
          Effect.provide(clientLayer((request) => {
            if (request.body._tag === "FormData") fileName = (request.body.formData.get("file") as File).name
            return json({ text: "" })
          }))
        )
      assert.strictEqual(fileName, "audio.webm")
      assert.strictEqual(response.text, "")
    }))

  it.effect("maps generated status errors to shared authentication errors", () =>
    Effect.gen(function*() {
      const error = yield* TranscriptionModel.transcribe({ audio: new Uint8Array([1]), mediaType: "audio/wav" }).pipe(
        Effect.flip,
        Effect.provide(OpenAiTranscriptionModel.layer({ model: "whisper-1" })),
        Effect.provide(clientLayer(() =>
          json({
            error: { message: "Invalid API key", type: "invalid_request_error", code: "invalid_api_key", param: null }
          }, 401)
        ))
      )
      assert.strictEqual(error._tag, "AiError")
      assert.strictEqual(error.reason._tag, "AuthenticationError")
    }))

  it.effect("fails malformed provider JSON with an AI decoding error", () =>
    Effect.gen(function*() {
      const error = yield* TranscriptionModel.transcribe({ audio: new Uint8Array([1]), mediaType: "audio/wav" }).pipe(
        Effect.flip,
        Effect.provide(OpenAiTranscriptionModel.layer({ model: "whisper-1" })),
        Effect.provide(clientLayer(() => json({ text: 42 })))
      )
      assert.strictEqual(error.reason._tag, "InvalidResponseError")
    }))
})

const clientLayer = (respond: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  OpenAiClientGenerated.layer({ apiKey: Redacted.make("test-key") }).pipe(
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
