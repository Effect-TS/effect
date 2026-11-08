import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { IgnoreFile, PathFilter, Result } from "effect"

const exact = (path: string): PathFilter.PathMatcher => ({ match: (candidate) => candidate === path })
const E = (path: string, subtree: "barrier" | "inherit" | "self") => PathFilter.exclude(exact(path), { subtree })
const I = (path: string) => PathFilter.include(exact(path), { subtree: "self" })

// the deciding rule must be the very rule that was passed in
const assertMatch = (match: PathFilter.Match, tag: PathFilter.Match["_tag"], rule?: PathFilter.Rule) => {
  assert.strictEqual(match._tag, tag)
  assert.strictEqual(match._tag === "None" ? undefined : match.rule, rule)
}

type Expected = readonly [tag: PathFilter.Match["_tag"], rule?: number]

describe("PathFilter", () => {
  it.each<{
    readonly label: string
    readonly rules: ReadonlyArray<PathFilter.Rule>
    readonly d: Expected
    readonly dx: Expected
  }>([
    { label: "E(d, self)", rules: [E("d", "self")], d: ["Exclude", 0], dx: ["None"] },
    { label: "I(d/x); E(d, self)", rules: [I("d/x"), E("d", "self")], d: ["Exclude", 1], dx: ["Include", 0] },
    { label: "E(d, barrier); I(d/x)", rules: [E("d", "barrier"), I("d/x")], d: ["Exclude", 0], dx: ["Exclude", 0] },
    { label: "E(d, barrier); I(d)", rules: [E("d", "barrier"), I("d")], d: ["Include", 1], dx: ["None"] },
    { label: "E(d, inherit); I(d)", rules: [E("d", "inherit"), I("d")], d: ["Include", 1], dx: ["Exclude", 0] }
  ])("$label", ({ d, dx, rules }) => {
    const filter = PathFilter.make(rules)
    for (const [path, directory, [tag, rule]] of [["d", true, d], ["d/x", false, dx]] as const) {
      assertMatch(PathFilter.match(filter, path, { directory }), tag, rule === undefined ? undefined : rules[rule])
    }
  })

  it("later rules win and concat appends", () => {
    const exclude = PathFilter.exclude("a")
    const include = PathFilter.include("a")
    const filter = PathFilter.concat(PathFilter.make([exclude]), PathFilter.make([include]))
    assertTrue(PathFilter.isPathFilter(filter))
    assert.deepStrictEqual(filter.rules, [exclude, include])
    assert.deepStrictEqual(PathFilter.make([include]).pipe(PathFilter.concat(PathFilter.make([exclude]))).rules, [
      include,
      exclude
    ])
    assertFalse(PathFilter.excludes(filter, "a"))
    assertTrue(PathFilter.make([include, exclude]).pipe(PathFilter.excludes("a", { directory: true })))
    assertMatch(filter.pipe(PathFilter.match("a")), "Include", include)
    assertMatch(PathFilter.match(PathFilter.empty, "a"), "None")
  })

  it("accepts rules wherever an input filter is expected", () => {
    const exclude = PathFilter.exclude("a")
    const include = PathFilter.include("a")
    const filter = PathFilter.make([exclude])
    assert.strictEqual(PathFilter.fromInput(filter), filter)
    assertTrue(PathFilter.excludes(PathFilter.fromInput(new Set([exclude])), "a"))
    assert.deepStrictEqual(PathFilter.concat(filter, [include]).rules, [exclude, include])
    assert.deepStrictEqual(PathFilter.concat([include], filter).rules, [include, exclude])
  })

  it("keeps the subtree semantics of each format", () => {
    const docker = Result.getOrThrow(IgnoreFile.dockerignore("d\n!d/keep\nd\n"))
    // the third line does not change the result at `d`, so `d/keep` does not inherit it
    assertMatch(PathFilter.match(docker, "d/keep"), "Include", docker.rules[1])
    const git = IgnoreFile.gitignore("d/x\n!/d\n")
    // re-including `d` does not lift the earlier exclusion of `d/x`
    assertMatch(PathFilter.match(git, "d", { directory: true }), "Include", git.rules[1])
    assertMatch(PathFilter.match(git, "d/x"), "Exclude", git.rules[0])
  })

  it("applies a scoped inclusion below an inherited exclusion", () => {
    const filter = PathFilter.make([
      PathFilter.exclude("d", { subtree: "inherit" }),
      PathFilter.include("keep", { scope: "d/sub" })
    ])
    assertTrue(PathFilter.excludes(filter, "d/sub", { directory: true }))
    assertTrue(PathFilter.excludes(filter, "d/keep"))
    assertFalse(PathFilter.excludes(filter, "d/sub/keep"))
  })

  it("matches string patterns as Glob, with dot files and directoryOnly", () => {
    const filter = PathFilter.make([PathFilter.exclude("*/build", { directoryOnly: true })])
    assertFalse(PathFilter.excludes(filter, "a/build"))
    assertFalse(PathFilter.excludes(filter, "a/build/"))
    assertTrue(PathFilter.excludes(filter, "a/build", { directory: true }))
    assertTrue(PathFilter.excludes(filter, "a/build/x"))
    assertTrue(PathFilter.excludes(filter, ".a//./build/x"))
    assertFalse(PathFilter.excludes(PathFilter.make([PathFilter.exclude("*", { dot: false })]), ".a"))
  })

  it("dies on .. paths, bad scopes and non-relative patterns", () => {
    assert.throws(() => PathFilter.excludes(PathFilter.make([PathFilter.exclude("b")]), "a/../b"))
    for (const scope of ["a//b", "./a", "a/..", ".."]) {
      assert.throws(() => PathFilter.exclude("x", { scope }))
      assert.throws(() => PathFilter.include("x", { scope }))
    }
    // validation precedes compilation, which drops a branch with `.` after `**`
    for (
      const pattern of [
        "/a",
        "//server/share",
        "../a",
        "a/../b",
        "**/../x",
        "src\\/x",
        "{**/src\\/x/.,a}",
        "**/\\.\\./."
      ]
    ) {
      assert.throws(() => PathFilter.exclude(pattern), undefined, undefined, pattern)
      assert.throws(() => PathFilter.include(pattern), undefined, undefined, pattern)
    }
  })

  it("decides unmatched paths with the filter's default", () => {
    const selection = PathFilter.select("a")
    assert.strictEqual(selection.default, "exclude")
    assertMatch(PathFilter.match(selection, "b"), "None")
    assertTrue(PathFilter.excludes(selection, "b"))
    for (const filter of [PathFilter.empty, PathFilter.make([]), IgnoreFile.gitignore("")]) {
      assert.strictEqual(filter.default, "include")
      assertMatch(PathFilter.match(filter, "b"), "None")
      assertFalse(PathFilter.excludes(filter, "b"))
    }
    // the root is not a path, so a rule naming only the root never matches
    assertMatch(PathFilter.match(PathFilter.make([PathFilter.exclude(".")]), "a"), "None")
  })

  it("reads strings as include patterns, or exclude patterns after `!`", () => {
    const selection = PathFilter.fromInput("src/**")
    assert.strictEqual(selection.default, "exclude")
    assertFalse(PathFilter.excludes(selection, "src/a"))
    assertTrue(PathFilter.excludes(selection, "b"))
    // only `!` strings keep unmatched paths
    const negated = PathFilter.fromInput(["!**/*.test.ts"])
    assert.strictEqual(negated.default, "include")
    assertTrue(PathFilter.excludes(negated, "a.test.ts"))
    assertFalse(PathFilter.excludes(negated, "a.ts"))
    // include strings skip dot names, `!` strings match them
    assertTrue(PathFilter.excludes(PathFilter.fromInput("*.log"), ".x.log"))
    assertTrue(PathFilter.excludes(negated, ".x.test.ts"))
    // `\!` is a literal `!`
    const literal = PathFilter.fromInput("\\!name")
    assertFalse(PathFilter.excludes(literal, "!name"))
    assertTrue(PathFilter.excludes(literal, "name"))
    // one include string makes a mixed input a selection
    const mixed = PathFilter.fromInput(["a/**", PathFilter.exclude("a/b")])
    assert.strictEqual(mixed.default, "exclude")
    assertTrue(PathFilter.excludes(mixed, "a/b"))
    assertFalse(PathFilter.excludes(mixed, "a/c"))
    assert.strictEqual(PathFilter.fromInput([PathFilter.include("a")]).default, "include")
    // an existing filter keeps its default
    const selected = PathFilter.select([PathFilter.include("a")])
    assert.strictEqual(PathFilter.fromInput(selected), selected)
  })

  it("concat appends rules of filters with the same default", () => {
    const both = PathFilter.concat(PathFilter.select("a"), PathFilter.select("b"))
    assert.strictEqual(both.default, "exclude")
    assert.strictEqual(both.rules.length, 2)
    assertFalse(PathFilter.excludes(both, "a"))
    assertFalse(PathFilter.excludes(both, "b"))
    assertTrue(PathFilter.excludes(both, "c"))
    const [x, y, z] = ["x", "y", "z"].map((pattern) => PathFilter.make([PathFilter.exclude(pattern)]))
    assert.deepStrictEqual(
      PathFilter.concat(PathFilter.concat(x, y), z).rules,
      PathFilter.concat(x, PathFilter.concat(y, z)).rules
    )
    assert.throws(() => PathFilter.concat(PathFilter.select("a"), PathFilter.empty))
    assert.throws(() => PathFilter.concat(PathFilter.restrict(PathFilter.select("a"), PathFilter.empty), x))
    assert.throws(() => PathFilter.concat(x, PathFilter.restrict(PathFilter.select("a"), PathFilter.empty)))
  })

  it("restrict keeps paths both operands keep", () => {
    // the blocking operand decides `match`, even through its default
    const blocked = PathFilter.restrict(PathFilter.select("a"), PathFilter.select("b"))
    assertTrue(PathFilter.excludes(blocked, "a"))
    assertMatch(PathFilter.match(blocked, "a"), "None")
    const kept = PathFilter.restrict(PathFilter.empty, PathFilter.select("a"))
    assertFalse(PathFilter.excludes(kept, "a"))
    assertMatch(PathFilter.match(kept, "a"), "None")
    // `!keep.log` restores the selection's verdict rather than selecting the file
    const gitignore = IgnoreFile.gitignore("*.log\n!keep.log\n")
    const sources = PathFilter.restrict("**/*.ts", gitignore)
    assertTrue(PathFilter.excludes(sources, "keep.log"))
    assertMatch(PathFilter.match(sources, "keep.log"), "None")
    assertMatch(PathFilter.match(sources, "x.log"), "Exclude", gitignore.rules[0])
    assertFalse(PathFilter.excludes(sources, "a/x.ts"))
  })
})
