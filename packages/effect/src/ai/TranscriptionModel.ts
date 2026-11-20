/**
 * Defines the provider-neutral service for speech-to-text.
 *
 * A `TranscriptionModel` turns a finished recording into text with
 * `transcribe`, and a live audio stream into segment updates with
 * `transcribeLive`. Failures are reported as `AiError` values. A language
 * hint is the only portable option; vocabulary hints, prompts, and other
 * settings belong to each provider. `transcribeLiveBuffered` wraps the live
 * operation so audio survives a dropped connection.
 *
 * @stability unstable
 * @since 4.1.5
 */
import type * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Pull from "../Pull.ts"
import * as Queue from "../Queue.ts"
import * as Result from "../Result.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import * as AiError from "./AiError.ts"
import type * as Response from "./Response.ts"

/**
 * Service key for transcribing speech. Create implementations with `make`.
 *
 * @see {@link transcribe} for transcribing a recording through the current service
 * @see {@link transcribeLive} for transcribing live audio through the current service
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export const TranscriptionModel: Context.Service<TranscriptionModel, TranscriptionModel> = Context.Service(
  "effect/ai/TranscriptionModel"
)

/**
 * Brand type for `TranscriptionModel`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.5
 */
export type TypeId = "~effect/ai/TranscriptionModel"

/**
 * Brand for `TranscriptionModel` implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId: TypeId = "~effect/ai/TranscriptionModel"

/**
 * Provider-reported usage. Unreported values are `undefined`.
 *
 * **Details**
 *
 * Providers bill transcription by tokens, by audio duration, or both.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export class TranscriptionUsage extends Schema.Class<TranscriptionUsage>(
  "effect/ai/TranscriptionModel/TranscriptionUsage"
)({
  inputTokens: Schema.optional(Schema.Finite),
  outputTokens: Schema.optional(Schema.Finite),
  audioDuration: Schema.optional(Schema.Duration)
}) {}

/**
 * A finished audio recording. `data` is a base64 string, a byte array, or a
 * URL.
 *
 * **Gotchas**
 *
 * Providers do not accept every representation. A provider that cannot take
 * the one given fails with `AiError.InvalidUserInputError`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface Recording {
  /**
   * MIME type of the recording, such as `"audio/wav"`.
   */
  readonly mediaType: string
  readonly fileName?: string | undefined
  readonly data: string | Uint8Array | URL
}

/**
 * Options for transcribing a recording.
 *
 * @stability unstable
 * @category options
 * @since 4.1.5
 */
export interface TranscribeOptions {
  readonly audio: Recording
  /**
   * Language spoken in the audio, as an ISO 639-1 code such as `"en"`.
   */
  readonly language?: string | undefined
}

/**
 * A timestamped part of a transcribed recording. Times are offsets from the
 * start of the audio.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface Segment {
  readonly text: string
  readonly start: Duration.Duration
  readonly end: Duration.Duration
}

/**
 * Provider-specific response metadata keyed by provider name. Provider
 * packages augment this interface with details the portable response leaves
 * out, such as word timestamps, speaker labels, and confidence.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface TranscribeResponseMetadata extends Response.ProviderMetadata {}

/**
 * The transcript of a recording with usage and response metadata.
 *
 * @see {@link TranscriptionUsage} for usage metadata
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface TranscribeResponse {
  readonly text: string
  /**
   * Language of the audio as the provider reports it, which may be a code or a
   * name.
   */
  readonly language?: string | undefined
  /**
   * Length of the recording.
   */
  readonly duration?: Duration.Duration | undefined
  readonly segments?: ReadonlyArray<Segment> | undefined
  readonly usage: TranscriptionUsage
  readonly metadata: TranscribeResponseMetadata
}

/**
 * Provider response for a transcribed recording. `usage` defaults to no
 * reported values and `metadata` defaults to `{}`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface ProviderResponse {
  readonly text: string
  readonly language?: string | undefined
  readonly duration?: Duration.Duration | undefined
  readonly segments?: ReadonlyArray<Segment> | undefined
  readonly usage?: {
    readonly inputTokens?: number | undefined
    readonly outputTokens?: number | undefined
    readonly audioDuration?: Duration.Duration | undefined
  } | undefined
  readonly metadata?: TranscribeResponseMetadata | undefined
}

/**
 * The format of a raw audio stream.
 *
 * **Details**
 *
 * `"pcm16"` is signed 16-bit little-endian PCM. `"mulaw"` and `"alaw"` are
 * 8-bit G.711. Channels are interleaved.
 *
 * **Example** (Declaring 24 kHz mono PCM16)
 *
 * ```ts
 * import type { TranscriptionModel } from "effect/ai"
 *
 * const format: TranscriptionModel.AudioFormat = {
 *   encoding: "pcm16",
 *   sampleRate: 24000,
 *   channels: 1
 * }
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface AudioFormat {
  readonly encoding: "pcm16" | "mulaw" | "alaw"
  /**
   * Samples per second for each channel.
   */
  readonly sampleRate: number
  readonly channels: number
}

/**
 * Options for transcribing live audio.
 *
 * **Gotchas**
 *
 * Audio is sent as given. Nothing resamples it, so a provider fails with
 * `AiError.InvalidUserInputError` for a format it cannot take.
 *
 * @stability unstable
 * @category options
 * @since 4.1.5
 */
export interface TranscribeLiveOptions<E, R> {
  /**
   * Raw audio bytes in `format`. Chunks may split anywhere.
   */
  readonly audio: Stream.Stream<Uint8Array, E, R>
  readonly format: AudioFormat
  /**
   * Language spoken in the audio, as an ISO 639-1 code such as `"en"`.
   */
  readonly language?: string | undefined
}

/**
 * The current state of one segment of a live transcript.
 *
 * **Details**
 *
 * `text` is the whole text of the segment so far, not an addition to earlier
 * updates. Keep one entry for each `id` and replace it on every update. A
 * segment receives no more updates once `final` is `true`.
 *
 * `start` and `end` are offsets from the start of the audio and are set only
 * when the provider reports them.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface SegmentUpdate {
  readonly _tag: "SegmentUpdate"
  readonly id: string
  readonly text: string
  readonly final: boolean
  readonly start?: Duration.Duration | undefined
  readonly end?: Duration.Duration | undefined
}

/**
 * Notice that `transcribeLiveBuffered` dropped buffered audio to stay within
 * its maximum duration. The dropped audio cannot be sent again after a
 * reconnect.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface AudioDiscarded {
  readonly _tag: "AudioDiscarded"
  readonly duration: Duration.Duration
}

/**
 * Transcription of recordings and of live audio.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface TranscriptionModel {
  readonly [TypeId]: TypeId
  readonly transcribe: (options: TranscribeOptions) => Effect.Effect<TranscribeResponse, AiError.AiError>
  readonly transcribeLive: <E, R>(
    options: TranscribeLiveOptions<E, R>
  ) => Stream.Stream<SegmentUpdate, AiError.AiError | E, R>
}

/**
 * Creates a `TranscriptionModel` service from a provider implementation.
 *
 * **Details**
 *
 * A live session lasts as long as the stream `transcribeLive` returns. When
 * `audio` ends, the provider must flush, emit the remaining final updates, and
 * complete the stream. Interrupting the stream must close the session. A
 * dropped connection must fail the stream instead of reconnecting.
 *
 * **Gotchas**
 *
 * Without a provider `transcribeLive`, the service's `transcribeLive` fails
 * with `AiError.InvalidUserInputError`.
 *
 * @see {@link TranscriptionModel} for the service shape returned by this constructor
 * @see {@link ProviderResponse} for the provider response contract consumed by this constructor
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const make = (params: {
  readonly transcribe: (options: TranscribeOptions) => Effect.Effect<ProviderResponse, AiError.AiError>
  readonly transcribeLive?:
    | (<E, R>(options: TranscribeLiveOptions<E, R>) => Stream.Stream<SegmentUpdate, AiError.AiError | E, R>)
    | undefined
}): Effect.Effect<TranscriptionModel> =>
  Effect.sync(() => {
    const live = params.transcribeLive
    return TranscriptionModel.of({
      [TypeId]: TypeId,
      transcribe: (options) =>
        params.transcribe(options).pipe(
          Effect.map((response): TranscribeResponse => ({
            text: response.text,
            ...(response.language === undefined ? undefined : { language: response.language }),
            ...(response.duration === undefined ? undefined : { duration: response.duration }),
            ...(response.segments === undefined ? undefined : { segments: response.segments }),
            usage: new TranscriptionUsage({
              inputTokens: response.usage?.inputTokens,
              outputTokens: response.usage?.outputTokens,
              audioDuration: response.usage?.audioDuration
            }),
            metadata: response.metadata ?? {}
          })),
          (effect) => Effect.withSpan(effect, "TranscriptionModel.transcribe", { captureStackTrace: false })
        ),
      transcribeLive: (options) =>
        live === undefined
          ? Stream.fail(AiError.make({
            module: "TranscriptionModel",
            method: "transcribeLive",
            reason: new AiError.InvalidUserInputError({
              description: "This transcription model does not support live transcription"
            })
          }))
          : Stream.withSpan(live(options), "TranscriptionModel.transcribeLive", { captureStackTrace: false })
    })
  })

/**
 * Transcribes a finished recording using the current `TranscriptionModel`
 * service.
 *
 * **Example** (Transcribing a recording)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { TranscriptionModel } from "effect/ai"
 *
 * const program = Effect.fnUntraced(function*(bytes: Uint8Array) {
 *   const { text, segments } = yield* TranscriptionModel.transcribe({
 *     audio: { mediaType: "audio/wav", fileName: "call.wav", data: bytes },
 *     language: "en"
 *   })
 *   return { text, segments }
 * })
 * ```
 *
 * @see {@link transcribeLive} for transcribing audio as it arrives
 *
 * @stability unstable
 * @category transcription
 * @since 4.1.5
 */
export const transcribe = (
  options: TranscribeOptions
): Effect.Effect<TranscribeResponse, AiError.AiError, TranscriptionModel> =>
  TranscriptionModel.use((model) => model.transcribe(options))

/**
 * Transcribes live audio using the current `TranscriptionModel` service.
 *
 * **Details**
 *
 * The session lasts as long as the returned stream. When `audio` ends, the
 * provider flushes, the last final updates arrive, and the stream completes.
 * Interrupting the stream closes the session. The provider decides where
 * segments begin and end.
 *
 * **Gotchas**
 *
 * - A dropped connection fails the stream. Use `transcribeLiveBuffered` to
 *   reconnect without losing audio.
 * - A model that only transcribes recordings fails with
 *   `AiError.InvalidUserInputError`.
 *
 * **Example** (Keeping the latest text of each segment)
 *
 * ```ts
 * import { Stream } from "effect"
 * import { TranscriptionModel } from "effect/ai"
 *
 * const captions = (microphone: Stream.Stream<Uint8Array>) =>
 *   TranscriptionModel.transcribeLive({
 *     audio: microphone,
 *     format: { encoding: "pcm16", sampleRate: 24000, channels: 1 }
 *   }).pipe(
 *     Stream.scan(
 *       () => new Map<string, string>(),
 *       (segments, update: TranscriptionModel.SegmentUpdate) => new Map(segments).set(update.id, update.text)
 *     ),
 *     Stream.map((segments) => Array.from(segments.values()).join(" "))
 *   )
 * ```
 *
 * @see {@link transcribeLiveBuffered} for surviving a dropped connection
 *
 * @stability unstable
 * @category transcription
 * @since 4.1.5
 */
export const transcribeLive = <E, R>(
  options: TranscribeLiveOptions<E, R>
): Stream.Stream<SegmentUpdate, AiError.AiError | E, R | TranscriptionModel> =>
  Stream.unwrap(TranscriptionModel.useSync((model) => model.transcribeLive(options)))

/**
 * Transcribes live audio and reconnects after a dropped connection, sending
 * again the audio the transcript may not cover yet.
 *
 * **Details**
 *
 * Audio is buffered as it arrives and the buffer is emptied each time a final
 * segment arrives. When the session fails with a retryable `AiError`, a new one
 * opens after the next `schedule` delay and receives the buffer, followed by
 * the audio that arrived during the outage. The schedule starts over once a
 * session produces an update while `audio` is still open. Once `audio` has
 * ended, every new session is sent the same audio, so updates no longer start
 * the schedule over. When it is exhausted the stream fails with the last
 * error.
 *
 * While a session is connected, `audio` is pulled only as fast as the provider
 * takes it, so a provider that falls behind slows `audio` down and nothing
 * queues up outside the buffer. During an outage `audio` is pulled freely.
 *
 * Segment ids are issued here, so they stay unique across sessions, and
 * segment times stay relative to the start of `audio`. Segments that were not
 * final when a session failed receive a last update with empty text, because
 * their audio is sent again and comes back under new ids.
 *
 * When the buffer would exceed `maxDuration`, `"error"` fails the stream with
 * an `AiError`, and `"sliding"` drops the oldest audio and emits an
 * `AudioDiscarded` notice.
 *
 * **Gotchas**
 *
 * - The replay starts where the last final segment arrived, which is not where
 *   its speech ended. Speech that began before that point is not sent again,
 *   and text is not de-duplicated.
 * - Only final segments empty the buffer. Audio with no speech fills it too,
 *   so a pause longer than `maxDuration` overflows it.
 * - `maxDuration` does not bound a source that cannot wait. Give a live
 *   source its own bounded `Stream.buffer` if a slow provider must not hold
 *   it up.
 *
 * **Example** (Reconnecting with a bounded buffer)
 *
 * ```ts
 * import { Schedule, Stream } from "effect"
 * import { TranscriptionModel } from "effect/ai"
 *
 * const updates = (microphone: Stream.Stream<Uint8Array>) =>
 *   TranscriptionModel.transcribeLiveBuffered({
 *     audio: microphone,
 *     format: { encoding: "pcm16", sampleRate: 24000, channels: 1 },
 *     maxDuration: "30 seconds",
 *     strategy: "sliding",
 *     schedule: Schedule.exponential("200 millis")
 *   }).pipe(
 *     Stream.filter((event) => event._tag === "SegmentUpdate" && event.final)
 *   )
 * ```
 *
 * @see {@link transcribeLive} for the session this wraps
 *
 * @stability unstable
 * @category transcription
 * @since 4.1.5
 */
export const transcribeLiveBuffered = <E, R, const Strategy extends "sliding" | "error">(options: {
  readonly audio: Stream.Stream<Uint8Array, E, R>
  readonly format: AudioFormat
  readonly language?: string | undefined
  readonly maxDuration: Duration.Input
  readonly strategy: Strategy
  readonly schedule: Schedule.Schedule<unknown, AiError.AiError>
}): Stream.Stream<
  SegmentUpdate | (Strategy extends "sliding" ? AudioDiscarded : never),
  AiError.AiError | E,
  R | TranscriptionModel
> =>
  Stream.callback<SegmentUpdate | AudioDiscarded, AiError.AiError | E, R | TranscriptionModel>(
    Effect.fnUntraced(function*(output) {
      const model = yield* TranscriptionModel
      const frameSize = options.format.channels * (options.format.encoding === "pcm16" ? 2 : 1)
      const bytesPerSecond = frameSize * options.format.sampleRate
      const maxBytes = Math.floor(Duration.toSeconds(options.maxDuration) * options.format.sampleRate) * frameSize
      const toDuration = (bytes: number) => Duration.seconds(bytes / bytesPerSecond)

      // The buffer holds the bytes of `audio` from `bufferStart` to `received`,
      // both offsets from the start of the stream.
      const buffer: Array<Uint8Array> = []
      let bufferStart = 0
      let received = 0
      let ended = false
      let session: Queue.Queue<Uint8Array, Cause.Done> | undefined
      let nextId = 0
      let progressed = false
      // Provider segment ids of the current session that have no final update yet,
      // mapped to the ids issued here.
      const ids = new Map<string, string>()

      // Drops whole frames only, so a replay never starts inside a sample, and
      // never past the end of the buffer.
      const dropUntil = (offset: number) => {
        const end = Math.min(offset, received)
        const target = end - (end % frameSize)
        let count = 0
        while (bufferStart < target) {
          const head = buffer[count]
          if (bufferStart + head.length <= target) {
            count++
            bufferStart += head.length
          } else {
            buffer[count] = head.subarray(target - bufferStart)
            bufferStart = target
          }
        }
        buffer.splice(0, count)
      }

      const push = (chunk: Uint8Array): Effect.Effect<unknown, AiError.AiError> => {
        const overflow = received + chunk.length - bufferStart - maxBytes
        if (overflow > 0 && options.strategy === "error") {
          return Effect.fail(AiError.make({
            module: "TranscriptionModel",
            method: "transcribeLiveBuffered",
            reason: new AiError.UnknownError({
              description: "Buffered audio exceeded the maximum duration of " +
                Duration.format(Duration.fromInputUnsafe(options.maxDuration))
            })
          }))
        }
        buffer.push(chunk)
        received += chunk.length
        if (overflow > 0) {
          const start = bufferStart
          dropUntil(received - maxBytes + frameSize - 1)
          if (bufferStart > start) {
            Queue.offerUnsafe(output, { _tag: "AudioDiscarded", duration: toDuration(bufferStart - start) })
          }
        }
        // Waits for the provider to take the chunk, so audio it is slow to take
        // is not held here outside the buffer.
        return session === undefined ? Effect.void : Queue.offer(session, chunk)
      }

      yield* Stream.runForEach(options.audio, push).pipe(
        Effect.matchCauseEffect({
          onFailure: (cause) => Queue.failCause(output, cause),
          onSuccess: () =>
            Effect.sync(() => {
              ended = true
              if (session !== undefined) Queue.endUnsafe(session)
            })
        }),
        Effect.forkScoped
      )

      const runSession = Effect.gen(function*() {
        const queue = yield* Queue.bounded<Uint8Array, Cause.Done>(1)
        const replay = buffer.slice()
        const offset = toDuration(bufferStart)
        // Closes the segments the previous session left open.
        for (const id of ids.values()) {
          Queue.offerUnsafe(output, { _tag: "SegmentUpdate", id, text: "", final: true })
        }
        ids.clear()
        if (ended) Queue.endUnsafe(queue)
        session = queue
        yield* model.transcribeLive({
          // Emptied once read, so the session does not hold the replay for as long as it lives.
          audio: Stream.concat(Stream.suspend(() => Stream.fromArray(replay.splice(0))), Stream.fromQueue(queue)),
          format: options.format,
          language: options.language
        }).pipe(
          Stream.runForEach((update) =>
            Effect.sync(() => {
              // After the audio has ended a replay brings the same updates again.
              if (!ended) progressed = true
              let id = ids.get(update.id)
              if (id === undefined) {
                id = String(nextId++)
                ids.set(update.id, id)
              }
              if (update.final) {
                ids.delete(update.id)
                dropUntil(received)
              }
              Queue.offerUnsafe(output, {
                ...update,
                id,
                ...(update.start === undefined ? undefined : { start: Duration.sum(update.start, offset) }),
                ...(update.end === undefined ? undefined : { end: Duration.sum(update.end, offset) })
              })
            })
          ),
          Effect.ensuring(Effect.sync(() => {
            session = undefined
            // Releases a chunk the session never took. It is still in the buffer.
            Queue.shutdownUnsafe(queue)
          }))
        )
      })

      let step = yield* Schedule.toStepWithSleep(options.schedule)
      while (true) {
        progressed = false
        const result = yield* Effect.result(runSession)
        if (Result.isSuccess(result)) break
        const error = result.failure
        if (!error.isRetryable) return yield* Effect.fail(error)
        if (progressed) step = yield* Schedule.toStepWithSleep(options.schedule)
        yield* Pull.catchDone(step(error), () => Effect.fail(error))
      }
      yield* Queue.end(output)
    })
  ) as any
