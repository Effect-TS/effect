import * as Effect from "../Effect.ts"
import type * as FileSystem from "../FileSystem.ts"
import type { PlatformError } from "../PlatformError.ts"

/** @internal */
export type Segment =
  | { readonly _tag: "Globstar" }
  | { readonly _tag: "Literal"; readonly value: string }
  | { readonly _tag: "Wildcard"; readonly regex: RegExp }

/** @internal */
export interface CompiledPattern {
  readonly segments: ReadonlyArray<Segment>
  readonly directoryOnly: boolean
  /** Index of the first `**` segment, or the segment count when there is none. */
  readonly firstGlobstar: number
}

/** @internal */
export interface Compiled {
  readonly patterns: ReadonlyArray<CompiledPattern>
  readonly dot: boolean
}

// -----------------------------------------------------------------------------
// compilation
// -----------------------------------------------------------------------------

/** @internal */
export const maxExpansions = 10_000

// A state is a position in one expanded pattern, packed into a number. With at
// most `maxExpansions` patterns the packed value stays a safe integer.
const STRIDE = 2 ** 21

/** @internal */
export const compile = (pattern: string, dot: boolean): Compiled => {
  const patterns: Array<CompiledPattern> = []
  for (const expanded of expandBraces(pattern)) {
    const compiled = expanded === "" ? undefined : compilePattern(expanded, dot)
    if (compiled !== undefined && compiled.segments.length < STRIDE) {
      patterns.push(compiled)
    }
  }
  return { patterns, dot }
}

const maxExpandedLength = 2 ** 22
const maxBraceDepth = 64

type BraceSequence = ReadonlyArray<string | ReadonlyArray<BraceSequence>>

interface BraceGroup {
  readonly commas: ReadonlyArray<number>
  readonly close: number
}

/** @internal */
export const expandBraces = (pattern: string): Array<string> => {
  const groups = matchBraceGroups(pattern)
  if (groups.size === 0) {
    return [pattern]
  }
  const sequence = parseBraceSequence(pattern, 0, pattern.length, groups, 0)
  if (sequence === undefined) {
    return [pattern]
  }
  // a pattern expanding to too many alternatives stays literal
  const count = countExpansions(sequence)
  return count > maxExpansions || count * pattern.length > maxExpandedLength ? [pattern] : expandSequence(sequence)
}

// Matches every brace group in one pass, keyed by the index of its `{`. Only
// groups with a top-level comma expand; `{a}` and unmatched braces are literal.
const matchBraceGroups = (pattern: string): Map<number, BraceGroup> => {
  const groups = new Map<number, BraceGroup>()
  const stack: Array<{ readonly open: number; readonly commas: Array<number> }> = []
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === "\\") {
      i++
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
  pattern: string,
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
    const group = pattern[i] === "{" ? groups.get(i) : undefined
    if (group === undefined) {
      if (pattern[i] === "\\" && i + 1 < end) {
        text += pattern[i++]
      }
      text += pattern[i]
      continue
    }
    const alternatives: Array<BraceSequence> = []
    let from = i + 1
    for (const to of [...group.commas, group.close]) {
      const alternative = parseBraceSequence(pattern, from, to, groups, depth + 1)
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

// A leading drive such as `C:/` becomes the single root segment `C:/`, which
// no directory entry can be named.
const markDrive = (raw: Array<string>): Array<string> =>
  raw.length > 1 && /^[A-Za-z]:$/.test(raw[0]) ? [`${raw[0]}/`, ...raw.slice(1)] : raw

/** @internal */
export const normalizeSegments = (raw: ReadonlyArray<string>): Array<string> => {
  const out: Array<string> = []
  for (let i = 0; i < raw.length; i++) {
    const segment = raw[i]
    // keep the leading empty segment of an absolute path, drop `//` and `./`
    if ((segment === "" && i > 0) || (segment === "." && (out.length > 0 || i < raw.length - 1))) {
      continue
    }
    out.push(segment)
  }
  return out
}

const compilePattern = (pattern: string, dot: boolean): CompiledPattern => {
  let raw = markDrive(splitSegments(pattern))
  let directoryOnly = false
  while (raw.length > 1 && raw[raw.length - 1] === "") {
    directoryOnly = true
    raw = raw.slice(0, -1)
  }
  const segments: Array<Segment> = []
  for (const segment of normalizeSegments(raw)) {
    if (segment === "**") {
      if (segments[segments.length - 1]?._tag !== "Globstar") {
        segments.push(globstar)
      }
    } else {
      segments.push(compileSegment(segment, dot))
    }
  }
  const firstGlobstar = segments.indexOf(globstar)
  return { segments, directoryOnly, firstGlobstar: firstGlobstar === -1 ? segments.length : firstGlobstar }
}

const globstar: Segment = { _tag: "Globstar" }

const compileSegment = (segment: string, dot: boolean): Segment => {
  // iterate by code point so classes and `?` treat astral characters as one
  const chars = Array.from(segment)
  const nextClose = new Array<number>(chars.length + 1).fill(-1)
  for (let i = chars.length - 1; i >= 0; i--) {
    nextClose[i] = chars[i] === "]" ? i : nextClose[i + 1]
  }
  // once a class fails to close, every later `[` in the segment is literal
  let classes = true
  let source = ""
  let literal = ""
  let magic = false
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === "\\" && i + 1 < chars.length) {
      i++
      literal += chars[i]
      source += escapeRegExp(chars[i])
    } else if (char === "*") {
      magic = true
      if (!source.endsWith("[^/]*")) {
        source += "[^/]*"
      }
    } else if (char === "?") {
      magic = true
      source += "[^/]"
    } else if (char === "[") {
      const parsed = classes ? parseClass(chars, i, nextClose) : undefined
      if (parsed === undefined) {
        classes = false
        literal += char
        source += escapeRegExp(char)
      } else {
        magic = true
        source += parsed.source
        i = parsed.end
      }
    } else {
      literal += char
      source += escapeRegExp(char)
    }
  }
  if (!magic) {
    return { _tag: "Literal", value: literal }
  }
  // wildcards never match `.` or `..`, and only match a leading dot when the
  // segment itself starts with one or `dot` is enabled
  const leadingDot = chars[0] === "." || (chars[0] === "\\" && chars[1] === ".")
  const guard = dot || leadingDot ? "(?!\\.\\.?$)" : "(?!\\.)"
  return { _tag: "Wildcard", regex: new RegExp(`^${guard}${source}$`, "u") }
}

const escapeRegExp = (char: string): string => /[\\^$.*+?()[\]{}|/]/.test(char) ? `\\${char}` : char

const codePoint = (char: string): string => `\\u{${char.codePointAt(0)!.toString(16)}}`

const posixClasses: Record<string, string> = {
  alnum: "a-zA-Z0-9",
  alpha: "a-zA-Z",
  blank: " \\t",
  cntrl: "\\x00-\\x1f\\x7f",
  digit: "0-9",
  graph: "\\x21-\\x7e",
  lower: "a-z",
  print: "\\x20-\\x7e",
  punct: "!-\\/:-@\\[-`{-~",
  space: "\\s",
  upper: "A-Z",
  word: "\\w",
  xdigit: "0-9A-Fa-f"
}

const parsePosixClass = (
  chars: ReadonlyArray<string>,
  open: number,
  nextClose: ReadonlyArray<number>
): { readonly name: string; readonly end: number } | undefined => {
  // `[:name:]` ends at the first `]`; class names are at most six characters
  const close = nextClose[open + 2]
  if (close === undefined || close === -1 || chars[close - 1] !== ":" || close - 1 - (open + 2) > 6) {
    return undefined
  }
  const name = chars.slice(open + 2, close - 1).join("")
  return close - 1 > open + 2 && name in posixClasses ? { name, end: close } : undefined
}

const parseClass = (
  chars: ReadonlyArray<string>,
  open: number,
  nextClose: ReadonlyArray<number>
): { readonly source: string; readonly end: number } | undefined => {
  let i = open + 1
  const negated = chars[i] === "!" || chars[i] === "^"
  if (negated) {
    i++
  }
  let items = ""
  let first = true
  for (; i < chars.length; i++) {
    let char = chars[i]
    if (char === "]" && !first) {
      return {
        source: items === "" ? (negated ? "[^/]" : "(?!)") : negated ? `[^/${items}]` : `[${items}]`,
        end: i
      }
    }
    first = false
    if (char === "[" && chars[i + 1] === ":") {
      const posix = parsePosixClass(chars, i, nextClose)
      if (posix !== undefined) {
        items += posixClasses[posix.name]
        i = posix.end
        continue
      }
    }
    if (char === "\\" && i + 1 < chars.length) {
      char = chars[++i]
    }
    // a range such as `a-z`; a trailing `-` is literal
    if (chars[i + 1] === "-" && i + 2 < chars.length && chars[i + 2] !== "]") {
      let end = chars[i + 2]
      let next = i + 2
      if (end === "\\" && i + 3 < chars.length) {
        end = chars[i + 3]
        next = i + 3
      }
      if (end.codePointAt(0)! >= char.codePointAt(0)!) {
        items += `${codePoint(char)}-${codePoint(end)}`
      }
      i = next
      continue
    }
    items += codePoint(char)
  }
  return undefined
}

// -----------------------------------------------------------------------------
// matching
// -----------------------------------------------------------------------------

/** @internal */
export type States = ReadonlySet<number>

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

/** @internal */
export const initial = (compiled: Compiled): States =>
  closure(compiled, new Set(compiled.patterns.map((_, i) => i * STRIDE)))

/** @internal */
export interface Step {
  /** States reached by matching a literal or wildcard segment. */
  readonly explicit: States
  /** States reached by a `**` consuming the name. */
  readonly globstar: States
}

/** @internal */
export const step = (compiled: Compiled, states: States, name: string): Step => {
  const explicit = new Set<number>()
  const viaGlobstar = new Set<number>()
  for (const state of states) {
    const segment = segmentAt(compiled, state)
    if (segment === undefined) {
      continue
    }
    switch (segment._tag) {
      case "Globstar": {
        // `**` never consumes the root segment of an absolute path
        if (
          name !== "" && name !== "." && name !== ".." && !name.endsWith("/") &&
          (compiled.dot || !name.startsWith("."))
        ) {
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
        if (name !== "" && segment.regex.test(name)) {
          explicit.add(state + 1)
        }
        break
      }
    }
  }
  return { explicit: closure(compiled, explicit), globstar: closure(compiled, viaGlobstar) }
}

/** @internal */
export const union = (step: Step): States =>
  step.globstar.size === 0 ? step.explicit : new Set([...step.explicit, ...step.globstar])

/** @internal */
export const accepts = (compiled: Compiled, states: States, isDirectory: boolean): boolean => {
  for (const state of states) {
    if (isTerminal(compiled, state) && (isDirectory || !patternAt(compiled, state).directoryOnly)) {
      return true
    }
  }
  return false
}

/** @internal */
export const canDescend = (compiled: Compiled, states: States): boolean => {
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
  if (path === "") {
    return false
  }
  let raw = markDrive(path.split("/"))
  let isDirectory = false
  while (raw.length > 1 && raw[raw.length - 1] === "") {
    isDirectory = true
    raw = raw.slice(0, -1)
  }
  let states = initial(compiled)
  for (const name of normalizeSegments(raw)) {
    states = union(step(compiled, states, name))
    if (states.size === 0) {
      return false
    }
  }
  return accepts(compiled, states, isDirectory)
}

// -----------------------------------------------------------------------------
// file system walk
// -----------------------------------------------------------------------------

const isAbsolute = (path: string): boolean => path.startsWith("/") || /^[A-Za-z]:\//.test(path)

const join = (parent: string, name: string): string => {
  if (parent === "") {
    return name === "" ? "/" : name
  }
  return parent.endsWith("/") ? parent + name : `${parent}/${name}`
}

const isIgnorable = (error: PlatformError): boolean =>
  error.reason._tag === "NotFound" || error.reason._tag === "PermissionDenied" ||
  error.reason._tag === "BadResource"

interface Entry {
  readonly name: string
  readonly type: FileSystem.File.Type
}

const byName = (self: Entry, that: Entry): number => self.name < that.name ? -1 : self.name > that.name ? 1 : 0

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
    if (isAbsolute(relative)) {
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
  const readDirectory = (relative: string): Effect.Effect<Array<Entry>, PlatformError> =>
    Effect.catchIf(
      fs.readDirectoryEntries === undefined
        ? Effect.map(
          fs.readDirectory(toFsPath(relative)),
          (names) => names.sort().map((name): Entry => ({ name, type: "Unknown" }))
        )
        : Effect.map(fs.readDirectoryEntries(toFsPath(relative)), (entries) => [...entries].sort(byName)),
      isIgnorable,
      () => Effect.succeed([])
    )

  // Directory listings never contain `.` and `..`, nor the root segment that
  // starts an absolute pattern (`""` or a drive such as `C:/`), so literal
  // segments naming them are added when they exist. `.` and `..` after a `**`
  // are not added, since they would revisit every ancestor.
  const isUnlisted = (value: string, relative: string): boolean =>
    value === "." || value === ".." || (relative === "" && (value === "" || /^[A-Za-z]:\/$/.test(value)))

  const exists = (relative: string): Effect.Effect<boolean> =>
    Effect.map(Effect.exit(fs.stat(toFsPath(relative))), (exit) => exit._tag === "Success")

  const readNames = (relative: string, states: States): Effect.Effect<Array<Entry>, PlatformError> => {
    const unlisted = new Set<string>()
    let listed = false
    for (const state of states) {
      const segment = segmentAt(compiled, state)
      if (segment === undefined) {
        continue
      }
      if (segment._tag === "Literal" && isUnlisted(segment.value, relative)) {
        if (state % STRIDE < patternAt(compiled, state).firstGlobstar) {
          unlisted.add(segment.value)
        }
      } else {
        listed = true
      }
    }
    return Effect.zipWith(
      listed ? readDirectory(relative) : Effect.succeed([]),
      Effect.filter([...unlisted], (name) => exists(join(relative, name))),
      (entries, names) => {
        if (names.length === 0) {
          return entries
        }
        const merged = new Map(names.map((name): [string, Entry] => [name, { name, type: "Unknown" }]))
        for (const entry of entries) {
          merged.set(entry.name, entry)
        }
        return [...merged.values()].sort(byName)
      }
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

  const visit = ({ name, type }: Entry, parent: string, states: States): Visited => {
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
      const entries = yield* readNames(relative, states)
      const visited = entries.map((entry) => visit(entry, relative, states))
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
