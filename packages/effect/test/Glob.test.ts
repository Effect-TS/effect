import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Glob } from "effect"

const cases: ReadonlyArray<{
  readonly pattern: string
  readonly dot?: boolean
  readonly matches: ReadonlyArray<string>
  readonly rejects: ReadonlyArray<string>
}> = [
  { pattern: "a.ts", matches: ["a.ts", "./a.ts"], rejects: ["b.ts", "dir/a.ts"] },
  { pattern: "*.ts", matches: ["a.ts", "a.b.ts"], rejects: [".a.ts", "dir/a.ts", "a.js"] },
  { pattern: "?.ts", matches: ["a.ts"], rejects: ["ab.ts", ".ts"] },
  { pattern: "**/*.ts", matches: ["a.ts", "a/b/c.ts"], rejects: [".a.ts", "a/.b/c.ts"] },
  { pattern: "a/**", matches: ["a", "a/b/c"], rejects: ["ab"] },
  { pattern: "a/**/b", matches: ["a/b", "a/x/y/b"], rejects: ["a/x"] },
  { pattern: ".*", matches: [".env"], rejects: ["env", ".", ".."] },
  { pattern: "*", dot: true, matches: [".env", "a"], rejects: [".", "..", "a/b"] },
  { pattern: "[!a-c]x", matches: ["dx"], rejects: ["ax", "/x"] },
  { pattern: "[[:digit:]]x", matches: ["1x"], rejects: ["ax"] },
  { pattern: "[😀-😂]x", matches: ["😁x"], rejects: ["😃x"] },
  { pattern: "{a,{b,c}d}", matches: ["a", "bd", "cd"], rejects: ["b", "d"] },
  { pattern: "{a,b/c}/x", matches: ["a/x", "b/c/x"], rejects: ["b/x"] },
  { pattern: "{a}", matches: ["{a}"], rejects: ["a"] },
  { pattern: "[ab", matches: ["[ab"], rejects: ["a"] },
  { pattern: "\\*.ts", matches: ["*.ts"], rejects: ["a.ts"] },
  { pattern: "!(a)", matches: ["!(a)"], rejects: ["b"] },
  { pattern: "dir/", matches: ["dir/"], rejects: ["dir", "dir/a"] },
  { pattern: "/abs/*.ts", matches: ["/abs/a.ts"], rejects: ["abs/a.ts"] },
  { pattern: "C:/x/*", matches: ["C:/x/a"], rejects: ["x/a"] },
  { pattern: "**", matches: ["a/b"], rejects: ["/a", "C:/a"] }
]

describe("Glob", () => {
  describe("match", () => {
    for (const { dot, matches, pattern, rejects } of cases) {
      it(`${pattern}${dot ? " (dot)" : ""}`, () => {
        const glob = Glob.make(pattern, { dot })
        for (const path of matches) {
          assertTrue(Glob.match(glob, path), `expected ${pattern} to match ${path}`)
        }
        for (const path of rejects) {
          assertFalse(Glob.match(glob, path), `expected ${pattern} not to match ${path}`)
        }
      })
    }

    it("matches braces literally when they expand to more than 10,000 alternatives", () => {
      assertTrue(Glob.match(Glob.make("{a,b}".repeat(13)), "b".repeat(13)))
      const pattern = "{a,b}".repeat(20)
      const glob = Glob.make(pattern)
      assertFalse(Glob.match(glob, "a".repeat(20)))
      assertTrue(Glob.match(glob, pattern))
    })

    it("compiles adversarial patterns without overflowing", () => {
      const brackets = "[{".repeat(20_000)
      assertTrue(Glob.match(Glob.make(brackets), brackets))
      const nested = "{a,".repeat(100) + "b" + "}".repeat(100)
      assertTrue(Glob.match(Glob.make(nested), nested))
    })
  })

  it("escape makes special characters literal", () => {
    const input = "a*b?c[d]{e,f}\\g"
    const glob = Glob.make(Glob.escape(input))
    assertTrue(Glob.match(glob, input))
    assertFalse(Glob.match(glob, "axbxcdeg"))
  })
})
