import { blocksCost, fromName, toName } from "@effect/chat-slack/internal/emoji"
import { emojiData } from "@effect/chat-slack/internal/emojiData"
import { assert, describe, it } from "@effect/vitest"

interface Row {
  readonly names: ReadonlyArray<string>
  /** Primary Slack name, with skin-tone suffixes for variations */
  readonly name: string
  /** How many skin tones the name carries */
  readonly tones: number
  readonly emoji: string
  /** Whether the emoji is also written without U+FE0F */
  readonly nonQualified: boolean
}

const decode = (hex: string): string => String.fromCodePoint(...hex.split("-").map((point) => parseInt(point, 16)))

// Read the generated table directly, so these tests do not trust emoji.ts to parse it.
const rows: ReadonlyArray<Row> = emojiData.split("\n").flatMap((line) => {
  const [names, unified, nonQualified, groups] = line.split("|")
  const aliases = names.split(",")
  const base: Row = {
    names: aliases,
    name: aliases[0],
    tones: 0,
    emoji: decode(unified),
    nonQualified: nonQualified === "!"
  }
  const variations = groups === undefined ? [] : groups.split(";").flatMap((group) => {
    const [keys, template, variationNonQualified] = group.split(":")
    return keys.split(",").map((tones): Row => {
      let index = 0
      return {
        names: [],
        name: aliases[0] + [...tones].map((tone) => "::skin-tone-" + tone).join(""),
        tones: tones.length,
        emoji: decode(template.replace(/\*/g, () => (0x1f3fb + Number(tones[index++]) - 2).toString(16))),
        nonQualified: variationNonQualified === "!"
      }
    })
  })
  return [base, ...variations]
})

// Every emoji string the table defines, with its primary Slack name.
const sequences: ReadonlyArray<readonly [emoji: string, name: string]> = rows.flatMap((row) =>
  row.nonQualified ? [[row.emoji, row.name], [row.emoji.replaceAll("\uFE0F", ""), row.name]] : [[row.emoji, row.name]]
)

describe("emoji", () => {
  describe("fromName", () => {
    it("gives none for a name with two tones, which no recording shows, even the same tone twice", () => {
      assert.strictEqual(fromName("handshake::skin-tone-3::skin-tone-3"), undefined)
    })

    it("gives a single tone, or the same tone twice where upstream keys only by two", () => {
      assert.strictEqual(fromName("handshake::skin-tone-3"), "🤝🏼")
      assert.strictEqual(fromName("people_holding_hands::skin-tone-4"), "🧑🏽‍🤝‍🧑🏽")
      assert.strictEqual(fromName("people_holding_hands::skin-tone-1"), undefined)
    })

    it("resolves every alias and every one-tone variation in the table", () => {
      for (const row of rows) {
        if (row.tones > 1) continue
        assert.strictEqual(fromName(row.name), row.emoji, row.name)
        for (const alias of row.names) assert.strictEqual(fromName(alias), row.emoji, alias)
      }
    })

    it("returns undefined for unknown names and tones", () => {
      assert.strictEqual(fromName("not_an_emoji"), undefined)
      assert.strictEqual(fromName(":+1"), undefined)
      assert.strictEqual(fromName("grinning::skin-tone-3"), undefined)
      assert.strictEqual(fromName("+1::skin-tone-1"), undefined)
      assert.strictEqual(fromName("handshake::skin-tone-2::skin-tone-3::skin-tone-4"), undefined)
      assert.strictEqual(fromName("+1::thumbsup"), undefined)
    })
  })

  describe("toName", () => {
    it("returns undefined for anything that is not exactly one emoji", () => {
      assert.strictEqual(toName("a"), undefined)
      assert.strictEqual(toName("👍👍"), undefined)
      assert.strictEqual(toName("👍 "), undefined)
    })

    it("names every emoji in the table", () => {
      for (const [emoji, name] of sequences) {
        assert.strictEqual(toName(emoji), name)
      }
    })
  })

  describe("blocksCost", () => {
    it("costs every emoji in the table exactly as its :short_name:", () => {
      for (const [emoji, name] of sequences) {
        assert.strictEqual(blocksCost(emoji), name.length + 2, name)
      }
    })

    it("is subadditive", () => {
      const emoji = sequences.map(([sequence]) => sequence)
      const extras = [
        "a",
        " ",
        "1",
        "#",
        "\u200D",
        "\uFE0F",
        "\u20E3",
        "🏽",
        "🇺",
        "🇸",
        "🦰",
        "\u{E0067}",
        "\uD83D",
        "\uDE00"
      ]
      let seed = 1
      const random = (n: number) => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        return seed % n
      }
      const piece = () => {
        const kind = random(3)
        if (kind === 0) return extras[random(extras.length)]
        const sequence = emoji[random(emoji.length)]
        if (kind === 1) return sequence
        const from = random(sequence.length + 1)
        const to = random(sequence.length + 1)
        return sequence.slice(Math.min(from, to), Math.max(from, to))
      }
      for (let i = 0; i < 20_000; i++) {
        let text = ""
        for (let j = 1 + random(8); j > 0; j--) text += piece()
        const cut = random(text.length + 1)
        const a = text.slice(0, cut)
        const b = text.slice(cut)
        assert.isAtMost(blocksCost(text), blocksCost(a) + blocksCost(b), JSON.stringify([a, b]))
      }
    })
  })
})
