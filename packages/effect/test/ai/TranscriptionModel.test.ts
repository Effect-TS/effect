import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Ref, Schema } from "effect"
import * as AiError from "effect/ai/AiError"
import * as TranscriptionModel from "effect/ai/TranscriptionModel"

const audio = new Uint8Array([1, 2, 3])

describe("TranscriptionModel", () => {
  it.effect("passes recorded audio and hints through the accessor and constructs a schema response", () =>
    Effect.gen(function*() {
      const requests = yield* Ref.make<Array<TranscriptionModel.TranscribeOptions>>([])
      const model = yield* TranscriptionModel.make({
        transcribe: (options) =>
          Ref.update(requests, (items) => [...items, options]).pipe(
            Effect.as({ text: "Hello", language: "en" })
          )
      })
      const options = { audio, mediaType: "audio/wav", fileName: "hello.wav", language: "en", prompt: "A greeting" }
      const response = yield* TranscriptionModel.transcribe(options).pipe(
        Effect.provideService(TranscriptionModel.TranscriptionModel, model)
      )
      const received = yield* Ref.get(requests)

      assert.deepStrictEqual(received, [options])
      assert.strictEqual(received[0].audio, audio)
      assert.instanceOf(response, TranscriptionModel.TranscribeResponse)
      assert.strictEqual(response.text, "Hello")
      assert.strictEqual(response.language, "en")
      assert.strictEqual(model[TranscriptionModel.TypeId], TranscriptionModel.TypeId)
    }))

  it.effect("accepts unrecognized speech and does not invent a reported language from a hint", () =>
    Effect.gen(function*() {
      const model = yield* TranscriptionModel.make({ transcribe: () => Effect.succeed({ text: "" }) })
      const response = yield* model.transcribe({ audio, mediaType: "audio/wav", language: "en", prompt: "" })
      assert.strictEqual(response.text, "")
      assert.strictEqual(response.language, undefined)
    }))

  it.effect("round trips optional language through the response schema", () =>
    Effect.gen(function*() {
      const response = new TranscriptionModel.TranscribeResponse({ text: "Hello" })
      const encoded = yield* Schema.encodeEffect(TranscriptionModel.TranscribeResponse)(response)
      const decoded = yield* Schema.decodeUnknownEffect(TranscriptionModel.TranscribeResponse)(
        JSON.parse(JSON.stringify(encoded))
      )
      assert.deepStrictEqual(decoded, response)
    }))

  it.effect("validates recorded input before invoking the provider", () =>
    Effect.gen(function*() {
      const calls = yield* Ref.make(0)
      const model = yield* TranscriptionModel.make({
        transcribe: () => Ref.update(calls, (n) => n + 1).pipe(Effect.as({ text: "hello" }))
      })
      const invalid: Array<TranscriptionModel.TranscribeOptions> = [
        { audio: new Uint8Array(), mediaType: "audio/wav" },
        { audio, mediaType: " " },
        { audio, mediaType: "audio/wav", fileName: "" },
        { audio, mediaType: "audio/wav", language: " " }
      ]
      for (const options of invalid) {
        const error = yield* model.transcribe(options).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidRequestError")
        assert.strictEqual(error.module, "TranscriptionModel")
        assert.strictEqual(error.method, "transcribe")
      }
      assert.strictEqual(yield* Ref.get(calls), 0)
    }))

  it.effect("maps malformed provider responses into InvalidOutputError", () =>
    Effect.gen(function*() {
      for (const response of [{ text: 123 }, { text: "hello", language: " " }]) {
        const model = yield* TranscriptionModel.make({
          transcribe: () => Effect.succeed(response as TranscriptionModel.ProviderResponse)
        })
        const error = yield* model.transcribe({ audio, mediaType: "audio/wav" }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
      }
    }))

  it.effect("preserves provider failures without retrying", () =>
    Effect.gen(function*() {
      const calls = yield* Ref.make(0)
      const error = AiError.make({
        module: "TranscriptionModelTest",
        method: "transcribe",
        reason: new AiError.UnknownError({ description: "provider failed" })
      })
      const model = yield* TranscriptionModel.make({
        transcribe: () => Ref.update(calls, (n) => n + 1).pipe(Effect.andThen(Effect.fail(error)))
      })
      const result = yield* model.transcribe({ audio, mediaType: "audio/wav" }).pipe(Effect.flip)
      assert.strictEqual(result, error)
      assert.strictEqual(yield* Ref.get(calls), 1)
    }))

  it.effect("interrupts an in-flight transcription and releases provider resources", () =>
    Effect.gen(function*() {
      const acquired = yield* Deferred.make<void>()
      const released = yield* Ref.make(false)
      const model = yield* TranscriptionModel.make({
        transcribe: () =>
          Effect.acquireUseRelease(
            Deferred.succeed(acquired, undefined),
            () => Effect.never,
            () => Ref.set(released, true)
          )
      })
      const fiber = yield* model.transcribe({ audio, mediaType: "audio/wav" }).pipe(Effect.forkScoped)
      yield* Deferred.await(acquired)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(yield* Ref.get(released))
    }))
})
