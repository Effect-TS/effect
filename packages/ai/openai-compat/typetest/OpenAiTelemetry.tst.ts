import type { OpenAiTelemetryAttributes } from "@effect/ai-openai-compat/OpenAiTelemetry"
import { describe, expect, it } from "tstyche"

describe("OpenAI-compatible telemetry", () => {
  it("uses the emitted response namespace for response attributes", () => {
    expect({
      "gen_ai.openai.response.system_fingerprint": "fp"
    } as const).type.toBeAssignableTo<OpenAiTelemetryAttributes>()

    expect({
      "gen_ai.openai.request.system_fingerprint": "fp"
    } as const).type.not.toBeAssignableTo<OpenAiTelemetryAttributes>()
  })
})
