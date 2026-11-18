import { OpenAiClient, OpenAiTranscriptionModel } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer, Redacted, Stream } from "effect"
import { TranscriptionModel } from "effect/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"
import * as Socket from "effect/socket/Socket"

describe("OpenAiTranscriptionModel", () => {
  it.effect("posts a recording as multipart form data and maps the response", () =>
    Effect.gen(function*() {
      let request: HttpClientRequest.HttpClientRequest | undefined

      const response = yield* TranscriptionModel.transcribe({
        audio: { mediaType: "audio/mpeg", data: new Uint8Array([1, 2, 3]) },
        language: "en"
      }).pipe(
        Effect.provide(OpenAiTranscriptionModel.layer({
          model: "whisper-1",
          config: { response_format: "verbose_json", timestamp_granularities: ["segment"] }
        })),
        Effect.provide(makeClient((_) => {
          request = _
          return Effect.succeed(jsonResponse(_, verboseJsonResponse))
        }))
      )

      assert.isDefined(request)
      if (request === undefined) return
      assert.strictEqual(request.url, "https://api.openai.com/v1/audio/transcriptions")
      const body = request.body
      assert(body._tag === "FormData")
      const file = body.formData.get("file")
      assert(file instanceof File)
      assert.strictEqual(file.name, "audio.mp3")
      assert.deepStrictEqual(new Uint8Array(yield* Effect.promise(() => file.arrayBuffer())), new Uint8Array([1, 2, 3]))
      body.formData.delete("file")
      assert.deepStrictEqual(Array.from(body.formData), [
        ["model", "whisper-1"],
        ["response_format", "verbose_json"],
        ["timestamp_granularities[]", "segment"],
        ["language", "en"]
      ])

      assert.strictEqual(response.text, verboseJsonResponse.text)
      assert.strictEqual(response.language, "english")
      assert.deepStrictEqual(response.duration, Duration.seconds(verboseJsonResponse.duration))
      assert.deepStrictEqual(response.segments, [{
        text: verboseJsonResponse.segments[0].text,
        start: Duration.zero,
        end: Duration.seconds(verboseJsonResponse.segments[0].end)
      }])
      assert.deepStrictEqual(response.usage.audioDuration, Duration.seconds(9))
      assert.deepStrictEqual(response.metadata.openai?.segments?.[0].no_speech_prob, 0.00985)
    }))

  it.effect("ignores media type parameters when naming the file", () =>
    Effect.gen(function*() {
      let request: HttpClientRequest.HttpClientRequest | undefined
      yield* TranscriptionModel.transcribe({
        audio: { mediaType: "audio/webm;codecs=opus", data: "AQID" }
      }).pipe(
        Effect.provide(OpenAiTranscriptionModel.layer({ model: "whisper-1" })),
        Effect.provide(makeClient((_) => {
          request = _
          return Effect.succeed(jsonResponse(_, { text: "hello" }))
        }))
      )
      assert(request?.body._tag === "FormData")
      const file = request.body.formData.get("file")
      assert(file instanceof File)
      assert.strictEqual(file.name, "audio.webm")
    }))

  it.effect("fails for a recording given as a URL", () =>
    Effect.gen(function*() {
      const error = yield* TranscriptionModel.transcribe({
        audio: { mediaType: "audio/mpeg", data: new URL("https://example.com/call.mp3") }
      }).pipe(
        Effect.flip,
        Effect.provide(OpenAiTranscriptionModel.layer({ model: "whisper-1" })),
        Effect.provide(makeClient(() => Effect.die("unexpected request")))
      )
      assert.strictEqual(error.reason._tag, "InvalidUserInputError")
    }))

  describe("transcribeLive", () => {
    const format: TranscriptionModel.AudioFormat = { encoding: "pcm16", sampleRate: 24000, channels: 1 }

    it.effect("runs a realtime transcription session", () =>
      Effect.gen(function*() {
        const server = makeServer((frame, socket) => {
          if (frame.type === "input_audio_buffer.clear") socket.receive(...realtimeEvents)
        })

        const updates = yield* TranscriptionModel.transcribeLive({
          audio: Stream.make(new Uint8Array([1, 2]), new Uint8Array([3, 4])),
          format,
          language: "en"
        }).pipe(
          Stream.runCollect,
          Effect.provide(OpenAiTranscriptionModel.layerRealtime({
            model: "gpt-4o-transcribe",
            config: { prompt: "Effect" }
          })),
          Effect.provide(makeClient(() => Effect.die("unexpected request"))),
          Effect.provideService(Socket.WebSocketConstructor, server.connect)
        )

        const start = Duration.millis(320)
        const end = Duration.millis(1840)
        assert.deepStrictEqual(updates, [
          { _tag: "SegmentUpdate", id: "item_003", text: "Hello,", final: false, start, end },
          { _tag: "SegmentUpdate", id: "item_003", text: "Hello, how are", final: false, start, end },
          // The completed transcript replaces the concatenated deltas.
          { _tag: "SegmentUpdate", id: "item_003", text: "Hello, how are you?", final: true, start, end }
        ])

        const socket = server.sockets[0]
        assert.strictEqual(socket.url, "wss://api.openai.com/v1/realtime?intent=transcription")
        assert.strictEqual(socket.headers.authorization, "Bearer sk-test-key")
        assert.isTrue(socket.closed)
        assert.deepStrictEqual(socket.sent, [
          {
            type: "session.update",
            session: {
              type: "transcription",
              audio: {
                input: {
                  format: { type: "audio/pcm", rate: 24000 },
                  transcription: { model: "gpt-4o-transcribe", language: "en", prompt: "Effect" },
                  turn_detection: { type: "server_vad" }
                }
              }
            }
          },
          { type: "input_audio_buffer.append", audio: "AQI=" },
          { type: "input_audio_buffer.append", audio: "AwQ=" },
          { type: "input_audio_buffer.commit", event_id: "effect_flush_commit" },
          { type: "input_audio_buffer.clear", event_id: "effect_flush_clear" }
        ])
      }))

    it.effect("fails with a retryable error when the connection drops", () =>
      Effect.gen(function*() {
        const server = makeServer((frame, socket) => {
          if (frame.type === "input_audio_buffer.append") socket.drop()
        })
        const error = yield* TranscriptionModel.transcribeLive({
          audio: Stream.concat(Stream.make(new Uint8Array([1, 2])), Stream.never),
          format
        }).pipe(
          Stream.runDrain,
          Effect.flip,
          Effect.provide(OpenAiTranscriptionModel.layerRealtime({ model: "gpt-4o-transcribe" })),
          Effect.provide(makeClient(() => Effect.die("unexpected request"))),
          Effect.provideService(Socket.WebSocketConstructor, server.connect)
        )
        assert.strictEqual(error.reason._tag, "NetworkError")
        assert.isTrue(error.isRetryable)
      }))

    it.effect("fails for an audio format the session cannot take", () =>
      Effect.gen(function*() {
        const server = makeServer(() => {})
        const error = yield* TranscriptionModel.transcribeLive({
          audio: Stream.empty,
          format: { encoding: "pcm16", sampleRate: 16000, channels: 1 }
        }).pipe(
          Stream.runDrain,
          Effect.flip,
          Effect.provide(OpenAiTranscriptionModel.layerRealtime({ model: "gpt-4o-transcribe" })),
          Effect.provide(makeClient(() => Effect.die("unexpected request"))),
          Effect.provideService(Socket.WebSocketConstructor, server.connect)
        )
        assert.strictEqual(error.reason._tag, "InvalidUserInputError")
        assert.strictEqual(server.sockets.length, 0)
      }))
  })
})

// -----------------------------------------------------------------------------
// Wire fixtures, in the shapes of OpenAI's API reference
// -----------------------------------------------------------------------------

const verboseJsonResponse = {
  task: "transcribe",
  language: "english",
  duration: 8.470000267028809,
  text: "The beach was a popular spot on a hot summer day. People were swimming in the ocean.",
  segments: [{
    id: 0,
    seek: 0,
    start: 0.0,
    end: 3.319999933242798,
    text: " The beach was a popular spot on a hot summer day.",
    tokens: [50364, 440, 7534, 390, 257, 3743, 4008, 322, 257, 2368, 4266, 786, 13, 50530],
    temperature: 0.0,
    avg_logprob: -0.2860786020755768,
    compression_ratio: 1.2363636493682861,
    no_speech_prob: 0.00985
  }],
  usage: { type: "duration", seconds: 9 }
}

const realtimeEvents: ReadonlyArray<object> = [
  { type: "session.created", event_id: "event_001", session: { type: "transcription", id: "sess_001" } },
  { type: "session.updated", event_id: "event_002", session: { type: "transcription", id: "sess_001" } },
  { type: "input_audio_buffer.speech_started", event_id: "event_003", audio_start_ms: 320, item_id: "item_003" },
  { type: "input_audio_buffer.speech_stopped", event_id: "event_004", audio_end_ms: 1840, item_id: "item_003" },
  { type: "input_audio_buffer.committed", event_id: "event_005", previous_item_id: null, item_id: "item_003" },
  {
    type: "conversation.item.input_audio_transcription.delta",
    event_id: "event_006",
    item_id: "item_003",
    content_index: 0,
    delta: "Hello,"
  },
  {
    type: "conversation.item.input_audio_transcription.delta",
    event_id: "event_007",
    item_id: "item_003",
    content_index: 0,
    delta: " how are"
  },
  // The reply to the closing commit, which found nothing left to commit.
  {
    type: "error",
    event_id: "event_008",
    error: {
      type: "invalid_request_error",
      code: "input_audio_buffer_commit_empty",
      message: "Error committing input audio buffer: buffer too small.",
      param: null,
      event_id: "effect_flush_commit"
    }
  },
  { type: "input_audio_buffer.cleared", event_id: "event_009" },
  {
    type: "conversation.item.input_audio_transcription.completed",
    event_id: "event_010",
    item_id: "item_003",
    content_index: 0,
    transcript: "Hello, how are you?",
    usage: { type: "tokens", total_tokens: 22, input_tokens: 13, output_tokens: 9 }
  }
]

// -----------------------------------------------------------------------------
// Fakes
// -----------------------------------------------------------------------------

class FakeWebSocket implements Socket.WebSocketLike {
  readyState = 1
  closed = false
  readonly sent: Array<any> = []
  readonly headers: Record<string, string>
  private readonly listeners = new Map<string, Set<(event: Socket.WebSocketEvent) => void>>()

  constructor(
    readonly url: string,
    options: Socket.WebSocketConstructorOptions | undefined,
    private readonly onSend: (frame: any, socket: FakeWebSocket) => void
  ) {
    this.headers = typeof options === "object" && !Array.isArray(options) ? options.headers ?? {} : {}
  }

  addEventListener(type: string, listener: (event: Socket.WebSocketEvent) => void) {
    let listeners = this.listeners.get(type)
    if (listeners === undefined) {
      listeners = new Set()
      this.listeners.set(type, listeners)
    }
    listeners.add(listener)
  }

  removeEventListener(type: string, listener: (event: Socket.WebSocketEvent) => void) {
    this.listeners.get(type)?.delete(listener)
  }

  send(data: string | Uint8Array) {
    const frame = JSON.parse(data as string)
    this.sent.push(frame)
    this.onSend(frame, this)
  }

  close() {
    this.closed = true
    this.readyState = 3
  }

  receive(...frames: ReadonlyArray<object>) {
    for (const frame of frames) this.emit("message", { data: JSON.stringify(frame) })
  }

  drop() {
    this.readyState = 3
    this.emit("close", { code: 1006 })
  }

  private emit(type: string, event: Socket.WebSocketEvent) {
    for (const listener of Array.from(this.listeners.get(type) ?? [])) listener(event)
  }
}

const makeServer = (onSend: (frame: any, socket: FakeWebSocket) => void) => {
  const sockets: Array<FakeWebSocket> = []
  const connect: Socket.WebSocketConstructor["Service"] = (url, options) => {
    const socket = new FakeWebSocket(url, options, onSend)
    sockets.push(socket)
    return socket
  }
  return { sockets, connect }
}

const makeClient = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>
) =>
  OpenAiClient.layer({ apiKey: Redacted.make("sk-test-key") }).pipe(
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

const jsonResponse = (
  request: HttpClientRequest.HttpClientRequest,
  body: unknown
): HttpClientResponse.HttpClientResponse =>
  HttpClientResponse.fromWeb(
    request,
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  )
