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
    type Miss = Extract<Diagnostics, { readonly type: "cache_miss" }>

    expect<Diagnostics["type"]>().type.toBe<
      "cache_hit" | "cache_miss" | "comparison_response_not_found" | "unavailable"
    >()
    expect<Pick<Miss, "cache_missed_tokens" | "comparison_reusable_tokens">>().type.toBe<{
      readonly cache_missed_tokens: number
      readonly comparison_reusable_tokens?: number
    }>()
  })
})
