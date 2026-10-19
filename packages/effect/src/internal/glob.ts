import * as Arr from "../Array.ts"
import * as Effect from "../Effect.ts"
import type * as FileSystem from "../FileSystem.ts"
import * as Order from "../Order.ts"
import type { PlatformError } from "../PlatformError.ts"
import * as Predicate from "../Predicate.ts"

/** @internal */
export type Token =
  | { readonly _tag: "Char"; readonly value: string }
  | { readonly _tag: "Any" }
  | { readonly _tag: "Star" }
  /** `ranges` holds inclusive code point pairs: `[from0, to0, from1, to1, ...]`. */
  | { readonly _tag: "Class"; readonly ranges: ReadonlyArray<number>; readonly negated: boolean }

/** @internal */
export type Node =
  | { readonly _tag: "Globstar" }
  | { readonly _tag: "Literal"; readonly value: string }
  | { readonly _tag: "Wildcard"; readonly tokens: ReadonlyArray<Token>; readonly leadingDot: boolean }
  /** Ends one expanded pattern. */
  | { readonly _tag: "End"; readonly directoryOnly: boolean }

type States = ReadonlySet<number>

/**
 * Every expanded pattern's nodes laid out in one array, so a match state is an
 * index into `nodes` and `initial` holds the start of each pattern.
 *
 * @internal
 */
export interface Compiled {
  readonly nodes: ReadonlyArray<Node>
  readonly initial: States
  readonly dot: boolean
}

// -----------------------------------------------------------------------------
// compilation
// -----------------------------------------------------------------------------

const maxExpansions = 10_000

const maxExpandedLength = 2 ** 22
const maxBraceDepth = 64

/** @internal */
export const compile = (patterns: ReadonlyArray<string>, dot: boolean): Compiled => {
  const nodes: Array<Node> = []
  const starts = new Set<number>()
  for (const pattern of patterns) {
    for (const expanded of expandBraces(pattern)) {
      const start = nodes.length
      if (compilePattern(expanded, nodes)) {
        starts.add(start)
      }
    }
  }
  return { nodes, initial: closure(nodes, starts), dot }
}

// Reject UNC paths rather than collapsing them into local absolute paths.
const isUnc = (path: string): boolean => path.startsWith("//") && path[2] !== undefined && path[2] !== "/"

// Appends the pattern's nodes, or appends nothing when it can match no path
const compilePattern = (pattern: string, nodes: Array<Node>): boolean => {
  if (pattern === "" || isUnc(pattern)) {
    return false
  }
  const raw = splitSegments(pattern)
  const globstar = raw.indexOf("**")
  if (globstar !== -1 && raw.some((segment, i) => i > globstar && (segment === "." || segment === ".."))) {
    return false
  }
  const { directory, segments } = normalize(raw)
  if (segments.length === 0) {
    return false
  }
  for (const segment of segments) {
    if (segment !== "**") {
      nodes.push(compileSegment(Array.from(segment)))
    } else if (nodes[nodes.length - 1] !== globstarNode) {
      nodes.push(globstarNode)
    }
  }
  nodes.push({ _tag: "End", directoryOnly: directory })
  return true
}

const globstarNode: Node = { _tag: "Globstar" }

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

const drive = /^[A-Za-z]:/

const isDrive = (segment: string): boolean => segment.length === 2 && drive.test(segment)

// the root of an absolute path: `""` or a drive such as `C:/`
const isRoot = (name: string): boolean => name === "" || (name.length === 3 && name[2] === "/" && drive.test(name))

const isAbsolute = (path: string): boolean => path.startsWith("/") || (path[2] === "/" && drive.test(path))

// Preserve absolute roots and a lone `.`; trailing `/` or `/.` marks a directory.
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

const compileSegment = (chars: ReadonlyArray<string>): Node => {
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

// POSIX class names are at most six characters.
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

// Share class boundaries between brace expansion and segment compilation.
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
  const count = countExpansions(sequence)
  return count > maxExpansions || count * pattern.length > maxExpandedLength ? [pattern] : expandSequence(sequence)
}

// Index expandable brace groups by opening position, ignoring bracket classes.
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

// Backtrack only to the last `*`, bounding retries by tokens × characters.
const matchWildcard = (
  node: Extract<Node, { _tag: "Wildcard" }>,
  name: string,
  chars: ReadonlyArray<string>,
  dot: boolean
): boolean => {
  if (name === "." || name === ".." || (name.startsWith(".") && !dot && !node.leadingDot)) {
    return false
  }
  const { tokens } = node
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

// `**` also matches zero segments, so its successor is reachable too
const closure = (nodes: ReadonlyArray<Node>, states: Set<number>): Set<number> => {
  for (const state of states) {
    if (nodes[state]._tag === "Globstar") {
      states.add(state + 1)
    }
  }
  return states
}

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
  let chars: ReadonlyArray<string> | undefined
  for (const state of states) {
    const node = compiled.nodes[state]
    switch (node._tag) {
      case "Globstar": {
        if (!root && name !== "." && name !== ".." && (compiled.dot || !name.startsWith("."))) {
          viaGlobstar.add(state)
        }
        break
      }
      case "Literal": {
        if (node.value === name) {
          explicit.add(state + 1)
        }
        break
      }
      case "Wildcard": {
        if (!root && matchWildcard(node, name, chars ??= Array.from(name), compiled.dot)) {
          explicit.add(state + 1)
        }
        break
      }
    }
  }
  return { explicit: closure(compiled.nodes, explicit), globstar: closure(compiled.nodes, viaGlobstar) }
}

const union = (step: Step): States => {
  if (step.globstar.size === 0) {
    return step.explicit
  }
  const states = new Set(step.explicit)
  for (const state of step.globstar) {
    states.add(state)
  }
  return states
}

const accepts = (compiled: Compiled, states: States, isDirectory: boolean): boolean => {
  for (const state of states) {
    const node = compiled.nodes[state]
    if (node._tag === "End" && (isDirectory || !node.directoryOnly)) {
      return true
    }
  }
  return false
}

const canDescend = (compiled: Compiled, states: States): boolean => {
  for (const state of states) {
    if (compiled.nodes[state]._tag !== "End") {
      return true
    }
  }
  return false
}

const needsDirectory = (compiled: Compiled, states: States): boolean => {
  for (const state of states) {
    const node = compiled.nodes[state]
    if (node._tag === "End" && node.directoryOnly) {
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
  let states = compiled.initial
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

const isMissing = (error: PlatformError): boolean =>
  error.reason._tag === "NotFound" || error.reason._tag === "BadResource"

const isIgnorable = (error: PlatformError): boolean => isMissing(error) || error.reason._tag === "PermissionDenied"

// Node and Deno report `readLink` on a path that is not a link as "Unknown"
const isNotLink = (error: PlatformError): boolean => isIgnorable(error) || error.reason._tag === "Unknown"

const byName = Order.mapInput(Order.String, (entry: FileSystem.DirectoryEntry) => entry.name)

/** @internal */
export const make = (
  fs: Pick<FileSystem.FileSystem, "readDirectoryEntries" | "stat" | "readLink">
): FileSystem.FileSystem["glob"] =>
(pattern, options) => walk(fs, compile([pattern], options?.dot ?? false), options)

// Named directories (the root and those reached only through leading literal
// segments) must be readable; unreadable wildcard-reached ones are skipped.
const walk = Effect.fnUntraced(function*(
  fs: Pick<FileSystem.FileSystem, "readDirectoryEntries" | "stat" | "readLink">,
  compiled: Compiled,
  options?: {
    readonly root?: string | undefined
    readonly exclude?: ReadonlyArray<string> | undefined
  }
): Effect.fn.Return<Array<string>, PlatformError> {
  if (compiled.initial.size === 0) {
    return []
  }
  const root = options?.root ?? ""
  const excludes = compile(options?.exclude ?? [], true)
  const excludeNeedsDirectory = excludes.nodes.some((node) => node._tag === "End" && node.directoryOnly)

  const toFsPath = (relative: string): string =>
    isAbsolute(relative) ? relative : relative === "" ? (root === "" ? "." : root) : join(root, relative)

  // Listings never contain `.`, `..`, or the root of an absolute pattern
  const isUnlisted = (value: string): boolean => value === "." || value === ".." || isRoot(value)

  // Keep broken links so literal probes agree with directory listings.
  const probe = (
    parent: string,
    name: string,
    named: boolean
  ): Effect.Effect<FileSystem.DirectoryEntry | undefined, PlatformError> => {
    const path = toFsPath(join(parent, name))
    return fs.stat(path).pipe(
      Effect.map((info) => info.type),
      Effect.catchReason("PlatformError", "NotFound", () =>
        fs.readLink(path).pipe(
          Effect.as("SymbolicLink" as const),
          Effect.catchIf(isNotLink, () => Effect.succeed(undefined))
        )),
      Effect.catchIf(named ? isMissing : isIgnorable, () => Effect.succeed(undefined)),
      Effect.map((type) => type === undefined ? undefined : { name, type })
    )
  }

  // Probe leading literals without requiring permission to list their parent.
  const entries = (
    relative: string,
    states: States,
    named: boolean
  ): Effect.Effect<{ readonly entries: Array<FileSystem.DirectoryEntry>; readonly named: boolean }, PlatformError> => {
    const literals = new Set<string>()
    let listed = !named
    for (const state of states) {
      const node = compiled.nodes[state]
      if (node._tag === "Literal") {
        literals.add(node.value)
      } else if (node._tag !== "End") {
        listed = true
      }
    }
    const probed = listed ? [...literals].filter(isUnlisted) : [...literals]
    return Effect.zipWith(
      listed
        ? Effect.catchIf(
          fs.readDirectoryEntries(toFsPath(relative)),
          named ? isMissing : isIgnorable,
          () => Effect.succeed([])
        )
        : Effect.succeed([]),
      Effect.forEach(probed, (name) => probe(relative, name, named), { concurrency: 16 }),
      (listing, found) => ({
        entries: Arr.sort([...listing, ...found.filter(Predicate.isNotUndefined)], byName),
        named: named && !listed
      })
    )
  }

  interface Child {
    readonly relative: string
    readonly accepted: boolean
    readonly excluded: States
    readonly next: States | undefined
  }

  const visit = Effect.fnUntraced(function*(
    { name, type }: FileSystem.DirectoryEntry,
    parent: string,
    states: States,
    excluded: States
  ): Effect.fn.Return<Child | undefined, PlatformError> {
    const result = step(compiled, states, name)
    const next = union(result)
    if (next.size === 0) {
      return undefined
    }
    const relative = join(parent, name)
    const nextExcluded = union(step(excludes, excluded, name))
    const descend = canDescend(compiled, next)
    const isDirectory = !descend && !needsDirectory(compiled, next) && !excludeNeedsDirectory
      ? false
      : type !== "Unknown" && type !== "SymbolicLink"
      ? type === "Directory"
      : yield* fs.stat(toFsPath(relative)).pipe(
        Effect.map((info) => info.type === "Directory"),
        Effect.catchIf(isIgnorable, () => Effect.succeed(false))
      )
    const accepted = accepts(compiled, next, isDirectory)
    if ((!accepted && (!isDirectory || !descend)) || accepts(excludes, nextExcluded, isDirectory)) {
      return undefined
    }
    const child = (next: States | undefined): Child => ({ relative, accepted, excluded: nextExcluded, next })
    if (!isDirectory || !descend) {
      return child(undefined)
    }
    if (result.globstar.size === 0) {
      return child(next)
    }
    // Follow symlinks only through explicit segments, not `**`.
    const followed = canDescend(compiled, result.explicit) ? result.explicit : undefined
    if (type !== "Unknown") {
      return child(type === "SymbolicLink" ? followed : next)
    }
    return yield* fs.readLink(toFsPath(relative)).pipe(
      Effect.as(child(followed)),
      Effect.catchIf(isNotLink, () => Effect.succeed(child(next)))
    )
  })

  const directory = Effect.fnUntraced(function*(
    relative: string,
    states: States,
    excluded: States,
    named: boolean,
    out: Array<string>
  ): Effect.fn.Return<void, PlatformError> {
    const listing = yield* entries(relative, states, named)
    const children = yield* Effect.forEach(
      listing.entries,
      (entry) => visit(entry, relative, states, excluded),
      { concurrency: 16 }
    )
    for (const child of children) {
      if (child === undefined) {
        continue
      }
      if (child.accepted) {
        out.push(child.relative)
      }
      if (child.next !== undefined) {
        yield* directory(child.relative, child.next, child.excluded, listing.named, out)
      }
    }
  })

  const out: Array<string> = []
  yield* directory("", compiled.initial, excludes.initial, true, out)
  return out
})
