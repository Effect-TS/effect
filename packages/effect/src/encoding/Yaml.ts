/**
 * Parses YAML configuration files.
 *
 * Supports YAML 1.2 block and flow collections, indentless and compact
 * sequence values, multiline plain and quoted scalars, block scalars, anchors,
 * aliases, and tags. The core schema tags (`!!str`, `!!int`, `!!float`,
 * `!!bool`, `!!null`, `!!map`, `!!seq`) are resolved, including through
 * `%TAG` handles; other tags, including YAML 1.1 tags such as `!!binary` and
 * `!!timestamp`, are ignored, so their scalars stay strings.
 *
 * Unlike YAML 1.2, the closing bracket of a multiline flow collection may sit
 * at its parent's indentation.
 *
 * Unsupported: recursive aliases, which would yield cyclic values, and document
 * streams. Mapping keys are JavaScript strings, so keys must be scalars.
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

type YamlRecord = Record<string, unknown>

type Line = {
  readonly raw: string
  readonly text: string
  readonly indent: number
  readonly number: number
  readonly tabIndent: boolean
}

type Properties = {
  readonly anchor?: string | undefined
  readonly tag?: string | undefined
}

const noProperties: Properties = {}

const coreTag = "tag:yaml.org,2002:"

const hasOwn = Object.prototype.hasOwnProperty

const setProperty = (record: YamlRecord, key: string, value: unknown): void => {
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  })
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

const findIndicator = (input: string, indicator: ":" | "#"): number => {
  let depth = 0
  let tokenStart = true
  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (tokenStart && (character === "'" || character === "\"")) {
      index = closingQuote(input, character, index + 1)
      if (index === -1) return -1
      tokenStart = false
    } else if (tokenStart && (character === "&" || character === "*" || character === "!")) {
      while (index + 1 < input.length && !/[\s,[\]{}]/.test(input[index + 1])) index++
    } else if (character === "#" && (index === 0 || /\s/.test(input[index - 1]))) {
      return indicator === "#" ? index : -1
    } else if (tokenStart && (character === "[" || character === "{")) {
      depth++
    } else if (depth > 0 && (character === "]" || character === "}")) {
      depth--
      tokenStart = false
    } else if (depth > 0 && character === ",") {
      tokenStart = true
    } else if (character === ":" && (depth > 0 || input[index + 1] === undefined || /\s/.test(input[index + 1]))) {
      if (depth === 0 && indicator === ":") return index
      tokenStart = true
    } else if (tokenStart && character === "-" && /\s/.test(input[index + 1] ?? "")) {
      continue
    } else if (!/\s/.test(character)) {
      tokenStart = false
    }
  }
  return -1
}

const stripComment = (input: string): string => {
  const index = findIndicator(input, "#")
  return index === -1 ? input : input.slice(0, index).trimEnd()
}

const mappingSeparator = (input: string): number => findIndicator(input, ":")

const startsWithIndicator = (text: string, indicator: "-" | "?" | ":"): boolean =>
  text === indicator || (text[0] === indicator && (text[1] === " " || text[1] === "\t"))

const isSequenceEntry = (text: string): boolean => startsWithIndicator(text, "-")

// Indicators that cannot start a plain scalar, besides those that start other nodes.
const reservedPlainStart = /^[,[\]{}#|>%@`]/

const isDocumentMarker = (line: Line): boolean => line.indent === 0 && /^(?:---|\.\.\.)(?:\s|$)/.test(line.raw)

// Whether a flow indicator character is followed by a separator rather than scalar content.
const isSeparated = (next: string | undefined): boolean => next === undefined || /[\s,[\]{}]/.test(next)

const foldLineBreak = (blankLines: number): string => blankLines === 0 ? " " : "\n".repeat(blankLines)

// Folds the line breaks of a multiline plain flow scalar.
const foldFlowLines = (input: string): string =>
  input.replace(
    /[ \t]*\n((?:[ \t]*\n)*)[ \t]*/g,
    (_, blankLines: string) => foldLineBreak(blankLines.split("\n").length - 1)
  )

const endsWithEscape = (text: string): boolean => /\\*$/.exec(text)![0].length % 2 === 1

// Escaped trailing spaces are content, not folding whitespace.
const trimFoldedEnd = (line: string, quote: string): string => {
  const trailing = /[ \t]+$/.exec(line)
  if (trailing === null) return line
  const escaped = quote === "\"" && endsWithEscape(line.slice(0, trailing.index))
  return line.slice(0, trailing.index + (escaped ? 1 : 0))
}

// Folds the lines of a multiline quoted scalar, given with its quotes.
const foldQuotedLines = (lines: ReadonlyArray<string>, quote: string): string => {
  let output = ""
  let index = 0
  while (index < lines.length - 1) {
    const line = index === 0 ? lines[0] : lines[index].trimStart()
    index++
    if (quote === "\"" && endsWithEscape(line)) {
      output += line.slice(0, -1)
    } else {
      const start = index
      while (index < lines.length - 1 && lines[index].trim().length === 0) index++
      output += trimFoldedEnd(line, quote) + foldLineBreak(index - start)
    }
  }
  return output + (index === 0 ? lines[0] : lines[index].trimStart())
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
      "\t": "\t",
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

const parseScalar = (input: string, tag?: string): unknown => {
  const value = input.trim()
  if (value.startsWith("\"") && value.endsWith("\"")) {
    return resolveScalar(parseDoubleQuoted(value), tag, false)
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return resolveScalar(value.slice(1, -1).replace(/''/g, "'"), tag, false)
  }
  return resolveScalar(value, tag, true)
}

// Resolves scalar content with its tag. Untagged plain scalars use the core
// schema; tags other than the core ones are ignored and keep the content a string.
const resolveScalar = (text: string, tag: string | undefined, plain: boolean): unknown => {
  if (tag === undefined) return plain ? resolvePlain(text) : text
  const value = resolvePlain(text)
  switch (tag) {
    case `${coreTag}str`:
      return text
    case `${coreTag}null`:
      if (value === null) return value
      break
    case `${coreTag}bool`:
      if (typeof value === "boolean") return value
      break
    case `${coreTag}int`:
      if (typeof value === "number" && /^[+-]?(?:0x[\da-f]+|0o[0-7]+|\d+)$/i.test(text.replace(/_/g, ""))) return value
      break
    case `${coreTag}float`:
      if (typeof value === "number") return value
      break
    case `${coreTag}map`:
    case `${coreTag}seq`:
      break
    default:
      return text
  }
  throw new SyntaxError(`Cannot resolve '${text}' as YAML tag ${tag}`)
}

// Core tags on collections must match their kind.
const checkCollectionTag = (tag: string | undefined, kind: "map" | "seq"): void => {
  if (
    tag !== undefined && /^tag:yaml\.org,2002:(?:str|null|bool|int|float|map|seq)$/.test(tag) && tag !== coreTag + kind
  ) {
    throw new SyntaxError(`A YAML ${kind === "map" ? "mapping" : "sequence"} cannot have the tag ${tag}`)
  }
}

const resolvePlain = (value: string): unknown => {
  if (value.length === 0) return null
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

// Mapping keys are JavaScript strings, so collection keys are rejected.
const scalarKey = (value: unknown): string => {
  if (typeof value === "object" && value !== null) throw new SyntaxError("YAML collection keys are not supported")
  return value === null || value === undefined ? "" : String(value)
}

// Reads one anchor or tag property at the start of `input`, returning the
// combined properties and the property's length.
const readProperty = (
  input: string,
  properties: Properties,
  handles: ReadonlyMap<string, string>
): readonly [Properties, number] | undefined => {
  const anchor = /^&([^\s,[\]{}]*)/.exec(input)
  if (anchor !== null) {
    if (anchor[1].length === 0) throw new SyntaxError("YAML anchors cannot be empty")
    if (properties.anchor !== undefined) throw new SyntaxError("A YAML node can have at most one anchor")
    return [{ ...properties, anchor: anchor[1] }, anchor[0].length]
  }
  const tag = /^!(?:<([^>\s]+)>|([\w-]*!)?([^\s!,[\]{}]*))/.exec(input)
  if (tag === null) return undefined
  if (properties.tag !== undefined) throw new SyntaxError("A YAML node can have at most one tag")
  if (tag[1] !== undefined) return [{ ...properties, tag: tag[1] }, tag[0].length]
  const handle = `!${tag[2] ?? ""}`
  // A lone `!` is the non-specific tag, which keeps scalars strings.
  if (handle === "!" && tag[3].length === 0) return [{ ...properties, tag: "!" }, tag[0].length]
  const prefix = handles.get(handle)
  if (prefix === undefined) throw new SyntaxError(`Undefined YAML tag handle '${handle}'`)
  return [{ ...properties, tag: prefix + tag[3] }, tag[0].length]
}

const pending = Symbol()

// A collection's anchor is reserved while its entries are parsed, so an alias
// to it, which would make a cyclic value, is rejected.
class Anchors {
  private readonly nodes = new Map<string, unknown>()

  reserve(properties: Properties): void {
    if (properties.anchor !== undefined) this.nodes.set(properties.anchor, pending)
  }

  define<A>(properties: Properties, value: A): A {
    if (properties.anchor !== undefined) this.nodes.set(properties.anchor, value)
    return value
  }

  alias(name: string, properties: Properties): unknown {
    if (properties.anchor !== undefined || properties.tag !== undefined) {
      throw new SyntaxError("YAML aliases cannot have properties")
    }
    if (!this.nodes.has(name)) throw new SyntaxError(`Unknown YAML alias '*${name}'`)
    const node = this.nodes.get(name)
    if (node === pending) throw new SyntaxError(`Recursive YAML alias '*${name}' is not supported`)
    return node
  }
}

class FlowParser {
  private input: string
  private readonly anchors: Anchors
  private readonly handles: ReadonlyMap<string, string>
  private readonly nextLine: () => string | undefined
  private index = 0
  private depth = 0

  constructor(
    input: string,
    anchors: Anchors,
    handles: ReadonlyMap<string, string>,
    nextLine: () => string | undefined
  ) {
    this.input = input
    this.anchors = anchors
    this.handles = handles
    this.nextLine = nextLine
  }

  parse(properties: Properties): unknown {
    const value = this.parseValue(properties)
    this.skipWhitespace()
    if (this.index !== this.input.length) {
      this.fail("Unexpected flow collection content")
    }
    return value
  }

  private parseValue(inherited: Properties = noProperties): unknown {
    this.skipWhitespace()
    const properties = this.readProperties(inherited)
    const character = this.peek()
    if (character === "[" || character === "{") {
      this.depth++
      const collection = character === "[" ? this.parseSequence(properties) : this.parseMapping(properties)
      this.depth--
      return collection
    }
    if (character === "*") {
      this.index++
      return this.anchors.alias(this.readUntil(/[,\]}\s]/), properties)
    }
    const scalar = character === "\"" || character === "'" ? this.readQuoted(character) : this.readPlain()
    return this.anchors.define(properties, parseScalar(scalar, properties.tag))
  }

  private readProperties(inherited: Properties): Properties {
    let properties = inherited
    while (true) {
      const property = readProperty(this.input.slice(this.index), properties, this.handles)
      if (property === undefined) return properties
      this.index += property[1]
      if (!isSeparated(this.input[this.index])) this.fail("Expected a separator after a node property")
      properties = property[0]
      this.skipWhitespace()
    }
  }

  private parseSequence(properties: Properties): Array<unknown> {
    this.expect("[")
    checkCollectionTag(properties.tag, "seq")
    this.anchors.reserve(properties)
    const output: Array<unknown> = []
    this.parseEntries("]", () => output.push(this.parseSequenceEntry()))
    return this.anchors.define(properties, output)
  }

  private parseMapping(properties: Properties): YamlRecord {
    this.expect("{")
    checkCollectionTag(properties.tag, "map")
    this.anchors.reserve(properties)
    const output: YamlRecord = {}
    this.parseEntries("}", () => {
      const key = this.parseKey()
      if (hasOwn.call(output, key)) this.fail(`Duplicate key '${key}'`)
      setProperty(output, key, this.parsePairValue())
    })
    return this.anchors.define(properties, output)
  }

  // Parses comma-separated entries through the closing bracket, which may follow a trailing comma.
  private parseEntries(close: "]" | "}", parseEntry: () => void): void {
    this.skipWhitespace()
    while (this.peek() !== close) {
      parseEntry()
      this.skipWhitespace()
      if (this.peek() === close) break
      this.expect(",")
      this.skipWhitespace()
    }
    this.index++
  }

  // A `key: value` entry is a single-pair mapping.
  private parseSequenceEntry(): unknown {
    this.skipWhitespace()
    if (this.peek() === ",") this.fail("Unexpected ','")
    const explicit = this.readExplicitKeyIndicator()
    const start = this.index
    const value = this.parseValue()
    this.skipWhitespace()
    if (!explicit && this.peek() !== ":") return value
    if (!explicit && this.input.slice(start, this.index).includes("\n")) {
      this.fail("Implicit keys of flow sequence pairs must be on a single line")
    }
    const pair: YamlRecord = {}
    setProperty(pair, scalarKey(value), this.parsePairValue())
    return pair
  }

  private parseKey(): string {
    this.skipWhitespace()
    if (this.peek() === ",") this.fail("Unexpected ','")
    this.readExplicitKeyIndicator()
    return scalarKey(this.parseValue())
  }

  // A key without a `:` indicator has a null value.
  private parsePairValue(): unknown {
    this.skipWhitespace()
    if (this.peek() !== ":") return null
    this.index++
    return this.parseValue()
  }

  private readExplicitKeyIndicator(): boolean {
    if (this.peek() !== "?" || !isSeparated(this.input[this.index + 1])) return false
    this.index++
    return true
  }

  // A plain scalar ends at a flow indicator, a `:` followed by a separator, or a comment.
  private readPlain(): string {
    const start = this.index
    while (true) {
      const character = this.peek()
      if (character === "" || /[,[\]{}]/.test(character) || this.atComment()) break
      if (character === ":" && isSeparated(this.input[this.index + 1])) break
      this.index++
    }
    const text = foldFlowLines(this.input.slice(start, this.index)).trim()
    if (isSequenceEntry(text)) this.fail("Block sequences are not allowed in flow collections")
    if (reservedPlainStart.test(text)) this.fail(`A plain scalar cannot start with '${text[0]}'`)
    return text
  }

  private readQuoted(quote: string): string {
    const start = this.index
    let end = closingQuote(this.input, quote, start + 1)
    while (end === -1 && this.readLine()) end = closingQuote(this.input, quote, start + 1)
    if (end === -1) this.fail("Unterminated quoted scalar")
    this.index = end + 1
    return foldQuotedLines(this.input.slice(start, this.index).split("\n"), quote)
  }

  private readUntil(stop: RegExp): string {
    const start = this.index
    while (!stop.test(this.peek()) && this.index < this.input.length && !this.atComment()) this.index++
    return this.input.slice(start, this.index)
  }

  private skipWhitespace(): void {
    while (true) {
      if (/\s/.test(this.peek())) {
        this.index++
      } else if (this.atComment()) {
        while (this.index < this.input.length && this.input[this.index] !== "\n") this.index++
      } else {
        return
      }
    }
  }

  private atComment(): boolean {
    return this.peek() === "#" && /\s/.test(this.input[this.index - 1])
  }

  private expect(character: string): void {
    if (this.peek() !== character) this.fail(`Expected '${character}'`)
    this.index++
  }

  private peek(): string {
    if (this.index === this.input.length) this.readLine()
    return this.input[this.index] ?? ""
  }

  // Inside a collection, the end of the line continues on the next line.
  private readLine(): boolean {
    if (this.depth === 0) return false
    const line = this.nextLine()
    if (line !== undefined) this.input += `\n${line}`
    return line !== undefined
  }

  private fail(message: string): never {
    throw new SyntaxError(`${message} at flow offset ${this.index}`)
  }
}

class YamlParser {
  private readonly lines: Array<Line>
  private index = 0
  private documentStarted = false
  private readonly anchors = new Anchors()
  private readonly handles = new Map([["!", "!"], ["!!", coreTag]])
  private hasDirectives = false
  private hasYamlDirective = false

  constructor(lines: Array<Line>) {
    this.lines = lines
  }

  parse(): unknown {
    this.skipIgnored()
    if (this.hasDirectives && !this.documentStarted) {
      throw new SyntaxError("YAML directives must be followed by a '---' document start marker")
    }
    if (this.index >= this.lines.length) return null
    this.documentStarted = true
    const line = this.lines[this.index]
    const value = isDocumentMarker(line) && line.text.startsWith("---")
      ? this.parseDocumentStart(line)
      : this.parseNode(line.indent)
    this.skipIgnored()
    if (this.index < this.lines.length) {
      this.fail(this.lines[this.index], "Unexpected content")
    }
    return value
  }

  // Content on the `---` line is the document's node, which cannot be a block collection starting there.
  private parseDocumentStart(line: Line): unknown {
    this.index++
    const [properties, rest] = this.readProperties(line.text.slice(3).trimStart(), noProperties)
    if (isSequenceEntry(rest) || startsWithIndicator(rest, "?") || mappingSeparator(rest) !== -1) {
      this.fail(line, "Block collections cannot start on the document start line")
    }
    return this.parseValue(rest, -1, false, properties)
  }

  private parseNode(
    indent: number,
    parentIndent = indent - 1,
    properties = noProperties,
    allowIndentless = false
  ): unknown {
    this.skipIgnored()
    const line = this.lines[this.index]
    if (line === undefined) return null
    if (line.indent !== indent) this.fail(line, `Expected indentation of ${indent} spaces`)
    // A tab after the indentation may separate a scalar or flow node, but cannot indent a block collection.
    const text = line.text.trimStart()
    const mapping = startsWithIndicator(text, "?") || mappingSeparator(text) !== -1
    if (isSequenceEntry(text) || mapping) this.rejectTabIndent(line)
    if (isSequenceEntry(text)) return this.parseSequence(indent, properties)
    if (mapping) return this.parseMapping(indent, properties)
    this.index++
    return this.parseNodeValue(text, parentIndent, allowIndentless, properties)
  }

  private parseMapping(indent: number, properties: Properties): YamlRecord {
    checkCollectionTag(properties.tag, "map")
    this.anchors.reserve(properties)
    const output: YamlRecord = {}
    while (true) {
      this.skipIgnored()
      const line = this.lines[this.index]
      if (line === undefined || line.indent < indent) break
      if (line.indent > indent) this.fail(line, `Unexpected indentation of ${line.indent} spaces`)
      this.rejectTabIndent(line)
      if (startsWithIndicator(line.text, "?")) {
        this.parseExplicitEntry(output, line, indent)
        continue
      }
      const separator = mappingSeparator(line.text)
      if (separator === -1) break
      this.index++
      this.parseMappingEntry(output, line.text, separator, indent, line)
    }
    return this.anchors.define(properties, output)
  }

  private parseMappingEntry(
    output: YamlRecord,
    text: string,
    separator: number,
    indent: number,
    line: Line
  ): void {
    const key = this.parseKey(text.slice(0, separator).trim())
    const rawValue = text.slice(separator + 1).trimStart()
    const value = this.parseNodeValue(rawValue, indent, true)
    if (hasOwn.call(output, key)) this.fail(line, `Duplicate key '${key}'`)
    setProperty(output, key, value)
  }

  // A `? key` entry, optionally followed by a `: value` line at the same indentation.
  private parseExplicitEntry(output: YamlRecord, line: Line, indent: number): void {
    const key = scalarKey(this.parseCompactNode(line, indent, true))
    this.skipIgnored()
    const next = this.lines[this.index]
    const value = next !== undefined && next.indent === indent && startsWithIndicator(next.text, ":")
      ? this.parseCompactNode(next, indent, true)
      : null
    if (hasOwn.call(output, key)) this.fail(line, `Duplicate key '${key}'`)
    setProperty(output, key, value)
  }

  // Properties before an implicit key belong to the key.
  private parseKey(text: string): string {
    const [properties, rest] = this.readProperties(text, noProperties)
    if (rest.startsWith("*")) return scalarKey(this.parseAlias(rest, properties))
    return scalarKey(this.anchors.define(properties, parseScalar(rest, properties.tag)))
  }

  private parseSequence(indent: number, properties: Properties): Array<unknown> {
    checkCollectionTag(properties.tag, "seq")
    this.anchors.reserve(properties)
    const output: Array<unknown> = []
    while (true) {
      this.skipIgnored()
      const line = this.lines[this.index]
      if (line === undefined || line.indent < indent) break
      if (line.indent > indent) this.fail(line, `Unexpected indentation of ${line.indent} spaces`)
      this.rejectTabIndent(line)
      if (!isSequenceEntry(line.text)) break
      output.push(this.parseCompactNode(line, indent))
    }
    return this.anchors.define(properties, output)
  }

  // Parses the node after a `-`, `?` or `:` indicator, which may start on the indicator's line.
  private parseCompactNode(line: Line, indent: number, allowIndentless = false): unknown {
    const content = line.text.slice(1).trimStart()
    if (content.length === 0) {
      this.index++
      return this.parseNodeValue("", indent, allowIndentless)
    }
    // Re-read the content as a line of its own, indented to its column.
    const column = indent + line.text.length - content.length
    if (
      /\t/.test(line.text.slice(1, column - indent)) && (isSequenceEntry(content) || mappingSeparator(content) !== -1)
    ) {
      this.fail(line, "Tabs cannot be used for YAML indentation")
    }
    this.lines[this.index] = {
      ...line,
      raw: " ".repeat(column) + line.raw.slice(column),
      text: content,
      indent: column,
      tabIndent: false
    }
    return this.parseNode(column, indent)
  }

  // Node properties may sit on lines of their own before the node's content.
  private parseNodeValue(
    rawValue: string,
    parentIndent: number,
    allowIndentless = false,
    inherited = noProperties
  ): unknown {
    const [properties, rest] = this.readProperties(rawValue, inherited)
    return this.parseValue(rest, parentIndent, allowIndentless, properties)
  }

  private readProperties(text: string, inherited: Properties): readonly [Properties, string] {
    let properties = inherited
    let rest = text
    while (true) {
      const property = readProperty(rest, properties, this.handles)
      if (property === undefined) return [properties, rest]
      if (!/^(?:\s|$)/.test(rest.slice(property[1]))) {
        throw new SyntaxError("YAML node properties must be followed by whitespace")
      }
      properties = property[0]
      rest = rest.slice(property[1]).trimStart()
    }
  }

  private parseValue(value: string, parentIndent: number, allowIndentless: boolean, properties: Properties): unknown {
    const text = value.trimEnd()
    if (text.length === 0) {
      this.skipIgnored()
      const next = this.lines[this.index]
      if (next !== undefined && next.indent > parentIndent) {
        return this.parseNode(next.indent, parentIndent, properties, allowIndentless)
      }
      if (next !== undefined && allowIndentless && next.indent === parentIndent && isSequenceEntry(next.text)) {
        return this.parseSequence(parentIndent, properties)
      }
      return this.anchors.define(properties, resolveScalar("", properties.tag, true))
    }
    if (/^[|>](?:[1-9]?[+-]?|[+-]?[1-9]?)$/.test(text)) {
      const scalar = this.parseBlockScalar(text, parentIndent)
      return this.anchors.define(properties, resolveScalar(scalar, properties.tag, false))
    }
    // Keep escaped trailing whitespace in quoted values.
    if (value.startsWith("\"") || value.startsWith("'")) {
      return this.anchors.define(properties, this.parseQuotedValue(value, parentIndent, properties.tag))
    }
    if (text.startsWith("*")) return this.parseAlias(text, properties)
    if (text.startsWith("[") || text.startsWith("{")) return this.parseFlowValue(text, parentIndent, properties)
    return this.anchors.define(properties, this.parsePlainValue(text, parentIndent, properties.tag))
  }

  private parseAlias(text: string, properties: Properties): unknown {
    return this.anchors.alias(text.slice(1).trim(), properties)
  }

  private parseFlowValue(text: string, parentIndent: number, properties: Properties): unknown {
    return new FlowParser(text, this.anchors, this.handles, () => {
      const next = this.lines[this.index]
      if (next === undefined || isDocumentMarker(next)) return undefined
      // Continuation lines are more indented than the parent node. Unlike YAML 1.2, a closing
      // bracket may sit at the parent's indentation, as most parsers accept.
      const content = next.text.trim().length > 0
      if (content && next.indent < parentIndent) return undefined
      if (content && next.indent === parentIndent && !/^[\]}]/.test(next.text)) return undefined
      this.index++
      // The flow parser skips comments itself, since quoted scalars may span lines.
      return next.raw.slice(next.indent)
    }).parse(properties)
  }

  private parsePlainValue(value: string, parentIndent: number, tag: string | undefined): unknown {
    const first = this.lines[this.index - 1]
    if (/:(?:\s|$)/.test(value)) this.fail(first, "Invalid colon in plain scalar")
    // A plain scalar cannot start with an indicator, such as a block sequence entry after a key or property.
    if (/^[-?:](?:\s|$)/.test(value) || reservedPlainStart.test(value)) {
      this.fail(first, "Invalid indicator at the start of a plain scalar")
    }
    let output = value
    let terminated = findIndicator(first.raw, "#") !== -1
    while (!terminated) {
      const blankLines = this.skipBlankLines()
      const next = this.lines[this.index]
      if (next === undefined || next.indent <= parentIndent) break
      // Quotes in plain continuations are literal.
      const content = next.raw.slice(next.indent)
      const comment = content.search(/(?:^|[ \t])#/)
      const text = (comment === -1 ? content : content.slice(0, comment)).trim()
      if (text.length === 0 || isDocumentMarker(next)) break
      if (/:(?:\s|$)/.test(text)) this.fail(next, "Invalid colon in plain scalar")
      this.rejectTabIndentedBlankLines(blankLines, parentIndent)
      output += foldLineBreak(blankLines) + text
      this.index++
      terminated = comment !== -1
    }
    return resolveScalar(output, tag, true)
  }

  private parseQuotedValue(value: string, parentIndent: number, tag: string | undefined): unknown {
    const quote = value[0]
    const lines = [value]
    let end = closingQuote(value, quote, 1)
    while (end === -1) {
      const next = this.lines[this.index++]
      if (next === undefined) throw new SyntaxError("Unterminated quoted YAML scalar")
      if (isDocumentMarker(next)) this.fail(next, "Document markers cannot appear in a quoted scalar")
      const blank = next.raw.trim().length === 0
      if (next.indent <= parentIndent) this.rejectTabIndent(next)
      if (!blank && next.indent <= parentIndent) this.fail(next, "Invalid quoted scalar indentation")
      lines.push(next.raw)
      end = closingQuote(next.raw, quote, 0)
    }
    const last = lines[lines.length - 1]
    const rest = last.slice(end + 1)
    if (rest.trim().length > 0 && !/^[ \t]+#/.test(rest)) {
      throw new SyntaxError("Unexpected content after quoted YAML scalar")
    }
    lines[lines.length - 1] = last.slice(0, end + 1)
    return parseScalar(foldQuotedLines(lines, quote), tag)
  }

  private parseBlockScalar(indicator: string, parentIndent: number): string {
    const style = indicator[0]
    const chomp = indicator.includes("-") ? "strip" : indicator.includes("+") ? "keep" : "clip"
    const explicitIndent = Number.parseInt(indicator.replace(/[^1-9]/g, ""), 10)
    const start = this.index
    let end = start
    let contentIndent = Number.isNaN(explicitIndent) ? undefined : parentIndent + explicitIndent
    let hasContent = false

    while (end < this.lines.length) {
      const line = this.lines[end]
      if (isDocumentMarker(line)) break
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

  private skipBlankLines(): number {
    const start = this.index
    while (this.index < this.lines.length && this.lines[this.index].raw.trim().length === 0) this.index++
    return this.index - start
  }

  private skipIgnored(): void {
    while (this.index < this.lines.length) {
      const line = this.lines[this.index]
      const text = line.text.trimEnd()
      if (text.length === 0) {
        this.index++
      } else if (!this.documentStarted && line.indent === 0 && text.startsWith("%")) {
        this.parseDirective(line, text)
        this.index++
      } else if (line.indent === 0 && /^---(?:\s|$)/.test(text)) {
        if (this.documentStarted) this.fail(line, "Multiple YAML documents are not supported")
        this.documentStarted = true
        // The document's content may start on the marker line.
        if (text !== "---") return
        this.index++
      } else if (line.indent === 0 && text === "...") {
        this.index++
        while (this.index < this.lines.length && this.lines[this.index].text.trimEnd().length === 0) this.index++
        if (this.index < this.lines.length) {
          this.fail(this.lines[this.index], "Multiple YAML documents are not supported")
        }
      } else {
        return
      }
    }
  }

  // Other directives than `%YAML` and `%TAG` are reserved and ignored.
  private parseDirective(line: Line, text: string): void {
    this.hasDirectives = true
    if (/^%YAML(?:\s|$)/.test(text)) {
      if (this.hasYamlDirective) this.fail(line, "Duplicate %YAML directive")
      if (!/^%YAML\s+\d+\.\d+$/.test(text)) this.fail(line, "Invalid %YAML directive")
      this.hasYamlDirective = true
    } else if (/^%TAG(?:\s|$)/.test(text)) {
      const directive = /^%TAG\s+(!(?:[\w-]*!)?)\s+(\S+)$/.exec(text)
      if (directive === null) this.fail(line, "Invalid %TAG directive")
      this.handles.set(directive[1], directive[2])
    }
  }

  private fail(line: Line, message: string): never {
    throw new SyntaxError(`${message} at line ${line.number}`)
  }
}

/**
 * Parses one YAML document into JavaScript values.
 *
 * **Details**
 *
 * The core YAML 1.2 scalar schema is used, so booleans, nulls, and numbers are
 * decoded while date-like values remain strings.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const parse = (input: string): unknown => {
  const source = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
  const lines = source.split("\n").map((raw, index): Line => {
    const indentation = /^( *)/.exec(raw)![1].length
    return {
      raw,
      text: stripComment(raw.slice(indentation)),
      indent: indentation,
      number: index + 1,
      // Rejected where the line is read as structure; block scalar content may hold tabs.
      tabIndent: raw[indentation] === "\t"
    }
  })
  return new YamlParser(lines).parse()
}
