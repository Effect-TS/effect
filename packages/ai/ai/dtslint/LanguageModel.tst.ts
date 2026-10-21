import * as LanguageModel from "@effect/ai/LanguageModel"
import * as Tool from "@effect/ai/Tool"
import type * as Toolkit from "@effect/ai/Toolkit"
import type { Effect } from "effect"
import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

const _Transform = Tool.make("Transform", {
  parameters: { count: Schema.NumberFromString }
})

declare const toolkit: Toolkit.WithHandler<{ readonly Transform: typeof _Transform }>
declare const flag: boolean
declare const options: {
  readonly prompt: string
  readonly toolkit: typeof toolkit
  readonly disableToolCallResolution?: boolean
}

declare const toolCallParams: <Tools extends Record<string, Tool.Any>, Encoded extends boolean>(
  effect: Effect.Effect<LanguageModel.GenerateTextResponse<Tools, Encoded>, any, any>
) => LanguageModel.GenerateTextResponse<Tools, Encoded>["toolCalls"][number]["params"]

describe("LanguageModel", () => {
  it("infers tool call params from disableToolCallResolution", () => {
    expect(toolCallParams(LanguageModel.generateText({ prompt: "", toolkit }))).type.toBe<
      { readonly count: number }
    >()
    expect(toolCallParams(LanguageModel.generateText({ prompt: "", toolkit, disableToolCallResolution: false })))
      .type.toBe<{ readonly count: number }>()
    expect(toolCallParams(LanguageModel.generateText({ prompt: "", toolkit, disableToolCallResolution: true })))
      .type.toBe<{ readonly count: string }>()
    expect(toolCallParams(LanguageModel.generateText({ prompt: "", toolkit, disableToolCallResolution: flag })))
      .type.toBe<{ readonly count: string } | { readonly count: number }>()
    expect(toolCallParams(LanguageModel.generateText(options))).type.toBe<
      { readonly count: string } | { readonly count: number }
    >()
  })
})
