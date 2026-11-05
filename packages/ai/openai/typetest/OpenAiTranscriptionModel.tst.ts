import type { Generated, OpenAiTranscriptionModel } from "@effect/ai-openai"
import { describe, expect, it } from "tstyche"

describe("OpenAiTranscriptionModel", () => {
  it("uses the generated recorded-audio transcription model type", () => {
    expect<OpenAiTranscriptionModel.Model>().type.toBe<
      (typeof Generated.CreateTranscriptionRequestFormData.Encoded)["model"]
    >()
  })
})
