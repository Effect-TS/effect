import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Ref, Stream } from "effect"
import * as AiError from "effect/ai/AiError"
import * as SpeechModel from "effect/ai/SpeechModel"

const audio = new Uint8Array([1, 2, 3])
const start: SpeechModel.StreamPart = { type: "speech-start", mediaType: "audio/mpeg" }
const delta: SpeechModel.StreamPart = { type: "speech-delta", delta: audio }
const end: SpeechModel.StreamPart = { type: "speech-end" }

const make = (streamSpeech: (
  options: SpeechModel.GenerateSpeechOptions
) => Stream.Stream<SpeechModel.StreamPart, AiError.AiError> = () => Stream.make(start, delta, end)) =>
  SpeechModel.make({
    generateSpeech: () => Effect.succeed({ audio, mediaType: "audio/mpeg" }),
    streamSpeech
  })

describe("SpeechModel", () => {
  it.effect("generates a schema response through the service accessor without copying bytes", () =>
    Effect.gen(function*() {
      const requests = yield* Ref.make<Array<SpeechModel.GenerateSpeechOptions>>([])
      const model = yield* SpeechModel.make({
        generateSpeech: (options) =>
          Ref.update(requests, (items) => [...items, options]).pipe(
            Effect.as({ audio, mediaType: "audio/mpeg" })
          ),
        streamSpeech: () => Stream.empty
      })
      const response = yield* SpeechModel.generateSpeech({ text: " Hello ", voice: "alloy" }).pipe(
        Effect.provideService(SpeechModel.SpeechModel, model)
      )

      assert.instanceOf(response, SpeechModel.GenerateSpeechResponse)
      assert.strictEqual(response.audio, audio)
      assert.strictEqual(response.mediaType, "audio/mpeg")
      assert.strictEqual(model[SpeechModel.TypeId], SpeechModel.TypeId)
      assert.deepStrictEqual(yield* Ref.get(requests), [{ text: " Hello ", voice: "alloy" }])
    }))

  it.effect("validates complete and streamed requests before invoking either provider", () =>
    Effect.gen(function*() {
      const calls = yield* Ref.make(0)
      const invoked = yield* Deferred.make<void>()
      const model = yield* SpeechModel.make({
        generateSpeech: () => Ref.update(calls, (n) => n + 1).pipe(Effect.as({ audio, mediaType: "audio/mpeg" })),
        streamSpeech: () => {
          Deferred.doneUnsafe(invoked, Effect.void)
          return Stream.make(start, delta, end)
        }
      })
      for (const options of [{ text: "" }, { text: " \n\t" }, { text: "hello", voice: " " }]) {
        const completeError = yield* model.generateSpeech(options).pipe(Effect.flip)
        const streamError = yield* model.streamSpeech(options).pipe(Stream.runDrain, Effect.flip)
        assert.strictEqual(completeError.reason._tag, "InvalidRequestError")
        assert.strictEqual(streamError.reason._tag, "InvalidRequestError")
      }
      assert.strictEqual(yield* Ref.get(calls), 0)
      assert.isFalse(yield* Deferred.isDone(invoked))
    }))

  it.effect("maps malformed complete output into InvalidOutputError", () =>
    Effect.gen(function*() {
      for (const response of [{ audio: new Uint8Array(), mediaType: "audio/mpeg" }, { audio, mediaType: " " }]) {
        const model = yield* SpeechModel.make({
          generateSpeech: () => Effect.succeed(response),
          streamSpeech: () => Stream.empty
        })
        const error = yield* model.generateSpeech({ text: "hello" }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
      }
    }))

  it.effect("preserves provider failures for complete and streamed requests", () =>
    Effect.gen(function*() {
      const error = AiError.make({
        module: "SpeechModelTest",
        method: "generate",
        reason: new AiError.UnknownError({ description: "provider failed" })
      })
      const model = yield* SpeechModel.make({
        generateSpeech: () => Effect.fail(error),
        streamSpeech: () => Stream.succeed(start).pipe(Stream.concat(Stream.fail(error)))
      })
      assert.strictEqual(yield* model.generateSpeech({ text: "hello" }).pipe(Effect.flip), error)
      assert.strictEqual(yield* model.streamSpeech({ text: "hello" }).pipe(Stream.runDrain, Effect.flip), error)
    }))

  it.effect("defers provider invocation until consumption and resets validation on each run", () =>
    Effect.gen(function*() {
      const invoked = yield* Deferred.make<void>()
      const model = yield* make(() => {
        Deferred.doneUnsafe(invoked, Effect.void)
        return Stream.make(start, delta, end)
      })
      const stream = SpeechModel.streamSpeech({ text: "hello" }).pipe(
        Stream.provideService(SpeechModel.SpeechModel, model)
      )
      assert.isFalse(yield* Deferred.isDone(invoked))
      assert.deepStrictEqual(yield* Stream.runCollect(stream), [start, delta, end])
      assert.isTrue(yield* Deferred.isDone(invoked))
      assert.deepStrictEqual(yield* Stream.runCollect(stream), [start, delta, end])
    }))

  it.effect("emits incrementally and releases the provider when the consumer stops early", () =>
    Effect.gen(function*() {
      const released = yield* Ref.make(false)
      const blocked = yield* Deferred.make<SpeechModel.StreamPart>()
      const model = yield* make(() =>
        Stream.unwrap(
          Effect.acquireRelease(
            Effect.void,
            () => Ref.set(released, true)
          ).pipe(Effect.as(
            Stream.make(start, delta).pipe(Stream.concat(Stream.fromEffect(Deferred.await(blocked))))
          ))
        )
      )
      const parts = yield* model.streamSpeech({ text: "hello" }).pipe(Stream.take(2), Stream.runCollect)
      assert.deepStrictEqual(parts, [start, delta])
      assert.strictEqual(parts[1].type === "speech-delta" ? parts[1].delta : undefined, audio)
      assert.isTrue(yield* Ref.get(released))
    }))

  it.effect("propagates interruption to provider stream resources", () =>
    Effect.gen(function*() {
      const acquired = yield* Deferred.make<void>()
      const released = yield* Ref.make(false)
      const model = yield* make(() =>
        Stream.unwrap(
          Effect.acquireRelease(
            Deferred.succeed(acquired, undefined),
            () => Ref.set(released, true)
          ).pipe(Effect.as(Stream.succeed(start).pipe(Stream.concat(Stream.never))))
        )
      )
      const fiber = yield* model.streamSpeech({ text: "hello" }).pipe(Stream.runDrain, Effect.forkScoped)
      yield* Deferred.await(acquired)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(yield* Ref.get(released))
    }))

  const malformedStreams: ReadonlyArray<readonly [string, ReadonlyArray<SpeechModel.StreamPart>]> = [
    ["missing start", [delta, end]],
    ["duplicate start", [start, start, delta, end]],
    ["end without audio", [start, end]],
    ["duplicate end", [start, delta, end, end]],
    ["missing end", [start, delta]],
    ["empty response", []],
    ["empty delta", [start, { type: "speech-delta", delta: new Uint8Array() }, end]],
    ["blank media type", [{ type: "speech-start", mediaType: " " }, delta, end]],
    ["delta after end", [start, delta, end, delta]]
  ]
  for (const [name, parts] of malformedStreams) {
    it.effect(`rejects ${name} with InvalidOutputError`, () =>
      Effect.gen(function*() {
        const model = yield* make(() => Stream.fromIterable(parts))
        const error = yield* model.streamSpeech({ text: "hello" }).pipe(Stream.runDrain, Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
        assert.strictEqual(error.module, "SpeechModel")
        assert.strictEqual(error.method, "streamSpeech")
      }))
  }
})
