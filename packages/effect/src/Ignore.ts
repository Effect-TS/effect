/**
 * Matches root-relative paths against `.gitignore` or `.dockerignore` rules
 * without accessing the file system. Pass an `Ignore` to `FileSystem.glob` to
 * filter a walk with the same rules.
 *
 * **Details**
 *
 * The two formats share "last matching rule wins" and `!` exceptions, but
 * differ elsewhere, so each keeps its own semantics:
 *
 * - Git rules apply below their `base` directory. A rule without a `/`
 *   (other than a trailing one) matches a name at any depth, and any other `/`
 *   anchors it to the base. A trailing `/` matches only directories. An
 *   exception cannot re-include a path inside an excluded directory.
 * - Docker rules are anchored at the build context root, `**` may appear
 *   anywhere in a pattern, a trailing `/` has no meaning, and an exception can
 *   re-include a path inside an excluded directory.
 *
 * Discovering ignore files is up to the caller. For Git, combine sources from
 * lowest to highest precedence with {@link concat}: `core.excludesFile`, then
 * `.git/info/exclude`, then each `.gitignore` from the root down, passing its
 * directory as `base`. For Docker, read `<Dockerfile>.dockerignore` next to the
 * Dockerfile if it exists, otherwise `.dockerignore` at the context root; the
 * Dockerfile-specific file replaces the root one.
 *
 * **Gotchas**
 *
 * Git compatibility has documented limits. Names are matched by Unicode code
 * point rather than by byte, so `?` and negated classes such as `[!a]` match a
 * non-ASCII character that Git would not. A `/` inside a bracket class makes
 * the rule match nothing. Matching is case-sensitive (`core.ignorecase` is not
 * supported) and tracked files are not considered.
 *
 * Docker patterns use `/` as the separator on every platform. Docker turns
 * each pattern into a Go regular expression, and some patterns reach that
 * engine as regular expression syntax instead of glob syntax. These are
 * rejected with a {@link ParseError}: a backslash before a letter, digit or
 * non-ASCII character (`\d`), a trailing backslash, `^` outside a bracket
 * class, and `*` or `?` inside one. Patterns whose generated expression Docker
 * fails to compile, such as an unknown class name like `[[:foo:]]`, are also
 * rejected up front; Docker only reports them once a path reaches them.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Data from "./Data.ts"
import { format } from "./Formatter.ts"
import { dual } from "./Function.ts"
import { type Inspectable, NodeInspectSymbol } from "./Inspectable.ts"
import type * as Glob from "./internal/glob.ts"
import * as internal from "./internal/ignore.ts"
import { type Pipeable, pipeArguments } from "./Pipeable.ts"
import * as Result from "./Result.ts"

const TypeId = "~effect/Ignore"

/**
 * Compiled `.gitignore` or `.dockerignore` rules.
 *
 * **Details**
 *
 * `format` records which semantics the rules follow. Test paths with
 * {@link ignores} or pass the value as the `ignore` option of
 * `FileSystem.glob`.
 *
 * @see {@link gitignore} for Git rules
 * @see {@link dockerignore} for Docker rules
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Ignore extends Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly format: "gitignore" | "dockerignore"
}

type IgnoreImpl =
  & Ignore
  & internal.Matcher
  & (
    | { readonly format: "gitignore"; readonly rules: ReadonlyArray<internal.GitRule> }
    | { readonly format: "dockerignore"; readonly patterns: ReadonlyArray<internal.DockerPattern> }
  )

const IgnoreProto = {
  [TypeId]: TypeId,
  toJSON(this: Ignore) {
    return { _id: "Ignore", format: this.format }
  },
  toString(this: Ignore) {
    return `Ignore(${format(this.toJSON())})`
  },
  [NodeInspectSymbol](this: Ignore) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeGit = (rules: ReadonlyArray<internal.GitRule>): Ignore => {
  const self = Object.create(IgnoreProto)
  self.format = "gitignore"
  self.rules = rules
  const matcher = internal.gitMatcher(rules)
  self.walker = matcher.walker satisfies Glob.IgnoreWalker
  self.ignores = matcher.ignores
  return self
}

const makeDocker = (patterns: ReadonlyArray<internal.DockerPattern>): Ignore => {
  const self = Object.create(IgnoreProto)
  self.format = "dockerignore"
  self.patterns = patterns
  const matcher = internal.dockerMatcher(patterns)
  self.walker = matcher.walker
  self.ignores = matcher.ignores
  return self
}

/**
 * The error returned by {@link dockerignore} for a pattern Docker rejects or
 * that relies on regular expression syntax.
 *
 * **Details**
 *
 * `line` is the 1-based line number in the source, counting blank and comment
 * lines, and `pattern` is that line without surrounding whitespace.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class ParseError extends Data.TaggedError("IgnoreParseError")<{
  readonly line: number
  readonly pattern: string
  readonly message: string
}> {}

/**
 * Parses the contents of a `.gitignore` file.
 *
 * **Details**
 *
 * `base` is the `/`-separated directory, relative to the root, that contains
 * the file; it defaults to the root. Rules only apply to paths strictly below
 * it, and its segments are matched literally.
 *
 * Lines are read as Git reads them: blank lines and lines starting with `#`
 * are skipped, `\#` and `\!` escape a leading `#` or `!`, and trailing spaces
 * are dropped unless escaped with `\`. Only `**\/`, `/**` and `/**\/` are
 * special; any other `**` is a plain `*`. Malformed rules, such as an unclosed
 * `[` or a trailing `\`, match nothing, as in Git.
 *
 * **Gotchas**
 *
 * A `base` with an empty, `.` or `..` segment is a defect.
 *
 * **Example** (Matching Git rules)
 *
 * ```ts import.meta.vitest
 * import { Ignore } from "effect"
 *
 * const ignore = Ignore.gitignore("node_modules/\n*.log\n!keep.log\n")
 *
 * Ignore.ignores(ignore, "node_modules/") // => true
 * Ignore.ignores(ignore, "src/debug.log") // => true
 * Ignore.ignores(ignore, "keep.log") // => false
 * // a file named `node_modules` is not matched by the directory rule
 * Ignore.ignores(ignore, "node_modules") // => false
 * ```
 *
 * @see {@link concat} for combining nested `.gitignore` files
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const gitignore = (source: string, options?: {
  /** The directory containing the file, relative to the root. */
  readonly base?: string | undefined
}): Ignore => makeGit(internal.parseGitignore(source, internal.splitBase(options?.base ?? "")))

/**
 * Parses the contents of a `.dockerignore` file.
 *
 * **Details**
 *
 * Lines are read as Docker reads them: a line starting with `#` is a comment,
 * surrounding whitespace is trimmed, and each pattern is cleaned, so `./a`,
 * `/a` and `a/` all mean `a`. `**` matches any number of characters including
 * `/` wherever it appears, and a pattern also matches every path inside a
 * matching directory.
 *
 * Fails with a {@link ParseError} where Docker rejects the file, such as for a
 * lone `!` or an unclosed `[`, and for the regular expression syntax described
 * in the module documentation.
 *
 * **Example** (Re-including a file)
 *
 * ```ts import.meta.vitest
 * import { Ignore, Result } from "effect"
 *
 * const ignore = Result.getOrThrow(Ignore.dockerignore("node_modules\n!node_modules/keep.txt\n"))
 *
 * Ignore.ignores(ignore, "node_modules/pkg/index.js") // => true
 * Ignore.ignores(ignore, "node_modules/keep.txt") // => false
 * Result.isFailure(Ignore.dockerignore("!")) // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const dockerignore = (source: string): Result.Result<Ignore, ParseError> => {
  const parsed = internal.parseDockerignore(source)
  return Array.isArray(parsed) ? Result.succeed(makeDocker(parsed)) : Result.fail(new ParseError(parsed))
}

/**
 * Combines two sets of rules of the same format, with `that` taking
 * precedence.
 *
 * **Details**
 *
 * The result evaluates the rules of `self` followed by those of `that`, so a
 * matching rule in `that` wins, like a deeper `.gitignore` or a later line.
 *
 * **Gotchas**
 *
 * Combining a `gitignore` with a `dockerignore` is a defect, because the two
 * formats treat excluded directories differently.
 *
 * **Example** (Combining nested .gitignore files)
 *
 * ```ts import.meta.vitest
 * import { Ignore } from "effect"
 *
 * const root = Ignore.gitignore("*.log\n")
 * const nested = Ignore.gitignore("!/keep.log\n", { base: "logs" })
 * const ignore = Ignore.concat(root, nested)
 *
 * Ignore.ignores(ignore, "keep.log") // => true
 * Ignore.ignores(ignore, "logs/keep.log") // => false
 * Ignore.ignores(ignore, "logs/other.log") // => true
 * ```
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const concat: {
  (that: Ignore): (self: Ignore) => Ignore
  (self: Ignore, that: Ignore): Ignore
} = dual(2, (self: Ignore, that: Ignore): Ignore => {
  const left = self as IgnoreImpl
  const right = that as IgnoreImpl
  if (left.format === "gitignore" && right.format === "gitignore") {
    return makeGit([...left.rules, ...right.rules])
  }
  if (left.format === "dockerignore" && right.format === "dockerignore") {
    return makeDocker([...left.patterns, ...right.patterns])
  }
  throw new Error(`Ignore.concat cannot combine ${left.format} with ${right.format}`)
})

/**
 * Tests whether rules ignore a `/`-separated path relative to the root.
 *
 * **Details**
 *
 * A trailing `/` marks the path as a directory, which Git directory-only rules
 * require; pass a symbolic link without it, even when it points to a
 * directory. Empty and `.` segments are dropped. A path is also ignored when
 * an ignored ancestor directory makes it so, following each format's rules.
 *
 * **Gotchas**
 *
 * A path with a `..` segment is a defect.
 *
 * **Example** (Filtering paths)
 *
 * ```ts import.meta.vitest
 * import { Ignore, pipe } from "effect"
 *
 * const ignore = Ignore.gitignore("dist/\n")
 * const paths = ["src/index.ts", "dist/index.js"]
 *
 * paths.filter((path) => !Ignore.ignores(ignore, path)) // => ["src/index.ts"]
 * pipe(ignore, Ignore.ignores("./dist/")) // => true
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.0
 */
export const ignores: {
  (path: string): (self: Ignore) => boolean
  (self: Ignore, path: string): boolean
} = dual(2, (self: Ignore, path: string): boolean => (self as IgnoreImpl).ignores(path))
