import type { OpenAiLanguageModel } from "@effect/ai-openai"
import type { Context } from "effect"
import type { Response } from "effect/ai"
import { describe, expect, it } from "tstyche"

describe("OpenAiLanguageModel", () => {
  it("accepts an optional nullable comparison response ID", () => {
    type Config = Context.Service.Shape<typeof OpenAiLanguageModel.Config>
    type CacheOptions = NonNullable<Config["prompt_cache_options"]>

    expect<Pick<CacheOptions, "comparison_response_id">>().type.toBe<{
      readonly comparison_response_id?: string | null | undefined
    }>()
  })

  it("narrows cache misses in finish metadata", () => {
    type Metadata = NonNullable<Response.FinishPartMetadata["openai"]>
    type Diagnostics = NonNullable<Metadata["promptCacheDiagnostics"]>

    expect<Diagnostics["type"]>().type.toBe<
      "cache_hit" | "cache_miss" | "comparison_response_not_found" | "unavailable"
    >()
    const diagnostics = {} as Diagnostics
    if (diagnostics.type === "cache_miss") {
      expect(diagnostics.cache_missed_tokens).type.toBe<number>()
      expect(diagnostics.comparison_reusable_tokens).type.toBe<number | undefined>()
    }
  })
})
