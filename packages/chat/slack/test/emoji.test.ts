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
  it("holds every emoji, name and skin tone variation from emoji-data v16.0.0", () => {
    assert.strictEqual(emojiData.split("\n").length, 1911)
    assert.strictEqual(rows.reduce((total, row) => total + row.names.length, 0), 1972)
    assert.strictEqual(rows.filter((row) => row.names.length === 0).length, 1875)
    assert.strictEqual(sequences.length, 4946)
    assert.strictEqual(new Set(sequences.map(([emoji]) => emoji)).size, sequences.length)
  })

  describe("fromName", () => {
    it("resolves every alias", () => {
      assert.strictEqual(fromName("+1"), "👍")
      assert.strictEqual(fromName("thumbsup"), "👍")
    })

    it("accepts surrounding colons", () => {
      assert.strictEqual(fromName(":+1:"), "👍")
      assert.strictEqual(fromName(":+1::skin-tone-3:"), "👍🏼")
    })

    it("returns the fully qualified emoji", () => {
      assert.strictEqual(fromName("heart"), "❤️")
    })

    it("looks skin tones up in skin_variations", () => {
      assert.strictEqual(fromName("+1::skin-tone-3"), "👍🏼")
      assert.strictEqual(fromName("woman-running::skin-tone-6"), "🏃🏿‍♀️")
    })

    it("gives none for a name with two tones, which no recording shows", () => {
      assert.strictEqual(fromName("people_holding_hands::skin-tone-2::skin-tone-5"), undefined)
      assert.strictEqual(fromName("handshake::skin-tone-2::skin-tone-5"), undefined)
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
      assert.strictEqual(fromName(""), undefined)
      assert.strictEqual(fromName("::"), undefined)
      assert.strictEqual(fromName(":+1"), undefined)
      assert.strictEqual(fromName("grinning::skin-tone-3"), undefined)
      assert.strictEqual(fromName("+1::skin-tone-1"), undefined)
      assert.strictEqual(fromName("+1::skin-tone-7"), undefined)
      assert.strictEqual(fromName("+1::skin-tone-2::skin-tone-3"), undefined)
      assert.strictEqual(fromName("handshake::skin-tone-2::skin-tone-3::skin-tone-4"), undefined)
      assert.strictEqual(fromName("+1::thumbsup"), undefined)
    })
  })

  describe("toName", () => {
    it("returns the primary short name", () => {
      assert.strictEqual(toName("👍"), "+1")
      assert.strictEqual(toName("😀"), "grinning")
      assert.strictEqual(toName("🧑‍🤝‍🧑"), "people_holding_hands")
    })

    it("matches emoji with and without U+FE0F", () => {
      assert.strictEqual(toName("❤\uFE0F"), "heart")
      assert.strictEqual(toName("❤"), "heart")
    })

    it("names toned emoji with skin-tone suffixes", () => {
      assert.strictEqual(toName("👍🏼"), "+1::skin-tone-3")
      assert.strictEqual(toName("🏃🏿‍♀️"), "woman-running::skin-tone-6")
      assert.strictEqual(toName("🏃🏿‍♀"), "woman-running::skin-tone-6")
      assert.strictEqual(toName("🧑🏻‍🤝‍🧑🏾"), "people_holding_hands::skin-tone-2::skin-tone-5")
      assert.strictEqual(toName("🫱🏻‍🫲🏾"), "handshake::skin-tone-2::skin-tone-5")
    })

    it("returns undefined for anything that is not exactly one emoji", () => {
      assert.strictEqual(toName(""), undefined)
      assert.strictEqual(toName("a"), undefined)
      assert.strictEqual(toName("👍👍"), undefined)
      assert.strictEqual(toName("👍 "), undefined)
    })

    it("names every emoji in the table", () => {
      for (const [emoji, name] of sequences) {
        assert.strictEqual(toName(emoji), name)
      }
    })

    it("round trips with fromName for every emoji with at most one tone", () => {
      for (const row of rows) {
        if (row.tones > 1) continue
        assert.strictEqual(fromName(toName(row.emoji)!), row.emoji, row.name)
      }
    })
  })

  describe("blocksCost", () => {
    it("counts code points of plain text", () => {
      assert.strictEqual(blocksCost(""), 0)
      assert.strictEqual(blocksCost("abc"), 3)
      assert.strictEqual(blocksCost("é日本"), 3)
      assert.strictEqual(blocksCost("𝒜"), 1)
    })

    it("counts emoji as their :short_name: form", () => {
      assert.strictEqual(blocksCost("😀"), 10)
      assert.strictEqual(blocksCost("a😀"), 11)
      assert.strictEqual(blocksCost("👍"), 4)
      assert.strictEqual(blocksCost("👍🏽"), 17)
      assert.strictEqual(blocksCost("🧑‍🤝‍🧑"), 22)
      assert.strictEqual(blocksCost("❤"), 7)
      assert.strictEqual(blocksCost("❤️"), 7)
      assert.strictEqual(blocksCost("🇺🇸"), 4)
      assert.strictEqual(blocksCost("#️⃣"), 6)
      assert.strictEqual(blocksCost("hi 👍🏽!"), 3 + 17 + 1)
    })

    it("costs every emoji in the table exactly as its :short_name:", () => {
      for (const [emoji, name] of sequences) {
        assert.strictEqual(blocksCost(emoji), name.length + 2, name)
      }
    })

    it("charges stray emoji components enough to stay subadditive", () => {
      assert.strictEqual(blocksCost("1"), 1)
      assert.strictEqual(blocksCost("1\u20E3"), 5)
      assert.isAtLeast(blocksCost("1") + blocksCost("\u20E3"), 5)
      assert.isAtLeast(blocksCost("🇺") + blocksCost("🇸"), blocksCost("🇺🇸"))
      assert.isAtLeast(blocksCost("🏃") + blocksCost("\u200D➡️"), blocksCost("🏃‍➡️"))
      assert.isAtLeast(blocksCost("\uD83D") + blocksCost("\uDE00"), blocksCost("😀"))
      // Slack charges a lone hair component 1. At 3 or less, 🧑‍🦱 would split
      // for less than :curly_haired_person:.
      assert.strictEqual(blocksCost("\u{1F9B1}"), 4)
      assert.strictEqual(blocksCost("🧑‍🦱"), ":curly_haired_person:".length)
      assert.isBelow(blocksCost("🧑") + blocksCost("\u200D") + 3, blocksCost("🧑‍🦱"))
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

    it("measures long text", () => {
      const text = "hello 👍🏽 world 🧑‍🤝‍🧑 #️⃣ 🇺🇸 ".repeat(2_000)
      assert.strictEqual(blocksCost(text), 2_000 * (6 + 17 + 7 + 22 + 1 + 6 + 1 + 4 + 1))
    })
  })
})
