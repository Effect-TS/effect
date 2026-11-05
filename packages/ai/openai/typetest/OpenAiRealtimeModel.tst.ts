import { type Generated, OpenAiRealtimeModel } from "@effect/ai-openai"
import { Effect } from "effect"
import { describe, expect, it } from "tstyche"

describe("OpenAiRealtimeModel", () => {
  it("uses the generated realtime model type", () => {
    expect<OpenAiRealtimeModel.Model>().type.toBe<
      NonNullable<typeof Generated.RealtimeSessionCreateRequestGA.Encoded["model"]>
    >()
  })

  it("satisfies the configuration service requirement with scoped overrides", () => {
    const configured = OpenAiRealtimeModel.withConfigOverride(
      Effect.service(OpenAiRealtimeModel.Config),
      { model: "custom-realtime-model", voice: "marin" }
    )
    expect(configured).type.toBe<Effect.Effect<typeof OpenAiRealtimeModel.Config.Service>>()
  })
})
