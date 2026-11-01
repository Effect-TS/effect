import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Ignore, Result } from "effect"

const assertIgnores = (
  ignore: Ignore.Ignore,
  ignored: ReadonlyArray<string>,
  kept: ReadonlyArray<string>,
  label: string
) => {
  for (const path of ignored) {
    assertTrue(Ignore.ignores(ignore, path), `expected ${label} to ignore ${JSON.stringify(path)}`)
  }
  for (const path of kept) {
    assertFalse(Ignore.ignores(ignore, path), `expected ${label} to keep ${JSON.stringify(path)}`)
  }
}

const dockerignore = (source: string) => Result.getOrThrow(Ignore.dockerignore(source))

// Expectations from `git check-ignore --no-index` (git 2.54.0) against a
// fixture tree. Paths ending in "/" are directories.
const gitCases: ReadonlyArray<{
  readonly source: string
  readonly base?: string
  readonly nested?: readonly [base: string, source: string]
  readonly ignored?: ReadonlyArray<string>
  readonly kept?: ReadonlyArray<string>
}> = [
  { source: "node_modules\n!node_modules/keep.txt\n", ignored: ["node_modules/", "node_modules/keep.txt"] },
  { source: "d/x\n!/d\n", ignored: ["d/x"], kept: ["d/"] },
  {
    source: "/*\n!/foo\n/foo/*\n!/foo/bar\n",
    ignored: ["a", "foo/baz"],
    kept: ["foo/", "foo/bar/", "foo/bar/x"]
  },
  {
    source: "vmlinux*\n",
    nested: ["arch/foo/kernel", "!/vmlinux*\n"],
    ignored: ["vmlinux.o", "arch/vmlinux.o", "arch/foo/kernel/sub/vmlinux.x"],
    kept: ["arch/foo/kernel/vmlinux.lds"]
  },
  { source: "sub\n*.txt\n", base: "sub", ignored: ["sub/a.txt", "sub/sub"], kept: ["a.txt", "sub/"] },
  { source: "x\n", base: "[a]", ignored: ["[a]/x"], kept: ["a/x"] },
  { source: "hello.*\n", ignored: ["hello.c", "a/hello.c"] },
  { source: "/hello.*\n", ignored: ["hello.c"], kept: ["a/hello.c"] },
  { source: "doc/frotz/\n", ignored: ["doc/frotz/"], kept: ["a/doc/frotz/"] },
  { source: "frotz/\n", ignored: ["a/frotz/"], kept: ["b/frotz"] },
  { source: "foo/*\n", ignored: ["foo/bar"], kept: ["foo/", "a/foo/bar"] },
  { source: "abc/**\n", ignored: ["abc/x"], kept: ["abc/"] },
  { source: "**/foo\n", ignored: ["foo", "a/b/foo"] },
  { source: "a/**/b\n", ignored: ["a/b", "a/x/y/b"] },
  { source: "a**b\n", ignored: ["axb"], kept: ["ax/b"] },
  { source: "#x\n\\#y\n\\!z\n", ignored: ["#y", "!z"], kept: ["#x"] },
  { source: "a\\ \nb \n", ignored: ["a ", "b"], kept: ["a", "b "] },
  { source: "{a,b}\n", ignored: ["{a,b}"], kept: ["a"] },
  { source: "[!a]\n", ignored: ["b"], kept: ["a"] },
  { source: "c\\\n", kept: ["c", "c\\"] },
  { source: "﻿bom\r\ncrlf\r\n", ignored: ["bom", "crlf"] },
  { source: "./foo\na//b\n[ab\n", kept: ["foo", "a/b", "[ab"] },
  { source: "*\n", ignored: [".env"] },
  { source: "[[:word:]]\n", kept: ["_"] },
  // class names resolve as own properties, not through the prototype
  { source: "[[:toString:]]\n", kept: ["t"] }
]

// Documented deviations from Git: code-point matching, and "/" inside a
// bracket class. Git's result is kept next to ours so changing either is a
// deliberate edit.
const gitDeviations: ReadonlyArray<{
  readonly source: string
  readonly path: string
  readonly git: boolean
  readonly effect: boolean
}> = [
  { source: "[x/]y\n", path: "xy", git: true, effect: false },
  { source: "?\n", path: "é", git: false, effect: true },
  { source: "[!a]x\n", path: "éx", git: false, effect: true }
]

// `TestMatches` and `matchTests` from moby/patternmatcher@5a6d8429a19bb6948a372ff19e86fe83599a04b7
// (patternmatcher_test.go), evaluated with `MatchesOrParentMatches`. The two
// rows matching the path "/" are omitted because ignore paths are root-relative.
const dockerReference: ReadonlyArray<readonly [pattern: string, path: string, ignored: boolean]> = [
  ["**", "file", true],
  ["**", "file/", true],
  ["**/", "file", true],
  ["**/", "file/", true],
  ["**", "dir/file", true],
  ["**/", "dir/file", true],
  ["**", "dir/file/", true],
  ["**/", "dir/file/", true],
  ["**/**", "dir/file", true],
  ["**/**", "dir/file/", true],
  ["dir/**", "dir/file", true],
  ["dir/**", "dir/file/", true],
  ["dir/**", "dir/dir2/file", true],
  ["dir/**", "dir/dir2/file/", true],
  ["**/dir", "dir", true],
  ["**/dir", "dir/file", true],
  ["**/dir2/*", "dir/dir2/file", true],
  ["**/dir2/*", "dir/dir2/file/", true],
  ["**/dir2/**", "dir/dir2/dir3/file", true],
  ["**/dir2/**", "dir/dir2/dir3/file/", true],
  ["**file", "file", true],
  ["**file", "dir/file", true],
  ["**/file", "dir/file", true],
  ["**file", "dir/dir/file", true],
  ["**/file", "dir/dir/file", true],
  ["**/file*", "dir/dir/file", true],
  ["**/file*", "dir/dir/file.txt", true],
  ["**/file*txt", "dir/dir/file.txt", true],
  ["**/file*.txt", "dir/dir/file.txt", true],
  ["**/file*.txt*", "dir/dir/file.txt", true],
  ["**/**/*.txt", "dir/dir/file.txt", true],
  ["**/**/*.txt2", "dir/dir/file.txt", false],
  ["**/*.txt", "file.txt", true],
  ["**/**/*.txt", "file.txt", true],
  ["a**/*.txt", "a/file.txt", true],
  ["a**/*.txt", "a/dir/file.txt", true],
  ["a**/*.txt", "a/dir/dir/file.txt", true],
  ["a/*.txt", "a/dir/file.txt", false],
  ["a/*.txt", "a/file.txt", true],
  ["a/*.txt**", "a/file.txt", true],
  ["a[b-d]e", "ae", false],
  ["a[b-d]e", "ace", true],
  ["a[b-d]e", "aae", false],
  ["a[^b-d]e", "aze", true],
  [".*", ".foo", true],
  [".*", "foo", false],
  ["abc.def", "abcdef", false],
  ["abc.def", "abc.def", true],
  ["abc.def", "abcZdef", false],
  ["abc?def", "abcZdef", true],
  ["abc?def", "abcdef", false],
  ["a\\\\", "a\\", true],
  ["**/foo/bar", "foo/bar", true],
  ["**/foo/bar", "dir/foo/bar", true],
  ["**/foo/bar", "dir/dir2/foo/bar", true],
  ["abc/**", "abc", false],
  ["abc/**", "abc/def", true],
  ["abc/**", "abc/def/ghi", true],
  ["**/.foo", ".foo", true],
  ["**/.foo", "bar.foo", false],
  ["a(b)c/def", "a(b)c/def", true],
  ["a(b)c/def", "a(b)c/xyz", false],
  ["a.|)$(}+{bc", "a.|)$(}+{bc", true],
  [
    "dist/proxy.py-2.4.0rc3.dev36+g08acad9-py3-none-any.whl",
    "dist/proxy.py-2.4.0rc3.dev36+g08acad9-py3-none-any.whl",
    true
  ],
  ["dist/*.whl", "dist/proxy.py-2.4.0rc3.dev36+g08acad9-py3-none-any.whl", true],
  ["**\n!util/docker/web", "util/docker/web/foo", false],
  ["**\n!util/docker/web\nutil/docker/web/foo", "util/docker/web/foo", true],
  [
    "**\n!dist/proxy.py-2.4.0rc3.dev36+g08acad9-py3-none-any.whl",
    "dist/proxy.py-2.4.0rc3.dev36+g08acad9-py3-none-any.whl",
    false
  ],
  ["**\n!dist/*.whl", "dist/proxy.py-2.4.0rc3.dev36+g08acad9-py3-none-any.whl", false],
  ["abc", "abc", true],
  ["*", "abc", true],
  ["*c", "abc", true],
  ["a*", "a", true],
  ["a*", "abc", true],
  ["a*", "ab/c", true],
  ["a*/b", "abc/b", true],
  ["a*/b", "a/c/b", false],
  ["a*b*c*d*e*/f", "axbxcxdxe/f", true],
  ["a*b*c*d*e*/f", "axbxcxdxexxx/f", true],
  ["a*b*c*d*e*/f", "axbxcxdxe/xxx/f", false],
  ["a*b*c*d*e*/f", "axbxcxdxexxx/fff", false],
  ["a*b?c*x", "abxbbxdbxebxczzx", true],
  ["a*b?c*x", "abxbbxdbxebxczzy", false],
  ["ab[c]", "abc", true],
  ["ab[b-d]", "abc", true],
  ["ab[e-g]", "abc", false],
  ["ab[^c]", "abc", false],
  ["ab[^b-d]", "abc", false],
  ["ab[^e-g]", "abc", true],
  ["a\\*b", "a*b", true],
  ["a\\*b", "ab", false],
  ["a?b", "a☺b", true],
  ["a[^a]b", "a☺b", true],
  ["a???b", "a☺b", false],
  ["a[^a][^a][^a]b", "a☺b", false],
  ["[a-ζ]*", "α", true],
  ["*[a-ζ]", "A", false],
  ["a?b", "a/b", false],
  ["a*b", "a/b", false],
  ["[\\]a]", "]", true],
  ["[\\-]", "-", true],
  ["[x\\-]", "x", true],
  ["[x\\-]", "-", true],
  ["[x\\-]", "z", false],
  ["[\\-x]", "x", true],
  ["[\\-x]", "-", true],
  ["[\\-x]", "a", false],
  ["*x", "xxx", true]
]

// Profile rows, checked against moby/patternmatcher@5a6d842 `ignorefile.ReadAll`
// followed by `MatchesOrParentMatches`.
const dockerCases: ReadonlyArray<{
  readonly source: string
  readonly ignored?: ReadonlyArray<string>
  readonly kept?: ReadonlyArray<string>
}> = [
  { source: "d/x\n!/d\n", kept: ["d/", "d/x"] },
  {
    source: "node_modules\n!node_modules/keep.txt\n",
    ignored: ["node_modules/", "node_modules/x"],
    kept: ["node_modules/keep.txt"]
  },
  { source: "*.md\n!README*.md\nREADME-secret.md\n", ignored: ["x.md", "README-secret.md"], kept: ["README.md"] },
  { source: "*.md\nREADME-secret.md\n!README*.md\n", ignored: ["x.md"], kept: ["README.md", "README-secret.md"] },
  { source: "temp?\n", ignored: ["tempa"], kept: ["a/tempa"] },
  { source: "*/temp*\n", ignored: ["a/temp1"], kept: ["temp1", "a/b/temp1"] },
  { source: "d\n!d/keep\nd\n", ignored: ["d/keep"] },
  { source: "#x\n  #y\n\\#z\n", ignored: ["#y", "#z"], kept: ["#x"] },
  { source: "﻿bom\r\ncrlf\r\n", ignored: ["bom", "crlf"] },
  { source: "./a\n/b\nc/\nd/../e\n.\n", ignored: ["a", "b", "c", "e"], kept: ["d", "x"] },
  { source: "*\n!  keep\n", ignored: ["other"], kept: ["keep"] },
  { source: "[!a]x\n", ignored: ["ax", "!x"], kept: ["bx"] },
  { source: "{a,b}\n", ignored: ["{a,b}"], kept: ["a"] },
  { source: "*\n", ignored: [".env"] },
  { source: "?\n", ignored: ["😀"] },
  { source: "a**/b\n", ignored: ["a\r/b"], kept: ["a\n/b"] },
  { source: "**\n", ignored: ["a\nb"] },
  { source: "**file\n", ignored: ["a\nfile", "dir/xfile"] },
  { source: "**file*\n", kept: ["dir/xfile"] },
  { source: "[[:digit:]]\n[[:word:]]x\n", ignored: ["7", "_x"] }
]

describe("Ignore", () => {
  describe("gitignore", () => {
    for (const { base, ignored = [], kept = [], nested, source } of gitCases) {
      const label = JSON.stringify(nested ? [source, ...nested] : base ? [base, source] : source)
      it(label, () => {
        const root = Ignore.gitignore(source, base === undefined ? undefined : { base })
        const ignore = nested ? Ignore.concat(root, Ignore.gitignore(nested[1], { base: nested[0] })) : root
        assertIgnores(ignore, ignored, kept, label)
      })
    }

    it("documented deviations", () => {
      for (const { effect, path, source } of gitDeviations) {
        assert.strictEqual(Ignore.ignores(Ignore.gitignore(source), path), effect, `${source} against ${path}`)
      }
    })
  })

  describe("dockerignore", () => {
    it("moby/patternmatcher fixtures", () => {
      for (const [source, path, expected] of dockerReference) {
        assert.strictEqual(Ignore.ignores(dockerignore(source), path), expected, `${source} against ${path}`)
      }
    })

    for (const { ignored = [], kept = [], source } of dockerCases) {
      const label = JSON.stringify(source)
      it(label, () => assertIgnores(dockerignore(source), ignored, kept, label))
    }

    it("fails where the reference rejects the pattern or leaks regexp syntax", () => {
      const reference = ["!", "[", "[^", "[^bc", "a[", "a\\", "[]a]", "[-]", "[x-]", "[-x]", "[a-b-c]"]
      // `[*]` matches "]" and `a*\` matches "a$" in the reference; `[[:toString:]]`
      // fails when the reference compiles its expression
      const leaks = ["\\d", "a^b*", "[*]", "[?]", "a*\\", "[[:foo:]]", "[[:toString:]]"]
      for (const source of [...reference, ...leaks]) {
        assertTrue(Result.isFailure(Ignore.dockerignore(source)), `expected ${JSON.stringify(source)} to fail`)
      }
      const result = Ignore.dockerignore("ok\n\n[\n")
      assert(Result.isFailure(result))
      assert.strictEqual(result.failure._tag, "IgnoreParseError")
      assert.strictEqual(result.failure.line, 3)
    })

    it("trims whitespace in linear time", () => {
      const start = performance.now()
      assertTrue(Result.isSuccess(Ignore.dockerignore("x" + " ".repeat(40_000) + "y")))
      assertTrue(performance.now() - start < 500)
    })

    it("matches repeated wildcards in linear time", () => {
      const ignore = dockerignore("*a".repeat(30) + "b")
      const start = performance.now()
      assertFalse(Ignore.ignores(ignore, "a".repeat(5_000)))
      assertTrue(performance.now() - start < 500)
    })
  })

  it("canonicalizes paths and rejects parent segments", () => {
    const ignore = Ignore.gitignore("a/b\n")
    assertTrue(Ignore.ignores(ignore, "./a//b"))
    assert.throws(() => Ignore.ignores(ignore, "a/../a/b"))
  })

  it("rejects a base with empty, . or .. segments", () => {
    assertTrue(Ignore.ignores(Ignore.gitignore("x\n", { base: "a" }), "a/x"))
    for (const base of ["a//b", "./a", "a/.."]) {
      assert.throws(() => Ignore.gitignore("x\n", { base }))
    }
  })

  it("concat requires the same format", () => {
    assertTrue(Ignore.ignores(Ignore.concat(dockerignore("a\n"), dockerignore("b\n")), "a"))
    assert.throws(() => Ignore.concat(Ignore.gitignore("a\n"), dockerignore("a\n")))
  })
})
