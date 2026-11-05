/**
 * @title Generating and streaming speech
 *
 * Configure an OpenAI speech model, expose it through an application service,
 * and stream encoded audio to a file without collecting the response in memory.
 */
import { OpenAiClientGenerated, OpenAiSpeechModel } from "@effect/ai-openai"
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Config, Context, Effect, FileSystem, Layer, Stream } from "effect"
import { type AiError, SpeechModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"

// Speech and recorded transcription use the generated OpenAI client. The
// language model and Realtime adapters use OpenAiClient instead. Both clients
// read the same server-side environment variable; never put a key in source.
const ClientLayer = OpenAiClientGenerated.layerConfig({
  apiKey: Config.Redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(FetchHttpClient.layer))

export class Announcements extends Context.Service<Announcements, {
  synthesize(text: string): Effect.Effect<SpeechModel.GenerateSpeechResponse, AiError.AiError>
  stream(text: string): Stream.Stream<Uint8Array, AiError.AiError>
}>()("docs/Announcements") {
  static readonly layer = Layer.effect(
    Announcements,
    Effect.gen(function*() {
      const model = yield* SpeechModel.SpeechModel

      // Complete generation is useful when an application needs a single audio
      // asset, such as a short announcement to cache or upload.
      const synthesize = Effect.fn("Announcements.synthesize")(function*(text: string) {
        return yield* model.generateSpeech({ text })
      })

      // Streaming starts when consumed. The start part declares the media type;
      // delta parts carry bytes and the end part confirms successful completion.
      // Here the layer fixes MP3, so the consumer can write an .mp3 file directly.
      const stream = (text: string) =>
        model.streamSpeech({ text }).pipe(
          Stream.filter((part) => part.type === "speech-delta"),
          Stream.map((part) => part.delta)
        )

      return Announcements.of({ synthesize, stream })
    })
  ).pipe(
    Layer.provide(OpenAiSpeechModel.layer({
      model: "gpt-4o-mini-tts",
      config: { voice: "alloy", response_format: "mp3" }
    })),
    Layer.provide(ClientLayer)
  )
}

// Run with OPENAI_API_KEY configured in your environment:
// node ai-docs/src/71_ai/40_speech.ts
export const program = Effect.gen(function*() {
  const announcements = yield* Announcements
  const fs = yield* FileSystem.FileSystem
  const text = yield* Config.String("VOICE_TEXT").pipe(
    Config.withDefault("Your appointment is confirmed for tomorrow at ten in the morning.")
  )
  const output = yield* Config.String("VOICE_OUTPUT_FILE").pipe(Config.withDefault("announcement.mp3"))

  // The filesystem sink writes incrementally and closes on failure or
  // interruption. Audio chunks are parts of one encoded stream; individual
  // chunks need not be complete MP3 frames or independently playable files.
  yield* announcements.stream(text).pipe(Stream.run(fs.sink(output)))
  yield* Effect.logInfo("Speech saved", { output })
}).pipe(
  Effect.provide(Layer.merge(Announcements.layer, NodeServices.layer))
)

// Raw PCM output needs an explicit sample format and sample rate at playback.
// Selecting "wav" or "mp3" produces a container/encoding a normal player can
// identify. Neither SpeechModel nor this example manages a speaker device.
NodeRuntime.runMain(program)
