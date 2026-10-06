import { OpenAiTelemetry } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Context, Option, Tracer } from "effect"

describe("OpenAiTelemetry", () => {
  it("writes current OpenAI GenAI attribute keys", () => {
    const span = new Tracer.NativeSpan({
      name: "test",
      parent: Option.none(),
      annotations: Context.empty(),
      links: [],
      startTime: 0n,
      kind: "client",
      sampled: true
    })
    OpenAiTelemetry.addGenAIAnnotations(span, {
      provider: { name: "openai" },
      openai: {
        request: { responseFormat: "json_schema", serviceTier: "auto" },
        response: { serviceTier: "default", systemFingerprint: "fp_1" }
      }
    })
    const attributes = Object.fromEntries(span.attributes)
    assert.deepStrictEqual(attributes, {
      "gen_ai.provider.name": "openai",
      "gen_ai.output.type": "json",
      "openai.request.service_tier": "auto",
      "openai.response.service_tier": "default",
      "openai.response.system_fingerprint": "fp_1"
    })
  })
})
