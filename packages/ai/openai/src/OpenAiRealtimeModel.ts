/**
 * OpenAI Realtime sessions over scoped WebSocket connections.
 *
 * Connections use the configured `OpenAiClient` URL and authentication, finish
 * the session configuration handshake before accepting commands, and normalize
 * audio, transcripts and completed function calls to `RealtimeModel` events.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as AiError from "effect/ai/AiError"
import * as AiModel from "effect/ai/Model"
import * as RealtimeModel from "effect/ai/RealtimeModel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"
import * as Generated from "./Generated.ts"
import * as Protocol from "./internal/realtime.ts"
import { OpenAiClient } from "./OpenAiClient.ts"
import { OpenAiConfig } from "./OpenAiConfig.ts"

/**
 * Known OpenAI realtime model identifiers. Constructors also accept custom model
 * identifiers and pinned snapshots.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Model = NonNullable<typeof Generated.RealtimeSessionCreateRequestGA.Encoded["model"]>

type SessionRequest = typeof Generated.RealtimeSessionCreateRequestGA.Encoded
type AudioOutput = NonNullable<NonNullable<SessionRequest["audio"]>["output"]>

/**
 * Scoped OpenAI realtime defaults. Input transcription is optional and uses a
 * separate transcription model from the speech-to-speech model.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class Config extends Context.Service<Config, {
  readonly model?: Model | undefined
  readonly voice?: AudioOutput["voice"] | undefined
  readonly inputFormat?: RealtimeModel.AudioFormat | undefined
  readonly outputFormat?: RealtimeModel.AudioFormat | undefined
  readonly transcriptionModel?: typeof Generated.AudioTranscription.Encoded["model"] | undefined
  readonly maxOutgoingBufferBytes?: number | undefined
}>()("@effect/ai-openai/OpenAiRealtimeModel/Config") {}

/**
 * Creates an `AiModel` that provides OpenAI realtime conversations.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const model = (
  model: Model,
  config?: Omit<typeof Config.Service, "model"> | undefined
): AiModel.Model<"openai", RealtimeModel.RealtimeModel, OpenAiClient | Socket.WebSocketConstructor> =>
  AiModel.make("openai", model, layer({ model, config }))

/**
 * Creates an OpenAI realtime model using the configured client and WebSocket
 * constructor. Each `connect` acquires a separate conversation.
 *
 * **Details**
 *
 * PCM defaults to signed 16-bit little-endian mono audio at 24 kHz. G.711 uses
 * mono audio at 8 kHz. Connections wait up to ten seconds for the session
 * configuration acknowledgement. Manual turns are the default.
 *
 * **Gotchas**
 *
 * The WebSocket constructor must support handshake headers, as the Node and
 * Bun constructor layers do. This is a server-side transport; browser WebRTC,
 * microphones, playback, reconnect and tool execution are separate concerns.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<RealtimeModel.RealtimeModel, never, OpenAiClient | Socket.WebSocketConstructor> {
  const client = yield* OpenAiClient
  const constructor = yield* Socket.WebSocketConstructor
  return RealtimeModel.make({
    connect: Effect.fnUntraced(function*(settings) {
      const scoped = yield* Effect.serviceOption(Config)
      const config = { model: options.model, ...options.config, ...Option.getOrUndefined(scoped) }
      const inputFormat = config.inputFormat ?? pcm
      const outputFormat = config.outputFormat ?? pcm
      for (const format of [inputFormat, outputFormat]) {
        if (format.channels !== 1 || format.sampleRate !== (format.encoding === "pcm_s16le" ? 24_000 : 8_000)) {
          return yield* Protocol.invalidInput("OpenAI Realtime requires mono PCM at 24 kHz or G.711 at 8 kHz")
        }
      }
      const overrides = yield* OpenAiConfig.getOrUndefined
      const http = overrides?.transformClient?.(client.client) ?? client.client
      const request = yield* http.preprocess(HttpClientRequest.post("/realtime")).pipe(
        Effect.mapError(() => Protocol.invalidInput("Could not prepare OpenAI realtime connection"))
      )
      const url = new URL(request.url.replace(/^http/, "ws"))
      url.searchParams.set("model", config.model ?? options.model)
      const maxEventBytes = settings.maxEventBytes ?? 262_144
      const maxOutgoingBufferBytes = config.maxOutgoingBufferBytes ?? 524_288
      if (!Number.isSafeInteger(maxOutgoingBufferBytes) || maxOutgoingBufferBytes <= 0) {
        return yield* Protocol.invalidInput("maxOutgoingBufferBytes must be a positive safe integer")
      }
      const scope = yield* Scope.fork(yield* Effect.scope)
      const open = Effect.gen(function*() {
        let transport: Socket.WebSocketLike | undefined
        const socket = yield* Socket.makeWebSocket(url.toString(), {
          headers: request.headers,
          highWaterMark: maxEventBytes * 2,
          openTimeout: "10 seconds"
        }).pipe(Effect.provideService(Socket.WebSocketConstructor, (url, options) => {
          transport = constructor(url, options)
          return transport
        }))
        const reader = yield* socket.reader.pipe(Effect.mapError(socketError))
        const decoder = new TextDecoder("utf-8", { fatal: true })
        const decode = Protocol.makeDecoder(maxEventBytes)
        let closing = false
        const read = Effect.fnUntraced(function*() {
          const batch = yield* reader.pull.pipe(Effect.mapError(socketError))
          const messages: Array<Schema.JsonObject> = []
          for (const message of batch) {
            if (typeof message !== "string" && message.byteLength > maxEventBytes) {
              return yield* Protocol.invalidResponse("Realtime WebSocket message exceeds the event limit")
            }
            const value = typeof message === "string" ? message : yield* Effect.try({
              try: () => decoder.decode(message),
              catch: () => Protocol.invalidResponse("Realtime message is not valid UTF-8")
            })
            messages.push(yield* Protocol.decodeWire(value, maxEventBytes))
          }
          return messages
        })
        const send = (message: string) =>
          Effect.try({
            try: () => {
              const ws = transport
              if (closing || ws === undefined || ws.readyState !== 1) {
                throw Protocol.invalidInput("Realtime session is closed")
              }
              if (!("bufferedAmount" in ws) || typeof ws.bufferedAmount !== "number") {
                throw Protocol.invalidInput("Realtime WebSocket constructor must expose bufferedAmount")
              }
              if (ws.bufferedAmount + encoder.encode(message).byteLength > maxOutgoingBufferBytes) {
                throw AiError.make({
                  module: "OpenAiRealtimeModel",
                  method: "send",
                  reason: new AiError.NetworkError({
                    reason: "TransportError",
                    method: "GET",
                    url: url.toString(),
                    description: "Realtime outgoing buffer limit exceeded"
                  })
                })
              }
              // No reconnect latch: state, budget and send share one synchronous boundary.
              ws.send(message)
            },
            catch: (cause) =>
              AiError.isAiError(cause) ? cause : AiError.make({
                module: "OpenAiRealtimeModel",
                method: "send",
                reason: new AiError.NetworkError({
                  reason: "TransportError",
                  method: "GET",
                  url: url.toString(),
                  description: "Failed to send realtime command",
                  cause
                })
              })
          })
        const session = yield* Schema.decodeUnknownEffect(Generated.RealtimeSessionCreateRequestGA)({
          type: "realtime",
          model: config.model,
          output_modalities: ["audio"],
          ...(settings.instructions === undefined ? {} : { instructions: settings.instructions }),
          audio: {
            input: {
              format: wireFormat(inputFormat),
              ...(config.transcriptionModel === undefined
                ? {}
                : { transcription: { model: config.transcriptionModel } }),
              turn_detection: settings.turnDetection === "server" ?
                { type: "server_vad" }
                : settings.turnDetection === "semantic"
                ? { type: "semantic_vad" }
                : null
            },
            output: { format: wireFormat(outputFormat), voice: settings.voice ?? config.voice ?? "marin" }
          },
          tools: settings.tools?.map((tool) => ({
            type: "function",
            name: tool.name,
            ...(tool.description === undefined ? {} : { description: tool.description }),
            parameters: tool.parameters
          })) ?? []
        }).pipe(Effect.mapError((error) => Protocol.invalidInput(error.message)))
        yield* send(JSON.stringify({ type: "session.update", session }))
        const pending: Array<RealtimeModel.Event> = []
        yield* Effect.gen(function*() {
          let ready = false
          while (!ready) {
            for (const event of yield* read()) {
              if (event.type === "session.updated") ready = true
              else if (event.type === "error") return yield* (yield* Protocol.providerError(event))
              else {
                const normalized = yield* decode(event)
                if (Option.isSome(normalized)) pending.push(normalized.value)
                if (pending.length > (settings.maxBufferedEvents ?? 64)) {
                  return yield* Protocol.invalidResponse("Realtime events exceeded the initialization buffer limit")
                }
              }
            }
          }
        }).pipe(Effect.timeoutOrElse({
          duration: "10 seconds",
          orElse: () =>
            Effect.fail(AiError.make({
              module: "OpenAiRealtimeModel",
              method: "connect",
              reason: new AiError.NetworkError({
                reason: "TransportError",
                method: "GET",
                url: url.toString(),
                description: "Timed out waiting for realtime session configuration"
              })
            }))
        }))
        const events = Stream.fromIterable(pending).pipe(Stream.concat(
          Stream.fromEffectRepeat(read()).pipe(
            Stream.flatMap(Stream.fromIterable),
            Stream.mapEffect(decode),
            Stream.filter(Option.isSome),
            Stream.map((event) => event.value)
          )
        ))
        return {
          inputFormat,
          outputFormat,
          send: (command: RealtimeModel.Command) => {
            const encoded = Protocol.encodeCommand(command)
            if (encoded.length > maxEventBytes || encoder.encode(encoded).byteLength > maxEventBytes) {
              return Effect.fail(Protocol.invalidInput("Realtime command exceeds the wire event limit"))
            }
            return send(encoded)
          },
          events: events.pipe(Stream.catch((error) => closing ? Stream.empty : Stream.fail(error))),
          close: Effect.suspend(() => {
            if (closing) return Effect.void
            closing = true
            return Scope.close(scope, Exit.void)
          })
        } satisfies RealtimeModel.ProviderConnection
      })
      return yield* Scope.provide(open, scope).pipe(Effect.onError(() => Scope.close(scope, Exit.void)))
    })
  })
})

/**
 * Creates a layer providing OpenAI realtime conversations.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layer = (options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<RealtimeModel.RealtimeModel, never, OpenAiClient | Socket.WebSocketConstructor> =>
  Layer.effect(RealtimeModel.RealtimeModel, make(options))

/**
 * Applies OpenAI realtime defaults within an effect or session acquisition.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.3
 */
export const withConfigOverride: {
  (config: typeof Config.Service): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, config: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, config: typeof Config.Service) =>
    Effect.flatMap(
      Effect.serviceOption(Config),
      (previous) => Effect.provideService(effect, Config, { ...Option.getOrUndefined(previous), ...config })
    )
)

const pcm: RealtimeModel.AudioFormat = { encoding: "pcm_s16le", sampleRate: 24_000, channels: 1 }
const encoder = new TextEncoder()
const wireFormat = (format: RealtimeModel.AudioFormat): typeof Generated.RealtimeAudioFormats.Encoded =>
  format.encoding === "pcm_s16le"
    ? { type: "audio/pcm", rate: 24_000 }
    : { type: format.encoding === "g711_ulaw" ? "audio/pcmu" : "audio/pcma" }
const socketError = (error: Socket.SocketError): AiError.AiError =>
  AiError.make({
    module: "OpenAiRealtimeModel",
    method: "connect",
    reason: new AiError.NetworkError({
      reason: "TransportError",
      method: "GET",
      url: "/realtime",
      description: error.message
    })
  })
