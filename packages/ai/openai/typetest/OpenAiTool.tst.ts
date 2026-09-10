import { type Generated, OpenAiTool } from "@effect/ai-openai"
import type { Tool } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("OpenAiTool", () => {
  it("preserves failed and unfinished file search details in its failure type", () => {
    const fileSearch = OpenAiTool.FileSearch({ vector_store_ids: ["vs_123"] })

    type Failure = {
      readonly status: "in_progress" | "searching" | "incomplete" | "failed"
      readonly queries: Generated.FileSearchToolCall["queries"]
      readonly results?: Exclude<Generated.FileSearchToolCall["results"], undefined>
    }

    expect<Tool.Failure<typeof fileSearch>>().type.toBe<Failure>()
  })

  it("preserves failed and unfinished web search details in both tools' failure types", () => {
    const webSearch = OpenAiTool.WebSearch({})
    const preview = OpenAiTool.WebSearchPreview({})

    type Failure = {
      readonly action: Generated.WebSearchToolCall["action"]
      readonly status: "in_progress" | "searching" | "failed"
    }

    expect<Tool.Failure<typeof webSearch>>().type.toBe<Failure>()
    expect<Tool.Failure<typeof preview>>().type.toBe<Failure>()
  })
})
