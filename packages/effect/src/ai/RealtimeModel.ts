/**
 * Defines the provider-neutral service for bidirectional audio conversations.
 *
 * A realtime session accepts audio and conversation commands while producing
 * audio, transcript, response and tool-call events. Sessions own their provider
 * resources through `Scope`. Playback, tool execution, persistence and business
 * actions remain application responsibilities.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import type * as JsonSchema from "../JsonSchema.ts"
import * as Queue from "../Queue.ts"
import type * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as AiError from "./AiError.ts"

// =============================================================================
// Service
// =============================================================================

/**
 * Service key for connecting to a realtime model.
 *
 * @see {@link connect} for acquiring a session through the current service
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export const RealtimeModel: Context.Service<RealtimeModel, RealtimeModel> = Context.Service("effect/ai/RealtimeModel")

/**
 * Brand type for realtime model implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.3
 */
export type TypeId = "~effect/ai/RealtimeModel"

/**
 * Brand carried by realtime model implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.3
 */
export const TypeId: TypeId = "~effect/ai/RealtimeModel"

/**
 * Provider-neutral realtime model service.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export interface RealtimeModel {
  readonly [TypeId]: TypeId
  /**
   * Acquires a configured, ready session whose resources belong to the current scope.
   */
  readonly connect: (options?: ConnectOptions | undefined) => Effect.Effect<Session, AiError.AiError, Scope.Scope>
}

// =============================================================================
// Models
// =============================================================================

/**
 * Raw audio format negotiated for a realtime session. PCM samples are signed
 * 16-bit little-endian; G.711 samples use their named companding encoding.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface AudioFormat {
  readonly encoding: "pcm_s16le" | "g711_ulaw" | "g711_alaw"
  readonly sampleRate: number
  readonly channels: number
}

/**
 * Function definition advertised to a realtime provider. Definitions do not
 * execute handlers or grant permission to perform their operations.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ToolDefinition {
  readonly name: string
  readonly description?: string | undefined
  readonly parameters: JsonSchema.JsonSchema
}

/**
 * Session configuration shared by model implementations and their providers.
 *
 * **Details**
 *
 * Manual turns are the default: committing input does not create a response.
 * Automatic turn detection is provider-dependent. Queue bounds apply to the
 * session event channel; providers and playback devices have separate buffers.
 *
 * @stability unstable
 * @category options
 * @since 4.1.3
 */
export interface ConnectOptions {
  readonly instructions?: string | undefined
  readonly voice?: string | undefined
  readonly tools?: ReadonlyArray<ToolDefinition> | undefined
  readonly turnDetection?: "manual" | "server" | "semantic" | undefined
  readonly maxBufferedEvents?: number | undefined
  readonly maxBufferedAudioBytes?: number | undefined
  readonly maxEventBytes?: number | undefined
}

/**
 * Commands sent to a realtime conversation. Optional event identifiers let a
 * provider correlate command failures without replaying the command.
 *
 * **Gotchas**
 *
 * Cancelling generation does not stop a speaker or undo tools. Stop and clear
 * local playback separately, then truncate the interrupted item to its played
 * duration when the provider requires conversation synchronization.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Command =
  & (
    | { readonly type: "audio-append"; readonly data: Uint8Array }
    | { readonly type: "audio-commit" }
    | { readonly type: "audio-clear" }
    | { readonly type: "text"; readonly text: string; readonly role?: "user" | "assistant" | "system" | undefined }
    | { readonly type: "response-create" }
    | { readonly type: "response-cancel"; readonly responseId?: string | undefined }
    | {
      readonly type: "item-truncate"
      readonly itemId: string
      readonly contentIndex: number
      readonly audioEndMs: number
    }
    | { readonly type: "tool-result"; readonly callId: string; readonly output: Schema.Json }
  )
  & { readonly eventId?: string | undefined }

/**
 * Reliable events from a realtime conversation. Transcript updates replace the
 * previous text for the same item, with increasing revisions. Generated
 * transcripts do not establish what a caller heard. Tool calls require
 * application resolution.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Event =
  | { readonly type: "command-error"; readonly eventId?: string | undefined; readonly error: AiError.AiError }
  | { readonly type: "response-start"; readonly responseId: string }
  | {
    readonly type: "audio-delta"
    readonly responseId: string
    readonly itemId: string
    readonly contentIndex: number
    readonly delta: Uint8Array
  }
  | { readonly type: "audio-end"; readonly responseId: string; readonly itemId: string; readonly contentIndex: number }
  | {
    readonly type: "transcript"
    readonly itemId: string
    readonly responseId?: string | undefined
    readonly role: "user" | "assistant"
    readonly text: string
    readonly revision: number
    readonly isFinal: boolean
  }
  | { readonly type: "text-delta"; readonly responseId: string; readonly itemId: string; readonly delta: string }
  | {
    readonly type: "response-end"
    readonly responseId: string
    readonly status: "completed" | "cancelled" | "failed" | "incomplete"
  }
  | {
    readonly type: "tool-call"
    readonly responseId: string
    readonly itemId: string
    readonly callId: string
    readonly name: string
    readonly parameters: Schema.Json
  }
  | { readonly type: "input-speech-start"; readonly itemId: string; readonly audioStartMs: number }
  | { readonly type: "input-speech-end"; readonly itemId: string; readonly audioEndMs: number }
  | { readonly type: "input-committed"; readonly itemId: string }
  | {
    readonly type: "item-truncated"
    readonly itemId: string
    readonly contentIndex: number
    readonly audioEndMs: number
  }

/**
 * Scoped realtime conversation with one reliable event consumer.
 *
 * **Details**
 *
 * `await` reports provider completion or background failure independently of
 * event consumption. `close` is idempotent and ends the stream. Cancelling the
 * event consumer closes the session. No command or tool is automatically retried.
 *
 * **Gotchas**
 *
 * Audio buffers are transferred to the consumer and must not be mutated or
 * recycled while retained. Output chunks need not coincide with playback
 * frames. The application owns playback acknowledgements and interruption.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Session {
  readonly inputFormat: AudioFormat
  readonly outputFormat: AudioFormat
  readonly send: (command: Command) => Effect.Effect<void, AiError.AiError>
  readonly events: Stream.Stream<Event, AiError.AiError>
  readonly await: Effect.Effect<void, AiError.AiError>
  readonly close: Effect.Effect<void, AiError.AiError>
}

/**
 * Provider connection acquired after its configuration handshake. The provider
 * bounds raw transport buffers and validates its wire protocol before emitting
 * normalized events. `close` must release suspended reads and be idempotent.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ProviderConnection {
  readonly inputFormat: AudioFormat
  readonly outputFormat: AudioFormat
  readonly send: (command: Command) => Effect.Effect<void, AiError.AiError>
  readonly events: Stream.Stream<Event, AiError.AiError>
  readonly close: Effect.Effect<void, AiError.AiError>
}

// =============================================================================
// Constructors
// =============================================================================

/**
 * Creates a realtime model from a provider connection factory.
 *
 * **Details**
 *
 * Each connection has a single event reader and explicit queue bounds. A slow
 * consumer fails the session instead of dropping events or accumulating blocked
 * producer fibers. Defaults allow 64 events, 256 KiB of buffered audio and
 * 256 KiB per normalized event. Transport limits remain the provider's responsibility.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = (options: {
  readonly connect: (options: ConnectOptions) => Effect.Effect<ProviderConnection, AiError.AiError, Scope.Scope>
}): RealtimeModel =>
  RealtimeModel.of({
    [TypeId]: TypeId,
    connect: Effect.fnUntraced(function*(settings = {}) {
      const capacity = settings.maxBufferedEvents ?? 64
      const maxAudio = settings.maxBufferedAudioBytes ?? 262_144
      const maxEvent = settings.maxEventBytes ?? 262_144
      for (const value of [capacity, maxAudio, maxEvent]) {
        if (!Number.isSafeInteger(value) || value <= 0) {
          return yield* invalidInput("connect", "Realtime buffer limits must be positive safe integers")
        }
      }
      const providerScope = yield* Scope.fork(yield* Effect.scope)
      const provider = yield* Scope.provide(options.connect(settings), providerScope).pipe(
        Effect.onError((cause) => Scope.close(providerScope, Exit.failCause(cause)))
      )
      // EOF, explicit close and failures share the same provider cleanup.
      const release = yield* Effect.cached(provider.close.pipe(Effect.ensuring(Scope.close(providerScope, Exit.void))))
      const queue = yield* Queue.bounded<Event, AiError.AiError | Cause.Done>(capacity)
      const outcome = yield* Deferred.make<void, AiError.AiError>()
      let closed = false
      let claimed = false
      let audioBytes = 0
      let failure: Cause.Cause<AiError.AiError> | undefined

      const close = Effect.uninterruptible(Effect.gen(function*() {
        if (closed) return
        closed = true
        yield* Queue.clear(queue).pipe(Effect.ignore)
        audioBytes = 0
        yield* Queue.end(queue)
        const exit = yield* Effect.exit(release)
        yield* Deferred.done(outcome, exit)
        if (Exit.isFailure(exit)) return yield* Effect.failCause(exit.cause)
      }))
      const fail = Effect.fnUntraced(function*(cause: Cause.Cause<AiError.AiError>) {
        if (closed) return
        failure = cause
        closed = true
        yield* Queue.clear(queue).pipe(Effect.ignore)
        audioBytes = 0
        yield* Queue.failCause(queue, cause)
        yield* Deferred.failCause(outcome, cause)
        yield* release.pipe(Effect.ignore)
      })
      yield* Effect.addFinalizer(() => close.pipe(Effect.ignore))
      const reader = yield* Stream.runForEach(provider.events, (event) =>
        Effect.suspend(() => {
          if (closed) return Effect.void
          const bytes = eventSize(event)
          const deltaBytes = event.type === "audio-delta" ? event.delta.buffer.byteLength : 0
          if (bytes > maxEvent || audioBytes + deltaBytes > maxAudio || !Queue.offerUnsafe(queue, event)) {
            return Effect.fail(invalidResponse("events", "Realtime event buffer limit exceeded"))
          }
          audioBytes += deltaBytes
          return Effect.void
        })).pipe(
          Effect.onExit((exit) =>
            Exit.isFailure(exit)
              ? fail(exit.cause)
              : Effect.gen(function*() {
                if (closed) return
                const cleanup = yield* Effect.exit(release)
                if (Exit.isFailure(cleanup)) return yield* fail(cleanup.cause)
                closed = true
                yield* Queue.end(queue)
                yield* Deferred.succeed(outcome, undefined)
              })
          ),
          Effect.forkScoped
        )

      const events = Stream.unwrap(Effect.suspend(() => {
        if (claimed) return Effect.fail(invalidInput("events", "Realtime events already have a consumer"))
        claimed = true
        return Effect.succeed(
          Stream.fromEffectRepeat(Queue.take(queue)).pipe(
            Stream.mapEffect((event) =>
              Effect.suspend(() => {
                if (failure !== undefined) return Effect.failCause(failure)
                if (event.type === "audio-delta") audioBytes -= event.delta.buffer.byteLength
                return Effect.succeed(event)
              })
            ),
            Stream.ensuring(close.pipe(Effect.ignore))
          )
        )
      }))

      return {
        inputFormat: provider.inputFormat,
        outputFormat: provider.outputFormat,
        send: Effect.fnUntraced(function*(command) {
          if (closed) return yield* invalidInput("send", "Realtime session is closed")
          if (
            command.type === "audio-append" && (command.data.byteLength === 0 || command.data.byteLength > maxEvent)
          ) {
            return yield* invalidInput("send", "Audio input must be nonempty and fit the configured event limit")
          }
          if (
            command.type === "item-truncate" &&
            (!Number.isSafeInteger(command.contentIndex) || command.contentIndex < 0 ||
              !Number.isSafeInteger(command.audioEndMs) || command.audioEndMs < 0)
          ) {
            return yield* invalidInput("send", "Truncation index and duration must be nonnegative safe integers")
          }
          yield* provider.send(command).pipe(Effect.onError((cause: Cause.Cause<AiError.AiError>) =>
            cause.reasons.every((reason) =>
                Cause.isFailReason(reason) && reason.error.reason._tag === "InvalidUserInputError"
              )
              ? Effect.void
              : fail(cause)
          ))
        }),
        events,
        await: Deferred.await(outcome),
        close: close.pipe(Effect.ensuring(Fiber.interrupt(reader)))
      }
    })
  })

/**
 * Acquires a realtime session from the current model service.
 *
 * @stability unstable
 * @category accessors
 * @since 4.1.3
 */
export const connect = (
  options?: ConnectOptions | undefined
): Effect.Effect<Session, AiError.AiError, RealtimeModel | Scope.Scope> =>
  RealtimeModel.use((model) => model.connect(options))

const invalidInput = (method: string, description: string): AiError.AiError =>
  AiError.make({
    module: "RealtimeModel",
    method,
    reason: new AiError.InvalidUserInputError({ description })
  })
const invalidResponse = (method: string, description: string): AiError.AiError =>
  AiError.make({
    module: "RealtimeModel",
    method,
    reason: new AiError.InvalidResponseError({ description })
  })
const eventSize = (event: Event): number => {
  // Three bytes per UTF-16 code unit conservatively bounds UTF-8 without
  // allocating encoded copies of item/response IDs on every audio frame.
  let bytes = event.type.length * 3
  if ("responseId" in event) bytes += (event.responseId?.length ?? 0) * 3
  if ("itemId" in event) bytes += event.itemId.length * 3
  switch (event.type) {
    case "audio-delta":
      return bytes + event.delta.buffer.byteLength
    case "command-error":
      return bytes + ((event.eventId?.length ?? 0) + event.error.message.length) * 3
    case "transcript":
      return bytes + event.text.length * 3
    case "text-delta":
      return bytes + event.delta.length * 3
    case "tool-call":
      return bytes + (event.callId.length + event.name.length + JSON.stringify(event.parameters).length) * 3
    default:
      return bytes
  }
}
