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
 * - `<` costs 4, a backslash 3 (`%5C` in a bare URL), and
 *   `$ = | ! [ ] * _ ~` and the backtick 2, their escaped length or more,
 *   whether or not they are escaped in context.
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
    cost += code === 0 || c === "\\"
      ? 3
      : c === "<"
      ? 4
      : twoByteEscapes.has(c)
      ? 2
      : code < 0x80
      ? 1
      : code < 0x800
      ? 2
      : 3
  }
  return cost
}

const punctuation = /[!-/:-@[-`{-~]/

const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c)

/** A line that opens a fence: up to three spaces, then three or more backticks or tildes. */
const fenceOpen = /^( {0,3})(`{3,}|~{3,})(.*)$/

interface Fence {
  readonly char: string
  readonly length: number
  readonly indent: number
}

const opens = (line: string): Fence | undefined => {
  const match = fenceOpen.exec(line)
  if (match === null || (match[2][0] === "`" && match[3].includes("`"))) return undefined
  return { char: match[2][0], length: match[2].length, indent: match[1].length }
}

const closes = (line: string, fence: Fence): boolean => {
  const match = /^ {0,3}(`+|~+)[ \t]*$/.exec(line)
  return match !== null && match[1][0] === fence.char && match[1].length >= fence.length
}

/** A line that may open a list item or footnote, which an indented fence could belong to. */
const container = /^[ \t>]*(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)|^[ \t>]*\[\^/

/** A line GFM may read as the start of another block, which ends a table and is no paragraph. */
const blockStart = /^(?: {0,3}[#>\-*+_~`<=]| {0,3}\d{1,9}[.)]| {4}| {0,3}\t)/

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

/**
 * A link's `(destination "title")` from the `(` at `start`, when all of it
 * is on this line and the destination is not in angle brackets. A tail
 * that goes on to the next line, as CommonMark allows, is not one: the
 * link is then refused.
 */
const linkTail = (line: string, start: number): { readonly destination: string; readonly end: number } | undefined => {
  const blank = (c: string | undefined) => c === " " || c === "\t"
  let i = start + 1
  while (blank(line[i])) i++
  if (line[i] === "<") return undefined
  const from = i
  let depth = 0
  for (; i < line.length; i++) {
    const c = line[i]
    if (c === "\\" && punctuation.test(line[i + 1] ?? "")) {
      i++
      continue
    }
    if (c.charCodeAt(0) <= 0x20) break
    if (c === "(") depth++
    else if (c === ")") {
      if (depth === 0) break
      depth--
    }
  }
  const destination = line.slice(from, i)
  const spaced = blank(line[i])
  while (blank(line[i])) i++
  const open = line[i]
  if (spaced && (open === "\"" || open === "'" || open === "(")) {
    const close = open === "(" ? ")" : open
    for (i++; i < line.length && line[i] !== close; i++) {
      if (line[i] === "\\" && punctuation.test(line[i + 1] ?? "")) i++
      else if (open === "(" && line[i] === "(") return undefined
    }
    if (i >= line.length) return undefined
    i++
    while (blank(line[i])) i++
  }
  return line[i] === ")" ? { destination, end: i + 1 } : undefined
}

const tailEscapes = new Set(["`", "$", "=", "|", "!", "[", "]", "*", "_", "~"])

/**
 * A kept link's tail with every character that is syntax elsewhere
 * escaped. CommonMark decodes the escapes in destinations and titles, so
 * the link is the same, and a parser that does not read the link sees
 * inert text.
 */
const escapeTail = (tail: string): string => {
  let out = ""
  for (let i = 0; i < tail.length; i++) {
    const c = tail[i]
    if (c === "\\" && punctuation.test(tail[i + 1] ?? "")) {
      // `\<` and `&lt;` decode alike, but after a bare URL only one is inert.
      out += tail[++i] === "<" ? "&lt;" : c + tail[i]
      continue
    }
    out += c === "<" ? "&lt;" : tailEscapes.has(c) ? "\\" + c : c
  }
  return out
}

/** The destination of a reference definition after `]:`, when it is on this line. */
const definitionDestination = (line: string, start: number): string | undefined => {
  const match = /^[ \t]*(\S+)/.exec(line.slice(start))
  return match === null || match[1].startsWith("<") ? undefined : match[1]
}

/**
 * The end of the code span whose opening backticks are at `start`, found as
 * CommonMark finds it: the next run of as many backticks on the line. A
 * run with no partner on the line opens no span: the renderer escapes it,
 * so no span can pair across lines. In a table row a span holding a pipe
 * is refused, since GFM splits cells before it reads code.
 */
const codeSpanEnd = (line: string, start: number, tableRow: boolean): number | undefined => {
  let length = 0
  while (line[start + length] === "`") length++
  for (let j = start + length; j < line.length;) {
    if (line[j] !== "`") {
      j++
      continue
    }
    let run = 0
    while (line[j + run] === "`") run++
    if (run === length) return tableRow && line.slice(start, j).includes("|") ? undefined : j + run
    j += run
  }
  return undefined
}

/**
 * Where GFM starts a bare URL link. It runs to the next space, taking
 * backslashes and backticks with it, so inside one an escape is not
 * needed and a backtick opens no span.
 */
const bareUrl = /^(?:https?:\/\/|www\.)/i

const autolink = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}):[^\s<>`]*>/

/** The inline nesting carried through one paragraph, one entry per delimiter. */
interface Inline {
  readonly stack: Array<string>
}

interface LineContext {
  readonly tableRow: boolean
  readonly widePipes: boolean
  readonly setext: boolean
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
  const footnote = /^\[\^[\w-]+\]:/.test(line.slice(prefix.rest))
  const limit = Math.max(0, maxDepth - 1 - prefix.depth)
  const stack = context.inline.stack
  let out = prefix.text
  let urlEnd = -1
  let i = prefix.rest
  while (i < line.length) {
    const c = line[i]
    const next = line[i + 1]
    if (i >= urlEnd && bareUrl.test(line.slice(i, i + 8))) {
      urlEnd = i
      while (urlEnd < line.length && line[urlEnd] !== " " && line[urlEnd] !== "\t") urlEnd++
    }
    const inUrl = i < urlEnd
    // In a bare URL a backslash escapes nothing, outside one it does: as
    // `%5C` it is the same character to a browser and inert to both.
    if (c === "\\" && inUrl && next !== undefined && punctuation.test(next)) {
      out += "%5C"
      i++
      continue
    }
    if (c === "\\" && next !== undefined && punctuation.test(next)) {
      out += c + next
      i += 2
      continue
    }
    switch (c) {
      case "`": {
        const end = inUrl ? undefined : codeSpanEnd(line, i, context.tableRow)
        if (end !== undefined) {
          out += line.slice(i, end)
          i = end
          continue
        }
        while (line[i] === "`") {
          out += "\\`"
          i++
        }
        continue
      }
      case "<": {
        const match = inUrl ? null : autolink.exec(line.slice(i))
        if (match !== null && /^(?:https?|mailto)$/i.test(match[1])) {
          out += match[0]
          i += match[0].length
        } else {
          out += "&lt;"
          i++
        }
        continue
      }
      case "$":
        out += "\\$"
        i++
        continue
      case "=":
        out += context.setext ? "=" : "\\="
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
        if (next === "(") {
          const tail = linkTail(line, i + 1)
          if (tail !== undefined && allowedDestination(tail.destination, context.mentions)) {
            out += "](" + escapeTail(line.slice(i + 2, tail.end - 1)) + ")"
            i = tail.end
            continue
          }
          out += "\\]"
        } else if (next === ":" && !(footnote && i === line.indexOf("]", prefix.rest))) {
          const destination = definitionDestination(line, i + 2)
          out += destination !== undefined && allowedDestination(destination, context.mentions) ? "]" : "\\]"
        } else {
          out += "]"
        }
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
        let open = run.length
        if (!isSpace(before) && stack[stack.length - 1] === c) {
          while (open > 0 && stack[stack.length - 1] === c) {
            stack.pop()
            open--
          }
        }
        // A run of n delimiters can nest n levels: `***a*b*c*` is three.
        if (open > 0 && !isSpace(after)) {
          if (stack.length + open > limit) {
            out += run.split("").map((char) => "\\" + char).join("")
            i = end
            continue
          }
          for (let k = 0; k < open; k++) stack.push(c)
        }
        out += run
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
 * - Fences pass verbatim, as do code spans, which are found left to right
 *   as CommonMark finds them. A fence indented by one to three spaces after
 *   a list item could belong to it, so from such a fence on nothing is
 *   verbatim. Inside a bare URL a backtick opens no span.
 * - `<` becomes `&lt;` unless it opens an http, https or mailto autolink,
 *   so there is no raw HTML, also after a bare URL, which would take a
 *   backslash with it. `$` and `=` are escaped (math, marks), except `=`
 *   under a paragraph line (a setext heading), as is `|` outside tables
 *   (spoilers), and `!` before `[` (images).
 * - A link or reference definition whose destination, decoded as a
 *   Markdown parser and then a URL parser would, is not http, https or
 *   mailto has its `]` escaped, so it is text. A `tg://user` link stays
 *   for an id in `mentions`. A kept link's tail must end on its line and
 *   has its syntax characters escaped.
 * - Container markers and emphasis past 16 levels are escaped, counting a
 *   run of n delimiters as n levels, and a table wider than 20 columns has
 *   its pipes escaped. A table ends at a line that may start another block.
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
  let containers = false
  let verbatim = true
  for (const line of lines) {
    if (fence !== undefined) {
      fenced.push(true)
      if (closes(line, fence)) fence = undefined
      continue
    }
    const opened = verbatim ? opens(line) : undefined
    if (opened !== undefined && opened.indent > 0 && containers) verbatim = false
    else if (opened !== undefined) {
      fence = opened
      fenced.push(true)
      continue
    }
    if (container.test(line)) containers = true
    fenced.push(false)
  }
  const tableRows = new Map<number, boolean>()
  for (let i = 0; i + 1 < lines.length; i++) {
    if (fenced[i] || fenced[i + 1] || tableRows.has(i) || blockStart.test(lines[i])) continue
    if (!delimiterRow.test(lines[i + 1]) || !lines[i + 1].includes("|") || !hasPipe(lines[i])) continue
    const columns = cellCount(lines[i])
    if (columns !== cellCount(lines[i + 1])) continue
    let end = i + 2
    while (end < lines.length && !fenced[end] && lines[end].trim() !== "" && !blockStart.test(lines[end])) end++
    const rows = Array.from({ length: end - i }, (_, k) => i + k)
    for (const row of rows) tableRows.set(row, columns > maxColumns || cellCount(lines[row]) > maxColumns)
    i = end - 1
  }
  const inline: Inline = { stack: [] }
  const out = lines.map((line, i) => {
    if (fenced[i]) return line
    if (line.trim() === "") inline.stack.length = 0
    const wide = tableRows.get(i)
    const above = i === 0 ? undefined : lines[i - 1]
    const setext = /^ {0,3}=+[ \t]*$/.test(line) && above !== undefined && above.trim() !== "" && !fenced[i - 1] &&
      !tableRows.has(i - 1) && !blockStart.test(above) && !/^ {0,3}\[/.test(above)
    return renderLine(line, { tableRow: wide !== undefined, widePipes: wide === true, setext, inline, mentions })
  })
  let text = out.join("\n")
  const files = options.files ?? 0
  if (files > 0) {
    if (fence !== undefined) text += "\n" + fence.char.repeat(fence.length)
    for (let n = 1; n <= files; n++) text += mediaReference(n)
  }
  return text
}
