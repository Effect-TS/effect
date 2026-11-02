/**
 * Parses `.gitignore` and `.dockerignore` files into a `PathFilter`, which
 * matches root-relative paths without accessing the file system or can be
 * passed as the `filter` option of `FileSystem.glob`.
 *
 * **Details**
 *
 * In both formats the last matching line wins and `!` adds an exception. They
 * differ otherwise:
 *
 * - Git lines apply below their `scope` directory. A line with a `/` other
 *   than a trailing one is anchored to the scope; otherwise it matches a name
 *   at any depth. A trailing `/` matches only directories. An exception cannot
 *   re-include a path inside an excluded directory.
 * - Docker lines are anchored at the build context root, `**` may appear
 *   anywhere, a trailing `/` is ignored, and an exception can re-include a
 *   path inside an excluded directory.
 *
 * Callers find and read the ignore files. For Git, combine them with
 * `PathFilter.concat` from lowest to highest precedence: `core.excludesFile`,
 * `.git/info/exclude`, then each `.gitignore` from the root down with its
 * directory as `scope`. For Docker, use `<Dockerfile>.dockerignore` next to
 * the Dockerfile if it exists, otherwise the context root's `.dockerignore`.
 *
 * **Gotchas**
 *
 * Git compatibility has limits. Names are matched by Unicode code point rather
 * than by byte, so `?` and negated classes such as `[!a]` match a non-ASCII
 * character that Git would not. A `/` inside a bracket class makes the line
 * match nothing. Matching is case-sensitive (`core.ignorecase` is not
 * supported) and tracked files are not considered.
 *
 * Docker patterns use `/` on every platform. Patterns that Docker would read
 * as regular expression syntax fail with a {@link ParseError}; see
 * {@link dockerignore}.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Data from "./Data.ts"
import * as Glob from "./internal/glob.ts"
import * as Engine from "./internal/pathFilter.ts"
import * as PathFilter from "./PathFilter.ts"
import * as Result from "./Result.ts"

/**
 * The error returned by {@link dockerignore} for a pattern that Docker rejects
 * or reads as regular expression syntax.
 *
 * **Details**
 *
 * `line` is the 1-based line number in the source, counting blank and comment
 * lines, and `pattern` is that line without surrounding whitespace.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class ParseError extends Data.TaggedError("IgnoreFileParseError")<{
  readonly line: number
  readonly pattern: string
  readonly message: string
}> {}

/**
 * Parses the contents of a `.gitignore` file into a `PathFilter`.
 *
 * **Details**
 *
 * `scope` is the `/`-separated directory, relative to the root, that contains
 * the file; it defaults to the root. Lines only apply to paths strictly below
 * it, and its segments are matched literally.
 *
 * Lines are read as Git reads them: blank lines and lines starting with `#`
 * are skipped, `\#` and `\!` escape a leading `#` or `!`, and trailing spaces
 * are dropped unless escaped with `\`. Only `**\/`, `/**` and `/**\/` are
 * special; any other `**` is a plain `*`. Malformed lines, such as an unclosed
 * `[` or a trailing `\`, match nothing, as in Git, and produce no rule.
 *
 * Every other line becomes one rule, in order: an exclusion with `subtree:
 * "barrier"`, or for a `!` line an inclusion with `subtree: "self"`.
 *
 * **Gotchas**
 *
 * A `scope` with an empty, `.` or `..` segment is a defect.
 *
 * **Example** (Matching Git rules)
 *
 * ```ts import.meta.vitest
 * import { IgnoreFile, PathFilter } from "effect"
 *
 * const filter = IgnoreFile.gitignore("node_modules/\n*.log\n!keep.log\n")
 *
 * PathFilter.excludes(filter, "node_modules", { directory: true }) // => true
 * PathFilter.excludes(filter, "src/debug.log") // => true
 * PathFilter.excludes(filter, "keep.log") // => false
 * // a file named `node_modules` is not matched by the directory rule
 * PathFilter.excludes(filter, "node_modules") // => false
 * ```
 *
 * **Example** (Combining nested .gitignore files)
 *
 * ```ts import.meta.vitest
 * import { IgnoreFile, PathFilter } from "effect"
 *
 * const filter = PathFilter.concat(
 *   IgnoreFile.gitignore("*.log\n"),
 *   IgnoreFile.gitignore("!/keep.log\n", { scope: "logs" })
 * )
 *
 * PathFilter.excludes(filter, "keep.log") // => true
 * PathFilter.excludes(filter, "logs/keep.log") // => false
 * PathFilter.excludes(filter, "logs/other.log") // => true
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const gitignore = (source: string, options?: {
  /** The directory containing the file, relative to the root. */
  readonly scope?: string | undefined
}): PathFilter.PathFilter => {
  const scope = Engine.splitScope(options?.scope ?? "")
  return PathFilter.make(
    parseGitignore(source).map(({ directoryOnly, negated, nodes }): PathFilter.Rule => {
      const matcher = Glob.pathMatcher(Glob.fromNodes(nodes, new Set([0]), true))
      return negated
        ? { _tag: "Include", matcher, directoryOnly, scope, subtree: "self" }
        : { _tag: "Exclude", matcher, directoryOnly, scope, subtree: "barrier" }
    })
  )
}

/**
 * Parses the contents of a `.dockerignore` file into a `PathFilter`.
 *
 * **Details**
 *
 * Lines are read as Docker reads them: a line starting with `#` is a comment,
 * surrounding whitespace is trimmed, and each pattern is cleaned, so `./a`,
 * `/a` and `a/` all mean `a`. `**` matches any number of characters including
 * `/` wherever it appears, and a pattern also matches every path inside a
 * matching directory.
 *
 * Every other line becomes one rule with `subtree: "inherit"`, in order: an
 * exclusion, or for a `!` line an inclusion.
 *
 * Fails with a {@link ParseError} where Docker rejects the file, such as for a
 * lone `!` or an unclosed `[`.
 *
 * **Gotchas**
 *
 * Docker reads some patterns as Go regular expression syntax rather than glob
 * syntax. These fail with a {@link ParseError}; each has a working spelling:
 *
 * - `*` or `?` inside a bracket class, such as `[*]`, which Docker reads as
 *   part of a larger expression. Write `[\*]` or `[\?]` for the literal
 *   character.
 * - A trailing backslash, such as `a*\`, which Docker reads as a literal `$`.
 *   Write `\\` for a literal backslash.
 * - `^` outside a bracket class, which Docker reads as an anchor. Write `\^`.
 * - A backslash before a letter or digit, such as `\d`, which Docker reads as
 *   a regular expression class, and a backslash before a non-ASCII character,
 *   which Docker rejects. Write the character without the backslash.
 *
 * Unknown character class names, such as `[[:foo:]]`, also fail, because Docker
 * cannot compile them. The supported names are `alnum`, `alpha`, `ascii`,
 * `blank`, `cntrl`, `digit`, `graph`, `lower`, `print`, `punct`, `space`,
 * `upper`, `word` and `xdigit`, each optionally negated as `[:^name:]`.
 *
 * **Example** (Re-including a file)
 *
 * ```ts import.meta.vitest
 * import { IgnoreFile, PathFilter, Result } from "effect"
 *
 * const filter = Result.getOrThrow(IgnoreFile.dockerignore("node_modules\n!node_modules/keep.txt\n"))
 *
 * PathFilter.excludes(filter, "node_modules/pkg/index.js") // => true
 * PathFilter.excludes(filter, "node_modules/keep.txt") // => false
 * Result.isFailure(IgnoreFile.dockerignore("!")) // => true
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const dockerignore = (source: string): Result.Result<PathFilter.PathFilter, ParseError> => {
  const parsed = parseDockerignore(source)
  if (!Array.isArray(parsed)) {
    return Result.fail(new ParseError(parsed))
  }
  return Result.succeed(PathFilter.make(parsed.map(({ exclusion, matcher }): PathFilter.Rule =>
    exclusion
      ? { _tag: "Include", matcher, directoryOnly: false, scope: [], subtree: "inherit" }
      : { _tag: "Exclude", matcher, directoryOnly: false, scope: [], subtree: "inherit" }
  )))
}

const codePoint = (char: string): number => char.codePointAt(0)!

const single = (char: string): Array<number> => [codePoint(char), codePoint(char)]

// Class names come from user input, so never resolve them through the prototype
const lookup = <A>(table: Record<string, A>, name: string): A | undefined =>
  Object.hasOwn(table, name) ? table[name] : undefined

// -----------------------------------------------------------------------------
// gitignore
// -----------------------------------------------------------------------------

interface GitRule {
  readonly negated: boolean
  readonly directoryOnly: boolean
  /** Segment nodes relative to the scope, ending in `End`. */
  readonly nodes: ReadonlyArray<Glob.Node>
}

// Git's `isspace` excludes vertical tab and form feed
const gitClasses: Record<string, ReadonlyArray<number>> = {
  alnum: [...Glob.range("0", "9"), ...Glob.range("A", "Z"), ...Glob.range("a", "z")],
  alpha: [...Glob.range("A", "Z"), ...Glob.range("a", "z")],
  blank: [0x09, 0x09, 0x20, 0x20],
  cntrl: [0x00, 0x1f, 0x7f, 0x7f],
  digit: Glob.range("0", "9"),
  graph: [0x21, 0x7e],
  lower: Glob.range("a", "z"),
  print: [0x20, 0x7e],
  punct: [0x21, 0x2f, 0x3a, 0x40, 0x5b, 0x60, 0x7b, 0x7e],
  space: [0x09, 0x0a, 0x0d, 0x0d, 0x20, 0x20],
  upper: Glob.range("A", "Z"),
  xdigit: [...Glob.range("0", "9"), ...Glob.range("A", "F"), ...Glob.range("a", "f")]
}

// wildmatch's bracket parser: `]` first is a member, an unknown class name or
// an unclosed class aborts the match, so the caller drops the rule.
const parseGitClass = (
  chars: ReadonlyArray<string>,
  open: number
): { readonly token: Glob.Token; readonly end: number } | undefined => {
  let i = open + 1
  const negated = chars[i] === "!" || chars[i] === "^"
  if (negated) {
    i++
  }
  const ranges: Array<number> = []
  let char: string | undefined = chars[i]
  let previous: string | undefined
  do {
    if (char === undefined) {
      return undefined
    }
    if (char === "\\") {
      char = chars[++i]
      if (char === undefined) {
        return undefined
      }
      ranges.push(...single(char))
    } else if (char === "-" && previous !== undefined && chars[i + 1] !== undefined && chars[i + 1] !== "]") {
      char = chars[++i]
      if (char === "\\") {
        char = chars[++i]
        if (char === undefined) {
          return undefined
        }
      }
      ranges.push(codePoint(previous), codePoint(char))
      char = undefined
    } else if (char === "[" && chars[i + 1] === ":") {
      let end = i + 2
      while (chars[end] !== undefined && chars[end] !== "]") {
        end++
      }
      if (chars[end] === undefined) {
        return undefined
      }
      if (end === i + 2 || chars[end - 1] !== ":") {
        // not a class name, so `[` is a member
        ranges.push(...single(char))
      } else {
        const members = lookup(gitClasses, chars.slice(i + 2, end - 1).join(""))
        if (members === undefined) {
          return undefined
        }
        ranges.push(...members)
        i = end
        char = undefined
      }
    } else {
      ranges.push(...single(char))
    }
    previous = char
    char = chars[++i]
  } while (char !== "]")
  return { token: { _tag: "Class", ranges, negated }, end: i }
}

// Compiles one segment; `**` inside a segment is a plain `*`.
const compileGitSegment = (segment: string): Glob.Node | undefined => {
  const chars = Array.from(segment)
  const tokens: Array<Glob.Token> = []
  let literal = ""
  let magic = false
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === "\\") {
      if (i + 1 === chars.length) {
        return undefined
      }
      literal += chars[++i]
      tokens.push({ _tag: "Char", code: codePoint(chars[i]) })
    } else if (char === "*") {
      magic = true
      if (tokens[tokens.length - 1]?._tag !== "Star") {
        tokens.push({ _tag: "Star" })
      }
    } else if (char === "?") {
      magic = true
      tokens.push({ _tag: "Any" })
    } else if (char === "[") {
      const parsed = parseGitClass(chars, i)
      if (parsed === undefined) {
        return undefined
      }
      magic = true
      tokens.push(parsed.token)
      i = parsed.end
    } else {
      literal += char
      tokens.push({ _tag: "Char", code: codePoint(char) })
    }
  }
  return magic ? Glob.makeWildcard(tokens) : { _tag: "Literal", value: literal }
}

const globstar: Glob.Node = { _tag: "Globstar" }

const anySegment: Glob.Node = Glob.makeWildcard([{ _tag: "Star" }])

// git's `trim_trailing_spaces`: unescaped trailing spaces only
const trimTrailingSpaces = (line: string): string => {
  let space = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") {
      if (space === -1) {
        space = i
      }
    } else if (line[i] === "\\") {
      if (++i === line.length) {
        return line
      }
      space = -1
    } else {
      space = -1
    }
  }
  return space === -1 ? line : line.slice(0, space)
}

// wildmatch reads an escaped `\/` as a separator too
const splitGitSegments = (pattern: string): Array<string> => {
  const segments = pattern.split("/")
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    let escapes = 0
    while (segment[segment.length - 1 - escapes] === "\\") {
      escapes++
    }
    if (escapes % 2 === 1) {
      segments[i] = segment.slice(0, -1)
    }
  }
  return segments
}

// The rule, not the automaton, restricts a trailing `/` to directories
const end: Glob.Node = { _tag: "End", directoryOnly: false }

const parseGitRule = (line: string): GitRule | undefined => {
  let pattern = trimTrailingSpaces(line)
  const negated = pattern.startsWith("!")
  if (negated) {
    pattern = pattern.slice(1)
  }
  const directoryOnly = pattern.endsWith("/")
  if (directoryOnly) {
    pattern = pattern.slice(0, -1)
  }
  if (pattern === "") {
    return undefined
  }
  const nodes: Array<Glob.Node> = []
  if (!pattern.includes("/")) {
    // matches the basename at any depth below the scope
    const segment = compileGitSegment(pattern)
    if (segment === undefined) {
      return undefined
    }
    nodes.push(globstar, segment, end)
    return { negated, directoryOnly, nodes }
  }
  const segments = splitGitSegments(pattern.startsWith("/") ? pattern.slice(1) : pattern)
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment === "" || segment === ".") {
      return undefined
    }
    if (segment === "**") {
      if (i === segments.length - 1) {
        // a trailing `/**` matches everything inside, not the directory itself
        nodes.push(anySegment, globstar)
      } else if (nodes[nodes.length - 1] !== globstar) {
        nodes.push(globstar)
      }
      continue
    }
    const node = compileGitSegment(segment)
    if (node === undefined) {
      return undefined
    }
    nodes.push(node)
  }
  nodes.push(end)
  return { negated, directoryOnly, nodes }
}

const parseGitignore = (source: string): Array<GitRule> => {
  const rules: Array<GitRule> = []
  for (let line of (source.startsWith("﻿") ? source.slice(1) : source).split("\n")) {
    if (line.endsWith("\r")) {
      line = line.slice(0, -1)
    }
    if (line === "" || line.startsWith("#")) {
      continue
    }
    const rule = parseGitRule(line)
    if (rule !== undefined) {
      rules.push(rule)
    }
  }
  return rules
}

// -----------------------------------------------------------------------------
// dockerignore
// -----------------------------------------------------------------------------

interface DockerPattern {
  readonly exclusion: boolean
  readonly matcher: PathFilter.PathMatcher
}

interface DockerError {
  readonly line: number
  readonly pattern: string
  readonly message: string
}

type DockerToken =
  | { readonly _tag: "Char"; readonly code: number }
  | { readonly _tag: "Any" }
  | { readonly _tag: "Class"; readonly ranges: ReadonlyArray<number>; readonly negated: boolean }
  /** Zero or more code points other than `/`. */
  | { readonly _tag: "Star" }
  /** Zero or more code points other than LF, Go's `.*`. */
  | { readonly _tag: "StarAll" }
  /** Starts the optional `(.*\/)?` group, whose body is the next token. */
  | { readonly _tag: "GroupStart" }
  | { readonly _tag: "GroupBody" }

// Go's `unicode.IsSpace`, which unlike `String.prototype.trim` excludes U+FEFF
const isGoSpace = (code: number): boolean =>
  (code >= 0x09 && code <= 0x0d) || code === 0x20 || code === 0x85 || code === 0xa0 || code === 0x1680 ||
  (code >= 0x2000 && code <= 0x200a) || code === 0x2028 || code === 0x2029 || code === 0x202f ||
  code === 0x205f || code === 0x3000

// Go's `strings.TrimSpace`, scanning from both ends so the work stays linear
const goTrim = (value: string): string => {
  let start = 0
  let end = value.length
  while (start < end && isGoSpace(value.charCodeAt(start))) {
    start++
  }
  while (end > start && isGoSpace(value.charCodeAt(end - 1))) {
    end--
  }
  return value.slice(start, end)
}

// Go's `path.Clean`
const clean = (path: string): string => {
  if (path === "") {
    return "."
  }
  const rooted = path.startsWith("/")
  const out: Array<string> = []
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") {
      continue
    }
    if (segment === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") {
        out.pop()
      } else if (!rooted) {
        out.push("..")
      }
      continue
    }
    out.push(segment)
  }
  const joined = out.join("/")
  return rooted ? `/${joined}` : joined === "" ? "." : joined
}

// Port of Go's `filepath.Match(pattern, ".")`, which `PatternMatcher` uses to
// reject bad syntax. Only chunks reached before a mismatch are checked.
const isGoMatchSyntax = (pattern: ReadonlyArray<string>): boolean => {
  // an escaped class member followed by more of the chunk, or `undefined`
  const member = (
    chunk: ReadonlyArray<string>,
    at: number
  ): { readonly code: number; readonly end: number } | undefined => {
    if (at >= chunk.length || chunk[at] === "-" || chunk[at] === "]") {
      return undefined
    }
    if (chunk[at] === "\\" && ++at >= chunk.length) {
      return undefined
    }
    return at + 1 < chunk.length ? { code: codePoint(chunk[at]), end: at + 1 } : undefined
  }
  // the rest of `name` after a match, `false` on a mismatch, `undefined` on bad syntax
  const matchChunk = (chunk: ReadonlyArray<string>, name: ReadonlyArray<string>): number | false | undefined => {
    let failed = false
    let k = 0
    for (let c = 0; c < chunk.length;) {
      failed ||= k === name.length
      const char = chunk[c]
      if (char === "[") {
        const code: number = failed ? -1 : codePoint(name[k++])
        c++
        const negated = chunk[c] === "^"
        if (negated) {
          c++
        }
        let matched = false
        for (let ranges = 0; !(chunk[c] === "]" && ranges > 0); ranges++) {
          const lo = member(chunk, c)
          if (lo === undefined) {
            return undefined
          }
          let hi = lo
          if (chunk[lo.end] === "-") {
            const parsed = member(chunk, lo.end + 1)
            if (parsed === undefined) {
              return undefined
            }
            hi = parsed
          }
          matched ||= lo.code <= code && code <= hi.code
          c = hi.end
        }
        c++
        failed ||= matched === negated
      } else if (char === "?") {
        if (!failed) {
          failed = name[k++] === "/"
        }
        c++
      } else {
        if (char === "\\" && ++c === chunk.length) {
          return undefined
        }
        if (!failed) {
          failed = chunk[c] !== name[k++]
        }
        c++
      }
    }
    return failed ? false : k
  }
  let name: ReadonlyArray<string> = ["."]
  let p = 0
  outer: while (p < pattern.length) {
    let star = false
    while (pattern[p] === "*") {
      p++
      star = true
    }
    let end = p
    for (let inRange = false; end < pattern.length; end++) {
      const char = pattern[end]
      if (char === "\\") {
        if (end + 1 < pattern.length) {
          end++
        }
      } else if (char === "[") {
        inRange = true
      } else if (char === "]") {
        inRange = false
      } else if (char === "*" && !inRange) {
        break
      }
    }
    const chunk = pattern.slice(p, end)
    p = end
    if (star && chunk.length === 0) {
      return true
    }
    const rest = matchChunk(chunk, name)
    if (rest !== false && rest !== undefined && (rest === name.length || p < pattern.length)) {
      name = name.slice(rest)
      continue
    }
    if (rest === undefined) {
      return false
    }
    if (star) {
      for (let i = 0; i < name.length && name[i] !== "/"; i++) {
        const skipped = name.slice(i + 1)
        const next = matchChunk(chunk, skipped)
        if (next === undefined) {
          return false
        }
        if (next !== false && !(p === pattern.length && next < skipped.length)) {
          name = skipped.slice(next)
          continue outer
        }
      }
    }
    return true
  }
  return true
}

const re2Classes: Record<string, ReadonlyArray<number>> = {
  alnum: gitClasses.alnum,
  alpha: gitClasses.alpha,
  ascii: [0x00, 0x7f],
  blank: gitClasses.blank,
  cntrl: gitClasses.cntrl,
  digit: gitClasses.digit,
  graph: gitClasses.graph,
  lower: gitClasses.lower,
  print: gitClasses.print,
  punct: gitClasses.punct,
  space: [0x09, 0x0d, 0x20, 0x20],
  upper: gitClasses.upper,
  word: [...Glob.range("0", "9"), ...Glob.range("A", "Z"), 0x5f, 0x5f, ...Glob.range("a", "z")],
  xdigit: gitClasses.xdigit
}

const re2ClassNames = Object.keys(re2Classes).join(", ")

// Sorted, non-overlapping ranges, as the POSIX tables are
const complement = (ranges: ReadonlyArray<number>): Array<number> => {
  const out: Array<number> = []
  let next = 0
  for (let i = 0; i < ranges.length; i += 2) {
    if (ranges[i] > next) {
      out.push(next, ranges[i] - 1)
    }
    next = ranges[i + 1] + 1
  }
  if (next <= 0x10ffff) {
    out.push(next, 0x10ffff)
  }
  return out
}

const isAsciiAlphanumeric = (char: string): boolean => /^[A-Za-z0-9]$/.test(char)

// A backslash before a letter or digit is Go regexp syntax (`\d`), and Go
// rejects one before a non-ASCII character, so neither is an escaped literal.
const escapeError = (char: string): string | undefined =>
  isAsciiAlphanumeric(char)
    ? `"\\${char}" is regular expression syntax in Docker, not an escaped "${char}"; ` +
      `write "${char}" without the backslash to match it literally`
    : codePoint(char) >= 0x80
    ? `"\\${char}" is not a valid escape in Docker; write "${char}" without the backslash to match it literally`
    : undefined

type Parsed<A> = { readonly value: A; readonly end: number } | string

// One bracket class as Go's regexp parser reads the generated expression.
const parseDockerClass = (chars: ReadonlyArray<string>, open: number): Parsed<DockerToken> => {
  let i = open + 1
  const negated = chars[i] === "^"
  if (negated) {
    i++
  }
  const ranges: Array<number> = []
  const member = (): Parsed<number> => {
    const char = chars[i]
    if (char === "*" || char === "?") {
      return `"${char}" inside a bracket class is regular expression syntax in Docker; ` +
        `escape it as "\\${char}" to match it literally`
    }
    if (char !== "\\") {
      return { value: codePoint(char), end: i + 1 }
    }
    const next = chars[i + 1]
    if (next === undefined) {
      return "missing closing ]"
    }
    return escapeError(next) ?? { value: codePoint(next), end: i + 2 }
  }
  for (let first = true;; first = false) {
    const char = chars[i]
    if (char === undefined) {
      return "missing closing ]"
    }
    if (char === "]" && !first) {
      return { value: { _tag: "Class", ranges, negated }, end: i }
    }
    if (char === "[" && chars[i + 1] === ":") {
      let close = -1
      for (let j = i + 2; j + 1 < chars.length; j++) {
        if (chars[j] === ":" && chars[j + 1] === "]") {
          close = j
          break
        }
      }
      if (close !== -1) {
        const name = chars.slice(i + 2, close).join("")
        const members = lookup(re2Classes, name.startsWith("^") ? name.slice(1) : name)
        if (members === undefined) {
          return `unknown character class "[:${name}:]"; the supported names are ${re2ClassNames}`
        }
        ranges.push(...(name.startsWith("^") ? complement(members) : members))
        i = close + 2
        continue
      }
    }
    const lo = member()
    if (typeof lo === "string") {
      return lo
    }
    i = lo.end
    let hi = lo.value
    if (chars[i] === "-" && chars[i + 1] !== undefined && chars[i + 1] !== "]") {
      i++
      const parsed = member()
      if (typeof parsed === "string") {
        return parsed
      }
      if (parsed.value < lo.value) {
        return "invalid character class range"
      }
      i = parsed.end
      hi = parsed.value
    }
    ranges.push(lo.value, hi)
  }
}

// Thompson simulation over code points: one match costs path length × token
// count. A path is matched once per ancestor, which adds a depth factor.
const matchTokens = (tokens: ReadonlyArray<DockerToken>, path: string): boolean => {
  const end = tokens.length
  const seen = new Int32Array(end + 1)
  let generation = 1
  let current: Array<number> = []
  let next: Array<number> = []
  const stack: Array<number> = []
  const add = (list: Array<number>, start: number) => {
    stack.push(start)
    while (stack.length > 0) {
      const state = stack.pop()!
      if (seen[state] === generation) {
        continue
      }
      seen[state] = generation
      list.push(state)
      const token = tokens[state]
      if (token?._tag === "Star" || token?._tag === "StarAll") {
        stack.push(state + 1)
      } else if (token?._tag === "GroupStart") {
        stack.push(state + 2, state + 1)
      }
    }
  }
  add(current, 0)
  for (let c = 0; c < path.length;) {
    const code = path.codePointAt(c)!
    c += code > 0xffff ? 2 : 1
    generation++
    next.length = 0
    for (const state of current) {
      const token = tokens[state]
      switch (token?._tag) {
        case "Char": {
          if (token.code === code) add(next, state + 1)
          break
        }
        case "Any": {
          if (code !== 0x2f) add(next, state + 1)
          break
        }
        case "Class": {
          if (Glob.matchToken(token, code)) add(next, state + 1)
          break
        }
        case "Star": {
          if (code !== 0x2f) add(next, state)
          break
        }
        case "StarAll": {
          if (code !== 0x0a) add(next, state)
          break
        }
        case "GroupBody": {
          if (code !== 0x0a) add(next, state)
          if (code === 0x2f) add(next, state + 1)
          break
        }
      }
    }
    if (next.length === 0) {
      return false
    }
    ;[current, next] = [next, current]
  }
  return seen[end] === generation
}

// `Pattern.compile` from moby/patternmatcher, with the generated regular
// expression replaced by tokens and the reference's string fast paths kept.
const compileDocker = (pattern: string): ((path: string) => boolean) | string => {
  const chars = Array.from(pattern)
  if (!isGoMatchSyntax(chars)) {
    return "syntax error in pattern"
  }
  let kind: "exact" | "prefix" | "suffix" | "tokens" = "exact"
  const tokens: Array<DockerToken> = []
  // `text/scanner` skips a leading BOM; the string tests keep it
  for (let i = chars[0] === "\uFEFF" ? 1 : 0, iteration = 0; i < chars.length; iteration++) {
    const char = chars[i++]
    if (char === "*") {
      if (chars[i] === "*") {
        i++
        if (chars[i] === "/") {
          i++
        }
        if (i === chars.length) {
          if (kind === "exact") {
            kind = "prefix"
          } else {
            tokens.push({ _tag: "StarAll" })
            kind = "tokens"
          }
        } else {
          tokens.push({ _tag: "GroupStart" }, { _tag: "GroupBody" })
          kind = "tokens"
        }
        if (iteration === 0) {
          kind = "suffix"
        }
      } else {
        tokens.push({ _tag: "Star" })
        kind = "tokens"
      }
    } else if (char === "?") {
      tokens.push({ _tag: "Any" })
      kind = "tokens"
    } else if (char === "\\") {
      const next = chars[i++]
      if (next === undefined) {
        // the generated expression would end in a lone backslash
        return `a trailing backslash is regular expression syntax in Docker; ` +
          `escape it as "\\\\" to match a literal backslash`
      }
      const error = escapeError(next)
      if (error !== undefined) {
        return error
      }
      tokens.push({ _tag: "Char", code: codePoint(next) })
      kind = "tokens"
    } else if (char === "[") {
      const parsed = parseDockerClass(chars, i - 1)
      if (typeof parsed === "string") {
        return parsed
      }
      tokens.push(parsed.value)
      i = parsed.end + 1
      kind = "tokens"
    } else if (char === "]") {
      tokens.push({ _tag: "Char", code: codePoint(char) })
      kind = "tokens"
    } else if (char === "^") {
      return `"^" outside a bracket class is regular expression syntax in Docker; ` +
        `escape it as "\\^" to match it literally`
    } else {
      tokens.push({ _tag: "Char", code: codePoint(char) })
    }
  }
  switch (kind) {
    case "exact":
      return (path) => path === pattern
    case "prefix": {
      const prefix = pattern.slice(0, -2)
      return (path) => path.startsWith(prefix)
    }
    case "suffix": {
      // `**/foo` also matches `foo`
      const suffix = pattern.slice(2)
      return (path) => path.endsWith(suffix) || (suffix.startsWith("/") && path === suffix.slice(1))
    }
    case "tokens":
      return (path) => matchTokens(tokens, path)
  }
}

/**
 * `ignorefile.ReadAll` followed by `patternmatcher.New`.
 */
const parseDockerignore = (source: string): Array<DockerPattern> | DockerError => {
  const patterns: Array<DockerPattern> = []
  const lines = source.split("\n")
  for (let index = 0; index < lines.length; index++) {
    let line = lines[index]
    if (line.endsWith("\r")) {
      line = line.slice(0, -1)
    }
    if (index === 0 && line.startsWith("﻿")) {
      line = line.slice(1)
    }
    if (line.startsWith("#")) {
      continue
    }
    const trimmed = goTrim(line)
    if (trimmed === "") {
      continue
    }
    let exclusion = trimmed.startsWith("!")
    let pattern = exclusion ? goTrim(trimmed.slice(1)) : trimmed
    if (pattern !== "") {
      pattern = clean(pattern)
      if (pattern.length > 1 && pattern.startsWith("/")) {
        pattern = pattern.slice(1)
      }
    }
    if (exclusion) {
      pattern = `!${pattern}`
    }
    // `New` trims and cleans the result again before reading a leading `!`,
    // so `!/` is a bare `!`, `/ x` is `x` and `/!x` is an exception
    pattern = goTrim(pattern)
    if (pattern === "") {
      continue
    }
    pattern = clean(pattern)
    exclusion = pattern.startsWith("!")
    if (exclusion) {
      if (pattern.length === 1) {
        return { line: index + 1, pattern: trimmed, message: `illegal exclusion pattern: "!"` }
      }
      pattern = pattern.slice(1)
    }
    const match = compileDocker(pattern)
    if (typeof match === "string") {
      return { line: index + 1, pattern: trimmed, message: match }
    }
    patterns.push({ exclusion, matcher: dockerMatcher(pattern, match) })
  }
  return patterns
}

const wildcardChars = /[*[\]?^\\]/

// fsutil's `patternWithoutTrailingGlob`, but stripping only one trailing glob:
// stripping both from `d/*/**` would skip `d/sub` and lose `d/sub/keep`.
const withoutTrailingGlob = (pattern: string): string =>
  pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern

// BuildKit's wildcard-free prefix rule. Docker's `**` crosses `/`, so a
// stripped `/**` also matches everything below the prefix.
const dockerMatcher = (pattern: string, match: (path: string) => boolean): PathFilter.PathMatcher => {
  const prefix = withoutTrailingGlob(pattern)
  const everything = pattern.endsWith("/**")
  const matcher: PathFilter.PathMatcher = {
    match,
    matchesBelow: wildcardChars.test(prefix) ?
      undefined :
      (directory) =>
        directory === "" || `${prefix}/`.startsWith(`${directory}/`) ||
        (everything && directory.startsWith(`${prefix}/`))
  }
  // Docker ignores whether a path is a directory
  return Engine.register(matcher, Engine.fromMatcher(matcher, false))
}
