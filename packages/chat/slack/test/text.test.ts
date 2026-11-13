import * as Escape from "@effect/chat-slack/internal/escape"
import * as Text from "@effect/chat-slack/internal/text"
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { adapter, channel, makeFake, slackLayer, team } from "./utils.ts"

const codePoints = (text: string) => [...text].length
const bytes = (text: string) => new TextEncoder().encode(text).length
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
const graphemes = (text: string) => [...segmenter.segment(text)]
const isBoundary = (text: string, index: number) =>
  index === text.length || graphemes(text).some((segment) => segment.index === index)

describe("build", () => {
  it("writes every <, > and & as an entity, in code too, and keeps allowed tokens", () => {
    const built = Text.build("a <@U1> <@U2> `<b>` & > <!here>", { users: ["U1"], broadcast: true }, Text.postBudget)
    assert.strictEqual(built.text, "a <@U1> &lt;@U2&gt; `&lt;b&gt;` &amp; &gt; <!here>")
    assert.strictEqual(built.dropped, 0)
  })

  it("cuts a post at 16,000 code points and an update at 3,800 bytes, marker included", () => {
    assert.strictEqual(Text.build("a".repeat(16_000), {}, Text.postBudget).text, "a".repeat(16_000))
    assert.strictEqual(Text.build("a".repeat(16_001), {}, Text.postBudget).text, "a".repeat(15_999) + "…")
    // An astral letter is one code point and four bytes.
    assert.strictEqual(Text.build("𝐚".repeat(16_001), {}, Text.postBudget).text, "𝐚".repeat(15_999) + "…")
    // "…" is three bytes.
    assert.strictEqual(Text.build("é".repeat(1_900), {}, Text.updateBudget).text, "é".repeat(1_900))
    assert.strictEqual(Text.build("é".repeat(1_901), {}, Text.updateBudget).text, "é".repeat(1_898) + "…")
  })

  it("cuts on a grapheme cluster boundary and splits no entity", () => {
    const family = "👨‍👩‍👧‍👦"
    const cut = Text.build(family.repeat(200), {}, Text.updateBudget).text
    assert.strictEqual(cut, family.repeat(151) + "…")
    assert.strictEqual(graphemes(cut).length, 152)
    assert.strictEqual(Text.build("&".repeat(4_000), {}, Text.postBudget).text, "&amp;".repeat(3_199) + "…")
    assert.strictEqual(Text.build("<".repeat(1_000), {}, Text.updateBudget).text, "&lt;".repeat(949) + "…")
  })

  it("appends each allowed token not in the kept head once, in order", () => {
    const notify = { users: ["U1", "U2", "U3"] }
    const built = Text.build("<@U2> " + "x".repeat(20_000) + " <@U1> <@U3> <@U1> <@U2>", notify, Text.postBudget)
    assert.isTrue(built.text.startsWith("<@U2> xxx"))
    assert.isTrue(built.text.endsWith("x… <@U1> <@U3>"))
    assert.strictEqual(codePoints(built.text), 16_000)
    assert.strictEqual(built.dropped, 0)
  })

  it("never cuts inside a token", () => {
    const built = Text.build("x".repeat(15_997) + "<@U1>" + "y".repeat(10), { users: ["U1"] }, Text.postBudget)
    assert.strictEqual(built.text, "x".repeat(15_993) + "… <@U1>")
  })

  it("keeps the tokens that fit when the tokens alone don't, and counts the rest", () => {
    const users = Array.from({ length: 500 }, (_, i) => `U${1_000 + i}`)
    const built = Text.build(users.map((user) => `<@${user}>`).join(" "), { users }, Text.updateBudget)
    // "…" is 3 bytes and each " <@U1xxx>" 9.
    assert.strictEqual(built.dropped, 79)
    assert.strictEqual(built.text, "…" + users.slice(0, 421).map((user) => ` <@${user}>`).join(""))
    assert.isAtMost(bytes(built.text), Text.updateTextBytes)
  })
})

/**
 * The CI half of the Slack mention rule: the same assertions the live rule
 * makes on stored messages, made here on the request bodies the adapter
 * builds for `chat.postMessage` and `chat.update`. Stream appends are left
 * to the stream's own rule.
 */
describe("request bodies", () => {
  const thread = SlackChat.thread({ team, channel })
  const allowed = { users: ["U1"], broadcast: true }
  /** The tokens `notify` lets through, of those the alphabet can spell. */
  const allowedTokens = (notify: Escape.Notify): ReadonlyArray<string> => [
    ...(notify.users?.includes("U1") ? ["<@U1>"] : []),
    ...(notify.broadcast === true ? ["<!here>"] : [])
  ]

  // Pieces that spell tokens, entity forms, code and multi-unit characters.
  const alphabet = ["<", "@U1", "!here", ">", "&", "lt;", "`", "x", "👍🏽", "\n"]
  const words = (length: number): Array<string> =>
    length === 0 ? [""] : words(length - 1).flatMap((word) => alphabet.map((piece) => word + piece))
  const short = [1, 2, 3].flatMap(words)
  const withToken = short.filter((word) => word.includes("<"))

  /** Repeats `word` until the text is past both budgets while the block stays within 12,000. */
  const long = (word: string, notify: Escape.Notify): string => {
    const sent = (markdown: string) => codePoints(Escape.escape(markdown, notify, { flush: true }).sent)
    let times = Math.floor(11_900 / sent(word))
    while (sent(word.repeat(times)) > 12_000) times = Math.floor(times / 2)
    return word.repeat(times)
  }

  const check = (op: "post" | "edit", markdown: string, notify: Escape.Notify, params: Record<string, string>) => {
    const label = `${op} ${JSON.stringify(markdown.slice(0, 40))} ${JSON.stringify(notify)}`
    const block = JSON.parse(params.blocks)[0].text as string
    const text = params.text
    assert.isUndefined(params.markdown_text, label)
    assert.isAbove(text.length, 0, label)
    if (op === "post") assert.isAtMost(codePoints(text), Text.postTextLength, label)
    else assert.isAtMost(bytes(text), Text.updateTextBytes, label)
    // No token survives in text but an allowed one, and every & starts an entity.
    let rest = text
    for (const token of allowedTokens(notify)) rest = rest.replaceAll(token, "")
    assert.notMatch(rest, /[<>]|&(?!lt;|gt;|amp;)/, label)
    // An allowed token the block sends intact is in text too, cut or not.
    for (const token of allowedTokens(notify)) {
      if (block.includes(token)) assert.include(text, token, label)
    }
    // A cut is a prefix of the whole text, on a grapheme boundary and outside an entity.
    const whole = Text.build(markdown, notify, { unit: "codePoints", limit: Infinity }).text
    if (text !== whole) {
      const head = text.slice(0, text.lastIndexOf("…"))
      assert.isTrue(whole.startsWith(head), label)
      assert.notMatch(head, /&[a-z]*$/, label)
      assert.isTrue(isBoundary(whole, head.length), label)
    }
  }

  it.effect("hold the mention, budget and cut rules over a generated alphabet", () => {
    const fake = makeFake({ "chat.postMessage": { ok: true, channel, ts: "1.1" } })
    return Effect.gen(function*() {
      const slack = yield* adapter
      let count = 0
      let cuts = 0
      for (const notify of [{}, allowed] as ReadonlyArray<Escape.Notify>) {
        const inputs = [
          ...short,
          ...[1, 2].flatMap(words).map((word) => long(word, notify)),
          // 3,300 `&` are 16,500 code points of text, so a token in the word is past either cut.
          ...(notify === allowed ? withToken.map((word) => "&".repeat(3_300) + word) : [])
        ]
        for (const markdown of inputs) {
          for (const op of ["post", "edit"] as const) {
            const before = fake.calls.length
            // A new message id for each edit, so pacing never waits.
            const write = op === "post"
              ? slack.post(thread, { markdown })
              : slack.edit(thread, `1.${count + 2}`, { markdown })
            yield* write.pipe(SlackChat.withPostOptions({ notify }))
            const call = fake.calls[fake.calls.length - 1]
            assert.strictEqual(fake.calls.length, before + 1)
            assert.strictEqual(call.method, op === "post" ? "chat.postMessage" : "chat.update")
            check(op, markdown, notify, call.params)
            if (call.params.text.includes("…")) cuts++
            count++
          }
        }
      }
      assert.strictEqual(count, 2 * (2 * (short.length + 110) + withToken.length))
      // The long inputs reach both budgets.
      assert.isAbove(cuts, 2 * withToken.length)
    }).pipe(Effect.provide(slackLayer(fake)))
  }, 60_000)
})
