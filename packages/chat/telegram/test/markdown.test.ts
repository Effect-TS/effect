/**
 * T3 and T4: the rendered Markdown stays within what `measure` charged and
 * carries no raw HTML, image, math, spoiler or link outside http, https and
 * mailto. A GFM parser reads the output; live check 2 confirms Telegram's
 * parser agrees with it.
 */
import {
  maxColumns,
  maxDepth,
  measure,
  messageLength,
  render,
  reservation
} from "@effect/chat-telegram/internal/markdown"
import { assert, describe, it } from "@effect/vitest"
import * as fc from "fast-check"
import { inspect } from "./gfm.ts"

const cases: ReadonlyArray<readonly [string, string]> = [
  ["<b>hi</b> <https://e.com> <javascript:alert(1)>", "&lt;b>hi&lt;/b> <https://e.com> &lt;javascript:alert(1)>"],
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

const mentions = new Set(["2"])

/** Fails with what a GFM parse of `render(input)` finds that the renderer promises it never holds. */
const assertInert = (input: string) => {
  const out = render(input, { mentions })
  const found = inspect(out)
  const context = JSON.stringify(input) + " rendered " + JSON.stringify(out)
  assert.deepStrictEqual(found.html, [], context)
  assert.strictEqual(found.images, 0, context)
  assert.deepStrictEqual(
    found.links.filter((url) => !/^(?:https?:\/\/|mailto:)/i.test(url) && url !== "tg://user?id=2"),
    [],
    context
  )
  assert.deepStrictEqual(found.active, [], context)
  assert.isAtMost(found.maxDepth, maxDepth, context)
  assert.isAtMost(found.maxColumns, maxColumns, context)
}

const hostile = fc.string({
  unit: fc.constantFrom(
    ..."<>$=|![]()*_~`#-+.:/\\&;\n \t\"'0a",
    "~~~",
    "```",
    " ~~~",
    "- ",
    "> ",
    "1. ",
    "https://e.com",
    "www.e.co",
    "x@e.co",
    "tg://user?id=1",
    "<b>",
    "](",
    "[^",
    "[^a]: ",
    "|---|",
    "\\]",
    "\\<",
    "\\`"
  ),
  maxLength: 60
})

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

  it("leaves a GFM parser no HTML, image, foreign link, math, spoiler or excess nesting", () => {
    for (
      const input of [
        // a backtick in a link title is not a code span
        "[x](https://e.com \"`\") <tg-button data=\"pwn\">Click</tg-button> `",
        "[x](https://e.com \"`\") ![i](https://e.com/i.png) [ping](tg://user?id=123) `",
        // a fence may be indented up to three spaces
        " ~~~\nx\n~~~\n[ping](tg://user?id=123) <b>",
        // each delimiter of a run is a level
        "_".repeat(36) + "x" + "_".repeat(36),
        // a heading ends a table
        "| a | b |\n|---|---|\n# heading\n||secret||",
        // a backslash in a bare URL escapes nothing
        "https://e.com\\<b> ](https://e.com\\<a> )",
        "[^]:<x> [^a]: x\n="
      ]
    ) assertInert(input)
    fc.assert(fc.property(hostile, (input) => assertInert(input)), { numRuns: 2000 })
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
