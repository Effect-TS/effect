import { type Generated, OpenAiTool } from "@effect/ai-openai"
import type { Tool } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("OpenAiTool", () => {
  it("distinguishes completed file searches from failed and unfinished searches", () => {
    const fileSearch = OpenAiTool.FileSearch({ vector_store_ids: ["vs_123"] })

    type Failure = {
      readonly status: "in_progress" | "searching" | "incomplete" | "failed"
      readonly queries: Generated.FileSearchToolCall["queries"]
      readonly results?: Exclude<Generated.FileSearchToolCall["results"], undefined>
    }

    expect<Tool.Failure<typeof fileSearch>>().type.toBe<Failure>()
    expect<Tool.Success<typeof fileSearch>["status"]>().type.toBe<"completed">()
  })

  it("distinguishes completed web searches from failed and unfinished searches for both tools", () => {
    const webSearch = OpenAiTool.WebSearch({})
    const preview = OpenAiTool.WebSearchPreview({})

    type Failure = {
      readonly action: Generated.WebSearchToolCall["action"]
      readonly status: "in_progress" | "searching" | "failed"
    }

    expect<Tool.Failure<typeof webSearch>>().type.toBe<Failure>()
    expect<Tool.Failure<typeof preview>>().type.toBe<Failure>()
    expect<Tool.Success<typeof webSearch>["status"]>().type.toBe<"completed">()
    expect<Tool.Success<typeof preview>["status"]>().type.toBe<"completed">()
  })
})
