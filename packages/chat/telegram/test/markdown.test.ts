/**
 * T3 and T4: the rendered Markdown stays within what `measure` charged and
 * carries no raw HTML, image, math, spoiler or link outside http, https and
 * mailto. A GFM parser reads the output; live check 2 confirms Telegram's
 * parser agrees with it.
 */
import {
  maxColumns,
  maxDepth,
  maxFootnoteReferences,
  maxInlineNodes,
  measure,
  messageLength,
  render,
  reservation
} from "@effect/chat-telegram/internal/markdown"
import { assert, describe, it } from "@effect/vitest"
import * as fc from "fast-check"
import { inspect } from "./gfm.ts"

/** The most blocks Telegram renders in one message. */
const maxBlocks = 500

// Live check 2 found that Telegram ignores the escapes `\]` and `\<`, reads destinations
// verbatim, reads definitions more loosely than CommonMark and opens emphasis
// between spaces: the last six cases.
const cases: ReadonlyArray<readonly [string, string]> = [
  ["<b>hi</b> <https://e.com> <javascript:alert(1)>", "&lt;b>hi&lt;/b> <https://e.com> &lt;javascript:alert(1)>"],
  ["![a](https://e.com/a.png) ![b][r]", "\\![a](https://e.com/a.png) \\![b][r]"],
  ["[me](tg://user?id=1) [ok](tg://user?id=2)", "[me]\\(tg://user?id\\=1) [ok](tg://user?id=2)"],
  [
    "[a](tg&#58;//x) [b](tg%3A//x) [c](tg\\://x) [d](javascript:x)",
    "[a]\\(tg&#58;//x) [b]\\(tg%3A//x) [c]\\(tg&#58;//x) [d]\\(javascript:x)"
  ],
  ["[r]\n\n[r]: tg://user?id=1", "[r]\n\n\\[r]: tg://user?id\\=1"],
  ["$x$ ==m== ||s||", "\\$x\\$ \\=\\=m\\=\\= \\|\\|s\\|\\|"],
  ["| a | b |\n|---|---|\n| 1 | 2 |", "| a | b |\n|---|---|\n| 1 | 2 |"],
  ["`<b>` and `open", "`<b>` and \\`open"],
  [">>>>>>>>>>>>>>>>> x", ">>>>>>>>>>>>>>>\\>\\> x"],
  ["[x\\](tg://resolve?domain=telegram) \\<b>x\\</b>", "\\[x&#93;(tg://resolve?domain\\=telegram) &#60;b>x&#60;/b>"],
  [
    "[a](https://e.com/?q=1&x=2 \"t\") [b](https://e.com/a_b*c\\(d\\))",
    "[a](https://e.com/?q=1&x=2) [b](https://e.com/a_b*c%28d%29)"
  ],
  [
    "](https://e.com||s||) [a [b](https://e.com) c](https://e.com)",
    "]\\(https://e.com\\|\\|s\\|\\|) [a [b](https://e.com) c]\\(https://e.com)"
  ],
  [
    "[a][b]: tg://x\n\n [c]: tg://x\n\ntext\n[d]: https://e.com",
    "\\[a][b]: tg://x\n\n \\[c]: tg://x\n\ntext\n\\[d]: https://e.com"
  ],
  ["a\\:b \\@c \\^d \\&amp;", "a&#58;b &#64;c &#94;d &#38;amp;"],
  ["2 * 3 * 4 a _ b\n\n***", "2 \\* 3 \\* 4 a \\_ b\n\n***"],
  // a definition is refused once, keeps no title, and loses no text
  [
    "[a[b]: https://e.com\n\n[^ a]: https://e.com\n\n[c]: https://e.com \"t\"\n[d]: https://e.com d",
    "\\[a[b]: https://e.com\n\n\\[^ a]: https://e.com\n\n[c]: https://e.com\n\\[d]: https://e.com d"
  ],
  // a label that renders to 999 characters stays a definition, one of 1,000 does not
  ["[" + "$".repeat(499) + "]: mailto:x", "[" + "\\$".repeat(499) + "]: mailto:x"],
  ["[" + "$".repeat(500) + "]: mailto:x", "\\[" + "\\$".repeat(500) + "]: mailto:x"],
  // a destination keeps parentheses three deep, not four
  ["[a](https://e.com/(((x))))", "[a](https://e.com/(((x))))"],
  ["[a](https://e.com/((((x)))))", "[a]\\(https://e.com/((((x)))))"]
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
  assert.deepStrictEqual(found.unhonored, [], context)
  assert.isAtMost(found.maxDepth, maxDepth, context)
  assert.isAtMost(found.maxColumns, maxColumns, context)
  assert.isAtMost(found.inline, maxInlineNodes, context)
  if (measure(input) <= messageLength) assert.isAtMost(found.blocks, maxBlocks, context)
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
    "\\`",
    // whitespace that is not a blank line to CommonMark
    "[a]",
    "\n[a]: mailto:x\n",
    "\u00a0",
    "\u3000",
    "\v",
    "\f"
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
        "[^]:<x> [^a]: x\n=",
        // a lazy continuation line stays in the containers it does not repeat
        ">".repeat(15) + " x\n" + "_".repeat(14) + "x" + "_".repeat(14),
        "2. <\n x_\n=",
        "[^a]: b\na\n=",
        "|a|\n|-|\na\n=\n|a|\n|-|\na\n=",
        // an intraword underscore closes nothing
        "_a_b ".repeat(17) + "x_" + " x_".repeat(16),
        // a footnote's text, or an indented delimiter row, is no table
        "[^a]: x|y\n---|---\n||secret||",
        "x|y\n\t---|---",
        // nor a delimiter row that starts a list item
        "a|b\n- |-|",
        // nor a lone pipe a header
        "|\n-|",
        // a table goes on past a line it does not end at
        "|a|\n|---|\n[a]: mailto:x\nb `<b>|`",
        // a line of U+00A0 is text, so it ends no paragraph
        ">".repeat(15) + " x\n\u00a0\n" + "_".repeat(14) + "x" + "_".repeat(14),
        "[^a]: z\n\u00a0\nx|y\n---|---\n||secret||",
        // a nested label, a reference or a footnote may turn the outer link
        // into text, and its destination into Markdown
        "[outer [inner]](mailto:[pwn](tg://user?id=1))\n\n[inner]: https://safe.com",
        "[outer [inner]](mailto:![pwn](tg://document?id=f1))\n\n[inner]: https://safe.com",
        "[outer [inner]](mailto:||spoiler||)\n\n[inner]: https://safe.com",
        "[a][inner](mailto:[pwn](tg://user?id=1))\n\n[inner]: https://safe.com",
        "[inner][](mailto:[pwn](tg://user?id=1))\n\n[inner]: https://safe.com",
        "[x [^a]](mailto:[pwn](tg://user?id=1))\n\n[^a]: z",
        "[x [^a](mailto:[pwn](tg://user?id=1))\n\n[^a]: z",
        // unbalanced parentheses end no destination
        "[](mailto:$(> )",
        // a definition's label may span lines
        "[\n[a]: [",
        "[x\\](a)\n]: tg://user?id=1\n\n[x&#93;(a)\n]",
        // nor a definition with a nested, blank or overlong label, or with
        // more than a destination and a title on its line
        "[a[b]: mailto:[pwn](tg://user?id=1)",
        "[]: mailto:[pwn](tg://user?id=1)",
        "[a]: mailto:[pwn](tg://user?id=1)(",
        "[ ]: mailto:[pwn](tg://user?id=1)",
        "[" + "a".repeat(1000) + "]: mailto:[pwn](tg://user?id=1)",
        // nor one whose label grows past 999 characters as it is escaped
        "[" + "$".repeat(500) + "]: mailto:[pwn](tg://user?id=1)",
        "[" + "|".repeat(500) + "]: mailto:[pwn](tg://user?id=1)",
        "[" + "\\^".repeat(200) + "]: mailto:[pwn](tg://user?id=1)",
        "[" + "\\<".repeat(150) + "]: mailto:[pwn](tg://user?id=1)",
        // in a bare URL each `\<` becomes `%5C&lt;`
        "[www.e.co/" + "\\<".repeat(142) + "]: mailto:[pwn](tg://user?id=1)",
        // nor a destination nested deeper than a parser may read
        "[x](mailto:" + "(".repeat(32) + "[pwn](tg://user?id=1)" + ")".repeat(32) + ")",
        "[x](mailto:" + "(".repeat(3) + "[pwn](tg://user?id=1)" + ")".repeat(3) + ")",
        "[x]: mailto:" + "(".repeat(32) + "[pwn](tg://user?id=1)" + ")".repeat(32),
        "[a]: mailto:[pwn](tg://user?id=1) b",
        "[a]: mailto:[pwn](tg://user?id=1) \"t",
        "[a]: mailto:\u007f[pwn](tg://user?id=1)",
        "[a]: mailto:x [b]: mailto:[pwn](tg://user?id=1)",
        // a code span or an autolink hides no label's end from CommonMark
        "[`]: x` ](tg://user?id=1)",
        "[\u0001`> >\\\"]: `]\"^<>",
        "[<https://a]:x>",
        "[>\\]: mailto:]:[^a]",
        // indented, a footnote's label is a definition's
        "[a]: mailto:x\n\t[^a]: tg://x",
        "[a]: mailto:x\n    [^a]: tg://x",
        "[^a]: [a]:<",
        // nor is an autolink with a control character one
        "<https://e.com|\u0001|>"
      ]
    ) assertInert(input)
    fc.assert(fc.property(hostile, (input) => assertInert(input)), { numRuns: 2000 })
  })

  it("keeps output within the budget under 500 blocks", () => {
    const line = fc.constantFrom(
      "- a\n",
      "> - a\n",
      "- - - a\n",
      "1. a\n",
      "# a\n",
      "a\n",
      "a\n=\n",
      "___\n",
      "|a|\n|-|\n",
      "[^a]: b\n",
      "```\n```\n"
    )
    fc.assert(
      fc.property(fc.array(line, { minLength: 1, maxLength: 4 }), (lines) => {
        let input = ""
        for (let k = 0; measure(input + lines[k]) <= messageLength; k = (k + 1) % lines.length) input += lines[k]
        assertInert(input)
      }),
      { numRuns: 40 }
    )
  })

  it("caps the code spans, links and footnote references Telegram refuses past a limit", () => {
    const spans = render("`a` ".repeat(maxInlineNodes + 10))
    assert.strictEqual(spans.match(/(?<!\\)`a(?<!\\)`/g)?.length, maxInlineNodes)
    const links = render("[a](https://e.com) ".repeat(maxInlineNodes + 10))
    assert.strictEqual(links.split("](").length - 1, maxInlineNodes)
    // references count as links, also beside code spans and links
    const shortcuts = "[a] ".repeat(maxInlineNodes + 10) + "\n\n[a]: https://e.com"
    assert.isAtMost(measure(shortcuts), messageLength)
    assert.strictEqual(inspect(render(shortcuts)).inline, maxInlineNodes)
    // four nodes a repeat, 40 past the cap
    const mixed = "[a] `b` [c](https://e.com) [d][a] ".repeat(maxInlineNodes / 4 + 10) + "\n\n[a]: https://e.com"
    assert.isAtMost(inspect(render(mixed)).inline, maxInlineNodes)
    // a definition past the cap keeps no destination behind its escaped label
    const definitions = "[a]: https://e.com\n".repeat(maxInlineNodes) + "[b]: mailto:[pwn](tg://user?id=1)"
    assert.deepStrictEqual(inspect(render(definitions)).links.filter((url) => url.startsWith("tg:")), [])
    const references = render(Array.from({ length: 10 }, () => "x[^1]".repeat(100)).join("\n\n") + "\n\n[^1]: n")
    assert.strictEqual(references.match(/(?<!\\)\[\^1\]/g)?.length, maxFootnoteReferences + 1)
  })

  it("has an oracle that sees each escape Telegram ignores", () => {
    assert.deepStrictEqual(inspect(String.raw`\!\<b>`).unhonored, [String.raw`\!\<b>`])
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
