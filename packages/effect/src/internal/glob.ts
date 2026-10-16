import * as Effect from "../Effect.ts"
import type * as FileSystem from "../FileSystem.ts"
import type { PlatformError } from "../PlatformError.ts"

/** @internal */
export type Token =
  | { readonly _tag: "Char"; readonly value: string }
  | { readonly _tag: "Any" }
  | { readonly _tag: "Star" }
  /** `ranges` holds inclusive code point pairs: `[from0, to0, from1, to1, ...]`. */
  | { readonly _tag: "Class"; readonly ranges: ReadonlyArray<number>; readonly negated: boolean }

/** @internal */
export type Segment =
  | { readonly _tag: "Globstar" }
  | { readonly _tag: "Literal"; readonly value: string }
  | { readonly _tag: "Wildcard"; readonly tokens: ReadonlyArray<Token>; readonly leadingDot: boolean }

/** @internal */
export interface CompiledPattern {
  readonly segments: ReadonlyArray<Segment>
  readonly directoryOnly: boolean
}

/** @internal */
export interface Compiled {
  readonly patterns: ReadonlyArray<CompiledPattern>
  readonly dot: boolean
}

// -----------------------------------------------------------------------------
// compilation
// -----------------------------------------------------------------------------

const maxExpansions = 10_000

const maxExpandedLength = 2 ** 22
const maxBraceDepth = 64

// A state is a position in one expanded pattern, packed into a number. With at
// most `maxExpansions` patterns the packed value stays a safe integer.
const STRIDE = 2 ** 21

/** @internal */
export const compile = (pattern: string, dot: boolean): Compiled => {
  const patterns: Array<CompiledPattern> = []
  for (const expanded of expandBraces(pattern)) {
    const compiled = compilePattern(expanded)
    if (compiled !== undefined) {
      patterns.push(compiled)
    }
  }
  return { patterns, dot }
}

// UNC paths such as `//server/share` are not supported, and must not collapse
// into the absolute path `/server/share`
const isUnc = (path: string): boolean => path.startsWith("//") && path[2] !== undefined && path[2] !== "/"

const compilePattern = (pattern: string): CompiledPattern | undefined => {
  if (pattern === "" || isUnc(pattern)) {
    return undefined
  }
  const raw = splitSegments(pattern)
  // `.` and `..` after `**` would revisit every ancestor
  const globstar = raw.indexOf("**")
  if (globstar !== -1 && raw.some((segment, i) => i > globstar && (segment === "." || segment === ".."))) {
    return undefined
  }
  const { directory, segments: names } = normalize(raw)
  if (names.length === 0 || names.length >= STRIDE) {
    return undefined
  }
  const segments: Array<Segment> = []
  for (const name of names) {
    if (name !== "**") {
      segments.push(compileSegment(Array.from(name)))
    } else if (segments[segments.length - 1] !== globstarSegment) {
      segments.push(globstarSegment)
    }
  }
  return { segments, directoryOnly: directory }
}

const globstarSegment: Segment = { _tag: "Globstar" }

const splitSegments = (pattern: string): Array<string> => {
  const segments: Array<string> = []
  let start = 0
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "\\") {
      i++
    } else if (pattern[i] === "/") {
      segments.push(pattern.slice(start, i))
      start = i + 1
    }
  }
  segments.push(pattern.slice(start))
  return segments
}

const isDrive = (segment: string): boolean => /^[A-Za-z]:$/.test(segment)

const isRoot = (name: string): boolean => name === "" || /^[A-Za-z]:\/$/.test(name)

// Splits off the root of an absolute path (`""`, or a drive such as `C:/`),
// drops empty and `.` segments, and reports whether a trailing `/` or `/.`
// marks a directory. A lone `.` is kept so it can name the root itself.
const normalize = (raw: ReadonlyArray<string>): {
  readonly segments: Array<string>
  readonly directory: boolean
} => {
  const segments: Array<string> = []
  let i = 0
  if (raw.length > 1 && (raw[0] === "" || isDrive(raw[0]))) {
    segments.push(raw[0] === "" ? "" : `${raw[0]}/`)
    i = 1
  }
  let directory = false
  for (; i < raw.length; i++) {
    const segment = raw[i]
    if (segment === "" || segment === ".") {
      directory = i === raw.length - 1 && segments.length > 0
    } else {
      segments.push(segment)
      directory = false
    }
  }
  if (segments.length === 0 && raw.includes(".")) {
    segments.push(".")
  }
  return { segments, directory }
}

const compileSegment = (chars: ReadonlyArray<string>): Segment => {
  const tokens: Array<Token> = []
  let literal = ""
  let magic = false
  // once a class fails to close, every later `[` in the segment is literal
  let classes = true
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === "\\" && i + 1 < chars.length) {
      literal += chars[++i]
      tokens.push({ _tag: "Char", value: chars[i] })
    } else if (char === "*") {
      magic = true
      if (tokens[tokens.length - 1]?._tag !== "Star") {
        tokens.push({ _tag: "Star" })
      }
    } else if (char === "?") {
      magic = true
      tokens.push({ _tag: "Any" })
    } else if (char === "[" && classes) {
      const parsed = parseClass(chars, i)
      if (parsed === undefined) {
        classes = false
        literal += char
        tokens.push({ _tag: "Char", value: char })
      } else {
        magic = true
        tokens.push(parsed.token)
        i = parsed.end
      }
    } else {
      literal += char
      tokens.push({ _tag: "Char", value: char })
    }
  }
  if (!magic) {
    return { _tag: "Literal", value: literal }
  }
  const first = tokens[0]
  return { _tag: "Wildcard", tokens, leadingDot: first._tag === "Char" && first.value === "." }
}

const range = (from: string, to: string): Array<number> => [from.codePointAt(0)!, to.codePointAt(0)!]

const posixClasses: Record<string, ReadonlyArray<number>> = {
  alnum: [...range("0", "9"), ...range("A", "Z"), ...range("a", "z")],
  alpha: [...range("A", "Z"), ...range("a", "z")],
  blank: [0x09, 0x09, 0x20, 0x20],
  cntrl: [0x00, 0x1f, 0x7f, 0x7f],
  digit: range("0", "9"),
  graph: [0x21, 0x7e],
  lower: range("a", "z"),
  print: [0x20, 0x7e],
  punct: [0x21, 0x2f, 0x3a, 0x40, 0x5b, 0x60, 0x7b, 0x7e],
  space: [0x09, 0x0d, 0x20, 0x20],
  upper: range("A", "Z"),
  word: [...range("0", "9"), ...range("A", "Z"), 0x5f, 0x5f, ...range("a", "z")],
  xdigit: [...range("0", "9"), ...range("A", "F"), ...range("a", "f")]
}

// Parses a POSIX class such as `[:digit:]` at `open`. Names are at most six
// characters, so the search is bounded.
const parsePosixClass = (
  chars: ReadonlyArray<string>,
  open: number
): { readonly ranges: ReadonlyArray<number>; readonly end: number } | undefined => {
  for (let i = open + 2; i < chars.length && i <= open + 8; i++) {
    if (chars[i] === ":" && chars[i + 1] === "]") {
      const ranges = posixClasses[chars.slice(open + 2, i).join("")]
      return ranges === undefined ? undefined : { ranges, end: i + 1 }
    }
  }
  return undefined
}

// Parses the bracket class opening at `open`. A class never spans a `/`, so
// brace expansion and segment compilation agree on where it ends.
const parseClass = (
  chars: ReadonlyArray<string>,
  open: number
): { readonly token: Token; readonly end: number } | undefined => {
  let i = open + 1
  const negated = chars[i] === "!" || chars[i] === "^"
  if (negated) {
    i++
  }
  const ranges: Array<number> = []
  for (let first = true; i < chars.length; i++, first = false) {
    let char = chars[i]
    if (char === "/") {
      return undefined
    }
    if (char === "]" && !first) {
      return { token: { _tag: "Class", ranges, negated }, end: i }
    }
    if (char === "[" && chars[i + 1] === ":") {
      const posix = parsePosixClass(chars, i)
      if (posix !== undefined) {
        ranges.push(...posix.ranges)
        i = posix.end
        continue
      }
    }
    if (char === "\\" && i + 1 < chars.length) {
      char = chars[++i]
    }
    // a range such as `a-z`; a trailing `-` is literal
    if (chars[i + 1] === "-" && i + 2 < chars.length && chars[i + 2] !== "]") {
      let next = i + 2
      if (chars[next] === "/") {
        return undefined
      }
      if (chars[next] === "\\" && next + 1 < chars.length) {
        next++
      }
      ranges.push(...range(char, chars[next]))
      i = next
      continue
    }
    ranges.push(...range(char, char))
  }
  return undefined
}

type BraceSequence = ReadonlyArray<string | ReadonlyArray<BraceSequence>>

interface BraceGroup {
  readonly commas: ReadonlyArray<number>
  readonly close: number
}

const expandBraces = (pattern: string): Array<string> => {
  const chars = Array.from(pattern)
  const groups = matchBraceGroups(chars)
  if (groups.size === 0) {
    return [pattern]
  }
  const sequence = parseBraceSequence(chars, 0, chars.length, groups, 0)
  if (sequence === undefined) {
    return [pattern]
  }
  // a pattern expanding to too many alternatives keeps its braces literal
  const count = countExpansions(sequence)
  return count > maxExpansions || count * pattern.length > maxExpandedLength ? [pattern] : expandSequence(sequence)
}

// Matches every brace group in one pass, keyed by the index of its `{`. Only
// groups with a top-level comma expand; `{a}` and unmatched braces are literal,
// as are braces and commas inside bracket classes.
const matchBraceGroups = (chars: ReadonlyArray<string>): Map<number, BraceGroup> => {
  const groups = new Map<number, BraceGroup>()
  const stack: Array<{ readonly open: number; readonly commas: Array<number> }> = []
  let classes = true
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === "\\") {
      i++
    } else if (char === "/") {
      classes = true
    } else if (char === "[" && classes) {
      const parsed = parseClass(chars, i)
      if (parsed === undefined) {
        classes = false
      } else {
        i = parsed.end
      }
    } else if (char === "{") {
      stack.push({ open: i, commas: [] })
    } else if (char === ",") {
      stack[stack.length - 1]?.commas.push(i)
    } else if (char === "}") {
      const group = stack.pop()
      if (group !== undefined && group.commas.length > 0) {
        groups.set(group.open, { commas: group.commas, close: i })
      }
    }
  }
  return groups
}

const parseBraceSequence = (
  chars: ReadonlyArray<string>,
  start: number,
  end: number,
  groups: Map<number, BraceGroup>,
  depth: number
): BraceSequence | undefined => {
  if (depth > maxBraceDepth) {
    return undefined
  }
  const parts: Array<string | ReadonlyArray<BraceSequence>> = []
  let text = ""
  for (let i = start; i < end; i++) {
    const group = groups.get(i)
    if (group === undefined) {
      if (chars[i] === "\\" && i + 1 < end) {
        text += chars[i++]
      }
      text += chars[i]
      continue
    }
    const alternatives: Array<BraceSequence> = []
    let from = i + 1
    for (const to of [...group.commas, group.close]) {
      const alternative = parseBraceSequence(chars, from, to, groups, depth + 1)
      if (alternative === undefined) {
        return undefined
      }
      alternatives.push(alternative)
      from = to + 1
    }
    if (text !== "") {
      parts.push(text)
      text = ""
    }
    parts.push(alternatives)
    i = group.close
  }
  if (text !== "") {
    parts.push(text)
  }
  return parts
}

const countExpansions = (sequence: BraceSequence): number => {
  let count = 1
  for (const part of sequence) {
    if (typeof part !== "string") {
      let sum = 0
      for (const alternative of part) {
        sum += countExpansions(alternative)
      }
      count *= sum
      if (count > maxExpansions) {
        return Infinity
      }
    }
  }
  return count
}

const expandSequence = (sequence: BraceSequence): Array<string> => {
  let out = [""]
  for (const part of sequence) {
    if (typeof part === "string") {
      out = out.map((prefix) => prefix + part)
    } else {
      const alternatives = part.flatMap(expandSequence)
      out = out.flatMap((prefix) => alternatives.map((alternative) => prefix + alternative))
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// matching
// -----------------------------------------------------------------------------

const matchToken = (token: Token, char: string): boolean => {
  switch (token._tag) {
    case "Char":
      return token.value === char
    case "Any":
      return true
    case "Star":
      return false
    case "Class": {
      const code = char.codePointAt(0)!
      let found = false
      for (let i = 0; i < token.ranges.length && !found; i += 2) {
        found = code >= token.ranges[i] && code <= token.ranges[i + 1]
      }
      return found !== token.negated
    }
  }
}

// Wildcards never match `.` or `..`, and only match a leading dot when the
// segment itself starts with one or `dot` is enabled. Matching backtracks only
// to the most recent `*`, so it takes at most O(tokens × characters) steps.
const matchWildcard = (segment: Extract<Segment, { _tag: "Wildcard" }>, name: string, dot: boolean): boolean => {
  if (name === "." || name === ".." || (name.startsWith(".") && !dot && !segment.leadingDot)) {
    return false
  }
  const { tokens } = segment
  const chars = Array.from(name)
  let t = 0
  let c = 0
  let star = -1
  let resume = 0
  while (c < chars.length) {
    if (tokens[t]?._tag === "Star") {
      star = t++
      resume = c
    } else if (t < tokens.length && matchToken(tokens[t], chars[c])) {
      t++
      c++
    } else if (star !== -1) {
      t = star + 1
      c = ++resume
    } else {
      return false
    }
  }
  while (tokens[t]?._tag === "Star") {
    t++
  }
  return t === tokens.length
}

type States = ReadonlySet<number>

const patternAt = (compiled: Compiled, state: number): CompiledPattern => compiled.patterns[Math.floor(state / STRIDE)]

const segmentAt = (compiled: Compiled, state: number): Segment | undefined =>
  patternAt(compiled, state).segments[state % STRIDE]

const isTerminal = (compiled: Compiled, state: number): boolean =>
  state % STRIDE === patternAt(compiled, state).segments.length

const closure = (compiled: Compiled, states: Set<number>): Set<number> => {
  for (const state of states) {
    if (segmentAt(compiled, state)?._tag === "Globstar") {
      states.add(state + 1)
    }
  }
  return states
}

const initial = (compiled: Compiled): States => closure(compiled, new Set(compiled.patterns.map((_, i) => i * STRIDE)))

interface Step {
  /** States reached by matching a literal or wildcard segment. */
  readonly explicit: States
  /** States reached by a `**` consuming the name. */
  readonly globstar: States
}

const step = (compiled: Compiled, states: States, name: string): Step => {
  const explicit = new Set<number>()
  const viaGlobstar = new Set<number>()
  // only a literal segment can name the root of an absolute path
  const root = isRoot(name)
  for (const state of states) {
    const segment = segmentAt(compiled, state)
    if (segment === undefined) {
      continue
    }
    switch (segment._tag) {
      case "Globstar": {
        if (!root && name !== "." && name !== ".." && (compiled.dot || !name.startsWith("."))) {
          viaGlobstar.add(state)
        }
        break
      }
      case "Literal": {
        if (segment.value === name) {
          explicit.add(state + 1)
        }
        break
      }
      case "Wildcard": {
        if (!root && matchWildcard(segment, name, compiled.dot)) {
          explicit.add(state + 1)
        }
        break
      }
    }
  }
  return { explicit: closure(compiled, explicit), globstar: closure(compiled, viaGlobstar) }
}

const union = (step: Step): States =>
  step.globstar.size === 0 ? step.explicit : new Set([...step.explicit, ...step.globstar])

const accepts = (compiled: Compiled, states: States, isDirectory: boolean): boolean => {
  for (const state of states) {
    if (isTerminal(compiled, state) && (isDirectory || !patternAt(compiled, state).directoryOnly)) {
      return true
    }
  }
  return false
}

const canDescend = (compiled: Compiled, states: States): boolean => {
  for (const state of states) {
    if (!isTerminal(compiled, state)) {
      return true
    }
  }
  return false
}

const needsDirectory = (compiled: Compiled, states: States): boolean => {
  for (const state of states) {
    if (isTerminal(compiled, state) && patternAt(compiled, state).directoryOnly) {
      return true
    }
  }
  return false
}

/** @internal */
export const match = (compiled: Compiled, path: string): boolean => {
  if (path === "" || isUnc(path)) {
    return false
  }
  const { directory, segments } = normalize(path.split("/"))
  let states = initial(compiled)
  for (const name of segments) {
    states = union(step(compiled, states, name))
    if (states.size === 0) {
      return false
    }
  }
  return accepts(compiled, states, directory)
}

// -----------------------------------------------------------------------------
// file system walk
// -----------------------------------------------------------------------------

const join = (parent: string, name: string): string => {
  if (parent === "") {
    return name === "" ? "/" : name
  }
  return parent.endsWith("/") ? parent + name : `${parent}/${name}`
}

const isIgnorable = (error: PlatformError): boolean =>
  error.reason._tag === "NotFound" || error.reason._tag === "PermissionDenied" ||
  error.reason._tag === "BadResource"

const byName = (self: FileSystem.DirectoryEntry, that: FileSystem.DirectoryEntry): number =>
  self.name < that.name ? -1 : self.name > that.name ? 1 : 0

/** @internal */
export const walk = (
  fs: Pick<FileSystem.FileSystem, "readDirectory" | "stat" | "readLink"> & {
    readonly readDirectoryEntries?:
      | ((path: string) => Effect.Effect<ReadonlyArray<FileSystem.DirectoryEntry>, PlatformError>)
      | undefined
  },
  compiled: Compiled,
  options?: {
    readonly root?: string | undefined
    readonly exclude?: ReadonlyArray<string> | undefined
  }
): Effect.Effect<Array<string>, PlatformError> => {
  if (compiled.patterns.length === 0) {
    return Effect.succeed([])
  }
  const root = options?.root ?? ""
  const excludes = (options?.exclude ?? []).map((pattern) => compile(pattern, true))
  const excludeNeedsDirectory = excludes.some((exclude) => exclude.patterns.some((pattern) => pattern.directoryOnly))

  const toFsPath = (relative: string): string => {
    if (relative.startsWith("/") || /^[A-Za-z]:\//.test(relative)) {
      return relative
    }
    if (relative === "") {
      return root === "" ? "." : root
    }
    return root === "" ? relative : join(root, relative)
  }

  const isExcluded = (relative: string, isDirectory: boolean): boolean =>
    excludes.some((exclude) => match(exclude, relative) || (isDirectory && match(exclude, `${relative}/`)))

  // Without typed listings every entry is "Unknown" and is inspected with
  // `stat` and `readLink` only when the walk needs to know.
  const list = (relative: string): Effect.Effect<Array<FileSystem.DirectoryEntry>, PlatformError> =>
    Effect.catchIf(
      fs.readDirectoryEntries === undefined
        ? Effect.map(
          fs.readDirectory(toFsPath(relative)),
          (names) => names.sort().map((name): FileSystem.DirectoryEntry => ({ name, type: "Unknown" }))
        )
        : Effect.map(fs.readDirectoryEntries(toFsPath(relative)), (entries) => [...entries].sort(byName)),
      isIgnorable,
      () => Effect.succeed([])
    )

  // Listings never contain `.`, `..`, or the root of an absolute pattern, so
  // literal segments naming them are added when they exist.
  const isUnlisted = (value: string, relative: string): boolean =>
    value === "." || value === ".." || (relative === "" && isRoot(value))

  const exists = (relative: string): Effect.Effect<boolean> =>
    Effect.map(Effect.exit(fs.stat(toFsPath(relative))), (exit) => exit._tag === "Success")

  const entries = (
    relative: string,
    states: States
  ): Effect.Effect<Array<FileSystem.DirectoryEntry>, PlatformError> => {
    const unlisted = new Set<string>()
    let listed = false
    for (const state of states) {
      const segment = segmentAt(compiled, state)
      if (segment?._tag === "Literal" && isUnlisted(segment.value, relative)) {
        unlisted.add(segment.value)
      } else if (segment !== undefined) {
        listed = true
      }
    }
    return Effect.zipWith(
      listed ? list(relative) : Effect.succeed([]),
      Effect.filter([...unlisted], (name) => exists(join(relative, name))),
      (entries, names) =>
        names.length === 0
          ? entries
          : [...names.map((name): FileSystem.DirectoryEntry => ({ name, type: "Unknown" })), ...entries].sort(byName)
    )
  }

  interface Child {
    readonly relative: string
    readonly accepted: boolean
    readonly next: States | undefined
  }

  // Entries whose type is known from the listing are visited synchronously;
  // only those needing `stat` or `readLink` return an Effect.
  type Visited = Child | undefined | Effect.Effect<Child | undefined, PlatformError>

  const visit = ({ name, type }: FileSystem.DirectoryEntry, parent: string, states: States): Visited => {
    const relative = join(parent, name)
    const result = step(compiled, states, name)
    const next = union(result)
    if (next.size === 0) {
      return undefined
    }
    const descend = canDescend(compiled, next)
    const finish = (isDirectory: boolean): Visited => {
      if (isExcluded(relative, isDirectory)) {
        return undefined
      }
      const accepted = accepts(compiled, next, isDirectory)
      if (!isDirectory || !descend) {
        return { relative, accepted, next: undefined }
      }
      if (result.globstar.size === 0) {
        return { relative, accepted, next }
      }
      // a symlink named by a literal or wildcard segment is followed, but `**`
      // alone does not traverse it
      const followed = canDescend(compiled, result.explicit) ? result.explicit : undefined
      return type === "Unknown"
        ? Effect.map(
          Effect.exit(fs.readLink(toFsPath(relative))),
          (exit) => ({ relative, accepted, next: exit._tag === "Success" ? followed : next })
        )
        : { relative, accepted, next: type === "SymbolicLink" ? followed : next }
    }
    if (!descend && !needsDirectory(compiled, next) && !excludeNeedsDirectory) {
      return finish(false)
    }
    if (type !== "Unknown" && type !== "SymbolicLink") {
      return finish(type === "Directory")
    }
    return Effect.flatMap(
      Effect.matchEffect(fs.stat(toFsPath(relative)), {
        onFailure: (error) => isIgnorable(error) ? Effect.succeed(false) : Effect.fail(error),
        onSuccess: (info) => Effect.succeed(info.type === "Directory")
      }),
      (isDirectory) => {
        const visited = finish(isDirectory)
        return Effect.isEffect(visited) ? visited : Effect.succeed(visited)
      }
    )
  }

  const directory = (relative: string, states: States, out: Array<string>): Effect.Effect<void, PlatformError> =>
    Effect.gen(function*() {
      const visited = (yield* entries(relative, states)).map((entry) => visit(entry, relative, states))
      const pending: Array<Effect.Effect<Child | undefined, PlatformError>> = []
      for (const entry of visited) {
        if (Effect.isEffect(entry)) {
          pending.push(entry)
        }
      }
      const resolved = pending.length === 0
        ? []
        : yield* Effect.forEach(pending, (effect) => effect, { concurrency: 16 })
      let index = 0
      for (const entry of visited) {
        const child: Child | undefined = Effect.isEffect(entry) ? resolved[index++] : entry
        if (child === undefined) {
          continue
        }
        if (child.accepted) {
          out.push(child.relative)
        }
        if (child.next !== undefined) {
          yield* directory(child.relative, child.next, out)
        }
      }
    })

  return Effect.suspend(() => {
    const out: Array<string> = []
    return Effect.as(directory("", initial(compiled), out), out)
  })
}
