import { Generated } from "@effect/ai-openrouter"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Schema } from "effect"

describe("Generated", () => {
  it("decodes nullable generation statistics", () => {
    const response = {
      data: {
        id: "gen-test",
        upstream_id: null,
        total_cost: 0.003294,
        cache_discount: null,
        upstream_inference_cost: null,
        created_at: "2026-07-24T12:00:00Z",
        model: "openrouter/auto",
        app_id: null,
        streamed: null,
        cancelled: null,
        provider_name: null,
        latency: null,
        moderation_latency: null,
        generation_time: null,
        finish_reason: null,
        tokens_prompt: null,
        tokens_completion: null,
        native_tokens_prompt: null,
        native_tokens_completion: null,
        native_tokens_completion_images: null,
        native_tokens_reasoning: null,
        native_tokens_cached: null,
        num_media_prompt: null,
        num_input_audio_prompt: null,
        num_media_completion: null,
        num_search_results: null,
        origin: "https://openrouter.ai/",
        usage: 0.003294,
        is_byok: false,
        native_finish_reason: null,
        external_user: null,
        api_type: null,
        router: null,
        provider_responses: null
      }
    }

    deepStrictEqual(Schema.decodeUnknownSync(Generated.GetGeneration200)(response), response)
  })

  it("preserves streamed usage cost fields", () => {
    const usage = {
      completion_tokens: 11,
      prompt_tokens: 7,
      total_tokens: 18,
      cost: 0.000365,
      is_byok: false,
      prompt_tokens_details: {
        cached_tokens: 0,
        cache_write_tokens: 0
      }
    }

    deepStrictEqual(Schema.decodeUnknownSync(Generated.ChatGenerationTokenUsage)(usage), usage)
  })
})
