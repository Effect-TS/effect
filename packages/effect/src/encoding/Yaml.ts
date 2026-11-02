/**
 * Parses YAML configuration files.
 *
 * Supports YAML 1.2 block and flow collections, indentless sequence values,
 * multiline plain and quoted scalars, block scalars, anchors, aliases, YAML 1.1
 * merge keys (`<<`), document streams, and the `%YAML 1.2` directive. Parsing
 * returns a `Result` that fails with an `EncodingError`.
 *
 * Unlike YAML 1.2, the closing bracket of a multiline flow collection may sit
 * at its parent's indentation.
 *
 * Unsupported input fails rather than being read as text: tags (`!!str`,
 * `!local`), explicit keys (`? key`), `%TAG` and other directives, YAML
 * versions other than 1.2, recursive aliases, compact nested block sequences
 * (`- - value` on one line), multiline quoted scalars in flow collections, and
 * collections nested more than 1000 levels deep.
 *
 * Mapping keys are JavaScript strings. An alias may be a key when it refers to
 * a scalar. Only spaces and tabs are YAML white space, so characters such as a
 * no-break space (U+00A0) are kept as content. Numbers use JavaScript number
 * semantics, so integers beyond `Number.MAX_SAFE_INTEGER` lose precision.
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
}

const hasOwn = Object.prototype.hasOwnProperty

const setProperty = (record: YamlRecord, key: string, value: unknown): void => {
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  })
}

const isMapping = (value: unknown): value is YamlRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

// Explicit keys take precedence over merged keys, and earlier merge sources over later ones.
class MappingBuilder {
  readonly output: YamlRecord = {}
  // Keys added by the merge key, which an explicit key may still override.
  private merged: Set<string> | undefined

  set(key: string, value: unknown, fail: (message: string) => never): void {
    if (hasOwn.call(this.output, key) && !this.merged?.delete(key)) fail(`Duplicate key '${key}'`)
    setProperty(this.output, key, value)
  }

  merge(value: unknown, fail: (message: string) => never): void {
    if (this.merged !== undefined) fail("Duplicate key '<<'")
    this.merged = new Set()
    for (const source of Array.isArray(value) ? value : [value]) {
      if (!isMapping(source)) fail("Merge key values must be mappings")
      for (const key of Object.keys(source)) {
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

// Line breaks also separate tokens inside flow collections.
const isSeparation = (character: string | undefined): boolean => isWhite(character) || character === "\n"

// Index scans rather than `/[ \t]+$/`, which backtracks quadratically on long runs.
const whiteEnd = (text: string, end = text.length): number => {
  while (end > 0 && isWhite(text[end - 1])) end--
  return end
}

const trimWhiteStart = (text: string): string => {
  let start = 0
  while (start < text.length && isWhite(text[start])) start++
  return text.slice(start)
}

const trimWhiteEnd = (text: string): string => text.slice(0, whiteEnd(text))

const trimWhite = (text: string): string => {
  let start = 0
  let end = text.length
  while (start < end && isSeparation(text[start])) start++
  while (end > start && isSeparation(text[end - 1])) end--
  return text.slice(start, end)
}

const closingQuote = (input: string, quote: string, start: number): number => {
  for (let index = start; index < input.length; index++) {
    const character = input[index]
    if (quote === "\"" && character === "\\") {
      index++
    } else if (character === quote) {
      if (quote === "'" && input[index + 1] === quote) index++
      else return index
    }
  }
  return -1
}

// `depth` is the number of flow collections already open before `input`.
const findIndicator = (input: string, indicator: ":" | "#", depth = 0): number => {
  let tokenStart = true
  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (tokenStart && (character === "'" || character === "\"")) {
      index = closingQuote(input, character, index + 1)
      if (index === -1) return -1
      tokenStart = false
    } else if (tokenStart && (character === "&" || character === "*")) {
      // Anchor and alias names may contain `:`.
      while (index + 1 < input.length && !/[ \t,[\]{}]/.test(input[index + 1])) index++
    } else if (character === "#" && (index === 0 || isWhite(input[index - 1]))) {
      return indicator === "#" ? index : -1
    } else if (tokenStart && (character === "[" || character === "{")) {
      depth++
    } else if (depth > 0 && (character === "]" || character === "}")) {
      depth--
      tokenStart = false
    } else if (depth > 0 && character === ",") {
      tokenStart = true
    } else if (character === ":" && (depth > 0 || input[index + 1] === undefined || isWhite(input[index + 1]))) {
      if (depth === 0 && indicator === ":") return index
      tokenStart = true
    } else if (tokenStart && character === "-" && isWhite(input[index + 1])) {
      continue
    } else if (!isWhite(character)) {
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

const isSequenceEntry = (text: string): boolean => text === "-" || text.startsWith("- ")

// YAML 1.2.2 §9.1: document markers start at column zero and are followed by whitespace.
const isDocumentMarker = (line: Line): boolean => line.indent === 0 && /^(?:---|\.\.\.)(?:[ \t]|$)/.test(line.raw)

const isDocumentStart = (line: Line): boolean => isDocumentMarker(line) && line.raw.startsWith("---")

// YAML 1.2.2 §5.3: `%` is the directive indicator and cannot start a plain scalar.
const directiveIndicatorError = "Plain scalars cannot start with '%'"

// YAML 1.2.2 §6.9.1: `!` starts a tag. Tags are rejected rather than read as text.
const tagError = "YAML tags are not supported"

const isExplicitKey = (text: string): boolean => text === "?" || /^\?[ \t]/.test(text)

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
const scalarKey = (anchors: Map<string, unknown>, anchor: string | undefined, text: string): MappingKey => {
  if (anchor !== undefined) anchors.set(anchor, parseScalar(text))
  return { key: parseKey(text), merge: text === "<<" }
}

const foldLineBreak = (blankLines: number): string => blankLines === 0 ? " " : "\n".repeat(blankLines)

// Folds the line breaks of a multiline plain flow scalar. Scans line by line, since
// a white-space regex would backtrack quadratically on long runs without a break.
const foldFlowLines = (input: string): string => {
  const lines = input.split("\n")
  if (lines.length === 1) return input
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
  if (/^(?:null|~)$/i.test(value)) return null
  if (/^true$/i.test(value)) return true
  if (/^false$/i.test(value)) return false
  if (/^[+-]?\.inf$/i.test(value)) return value[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  if (/^\.nan$/i.test(value)) return Number.NaN

  const normalized = value.replace(/_/g, "")
  if (/^[+-]?0x[0-9a-f]+$/i.test(normalized)) {
    const sign = normalized[0] === "-" ? -1 : 1
    return sign * Number.parseInt(normalized.replace(/^[+-]?0x/i, ""), 16)
  }
  if (/^[+-]?0o[0-7]+$/i.test(normalized)) {
    const sign = normalized[0] === "-" ? -1 : 1
    return sign * Number.parseInt(normalized.replace(/^[+-]?0o/i, ""), 8)
  }
  if (
    /^[+-]?(?:0|[1-9]\d*)$/.test(normalized) ||
    /^[+-]?(?:(?:0|[1-9]\d*)?\.\d+|(?:0|[1-9]\d*)\.?\d*[eE][+-]?\d+)$/.test(normalized)
  ) {
    return Number(normalized)
  }
  return value
}

const parseKey = (input: string): string => {
  const value = parseScalar(input)
  return value === null || value === undefined ? "" : String(value)
}

// Ends an anchor or alias name inside a flow collection.
const flowNameEnd = /[ \t\n,[\]{}]/

class FlowParser {
  private input: string
  private readonly anchors: Map<string, unknown>
  private readonly nextLine: (depth: number) => string | undefined
  // Block collections already open around this flow collection.
  private readonly blockDepth: number
  private index = 0
  private depth = 0

  constructor(
    input: string,
    anchors: Map<string, unknown>,
    nextLine: (depth: number) => string | undefined,
    blockDepth: number
  ) {
    this.input = input
    this.anchors = anchors
    this.nextLine = nextLine
    this.blockDepth = blockDepth
  }

  parse(): unknown {
    const value = this.parseValue()
    this.skipWhitespace()
    if (this.index !== this.input.length) {
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
      const name = this.readUntil(/[,\]} \t\n]/)
      if (!this.anchors.has(name)) this.fail(`Unknown alias '*${name}'`)
      return this.anchors.get(name)
    }
    if (character === "&") {
      this.index++
      const name = this.readUntil(flowNameEnd)
      if (name === "" || /[[{]/.test(this.peek())) this.fail("Invalid anchor")
      this.skipWhitespace()
      if (this.peek() === "&") this.fail("Multiple anchors on one node")
      const value = this.parseValue()
      this.anchors.set(name, value)
      return value
    }
    return parseScalar(this.readPlain(/[,\]}]/))
  }

  // Reads a plain scalar up to `stop`, rejecting directive, tag and explicit key indicators.
  private readPlain(stop: RegExp): string {
    const text = trimWhite(foldFlowLines(this.readUntil(stop)))
    if (text.startsWith("%")) this.fail(directiveIndicatorError)
    if (text.startsWith("!")) this.fail(tagError)
    if (isExplicitKey(text)) this.fail(explicitKeyError)
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
      output.push(this.parseValue())
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

  private parseMapping(): YamlRecord {
    this.expect("{")
    const mapping = new MappingBuilder()
    const fail = (message: string) => this.fail(message)
    this.skipWhitespace()
    if (this.peek() === "}") {
      this.index++
      return mapping.output
    }
    while (true) {
      this.skipWhitespace()
      const { key, merge } = this.parseKey()
      this.skipWhitespace()
      this.expect(":")
      if (merge) mapping.merge(this.parseValue(), fail)
      else mapping.set(key, this.parseValue(), fail)
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

  private parseKey(): MappingKey {
    const fail = (message: string) => this.fail(message)
    this.skipWhitespace()
    let anchor: string | undefined
    if (this.peek() === "&") {
      this.index++
      anchor = this.readUntil(flowNameEnd)
      if (anchor === "") this.fail("Invalid anchor")
      this.skipWhitespace()
    }
    const character = this.peek()
    if (character === "!") this.fail(tagError)
    if (character === "*") {
      if (anchor !== undefined) this.fail("An alias cannot have an anchor")
      this.index++
      return { key: aliasKey(this.anchors, this.readUntil(flowNameEnd), fail), merge: false }
    }
    // Converted like a block key, so `null` and `0x10` give the same keys in both styles.
    const text = character === "\"" || character === "'" ? this.readQuoted(character) : this.readPlain(/:/)
    return scalarKey(this.anchors, anchor, text)
  }

  private readQuoted(quote: string): string {
    const start = this.index
    const end = closingQuote(this.input, quote, start + 1)
    if (end === -1) this.fail("Unterminated quoted scalar")
    this.index = end + 1
    return this.input.slice(start, this.index)
  }

  private readUntil(stop: RegExp): string {
    const start = this.index
    while (!stop.test(this.peek()) && this.index < this.input.length) this.index++
    return this.input.slice(start, this.index)
  }

  private skipWhitespace(): void {
    while (/[ \t\n]/.test(this.peek())) this.index++
  }

  private expect(character: string): void {
    if (this.peek() !== character) this.fail(`Expected '${character}'`)
    this.index++
  }

  private peek(): string {
    // Inside a collection, the end of the line continues on the next line.
    if (this.index === this.input.length && this.depth > 0) {
      const line = this.nextLine(this.depth)
      if (line !== undefined) this.input += `\n${line}`
    }
    return this.input[this.index] ?? ""
  }

  private fail(message: string): never {
    throw new SyntaxError(`${message} at flow offset ${this.index}`)
  }
}

const makeLine = (raw: string, number: number): Line => {
  const indentation = /^( *)/.exec(raw)![1].length
  return {
    raw,
    text: stripComment(raw.slice(indentation)),
    indent: indentation,
    number,
    // Rejected where the line is read as structure; block scalar content may hold tabs.
    tabIndent: raw[indentation] === "\t"
  }
}

// Removes the comment from a marker or directive line, keeping characters before
// it that are not YAML separation so they can be rejected.
const boundaryContent = (raw: string): string => {
  const index = findIndicator(raw, "#")
  return trimWhiteEnd(index === -1 ? raw : raw.slice(0, index))
}

class YamlParser {
  private readonly lines: Array<Line>
  private index = 0
  // Lines from this index on belong to the next document, so document content
  // never reads past a document marker.
  private documentEnd: number
  // Anchors are scoped to one document.
  private anchors = new Map<string, unknown>()
  // Block collections currently open.
  private depth = 0

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

  private parseNode(indent: number, parentIndent = indent - 1): unknown {
    this.skipIgnored()
    const line = this.lineAt(this.index)
    if (line === undefined) return null
    if (line.indent !== indent) this.fail(line, `Expected indentation of ${indent} spaces`)
    if (isExplicitKey(line.text)) this.fail(line, explicitKeyError)
    if (isSequenceEntry(line.text)) return this.parseSequence(indent)
    if (mappingSeparator(line.text) !== -1) return this.parseMapping(indent)
    this.index++
    return this.parseNodeValue(line.text, parentIndent)
  }

  // `first` is the entry on a sequence item's line, parsed once the mapping counts toward the depth.
  private parseMapping(
    indent: number,
    first?: { readonly text: string; readonly separator: number; readonly line: Line }
  ): YamlRecord {
    this.enterCollection()
    const mapping = new MappingBuilder()
    if (first !== undefined) this.parseMappingEntry(mapping, first.text, first.separator, indent, first.line)
    while (true) {
      this.skipIgnored()
      const line = this.lineAt(this.index)
      if (line === undefined || line.indent < indent) break
      if (line.indent > indent) this.fail(line, `Unexpected indentation of ${line.indent} spaces`)
      if (isExplicitKey(line.text)) this.fail(line, explicitKeyError)
      const separator = mappingSeparator(line.text)
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
    let text = trimWhite(raw)
    const anchor = /^&([^ \t,[\]{}]+)(?:[ \t]+|$)/.exec(text)
    if (anchor !== null) text = text.slice(anchor[0].length)
    if (text.startsWith("%")) fail(directiveIndicatorError)
    if (text.startsWith("!")) fail(tagError)
    if (text.startsWith("*")) {
      if (anchor !== null) fail("An alias cannot have an anchor")
      // `:` may be part of an alias name, so the separator must follow white space.
      if (!isWhite(raw[raw.length - 1])) fail("An alias used as a mapping key must be followed by a space before ':'")
      return { key: aliasKey(this.anchors, text.slice(1), fail), merge: false }
    }
    return scalarKey(this.anchors, anchor?.[1], text)
  }

  private parseSequence(indent: number): Array<unknown> {
    this.enterCollection()
    const output: Array<unknown> = []
    while (true) {
      this.skipIgnored()
      const line = this.lineAt(this.index)
      if (line === undefined || line.indent < indent) break
      if (line.indent > indent) this.fail(line, `Unexpected indentation of ${line.indent} spaces`)
      if (!isSequenceEntry(line.text)) break
      this.index++
      const item = trimWhiteStart(line.text.slice(1))
      if (isSequenceEntry(item)) this.fail(line, "Compact nested block sequences are not supported")
      if (isExplicitKey(item)) this.fail(line, explicitKeyError)
      const separator = mappingSeparator(item)
      if (separator === -1) {
        output.push(this.parseNodeValue(item, indent))
      } else {
        // The mapping is indented to its first key, which may sit more than one space after the dash.
        const keyOffset = line.text.length - item.length
        if (line.text.slice(1, keyOffset).includes("\t")) this.fail(line, "Tabs cannot be used for YAML indentation")
        const mappingIndent = indent + keyOffset
        output.push(this.parseMapping(mappingIndent, { text: item, separator, line }))
      }
    }
    this.depth--
    return output
  }

  private enterCollection(): void {
    if (++this.depth > maxDepth) throw new SyntaxError(depthError)
  }

  private parseNodeValue(rawValue: string, parentIndent: number, allowIndentless = false): unknown {
    // `s`: U+2028 and U+2029 are content, not line breaks.
    const anchor = /^&([^ \t,[\]{}]+)(?:[ \t]+(.*))?$/s.exec(rawValue)
    if (anchor === null) return this.parseValue(rawValue, parentIndent, allowIndentless)
    const value = this.parseValue(anchor[2] ?? "", parentIndent, allowIndentless)
    this.anchors.set(anchor[1], value)
    return value
  }

  private parseValue(value: string, parentIndent: number, allowIndentless: boolean): unknown {
    const text = trimWhiteEnd(value)
    if (text.length === 0) {
      this.skipIgnored()
      const next = this.lineAt(this.index)
      if (next === undefined) return null
      if (next.indent > parentIndent) return this.parseNode(next.indent, parentIndent)
      if (allowIndentless && next.indent === parentIndent && isSequenceEntry(next.text)) {
        return this.parseSequence(parentIndent)
      }
      return null
    }
    if (text.startsWith("!")) throw new SyntaxError(tagError)
    if (/^[|>](?:[1-9]?[+-]?|[+-]?[1-9]?)$/.test(text)) return this.parseBlockScalar(text, parentIndent)
    // Keep escaped trailing whitespace in quoted values.
    if (value.startsWith("\"") || value.startsWith("'")) return this.parseQuotedValue(value, parentIndent)
    if (text.startsWith("*")) {
      const name = trimWhite(text.slice(1))
      if (!this.anchors.has(name)) throw new SyntaxError(`Unknown YAML alias '*${name}'`)
      return this.anchors.get(name)
    }
    if (text.startsWith("[") || text.startsWith("{")) return this.parseFlowValue(text, parentIndent)
    return this.parsePlainValue(text, parentIndent)
  }

  private parseFlowValue(text: string, parentIndent: number): unknown {
    return new FlowParser(text, this.anchors, (depth) => {
      const next = this.lineAt(this.index)
      if (next === undefined) return undefined
      // Continuation lines are more indented than the parent; a closing bracket may sit at its indentation.
      const content = trimWhite(next.text).length > 0
      if (content && next.indent < parentIndent) return undefined
      if (content && next.indent === parentIndent && !/^[\]}]/.test(next.text)) return undefined
      this.index++
      // Strip comments again knowing the open collections, so quoted `#` after a comma is kept.
      return stripComment(next.raw.slice(next.indent), depth)
    }, this.depth).parse()
  }

  private parsePlainValue(value: string, parentIndent: number): unknown {
    const first = this.lines[this.index - 1]
    if (/:(?:[ \t]|$)/.test(value)) this.fail(first, "Invalid colon in plain scalar")
    if (value.startsWith("%")) this.fail(first, directiveIndicatorError)
    let output = value
    let terminated = findIndicator(first.raw, "#") !== -1
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
        if (trimWhite(rest).length > 0 && !/^[ \t]+#/.test(rest)) {
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
      if (trimWhite(next.raw).length > 0 && next.indent <= parentIndent) {
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
    return line !== undefined && trimWhite(line.raw).length === 0
  }

  private skipBlankLines(): number {
    const start = this.index
    while (this.isBlank(this.lineAt(this.index))) this.index++
    return this.index - start
  }

  private skipIgnored(): void {
    while (this.index < this.documentEnd) {
      const line = this.lines[this.index]
      if (trimWhite(line.text).length === 0) {
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
    const lines = input.replace(/\r\n?/g, "\n").split("\n").map((raw, index) => makeLine(raw, index + 1))
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
 * The core YAML 1.2 scalar schema is used, so booleans, nulls, and numbers are
 * decoded while date-like values remain strings. Numbers use JavaScript number
 * semantics, so integers beyond `Number.MAX_SAFE_INTEGER` lose precision; quote
 * such values to keep them exact as strings.
 *
 * Tags, explicit keys (`? key`), and collections nested more than 1000 levels
 * deep fail. An alias may be used as a mapping key when it refers to a scalar,
 * whose string form becomes the key.
 *
 * YAML 1.1 merge keys are always enabled. An unquoted `<<` key merges a
 * mapping, or a sequence of mappings, into the enclosing mapping. Explicit
 * keys take precedence over merged keys, earlier merge sources over later
 * ones, and a mapping may contain only one merge key. Quote the key (`"<<"`)
 * to keep it as an ordinary key.
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
 * Result.isFailure(Yaml.parse("port: !!str 8080")) // => true
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
