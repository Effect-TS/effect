import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Telemetry } from "effect/ai"

describe("Telemetry", () => {
  describe("addGenAIAnnotations", () => {
    for (const options of [{ provider: { name: "openai" } }, { system: "openai" }] as const) {
      it.effect(`maps ${"provider" in options ? "provider" : "deprecated system"} to gen_ai.provider.name`, () =>
        Effect.gen(function*() {
          const span = yield* Effect.currentSpan
          Telemetry.addGenAIAnnotations(span, options)
          assert.deepStrictEqual(Object.fromEntries(span.attributes), { "gen_ai.provider.name": "openai" })
        }).pipe(Effect.withSpan("test")))
    }

    it.effect("prefers provider.name over the deprecated system option", () =>
      Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        Telemetry.addGenAIAnnotations(span, { provider: { name: "anthropic" }, system: "openai" })
        assert.deepStrictEqual(Object.fromEntries(span.attributes), { "gen_ai.provider.name": "anthropic" })
      }).pipe(Effect.withSpan("test")))

    for (
      const [system, expected] of [
        ["az.ai.openai", "azure.ai.openai"],
        ["az.ai.inference", "azure.ai.inference"],
        ["gemini", "gcp.gemini"],
        ["vertex_ai", "gcp.vertex_ai"],
        ["xai", "x_ai"],
        ["cohere", "cohere"]
      ] as const
    ) {
      it.effect(`maps legacy ${system} to ${expected}`, () =>
        Effect.gen(function*() {
          const span = yield* Effect.currentSpan
          Telemetry.addGenAIAnnotations(span, { system })
          assert.deepStrictEqual(Object.fromEntries(span.attributes), { "gen_ai.provider.name": expected })
        }).pipe(Effect.withSpan("test")))
    }
  })
})
