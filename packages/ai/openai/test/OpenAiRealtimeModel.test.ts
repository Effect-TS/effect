import * as OpenAiClient from "@effect/ai-openai/OpenAiClient"
import * as OpenAiConfig from "@effect/ai-openai/OpenAiConfig"
import * as OpenAiRealtimeModel from "@effect/ai-openai/OpenAiRealtimeModel"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Redacted, Stream } from "effect"
import * as RealtimeModel from "effect/ai/RealtimeModel"
import { HttpClient, HttpClientRequest } from "effect/http"
import * as Socket from "effect/socket/Socket"
import { WS } from "vitest-websocket-mock"

const url = "wss://realtime.example.test/v1/realtime?model=gpt-realtime-mini"

describe("OpenAiRealtimeModel", { concurrent: false }, () => {
  it.live("waits for session.updated, preserves pre-ready events, and defaults to manual turns", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const acquisition = yield* Effect.forkScoped(RealtimeModel.connect({ instructions: "Be concise" }))
        const update = yield* nextMessage(server)
        assert.strictEqual(update.type, "session.update")
        assert.strictEqual(update.session.instructions, "Be concise")
        assert.strictEqual(update.session.audio.input.turn_detection, null)
        assert.isUndefined(update.session.audio.input.transcription)
        assert.deepStrictEqual(update.session.audio.output.format, { type: "audio/pcm", rate: 24000 })
        assert.strictEqual(update.session.audio.output.voice, "marin")
        server.send({ type: "session.created", session: { id: "session" } })
        server.send({ type: "input_audio_buffer.committed", item_id: "early" })
        yield* Effect.yieldNow
        assert.isUndefined(acquisition.pollUnsafe())
        server.send({ type: "session.updated", session: { id: "session" } })
        const session = yield* Fiber.join(acquisition)
        assert.deepStrictEqual(session.inputFormat, { encoding: "pcm_s16le", sampleRate: 24000, channels: 1 })
        const events = yield* Stream.runCollect(session.events.pipe(Stream.take(1)))
        assert.deepStrictEqual(events, [{ type: "input-committed", itemId: "early" }])
        yield* Effect.promise(() => server.closed)
      })
    ))

  it.live("uses configured URL, authentication, scoped defaults, VAD and tool schemas", () => {
    let capturedOptions: Socket.WebSocketConstructorOptions | undefined
    const customUrl = "wss://realtime.example.test/v1/realtime?model=custom%2Fsnapshot"
    return withServer(
      (server) =>
        Effect.gen(function*() {
          const acquisition = yield* Effect.forkScoped(RealtimeModel.connect({
            voice: "cedar",
            turnDetection: "semantic",
            tools: [{ name: "lookup", description: "Find an item", parameters: { type: "object", properties: {} } }]
          }))
          const update = yield* nextMessage(server)
          assert.strictEqual(update.session.model, "custom/snapshot")
          assert.strictEqual(update.session.audio.output.voice, "cedar")
          assert.deepStrictEqual(update.session.audio.input.format, { type: "audio/pcmu" })
          assert.deepStrictEqual(update.session.audio.output.format, { type: "audio/pcma" })
          assert.deepStrictEqual(update.session.audio.input.transcription, { model: "gpt-4o-mini-transcribe" })
          assert.deepStrictEqual(update.session.audio.input.turn_detection, { type: "semantic_vad" })
          assert.deepStrictEqual(update.session.tools, [{
            type: "function",
            name: "lookup",
            description: "Find an item",
            parameters: { type: "object", properties: {} }
          }])
          assert.isObject(capturedOptions)
          if (typeof capturedOptions !== "object" || Array.isArray(capturedOptions) || capturedOptions === null) return
          assert.strictEqual(capturedOptions.headers?.authorization, "Bearer test-key")
          assert.strictEqual(capturedOptions.headers?.["x-test-config"], "scoped")
          server.send({ type: "session.updated" })
          const session = yield* Fiber.join(acquisition)
          yield* session.close
        }).pipe(
          OpenAiRealtimeModel.withConfigOverride({
            model: "custom/snapshot",
            voice: "nova",
            transcriptionModel: "gpt-4o-mini-transcribe",
            inputFormat: { encoding: "g711_ulaw", sampleRate: 8000, channels: 1 },
            outputFormat: { encoding: "g711_alaw", sampleRate: 8000, channels: 1 }
          }),
          OpenAiConfig.withClientTransform(
            HttpClient.mapRequest(HttpClientRequest.setHeader("x-test-config", "scoped"))
          )
        ),
      customUrl,
      (_url, options) => {
        capturedOptions = options
        return new globalThis.WebSocket(_url)
      }
    )
  })

  it.live("sends encoded commands and closes the socket idempotently", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const session = yield* ready(server)
        yield* session.send({ type: "audio-append", data: new Uint8Array([0, 255, 1]), eventId: "audio-1" })
        assert.deepStrictEqual(yield* nextMessage(server), {
          event_id: "audio-1",
          type: "input_audio_buffer.append",
          audio: "AP8B"
        })
        yield* session.close
        yield* session.close
        yield* session.await
        yield* Effect.promise(() => server.closed)
      })
    ))

  it.live("normalizes audio and completed calls while ignoring interrupted argument completion", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const session = yield* ready(server)
        const consumer = yield* Effect.forkScoped(Stream.runCollect(session.events.pipe(Stream.take(3))))
        server.send({
          type: "response.function_call_arguments.done",
          response_id: "r",
          call_id: "bad",
          name: "lookup",
          arguments: "{}"
        })
        server.send({
          type: "response.output_item.done",
          response_id: "r",
          item: { type: "function_call", status: "incomplete" }
        })
        server.send({
          type: "response.output_audio.delta",
          response_id: "r",
          item_id: "i",
          content_index: 0,
          delta: "AQID"
        })
        server.send({
          type: "response.output_item.done",
          response_id: "r",
          item: {
            type: "function_call",
            status: "completed",
            id: "tool",
            call_id: "call",
            name: "lookup",
            arguments: "{\"q\":\"pizza\"}"
          }
        })
        server.send({ type: "response.done", response: { id: "r", status: "completed" } })
        assert.deepStrictEqual(yield* Fiber.join(consumer), [
          { type: "audio-delta", responseId: "r", itemId: "i", contentIndex: 0, delta: new Uint8Array([1, 2, 3]) },
          {
            type: "tool-call",
            responseId: "r",
            itemId: "tool",
            callId: "call",
            name: "lookup",
            parameters: { q: "pizza" }
          },
          { type: "response-end", responseId: "r", status: "completed" }
        ])
      })
    ))

  for (
    const [name, event] of [
      ["malformed event", {
        type: "response.output_audio.delta",
        delta: "invalid!",
        response_id: "r",
        item_id: "i",
        content_index: 0
      }],
      ["oversized event", { type: "provider.future", extra: "x".repeat(1100) }]
    ] as const
  ) {
    it.live(`fails the session and closes the connection for ${name}`, () =>
      withServer((server) =>
        Effect.gen(function*() {
          const session = yield* ready(server, { maxEventBytes: 1024 })
          server.send(event)
          const error = yield* session.await.pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "InvalidResponseError")
          yield* Effect.promise(() => server.closed)
        })
      ))
  }

  it.live("fails initialization on a provider error and releases the socket", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const acquisition = yield* Effect.forkScoped(RealtimeModel.connect().pipe(Effect.flip))
        yield* nextMessage(server)
        server.send({ type: "error", error: { message: "Invalid key", code: "invalid_api_key" } })
        const error = yield* Fiber.join(acquisition)
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        yield* Effect.promise(() => server.closed)
      })
    ))

  it.live("closes an acquisition cancelled before configuration acknowledgement", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const acquisition = yield* Effect.forkScoped(RealtimeModel.connect())
        yield* nextMessage(server)
        yield* Fiber.interrupt(acquisition)
        yield* Effect.promise(() => server.closed)
      })
    ))

  it.live("treats invalid-request errors as fatal while session configuration is pending", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const acquisition = yield* Effect.forkScoped(RealtimeModel.connect().pipe(Effect.flip))
        yield* nextMessage(server)
        server.send({
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "Session settings rejected",
            event_id: "settings-1"
          }
        })
        const error = yield* Fiber.join(acquisition)
        assert.strictEqual(error.reason._tag, "InvalidRequestError")
        yield* Effect.promise(() => server.closed)
      })
    ))

  it.live("rejects oversized encoded commands without poisoning a usable session", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const session = yield* ready(server, { maxEventBytes: 512 })
        const error = yield* session.send({ type: "audio-append", data: new Uint8Array(400) }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidUserInputError")
        yield* session.send({ type: "audio-clear" })
        assert.deepStrictEqual(yield* nextMessage(server), { type: "input_audio_buffer.clear" })
        yield* session.close
      })
    ))

  it.live("bounds events arriving before configuration acknowledgement", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const acquisition = yield* Effect.forkScoped(RealtimeModel.connect({ maxBufferedEvents: 1 }).pipe(Effect.flip))
        yield* nextMessage(server)
        server.send({ type: "input_audio_buffer.committed", item_id: "first" })
        server.send({ type: "input_audio_buffer.committed", item_id: "second" })
        const error = yield* Fiber.join(acquisition)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
        yield* Effect.promise(() => server.closed)
      })
    ))

  it.live("enforces the outgoing byte budget against the transport's queued bytes", () => {
    let bufferedAmount = 0
    return withServer(
      (server) =>
        Effect.gen(function*() {
          const session = yield* ready(server)
          const commandBytes = new TextEncoder().encode(JSON.stringify({ type: "input_audio_buffer.clear" })).byteLength
          bufferedAmount = 1024 - commandBytes
          yield* session.send({ type: "audio-clear" })
          assert.deepStrictEqual(yield* nextMessage(server), { type: "input_audio_buffer.clear" })
          bufferedAmount++
          const error = yield* session.send({ type: "audio-clear" }).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "NetworkError")
          if (error.reason._tag === "NetworkError") {
            assert.strictEqual(error.reason.description, "Realtime outgoing buffer limit exceeded")
          }
          const outcome = yield* session.await.pipe(Effect.flip)
          assert.strictEqual(outcome.reason._tag, "NetworkError")
          yield* Effect.promise(() => server.closed)
        }).pipe(OpenAiRealtimeModel.withConfigOverride({ maxOutgoingBufferBytes: 1024 })),
      url,
      (url) => {
        const socket = new globalThis.WebSocket(url)
        Object.defineProperty(socket, "bufferedAmount", { get: () => bufferedAmount })
        return socket
      }
    )
  })

  it.live("fails send promptly after the transport closes before its close event is processed", () => {
    let socket: WebSocket | undefined
    return withServer(
      (server) =>
        Effect.gen(function*() {
          const session = yield* ready(server)
          assert.isDefined(socket)
          socket!.close()
          const error = yield* session.send({ type: "response-create" }).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "InvalidUserInputError")
          yield* session.close
          yield* Effect.promise(() => server.closed)
        }),
      url,
      (url) => {
        socket = new globalThis.WebSocket(url)
        return socket
      }
    )
  })

  it.live("preserves recoverable provider command errors and accepts the next command", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const session = yield* ready(server)
        const consumer = yield* Effect.forkScoped(Stream.runCollect(session.events.pipe(Stream.take(3))))
        yield* session.send({ type: "response-cancel", responseId: "missing", eventId: "cancel-1" })
        yield* nextMessage(server)
        server.send({
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "No active response",
            code: null,
            event_id: "cancel-1"
          }
        })
        server.send({
          type: "error",
          error: {
            type: "server_error",
            message: "Command could not be processed",
            event_id: "tool-1"
          }
        })
        yield* session.send({ type: "response-create" })
        assert.deepStrictEqual(yield* nextMessage(server), { type: "response.create" })
        server.send({ type: "response.created", response: { id: "next" } })
        const events = yield* Fiber.join(consumer)
        assert.strictEqual(events[0].type, "command-error")
        assert.strictEqual(events[1].type, "command-error")
        if (events[0].type !== "command-error" || events[1].type !== "command-error") return
        assert.strictEqual(events[0].eventId, "cancel-1")
        assert.strictEqual(events[0].error.reason._tag, "InvalidRequestError")
        assert.strictEqual(events[1].eventId, "tool-1")
        assert.strictEqual(events[1].error.reason._tag, "InternalProviderError")
        assert.deepStrictEqual(events[2], { type: "response-start", responseId: "next" })
      })
    ))

  it.live("reports unexpected provider disconnects through the independent session outcome", () =>
    withServer((server) =>
      Effect.gen(function*() {
        const session = yield* ready(server)
        server.close({ code: 1011, reason: "Provider failed", wasClean: false })
        const error = yield* session.await.pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "NetworkError")
      })
    ))

  it.effect("rejects unsupported audio negotiation before creating a socket", () =>
    Effect.gen(function*() {
      let opened = false
      const error = yield* RealtimeModel.connect().pipe(
        Effect.flip,
        OpenAiRealtimeModel.withConfigOverride({
          inputFormat: { encoding: "pcm_s16le", sampleRate: 16000, channels: 1 }
        }),
        Effect.provide(OpenAiRealtimeModel.layer({ model: "gpt-realtime-mini" })),
        Effect.provide(clientLayer),
        Effect.provideService(Socket.WebSocketConstructor, () => {
          opened = true
          throw new Error("Should not open")
        })
      )
      assert.strictEqual(error.reason._tag, "InvalidUserInputError")
      assert.strictEqual(opened, false)
    }))
})

const clientLayer = OpenAiClient.layer({
  apiKey: Redacted.make("test-key"),
  apiUrl: "https://realtime.example.test/v1"
}).pipe(
  Layer.provide(Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die("Unexpected HTTP request"))))
)

const withServer = <A, E, R>(
  run: (server: WS) => Effect.Effect<A, E, R>,
  address = url,
  constructor: typeof Socket.WebSocketConstructor.Service = (url) => new globalThis.WebSocket(url)
) =>
  Effect.gen(function*() {
    const server = yield* Effect.acquireRelease(
      Effect.sync(() => new WS(address, { jsonProtocol: true })),
      (server) => Effect.sync(() => server.close())
    )
    return yield* run(server)
  }).pipe(
    Effect.provide(OpenAiRealtimeModel.layer({ model: "gpt-realtime-mini" })),
    Effect.provide(clientLayer),
    Effect.provideService(Socket.WebSocketConstructor, (url, options) => {
      const socket = constructor(url, options)
      // mock-socket does not implement this standard WebSocket transport metric.
      if (!("bufferedAmount" in socket)) {
        Object.defineProperty(socket, "bufferedAmount", { value: 0, writable: true, configurable: true })
      }
      return socket
    }),
    Effect.timeout("3 seconds")
  )

const nextMessage = (server: WS) =>
  Effect.promise(() => server.nextMessage).pipe(Effect.map((message) => message as any))

const ready = Effect.fnUntraced(function*(server: WS, options?: RealtimeModel.ConnectOptions) {
  const acquisition = yield* Effect.forkScoped(RealtimeModel.connect(options))
  yield* nextMessage(server)
  server.send({ type: "session.updated" })
  return yield* Fiber.join(acquisition)
})
