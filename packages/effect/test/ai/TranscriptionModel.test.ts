import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Duration, Effect, Fiber, Layer, Queue, Schedule, Stream } from "effect"
import { AiError, TranscriptionModel } from "effect/ai"
import { TestClock } from "effect/testing"

const format: TranscriptionModel.AudioFormat = { encoding: "mulaw", sampleRate: 1, channels: 1 }

const dropped = AiError.make({
  module: "Fake",
  method: "transcribeLive",
  reason: new AiError.NetworkError({ reason: "TransportError", method: "GET", url: "wss://fake" })
})

const update = (
  id: string,
  text: string,
  final: boolean,
  times?: { readonly start: Duration.Duration; readonly end: Duration.Duration }
): TranscriptionModel.SegmentUpdate => ({ _tag: "SegmentUpdate", id, text, final, ...times })

// A provider whose sessions answer each audio chunk with scripted updates.
const makeFake = (
  script: (
    session: number,
    chunk: Uint8Array
  ) => Effect.Effect<ReadonlyArray<TranscriptionModel.SegmentUpdate>, AiError.AiError>
) => {
  const sessions: Array<Array<number>> = []
  const layer = Layer.effect(
    TranscriptionModel.TranscriptionModel,
    TranscriptionModel.make({
      transcribe: () => Effect.succeed({ text: "hello" }),
      transcribeLive: (options) => {
        const session = sessions.push([]) - 1
        return options.audio.pipe(
          Stream.mapEffect((chunk) => {
            sessions[session].push(...chunk)
            return script(session, chunk)
          }),
          Stream.flattenIterable
        )
      }
    })
  )
  return { sessions, layer }
}

describe("TranscriptionModel", () => {
  it.effect("transcribe defaults usage and metadata", () =>
    Effect.gen(function*() {
      const response = yield* TranscriptionModel.transcribe({
        audio: { mediaType: "audio/wav", data: new Uint8Array([1]) }
      })
      assert.strictEqual(response.text, "hello")
      assert.strictEqual(response.usage.audioDuration, undefined)
      assert.deepStrictEqual(response.metadata, {})
    }).pipe(Effect.provide(makeFake(() => Effect.succeed([])).layer)))

  it.effect("transcribeLive fails when the provider only transcribes recordings", () =>
    Effect.gen(function*() {
      const error = yield* TranscriptionModel.transcribeLive({ audio: Stream.empty, format }).pipe(
        Stream.runDrain,
        Effect.flip
      )
      assert.strictEqual(error.reason._tag, "InvalidUserInputError")
    }).pipe(
      Effect.provide(Layer.effect(
        TranscriptionModel.TranscriptionModel,
        TranscriptionModel.make({ transcribe: () => Effect.succeed({ text: "hello" }) })
      ))
    ))

  describe("transcribeLiveBuffered", () => {
    it.effect("resends the audio received since the last final segment", () => {
      const fake = makeFake((session, chunk) => {
        if (session === 0) {
          switch (chunk[0]) {
            case 1:
              return Effect.succeed([update("a", "one", true)])
            case 3:
              return Effect.succeed([update("b", "tw", false)])
            default:
              return Effect.fail(dropped)
          }
        }
        return Effect.succeed([
          update("a", "chunk " + chunk[0], true, { start: Duration.zero, end: Duration.seconds(2) })
        ])
      })
      return Effect.gen(function*() {
        const audio = yield* Queue.unbounded<Uint8Array, Cause.Done>()
        const output = yield* TranscriptionModel.transcribeLiveBuffered({
          audio: Stream.fromQueue(audio),
          format,
          maxDuration: "1 minute",
          strategy: "error",
          schedule: Schedule.recurs(1)
        }).pipe(Stream.toQueue({ capacity: "unbounded" }))

        yield* Queue.offer(audio, new Uint8Array([1, 2]))
        assert.deepStrictEqual(yield* Queue.take(output), update("0", "one", true))

        yield* Queue.offer(audio, new Uint8Array([3, 4]))
        assert.deepStrictEqual(yield* Queue.take(output), update("1", "tw", false))

        yield* Queue.offer(audio, new Uint8Array([5, 6]))
        yield* Queue.end(audio)
        assert.deepStrictEqual(yield* Queue.takeN(output, 3), [
          // The segment that never became final is cleared before its audio is replayed.
          update("1", "", true),
          update("2", "chunk 3", true, { start: Duration.seconds(2), end: Duration.seconds(4) }),
          update("3", "chunk 5", true, { start: Duration.seconds(2), end: Duration.seconds(4) })
        ])
        assert.deepStrictEqual(fake.sessions, [[1, 2, 3, 4, 5, 6], [3, 4, 5, 6]])
        assert.isTrue(Cause.isDone(yield* Effect.flip(Queue.take(output))))
      }).pipe(Effect.provide(fake.layer))
    })

    it.effect("sliding keeps a trailing partial frame when the buffer holds less than one frame", () => {
      const fake = makeFake((session) => session === 0 ? Effect.fail(dropped) : Effect.succeed([]))
      return Effect.gen(function*() {
        const output = yield* TranscriptionModel.transcribeLiveBuffered({
          audio: Stream.make(new Uint8Array([1, 2, 3])),
          format: { encoding: "pcm16", sampleRate: 1, channels: 1 },
          maxDuration: Duration.zero,
          strategy: "sliding",
          schedule: Schedule.recurs(1)
        }).pipe(Stream.runCollect)
        assert.deepStrictEqual(output, [{ _tag: "AudioDiscarded", duration: Duration.seconds(1) }])
        assert.deepStrictEqual(fake.sessions[1], [3])
      }).pipe(Effect.provide(fake.layer))
    })

    it.effect("waits for a provider that has stopped taking audio", () =>
      Effect.gen(function*() {
        const stalled = yield* Deferred.make<void>()
        const fake = makeFake((_, chunk) =>
          chunk[0] === 1 ? Effect.as(Deferred.await(stalled), []) : Effect.succeed([])
        )
        let pulled = 0
        const fiber = yield* TranscriptionModel.transcribeLiveBuffered({
          audio: Stream.fromEffectRepeat(Effect.sync(() => new Uint8Array([++pulled]))).pipe(Stream.take(100)),
          format,
          maxDuration: "2 seconds",
          strategy: "sliding",
          schedule: Schedule.recurs(1)
        }).pipe(Stream.runDrain, Effect.provide(fake.layer), Effect.forkChild)

        yield* TestClock.adjust(0)
        assert.isBelow(pulled, 10)

        yield* Deferred.succeed(stalled, undefined)
        yield* Fiber.join(fiber)
        assert.deepStrictEqual(fake.sessions, [Array.from({ length: 100 }, (_, i) => i + 1)])
      }))

    it.effect("error fails when the buffer is full", () => {
      const fake = makeFake(() => Effect.succeed([]))
      return Effect.gen(function*() {
        const error = yield* TranscriptionModel.transcribeLiveBuffered({
          audio: Stream.make(new Uint8Array([1, 2]), new Uint8Array([3])),
          format,
          maxDuration: "2 seconds",
          strategy: "error",
          schedule: Schedule.recurs(1)
        }).pipe(Stream.runDrain, Effect.flip)
        assert.strictEqual(error.method, "transcribeLiveBuffered")
      }).pipe(Effect.provide(fake.layer))
    })

    it.effect("does not restore the reconnect budget once the audio has ended", () => {
      let sessions = 0
      // Each session takes all the audio, reports a partial segment, then times out.
      const layer = Layer.effect(
        TranscriptionModel.TranscriptionModel,
        TranscriptionModel.make({
          transcribe: () => Effect.succeed({ text: "hello" }),
          transcribeLive: (options) => {
            const failure = sessions++ === 0 ? dropped : AiError.make({ ...dropped, method: "retry" })
            return Stream.drain(options.audio).pipe(
              Stream.concat(Stream.make(update("a", "partial", false))),
              Stream.concat(Stream.fromEffect(Effect.delay(Effect.fail(failure), "1 second")))
            )
          }
        })
      )
      return Effect.gen(function*() {
        const fiber = yield* TranscriptionModel.transcribeLiveBuffered({
          audio: Stream.make(new Uint8Array([1])),
          format,
          maxDuration: "1 minute",
          strategy: "error",
          schedule: Schedule.recurs(1)
        }).pipe(Stream.runDrain, Effect.flip, Effect.forkChild)

        yield* TestClock.adjust(0)
        yield* TestClock.adjust("2 seconds")
        assert.strictEqual(sessions, 2)
        assert.isDefined(fiber.pollUnsafe())
        assert.strictEqual((yield* Fiber.join(fiber)).method, "retry")
      }).pipe(Effect.provide(layer))
    })
  })
})
