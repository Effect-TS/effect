import type { Schedule, Stream } from "effect"
import { type AiError, TranscriptionModel } from "effect/ai"
import { describe, expect, it } from "tstyche"

declare const audio: Stream.Stream<Uint8Array, "AudioError", "Microphone">
declare const schedule: Schedule.Schedule<number>
declare const strategy: "sliding" | "error"

const options = {
  audio,
  format: { encoding: "pcm16", sampleRate: 24000, channels: 1 },
  maxDuration: "30 seconds",
  schedule
} as const

describe("TranscriptionModel", () => {
  it("transcribeLive emits segment updates only", () => {
    expect(TranscriptionModel.transcribeLive(options)).type.toBe<
      Stream.Stream<
        TranscriptionModel.SegmentUpdate,
        AiError.AiError | "AudioError",
        "Microphone" | TranscriptionModel.TranscriptionModel
      >
    >()
  })

  describe("transcribeLiveBuffered", () => {
    it("emits segment updates only with the error strategy", () => {
      expect(TranscriptionModel.transcribeLiveBuffered({ ...options, strategy: "error" })).type.toBe<
        Stream.Stream<
          TranscriptionModel.SegmentUpdate,
          AiError.AiError | "AudioError",
          "Microphone" | TranscriptionModel.TranscriptionModel
        >
      >()
    })

    it("adds the gap notice with the sliding strategy", () => {
      expect(TranscriptionModel.transcribeLiveBuffered({ ...options, strategy: "sliding" })).type.toBe<
        Stream.Stream<
          TranscriptionModel.SegmentUpdate | TranscriptionModel.AudioDiscarded,
          AiError.AiError | "AudioError",
          "Microphone" | TranscriptionModel.TranscriptionModel
        >
      >()
    })

    it("adds the gap notice when the strategy is not known statically", () => {
      expect(TranscriptionModel.transcribeLiveBuffered({ ...options, strategy })).type.toBe<
        Stream.Stream<
          TranscriptionModel.SegmentUpdate | TranscriptionModel.AudioDiscarded,
          AiError.AiError | "AudioError",
          "Microphone" | TranscriptionModel.TranscriptionModel
        >
      >()
    })

    it("requires a strategy", () => {
      expect(TranscriptionModel.transcribeLiveBuffered).type.not.toBeCallableWith(options)
    })
  })
})
