/**
 * `actionsCost` against the 38 rows measured in EFF-3738: each row is the
 * `actions` block's elements as posted, and what the 13,200 cap charged for
 * it, found by bisecting the text beside it.
 */
import { cost, type Element, labelCost, option, stringCost } from "@effect/chat-slack/internal/actions"
import { assert, describe, it } from "@effect/vitest"

const opts = (n: number, label = (i: number) => "Option " + i, value = (i: number) => "o" + i) =>
  Array.from({ length: n }, (_, i) => option(label(i + 1), value(i + 1)))

const S = (o: {
  readonly id?: string
  readonly ph?: string | null
  readonly options?: ReadonlyArray<ReturnType<typeof option>>
  readonly initial?: ReturnType<typeof option>
} = {}): Element => ({
  type: "static_select",
  action_id: o.id ?? "sel1",
  ...(o.ph === null ? {} : { placeholder: { type: "plain_text", text: o.ph ?? "Pick one" } }),
  options: o.options ?? opts(3),
  ...(o.initial === undefined ? {} : { initial_option: o.initial })
})

const B = (o: {
  readonly id?: string
  readonly label?: string
  readonly url?: string
  readonly value?: string | null
} = {}): Element => ({
  type: "button",
  text: { type: "plain_text", text: o.label ?? "Test button" },
  action_id: o.id ?? "eff3738_noop",
  ...(o.url === undefined ? {} : { url: o.url }),
  ...(o.value === null ? {} : { value: o.value ?? "v" })
})

const one = (label: string) => opts(1, () => label, () => "a")

/** Name, elements, what Slack charged, and whether every string in it is ASCII. */
const rows: ReadonlyArray<readonly [string, ReadonlyArray<Element>, number, boolean]> = [
  ["V1", [S({ options: one("A"), ph: null })], 173, true],
  ["V2", [S({ options: one("A") })], 240, true],
  ["V3", [S({ options: one("A"), ph: "x".repeat(75) })], 307, true],
  ["V4", [S({ options: opts(2, () => "A", () => "a") })], 307, true],
  ["V5", [S({ options: opts(3, () => "A", () => "a") })], 374, true],
  ["V6", [S({ options: opts(10, () => "A", () => "a") })], 843, true],
  ["V7", [S({ options: one("L".repeat(75)) })], 315, true],
  ["V8", [S({ options: opts(1, () => "A", () => "v".repeat(150)) })], 389, true],
  ["V9", [S({ options: opts(3) })], 398, true],
  ["V10", [S({ options: opts(3), initial: option("Option 2", "o2") })], 490, true],
  ["V11", [S({ options: one("\u{1F600}") })], 251, false],
  ["V12", [S({ options: one("A"), ph: "\u{1F600}" })], 242, false],
  ["V13", [S({ options: one("A"), id: "i".repeat(200) })], 436, true],
  ["V14", [S({ options: opts(3) }), B()], 518, true],
  ["V15", [B(), S({ options: opts(3) }), B({ id: "b2" })], 628, true],
  ["V16", [S({ options: opts(3) }), S({ options: opts(3), id: "sel2" })], 746, true],
  ["V17", [S({ options: opts(30) })], 2465, true],
  ["V18", [S({ options: one("é".repeat(20)) })], 359, false],
  ["V19", [S({ options: one("A\"<&>\\/") })], 249, true],
  ["V20", [B()], 170, true],
  ["V21", [B({ url: "https://effect.website/docs", value: null })], 197, true],
  ["V22", [B({ url: "https://effect.website/docs", value: "v" })], 209, true],
  ["V23", [B({ url: "https://effect.website/" + "p".repeat(500) + "?a=1&b=2", value: null })], 701, true],
  ["V24", [B({ url: "https://effect.website/docs/a/b/c", value: null })], 206, true],
  ["W1", [B({ label: "é".repeat(20) })], 279, false],
  ["W2", [B({ label: "\u{1F644}" })], 183, false],
  ["W3", [S({ options: one("\u{1F644}") })], 251, false],
  ["W4", [S({ options: one("A"), ph: "\u{1F644}" })], 256, false],
  ["W5", [S({ options: opts(1, () => "A", () => "é".repeat(10) + "/".repeat(10)) })], 319, false],
  ["W6", [B({ id: "a/b/c/d/e", value: "é".repeat(20) + "/".repeat(20) })], 330, false],
  ["W7", [S({ options: one("<&>".repeat(10)) })], 269, true],
  ["W8", [B({ label: "<&>".repeat(10) })], 289, true],
  ["W9", [S({ options: one(":grinning: :not_an_emoji:") })], 265, true],
  ["W10", [B({ label: ":grinning: :not_an_emoji:" })], 184, true],
  ["W11", [S({ options: one("\u{1F44D}\u{1F3FD} \u{1F1E6}\u{1F1FA} \u2764\uFE0F") })], 301, false],
  ["W12", [B({ label: "\u{1F44D}\u{1F3FD} \u{1F1E6}\u{1F1FA} \u2764\uFE0F" })], 194, false],
  ["W13", [S({ options: one("\u{1D49C}".repeat(5)) })], 299, false],
  ["W14", [B({ label: "\u{1D49C}".repeat(5) })], 219, false]
]

describe("actionsCost", () => {
  it("is never below what Slack charged, and at most 5 over on ASCII, for the 38 measured rows", () => {
    assert.strictEqual(rows.length, 38)
    for (const [name, elements, charged, ascii] of rows) {
      const charge = cost(elements)
      assert.isAtLeast(charge, charged, name)
      if (ascii) assert.isAtMost(charge, charged + 5, name)
    }
  })

  it("charges each string as JSON writes it", () => {
    assert.strictEqual(cost([]), 0)
    assert.strictEqual(stringCost("a/\"\\é\u{1D400}\n"), 1 + 2 + 2 + 2 + 6 + 12 + 6)
    // Entities in a label, and an emoji at the greater of its name and its escaped form.
    assert.strictEqual(labelCost("<>&"), 13)
    assert.strictEqual(labelCost("\u{1F644}"), ":face_with_rolling_eyes:".length)
    assert.strictEqual(labelCost("\u{1F600}"), 12)
    // A 75-character Japanese label.
    assert.strictEqual(labelCost("日".repeat(75)), 450)
  })
})
