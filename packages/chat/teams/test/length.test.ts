import * as Length from "@effect/chat-teams/internal/length"
import * as Render from "@effect/chat-teams/internal/render"
import { describe, expect, it } from "@effect/vitest"
import type * as ChatUi from "effect/chat/ChatUi"

const tokenLength = (button: { readonly id: string; readonly value?: string | undefined }) =>
  20 + button.id.length + (button.value?.length ?? 0)
const encode = (button: ChatUi.Button) => "t".repeat(tokenLength(button))
const measure = Length.makeMeasure(tokenLength)

const actions: ReadonlyArray<ChatUi.Action> = [
  { _tag: "Button", id: "approve", label: "Yes & <no>", style: "danger", value: "v" },
  { _tag: "LinkButton", label: "Docs", url: "https://example.com/?a=1&b=<2>" }
]

const fits = (markdown: string, actions: ReadonlyArray<ChatUi.Action>) =>
  expect(JSON.stringify(Render.cardActivity(markdown, actions, encode)).length).toBeLessThanOrEqual(
    measure(markdown, actions) + Length.R
  )

describe("measure", () => {
  it("bounds a fence pair", () => fits(["```\nx\n", "```\np\n\nq\n\nr"].join(""), actions))

  it("bounds nested block syntax on one line", () => fits("> - # x", actions))

  it("bounds a table", () => fits("| a | b |\n| - | - |\n| c | d |", actions))

  it("bounds a card without actions", () => {
    const markdown = "# Title\n\nsome *text* & <b>\n\n```ts\nconst x = 1\n```"
    fits(markdown, [])
    expect(measure(markdown, [])).toBe(measure(markdown))
  })
})
