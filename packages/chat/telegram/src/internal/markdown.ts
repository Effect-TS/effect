/**
 * Rich Markdown for `sendRichMessage`: the escaping that keeps consumer
 * Markdown from reaching Telegram's raw HTML, images, math, spoilers and
 * non-web links, and the `measure` that bounds what it costs.
 *
 * @internal
 */

/** What one line break or block marker costs, so that a message in budget stays under 500 blocks. @internal */
export const block = 65

/** Telegram's rich message limit, read as UTF-8 bytes. @internal */
export const richLimit = 32_768

/** Files one post may carry. @internal */
export const filesPerMessage = 10

/** The most nesting and table columns Telegram renders. @internal */
export const maxDepth = 16

/** @internal */
export const maxColumns = 20

/** The reference to the `n`th file of a post, at the end of the Markdown. @internal */
export const mediaReference = (n: number): string => `\n\n![](tg://document?id=f${n})`

/**
 * What the budget keeps back for media references and the fence a post
 * with files may need to close: each reference's bytes and its block, one
 * block for the message's first, which `measure` does not charge, and 8
 * bytes for the fence.
 *
 * @internal
 */
export const reservation = filesPerMessage * (32 + block) + block + 8

/** @internal */
export const messageLength = richLimit - reservation

const twoByteEscapes = new Set(["$", "=", "|", "!", "[", "]", "*", "_", "~", "`"])
const blockMarkers = new Set([">", "-", "+", "*", ".", ")"])

const isDigit = (c: string) => c >= "0" && c <= "9"

/**
 * A sum of per-character costs, each fixed or depending only on what comes
 * before the character on its own line, which makes it subadditive:
 *
 * - a code point in the Basic Multilingual Plane costs its UTF-8 length,
 *   and each UTF-16 surrogate 3, enough for the U+FFFD a lone one becomes.
 *   NUL costs 3 too, as Markdown turns it into U+FFFD.
 * - `<` costs 4, and `$ = | ! [ ] * _ ~` and the backtick 2, their
 *   escaped length or more, whether or not they are escaped in context.
 * - `\n` and `\r` cost `block`, as does a block marker (`>`, a bullet,
 *   the dot or parenthesis of a number) before any other text on its line.
 *
 * @internal
 */
export const measure = (markdown: string): number => {
  let cost = 0
  let prefix = true
  for (let i = 0; i < markdown.length; i++) {
    const code = markdown.charCodeAt(i)
    if (code === 10 || code === 13) {
      cost += block
      prefix = true
      continue
    }
    if (code >= 0xd800 && code <= 0xdfff) {
      cost += 3
      prefix = false
      continue
    }
    const c = markdown[i]
    if (prefix) {
      if (c === " " || c === "\t" || isDigit(c)) {
        cost += 1
        continue
      }
      if (blockMarkers.has(c)) {
        cost += block
        continue
      }
      prefix = false
    }
    cost += code === 0 ? 3 : c === "<" ? 4 : twoByteEscapes.has(c) ? 2 : code < 0x80 ? 1 : code < 0x800 ? 2 : 3
  }
  return cost
}

const punctuation = /[!-/:-@[-`{-~]/

const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c)

/** A line that opens a top-level fence: at column 0, three or more backticks or tildes. */
const fenceOpen = /^(`{3,}|~{3,})(.*)$/

interface Fence {
  readonly char: string
  readonly length: number
}

const opens = (line: string): Fence | undefined => {
  const match = fenceOpen.exec(line)
  if (match === null || (match[1][0] === "`" && match[2].includes("`"))) return undefined
  return { char: match[1][0], length: match[1].length }
}

const closes = (line: string, fence: Fence): boolean => {
  const match = /^ {0,3}(`+|~+)[ \t]*$/.exec(line)
  return match !== null && match[1][0] === fence.char && match[1].length >= fence.length
}

const delimiterRow = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/

/** The cells of a table row, split at unescaped pipes as GFM does, even inside code. */
const cellCount = (line: string): number => {
  let count = 1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\") i++
    else if (line[i] === "|") count++
  }
  const trimmed = line.trim()
  if (trimmed.startsWith("|")) count--
  if (trimmed.length > 1 && trimmed.endsWith("|") && !trimmed.endsWith("\\|")) count--
  return count
}

const hasPipe = (line: string) => cellCount(line) > 1 || line.trim().startsWith("|")

/** The decoded form of a link destination, as a Markdown parser and then a URL parser read it. */
const decodeDestination = (raw: string): { readonly unescaped: string; readonly decoded: string } | undefined => {
  let unescaped = raw.replace(/\\([!-/:-@[-`{-~])/g, "$1")
  unescaped = unescaped.replace(/&#(\d{1,7});/g, (_, n: string) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#[xX]([0-9a-fA-F]{1,6});/g, (_, n: string) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(
      /&(amp|lt|gt|quot|apos);/g,
      (_, name: string) =>
        name === "amp" ? "&" : name === "lt" ? "<" : name === "gt" ? ">" : name === "quot" ? "\"" : "'"
    )
  // Any other named reference could be one of HTML's many, such as `&colon;`.
  if (/&[A-Za-z][A-Za-z0-9]*;/.test(unescaped)) return undefined
  try {
    return { unescaped, decoded: decodeURIComponent(unescaped) }
  } catch {
    return undefined
  }
}

const allowedScheme = /^(?:https?:\/\/|mailto:)/i

/** Whether a link to `raw` may stay: http, https and mailto, or a mention the post allows. */
const allowedDestination = (raw: string, mentions: ReadonlySet<string>): boolean => {
  const destination = decodeDestination(raw)
  if (destination === undefined) return false
  if (allowedScheme.test(destination.unescaped) && allowedScheme.test(destination.decoded)) return true
  const mention = /^tg:\/\/user\?id=(\d{1,20})$/.exec(destination.decoded)
  return mention !== null && destination.unescaped === destination.decoded && mentions.has(mention[1])
}

/** The raw destination after `](` at `start`, or undefined when it is not on this line or is in angle brackets. */
const inlineDestination = (line: string, start: number): string | undefined => {
  let i = start
  while (line[i] === " " || line[i] === "\t") i++
  if (i >= line.length || line[i] === "<") return undefined
  let depth = 0
  let end = i
  for (; end < line.length; end++) {
    const c = line[end]
    if (c === "\\") {
      end++
      continue
    }
    if (/\s/.test(c)) break
    if (c === "(") depth++
    else if (c === ")") {
      if (depth === 0) break
      depth--
    }
  }
  return line.slice(i, end)
}

/** The destination of a reference definition after `]:`, when it is on this line. */
const definitionDestination = (line: string, start: number): string | undefined => {
  const match = /^[ \t]*(\S+)/.exec(line.slice(start))
  return match === null || match[1].startsWith("<") ? undefined : match[1]
}

/**
 * The code spans of a line, as `[start, end)` pairs, paired the way
 * CommonMark pairs backtick runs. A run with no partner on the line is
 * not a span: the renderer escapes it, so no span can pair across lines.
 * In a table row a span holding a pipe is refused, since GFM splits cells
 * before it reads code.
 */
const codeSpans = (line: string, tableRow: boolean): Array<readonly [number, number]> => {
  const spans: Array<readonly [number, number]> = []
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === "\\" && i + 1 < line.length && punctuation.test(line[i + 1])) {
      i += 2
      continue
    }
    if (c !== "`") {
      i++
      continue
    }
    let length = 0
    while (line[i + length] === "`") length++
    let j = i + length
    let close = -1
    while (j < line.length) {
      if (line[j] !== "`") {
        j++
        continue
      }
      let run = 0
      while (line[j + run] === "`") run++
      if (run === length) {
        close = j
        break
      }
      j += run
    }
    if (close === -1 || (tableRow && line.slice(i, close).includes("|"))) {
      i += length
      continue
    }
    spans.push([i, close + length])
    i = close + length
  }
  return spans
}

const autolink = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}):[^\s<>]*>/

/** The inline nesting carried through one paragraph. */
interface Inline {
  readonly stack: Array<string>
}

interface LineContext {
  readonly tableRow: boolean
  readonly widePipes: boolean
  readonly inline: Inline
  readonly mentions: ReadonlySet<string>
}

/**
 * The container markers at the start of a line, with those past the depth
 * limit escaped, and where the line's text starts.
 */
const renderPrefix = (line: string): { readonly text: string; readonly rest: number; readonly depth: number } => {
  let out = ""
  let i = 0
  let depth = 0
  let indent = 0
  for (;;) {
    const space = /^[ \t]*/.exec(line.slice(i))![0]
    indent += space.length
    out += space
    i += space.length
    const marker = /^(?:>|[-+*](?=[ \t]|$)|\d{1,9}[.)](?=[ \t]|$))/.exec(line.slice(i))
    if (marker === null) break
    depth++
    const token = marker[0]
    const escape = depth + Math.floor(indent / 2) >= maxDepth
    out += escape ? token.slice(0, -1) + "\\" + token.slice(-1) : token
    i += token.length
  }
  return { text: out, rest: i, depth: depth + Math.floor(indent / 2) }
}

const renderLine = (line: string, context: LineContext): string => {
  const prefix = renderPrefix(line)
  const setext = /^ {0,3}=+[ \t]*$/.test(line)
  const spans = codeSpans(line, context.tableRow)
  const footnote = line.slice(prefix.rest).startsWith("[^")
  const limit = Math.max(0, maxDepth - 1 - prefix.depth)
  const stack = context.inline.stack
  let out = prefix.text
  let span = 0
  let firstBracket = true
  let i = prefix.rest
  while (i < line.length) {
    while (span < spans.length && spans[span][1] <= i) span++
    if (span < spans.length && spans[span][0] === i) {
      out += line.slice(spans[span][0], spans[span][1])
      i = spans[span][1]
      continue
    }
    const c = line[i]
    const next = line[i + 1]
    if (c === "\\" && next !== undefined && punctuation.test(next)) {
      out += c + next
      i += 2
      continue
    }
    switch (c) {
      case "`":
        out += "\\`"
        i++
        continue
      case "<": {
        const match = autolink.exec(line.slice(i))
        const end = match === null ? -1 : i + match[0].length
        const overlaps = match !== null && spans.some(([start]) => start > i && start < end)
        if (match !== null && !overlaps && /^(?:https?|mailto)$/i.test(match[1])) {
          out += match[0]
          i = end
        } else {
          out += "\\<"
          i++
        }
        continue
      }
      case "$":
        out += "\\$"
        i++
        continue
      case "=":
        out += setext ? "=" : "\\="
        i++
        continue
      case "|":
        out += context.tableRow && !context.widePipes ? "|" : "\\|"
        i++
        continue
      case "!":
        out += next === "[" ? "\\!" : "!"
        i++
        continue
      case "]": {
        let keep = true
        if (next === "(") {
          const destination = inlineDestination(line, i + 2)
          keep = destination !== undefined && allowedDestination(destination, context.mentions)
        } else if (next === ":" && !(footnote && firstBracket)) {
          const destination = definitionDestination(line, i + 2)
          keep = destination !== undefined && allowedDestination(destination, context.mentions)
        }
        firstBracket = false
        out += keep ? "]" : "\\]"
        i++
        continue
      }
      case "*":
      case "_":
      case "~": {
        let end = i
        while (line[end] === c) end++
        const run = line.slice(i, end)
        const before = i === 0 ? undefined : line[i - 1]
        const after = line[end]
        if (!isSpace(before) && stack.length > 0 && stack[stack.length - 1] === c) {
          stack.pop()
          out += run
        } else if (!isSpace(after)) {
          if (stack.length + 1 > limit) {
            out += run.split("").map((char) => "\\" + char).join("")
          } else {
            stack.push(c)
            out += run
          }
        } else {
          out += run
        }
        i = end
        continue
      }
      default:
        out += c
        i++
    }
  }
  return out
}

/** @internal */
export interface RenderOptions {
  /** User ids whose `[name](tg://user?id=…)` links may stay. */
  readonly mentions?: ReadonlySet<string> | undefined
  /** How many files the post references at the end. */
  readonly files?: number | undefined
}

/**
 * Consumer Markdown as rich Markdown that keeps to what `measure` charged:
 *
 * - Top-level fences (at column 0) pass verbatim, as do code spans whose
 *   backticks pair on one line. Everything else is escaped as needed.
 * - `<` is escaped unless it opens an http, https or mailto autolink, so
 *   there is no raw HTML. `$` and `=` are escaped (math, marks), as is
 *   `|` outside tables (spoilers), and `!` before `[` (images).
 * - A link or reference definition whose destination, decoded as a
 *   Markdown parser and then a URL parser would, is not http, https or
 *   mailto has its `]` escaped, so it is text. A `tg://user` link stays
 *   for an id in `mentions`.
 * - Container markers and emphasis past 16 levels are escaped, and a table
 *   wider than 20 columns has its pipes escaped.
 * - `files` references are added at the end, after closing a fence left
 *   open.
 *
 * @internal
 */
export const render = (markdown: string, options: RenderOptions = {}): string => {
  const mentions = options.mentions ?? new Set<string>()
  const lines = markdown.replace(/\r\n?/g, "\n").replace(/\0/g, "\ufffd").split("\n")
  const fenced: Array<boolean> = []
  let fence: Fence | undefined
  for (const line of lines) {
    if (fence !== undefined) {
      fenced.push(true)
      if (closes(line, fence)) fence = undefined
      continue
    }
    fence = opens(line)
    fenced.push(fence !== undefined)
  }
  const tableRows = new Map<number, boolean>()
  for (let i = 0; i + 1 < lines.length; i++) {
    if (fenced[i] || fenced[i + 1] || tableRows.has(i)) continue
    if (!delimiterRow.test(lines[i + 1]) || !lines[i + 1].includes("|") || !hasPipe(lines[i])) continue
    const columns = cellCount(lines[i])
    if (columns !== cellCount(lines[i + 1])) continue
    let end = i + 2
    while (end < lines.length && !fenced[end] && lines[end].trim() !== "") end++
    const rows = Array.from({ length: end - i }, (_, k) => i + k)
    for (const row of rows) tableRows.set(row, columns > maxColumns || cellCount(lines[row]) > maxColumns)
    i = end - 1
  }
  const inline: Inline = { stack: [] }
  const out = lines.map((line, i) => {
    if (fenced[i]) return line
    if (line.trim() === "") inline.stack.length = 0
    const wide = tableRows.get(i)
    return renderLine(line, { tableRow: wide !== undefined, widePipes: wide === true, inline, mentions })
  })
  let text = out.join("\n")
  const files = options.files ?? 0
  if (files > 0) {
    if (fence !== undefined) text += "\n" + fence.char.repeat(fence.length)
    for (let n = 1; n <= files; n++) text += mediaReference(n)
  }
  return text
}
