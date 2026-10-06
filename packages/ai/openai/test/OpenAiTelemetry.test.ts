import { OpenAiTelemetry } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("OpenAiTelemetry", () => {
  it.effect("writes current OpenAI GenAI attribute keys", () =>
    Effect.gen(function*() {
      const span = yield* Effect.currentSpan
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
    }).pipe(Effect.withSpan("test")))

  it.effect("omits gen_ai.output.type for unknown response formats", () =>
    Effect.gen(function*() {
      const span = yield* Effect.currentSpan
      OpenAiTelemetry.addGenAIAnnotations(span, { openai: { request: { responseFormat: "custom" } } })
      assert.isFalse(span.attributes.has("gen_ai.output.type"))
    }).pipe(Effect.withSpan("test")))
})
