import { type Generated, OpenAiSpeechModel } from "@effect/ai-openai"
import { describe, expect, it } from "tstyche"

describe("OpenAiSpeechModel", () => {
  it("uses the generated speech model type, including custom model identifiers", () => {
    expect<OpenAiSpeechModel.Model>().type.toBe<(typeof Generated.CreateSpeechRequestJson.Encoded)["model"]>()
  })

  it("accepts generated custom voices and response formats", () => {
    expect(OpenAiSpeechModel.layer).type.toBeCallableWith({
      model: "custom-speech-model",
      config: { voice: { id: "voice_123" }, response_format: "pcm" }
    })
  })
})
