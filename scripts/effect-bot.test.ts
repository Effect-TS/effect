import { assert, describe, it } from "@effect/vitest"
// oxlint-disable-next-line effect/no-js-extension-imports
import { isCommand } from "./effect-bot.mjs"

describe("effect-bot", () => {
  it("triggers on a leading standalone mention", () => {
    assert.isTrue(isCommand("@effect-bot fix this"))
  })

  it("ignores mentions that are not a leading standalone mention", () => {
    assert.isFalse(isCommand("please ask @effect-bot to fix this"))
    assert.isFalse(isCommand("> @effect-bot fix this"))
    assert.isFalse(isCommand("````markdown\n```text\n@effect-bot fix this\n```\n````"))
    assert.isFalse(isCommand("@effect-bot-helper fix this"))
  })
})
