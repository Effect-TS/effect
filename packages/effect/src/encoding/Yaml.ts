/**
 * Parses and prints YAML configuration files.
 *
 * Supports YAML 1.2 block and flow collections, compact nested sequences
 * (`- - value`), indentless sequence values, single pairs in flow sequences
 * (`[a: 1]`), flow mapping keys without values (`{a, b: 1}`), multiline plain
 * and quoted scalars (inside flow collections too), block scalars, anchors,
 * aliases, YAML 1.1 merge keys (`<<`), document streams, and the `%YAML 1.2`
 * directive. Plain scalars resolve with the YAML 1.2 core schema. Parsing
 * returns a `Result` that fails with an `EncodingError`.
 *
 * Unlike YAML 1.2, the closing bracket of a multiline flow collection may sit
 * at its parent's indentation.
 *
 * The shorthand tags of the YAML 1.2 core schema resolve: `!!str`, `!!int`,
 * `!!float`, `!!bool`, `!!null`, `!!seq` and `!!map`. A tagged node whose
 * content does not match its tag fails.
 *
 * Unsupported input fails rather than being read as text: other tags, including
 * local tags (`!local`), the non-specific tag (`!`), verbatim tags
 * (`!<tag:yaml.org,2002:str>`, even for core tags) and YAML 1.1 tags such as
 * `!!binary`; explicit keys (`? key`), `%TAG` and other directives, YAML
 * versions other than 1.2, recursive aliases, collections nested more than
 * 1000 levels deep, and merges that copy more than 100,000 keys in one
 * document. A block sequence cannot start on the same line as a mapping key
 * (`key: - value`), and a flow mapping key without a value cannot contain `:`
 * (`{a:1}`).
 *
 * Mapping keys are JavaScript strings. An alias may be a key when it refers to
 * a scalar. Only spaces and tabs are YAML white space, so characters such as a
 * no-break space (U+00A0) are kept as content. Numbers use JavaScript number
 * semantics, so integers beyond `Number.MAX_SAFE_INTEGER` lose precision.
 *
 * Printing turns JSON-like values into block-style YAML that `parse` reads
 * back unchanged. Comments and source formatting are not retained.
 *
 * @stability unstable
 * @since 4.0.0
 */

/*
 * The behavior is based on `yaml` 2.9.0.
 *
 * Copyright Eemeli Aro <eemeli@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

import * as Result from "../Result.ts"
import { EncodingError } from "./EncodingError.ts"

type YamlRecord = Record<string, unknown>

type Line = {
  readonly raw: string
  readonly text: string
  readonly indent: number
  readonly number: number
  readonly tabIndent: boolean
  // Whether the line holds a comment outside flow collections.
  readonly comment: boolean
  // `mappingSeparator(text)`.
  readonly separator: number
}

const hasOwn = Object.prototype.hasOwnProperty

// Defines `key` as an own data property, so `__proto__` and keys that name inherited
// accessors stay ordinary keys. A key found nowhere on the prototype chain cannot reach
// a setter, so plain assignment, which is much cheaper, defines the same property.
const setProperty = (record: YamlRecord, key: string, value: unknown): void => {
  if (!(key in record)) {
    record[key] = value
    return
  }
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  })
}

const isMapping = (value: unknown): value is YamlRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const maxMergedKeys = 100_000

// Each merge copies its sources' keys, so a chain of merges grows the output quadratically in
// the input. Merges in one document may visit at most `maxMergedKeys` source keys.
class MergeBudget {
  private remaining = maxMergedKeys

  spend(keys: number, fail: (message: string) => never): void {
    this.remaining -= keys
    if (this.remaining < 0) fail(`YAML merge keys copy more than ${maxMergedKeys} keys in one document`)
  }
}

// Explicit keys take precedence over merged keys, and earlier merge sources over later ones.
class MappingBuilder {
  readonly output: YamlRecord = {}
  // Keys added by the merge key, which an explicit key may still override.
  private merged: Set<string> | undefined
  private readonly budget: MergeBudget

  constructor(budget: MergeBudget) {
    this.budget = budget
  }

  set(key: string, value: unknown, fail: (message: string) => never): void {
    if (hasOwn.call(this.output, key) && !this.merged?.delete(key)) fail(`Duplicate key '${key}'`)
    setProperty(this.output, key, value)
  }

  merge(value: unknown, fail: (message: string) => never): void {
    if (this.merged !== undefined) fail("Duplicate key '<<'")
    this.merged = new Set()
    for (const source of Array.isArray(value) ? value : [value]) {
      if (!isMapping(source)) fail("Merge key values must be mappings")
      const keys = Object.keys(source)
      this.budget.spend(keys.length, fail)
      for (const key of keys) {
        if (hasOwn.call(this.output, key)) continue
        setProperty(this.output, key, source[key])
        this.merged.add(key)
      }
    }
  }
}

// YAML 1.2.2 §5.5: only spaces and tabs are white space. NBSP, U+2028 and other
// characters JavaScript treats as white space are content.
const isWhite = (character: string | undefined): boolean => character === " " || character === "\t"

// Character code variants of the predicates, for hot scans: `charCodeAt` past the end is
// `NaN`, which matches nothing, like `undefined` above.
const isWhiteCode = (code: number): boolean => code === 32 || code === 9

// Line breaks also separate tokens inside flow collections.
const isSeparationCode = (code: number): boolean => code === 32 || code === 9 || code === 10

// `,`, `[`, `]`, `{` and `}`.
const isFlowIndicatorCode = (code: number): boolean =>
  code === 44 || code === 91 || code === 93 || code === 123 || code === 125

// Index scans rather than `/[ \t]+$/`, which backtracks quadratically on long runs.
const whiteEnd = (text: string, end = text.length): number => {
  while (end > 0 && isWhiteCode(text.charCodeAt(end - 1))) end--
  return end
}

const trimWhiteStart = (text: string): string => {
  let start = 0
  while (start < text.length && isWhiteCode(text.charCodeAt(start))) start++
  return start === 0 ? text : text.slice(start)
}

const trimWhiteEnd = (text: string): string => {
  const end = whiteEnd(text)
  return end === text.length ? text : text.slice(0, end)
}

const trimWhite = (text: string): string => {
  let start = 0
  let end = text.length
  while (start < end && isSeparationCode(text.charCodeAt(start))) start++
  while (end > start && isSeparationCode(text.charCodeAt(end - 1))) end--
  return start === 0 && end === text.length ? text : text.slice(start, end)
}

// Whether `trimWhite(text)` is empty, without building it.
const isSeparationOnly = (text: string): boolean => {
  for (let index = 0; index < text.length; index++) {
    if (!isSeparationCode(text.charCodeAt(index))) return false
  }
  return true
}

const closingQuote = (input: string, quote: string, start: number): number => {
  const quoteCode = quote.charCodeAt(0)
  const double = quoteCode === 34
  for (let index = start; index < input.length; index++) {
    const code = input.charCodeAt(index)
    if (double && code === 92) {
      index++
    } else if (code === quoteCode) {
      if (!double && input.charCodeAt(index + 1) === quoteCode) index++
      else return index
    }
  }
  return -1
}

// `depth` is the number of flow collections already open before `input`. When searching
// for `#`, `found` receives the first index the search for `:` would return, or -1.
const findIndicator = (
  input: string,
  indicator: ":" | "#",
  depth = 0,
  found?: { separator: number }
): number => {
  let tokenStart = true
  const length = input.length
  for (let index = 0; index < length; index++) {
    const code = input.charCodeAt(index)
    if (tokenStart && (code === 39 || code === 34)) {
      // `'` or `"`
      index = closingQuote(input, code === 39 ? "'" : "\"", index + 1)
      if (index === -1) return -1
      tokenStart = false
    } else if (tokenStart && (code === 38 || code === 42 || code === 33)) {
      // `&`, `*` or `!`: anchor and alias names and tags may contain `:`, and the node after
      // a property still starts a token.
      while (index + 1 < length) {
        const next = input.charCodeAt(index + 1)
        if (isWhiteCode(next) || isFlowIndicatorCode(next)) break
        index++
      }
    } else if (code === 35 && (index === 0 || isWhiteCode(input.charCodeAt(index - 1)))) {
      // `#`
      return indicator === "#" ? index : -1
    } else if (tokenStart && (code === 91 || code === 123)) {
      depth++
    } else if (depth > 0 && (code === 93 || code === 125)) {
      depth--
      tokenStart = false
    } else if (depth > 0 && code === 44) {
      tokenStart = true
    } else if (code === 58 && (depth > 0 || index + 1 === length || isWhiteCode(input.charCodeAt(index + 1)))) {
      // `:`
      if (depth === 0) {
        if (indicator === ":") return index
        if (found !== undefined && found.separator === -1) found.separator = index
      }
      tokenStart = true
    } else if (tokenStart && code === 45 && isWhiteCode(input.charCodeAt(index + 1))) {
      continue
    } else if (!isWhiteCode(code)) {
      tokenStart = false
    }
  }
  return -1
}

const stripComment = (input: string, depth = 0): string => {
  const index = findIndicator(input, "#", depth)
  return index === -1 ? input : trimWhiteEnd(input.slice(0, index))
}

const mappingSeparator = (input: string): number => findIndicator(input, ":")

// YAML 1.2.2 §6.2: a space or a tab separates the `-` indicator from the entry.
const isSequenceEntry = (text: string): boolean =>
  text.charCodeAt(0) === 45 && (text.length === 1 || isWhiteCode(text.charCodeAt(1)))

// YAML 1.2.2 §9.1: document markers start at column zero and are followed by whitespace.
const isDocumentMarker = (line: Line): boolean =>
  line.indent === 0 && (line.raw.length === 3 || isWhiteCode(line.raw.charCodeAt(3))) &&
  (line.raw.startsWith("---") || line.raw.startsWith("..."))

const isDocumentStart = (line: Line): boolean => isDocumentMarker(line) && line.raw.startsWith("---")

// YAML 1.2.2 §5.3: `%` is the directive indicator and cannot start a plain scalar.
const directiveIndicatorError = "Plain scalars cannot start with '%'"

// YAML 1.2.2 §6.9.1: `!` starts a tag. Only the shorthand tags of the core schema
// (§10.3) resolve; every other tag fails rather than being read as text.
const coreTags = new Set(["!!str", "!!int", "!!float", "!!bool", "!!null", "!!seq", "!!map"])

// The tag token at the start of `text`, which must be a core tag.
const readTag = (text: string, fail: (message: string) => never): string => {
  // A verbatim tag (`!<...>`) may contain `,`, so it is read whole.
  const tag = /^!(?:<[^>]*>?|[^ \t\n,[\]{}]*)/.exec(text)![0]
  if (!coreTags.has(tag)) {
    fail(`Unsupported YAML tag '${tag}', only the core tags ${[...coreTags].join(", ")} are supported`)
  }
  return tag
}

// YAML 1.2.2 §10.3: the core schema's scalar spellings, matched against source text.
// Shared by tag resolution and by the printer, which quotes any string spelled this way.
const coreSchema = {
  null: /^(?:null|Null|NULL|~)$/,
  true: /^(?:true|True|TRUE)$/,
  false: /^(?:false|False|FALSE)$/,
  int: /^[-+]?[0-9]+$/,
  octal: /^0o[0-7]+$/,
  hex: /^0x[0-9a-fA-F]+$/,
  // The fraction is optional, so `1` is a float too.
  float: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?$/,
  infinity: /^[-+]?\.(?:inf|Inf|INF)$/,
  nan: /^\.(?:nan|NaN|NAN)$/
}

const isCoreNonString = (text: string): boolean => Object.values(coreSchema).some((pattern) => pattern.test(text))

const coreInt = (text: string): number | undefined => {
  if (coreSchema.int.test(text)) return Number(text)
  if (coreSchema.octal.test(text)) return Number.parseInt(text.slice(2), 8)
  if (coreSchema.hex.test(text)) return Number.parseInt(text.slice(2), 16)
  return undefined
}

const coreFloat = (text: string): number | undefined => {
  if (coreSchema.float.test(text)) return Number(text)
  if (coreSchema.infinity.test(text)) return text.startsWith("-") ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  if (coreSchema.nan.test(text)) return Number.NaN
  return undefined
}

// Whether a scalar starting with `code` may match a `coreSchema` pattern: `~`, the first
// letters of `null`, `true` and `false` in each case, a sign, `.` or a digit. Other scalars
// are strings without testing every pattern.
const mayBeCoreNonString = (code: number): boolean => {
  switch (code) {
    case 126: // ~
    case 110: // n
    case 78: // N
    case 116: // t
    case 84: // T
    case 102: // f
    case 70: // F
    case 43: // +
    case 45: // -
    case 46: // .
      return true
    default:
      return code >= 48 && code <= 57
  }
}

// YAML 1.2.2 §10.3.2: a plain scalar resolves to the first core type whose pattern matches,
// and is a string otherwise.
const resolvePlain = (text: string): unknown => {
  if (text === "") return null
  if (!mayBeCoreNonString(text.charCodeAt(0))) return text
  if (coreSchema.null.test(text)) return null
  if (coreSchema.true.test(text)) return true
  if (coreSchema.false.test(text)) return false
  return coreInt(text) ?? coreFloat(text) ?? text
}

// Resolves a core scalar tag against the scalar's source text, so `!!str 0x10` stays
// `"0x10"` and `!!int "42"` becomes `42`.
const resolveScalarTag = (tag: string, text: string, fail: (message: string) => never): unknown => {
  switch (tag) {
    case "!!str":
      return text
    case "!!null":
      if (text === "" || coreSchema.null.test(text)) return null
      break
    case "!!bool":
      if (coreSchema.true.test(text)) return true
      if (coreSchema.false.test(text)) return false
      break
    case "!!int": {
      const value = coreInt(text)
      if (value !== undefined) return value
      break
    }
    case "!!float": {
      const value = coreFloat(text)
      if (value !== undefined) return value
      break
    }
  }
  return fail(`Scalar '${text}' does not match the YAML tag ${tag}`)
}

// Resolves a core tag against a parsed node. `plain` is the source text when the
// node is a plain scalar; quoted and block scalars are already strings, and an
// empty node is the empty string.
const resolveTag = (
  tag: string,
  value: unknown,
  plain: string | undefined,
  fail: (message: string) => never
): unknown => {
  const collection = typeof value === "object" && value !== null
  if (tag === "!!seq" || tag === "!!map") {
    if (!collection || Array.isArray(value) !== (tag === "!!seq")) fail(`Node does not match the YAML tag ${tag}`)
    return value
  }
  if (collection) fail(`A collection does not match the YAML tag ${tag}`)
  return resolveScalarTag(tag, plain ?? (typeof value === "string" ? value : ""), fail)
}

const isExplicitKey = (text: string): boolean =>
  text.charCodeAt(0) === 63 && (text.length === 1 || isWhiteCode(text.charCodeAt(1)))

const explicitKeyError = "YAML explicit keys (`?`) are not supported"

// A mapping key with its properties resolved. `merge` is true only for a plain `<<`,
// with or without an anchor, so quoted keys and aliases resolving to `<<` stay ordinary keys.
type MappingKey = {
  readonly key: string
  readonly merge: boolean
}

// Bounds recursion over nested block and flow collections, so deep input fails
// with an `EncodingError` instead of exhausting the stack.
const maxDepth = 1000

const depthError = `YAML collections exceed the maximum nesting depth of ${maxDepth}`

// YAML 1.2.2 §7.1: an alias may be a mapping key. Keys are strings, so only scalars qualify.
const aliasKey = (anchors: Map<string, unknown>, name: string, fail: (message: string) => never): string => {
  if (!anchors.has(name)) fail(`Unknown alias '*${name}'`)
  const value = anchors.get(name)
  if (typeof value === "object" && value !== null) fail(`Alias '*${name}' of a collection cannot be a mapping key`)
  return value === null || value === undefined ? "" : String(value)
}

// Resolves a scalar key, recording its anchor. Only a plain `<<` merges, so a
// quoted key keeps its quotes in `text` and stays ordinary.
// `text` is the key's source; a tagged key resolves its tag instead and never merges.
const scalarKey = (
  anchors: Map<string, unknown>,
  anchor: string | undefined,
  tag: string | undefined,
  text: string,
  fail: (message: string) => never
): MappingKey => {
  if (tag === undefined) {
    if (anchor !== undefined) anchors.set(anchor, parseScalar(text))
    return { key: parseKey(text), merge: text === "<<" }
  }
  const quoted = text.startsWith("\"") || text.startsWith("'")
  // A flow collection used as a key is not a scalar, whatever its source looks like.
  if (!quoted && (text.startsWith("[") || text.startsWith("{"))) fail(`A collection does not match the YAML tag ${tag}`)
  const value = resolveScalarTag(tag, quoted ? parseScalar(text) as string : text, fail)
  if (anchor !== undefined) anchors.set(anchor, value)
  return { key: value === null ? "" : String(value), merge: false }
}

const foldLineBreak = (blankLines: number): string => blankLines === 0 ? " " : "\n".repeat(blankLines)

// Folds the line breaks of a multiline plain flow scalar. Scans line by line, since
// a white-space regex would backtrack quadratically on long runs without a break.
const foldFlowLines = (input: string): string => {
  if (!input.includes("\n")) return input
  const lines = input.split("\n")
  let output = trimWhiteEnd(lines[0])
  let blankLines = 0
  for (let index = 1; index < lines.length; index++) {
    const last = index === lines.length - 1
    const line = last ? trimWhiteStart(lines[index]) : trimWhiteEnd(trimWhiteStart(lines[index]))
    if (!last && line.length === 0) {
      blankLines++
      continue
    }
    output += foldLineBreak(blankLines) + line
    blankLines = 0
  }
  return output
}

const endsWithEscape = (text: string, end = text.length): boolean => {
  let start = end
  while (start > 0 && text[start - 1] === "\\") start--
  return (end - start) % 2 === 1
}

// Escaped trailing spaces are content, not folding whitespace.
const trimFoldedEnd = (line: string, quote: string): string => {
  const end = whiteEnd(line)
  if (end === line.length) return line
  const escaped = quote === "\"" && endsWithEscape(line, end)
  return line.slice(0, end + (escaped ? 1 : 0))
}

// Folds the line breaks of a multiline quoted scalar read inside a flow collection,
// following the same rules as quoted block values. The result keeps its quotes.
const foldQuotedLines = (raw: string): string => {
  const lines = raw.split("\n")
  if (lines.length === 1) return raw
  const quote = raw[0]
  let output = ""
  let line = lines[0]
  let index = 1
  while (index < lines.length) {
    if (quote === "\"" && endsWithEscape(line)) {
      output += line.slice(0, -1)
    } else {
      // The last line holds the closing quote, so it is never blank.
      let blankLines = 0
      while (index < lines.length - 1 && trimWhiteStart(lines[index]).length === 0) {
        blankLines++
        index++
      }
      output += trimFoldedEnd(line, quote) + foldLineBreak(blankLines)
    }
    line = trimWhiteStart(lines[index++])
  }
  return output + line
}

const parseDoubleQuoted = (input: string): string => {
  if (!input.endsWith("\"") || input.length < 2) {
    throw new SyntaxError("Unterminated double-quoted YAML string")
  }
  let output = ""
  for (let index = 1; index < input.length - 1; index++) {
    const character = input[index]
    if (character !== "\\") {
      output += character
      continue
    }
    const escape = input[++index]
    const escapes: Record<string, string> = {
      "0": "\0",
      a: "\x07",
      b: "\b",
      t: "\t",
      n: "\n",
      v: "\v",
      f: "\f",
      r: "\r",
      e: "\x1b",
      // YAML 1.2.2 §5.7: a backslash followed by a literal tab also escapes a tab.
      "\t": "\t",
      " ": " ",
      "\"": "\"",
      "/": "/",
      "\\": "\\",
      N: "\u0085",
      _: "\u00a0",
      L: "\u2028",
      P: "\u2029"
    }
    if (hasOwn.call(escapes, escape)) {
      output += escapes[escape]
      continue
    }
    if (escape === "x" || escape === "u" || escape === "U") {
      const length = escape === "x" ? 2 : escape === "u" ? 4 : 8
      const hex = input.slice(index + 1, index + 1 + length)
      if (!new RegExp(`^[0-9A-Fa-f]{${length}}$`).test(hex)) {
        throw new SyntaxError("Invalid unicode escape in YAML string")
      }
      output += String.fromCodePoint(Number.parseInt(hex, 16))
      index += length
      continue
    }
    throw new SyntaxError(`Invalid YAML escape '\\${escape}'`)
  }
  return output
}

const parseScalar = (input: string): unknown => {
  const value = trimWhite(input)
  if (value.length === 0) return null
  if (value.startsWith("\"") && value.endsWith("\"")) {
    return parseDoubleQuoted(value)
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  return resolvePlain(value)
}

const parseKey = (input: string): string => {
  const value = parseScalar(input)
  return value === null || value === undefined ? "" : String(value)
}

// Ends an anchor or alias name inside a flow collection.
const isFlowNameEnd = (code: number): boolean => isSeparationCode(code) || isFlowIndicatorCode(code)

// Ends an alias inside a flow collection. A tag must be followed by one of these too.
const isFlowAliasEnd = (code: number): boolean => isSeparationCode(code) || code === 44 || code === 93 || code === 125

// Ends a plain scalar inside a flow collection: `,`, `]` or `}`.
const isFlowPlainEnd = (code: number): boolean => code === 44 || code === 93 || code === 125

// Ends a verbatim tag: `>`.
const isVerbatimTagEnd = (code: number): boolean => code === 62

const flowDashError = "A flow plain scalar cannot start with '-' followed by white space or a flow indicator"

class FlowParser {
  // The flow collection is read one line at a time. Each line after the first
  // starts with the "\n" that separates it from the previous one, so offsets and
  // multiline text match a single joined string without ever building one:
  // appending to and indexing a growing string is quadratic.
  private line: string
  // Length of the lines before `line`, for error offsets.
  private offset = 0
  private readonly anchors: Map<string, unknown>
  private readonly merges: MergeBudget
  // `quoted` asks for a continuation of an open quoted scalar, returned without
  // comment removal since `#` inside quotes is content.
  private readonly nextLine: (depth: number, quoted: boolean) => string | undefined
  // Block collections already open around this flow collection.
  private readonly blockDepth: number
  private index = 0
  private depth = 0
  // Source text of the last plain scalar, which a scalar tag resolves against.
  private plainText: string | undefined

  constructor(
    input: string,
    anchors: Map<string, unknown>,
    merges: MergeBudget,
    nextLine: (depth: number, quoted: boolean) => string | undefined,
    blockDepth: number
  ) {
    this.line = input
    this.anchors = anchors
    this.merges = merges
    this.nextLine = nextLine
    this.blockDepth = blockDepth
  }

  parse(): unknown {
    const value = this.parseValue()
    this.skipWhitespace()
    if (this.index !== this.line.length) {
      this.fail("Unexpected flow collection content")
    }
    return value
  }

  private parseValue(): unknown {
    this.skipWhitespace()
    const character = this.peek()
    if (character === "[" || character === "{") {
      if (this.blockDepth + ++this.depth > maxDepth) this.fail(depthError)
      const collection = character === "[" ? this.parseSequence() : this.parseMapping()
      this.depth--
      return collection
    }
    if (character === "\"" || character === "'") return parseScalar(this.readQuoted(character))
    if (character === "*") {
      this.index++
      const name = this.readUntil(isFlowAliasEnd)
      if (!this.anchors.has(name)) this.fail(`Unknown alias '*${name}'`)
      return this.anchors.get(name)
    }
    if (character === "&") {
      this.index++
      const name = this.readUntil(isFlowNameEnd)
      const next = this.peek()
      if (name === "" || next === "[" || next === "{") this.fail("Invalid anchor")
      this.skipWhitespace()
      if (this.peek() === "&") this.fail("Multiple anchors on one node")
      if (this.peek() === "*") this.fail("An alias cannot have an anchor")
      const value = this.peek() === "!" ? this.parseTaggedValue(true) : this.parseValue()
      this.anchors.set(name, value)
      return value
    }
    if (character === "!") return this.parseTaggedValue(false)
    const text = this.readPlain(isFlowPlainEnd)
    this.plainText = text
    return parseScalar(text)
  }

  // A tag, optionally followed by an anchor, then the node it applies to.
  // `anchored` is true when an anchor before the tag belongs to the same node.
  private parseTaggedValue(anchored: boolean): unknown {
    const fail = (message: string) => this.fail(message)
    const tag = this.readFlowTag(fail)
    this.skipWhitespace()
    let anchor: string | undefined
    if (this.peek() === "&") {
      if (anchored) this.fail("Multiple anchors on one node")
      this.index++
      anchor = this.readUntil(isFlowNameEnd)
      if (anchor === "") this.fail("Invalid anchor")
      this.skipWhitespace()
    }
    if (this.peek() === "&") this.fail("Multiple anchors on one node")
    if (this.peek() === "!") this.fail("Multiple tags on one node")
    if (this.peek() === "*") this.fail("An alias cannot have a tag")
    this.plainText = undefined
    const node = this.parseValue()
    const value = resolveTag(tag, node, this.plainText, fail)
    if (anchor !== undefined) this.anchors.set(anchor, value)
    return value
  }

  // Reads a plain scalar up to `stop`, rejecting directive, tag, explicit key and
  // block sequence indicators.
  private readPlain(stop: (code: number) => boolean): string {
    // YAML 1.2.2 §7.3.3: `-` starts a plain scalar only before a non-space character other
    // than a flow indicator. Checked in the source, since folding and trimming hide a
    // following space or line break; the end of the line is a line break.
    if (this.peek() === "-") {
      const next = this.line.charCodeAt(this.index + 1)
      if (this.index + 1 >= this.line.length || isWhiteCode(next) || isFlowIndicatorCode(next)) this.fail(flowDashError)
    }
    const start = this.offset + this.index
    const text = trimWhite(foldFlowLines(this.readUntil(stop, true)))
    if (text.startsWith("%")) this.fail(directiveIndicatorError)
    if (isExplicitKey(text)) this.fail(explicitKeyError)
    // YAML 1.2.2 §7.3.3 (ns-plain-safe-in): a plain scalar in a flow collection cannot contain a
    // flow indicator. `,`, `]` and `}` end it, and `[` or `{` inside it fails.
    if (/[[{]/.test(text)) {
      throw new SyntaxError(`A flow plain scalar cannot contain '[' or '{' at flow offset ${start}`)
    }
    return text
  }

  private parseSequence(): Array<unknown> {
    this.expect("[")
    const output: Array<unknown> = []
    this.skipWhitespace()
    if (this.peek() === "]") {
      this.index++
      return output
    }
    while (true) {
      output.push(this.parseSequenceEntry())
      this.skipWhitespace()
      if (this.peek() === "]") {
        this.index++
        return output
      }
      this.expect(",")
      this.skipWhitespace()
      if (this.peek() === "]") {
        this.index++
        return output
      }
    }
  }

  // YAML 1.2.2 §7.4.1: a sequence entry followed by `:` is a single `key: value` pair, read as a
  // one-entry mapping. Like any implicit key, its key is on one line.
  private parseSequenceEntry(): unknown {
    const start = this.index
    const offset = this.offset
    const collection = this.peek() === "[" || this.peek() === "{"
    const value = this.parseValue()
    this.skipWhitespace()
    if (this.peek() !== ":") return value
    if (collection) this.fail("A flow collection cannot be a mapping key")
    if (this.offset !== offset) this.fail("A flow sequence pair must start on the line of its key")
    // Read again as a key, which converts and anchors differently from a value.
    this.index = start
    if (this.blockDepth + ++this.depth > maxDepth) this.fail(depthError)
    const mapping = new MappingBuilder(this.merges)
    this.parseMappingEntry(mapping)
    this.depth--
    return mapping.output
  }

  private parseMapping(): YamlRecord {
    this.expect("{")
    const mapping = new MappingBuilder(this.merges)
    this.skipWhitespace()
    if (this.peek() === "}") {
      this.index++
      return mapping.output
    }
    while (true) {
      this.skipWhitespace()
      this.parseMappingEntry(mapping)
      this.skipWhitespace()
      if (this.peek() === "}") {
        this.index++
        return mapping.output
      }
      this.expect(",")
      this.skipWhitespace()
      if (this.peek() === "}") {
        this.index++
        return mapping.output
      }
    }
  }

  // YAML 1.2.2 §7.4: a key followed by `,` or the end of the collection has an empty value.
  private parseMappingEntry(mapping: MappingBuilder): void {
    const fail = (message: string) => this.fail(message)
    const { key, merge } = this.parseKey()
    this.skipWhitespace()
    let value: unknown = null
    if (!isFlowPlainEnd(this.peek().charCodeAt(0))) {
      this.expect(":")
      value = this.parseValue()
    }
    if (merge) mapping.merge(value, fail)
    else mapping.set(key, value, fail)
  }

  private parseKey(): MappingKey {
    const fail = (message: string) => this.fail(message)
    this.skipWhitespace()
    let anchor: string | undefined
    if (this.peek() === "&") {
      this.index++
      anchor = this.readUntil(isFlowNameEnd)
      if (anchor === "") this.fail("Invalid anchor")
      this.skipWhitespace()
    }
    let tag: string | undefined
    if (this.peek() === "!") {
      tag = this.readFlowTag(fail)
      this.skipWhitespace()
      if (anchor === undefined && this.peek() === "&") {
        this.index++
        anchor = this.readUntil(isFlowNameEnd)
        if (anchor === "") this.fail("Invalid anchor")
        this.skipWhitespace()
      }
      if (this.peek() === "!") this.fail("Multiple tags on one node")
    }
    if (anchor !== undefined && this.peek() === "&") this.fail("Multiple anchors on one node")
    const character = this.peek()
    if (character === "*") {
      if (anchor !== undefined) this.fail("An alias cannot have an anchor")
      if (tag !== undefined) this.fail("An alias cannot have a tag")
      this.index++
      return { key: aliasKey(this.anchors, this.readUntil(isFlowNameEnd), fail), merge: false }
    }
    // Converted like a block key, so `null` and `0x10` give the same keys in both styles.
    if (character === "\"" || character === "'") {
      return scalarKey(this.anchors, anchor, tag, this.readQuoted(character), fail)
    }
    const text = this.readPlain(isFlowPlainEnd)
    if (this.peek() !== ":") {
      if (text === "") this.expect(":")
      // `{a:1}` is the key `a:1` without a value under YAML 1.2.2 §7.3.3, but reads as `{a: 1}` in
      // JSON-like syntax, so it fails rather than giving either.
      if (text.includes(":")) {
        this.fail(`Flow mapping key '${text}' has no value, add a space after ':' or quote the key`)
      }
    }
    return scalarKey(this.anchors, anchor, tag, text, fail)
  }

  // Reads a quoted scalar, pulling continuation lines until its closing quote.
  // Each line is scanned once, so long scalars stay linear.
  private readQuoted(quote: string): string {
    const startOffset = this.offset + this.index
    const pieces: Array<string> = []
    let start = this.index
    let from = start + 1
    while (true) {
      const end = closingQuote(this.line, quote, from)
      if (end !== -1) {
        this.index = end + 1
        pieces.push(this.line.slice(start, this.index))
        if (pieces.length > 1) {
          // The rest of the closing line was read raw, so remove its comment now.
          const rest = this.line.slice(this.index)
          if (!rest.startsWith("#")) this.line = this.line.slice(0, this.index) + stripComment(rest, this.depth)
        }
        return foldQuotedLines(pieces.join(""))
      }
      pieces.push(this.line.slice(start))
      // An escape at the end of the line consumes the next line's "\n".
      const skipped = quote === "\"" && endsWithEscape(this.line) ? 1 : 0
      if (!this.nextChunk(true)) throw new SyntaxError(`Unterminated quoted scalar at flow offset ${startOffset}`)
      start = 0
      from = skipped
    }
  }

  // YAML 1.2.2 §7.5: a tag is separated from its content, which may be empty before a
  // flow indicator or at the end of the line.
  private readFlowTag(fail: (message: string) => never): string {
    const tag = readTag(this.readTagToken(), fail)
    if (this.index < this.line.length && !isFlowAliasEnd(this.line.charCodeAt(this.index))) {
      this.fail(`Expected white space after the YAML tag ${tag}`)
    }
    return tag
  }

  // A verbatim tag (`!<...>`) may contain `,`, so it is read up to its `>`.
  private readTagToken(): string {
    if (this.line[this.index + 1] !== "<") return this.readUntil(isFlowNameEnd)
    const token = this.readUntil(isVerbatimTagEnd)
    if (this.peek() !== ">") return token
    this.index++
    return `${token}>`
  }

  // `separator` also stops at a `:` that separates a key from its value.
  private readUntil(stop: (code: number) => boolean, separator = false): string {
    // Only text spanning lines needs pieces; most tokens are one slice of one line.
    let pieces: Array<string> | undefined
    let start = this.index
    while (true) {
      if (this.index === this.line.length) {
        const piece = this.line.slice(start)
        if (this.depth === 0 || !this.nextChunk(false)) return pieces === undefined ? piece : pieces.join("") + piece
        ;(pieces ??= []).push(piece)
        start = 0
      }
      const code = this.line.charCodeAt(this.index)
      if (stop(code) || (separator && code === 58 && this.isValueSeparator())) break
      this.index++
    }
    const piece = this.line.slice(start, this.index)
    return pieces === undefined ? piece : pieces.join("") + piece
  }

  // YAML 1.2.2 §7.3.3: in flow context, a `:` followed by white space, a line break or a flow
  // indicator separates a key from its value. Any other `:` is part of a plain scalar.
  private isValueSeparator(): boolean {
    const next = this.line.charCodeAt(this.index + 1)
    return this.index + 1 >= this.line.length || isWhiteCode(next) || isFlowIndicatorCode(next)
  }

  // Moves to the next line of the flow collection, keeping its leading "\n".
  private nextChunk(quoted: boolean): boolean {
    const next = this.nextLine(this.depth, quoted)
    if (next === undefined) return false
    this.offset += this.line.length
    this.line = `\n${next}`
    this.index = 0
    return true
  }

  private skipWhitespace(): void {
    while (true) {
      // As `peek`: inside a collection, the end of the line continues on the next line.
      if (this.index === this.line.length && (this.depth === 0 || !this.nextChunk(false))) return
      if (!isSeparationCode(this.line.charCodeAt(this.index))) return
      this.index++
    }
  }

  private expect(character: string): void {
    if (this.peek() !== character) this.fail(`Expected '${character}'`)
    this.index++
  }

  private peek(): string {
    // Inside a collection, the end of the line continues on the next line.
    if (this.index === this.line.length && this.depth > 0) this.nextChunk(false)
    return this.line[this.index] ?? ""
  }

  private fail(message: string): never {
    throw new SyntaxError(`${message} at flow offset ${this.offset + this.index}`)
  }
}

const makeLine = (raw: string, number: number): Line => {
  let indentation = 0
  while (raw.charCodeAt(indentation) === 32) indentation++
  // Scanning the indentation too finds the same comment and separator, since spaces
  // neither start a token nor end one, and gives indices into `raw`, so the text is sliced
  // once. The separator search stops at the comment, which `text` no longer holds.
  const found = { separator: -1 }
  const comment = findIndicator(raw, "#", 0, found)
  return {
    raw,
    text: comment === -1
      ? raw.slice(indentation)
      : raw.slice(indentation, Math.max(indentation, whiteEnd(raw, comment))),
    indent: indentation,
    number,
    // Rejected where the line is read as structure; block scalar content may hold tabs.
    tabIndent: raw.charCodeAt(indentation) === 9,
    comment: comment !== -1,
    separator: found.separator === -1 ? -1 : found.separator - indentation
  }
}

// Removes the comment from a marker or directive line, keeping characters before
// it that are not YAML separation so they can be rejected.
const boundaryContent = (raw: string): string => {
  const index = findIndicator(raw, "#")
  return trimWhiteEnd(index === -1 ? raw : raw.slice(0, index))
}

// Splits the node properties, an anchor and a tag in either order, from the start of `text`.
const nodeProperties = (
  text: string,
  fail: (message: string) => never
): { readonly anchor: string | undefined; readonly tag: string | undefined; readonly rest: string } => {
  // Neither an anchor nor a tag, the common case: the checks below would all fail.
  const first = text.charCodeAt(0)
  if (first !== 38 && first !== 33) return { anchor: undefined, tag: undefined, rest: text }
  let anchor: string | undefined
  let tag: string | undefined
  let rest = text
  while (true) {
    // `s`: U+2028 and U+2029 are content, not line breaks.
    const property = anchor === undefined ? /^&([^ \t,[\]{}]+)(?:[ \t]+|$)/s.exec(rest) : null
    if (property !== null) {
      anchor = property[1]
      rest = rest.slice(property[0].length)
    } else if (tag === undefined && rest.startsWith("!")) {
      tag = readTag(rest, fail)
      rest = rest.slice(tag.length)
      if (rest.length > 0 && !isWhite(rest[0])) fail(`Expected white space after the YAML tag ${tag}`)
      rest = trimWhiteStart(rest)
    } else {
      // A node has at most one anchor and one tag.
      if (tag !== undefined && rest.startsWith("!")) fail("Multiple tags on one node")
      if (anchor !== undefined && /^&[^ \t,[\]{}]/.test(rest)) fail("Multiple anchors on one node")
      // YAML 1.2.2 §§5.3 and 6.9.2: `&` cannot start a plain scalar, so it must start a named anchor.
      if (rest.startsWith("&")) fail("Invalid anchor")
      return { anchor, tag, rest }
    }
  }
}

const throwSyntaxError = (message: string): never => {
  throw new SyntaxError(message)
}

class YamlParser {
  private readonly lines: Array<Line>
  private index = 0
  // Lines from this index on belong to the next document, so document content
  // never reads past a document marker.
  private documentEnd: number
  // Anchors and the merge budget are scoped to one document.
  private anchors = new Map<string, unknown>()
  private merges = new MergeBudget()
  // Block collections currently open.
  private depth = 0
  // Source text of the last plain scalar, which a scalar tag resolves against.
  private plainText: string | undefined

  constructor(lines: Array<Line>) {
    this.lines = lines
    this.documentEnd = lines.length
  }

  private lineAt(index: number): Line | undefined {
    return index < this.documentEnd ? this.lines[index] : undefined
  }

  // YAML 1.2.2 §9.2. `limit` stops with an error before a document past it starts.
  parseStream(limit = Number.POSITIVE_INFINITY): Array<unknown> {
    const documents: Array<unknown> = []
    // True at the start of the stream and after a document end marker, where directives and bare documents may start.
    let prefix = true
    while (true) {
      this.skipIgnored()
      const line = this.lines[this.index]
      if (line === undefined) return documents
      // YAML 1.2.2 §9.1.1: a byte order mark may start any document prefix.
      if (prefix && line.raw.startsWith("\uFEFF")) {
        this.lines[this.index] = makeLine(line.raw.slice(1), line.number)
        continue
      }
      if (isDocumentMarker(line) && !isDocumentStart(line)) {
        if (boundaryContent(line.raw) !== "...") this.fail(line, "Unexpected content after document end marker")
        this.index++
        prefix = true
        continue
      }
      if (!prefix && !isDocumentStart(line)) this.fail(line, "Unexpected content")
      if (documents.length >= limit) {
        this.fail(line, "Expected a single YAML document, use parseAll to parse a document stream")
      }
      if (prefix && line.indent === 0 && line.text.startsWith("%")) this.parseDirectives()
      this.anchors = new Map()
      this.merges = new MergeBudget()
      documents.push(this.parseDocument())
      prefix = false
    }
  }

  // YAML 1.2.2 §6.8: only `%YAML 1.2` is supported, and directives must be followed by `---`.
  private parseDirectives(): void {
    let version = false
    while (true) {
      this.skipIgnored()
      const line = this.lines[this.index]
      if (line === undefined || line.indent !== 0 || !line.text.startsWith("%")) break
      const [name, ...parameters] = boundaryContent(line.raw.slice(1)).split(/[ \t]+/)
      if (name === "YAML") {
        if (version) this.fail(line, "Duplicate %YAML directive")
        if (parameters.length !== 1 || parameters[0] !== "1.2") {
          this.fail(line, `Unsupported YAML version '${parameters.join(" ")}', only 1.2 is supported`)
        }
        version = true
      } else {
        this.fail(line, `Unsupported YAML directive '%${name}'`)
      }
      this.index++
    }
    const next = this.lines[this.index]
    if (next === undefined || !isDocumentStart(next)) {
      this.fail(next ?? this.lines[this.index - 1], "Expected '---' after YAML directives")
    }
  }

  private parseDocument(): unknown {
    const start = this.lines[this.index]
    if (isDocumentStart(start)) this.index++
    // Scanning forward from the current line keeps a stream of many documents linear.
    let end = this.index
    while (end < this.lines.length && !isDocumentMarker(this.lines[end])) end++
    this.documentEnd = end
    const value = this.parseDocumentContent(start)
    this.documentEnd = this.lines.length
    return value
  }

  private parseDocumentContent(start: Line): unknown {
    if (isDocumentStart(start)) {
      // Strip the comment after the marker, so quotes and flow openers are read as token starts.
      const content = stripComment(start.raw.slice(3).replace(/^[ \t]+/, ""))
      if (content.length > 0) {
        // Block collections start on the line after the marker.
        if (isSequenceEntry(content) || mappingSeparator(content) !== -1) {
          this.fail(start, "Block collections cannot start on the document start line")
        }
        return this.parseNodeValue(content, -1)
      }
    }
    this.skipIgnored()
    const line = this.lineAt(this.index)
    if (line === undefined) return null
    return this.parseNode(line.indent)
  }

  // `allowIndentless` is set for a mapping value, whose block sequence may sit at the mapping's
  // indentation (YAML 1.2.2 §8.2.1), also after node properties on their own lines.
  private parseNode(indent: number, parentIndent = indent - 1, allowIndentless = false): unknown {
    this.skipIgnored()
    const line = this.lineAt(this.index)
    if (line === undefined) return null
    if (line.indent !== indent) this.fail(line, `Expected indentation of ${indent} spaces`)
    if (isExplicitKey(line.text)) this.fail(line, explicitKeyError)
    if (isSequenceEntry(line.text)) return this.parseSequence(indent)
    if (line.separator !== -1) return this.parseMapping(indent)
    this.index++
    return this.parseNodeValue(line.text, parentIndent, allowIndentless)
  }

  // `first` is the entry on a sequence item's line, parsed once the mapping counts toward the depth.
  private parseMapping(
    indent: number,
    first?: { readonly text: string; readonly separator: number; readonly line: Line }
  ): YamlRecord {
    this.enterCollection()
    const mapping = new MappingBuilder(this.merges)
    if (first !== undefined) this.parseMappingEntry(mapping, first.text, first.separator, indent, first.line)
    while (true) {
      this.skipIgnored()
      const line = this.lineAt(this.index)
      if (line === undefined || line.indent < indent) break
      if (line.indent > indent) this.fail(line, `Unexpected indentation of ${line.indent} spaces`)
      if (isExplicitKey(line.text)) this.fail(line, explicitKeyError)
      const separator = line.separator
      if (separator === -1) break
      this.index++
      this.parseMappingEntry(mapping, line.text, separator, indent, line)
    }
    this.depth--
    return mapping.output
  }

  private parseMappingEntry(
    mapping: MappingBuilder,
    text: string,
    separator: number,
    indent: number,
    line: Line
  ): void {
    const fail = (message: string) => this.fail(line, message)
    // Resolved before the value, which may redefine the anchor.
    const { key, merge } = this.parseBlockKey(text.slice(0, separator), fail)
    const rawValue = trimWhiteStart(text.slice(separator + 1))
    const value = this.parseNodeValue(rawValue, indent, true)
    if (merge) mapping.merge(value, fail)
    else mapping.set(key, value, fail)
  }

  // `raw` is the key text before the `:` separator.
  private parseBlockKey(raw: string, fail: (message: string) => never): MappingKey {
    const { anchor, tag, rest: text } = nodeProperties(trimWhite(raw), fail)
    if (text.startsWith("%")) fail(directiveIndicatorError)
    if (isExplicitKey(text)) fail(explicitKeyError)
    if (text.startsWith("*")) {
      if (anchor !== undefined) fail("An alias cannot have an anchor")
      if (tag !== undefined) fail("An alias cannot have a tag")
      // `:` may be part of an alias name, so the separator must follow white space.
      if (!isWhite(raw[raw.length - 1])) fail("An alias used as a mapping key must be followed by a space before ':'")
      return { key: aliasKey(this.anchors, text.slice(1), fail), merge: false }
    }
    return scalarKey(this.anchors, anchor, tag, text, fail)
  }

  // `first` is the entry of a compact nested sequence (`- - item`), which starts on its parent entry's line.
  private parseSequence(
    indent: number,
    first?: { readonly text: string; readonly separator: number; readonly line: Line }
  ): Array<unknown> {
    this.enterCollection()
    const output: Array<unknown> = []
    if (first !== undefined) output.push(this.parseSequenceEntry(first.text, first.separator, indent, first.line))
    while (true) {
      this.skipIgnored()
      const line = this.lineAt(this.index)
      if (line === undefined || line.indent < indent) break
      if (line.indent > indent) this.fail(line, `Unexpected indentation of ${line.indent} spaces`)
      if (!isSequenceEntry(line.text)) break
      this.index++
      output.push(this.parseSequenceEntry(line.text, line.separator, indent, line))
    }
    this.depth--
    return output
  }

  // `entry` starts with the `-` indicator, which sits at column `indent` of `line`, and
  // `separator` is `mappingSeparator(entry)`.
  private parseSequenceEntry(entry: string, separator: number, indent: number, line: Line): unknown {
    const item = trimWhiteStart(entry.slice(1))
    if (isExplicitKey(item)) this.fail(line, explicitKeyError)
    // A compact nested sequence or mapping is indented to its first character,
    // which may sit more than one space after the dash.
    const offset = entry.length - item.length
    // The `-` indicator and the white space after it leave the separator search where it
    // was, so the entry's separator is the item's, shifted by the indicator.
    const itemSeparator = separator === -1 ? -1 : separator - offset
    const nested = isSequenceEntry(item)
    if (!nested && itemSeparator === -1) return this.parseNodeValue(item, indent)
    if (entry.slice(1, offset).includes("\t")) this.fail(line, "Tabs cannot be used for YAML indentation")
    return nested
      ? this.parseSequence(indent + offset, { text: item, separator: itemSeparator, line })
      : this.parseMapping(indent + offset, { text: item, separator: itemSeparator, line })
  }

  private enterCollection(): void {
    if (++this.depth > maxDepth) throw new SyntaxError(depthError)
  }

  // `outer` holds properties from a previous line that belong to this node.
  private parseNodeValue(
    rawValue: string,
    parentIndent: number,
    allowIndentless = false,
    outer?: { readonly anchor: string | undefined; readonly tag: string | undefined }
  ): unknown {
    const fail = throwSyntaxError
    const own = nodeProperties(rawValue, fail)
    if (outer?.anchor !== undefined && own.anchor !== undefined) fail("Multiple anchors on one node")
    if (outer?.tag !== undefined && own.tag !== undefined) fail("Multiple tags on one node")
    const anchor = outer?.anchor ?? own.anchor
    const tag = outer?.tag ?? own.tag
    const rest = own.rest
    if (anchor === undefined && tag === undefined) return this.parseValue(rest, parentIndent, allowIndentless)
    // YAML 1.2.2 §7.1: an alias has no properties.
    if (rest.startsWith("*")) fail(tag === undefined ? "An alias cannot have an anchor" : "An alias cannot have a tag")
    if (isSeparationOnly(rest)) {
      // YAML 1.2.2 §6.9: the properties may be followed by the node's scalar content on the
      // next line, where more properties of the same node may appear.
      const next = this.scalarContinuation(parentIndent)
      if (next !== undefined) {
        this.index++
        return this.parseNodeValue(next.text, parentIndent, allowIndentless, { anchor, tag })
      }
    }
    let value: unknown
    if (tag === undefined) {
      value = this.parseValue(rest, parentIndent, allowIndentless)
    } else {
      this.plainText = undefined
      const node = this.parseValue(rest, parentIndent, allowIndentless)
      value = resolveTag(tag, node, this.plainText, fail)
    }
    // Recorded once the whole node, with its tag, is resolved.
    if (anchor !== undefined) this.anchors.set(anchor, value)
    return value
  }

  // The next line, when it continues a node as a scalar rather than starting a collection.
  private scalarContinuation(parentIndent: number): Line | undefined {
    this.skipIgnored()
    const next = this.lineAt(this.index)
    if (next === undefined || next.indent <= parentIndent) return undefined
    if (isExplicitKey(next.text) || isSequenceEntry(next.text) || next.separator !== -1) return undefined
    return next
  }

  private parseValue(value: string, parentIndent: number, allowIndentless: boolean): unknown {
    const text = trimWhiteEnd(value)
    if (text.length === 0) {
      this.skipIgnored()
      const next = this.lineAt(this.index)
      if (next === undefined) return null
      if (next.indent > parentIndent) return this.parseNode(next.indent, parentIndent, allowIndentless)
      if (allowIndentless && next.indent === parentIndent && isSequenceEntry(next.text)) {
        return this.parseSequence(parentIndent)
      }
      return null
    }
    if (text.startsWith("!")) throw new SyntaxError("Multiple tags on one node")
    if (isExplicitKey(text)) throw new SyntaxError(explicitKeyError)
    // YAML 1.2.2 §8.2.1: a block sequence never starts after a key or an anchor on the same line.
    if (isSequenceEntry(text)) {
      throw new SyntaxError("A block sequence cannot start on the same line as a mapping key or anchor")
    }
    const first = text.charCodeAt(0)
    if ((first === 124 || first === 62) && /^[|>](?:[1-9]?[+-]?|[+-]?[1-9]?)$/.test(text)) {
      return this.parseBlockScalar(text, parentIndent)
    }
    // Keep escaped trailing whitespace in quoted values.
    if (value.startsWith("\"") || value.startsWith("'")) return this.parseQuotedValue(value, parentIndent)
    if (text.startsWith("*")) {
      const name = trimWhite(text.slice(1))
      if (!this.anchors.has(name)) throw new SyntaxError(`Unknown YAML alias '*${name}'`)
      return this.anchors.get(name)
    }
    // The untrimmed value keeps an escaped trailing space before a quoted line break.
    if (text.startsWith("[") || text.startsWith("{")) return this.parseFlowValue(value, parentIndent)
    return this.parsePlainValue(text, parentIndent)
  }

  private parseFlowValue(text: string, parentIndent: number): unknown {
    return new FlowParser(text, this.anchors, this.merges, (depth, quoted) => {
      const next = this.lineAt(this.index)
      if (next === undefined) return undefined
      if (quoted) {
        // Inside a quote, `#` and brackets are content: every non-blank line is indented past the parent.
        if (!isSeparationOnly(next.raw) && next.indent <= parentIndent) return undefined
      } else {
        // Continuation lines are more indented than the parent; a closing bracket may sit at its indentation.
        const content = !isSeparationOnly(next.text)
        if (content && next.indent < parentIndent) return undefined
        if (content && next.indent === parentIndent && !/^[\]}]/.test(next.text)) return undefined
      }
      this.index++
      const text = next.raw.slice(next.indent)
      // Strip comments again knowing the open collections, so quoted `#` after a comma is kept.
      return quoted ? text : stripComment(text, depth)
    }, this.depth).parse()
  }

  private parsePlainValue(value: string, parentIndent: number): unknown {
    const first = this.lines[this.index - 1]
    if (/:(?:[ \t]|$)/.test(value)) this.fail(first, "Invalid colon in plain scalar")
    if (value.startsWith("%")) this.fail(first, directiveIndicatorError)
    let output = value
    let terminated = first.comment
    while (!terminated) {
      const blankLines = this.skipBlankLines()
      const next = this.lineAt(this.index)
      if (next === undefined || next.indent <= parentIndent) break
      this.rejectTabIndent(next)
      // Quotes in plain continuations are literal.
      const content = next.raw.slice(next.indent)
      const comment = content.search(/(?:^|[ \t])#/)
      const text = trimWhiteEnd(comment === -1 ? content : content.slice(0, comment))
      if (text.length === 0) break
      if (/:(?:[ \t]|$)/.test(text)) this.fail(next, "Invalid colon in plain scalar")
      this.rejectTabIndentedBlankLines(blankLines, parentIndent)
      output += foldLineBreak(blankLines) + text
      this.index++
      terminated = comment !== -1
    }
    this.plainText = output
    return parseScalar(output)
  }

  private parseQuotedValue(value: string, parentIndent: number): unknown {
    const quote = value[0]
    let output = quote
    let line = value.slice(1)
    while (true) {
      const end = closingQuote(line, quote, 0)
      if (end !== -1) {
        const rest = line.slice(end + 1)
        if (!isSeparationOnly(rest) && !/^[ \t]+#/.test(rest)) {
          throw new SyntaxError("Unexpected content after quoted YAML scalar")
        }
        return parseScalar(output + line.slice(0, end + 1))
      }
      if (quote === "\"" && endsWithEscape(line)) {
        output += line.slice(0, -1)
      } else {
        const blankLines = this.skipBlankLines()
        this.rejectTabIndentedBlankLines(blankLines, parentIndent)
        output += trimFoldedEnd(line, quote) + foldLineBreak(blankLines)
      }
      const next = this.lineAt(this.index++)
      if (next === undefined) throw new SyntaxError("Unterminated quoted YAML scalar")
      this.rejectTabIndent(next)
      if (!isSeparationOnly(next.raw) && next.indent <= parentIndent) {
        this.fail(next, "Invalid quoted scalar indentation")
      }
      line = trimWhiteStart(next.raw)
    }
  }

  private parseBlockScalar(indicator: string, parentIndent: number): string {
    const style = indicator[0]
    const chomp = indicator.includes("-") ? "strip" : indicator.includes("+") ? "keep" : "clip"
    const explicitIndent = Number.parseInt(indicator.replace(/[^1-9]/g, ""), 10)
    const start = this.index
    let end = start
    let contentIndent = Number.isNaN(explicitIndent) ? undefined : parentIndent + explicitIndent
    let hasContent = false

    while (end < this.documentEnd) {
      const line = this.lines[end]
      // Only spaces make a line empty; a tab after the indentation is content.
      if (/[^ ]/.test(line.raw)) {
        if (contentIndent === undefined && line.indent > parentIndent) {
          // The first non-empty line sets the indentation, which no leading empty line may exceed.
          const deeper = this.lines.slice(start, end).find((empty) => empty.indent > line.indent)
          if (deeper !== undefined) {
            this.fail(deeper, "Leading empty lines cannot be more indented than the block scalar content")
          }
          contentIndent = line.indent
        }
        if (contentIndent !== undefined && line.indent >= contentIndent) {
          hasContent = true
        } else {
          this.rejectTabIndent(line)
          // A less indented line or comment ends the scalar.
          if (line.indent <= parentIndent || line.text.length === 0) break
          this.fail(line, `Expected block scalar indentation of ${contentIndent} spaces`)
        }
      }
      end++
    }

    // Whitespace past the indentation is content only once the scalar has a content line.
    const content = this.lines.slice(start, end).map((line) => hasContent ? line.raw.slice(contentIndent) : "")
    this.index = end

    let contentEnd = content.length
    while (contentEnd > 0 && content[contentEnd - 1].length === 0) contentEnd--
    const trailingBreaks = Math.max(0, content.length - contentEnd - (end === this.lines.length ? 1 : 0)) +
      (contentEnd > 0 && start + contentEnd < this.lines.length ? 1 : 0)
    content.length = contentEnd

    let output = ""
    if (style === "|") {
      output = content.join("\n")
    } else {
      let blankLines = 0
      let previousMoreIndented: boolean | undefined
      for (const line of content) {
        if (line.length === 0) {
          blankLines++
        } else {
          const moreIndented = line.startsWith(" ") || line.startsWith("\t")
          const hardBreak = moreIndented || previousMoreIndented === true
          if (previousMoreIndented === undefined) output += "\n".repeat(blankLines)
          else if (blankLines === 0) output += hardBreak ? "\n" : " "
          else output += "\n".repeat(blankLines + (hardBreak ? 1 : 0))
          output += line
          blankLines = 0
          previousMoreIndented = moreIndented
        }
      }
    }
    if (chomp === "keep") return output + "\n".repeat(trailingBreaks)
    return chomp === "clip" && contentEnd > 0 && trailingBreaks > 0 ? `${output}\n` : output
  }

  private rejectTabIndent(line: Line): void {
    if (line.tabIndent) this.fail(line, "Tabs cannot be used for YAML indentation")
  }

  private rejectTabIndentedBlankLines(count: number, parentIndent: number): void {
    for (let index = this.index - count; index < this.index; index++) {
      const line = this.lines[index]
      if (line.indent <= parentIndent) this.rejectTabIndent(line)
    }
  }

  private isBlank(line: Line | undefined): boolean {
    return line !== undefined && isSeparationOnly(line.raw)
  }

  private skipBlankLines(): number {
    const start = this.index
    while (this.isBlank(this.lineAt(this.index))) this.index++
    return this.index - start
  }

  private skipIgnored(): void {
    while (this.index < this.documentEnd) {
      const line = this.lines[this.index]
      if (isSeparationOnly(line.text)) {
        this.index++
      } else {
        this.rejectTabIndent(line)
        return
      }
    }
  }

  private fail(line: Line, message: string): never {
    throw new SyntaxError(`${message} at line ${line.number}`)
  }
}

const decode = <A>(input: string, f: (parser: YamlParser) => A): Result.Result<A, EncodingError> => {
  try {
    const raws = (input.includes("\r") ? input.replace(/\r\n?/g, "\n") : input).split("\n")
    const lines = new Array<Line>(raws.length)
    for (let index = 0; index < raws.length; index++) lines[index] = makeLine(raws[index], index + 1)
    return Result.succeed(f(new YamlParser(lines)))
  } catch (e) {
    return Result.fail(
      new EncodingError({
        module: "Yaml",
        kind: "Decode",
        input,
        message: e instanceof Error ? e.message : "Invalid input"
      })
    )
  }
}

/**
 * Parses a single YAML document into JavaScript values.
 *
 * **Details**
 *
 * Returns `Result.succeed` with the parsed value, or `Result.fail` with an
 * `EncodingError` when the input is not valid YAML or uses an unsupported
 * feature. Empty input, or input holding only comments, parses to `null`.
 * Input holding more than one document fails; use {@link parseAll} for
 * document streams.
 *
 * Plain scalars resolve with the YAML 1.2 core schema, so booleans, nulls, and
 * numbers are decoded while date-like values remain strings. Only the core
 * spellings count: `true`, `True` and `TRUE` are booleans but `tRuE` is a
 * string, `012` is the number `12`, and `1_000` and `0X1F` are strings.
 * Numbers use JavaScript number semantics, so integers beyond
 * `Number.MAX_SAFE_INTEGER` lose precision; quote such values to keep them
 * exact as strings.
 *
 * The core schema's shorthand tags resolve against the scalar as written, so
 * `!!str 0x10` is the string `"0x10"` and `!!int "42"` is the number `42`.
 * Other tags, including verbatim and non-specific tags, fail, as do explicit
 * keys (`? key`) and collections nested more than 1000 levels deep. An alias
 * may be used as a mapping key when it refers to a scalar, whose string form
 * becomes the key.
 *
 * YAML 1.1 merge keys are always enabled. An unquoted `<<` key merges a
 * mapping, or a sequence of mappings, into the enclosing mapping. Explicit
 * keys take precedence over merged keys, earlier merge sources over later
 * ones, and a mapping may contain only one merge key. Quote the key (`"<<"`)
 * to keep it as an ordinary key. Merges in one document may copy at most
 * 100,000 keys, since a chain of merges grows the result quadratically.
 *
 * **Example** (Parsing a YAML document)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Yaml } from "effect/encoding"
 *
 * Yaml.parse("port: 8080") // => Result.succeed({ port: 8080 })
 * Result.isFailure(Yaml.parse("port: [8080")) // => true
 * Result.isFailure(Yaml.parse("a: 1\n---\nb: 2")) // => true
 * Yaml.parse("port: !!str 8080") // => Result.succeed({ port: "8080" })
 * Result.isFailure(Yaml.parse("port: !custom 8080")) // => true
 * ```
 *
 * @see {@link parseAll} for parsing a stream of documents
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const parse = (input: string): Result.Result<unknown, EncodingError> =>
  decode(input, (parser) => parser.parseStream(1)[0] ?? null)

/**
 * Parses a YAML stream into one JavaScript value per document.
 *
 * **Details**
 *
 * Returns `Result.succeed` with the parsed documents, or `Result.fail` with an
 * `EncodingError` when any document is invalid. Documents are separated by
 * `---` and `...` markers at the start of a line. An empty document parses to
 * `null`, and input holding no documents parses to an empty array. Anchors
 * are scoped to the document that defines them.
 *
 * A document may be preceded by a `%YAML 1.2` directive, which must be
 * followed by `---`. Other YAML versions and other directives, including
 * `%TAG`, fail.
 *
 * Each document is parsed like {@link parse}.
 *
 * **Example** (Parsing a document stream)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Yaml } from "effect/encoding"
 *
 * Yaml.parseAll("a: 1\n---\nb: 2\n") // => Result.succeed([{ a: 1 }, { b: 2 }])
 * Yaml.parseAll("") // => Result.succeed([])
 * Result.isFailure(Yaml.parseAll("%YAML 1.1\n---\na: yes\n")) // => true
 * ```
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const parseAll = (input: string): Result.Result<Array<unknown>, EncodingError> =>
  decode(input, (parser) => parser.parseStream())

// YAML 1.2.2 §5.1: characters outside the printable set must be escaped on
// output. Line and paragraph separators are included to stay on the safe side
// of YAML 1.1 line break handling, and the byte order mark because §5.4
// excludes it from content characters.
const nonPrintable =
  // eslint-disable-next-line no-control-regex
  /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u2028\u2029\ufeff\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/

// Spellings that the core schema reads as strings but YAML 1.1 and lenient parsers read as other
// types: any letter case of `null`, `true`, `false`, `.inf` and `.nan`, and numbers with `_`
// separators, an uppercase or signed `0X` or `0O` prefix, or a leading `+`. The printer quotes them.
const lenientNonString = /^(?:null|~|true|false|[-+]?\.inf|\.nan)$/i

const lenientNumber = /^[-+]?(?:0x[0-9a-f]+|0o[0-7]+|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:e[-+]?[0-9]+)?)$/i

const isLenientNonString = (text: string): boolean =>
  lenientNonString.test(text) || lenientNumber.test(text.replace(/_/g, ""))

// A code unit JavaScript's `\s` matches.
const isSpaceCode = (code: number): boolean =>
  code === 0x20 || (code >= 0x09 && code <= 0x0d) || code === 0xa0 || code === 0x1680 ||
  (code >= 0x2000 && code <= 0x200a) || code === 0x2028 || code === 0x2029 || code === 0x202f ||
  code === 0x205f || code === 0x3000 || code === 0xfeff

// A code unit the printer never leaves unquoted: line breaks, tabs, and the
// `nonPrintable` set, with surrogates handled by the caller.
const isUnquotableCode = (code: number): boolean =>
  code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029 || code === 0xfeff ||
  code === 0xfffe || code === 0xffff

// Only strings starting with one of these can spell a core or lenient non-string.
const nonStringStart = /^[-+._0-9nNtTfF~]/

const isPlainSafe = (text: string): boolean => {
  if (text.length === 0 || text.trim() !== text) return false
  if (/^[,[\]{}#&*!|>'"%@`]/.test(text) || /^[-?:](?:\s|$)/.test(text)) return false
  // Not a document marker under §9.1.3, but js-yaml reads `---x` at the start of a line as one.
  if (/^(?:---|\.\.\.)/.test(text)) return false
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    if (isUnquotableCode(code)) return false
    if (code >= 0xd800 && code <= 0xdfff) {
      // A surrogate pair is printable; a lone surrogate is not.
      const next = text.charCodeAt(index + 1)
      if (code > 0xdbff || !(next >= 0xdc00 && next <= 0xdfff)) return false
      index++
    } else if (code === 0x3a) {
      if (index + 1 === text.length || isSpaceCode(text.charCodeAt(index + 1))) return false
    } else if (code === 0x23 && index > 0 && isSpaceCode(text.charCodeAt(index - 1))) {
      return false
    }
  }
  return !nonStringStart.test(text) || (!isCoreNonString(text) && !isLenientNonString(text))
}

const doubleQuoteEscapes: Record<string, string> = {
  "\0": "\\0",
  "\x07": "\\a",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\v": "\\v",
  "\f": "\\f",
  "\r": "\\r",
  "\x1b": "\\e",
  "\"": "\\\"",
  "\\": "\\\\",
  "\u0085": "\\N",
  "\u2028": "\\L",
  "\u2029": "\\P"
}

const escapeCode = (code: number): string =>
  code < 0x100 ? `\\x${code.toString(16).padStart(2, "0")}` : `\\u${code.toString(16).padStart(4, "0")}`

const doubleQuote = (text: string): string => {
  let output = ""
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    let escape: string | undefined
    if (code === 0x22 || code === 0x5c || code < 0x20 || (code >= 0x7f && code <= 0x9f) || code >= 0x2028) {
      if (code >= 0xd800 && code <= 0xdfff) {
        // A surrogate pair is copied as is; a lone surrogate is escaped.
        const next = text.charCodeAt(index + 1)
        if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
          index++
          continue
        }
        escape = escapeCode(code)
      } else if (code === 0x2028 || code === 0x2029 || code === 0xfeff || code === 0xfffe || code === 0xffff) {
        escape = code === 0x2028 ? "\\L" : code === 0x2029 ? "\\P" : escapeCode(code)
      } else if (code < 0x2028) {
        const character = text[index]
        escape = hasOwn.call(doubleQuoteEscapes, character) ? doubleQuoteEscapes[character] : escapeCode(code)
      }
    }
    if (escape !== undefined) {
      output += text.slice(start, index) + escape
      start = index + 1
    }
  }
  return `"${output}${text.slice(start)}"`
}

class PrintError extends Error {}

const printSingleLine = (text: string): string => isPlainSafe(text) ? text : doubleQuote(text)

// YAML 1.2.2 §7.4.2 limits an implicit key to 1024 characters, including quotes.
const implicitKeyLimit = 1024

// The unquoted merge key would be processed by `parse`, so it is always quoted.
const printKey = (key: string, path: () => string): string => {
  const printed = key === "<<" ? doubleQuote(key) : printSingleLine(key)
  if (printed.length > implicitKeyLimit) {
    throw new PrintError(
      `Cannot print a mapping key of ${printed.length} characters (implicit keys are limited to ${implicitKeyLimit}) at ${path()}`
    )
  }
  return printed
}

// Indentation strings, built once per width.
const pads: Array<string> = []

const pad = (width: number): string => pads[width] ?? (pads[width] = " ".repeat(width))

const printNumber = (value: number): string => {
  if (Number.isNaN(value)) return ".nan"
  if (value === Number.POSITIVE_INFINITY) return ".inf"
  if (value === Number.NEGATIVE_INFINITY) return "-.inf"
  if (Object.is(value, -0)) return "-0.0"
  return String(value)
}

// A multiline string prints as a literal block scalar when every line can be
// written as-is: no control characters besides tabs and line breaks, and no
// leading or trailing whitespace on any line.
const literalBlock = (text: string): { readonly header: string; readonly lines: Array<string> } | undefined => {
  // A backward scan, since a trailing `\n+` pattern retries from every newline of an interior run.
  let end = text.length
  while (end > 0 && text[end - 1] === "\n") end--
  const body = text.slice(0, end)
  if (body.length === 0 || /\r/.test(body) || nonPrintable.test(body)) return undefined
  const lines = body.split("\n")
  if (lines.some((line) => line.trim() !== line)) return undefined
  // Kept line breaks beyond the first become empty lines inside the scalar.
  const trailing = text.length - body.length
  for (let index = 1; index < trailing; index++) lines.push("")
  return { header: trailing === 0 ? "|-" : trailing === 1 ? "|" : "|+", lines }
}

const isIdentifier = (key: string): boolean => /^[A-Za-z_$][\w$]*$/.test(key)

class Printer {
  readonly lines: Array<string> = []
  private readonly ancestors = new Set<object>()
  private readonly step: number
  // The path of the node being printed, formatted only for error messages.
  private readonly root: string
  private readonly trail: Array<string | number> = []

  constructor(step: number, root: string) {
    this.step = step
    this.root = root
  }

  private path(): string {
    let output = this.root
    for (const segment of this.trail) {
      output += typeof segment === "number"
        ? `[${segment}]`
        : isIdentifier(segment)
        ? `.${segment}`
        : `[${JSON.stringify(segment)}]`
    }
    return output
  }

  private fail(message: string): never {
    throw new PrintError(`${message} at ${this.path()}`)
  }

  // Prints `value`, with `toJSON` already applied, after `prefix` (`""` at the
  // root, `-` for a sequence item, or `key:` for a mapping entry) placed at
  // `indentation`.
  node(value: unknown, indentation: number, prefix: string): void {
    switch (typeof value) {
      case "string":
        return this.scalar(value, indentation, prefix)
      case "number":
        return this.line(indentation, prefix, printNumber(value))
      case "boolean":
        return this.line(indentation, prefix, value ? "true" : "false")
      case "undefined":
        return this.fail("Cannot print undefined")
      case "object":
        break
      default:
        return this.fail(`Cannot print a ${typeof value}`)
    }
    if (value === null) return this.line(indentation, prefix, "null")
    if (this.ancestors.has(value)) this.fail("Circular reference")
    if (Array.isArray(value)) {
      if (value.length === 0) return this.line(indentation, prefix, "[]")
      this.ancestors.add(value)
      const column = prefix === "" ? indentation : indentation + this.step
      if (prefix !== "") this.line(indentation, prefix, "")
      // Index iteration keeps the positions of sparse arrays.
      for (let index = 0; index < value.length; index++) {
        this.trail.push(index)
        this.node(applyToJson(value[index], String(index)) ?? null, column, "-")
        this.trail.pop()
      }
      this.ancestors.delete(value)
      return
    }
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      // Only a string name is safe to interpolate into the diagnostic.
      const name = prototype.constructor?.name
      const label = typeof name === "string" && name.length > 0 ? name : "object"
      this.fail(`Cannot print a ${label} instance without toJSON`)
    }
    const keys = Object.keys(value)
    const entries: Array<unknown> = []
    let count = 0
    for (let index = 0; index < keys.length; index++) {
      const entry = applyToJson((value as YamlRecord)[keys[index]], keys[index])
      entries.push(entry)
      if (entry !== undefined) count++
    }
    if (count === 0) return this.line(indentation, prefix, "{}")
    this.ancestors.add(value)
    // A mapping starts on the line of its sequence dash and continues two
    // columns in, aligned with its first key.
    const item = prefix === "-"
    const column = prefix === "" ? indentation : item ? indentation + 2 : indentation + this.step
    if (!item && prefix !== "") this.line(indentation, prefix, "")
    const start = this.lines.length
    const path = () => this.path()
    for (let index = 0; index < keys.length; index++) {
      const entry = entries[index]
      if (entry === undefined) continue
      const key = keys[index]
      const printed = printKey(key, path)
      this.trail.push(key)
      this.node(entry, column, `${printed}:`)
      this.trail.pop()
    }
    if (item) this.lines[start] = `${pad(indentation)}- ${this.lines[start].slice(column)}`
    this.ancestors.delete(value)
  }

  private scalar(text: string, indentation: number, prefix: string): void {
    const block = text.includes("\n") ? literalBlock(text) : undefined
    if (block === undefined) return this.line(indentation, prefix, printSingleLine(text))
    this.line(indentation, prefix, block.header)
    const indent = pad(indentation + this.step)
    for (const line of block.lines) this.lines.push(line.length === 0 ? "" : indent + line)
  }

  private line(indentation: number, prefix: string, text: string): void {
    const content = prefix === "" ? text : text === "" ? prefix : `${prefix} ${text}`
    this.lines.push(indentation === 0 ? content : pad(indentation) + content)
  }
}

// Mirrors `JSON.stringify`: objects and bigints carrying a `toJSON` method are
// replaced by its result before printing.
const applyToJson = (value: unknown, key: string): unknown => {
  if (
    (typeof value === "object" && value !== null || typeof value === "bigint") &&
    typeof (value as { toJSON?: unknown }).toJSON === "function"
  ) {
    return (value as { toJSON: (key: string) => unknown }).toJSON(key)
  }
  return value
}

const indentStep = (options: { readonly indent?: number | undefined } | undefined): number => {
  const indent = options?.indent ?? 2
  if (!Number.isInteger(indent) || indent < 1) throw new PrintError(`Indent must be a positive integer, got ${indent}`)
  return indent
}

const printDocument = (value: unknown, path: string, step: number): string => {
  const printer = new Printer(step, path)
  printer.node(applyToJson(value, ""), 0, "")
  return `${printer.lines.join("\n")}\n`
}

const printResult = (input: unknown, print: () => string): Result.Result<string, EncodingError> => {
  try {
    return Result.succeed(print())
  } catch (e) {
    return Result.fail(
      new EncodingError({
        module: "Yaml",
        kind: "Encode",
        input,
        message: e instanceof Error ? e.message : "Invalid input"
      })
    )
  }
}

/**
 * Prints a JavaScript value as a YAML document.
 *
 * **Details**
 *
 * `null`, booleans, numbers, strings, arrays, and plain objects are supported.
 * Collections print in block style with keys in insertion order, empty ones
 * as `{}` and `[]`. Strings print plain when `parse` would read them back
 * unchanged and double-quoted otherwise, so `"true"`, `"1"`, `"a: b"`, and
 * the merge key `"<<"` stay strings. Strings that other YAML parsers may read
 * differently are quoted too, such as `"tRuE"`, `"1_000"` and `"---x"`.
 * Non-printable characters are escaped.
 * Multiline strings print as literal block scalars when their lines have no
 * surrounding whitespace. Non-finite numbers print as `.inf`, `-.inf`, and
 * `.nan`.
 *
 * As with `JSON.stringify`, a `toJSON` method is applied first (so a `Date`
 * prints as an ISO string), `undefined` properties are omitted, `undefined`
 * array items print as `null`, and symbol keys are ignored. Any other value,
 * including bigints, functions, symbols, class instances without `toJSON`,
 * and circular references, fails with an `EncodingError` naming the path of
 * the offending value. Keys print as implicit keys, which YAML limits to 1024
 * characters including quotes; a longer key fails with the path of its
 * mapping. Shared references are printed in full each time; no anchors are
 * emitted. The output always ends with a line break.
 *
 * **Example** (Printing a configuration object)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Yaml } from "effect/encoding"
 *
 * const yaml = Yaml.stringify({ name: "effect", ports: [3000, 3001], version: "1" })
 *
 * yaml // => Result.succeed("name: effect\nports:\n  - 3000\n  - 3001\nversion: \"1\"\n")
 * Result.isFailure(Yaml.stringify({ id: 1n })) // => true
 * ```
 *
 * @see {@link stringifyAll} for printing a stream of documents
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const stringify = (
  value: unknown,
  options?: { readonly indent?: number | undefined }
): Result.Result<string, EncodingError> => printResult(value, () => printDocument(value, "value", indentStep(options)))

/**
 * Prints JavaScript values as a stream of YAML documents separated by `---`.
 *
 * **Details**
 *
 * Each value is printed with the rules of {@link stringify}, and an empty
 * iterable prints as an empty string. A value that cannot be printed fails
 * with an `EncodingError` whose path starts with the document index, such as
 * `value[1].id`.
 *
 * **Example** (Printing two documents)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Yaml } from "effect/encoding"
 *
 * Yaml.stringifyAll([{ a: 1 }, ["b"]]) // => Result.succeed("a: 1\n---\n- b\n")
 * ```
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const stringifyAll = (
  values: Iterable<unknown>,
  options?: { readonly indent?: number | undefined }
): Result.Result<string, EncodingError> =>
  printResult(values, () => {
    const step = indentStep(options)
    // `for...of` rejects non-iterables, which `Array.from` would accept as array-likes or empty input.
    const documents: Array<string> = []
    for (const value of values) {
      documents.push(printDocument(value, `value[${documents.length}]`, step))
    }
    return documents.join("---\n")
  })
