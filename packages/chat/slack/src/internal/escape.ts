/**
 * Escaping for what the adapter sends Slack.
 *
 * - The Markdown, in a `markdown` block or in `markdown_text`: a `<`
 *   outside inline and fenced code becomes `&lt;`, unless the scoped notify
 *   options allow that token.
 * - The `text` beside a `markdown` block, from which Slack decides who is
 *   mentioned: every `<`, `>` and `&` becomes an entity, in code too, and
 *   only the tokens the block keeps intact stay intact.
 */

/** @internal */
export interface Notify {
  readonly users?: ReadonlyArray<string> | undefined
  readonly groups?: ReadonlyArray<string> | undefined
  readonly broadcast?: boolean | undefined
}

interface Fence {
  readonly char: string
  readonly length: number
}

/**
 * Where an escaper left off: the fence open at the start of the current line,
 * and the raw text of that line consumed so far.
 *
 * @internal
 */
export interface State {
  readonly fence: Fence | undefined
  readonly line: string
}

/** @internal */
export const initialState: State = { fence: undefined, line: "" }

/** @internal */
export interface Escaped {
  /** What to send for the consumed part of the input. */
  readonly sent: string
  /** How many characters of the input were consumed. The rest is held. */
  readonly consumed: number
  readonly state: State
}

/** Past this many held characters, an undecided `<` is escaped anyway. */
const holdBound = 300

const tokenPattern = /^<(@([UW][A-Z0-9]+)|!subteam\^([A-Z0-9]+)|!(here|channel|everyone))(\|[^<>]*)?>/

const allowsAny = (notify: Notify): boolean =>
  (notify.users?.length ?? 0) > 0 || (notify.groups?.length ?? 0) > 0 || notify.broadcast === true

const allowedToken = (rest: string, notify: Notify): number => {
  const match = tokenPattern.exec(rest)
  if (match === null) return 0
  const [token, , user, group, broadcast] = match
  if (user !== undefined) return notify.users?.includes(user) ? token.length : 0
  if (group !== undefined) return notify.groups?.includes(group) ? token.length : 0
  return broadcast !== undefined && notify.broadcast === true ? token.length : 0
}

const openingFence = /^ {0,3}(`{3,}|~{3,})(.*)$/
const closingFence = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/

const opensFence = (line: string): Fence | undefined => {
  const match = openingFence.exec(line)
  if (match === null) return undefined
  const marker = match[1]
  if (marker[0] === "`" && match[2].includes("`")) return undefined
  return { char: marker[0], length: marker.length }
}

const closesFence = (line: string, fence: Fence): boolean => {
  const match = closingFence.exec(line)
  return match !== null && match[1][0] === fence.char && match[1].length >= fence.length
}

const backtickRun = (line: string, start: number): number => {
  let end = start
  while (line[end] === "`") end++
  return end - start
}

/**
 * The code spans of one line, as `[start, end)` pairs, and the position of a
 * backtick run that opens a span the line has not closed yet.
 */
const codeSpans = (line: string): { readonly spans: Array<readonly [number, number]>; readonly open: number } => {
  const spans: Array<readonly [number, number]> = []
  let i = 0
  let open = -1
  while (i < line.length) {
    if (line[i] !== "`") {
      i++
      continue
    }
    const length = backtickRun(line, i)
    let j = i + length
    let closed = -1
    while (j < line.length) {
      if (line[j] === "`") {
        const run = backtickRun(line, j)
        if (run === length) {
          closed = j
          break
        }
        j += run
      } else {
        j++
      }
    }
    if (closed === -1) {
      if (open === -1) open = i
      i += length
    } else {
      spans.push([i, closed + length])
      i = closed + length
    }
  }
  return { spans, open }
}

/**
 * Escapes `text`, continuing from `state`. Without `flush`, a `<` whose
 * meaning the rest of the stream could still change is held: an unclosed
 * token that the notify options might allow, or one after a backtick the line
 * has not closed yet. With `flush`, or once the held text passes a bound,
 * it is escaped.
 *
 * @internal
 */
export const escape = (
  text: string,
  notify: Notify,
  options?: {
    readonly state?: State | undefined
    readonly flush?: boolean | undefined
    /** Write every `<`, `>` and `&` as an entity, apart from allowed tokens. */
    readonly entities?: boolean | undefined
    /** Called with the span in the output of each allowed token kept intact. */
    readonly onToken?: ((start: number, end: number) => void) | undefined
  }
): Escaped => {
  const state = options?.state ?? initialState
  const flush = options?.flush === true
  const entities = options?.entities === true
  const full = state.line + text
  const offset = state.line.length
  const anyAllowed = allowsAny(notify)
  let fence = state.fence
  let out = ""
  let lineStart = 0
  const emit = (from: number, to: number, piece?: string) => {
    if (to <= offset) return
    if (piece !== undefined) out += piece
    else {
      const slice = full.slice(Math.max(from, offset), to)
      out += entities ? textEntities(slice) : slice
    }
  }
  while (lineStart <= full.length) {
    const newline = full.indexOf("\n", lineStart)
    const complete = newline !== -1
    const lineEnd = complete ? newline : full.length
    const line = full.slice(lineStart, lineEnd)
    if (fence !== undefined) {
      emit(lineStart, lineEnd)
      if (complete && closesFence(line, fence)) fence = undefined
    } else {
      const opener = complete ? opensFence(line) : undefined
      const { open, spans } = opener === undefined ? codeSpans(line) : { open: -1, spans: [] }
      let i = 0
      let span = 0
      while (i < line.length) {
        while (span < spans.length && spans[span][1] <= i) span++
        if (span < spans.length && spans[span][0] <= i) {
          emit(lineStart + i, lineStart + spans[span][1])
          i = spans[span][1]
          continue
        }
        const next = line.indexOf("<", i)
        const stop = next === -1 ? line.length : Math.min(next, span < spans.length ? spans[span][0] : line.length)
        if (stop > i) {
          emit(lineStart + i, lineStart + stop)
          i = stop
          continue
        }
        // A `<` outside code.
        const at = lineStart + i
        const rest = line.slice(i)
        const undecided = !flush && !complete && full.length - at <= holdBound && (
          (open !== -1 && open < i) ||
          (anyAllowed && !rest.includes(">") && /^<(@|!)?[\w^|]*$/.test(rest))
        )
        if (undecided) {
          return {
            sent: out,
            consumed: at - offset,
            state: { fence, line: full.slice(lineStart, at) }
          }
        }
        const token = allowedToken(rest, notify)
        if (token > 0) {
          const start = out.length
          emit(at, at + token, at >= offset ? rest.slice(0, token) : undefined)
          if (at >= offset) options?.onToken?.(start, out.length)
          i += token
        } else {
          emit(at, at + 1, at >= offset ? "&lt;" : undefined)
          i += 1
        }
      }
      if (opener !== undefined) fence = opener
    }
    if (!complete) {
      return { sent: out, consumed: full.length - offset, state: { fence, line } }
    }
    emit(lineEnd, lineEnd + 1)
    lineStart = lineEnd + 1
  }
  return { sent: out, consumed: full.length - offset, state: { fence, line: "" } }
}

const entityOf: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" }

const textEntities = (text: string): string => text.replace(/[&<>]/g, (char) => entityOf[char])
