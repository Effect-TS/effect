import * as Glob from "./glob.ts"

const codePoint = (char: string): number => char.codePointAt(0)!

const single = (char: string): Array<number> => [codePoint(char), codePoint(char)]

// Class names come from user input, so never resolve them through the prototype
const lookup = <A>(table: Record<string, A>, name: string): A | undefined =>
  Object.hasOwn(table, name) ? table[name] : undefined

// -----------------------------------------------------------------------------
// paths
// -----------------------------------------------------------------------------

/**
 * Splits a root-relative path, dropping empty and `.` segments as
 * `Glob.match` does. A trailing `/` or `/.` marks a directory.
 *
 * @internal
 */
export const splitPath = (path: string): { readonly segments: Array<string>; readonly directory: boolean } => {
  const segments: Array<string> = []
  const raw = path.split("/")
  let directory = false
  for (let i = 0; i < raw.length; i++) {
    const segment = raw[i]
    if (segment === "" || segment === ".") {
      directory = i === raw.length - 1 && segments.length > 0
    } else if (segment === "..") {
      throw new Error(`IgnoreFile paths cannot contain ".." segments: ${path}`)
    } else {
      segments.push(segment)
      directory = false
    }
  }
  return { segments, directory }
}

/** @internal */
export interface Matcher {
  readonly walker: Glob.IgnoreWalker
  readonly ignores: (path: string) => boolean
}

// -----------------------------------------------------------------------------
// gitignore
// -----------------------------------------------------------------------------

/** @internal */
export interface GitRule {
  readonly negated: boolean
  readonly directoryOnly: boolean
  /** Segment nodes, base directory included, without the final `End`. */
  readonly nodes: ReadonlyArray<Glob.Node>
}

/**
 * Splits a `base` option into literal segments.
 *
 * @internal
 */
export const splitBase = (base: string): Array<string> => {
  if (base === "") {
    return []
  }
  const segments = base.split("/")
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new Error(`IgnoreFile.gitignore base must not contain empty, "." or ".." segments: ${base}`)
    }
  }
  return segments
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

const parseGitRule = (line: string, base: ReadonlyArray<Glob.Node>): GitRule | undefined => {
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
  const nodes = [...base]
  if (!pattern.includes("/")) {
    // matches the basename at any depth below the base
    const segment = compileGitSegment(pattern)
    if (segment === undefined) {
      return undefined
    }
    nodes.push(globstar, segment)
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
  return { negated, directoryOnly, nodes }
}

/** @internal */
export const parseGitignore = (source: string, base: ReadonlyArray<string>): Array<GitRule> => {
  const baseNodes = base.map((value): Glob.Node => ({ _tag: "Literal", value }))
  const rules: Array<GitRule> = []
  for (let line of (source.startsWith("﻿") ? source.slice(1) : source).split("\n")) {
    if (line.endsWith("\r")) {
      line = line.slice(0, -1)
    }
    if (line === "" || line.startsWith("#")) {
      continue
    }
    const rule = parseGitRule(line, baseNodes)
    if (rule !== undefined) {
      rules.push(rule)
    }
  }
  return rules
}

/** @internal */
export const gitMatcher = (rules: ReadonlyArray<GitRule>): Matcher => {
  const nodes: Array<Glob.Node> = []
  const negated = new Set<number>()
  const starts = new Set<number>()
  for (const rule of rules) {
    starts.add(nodes.length)
    nodes.push(...rule.nodes, { _tag: "End", directoryOnly: rule.directoryOnly })
    if (rule.negated) {
      negated.add(nodes.length - 1)
    }
  }
  const compiled: Glob.Compiled = { nodes, initial: Glob.closure(nodes, starts), dot: true, masks: undefined }

  // `End` nodes follow rule order, so the highest accepting one is the last match
  const step = (state: unknown, name: string, isDirectory: boolean): Glob.IgnoreStep => {
    const states = state as Glob.States
    if (states.size === 0) {
      return { state: states, ignored: false, prune: false }
    }
    const next = Glob.union(Glob.step(compiled, states, name))
    let last = -1
    for (const index of next) {
      const node = nodes[index]
      if (node._tag === "End" && (isDirectory || !node.directoryOnly) && index > last) {
        last = index
      }
    }
    const ignored = last !== -1 && !negated.has(last)
    // Git does not look inside an excluded directory
    return { state: next, ignored, prune: ignored }
  }

  return {
    walker: {
      initial: compiled.initial,
      needsDirectory: rules.some((rule) => rule.directoryOnly),
      step
    },
    ignores: (path) => {
      const { directory, segments } = splitPath(path)
      let state: unknown = compiled.initial
      for (let i = 0; i < segments.length; i++) {
        const last = i === segments.length - 1
        const result = step(state, segments[i], !last || directory)
        if (last || result.ignored) {
          return result.ignored
        }
        state = result.state
      }
      return false
    }
  }
}

// -----------------------------------------------------------------------------
// dockerignore
// -----------------------------------------------------------------------------

/** @internal */
export interface DockerPattern {
  readonly exclusion: boolean
  /** The cleaned pattern, as `PatternMatcher` stores it. */
  readonly pattern: string
  readonly match: (path: string) => boolean
}

/** @internal */
export interface DockerError {
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

// `PatternMatcher` rejects a pattern when Go's `filepath.Match(pattern, ".")`
// reports a syntax error. `Match` stops at the first chunk that fails to
// match, so only the chunks it reaches are checked; this is a port of it.
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
 *
 * @internal
 */
export const parseDockerignore = (source: string): Array<DockerPattern> | DockerError => {
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
    patterns.push({ exclusion, pattern, match })
  }
  return patterns
}

const wildcardChars = /[*[\]?^\\]/

// fsutil's `patternWithoutTrailingGlob`, except that it strips one trailing
// glob, not both. Stripping `/*/**` would turn `d/*/**` into the plain prefix
// `d` and skip `d/sub`, losing `d/sub/keep`, which the exception re-includes.
const withoutTrailingGlob = (pattern: string): string =>
  pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern

interface DockerState {
  readonly path: string
  /** Whether each pattern matched this path or one of its ancestors. */
  readonly hits: ReadonlyArray<boolean>
}

/** @internal */
export const dockerMatcher = (patterns: ReadonlyArray<DockerPattern>): Matcher => {
  const exceptions = patterns.filter((pattern) => pattern.exclusion).map((pattern) =>
    `${withoutTrailingGlob(pattern.pattern)}/`
  )
  // Like BuildKit, only skip an ignored directory when every exception is a
  // plain path and none of them lies inside it
  const prefixOnly = exceptions.every((exception) => !wildcardChars.test(exception))
  const canPrune = (path: string): boolean => {
    if (!prefixOnly) {
      return false
    }
    const directory = `${path}/`
    return exceptions.every((exception) => !exception.startsWith(directory))
  }

  const step = (state: unknown, name: string): Glob.IgnoreStep => {
    const parent = state as DockerState
    const path = parent.path === "" ? name : `${parent.path}/${name}`
    const hits = patterns.map((pattern, i) => parent.hits[i] || pattern.match(path))
    const last = hits.lastIndexOf(true)
    const ignored = last !== -1 && !patterns[last].exclusion
    return { state: { path, hits }, ignored, prune: ignored && canPrune(path) }
  }

  const initial: DockerState = { path: "", hits: patterns.map(() => false) }
  return {
    walker: { initial, needsDirectory: false, step },
    ignores: (path) => {
      let state: unknown = initial
      let ignored = false
      for (const segment of splitPath(path).segments) {
        const result = step(state, segment)
        state = result.state
        ignored = result.ignored
      }
      return ignored
    }
  }
}
