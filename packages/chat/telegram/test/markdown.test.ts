/**
 * T3 and T4: the rendered Markdown stays within what `measure` charged and
 * carries no raw HTML, image, math, spoiler or link outside http, https and
 * mailto. The corpus is checked by hand against GFM; live check 2 confirms
 * Telegram's parser agrees.
 */
import { measure, messageLength, render, reservation } from "@effect/chat-telegram/internal/markdown"
import { assert, describe, it } from "@effect/vitest"
import * as fc from "fast-check"

const cases: ReadonlyArray<readonly [string, string]> = [
  ["<b>hi</b> <https://e.com> <javascript:alert(1)>", "\\<b>hi\\</b> <https://e.com> \\<javascript:alert(1)>"],
  ["![a](https://e.com/a.png) ![b][r]", "\\![a](https://e.com/a.png) \\![b][r]"],
  ["[me](tg://user?id=1) [ok](tg://user?id=2)", "[me\\](tg://user?id\\=1) [ok](tg://user?id\\=2)"],
  [
    "[a](tg&#58;//x) [b](tg%3A//x) [c](tg\\://x) [d](javascript:x)",
    "[a\\](tg&#58;//x) [b\\](tg%3A//x) [c\\](tg\\://x) [d\\](javascript:x)"
  ],
  ["[r]\n\n[r]: tg://user?id=1", "[r]\n\n[r\\]: tg://user?id\\=1"],
  ["$x$ ==m== ||s||", "\\$x\\$ \\=\\=m\\=\\= \\|\\|s\\|\\|"],
  ["| a | b |\n|---|---|\n| 1 | 2 |", "| a | b |\n|---|---|\n| 1 | 2 |"],
  ["`<b>` and `open", "`<b>` and \\`open"],
  [">".repeat(17) + " x", ">".repeat(15) + "\\>\\> x"]
]

const bytes = (s: string) => new TextEncoder().encode(s).length

const markdown = fc.string({
  unit: fc.oneof(
    fc.constantFrom(
      ..."<>$=|![]()*_~`#-+.:/\\&;\n\r \t0123456789abc",
      "\u0000",
      "é",
      "€",
      "😀",
      "\ud800",
      "tg://",
      "https://"
    ),
    fc.string({ maxLength: 3 })
  ),
  maxLength: 200
})

describe("render", () => {
  it("escapes the hostile corpus", () => {
    for (const [input, expected] of cases) assert.strictEqual(render(input, { mentions: new Set(["2"]) }), expected)
  })

  it("escapes the pipes of a table wider than 20 columns", () => {
    const row = (cell: string) => "|" + ` ${cell} |`.repeat(21)
    const out = render(row("c") + "\n" + row("-"))
    assert.isFalse(/(^|[^\\])\|/.test(out))
  })

  it("closes an open fence before the media references", () => {
    assert.strictEqual(render("```\n<b>", { files: 1 }), "```\n<b>\n```\n\n![](tg://document?id=f1)")
  })

  it("never exceeds measure, with the reservation for files", () => {
    fc.assert(fc.property(markdown, fc.integer({ min: 0, max: 10 }), (input, files) => {
      assert.isAtMost(bytes(render(input)), measure(input))
      assert.isAtMost(bytes(render(input, { files })), measure(input) + reservation)
    }))
    assert.strictEqual(messageLength + reservation, 32_768)
  })
})

describe("measure", () => {
  it("is subadditive", () => {
    fc.assert(fc.property(markdown, markdown, (a, b) => {
      assert.isAtMost(measure(a + b), measure(a) + measure(b))
    }))
  })
})
