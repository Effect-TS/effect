import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import * as TextDiff from "effect/TextDiff"
import * as fc from "fast-check"

const cost = (edits: ReadonlyArray<TextDiff.Edit<unknown>>): number =>
  edits.reduce((n, edit) => edit._tag === "Equal" ? n : n + edit.items.length, 0)

const lcsLength = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): number => {
  let prev = new Array<number>(b.length + 1).fill(0)
  for (const x of a) {
    const next = [0]
    for (let j = 0; j < b.length; j++) {
      next.push(x === b[j] ? prev[j] + 1 : Math.max(prev[j + 1], next[j]))
    }
    prev = next
  }
  return prev[b.length]
}

const isCanonical = (edits: ReadonlyArray<TextDiff.Edit<unknown>>): boolean =>
  edits.every((edit, i) =>
    edit.items.length > 0 &&
    (i === 0 || (edits[i - 1]._tag !== edit._tag && !(edits[i - 1]._tag === "Insert" && edit._tag === "Delete")))
  )

const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

const smallArray = fc.array(fc.constantFrom("a", "b", "c"), { maxLength: 12 })
const text = fc.string({ unit: fc.constantFrom("a", "b", "\n", "\r\n", "é", "é", "😀", "👍🏽") })

describe("TextDiff", () => {
  describe("diff", () => {
    it("produces a minimal canonical script that applies and inverts", () => {
      fc.assert(fc.property(smallArray, smallArray, (before, after) => {
        const edits = TextDiff.diff(before, after)
        deepStrictEqual(TextDiff.apply(before, edits), after)
        deepStrictEqual(TextDiff.apply(after, TextDiff.invert(edits)), before)
        deepStrictEqual(TextDiff.invert(TextDiff.invert(edits)), edits)
        strictEqual(cost(edits), before.length + after.length - 2 * lcsLength(before, after))
        assertTrue(isCanonical(edits))
        assertTrue(isCanonical(TextDiff.invert(edits)))
      }))
    })

    it("returns one Equal run for equal inputs and none for empty inputs", () => {
      deepStrictEqual(TextDiff.diff([1, 2], [1, 2]), [{ _tag: "Equal", items: [1, 2] }])
      deepStrictEqual(TextDiff.diff([], []), [])
    })

    it("lists deletions before insertions", () => {
      deepStrictEqual(TextDiff.diff(["a", "b", "c"], ["a", "x", "y", "c"]), [
        { _tag: "Equal", items: ["a"] },
        { _tag: "Delete", items: ["b"] },
        { _tag: "Insert", items: ["x", "y"] },
        { _tag: "Equal", items: ["c"] }
      ])
    })

    it("stays valid when maxCost is exceeded", () => {
      const before = Array.from({ length: 50_000 }, (_, i) => i)
      const after = before.map((i) => (i % 2 === 0 ? -i - 1 : i))
      const edits = TextDiff.diff(before, after, { maxCost: 10_000 })
      deepStrictEqual(TextDiff.apply(before, edits), after)
      assertTrue(isCanonical(edits))
    })
  })

  describe("diffWith", () => {
    it("matches with the equivalence and keeps items from before", () => {
      const diffById = TextDiff.diffWith<{ readonly id: number; readonly v: string }>((a, b) => a.id === b.id)
      deepStrictEqual(diffById([{ id: 1, v: "old" }, { id: 2, v: "x" }], [{ id: 1, v: "new" }]), [
        { _tag: "Equal", items: [{ id: 1, v: "old" }] },
        { _tag: "Delete", items: [{ id: 2, v: "x" }] }
      ])
    })
  })

  describe("apply", () => {
    it("throws when the script does not match the input length", () => {
      const edits = TextDiff.diff([1, 2], [1])
      throws(() => TextDiff.apply([1], edits))
      throws(() => TextDiff.apply([1, 2, 3], edits))
      throws(() => TextDiff.applyText("a", TextDiff.chars("ab", "a")))
      throws(() => TextDiff.applyText("abc", TextDiff.chars("ab", "a")))
    })
  })

  describe("lines", () => {
    it("round-trips arbitrary text", () => {
      fc.assert(fc.property(text, text, (before, after) => {
        const edits = TextDiff.lines(before, after)
        strictEqual(TextDiff.applyText(before, edits), after)
        strictEqual(TextDiff.applyText(after, TextDiff.invert(edits)), before)
      }))
    })

    it("treats line terminators as content", () => {
      deepStrictEqual(TextDiff.lines("a\nb\n", "a\r\nb\n"), [
        { _tag: "Delete", items: ["a\n"] },
        { _tag: "Insert", items: ["a\r\n"] },
        { _tag: "Equal", items: ["b\n"] }
      ])
      deepStrictEqual(TextDiff.lines("a\nb", "a\nb\n"), [
        { _tag: "Equal", items: ["a\n"] },
        { _tag: "Delete", items: ["b"] },
        { _tag: "Insert", items: ["b\n"] }
      ])
      deepStrictEqual(TextDiff.lines("a\n b\n", "a\nb\n"), [
        { _tag: "Equal", items: ["a\n"] },
        { _tag: "Delete", items: [" b\n"] },
        { _tag: "Insert", items: ["b\n"] }
      ])
    })

    it("handles empty strings", () => {
      deepStrictEqual(TextDiff.lines("", ""), [])
      deepStrictEqual(TextDiff.lines("", "a\n"), [{ _tag: "Insert", items: ["a\n"] }])
      deepStrictEqual(TextDiff.lines("a", ""), [{ _tag: "Delete", items: ["a"] }])
    })
  })

  describe("chars", () => {
    it("round-trips arbitrary text without splitting surrogate pairs", () => {
      fc.assert(fc.property(text, text, (before, after) => {
        const edits = TextDiff.chars(before, after)
        strictEqual(TextDiff.applyText(before, edits), after)
        for (const edit of edits) {
          assertTrue(!loneSurrogate.test(edit.items.join("")))
        }
      }))
    })

    it("diffs code points at emoji and combining mark boundaries", () => {
      deepStrictEqual(TextDiff.chars("a😀b", "a😁b"), [
        { _tag: "Equal", items: ["a"] },
        { _tag: "Delete", items: ["😀"] },
        { _tag: "Insert", items: ["😁"] },
        { _tag: "Equal", items: ["b"] }
      ])
      deepStrictEqual(TextDiff.chars("é", "e"), [
        { _tag: "Equal", items: ["e"] },
        { _tag: "Delete", items: ["́"] }
      ])
    })
  })

  describe("unified", () => {
    const base = Array.from({ length: 20 }, (_, i) => `${i + 1}\n`).join("")
    const replace = (lines: Record<number, string | undefined>) =>
      Array.from({ length: 20 }, (_, i) => i + 1 in lines ? lines[i + 1] ?? "" : `${i + 1}\n`).join("")

    // Expected outputs are from `diff -u`, without its header lines
    it("matches diff -u", () => {
      const cases: ReadonlyArray<readonly [string, string, string]> = [
        [
          base,
          replace({ 3: "three\n", 17: "seventeen\n" }),
          "@@ -1,6 +1,6 @@\n 1\n 2\n-3\n+three\n 4\n 5\n 6\n@@ -14,7 +14,7 @@\n 14\n 15\n 16\n-17\n+seventeen\n 18\n 19\n 20\n"
        ],
        [
          base,
          replace({ 5: "five\n", 12: "twelve\n" }),
          "@@ -2,14 +2,14 @@\n 2\n 3\n 4\n-5\n+five\n 6\n 7\n 8\n 9\n 10\n 11\n-12\n+twelve\n 13\n 14\n 15\n"
        ],
        [
          base,
          replace({ 5: "five\n", 13: "thirteen\n" }),
          "@@ -2,7 +2,7 @@\n 2\n 3\n 4\n-5\n+five\n 6\n 7\n 8\n@@ -10,7 +10,7 @@\n 10\n 11\n 12\n-13\n+thirteen\n 14\n 15\n 16\n"
        ],
        [
          base,
          replace({ 1: undefined, 20: "20\n21\n" }),
          "@@ -1,4 +1,3 @@\n-1\n 2\n 3\n 4\n@@ -18,3 +17,4 @@\n 18\n 19\n 20\n+21\n"
        ],
        ["", "1\n2\n", "@@ -0,0 +1,2 @@\n+1\n+2\n"],
        ["1\n2\n", "", "@@ -1,2 +0,0 @@\n-1\n-2\n"],
        ["a\nb\n", "a\nb", "@@ -1,2 +1,2 @@\n a\n-b\n+b\n\\ No newline at end of file\n"],
        ["a\nb\n", "a\r\nb\n", "@@ -1,2 +1,2 @@\n-a\n+a\r\n b\n"]
      ]
      for (const [before, after, expected] of cases) {
        strictEqual(TextDiff.unified(before, after), expected)
      }
    })

    it("returns an empty string for equal inputs", () => {
      strictEqual(TextDiff.unified(base, base), "")
    })

    it("applies context and file names", () => {
      strictEqual(
        TextDiff.unified("a\nb\nc\n", "a\nx\nc\n", { context: 0, fromFile: "a/f.txt", toFile: "b/f.txt" }),
        "--- a/f.txt\n+++ b/f.txt\n@@ -2 +2 @@\n-b\n+x\n"
      )
    })
  })
})
