import { escape } from "@effect/chat-slack/internal/escape"
import { codePoints, measure } from "@effect/chat-slack/internal/length"
import { assert, describe, it } from "@effect/vitest"

const sent = (text: string, notify = {}) => escape(text, notify, { flush: true }).sent

describe("escape", () => {
  it("escapes < outside code only", () => {
    assert.strictEqual(sent("a <@U1> b"), "a &lt;@U1> b")
    assert.strictEqual(sent("`<@U1>` and ``x <!here> y``"), "`<@U1>` and ``x <!here> y``")
    assert.strictEqual(sent("```\n<@U1>\n```\n<@U1>"), "```\n<@U1>\n```\n&lt;@U1>")
    assert.strictEqual(sent("~~~ts\nif (a < b) {}\n~~~"), "~~~ts\nif (a < b) {}\n~~~")
    assert.strictEqual(sent("a `b < c"), "a `b &lt; c")
    assert.strictEqual(sent("\\<@U1>"), "\\&lt;@U1>")
  })

  it("keeps the tokens the notify options allow", () => {
    const notify = { users: ["U1"], groups: ["S1"], broadcast: true }
    assert.strictEqual(
      sent("<@U1> <@U2> <!subteam^S1> <!subteam^S2> <!here>", notify),
      "<@U1> &lt;@U2> <!subteam^S1> &lt;!subteam^S2> <!here>"
    )
    assert.strictEqual(sent("<@U1|name>", { users: ["U1"] }), "<@U1|name>")
    assert.strictEqual(sent("<!channel>", {}), "&lt;!channel>")
  })

  it("holds a < the next chunk could still change", () => {
    const notify = { users: ["U1"] }
    const first = escape("hi <@U", notify)
    assert.strictEqual(first.sent, "hi ")
    assert.strictEqual(first.consumed, 3)
    const second = escape("<@U1> there", notify, { state: first.state })
    assert.strictEqual(second.sent, "<@U1> there")
    // With nothing allowed, a < is never undecided.
    assert.strictEqual(escape("hi <@U", {}).sent, "hi &lt;@U")
    // After a backtick the line has not closed.
    const code = escape("x `a <", {})
    assert.strictEqual(code.sent, "x `a ")
    assert.strictEqual(escape("<b` y", {}, { state: code.state }).sent, "<b` y")
    // flush sends it escaped.
    assert.strictEqual(escape("hi <@U", notify, { flush: true }).sent, "hi &lt;@U")
  })

  it("carries a fence across chunks", () => {
    const first = escape("```\na < b\n", {})
    assert.strictEqual(first.sent, "```\na < b\n")
    const second = escape("c < d\n```\ne < f", {}, { state: first.state, flush: true })
    assert.strictEqual(second.sent, "c < d\n```\ne &lt; f")
  })

  it("releases a held < past the bound", () => {
    const text = "`a <" + "x".repeat(400)
    const result = escape(text, {})
    assert.strictEqual(result.consumed, text.length)
    assert.strictEqual(result.sent, "`a &lt;" + "x".repeat(400))
  })
})

describe("measure", () => {
  it("bounds what is sent and adds up", () => {
    const samples = ["plain", "a < b", "<<<", "😀😀", "`<@U1>` <!here>", "👍🏽 and 1\u20E3", "\ud83d", "🇺🇸"]
    for (const a of samples) {
      assert.isAtLeast(measure(a), codePoints(sent(a)))
      for (const b of samples) assert.isAtMost(measure(a + b), measure(a) + measure(b))
    }
    assert.strictEqual(measure("abc"), 3)
    assert.strictEqual(measure("<"), 4)
    // 1,200 😀 cost 12,000 against 13,200, scaled to 12,000 and rounded up.
    assert.strictEqual(measure("😀".repeat(1200)), 10_910)
  })
})
