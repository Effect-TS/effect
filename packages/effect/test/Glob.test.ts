import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Glob, pipe } from "effect"

const cases: ReadonlyArray<{
  readonly pattern: string
  readonly dot?: boolean
  readonly matches: ReadonlyArray<string>
  readonly rejects: ReadonlyArray<string>
}> = [
  { pattern: "a.ts", matches: ["a.ts", "./a.ts"], rejects: ["b.ts", "dir/a.ts", "a.tsx"] },
  { pattern: "*.ts", matches: ["a.ts", "a.b.ts"], rejects: [".a.ts", "dir/a.ts", "a.js"] },
  { pattern: "*", matches: ["a", "a.b"], rejects: [".a", "a/b", "."] },
  { pattern: "?.ts", matches: ["a.ts"], rejects: ["ab.ts", ".ts"] },
  { pattern: "a?c", matches: ["abc", "a.c"], rejects: ["a/c", "ac"] },
  { pattern: "**", matches: ["a", "a/b", "a/b/c"], rejects: [".a", "a/.b", "a/.b/c"] },
  { pattern: "**/*.ts", matches: ["a.ts", "a/b.ts", "a/b/c.ts"], rejects: ["a/.b/c.ts", ".a.ts", "a/b.js"] },
  { pattern: "a/**", matches: ["a", "a/b", "a/b/c"], rejects: ["b", "ab"] },
  { pattern: "a/**/b", matches: ["a/b", "a/x/b", "a/x/y/b"], rejects: ["a/x", "b"] },
  { pattern: "a/**/**/b", matches: ["a/b", "a/x/y/b"], rejects: ["a"] },
  { pattern: "a**b", matches: ["ab", "axxb"], rejects: ["a/b"] },
  { pattern: ".*", matches: [".env", ".a.b"], rejects: ["env", ".", ".."] },
  { pattern: "**/.*", matches: [".env", "a/.env"], rejects: ["a/env", "a/.git/x"] },
  { pattern: "*", dot: true, matches: [".env", "a"], rejects: [".", "..", "a/b"] },
  { pattern: "**/*.ts", dot: true, matches: [".a/b.ts", "a/.b.ts"], rejects: ["../a.ts"] },
  { pattern: "[abc].ts", matches: ["a.ts", "c.ts"], rejects: ["d.ts", "ab.ts"] },
  { pattern: "[a-c]x", matches: ["bx"], rejects: ["dx", "-x"] },
  { pattern: "[!a-c]x", matches: ["dx", "-x"], rejects: ["ax", "/x"] },
  { pattern: "[^a]x", matches: ["bx"], rejects: ["ax"] },
  { pattern: "[]]x", matches: ["]x"], rejects: ["ax"] },
  { pattern: "[a-]x", matches: ["ax", "-x"], rejects: ["bx"] },
  { pattern: "[[:digit:]]x", matches: ["1x"], rejects: ["ax"] },
  { pattern: "[[:upper:][:digit:]]", matches: ["A", "7"], rejects: ["a"] },
  { pattern: "[.]env", matches: [], rejects: [".env"] },
  { pattern: "[ab", matches: ["[ab"], rejects: ["a"] },
  { pattern: "{a,b}.ts", matches: ["a.ts", "b.ts"], rejects: ["c.ts", "{a,b}.ts"] },
  { pattern: "{a,b/c}/x", matches: ["a/x", "b/c/x"], rejects: ["b/x"] },
  { pattern: "a{,.min}.js", matches: ["a.js", "a.min.js"], rejects: ["a.max.js"] },
  { pattern: "{a,{b,c}d}", matches: ["a", "bd", "cd"], rejects: ["b", "d"] },
  { pattern: "{a}", matches: ["{a}"], rejects: ["a"] },
  { pattern: "{a,b", matches: ["{a,b"], rejects: ["a"] },
  { pattern: "\\*.ts", matches: ["*.ts"], rejects: ["a.ts"] },
  { pattern: "\\{a,b\\}", matches: ["{a,b}"], rejects: ["a"] },
  { pattern: "a(b)+c|d$", matches: ["a(b)+c|d$"], rejects: ["abc"] },
  { pattern: "!(a)", matches: ["!(a)"], rejects: ["b"] },
  { pattern: "dir/", matches: ["dir/"], rejects: ["dir", "dir/a"] },
  { pattern: "*/", matches: ["a/", "a//"], rejects: ["a", ".a/"] },
  { pattern: "a//b", matches: ["a/b", "a//b"], rejects: ["ab"] },
  { pattern: "./a/b", matches: ["a/b", "./a/b"], rejects: ["b"] },
  { pattern: "../*.ts", matches: ["../a.ts"], rejects: ["a.ts", "../.a.ts"] },
  { pattern: "/abs/*.ts", matches: ["/abs/a.ts"], rejects: ["abs/a.ts"] },
  { pattern: "C:/x/*", matches: ["C:/x/a"], rejects: ["x/a"] },
  { pattern: "é?.ts", matches: ["éa.ts", "é😀.ts"], rejects: ["e.ts"] },
  { pattern: "[😀]", matches: ["😀"], rejects: ["a"] },
  { pattern: "[😀-😂]x", matches: ["😁x"], rejects: ["😃x"] },
  { pattern: "\\.*", matches: [".env"], rejects: ["env", "."] },
  { pattern: "*/a", matches: ["b/a"], rejects: ["/a"] },
  { pattern: "**", matches: ["a"], rejects: ["/a", "C:/a"] }
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

    it("never matches the empty path", () => {
      assertFalse(Glob.match(Glob.make("**"), ""))
    })

    it("compiles the empty pattern to one that matches nothing", () => {
      const glob = Glob.make("")
      assertFalse(Glob.match(glob, "/"))
      assertFalse(Glob.match(glob, "a"))
    })

    it("matches braces literally when they expand to more than 10,000 alternatives", () => {
      const bounded = Glob.make("{a,b}".repeat(13))
      assertTrue(Glob.match(bounded, "b".repeat(13)))
      const pattern = "{a,b}".repeat(20)
      const unbounded = Glob.make(pattern)
      assertFalse(Glob.match(unbounded, "a".repeat(20)))
      assertTrue(Glob.match(unbounded, pattern))
    })

    it("compiles unclosed brackets and braces literally", () => {
      const pattern = "[{".repeat(20_000)
      assertTrue(Glob.match(Glob.make(pattern), pattern))
    })

    it("compiles long and adversarial patterns without overflowing", () => {
      const braces = "{a,b}".repeat(8_000)
      assertTrue(Glob.match(Glob.make(braces), braces))
      const nested = "{a,".repeat(100) + "b" + "}".repeat(100)
      assertTrue(Glob.match(Glob.make(nested), nested))
      const posix = "[[:".repeat(20_000) + "]"
      assertTrue(Glob.match(Glob.make(posix), "["))
    })

    it("is dual", () => {
      assertTrue(pipe(Glob.make("*.ts"), Glob.match("a.ts")))
    })
  })

  it("escape makes special characters literal", () => {
    const input = "a*b?c[d]{e,f}\\g"
    const glob = Glob.make(Glob.escape(input))
    assertTrue(Glob.match(glob, input))
    assertFalse(Glob.match(glob, "axbxcdeg"))
  })

  it("isGlob", () => {
    assertTrue(Glob.isGlob(Glob.make("*")))
    assertFalse(Glob.isGlob({ pattern: "*" }))
  })

  it("inspects as its pattern and options", () => {
    const glob = Glob.make("src/*.ts")
    deepStrictEqual(glob.toJSON(), { _id: "Glob", pattern: "src/*.ts", dot: false })
    strictEqual(String(glob), "Glob({\"_id\":\"Glob\",\"pattern\":\"src/*.ts\",\"dot\":false})")
  })
})
