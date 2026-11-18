/**
 * OpenAI implementation of `TranscriptionModel`.
 *
 * Recordings go to the transcriptions endpoint. Live audio goes to a Realtime
 * transcription session over a WebSocket, which the `layerRealtime` and
 * `modelRealtime` constructors add. Live transcription supports only models
 * with server-side turn detection.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as AiError from "effect/ai/AiError"
import * as AiModel from "effect/ai/Model"
import * as TranscriptionModel from "effect/ai/TranscriptionModel"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import { dual } from "effect/Function"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"
import type { Simplify } from "effect/Types"
import * as Errors from "./internal/errors.ts"
import { OpenAiClient } from "./OpenAiClient.ts"
import { OpenAiConfig } from "./OpenAiConfig.ts"
import * as OpenAiSchema from "./OpenAiSchema.ts"

/**
 * OpenAI transcription model identifiers.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export type Model =
  | "whisper-1"
  | "gpt-transcribe"
  | "gpt-4o-transcribe"
  | "gpt-4o-mini-transcribe"
  | "gpt-4o-transcribe-diarize"

type RealtimeInput = typeof OpenAiSchema.RealtimeTranscriptionSession.Encoded["audio"]["input"]

/**
 * Service definition for OpenAI transcription model configuration.
 *
 * **Details**
 *
 * The top-level fields configure requests to the transcriptions endpoint.
 * `language` and `prompt` also apply to live sessions. `realtime` holds the settings that
 * only live sessions have. Turn detection defaults to `server_vad`.
 * `flushTimeout` is how long a live session has to deliver the remaining
 * transcripts once the audio has ended, and defaults to 30 seconds.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export class Config extends Context.Service<
  Config,
  Simplify<
    & Partial<typeof OpenAiSchema.CreateTranscriptionRequest.Encoded>
    & {
      readonly realtime?: {
        readonly turn_detection?: RealtimeInput["turn_detection"] | undefined
        readonly noise_reduction?: RealtimeInput["noise_reduction"] | undefined
        readonly include?: typeof OpenAiSchema.RealtimeTranscriptionSession.Encoded["include"] | undefined
        readonly flushTimeout?: Duration.Input | undefined
      } | undefined
    }
  >
>()("@effect/ai-openai/OpenAiTranscriptionModel/Config") {}

declare module "effect/ai/TranscriptionModel" {
  /**
   * OpenAI metadata returned with a transcription.
   *
   * @stability unstable
   * @category models
   * @since 4.1.5
   */
  export interface TranscribeResponseMetadata {
    readonly openai?: {
      /**
       * Languages detected in the audio.
       */
      readonly languages?: Array<string>
      /**
       * Segments as OpenAI returned them, with speaker labels when diarized.
       */
      readonly segments?: Array<{
        id: string | number
        start: number
        end: number
        text: string
        speaker?: string
        avg_logprob?: number
        compression_ratio?: number
        no_speech_prob?: number
      }>
      readonly words?: Array<{ word: string; start: number; end: number }>
      readonly logprobs?: Array<{ token?: string; logprob?: number; bytes?: Array<number> }>
    }
  }
}

/**
 * Creates an OpenAI model that transcribes recordings.
 *
 * @see {@link modelRealtime} for a model that also transcribes live audio
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<typeof Config.Service, "model">
): AiModel.Model<"openai", TranscriptionModel.TranscriptionModel, OpenAiClient> =>
  AiModel.make("openai", model, layer({ model, config }))

/**
 * Creates an OpenAI model that transcribes recordings and live audio.
 *
 * @see {@link layerRealtime} for the WebSocket constructors that work
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const modelRealtime = (
  model: (string & {}) | Model,
  config?: Omit<typeof Config.Service, "model">
): AiModel.Model<"openai", TranscriptionModel.TranscriptionModel, OpenAiClient | Socket.WebSocketConstructor> =>
  AiModel.make("openai", model, layerRealtime({ model, config }))

/**
 * Creates an OpenAI transcription model for recordings. Its `transcribeLive`
 * fails with an `AiError`.
 *
 * **Gotchas**
 *
 * - OpenAI does not fetch audio. A recording given as a URL fails with
 *   `AiError.InvalidUserInputError`.
 * - OpenAI reads the audio format from the file name. Without `fileName`, the
 *   name is derived from `mediaType`.
 *
 * @see {@link makeRealtime} for a model that also transcribes live audio
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<TranscriptionModel.TranscriptionModel, never, OpenAiClient> {
  const client = yield* OpenAiClient
  return yield* TranscriptionModel.make({ transcribe: makeTranscribe(client, options) })
})

/**
 * Creates an OpenAI transcription model for recordings and live audio.
 *
 * **Details**
 *
 * Each live stream opens its own Realtime transcription session and closes it
 * when the stream ends. Segments follow OpenAI's server-side turn detection.
 * Their `start` and `end` are the times at which turn detection heard speech
 * begin and stop.
 *
 * When `audio` ends, the session commits the audio that turn detection has
 * not committed yet. The stream completes once OpenAI has answered that
 * commit and every turn it announced has a final transcript. If OpenAI
 * rejects the commit for any reason other than having no audio left to
 * commit, the stream fails with that error.
 *
 * **Gotchas**
 *
 * - PCM16 audio must be 24 kHz mono. G.711 audio must be 8 kHz mono. Other
 *   formats fail with `AiError.InvalidUserInputError`.
 * - `gpt-live-transcribe` has no server-side turn detection and fails with
 *   `AiError.InvalidUserInputError`.
 * - If transcripts are still due `realtime.flushTimeout` after the audio
 *   ended, the stream fails with a retryable `AiError`, even when the session
 *   is still sending. Raise it when much audio is sent at once, as after a
 *   `transcribeLiveBuffered` replay.
 * - OpenAI does not say which commit a `committed` event answers. When the
 *   audio ends during speech, the closing commit counts as answered once a
 *   commit has been announced and the clear sent after it is acknowledged. A
 *   turn that OpenAI announces only after that is not waited for.
 * - OpenAI does not commit less than 100 ms of audio, so a shorter tail is not
 *   transcribed.
 *
 * @see {@link layerRealtime} for the WebSocket constructors that work
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const makeRealtime = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<TranscriptionModel.TranscriptionModel, never, OpenAiClient | Socket.WebSocketConstructor> {
  const client = yield* OpenAiClient
  const makeWebSocket = yield* Socket.WebSocketConstructor
  return yield* TranscriptionModel.make({
    transcribe: makeTranscribe(client, options),
    transcribeLive: makeTranscribeLive(client, makeWebSocket, options)
  })
})

/**
 * Creates a layer for an OpenAI transcription model that handles recordings.
 *
 * @see {@link layerRealtime} for a layer that also handles live audio
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<TranscriptionModel.TranscriptionModel, never, OpenAiClient> =>
  Layer.effect(TranscriptionModel.TranscriptionModel, make(options))

/**
 * Creates a layer for an OpenAI transcription model that handles recordings
 * and live audio.
 *
 * **Gotchas**
 *
 * The Authorization header is sent through the WebSocket constructor's
 * non-standard options. Use `NodeSocket.layerWebSocketConstructor`,
 * `NodeWS.layerWebSocketConstructor`, or `BunSocket.layerWebSocketConstructor`.
 * `Socket.layerWebSocketConstructorGlobal` cannot send it.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layerRealtime = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<TranscriptionModel.TranscriptionModel, never, OpenAiClient | Socket.WebSocketConstructor> =>
  Layer.effect(TranscriptionModel.TranscriptionModel, makeRealtime(options))

/**
 * Provides config overrides for OpenAI transcription model operations.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.5
 */
export const withConfigOverride: {
  (overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
} = dual<
  (
    overrides: typeof Config.Service
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service) => Effect.Effect<A, E, Exclude<R, Config>>
>(2, (self, overrides) =>
  Effect.flatMap(
    Effect.serviceOption(Config),
    (config) =>
      Effect.provideService(self, Config, {
        ...(config._tag === "Some" ? config.value : {}),
        ...overrides
      })
  ))

type Options = {
  readonly model: string
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}

const makeConfig = (options: Options) =>
  Effect.contextWith((services: Context.Context<never>) =>
    Effect.succeed({ model: options.model, ...options.config, ...Context.getOrUndefined(services, Config) })
  )

const invalidInput = (method: string, description: string): AiError.AiError =>
  AiError.make({
    module: "OpenAiTranscriptionModel",
    method,
    reason: new AiError.InvalidUserInputError({ description })
  })

// -----------------------------------------------------------------------------
// Recordings
// -----------------------------------------------------------------------------

const extensions: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/x-m4a": "m4a"
}

const makeTranscribe = (client: OpenAiClient["Service"], options: Options) =>
  Effect.fnUntraced(function*({ audio, language }: TranscriptionModel.TranscribeOptions) {
    const { realtime: _, ...config } = yield* makeConfig(options)
    if (audio.data instanceof URL) {
      return yield* invalidInput("transcribe", "OpenAI cannot transcribe a recording from a URL")
    }
    const bytes = typeof audio.data === "string" ? Base64.decode(audio.data) : Result.succeed(audio.data)
    if (Result.isFailure(bytes)) {
      return yield* invalidInput("transcribe", "The recording is not valid base64")
    }
    // Media types can carry parameters, as in `audio/webm;codecs=opus`.
    const mediaType = audio.mediaType.split(";", 1)[0].trim()
    const response = yield* client.createTranscription({
      ...config,
      ...(language === undefined ? undefined : { language }),
      file: new Blob([bytes.success as Uint8Array<ArrayBuffer>], { type: audio.mediaType }),
      fileName: audio.fileName ?? "audio." + (extensions[mediaType] ?? mediaType.slice(mediaType.indexOf("/") + 1))
    })
    const metadata: NonNullable<TranscriptionModel.TranscribeResponseMetadata["openai"]> = {
      ...(response.languages === undefined ? undefined : { languages: response.languages.map((_) => _.code) }),
      ...(response.segments === undefined ? undefined : { segments: [...response.segments] }),
      ...(response.words === undefined ? undefined : { words: [...response.words] }),
      ...(response.logprobs === undefined ? undefined : {
        logprobs: response.logprobs.map(({ bytes, ...rest }) => ({
          ...rest,
          ...(bytes === undefined ? undefined : { bytes: [...bytes] })
        }))
      })
    }
    return {
      text: response.text,
      language: response.language ?? response.languages?.[0]?.code,
      duration: response.duration === undefined ? undefined : Duration.seconds(response.duration),
      segments: response.segments?.map((segment) => ({
        text: segment.text,
        start: Duration.seconds(segment.start),
        end: Duration.seconds(segment.end)
      })),
      usage: response.usage?.type === "tokens"
        ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
        : response.usage?.type === "duration"
        ? { audioDuration: Duration.seconds(response.usage.seconds) }
        : undefined,
      metadata: { openai: metadata }
    } satisfies TranscriptionModel.ProviderResponse
  })

// -----------------------------------------------------------------------------
// Live
// -----------------------------------------------------------------------------

const decodeEvent = Schema.decodeUnknownOption(Schema.fromJsonString(OpenAiSchema.RealtimeTranscriptionServerEvent))

const realtimeError = (error: {
  readonly type?: string | null | undefined
  readonly code?: string | null | undefined
  readonly message?: string | null | undefined
}): AiError.AiError =>
  AiError.make({
    module: "OpenAiTranscriptionModel",
    method: "transcribeLive",
    reason: AiError.reasonFromHttpStatus({
      status: Errors.statusFromErrorType(error.type),
      description: error.message ?? error.code ?? "Realtime transcription failed",
      metadata: { openai: { errorCode: error.code ?? null, errorType: error.type ?? null, requestId: null } }
    })
  })

const realtimeFormat = (format: TranscriptionModel.AudioFormat): RealtimeInput["format"] | undefined => {
  if (format.channels !== 1) return undefined
  if (format.encoding === "pcm16") {
    return format.sampleRate === 24000 ? { type: "audio/pcm", rate: 24000 } : undefined
  }
  return format.sampleRate === 8000
    ? { type: format.encoding === "mulaw" ? "audio/pcmu" : "audio/pcma" }
    : undefined
}

const commitEventId = "effect_flush_commit"
const clearEventId = "effect_flush_clear"

const makeTranscribeLive = (
  client: OpenAiClient["Service"],
  makeWebSocket: Socket.WebSocketConstructor["Service"],
  options: Options
) =>
<E, R>(
  { audio, format, language }: TranscriptionModel.TranscribeLiveOptions<E, R>
): Stream.Stream<TranscriptionModel.SegmentUpdate, AiError.AiError | E, R> =>
  Stream.callback<TranscriptionModel.SegmentUpdate, AiError.AiError | E, R>(Effect.fnUntraced(function*(output) {
    const config = yield* makeConfig(options)
    const inputFormat = realtimeFormat(format)
    if (inputFormat === undefined) {
      return yield* invalidInput(
        "transcribeLive",
        "OpenAI live transcription takes 24 kHz mono pcm16, or 8 kHz mono mulaw or alaw"
      )
    }
    if (config.model.startsWith("gpt-live-transcribe")) {
      return yield* invalidInput(
        "transcribeLive",
        "Live transcription needs server-side turn detection, which " + config.model + " does not have"
      )
    }

    const openAiConfig = yield* OpenAiConfig.getOrUndefined
    const httpClient = openAiConfig?.transformClient === undefined
      ? client.client
      : openAiConfig.transformClient(client.client)
    const request = yield* httpClient.preprocess(HttpClientRequest.get("/realtime?intent=transcription")).pipe(
      Effect.catchTag("HttpClientError", (error) => Errors.mapHttpClientError(error, "transcribeLive"))
    )
    const url = request.url.replace(/^http/, "ws")
    const dropped = (description: string) =>
      AiError.make({
        module: "OpenAiTranscriptionModel",
        method: "transcribeLive",
        reason: new AiError.NetworkError({
          reason: "TransportError",
          method: request.method,
          url,
          description
        })
      })

    const socket = yield* Socket.makeWebSocket(url, {
      headers: request.headers
    }).pipe(Effect.provideService(Socket.WebSocketConstructor, makeWebSocket))
    const writer = yield* socket.writer
    const { pull } = yield* Effect.mapError(socket.reader, (error) => dropped(error.message))
    const send = (event: object) =>
      Effect.mapError(writer.write(JSON.stringify(event)), (error) => dropped(error.message))

    const sessionLanguage = language ?? config.language
    const session: typeof OpenAiSchema.RealtimeTranscriptionSession.Encoded = {
      type: "transcription",
      audio: {
        input: {
          format: inputFormat,
          transcription: {
            model: config.model,
            ...(sessionLanguage === undefined ? undefined : { language: sessionLanguage }),
            ...(config.prompt === undefined ? undefined : { prompt: config.prompt })
          },
          ...(config.realtime?.noise_reduction === undefined
            ? undefined
            : { noise_reduction: config.realtime.noise_reduction }),
          turn_detection: config.realtime?.turn_detection ?? { type: "server_vad" }
        }
      },
      ...(config.realtime?.include === undefined ? undefined : { include: config.realtime.include })
    }

    const flushTimeout = Duration.fromInputUnsafe(config.realtime?.flushTimeout ?? "30 seconds")
    let commit = "unsent" as "unsent" | "sent" | "committed" | "empty"
    let cleared = false

    // When the audio ends, commit what turn detection has not committed yet.
    // A `committed` event does not name the commit it answers, so a clear
    // follows: client events are answered in order, and its reply means the
    // commit has been answered too.
    yield* Effect.gen(function*() {
      yield* send({ type: "session.update", session })
      yield* Stream.runForEach(
        audio,
        (chunk) => send({ type: "input_audio_buffer.append", audio: Base64.encode(chunk) })
      )
      commit = "sent"
      return yield* send({ type: "input_audio_buffer.commit", event_id: commitEventId }).pipe(
        Effect.andThen(send({ type: "input_audio_buffer.clear", event_id: clearEventId })),
        Effect.andThen(Effect.never),
        Effect.timeoutOrElse({
          duration: flushTimeout,
          orElse: () =>
            Effect.fail(dropped(
              "Transcripts were still due " + Duration.format(flushTimeout) + " after the audio ended"
            ))
        })
      )
    }).pipe(
      Effect.catchCause((cause) => Queue.failCause(output, cause)),
      Effect.forkScoped
    )

    const segments = new Map<string, { text: string; start?: Duration.Duration; end?: Duration.Duration }>()
    // Turns that have started but are not committed, and committed turns
    // without a final transcript.
    const open = new Set<string>()
    const pending = new Set<string>()
    const settled = () =>
      (commit === "empty" || (commit === "committed" && cleared)) && open.size === 0 && pending.size === 0
    const segment = (id: string) => {
      let state = segments.get(id)
      if (state === undefined) {
        state = { text: "" }
        segments.set(id, state)
      }
      return state
    }
    const emit = (id: string, final: boolean) => {
      const { text, start, end } = segment(id)
      Queue.offerUnsafe(output, {
        _tag: "SegmentUpdate",
        id,
        text,
        final,
        ...(start === undefined ? undefined : { start }),
        ...(end === undefined ? undefined : { end })
      })
    }

    const decoder = new TextDecoder()
    while (!settled()) {
      const messages = yield* Effect.mapError(pull, (error) => dropped(error.message))
      for (const message of messages) {
        const event = Option.getOrUndefined(
          decodeEvent(typeof message === "string" ? message : decoder.decode(message))
        )
        if (event === undefined) continue
        switch (event.type) {
          case "input_audio_buffer.speech_started": {
            segment(event.item_id).start = Duration.millis(event.audio_start_ms)
            open.add(event.item_id)
            break
          }
          case "input_audio_buffer.speech_stopped": {
            segment(event.item_id).end = Duration.millis(event.audio_end_ms)
            break
          }
          case "input_audio_buffer.committed": {
            open.delete(event.item_id)
            pending.add(event.item_id)
            if (commit === "sent") {
              // The closing commit takes whatever turn was still open.
              commit = "committed"
              open.clear()
            }
            break
          }
          case "input_audio_buffer.cleared": {
            cleared = true
            break
          }
          case "conversation.item.input_audio_transcription.delta": {
            pending.add(event.item_id)
            segment(event.item_id).text += event.delta ?? ""
            emit(event.item_id, false)
            break
          }
          case "conversation.item.input_audio_transcription.completed": {
            segment(event.item_id).text = event.transcript
            emit(event.item_id, true)
            pending.delete(event.item_id)
            segments.delete(event.item_id)
            break
          }
          case "conversation.item.input_audio_transcription.failed": {
            return yield* realtimeError(event.error)
          }
          case "error": {
            // Turn detection had already committed all the audio.
            if (event.error.event_id === commitEventId && event.error.code === "input_audio_buffer_commit_empty") {
              commit = "empty"
              break
            }
            // The clear only marks the reply to a commit that took audio.
            if (event.error.event_id === clearEventId && commit === "empty") break
            return yield* realtimeError(event.error)
          }
        }
      }
    }
    yield* Queue.end(output)
  }))
