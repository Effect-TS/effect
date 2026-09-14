import { type Generated, OpenAiTool } from "@effect/ai-openai"
import type { Tool } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("OpenAiTool", () => {
  it("distinguishes completed file searches from failed and unfinished searches", () => {
    const fileSearch = OpenAiTool.FileSearch({ vector_store_ids: ["vs_123"] })

    type Failure = {
      readonly status: "in_progress" | "searching" | "incomplete" | "failed"
      readonly queries: Generated.FileSearchToolCall["queries"]
      readonly results: Exclude<Generated.FileSearchToolCall["results"], undefined>
    }

    expect<Tool.Failure<typeof fileSearch>>().type.toBe<Failure>()
    expect<Tool.Success<typeof fileSearch>>().type.toBe<Omit<Failure, "status"> & { readonly status: "completed" }>()
  })

  it("distinguishes completed web searches from failed and unfinished searches", () => {
    const webSearch = OpenAiTool.WebSearch({})

    type Failure = {
      readonly action: Generated.WebSearchToolCall["action"]
      readonly status: "in_progress" | "searching" | "failed"
    }

    expect<Tool.Failure<typeof webSearch>>().type.toBe<Failure>()
    expect<Tool.Success<typeof webSearch>["status"]>().type.toBe<"completed">()
  })

  it("distinguishes URL sources from named API sources", () => {
    const webSearch = OpenAiTool.WebSearch({})
    const preview = OpenAiTool.WebSearchPreview({})
    type Sources<Action> = Extract<Action, { type: "search" }> extends { readonly sources?: infer S } ? S : never
    type Expected = ReadonlyArray<
      | { readonly type: "url"; readonly url: string }
      | { readonly type: "api"; readonly name: string }
    >

    expect<Sources<Tool.Parameters<typeof webSearch>["action"]>>().type.toBe<Expected>()
    expect<Sources<Tool.Success<typeof webSearch>["action"]>>().type.toBe<Expected>()
    expect<Sources<Tool.Failure<typeof webSearch>["action"]>>().type.toBe<Expected>()
    expect<Sources<Tool.Success<typeof preview>["action"]>>().type.toBe<Expected>()
  })
})
