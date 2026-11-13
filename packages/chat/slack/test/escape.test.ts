import { escape, escapeStream } from "@effect/chat-slack/internal/escape"
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

describe("escapeStream", () => {
  const z = "\u200B"
  const streamed = (text: string, notify = {}) => escapeStream(text, notify, { flush: true }).sent

  it("puts U+200B after whatever spells the < of a token shape, in prose and in code", () => {
    assert.strictEqual(streamed("a <@U1> b"), `a <${z}@U1> b`)
    assert.strictEqual(streamed("`<@U1>` and ```\n<!here>\n```"), `\`<${z}@U1>\` and \`\`\`\n<${z}!here>\n\`\`\``)
    assert.strictEqual(
      streamed("&lt;@U1> &LT;!channel> &#60;@U1> &#060;@U1> &#x3C;@U1> &#X003c;@U1>"),
      [
        `&lt;${z}@U1>`,
        `&LT;${z}!channel>`,
        `&#60;${z}@U1>`,
        `&#060;${z}@U1>`,
        `&#x3C;${z}@U1>`,
        `&#X003c;${z}@U1>`
      ].join(" ")
    )
    assert.strictEqual(
      streamed("<&commat;U1> <&#64;U1> &lt;&#x40;U1> <&excl;here>"),
      [
        `<${z}&commat;U1>`,
        `<${z}&#64;U1>`,
        `&lt;${z}&#x40;U1>`,
        `<${z}&excl;here>`
      ].join(" ")
    )
    assert.strictEqual(streamed("<!subteam^S1> <!everyone>"), `<${z}!subteam^S1> <${z}!everyone>`)
  })

  it("leaves the rest to the block rule", () => {
    // <!-- and <![CDATA[ are no token shape.
    assert.strictEqual(streamed("<!-- x --> <![CDATA[ y ]]>"), "&lt;!-- x --> &lt;![CDATA[ y ]]>")
    assert.strictEqual(streamed("a < b `c < d` &lt;b> &#60;"), "a &lt; b `c < d` &lt;b> &#60;")
    // Without the semicolon nothing decodes.
    assert.strictEqual(
      streamed("&lt@U1> &#60@U1> &#x3c@U1> <&commat U1>"),
      "&lt@U1> &#60@U1> &#x3c@U1> &lt;&commat U1>"
    )
    // Letters are not decoded.
    assert.strictEqual(streamed("<!&#104;ere>"), "&lt;!&#104;ere>")
  })

  it("sends an allowed token as it is", () => {
    const notify = { users: ["U1"], groups: ["S1"], broadcast: true }
    assert.strictEqual(
      streamed("<@U1> <@U2> <!subteam^S1> <!here> `<@U1>` &lt;@U1>", notify),
      `<@U1> <${z}@U2> <!subteam^S1> <!here> \`<@U1>\` &lt;@U1>`
    )
  })

  it("holds an unclosed <, an unfinished reference and an undecided token", () => {
    const notify = { users: ["U1"] }
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["a <", "a "],
      ["a <!", "a "],
      ["a &", "a "],
      ["a &l", "a "],
      ["a &lt", "a "],
      ["a &#6", "a "],
      ["a &#x3", "a "],
      ["a &comm", "a "],
      ["a <&comm", "a "],
      ["a &lt;", "a "],
      ["`a <", "`a "],
      ["a &amp", "a &amp"],
      ["a &q", "a &q"]
    ]
    for (const [text, sent] of cases) {
      const result = escapeStream(text, {})
      assert.strictEqual(result.sent, sent, text)
      assert.strictEqual(result.consumed, sent.length, text)
    }
    // A shape is decided at once unless an allowed token could still close it.
    assert.strictEqual(escapeStream("a <@U", {}).sent, `a <${z}@U`)
    assert.strictEqual(escapeStream("a <@U", notify).sent, "a ")
    // The held tail goes again at the front of the next chunk.
    const first = escapeStream("x &l", notify)
    const second = escapeStream("&lt;@U1> y", notify, { state: first.state })
    assert.strictEqual(first.sent + second.sent, "x &lt;@U1> y")
    // flush and the bound send it.
    assert.strictEqual(escapeStream("a &l", {}, { flush: true }).sent, "a &l")
    assert.strictEqual(escapeStream("a <", {}, { flush: true }).sent, "a &lt;")
    const long = "<@U1|" + "x".repeat(400)
    assert.strictEqual(escapeStream(long, notify).sent, `<${z}@U1|` + "x".repeat(400))
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
