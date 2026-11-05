/**
 * @title Connecting to realtime voice models
 *
 * Acquire a scoped OpenAI Realtime session, send explicit conversation commands,
 * and consume its reliable event stream. Save a spoken response as raw PCM
 * without buffering the whole answer or imposing a playback-duration limit.
 */
import { OpenAiClient, OpenAiRealtimeModel } from "@effect/ai-openai"
import { NodeRuntime, NodeServices, NodeWS } from "@effect/platform-node"
import { type Cause, Config, Context, Effect, FileSystem, Layer, type PlatformError, Stream } from "effect"
import { AiError, RealtimeModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"

const ClientLayer = OpenAiClient.layerConfig({
  apiKey: Config.Redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(FetchHttpClient.layer))

// The WebSocket constructor must support authentication headers. NodeWS also
// supports pausing incoming reads at the transport high-water mark. The model,
// voice and transcription settings use the generated OpenAI request types.
const ModelLayer = OpenAiRealtimeModel.layer({
  model: "gpt-realtime",
  config: { voice: "marin", transcriptionModel: "gpt-4o-mini-transcribe" }
}).pipe(
  Layer.provide(ClientLayer),
  Layer.provide(NodeWS.layerWebSocketConstructor)
)

export class SpokenReplies extends Context.Service<SpokenReplies, {
  save(
    prompt: string,
    outputFile: string
  ): Effect.Effect<void, AiError.AiError | PlatformError.PlatformError | Cause.TimeoutError>
}>()("docs/SpokenReplies") {
  static readonly layer = Layer.effect(
    SpokenReplies,
    Effect.gen(function*() {
      const model = yield* RealtimeModel.RealtimeModel
      const fs = yield* FileSystem.FileSystem

      const save = Effect.fn("SpokenReplies.save")(
        function*(prompt: string, outputFile: string) {
          // connect resolves after configuration is acknowledged. Its Scope owns
          // the reader and socket, including when a request fails or is cancelled.
          const session = yield* model.connect({
            instructions: "Answer briefly and clearly, using natural spoken language.",
            turnDetection: "manual",
            maxBufferedEvents: 64,
            maxBufferedAudioBytes: 262_144,
            maxEventBytes: 262_144
          })
          let completed = false

          // Consume events while sending commands. Effect.all propagates errors
          // and interrupts siblings; discarding forkScoped fibers would hide them.
          yield* Effect.all([
            Effect.gen(function*() {
              yield* session.send({ type: "text", text: prompt, eventId: "question" })
              yield* session.send({ type: "response-create", eventId: "answer" })
            }),
            session.events.pipe(
              // This example owns one manual response and advertises no tools.
              // Inspect the terminal event before ending the consumer so a failed
              // response is not mistaken for a successfully saved audio file.
              Stream.tap((event) => {
                if (event.type === "command-error") return Effect.fail(event.error)
                if (event.type === "response-end" && event.status !== "completed") {
                  return Effect.fail(AiError.make({
                    module: "SpokenReplies",
                    method: "save",
                    reason: new AiError.InvalidOutputError({ description: `Response ended with ${event.status}` })
                  }))
                }
                if (event.type === "response-end") completed = true
                return Effect.void
              }),
              Stream.takeUntil((event) => event.type === "response-end"),
              Stream.filter((event) => event.type === "audio-delta"),
              Stream.map((event) => event.delta),
              Stream.run(fs.sink(outputFile))
            )
          ], { concurrency: "unbounded", discard: true })
          // A clean transport EOF is not proof that the requested reply finished.
          if (!completed) {
            return yield* AiError.make({
              module: "SpokenReplies",
              method: "save",
              reason: new AiError.InvalidOutputError({ description: "Session ended before the response completed" })
            })
          }
        },
        Effect.scoped,
        Effect.timeout("60 seconds")
      )

      return SpokenReplies.of({ save })
    })
  ).pipe(Layer.provide(ModelLayer))
}

// Configure OPENAI_API_KEY, then run:
// node ai-docs/src/71_ai/60_realtime.ts
// The output is headerless signed PCM16LE, mono, 24 kHz, not a WAV file.
export const program = Effect.gen(function*() {
  const replies = yield* SpokenReplies
  const prompt = yield* Config.String("VOICE_TEXT").pipe(
    Config.withDefault("Explain structured concurrency in two sentences.")
  )
  const output = yield* Config.String("VOICE_OUTPUT_FILE").pipe(Config.withDefault("realtime-answer.pcm"))
  yield* replies.save(prompt, output)
  yield* Effect.logInfo("Realtime speech saved", { output })
}).pipe(
  Effect.provide(SpokenReplies.layer.pipe(Layer.provideMerge(NodeServices.layer)))
)

// For a microphone in manual mode, send audio-append with sample-aligned bytes
// matching session.inputFormat, then audio-commit, then response-create. Commit
// alone does not request an answer. Server/semantic turn detection can instead
// let the provider start responses; do not also create those responses manually.
//
// session.events has one consumer. Dispatch audio, transcript revisions and
// tool calls from that consumer; use session.await to observe independent
// background failure. Tools are advertised definitions, not automatic execution:
// Tool.getJsonSchema and Toolkit.handle let an application reuse its typed tools.
//
// Provider audio generation may outrun hearing. A player should bound its PCM
// queue separately and schedule only a short horizon, rather than cancelling
// ordinary replies because more than a few seconds were generated in advance.
// On input-speech-start, revoke queued/in-flight local playback even after a
// response-end. Reject late audio for that response. Send item-truncate with the
// item/content IDs and the actually played duration; response-cancel alone does
// not stop the speaker. Device acknowledgements, codecs and rendering remain
// responsibilities of the application's audio adapter.
NodeRuntime.runMain(program)
