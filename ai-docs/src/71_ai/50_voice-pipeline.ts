/**
 * @title Composing a recorded voice pipeline
 *
 * Transcribe a WAV recording, answer it with LanguageModel, and synthesize the
 * answer using SpeechModel. Keep provider configuration separate from the
 * application service so each stage can be replaced independently.
 */
import {
  OpenAiClient,
  OpenAiClientGenerated,
  OpenAiLanguageModel,
  OpenAiSpeechModel,
  OpenAiTranscriptionModel
} from "@effect/ai-openai"
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Config, Context, Effect, FileSystem, Layer } from "effect"
import { type AiError, LanguageModel, SpeechModel, TranscriptionModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"

// Each client supplies the authentication and HTTP behavior its adapters use.
// Model configuration types come from the generated OpenAI request schemas.
const ClientsLayer = Layer.merge(
  OpenAiClient.layerConfig({ apiKey: Config.Redacted("OPENAI_API_KEY") }),
  OpenAiClientGenerated.layerConfig({ apiKey: Config.Redacted("OPENAI_API_KEY") })
).pipe(Layer.provide(FetchHttpClient.layer))

// Provide the individual service layers rather than merging .model metadata:
// these stages use different model names within the same application service.
const ModelsLayer = Layer.mergeAll(
  OpenAiTranscriptionModel.layer({ model: "gpt-4o-mini-transcribe" }),
  OpenAiLanguageModel.layer({ model: "gpt-4.1-mini" }),
  OpenAiSpeechModel.layer({
    model: "gpt-4o-mini-tts",
    config: { voice: "alloy", response_format: "wav" }
  })
).pipe(Layer.provide(ClientsLayer))

export class VoiceAssistant extends Context.Service<VoiceAssistant, {
  reply(recording: Uint8Array): Effect.Effect<{
    readonly transcript: string
    readonly answer: string
    readonly speech: SpeechModel.GenerateSpeechResponse
  }, AiError.AiError>
}>()("docs/VoiceAssistant") {
  static readonly layer = Layer.effect(
    VoiceAssistant,
    Effect.gen(function*() {
      const transcription = yield* TranscriptionModel.TranscriptionModel
      const language = yield* LanguageModel.LanguageModel
      const speech = yield* SpeechModel.SpeechModel

      const reply = Effect.fn("VoiceAssistant.reply")(function*(recording: Uint8Array) {
        // This request uploads a complete recording. The filename and media type
        // describe the actual container; changing them does not encode raw PCM.
        const transcript = yield* transcription.transcribe({
          audio: recording,
          mediaType: "audio/wav",
          fileName: "question.wav"
        })

        // Empty transcription is valid for silence. Avoid inventing a user
        // request or spending another model call when no speech was recognized.
        const answer = transcript.text.trim().length === 0
          ? "I could not hear a question. Please try again."
          : (yield* language.generateText({
            prompt: [
              {
                role: "system",
                content: "Answer the spoken question briefly, in language suitable for speaking aloud."
              },
              { role: "user", content: transcript.text }
            ]
          })).text

        return {
          transcript: transcript.text,
          answer,
          speech: yield* speech.generateSpeech({ text: answer })
        }
      })

      return VoiceAssistant.of({ reply })
    })
  ).pipe(Layer.provide(ModelsLayer))
}

// Configure OPENAI_API_KEY and VOICE_INPUT_FILE=/path/to/question.wav, then run:
// node ai-docs/src/71_ai/50_voice-pipeline.ts
export const program = Effect.gen(function*() {
  const assistant = yield* VoiceAssistant
  const fs = yield* FileSystem.FileSystem
  const input = yield* Config.String("VOICE_INPUT_FILE")
  const output = yield* Config.String("VOICE_OUTPUT_FILE").pipe(Config.withDefault("voice-answer.wav"))
  const recording = yield* fs.readFile(input)
  const result = yield* assistant.reply(recording)
  yield* fs.writeFile(output, result.speech.audio)
  yield* Effect.logInfo("Spoken answer saved", { output })
}).pipe(
  Effect.provide(Layer.merge(VoiceAssistant.layer, NodeServices.layer))
)

// This is a complete-recording workflow, not live microphone upload. Use
// RealtimeModel for a persistent bidirectional conversation. Neither path
// automatically retries tool actions or grants authorization for side effects.
NodeRuntime.runMain(program)
