/**
 * The `documents` glob matcher (EFF-1834 point 3): `*`, `**`, `?` and
 * `{a,b}` over `/`-separated paths relative to the config file.
 */
import * as Glob from "@effect/graphql-generator/internal/Glob"
import { assert, describe, it } from "@effect/vitest"

const assertMatches = (pattern: string, matching: ReadonlyArray<string>, notMatching: ReadonlyArray<string>) => {
  const glob = Glob.make(pattern)
  for (const path of matching) assert.isTrue(glob.matches(path), `${pattern} should match ${path}`)
  for (const path of notMatching) assert.isFalse(glob.matches(path), `${pattern} should not match ${path}`)
}

describe("Glob", () => {
  it("* matches within one path segment", () => {
    assertMatches("src/*.graphql", ["src/a.graphql"], ["src/a/b.graphql", "a.graphql", "src/a.gql"])
  })

  it("** matches any number of segments, including none", () => {
    assertMatches(
      "src/**/*.graphql",
      ["src/a.graphql", "src/x/a.graphql", "src/x/y/z/a.graphql"],
      ["a.graphql", "lib/a.graphql", "src/a.graphql.ts"]
    )
    assertMatches("**/*.graphql", ["a.graphql", "x/y/a.graphql"], ["a.ts"])
  })

  it("? matches exactly one character other than /", () => {
    assertMatches("q?.graphql", ["q1.graphql", "qa.graphql"], ["q.graphql", "q12.graphql", "q/.graphql"])
  })

  it("{a,b} matches either alternative", () => {
    assertMatches(
      "{src,lib}/*.{graphql,gql}",
      ["src/a.graphql", "lib/a.gql", "src/a.gql"],
      ["app/a.graphql", "src/a.json"]
    )
  })

  it("treats regular expression characters literally", () => {
    assertMatches("src/a+b.(x).graphql", ["src/a+b.(x).graphql"], ["src/aab.x.graphql", "src/a+b.x.graphql"])
  })

  it("ignores a leading ./", () => {
    assertMatches("./src/*.graphql", ["src/a.graphql"], ["./src/a.graphql"])
  })

  it("root is the leading segments before the first wildcard", () => {
    assert.strictEqual(Glob.make("src/app/**/*.graphql").root, "src/app")
    assert.strictEqual(Glob.make("./src/*.graphql").root, "src")
    assert.strictEqual(Glob.make("src/{a,b}/*.graphql").root, "src")
    assert.strictEqual(Glob.make("**/*.graphql").root, "")
    assert.strictEqual(Glob.make("queries.graphql").root, "")
  })
})
