/**
 * Posting long and streamed Markdown through `Chat`.
 *
 * `post` splits Markdown that outgrows one message into parts at block
 * boundaries. `stream` writes a stream of Markdown deltas as it arrives, by
 * the adapter's native stream when it has one and otherwise by posting and
 * then editing. Both sit above the adapter ops and use one splitter.
 *
 * **Example** (Streaming a reply)
 *
 * ```ts
 * import { Effect, Stream } from "effect"
 * import { ChatMarkdown, ChatThread } from "effect/chat"
 *
 * const reply = (deltas: Stream.Stream<string>) =>
 *   Effect.gen(function*() {
 *     const result = yield* ChatMarkdown.stream(ChatThread.make("slack", "T1/C1"), deltas)
 *     return result.parts.map((part) => part.messageId)
 *   })
 * ```
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Data from "../Data.ts"
import type * as DateTime from "../DateTime.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import * as Latch from "../Latch.ts"
import * as Option from "../Option.ts"
import * as Stream from "../Stream.ts"
import * as Chat from "./Chat.ts"
import type { Descriptor, File, NativeStream, Posted } from "./ChatAdapter.ts"
import { Registry } from "./ChatAdapter.ts"
import type { ChatError } from "./ChatError.ts"
import type { ReplyTo } from "./ChatMessage.ts"
import type { ChatThread } from "./ChatThread.ts"

/**
 * One message a call created.
 *
 * **Details**
 *
 * - `markdown` is the Markdown as it went out, with a reopened or closed code
 *   fence and a consumer's unattached note included. It is empty for the
 *   overflow file.
 * - `text` is the slice of the input the part carries, without anything the
 *   layer added. The `text` of every part, in order, is the input.
 * - `transport` is `post` for a part from `post`, `edit` for a streamed
 *   part written by post-then-edit and `native` for one written by the
 *   adapter's native stream, even if it was finished by an edit.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface Part {
  readonly messageId: string
  readonly timestamp: DateTime.Utc
  readonly markdown: string
  readonly text: string
  readonly kind: "text" | "overflowFile"
  readonly transport: "post" | "edit" | "native"
}

/**
 * What a call posted.
 *
 * **Details**
 *
 * - `parts` is empty when the input was empty: nothing is posted.
 * - `stopped` means a user clicked stop on this reply (Slack's stop button).
 *   It can be true with the whole text delivered, when the consumer ignored
 *   the click. It is always false from `post`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface Result {
  readonly parts: ReadonlyArray<Part>
  readonly stopped: boolean
}

/**
 * Error for a call that did not deliver its whole input.
 *
 * **Details**
 *
 * - `posted` is text the platform confirmed, `uncertain` is text sent in a
 *   write that failed `uncertain` and was never confirmed since, and
 *   `remaining` was never sent. The `text` of `posted`, then `uncertain`,
 *   then `remaining` is the input, with nothing in two of them.
 * - `cause` is a `ChatError` from a write, the upstream's error `E`, or
 *   `Overflow` when the input outgrew `maxParts` and the overflow file.
 *
 * **Gotchas**
 *
 * It is not a `Schema.TaggedError`: it is generic in `E` and carries
 * message text. `message` and `toJSON` leave the text out.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.5
 */
export class ChatMarkdownError<E = never> extends Data.TaggedError("ChatMarkdownError")<{
  readonly posted: ReadonlyArray<Part>
  readonly remaining: string
  readonly uncertain?: string | undefined
  readonly cause:
    | { readonly _tag: "Chat"; readonly error: ChatError }
    | { readonly _tag: "Upstream"; readonly error: E }
    | { readonly _tag: "Overflow" }
}> {
  override get message(): string {
    const cause = this.cause._tag === "Chat" ? "Chat(" + this.cause.error.reason._tag + ")" : this.cause._tag
    return "ChatMarkdown failed after " + this.posted.length + " part(s): " + cause
  }

  /**
   * The error without its message text.
   */
  override toJSON(): unknown {
    return {
      _tag: this._tag,
      posted: this.posted.map((part) => ({ messageId: part.messageId, kind: part.kind, transport: part.transport })),
      cause: this.cause._tag === "Chat" ? { _tag: "Chat", error: this.cause.error.toJSON() } : { _tag: this.cause._tag }
    }
  }
}

/**
 * The options `post` and `stream` share.
 *
 * **Details**
 *
 * - `replyTo` applies to the first part.
 * - `maxParts` defaults to 5, a provisional number. Past it, `overflow`
 *   decides: `fail`, the default, or `{ file }`, which sends the rest as one
 *   trailing file message that does not count against `maxParts`.
 * - `minWriteInterval` is the floor between two writes. It defaults to the
 *   adapter's `limits.minWriteInterval`.
 * - `onPart` runs for every message the call creates, the overflow file
 *   included, uninterruptibly with its post, so an interrupt can't lose an id.
 *   It has to be quick.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface Options<R> {
  readonly replyTo?: ReplyTo | undefined
  readonly maxParts?: number | undefined
  readonly overflow?: "fail" | { readonly file: { readonly name: string } } | undefined
  readonly minWriteInterval?: Duration.Duration | undefined
  readonly onPart?: ((part: Part) => Effect.Effect<void, never, R>) | undefined
}

// -----------------------------------------------------------------------------
// Markdown scanning
// -----------------------------------------------------------------------------

interface Fence {
  readonly marker: string
  readonly line: string
}

interface Line {
  /** The index after the line's newline. */
  readonly end: number
  /** The fence open after the line. */
  readonly fence: Fence | undefined
  /** A part can end after this line: it is outside a fence, and blank or closing a fence. */
  readonly boundary: boolean
}

const fencePattern = /^ {0,3}(`{3,}|~{3,})(.*)$/

const fenceAfter = (
  fence: Fence | undefined,
  line: string
): { readonly fence: Fence | undefined; readonly closed: boolean } => {
  const match = fencePattern.exec(line)
  if (match === null) return { fence, closed: false }
  const marker = match[1]
  if (fence === undefined) {
    return marker[0] === "`" && match[2].includes("`")
      ? { fence, closed: false }
      : { fence: { marker, line: line.trimStart() }, closed: false }
  }
  return marker[0] === fence.marker[0] && marker.length >= fence.marker.length && match[2].trim() === ""
    ? { fence: undefined, closed: true }
    : { fence, closed: false }
}

/**
 * The lines of `text`, read from a state of `fence`. Only complete lines
 * count, unless `complete` says the text is finished.
 */
const scanLines = (text: string, fence: Fence | undefined, complete: boolean): Array<Line> => {
  const lines: Array<Line> = []
  let start = 0
  while (start < text.length) {
    const newline = text.indexOf("\n", start)
    if (newline === -1 && !complete) break
    const end = newline === -1 ? text.length : newline + 1
    const line = text.slice(start, newline === -1 ? text.length : newline).replace(/\r$/, "")
    const step = fenceAfter(fence, line)
    fence = step.fence
    lines.push({ end, fence, boundary: fence === undefined && (step.closed || line.trim() === "") })
    start = end
  }
  return lines
}

const fenceAt = (lines: ReadonlyArray<Line>, initial: Fence | undefined, index: number): Fence | undefined => {
  let fence = initial
  for (const line of lines) {
    if (line.end > index) break
    fence = line.fence
  }
  return fence
}

const closing = (fence: Fence | undefined, markdown: string): string =>
  fence === undefined ? "" : (markdown === "" || markdown.endsWith("\n") ? "" : "\n") + fence.marker

const reopening = (fence: Fence | undefined): string => fence === undefined ? "" : fence.line + "\n"

const isBlank = (text: string) => text.trim() === ""

/** Markdown for `text` written as a whole message: an open fence is closed. */
const render = (prefix: string, text: string, fence: Fence | undefined): string => {
  const markdown = prefix + text
  return markdown + closing(fenceAt(scanLines(text, fence, true), fence, text.length), markdown)
}

/**
 * Where to cut `text` so that `prefix`, the cut text and a closing fence
 * measure at most `room`: after the last block boundary that fits, else after
 * the last line, else after the last whitespace, else at the last character.
 * Never inside a surrogate pair, and never at 0.
 */
const fitCut = (
  measure: (markdown: string) => number,
  text: string,
  fence: Fence | undefined,
  prefix: string,
  room: number
): number => {
  const lines = scanLines(text, fence, false)
  const size = (cut: number) => {
    const markdown = prefix + text.slice(0, cut)
    return measure(markdown + closing(fenceAt(lines, fence, cut), markdown))
  }
  const fits = (cut: number) => size(cut) <= room
  let low = 0
  let high = text.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (fits(middle)) low = middle
    else high = middle - 1
  }
  const most = low
  const candidates: Array<number> = []
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].boundary && lines[i].end <= most) candidates.push(lines[i].end)
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].end <= most) candidates.push(lines[i].end)
  }
  for (let i = most - 1; i > 0; i--) {
    if (/\s/.test(text[i])) {
      candidates.push(i + 1)
      break
    }
  }
  candidates.push(most)
  for (const candidate of candidates) {
    const cut = withoutSplitPair(text, candidate)
    if (cut > 0 && fits(cut)) return cut
  }
  return Math.max(1, withoutSplitPair(text, most) || codePointEnd(text))
}

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff

const withoutSplitPair = (text: string, cut: number): number =>
  cut > 0 && cut < text.length && isHighSurrogate(text.charCodeAt(cut - 1)) ? cut - 1 : cut

const codePointEnd = (text: string): number => isHighSurrogate(text.charCodeAt(0)) && text.length > 1 ? 2 : 1

/** Past this many held characters, a held line is released up to its last whitespace. */
const holdLimit = 300

/**
 * What an append may send of `pending` before the input is finished: up to
 * the last complete line, unless inside a code fence.
 */
const releasable = (pending: string, fence: Fence | undefined): string => {
  const lines = scanLines(pending, fence, false)
  const complete = lines.length === 0 ? 0 : lines[lines.length - 1].end
  if (fenceAt(lines, fence, complete) !== undefined) return pending
  const tail = pending.slice(complete)
  if (tail.length <= holdLimit) return pending.slice(0, complete)
  const space = tail.search(/\s\S*$/)
  return space === -1 ? pending : pending.slice(0, complete + space + 1)
}

const utf8Length = (text: string): number => {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code >= 0xd800 && code <= 0xdfff ? 2 : 3
  }
  return bytes
}

// -----------------------------------------------------------------------------
// the reply
// -----------------------------------------------------------------------------

const defaultMaxParts = 5
/** Consecutive `retry` failures of appends on one stream before the repair. Provisional. */
const appendRetryLimit = 3
/** A native stream rolls over at the next block boundary past this share of `streamLength`. */
const softShare = 0.85
/** A native stream rotates once it is this share of `streamAge` old. */
const ageShare = 0.8
/** How long finishing a failed or interrupted reply may take. */
const finishTimeout = Duration.seconds(5)

type FailureCause<E> = ChatMarkdownError<E>["cause"]

interface Current {
  readonly start: number
  readonly fence: Fence | undefined
  readonly prefix: string
  readonly transport: Part["transport"]
  /** Appending to an open native stream. */
  native: boolean
  posted: Posted | undefined
  /** The input index the platform confirmed up to. */
  confirmed: number
  /** The input index a write that failed `uncertain` reached. */
  uncertain: number
  /** Native: the input index appended up to. */
  sent: number
  /** The input length when this part was last written. */
  attempted: number
  /** The Markdown the platform last confirmed. */
  markdown: string
  /** Native: what has been appended, by `measure`. */
  measured: number
  startedAt: number
  retries: number
}

interface ReplyOptions<E, R, R2> extends Options<R2> {
  readonly thread: ChatThread
  readonly initial: string
  readonly deltas?: Stream.Stream<string, E, R> | undefined
  readonly descriptor: Descriptor
  readonly chat: Chat.Chat["Service"]
  readonly native?: NativeStream | undefined
  readonly recipient?: string | undefined
  readonly files?: ReadonlyArray<File> | undefined
  readonly unattachedNote?: ((files: ReadonlyArray<File>) => string) | undefined
}

const firstError = <A>(exit: Exit.Exit<A, ChatError>): ChatError | undefined =>
  Option.getOrUndefined(Exit.findErrorOption(exit))

const reply = <E, R, R2>(options: ReplyOptions<E, R, R2>): Effect.Effect<Result, ChatMarkdownError<E>, R | R2> =>
  Effect.suspend(() => {
    const { chat, descriptor, thread } = options
    const measure = descriptor.measure
    const limits = descriptor.limits
    const interval = Duration.toMillis(options.minWriteInterval ?? limits.minWriteInterval)
    const maxParts = Math.max(1, options.maxParts ?? defaultMaxParts)
    const overflow = options.overflow ?? "fail"
    const streamLength = Math.min(limits.streamLength ?? limits.messageLength, limits.messageLength)
    const streamAge = limits.streamAge === undefined ? undefined : Duration.toMillis(limits.streamAge)
    const onPart = options.onPart ?? (() => Effect.void)
    const native = options.native
    const latch = Latch.makeUnsafe(false)

    let input = options.initial
    let upstream: Exit.Exit<void, E> | undefined = options.deltas === undefined ? Exit.void : undefined
    let state: { readonly _tag: "Running" } | { readonly _tag: "Done"; readonly stopped: boolean } | {
      readonly _tag: "Failed"
      readonly cause: FailureCause<E>
    } = { _tag: "Running" }
    let finishing = false
    let nativeAllowed = native !== undefined && options.recipient !== undefined
    let renderedNatively = false
    let lastWrite = Number.NEGATIVE_INFINITY
    let retryAt: number | undefined
    let overflowStart: number | undefined
    let overflowBytes = 0
    let overflowUncertain = false
    let note: string | undefined
    const parts: Array<Part> = []

    const isRunning = () => state._tag === "Running"
    const fail = (cause: FailureCause<E>) => {
      if (isRunning()) state = { _tag: "Failed", cause }
    }
    const failChat = (error: ChatError) => fail({ _tag: "Chat", error })
    const done = (stopped: boolean) => {
      if (isRunning()) state = { _tag: "Done", stopped }
    }

    const newPart = (start: number, fence: Fence | undefined): Current => ({
      start,
      fence,
      prefix: reopening(fence),
      transport: options.deltas === undefined ? "post" : nativeAllowed ? "native" : "edit",
      native: nativeAllowed,
      posted: undefined,
      confirmed: start,
      uncertain: start,
      sent: start,
      attempted: -1,
      markdown: "",
      measured: 0,
      startedAt: 0,
      retries: 0
    })

    let current = newPart(0, undefined)

    const toPart = (part: Current, posted: Posted, markdown: string, end: number): Part => ({
      messageId: posted.id,
      timestamp: posted.timestamp,
      markdown,
      text: input.slice(part.start, end),
      kind: "text",
      transport: part.transport
    })

    /** The open fence at `index` of the input, read from the current part's complete lines. */
    const fenceAtInput = (part: Current, index: number): Fence | undefined => {
      const text = input.slice(part.start, index)
      return fenceAt(scanLines(text, part.fence, false), part.fence, text.length)
    }

    const now = Clock.currentTimeMillis

    /** Waits for the floor since the previous write returned. */
    const pace: Effect.Effect<void> = Effect.flatMap(now, (time) => {
      const wait = lastWrite + interval - time
      return wait > 0 ? Effect.sleep(Duration.millis(wait)) : Effect.void
    })
    const wrote = Effect.flatMap(now, (time) => Effect.sync(() => void (lastWrite = time)))

    const write = <A>(effect: Effect.Effect<A, ChatError>): Effect.Effect<Exit.Exit<A, ChatError>> =>
      Effect.andThen(pace, Effect.ensuring(Effect.exit(effect), wrote))

    /** Creates a message and runs `onPart` for it, as one uninterruptible step. */
    const create = (
      effect: Effect.Effect<Posted, ChatError>,
      part: (posted: Posted) => Part
    ): Effect.Effect<Exit.Exit<Posted, ChatError>, never, R2> =>
      Effect.andThen(
        pace,
        Effect.uninterruptible(
          Effect.ensuring(Effect.exit(Effect.tap(effect, (posted) => onPart(part(posted)))), wrote)
        )
      )

    const finishPart = (end: number) => {
      const part = current
      parts.push(toPart(part, part.posted!, part.markdown, end))
      current = newPart(end, fenceAtInput(part, end))
      if (parts.length >= maxParts) {
        overflowStart = end
        overflowBytes = utf8Length(input.slice(end))
      }
    }

    // --- post-then-edit --------------------------------------------------------

    /** Writes the current part as `input[start, end)`. `last` marks the part's final write. */
    const writeEdit = (end: number, last: boolean): Effect.Effect<void, never, R2> =>
      Effect.suspend(() => {
        const part = current
        const markdown = render(part.prefix, input.slice(part.start, end), part.fence)
        part.attempted = input.length
        if (part.posted === undefined) return postPart(part, end, markdown, last)
        if (part.confirmed === end && part.markdown === markdown) return Effect.void
        const edit = chat.edit(thread, part.posted.id, { markdown })
        return Effect.map(write(last ? edit : Chat.withoutRetries(edit)), (exit) => {
          if (Exit.isSuccess(exit)) {
            part.confirmed = part.uncertain = end
            part.markdown = markdown
            return
          }
          const error = firstError(exit)
          if (error === undefined) return
          if (error.retry === "uncertain") part.uncertain = Math.max(part.uncertain, end)
          if (last || error.retry === "denied") failChat(error)
        })
      })

    const postPart = (part: Current, end: number, markdown: string, last: boolean): Effect.Effect<void, never, R2> => {
      const files = last && end === input.length && upstream !== undefined && (options.files?.length ?? 0) > 0
        ? options.files
        : undefined
      const attempt = (markdown: string, files: ReadonlyArray<File> | undefined) =>
        create(
          chat.post(thread, {
            markdown,
            ...(parts.length === 0 && options.replyTo !== undefined ? { replyTo: options.replyTo } : {}),
            ...(files === undefined ? {} : { files })
          }),
          (posted) => toPart(part, posted, markdown, end)
        )
      const settle = (exit: Exit.Exit<Posted, ChatError>, markdown: string) => {
        if (Exit.isSuccess(exit)) {
          part.posted = exit.value
          part.markdown = markdown
          part.confirmed = part.uncertain = end
          return
        }
        const error = firstError(exit)
        if (error === undefined) return
        if (error.retry === "uncertain") part.uncertain = end
        failChat(error)
      }
      return Effect.flatMap(attempt(markdown, files), (exit) => {
        const error = firstError(exit)
        if (files === undefined || options.unattachedNote === undefined || error?.retry !== "denied") {
          return Effect.sync(() => settle(exit, markdown))
        }
        // The platform refused the files: the last part goes out without them, ending in the note.
        const text = options.unattachedNote(files)
        if (measure(markdown + text) <= limits.messageLength) {
          return Effect.map(attempt(markdown + text, undefined), (exit) => settle(exit, markdown + text))
        }
        note = text
        return Effect.map(attempt(markdown, undefined), (exit) => settle(exit, markdown))
      })
    }

    /** Posts an unattached note that did not fit the last part as a message of its own. */
    const postNote = (text: string): Effect.Effect<void, never, R2> =>
      Effect.map(
        create(chat.post(thread, { markdown: text }), (posted) => ({
          messageId: posted.id,
          timestamp: posted.timestamp,
          markdown: text,
          text: "",
          kind: "text",
          transport: "post"
        })),
        (exit) => {
          if (Exit.isSuccess(exit)) {
            parts.push({
              messageId: exit.value.id,
              timestamp: exit.value.timestamp,
              markdown: text,
              text: "",
              kind: "text",
              transport: "post"
            })
            return done(false)
          }
          const error = firstError(exit)
          if (error !== undefined) failChat(error)
        }
      )

    const stepEdit = (final: boolean): Effect.Effect<void, never, R2> =>
      Effect.suspend(() => {
        const part = current
        const body = input.slice(part.start)
        const withFiles = parts.length === 0 && (options.files?.length ?? 0) > 0
        if (part.posted === undefined && isBlank(body) && !(final && withFiles)) {
          if (final) done(false)
          return Effect.void
        }
        if (measure(render(part.prefix, body, part.fence)) > limits.messageLength) {
          const cut = part.start + fitCut(measure, body, part.fence, part.prefix, limits.messageLength)
          return Effect.map(writeEdit(cut, true), () => {
            if (isRunning()) finishPart(cut)
          })
        }
        return Effect.flatMap(writeEdit(input.length, final), () => {
          if (!final || !isRunning()) return Effect.void
          finishPart(input.length)
          if (note !== undefined) return postNote(note)
          done(false)
          return Effect.void
        })
      })

    // --- native ----------------------------------------------------------------

    /** Stops the native stream and says whether a user had clicked stop. A stop carries no text, so its failures are ignored. */
    const stopStream = (part: Current, end: "done" | "rotating"): Effect.Effect<boolean> =>
      Effect.suspend(() => {
        part.native = false
        if (part.posted === undefined) return Effect.succeed(false)
        return Effect.map(write(native!.stop(thread, part.posted.id, { end })), (exit) =>
          Exit.isSuccess(exit) && exit.value.stopped)
      })

    /** Ends a native part at `end`. The reply ends when `last`, or when a user had clicked stop. */
    const rollNative = (part: Current, end: number, last: boolean): Effect.Effect<void> =>
      Effect.map(stopStream(part, last ? "done" : "rotating"), (stopped) => {
        finishPart(end)
        if (stopped || last) done(stopped)
      })

    const startNative = (final: boolean): Effect.Effect<void, never, R2> =>
      Effect.suspend(() => {
        const part = current
        const pending = input.slice(part.start)
        const text = final ? pending : releasable(pending, part.fence)
        if (isBlank(text)) {
          if (final) done(false)
          return Effect.void
        }
        part.attempted = input.length
        const whole = render(part.prefix, text, part.fence)
        const cut = measure(whole) > streamLength
          ? fitCut(measure, text, part.fence, part.prefix, streamLength)
          : text.length
        const end = part.start + cut
        const roll = cut < text.length
        const markdown = roll || final ? render(part.prefix, text.slice(0, cut), part.fence) : part.prefix + text
        return Effect.flatMap(
          create(
            native!.start(thread, {
              markdown,
              ...(parts.length === 0 && options.replyTo !== undefined ? { replyTo: options.replyTo } : {}),
              recipient: options.recipient
            }),
            (posted) => toPart(part, posted, markdown, end)
          ),
          (exit): Effect.Effect<void> => {
            if (Exit.isFailure(exit)) {
              const error = firstError(exit)
              if (error === undefined) return Effect.void
              return Effect.sync(() => {
                if (error.reason._tag === "Unsupported" && !renderedNatively) {
                  nativeAllowed = false
                  current = newPart(part.start, part.fence)
                  return
                }
                if (error.retry === "uncertain") part.uncertain = end
                failChat(error)
              })
            }
            renderedNatively = true
            part.posted = exit.value
            part.markdown = markdown
            part.measured = measure(markdown)
            part.confirmed = part.uncertain = part.sent = end
            return Effect.flatMap(now, (time) => {
              part.startedAt = time
              return roll || final ? rollNative(part, end, !roll) : Effect.void
            })
          }
        )
      })

    /** What the next append sends, and whether the part ends after it. */
    const nextAppend = (part: Current, final: boolean) => {
      const pending = input.slice(part.sent)
      const fence = fenceAtInput(part, part.sent)
      const room = streamLength - part.measured
      const soft = softShare * streamLength - part.measured
      const lines = scanLines(pending, fence, false)
      let piece = final ? pending : releasable(pending, fence)
      let extra = final
        ? closing(fenceAt(scanLines(pending, fence, true), fence, pending.length), part.markdown + pending)
        : ""
      let roll = false
      if (measure(piece + extra) > soft) {
        let boundary: number | undefined
        for (const line of lines) {
          if (!line.boundary) continue
          const size = measure(pending.slice(0, line.end))
          if (size > room) break
          if (size >= soft) {
            boundary = line.end
            break
          }
        }
        if (boundary !== undefined) {
          piece = pending.slice(0, boundary)
          extra = ""
          roll = true
        } else if (measure(piece + extra) > room) {
          const cut = fitCut(measure, pending, fence, "", room)
          piece = pending.slice(0, cut)
          extra = closing(fenceAt(lines, fence, cut), part.markdown + piece)
          roll = true
        }
      }
      return { piece, extra, roll, fits: measure(piece + extra) <= room }
    }

    const appendNative = (final: boolean): Effect.Effect<void, never, R2> =>
      Effect.suspend(() => {
        const part = current
        const { extra, fits, piece, roll } = nextAppend(part, final)
        if (piece === "" && extra === "") return final ? rollNative(part, part.sent, true) : Effect.void
        // Not even the smallest cut fits what is left of the stream: the next part takes it.
        if (!fits) return rollNative(part, part.sent, false)
        part.attempted = input.length
        const markdown = piece + extra
        return Effect.flatMap(
          write(native!.append(thread, part.posted!.id, markdown, { flush: final || roll })),
          (exit): Effect.Effect<void, never, R2> => {
            if (Exit.isSuccess(exit)) {
              const { held, state } = exit.value
              if (state === "stopped") {
                return Effect.sync(() => {
                  part.native = false
                  finishPart(part.sent)
                  done(true)
                })
              }
              if (state === "closed") {
                return Effect.sync(() => {
                  part.native = false
                  part.attempted = -1
                })
              }
              const added = Math.max(0, markdown.length - held)
              part.retries = 0
              part.sent += Math.min(piece.length, added)
              part.confirmed = part.uncertain = part.sent
              part.markdown += markdown.slice(0, added)
              part.measured += measure(markdown.slice(0, added))
              return roll || (final && part.sent === input.length) ? rollNative(part, part.sent, !roll) : Effect.void
            }
            const error = firstError(exit)
            if (error === undefined) return Effect.void
            if (error.reason._tag === "TooLarge") return rollNative(part, part.sent, false)
            if (error.retry === "retry") {
              part.retries++
              if (part.retries >= appendRetryLimit) return repair(part)
              const wait = error.retryAfter === undefined ? interval : Duration.toMillis(error.retryAfter)
              return Effect.flatMap(now, (time) => Effect.sync(() => void (retryAt = time + wait)))
            }
            if (error.retry === "uncertain") {
              part.uncertain = part.sent + piece.length
              return repair(part)
            }
            return Effect.andThen(stopStream(part, "done"), Effect.sync(() => failChat(error)))
          }
        )
      })

    /** Stops the stream, edits the part to its whole known text and carries on by post-then-edit. */
    const repair = (part: Current): Effect.Effect<void, never, R2> =>
      Effect.flatMap(
        stopStream(part, "rotating"),
        (stopped) =>
          Effect.map(writeEdit(Math.max(part.uncertain, part.sent), false), () => {
            if (stopped && isRunning()) {
              finishPart(part.confirmed)
              done(true)
            }
          })
      )

    const stepNative = (final: boolean): Effect.Effect<void, never, R2> =>
      Effect.suspend(() => {
        const part = current
        if (part.posted === undefined) return startNative(final)
        if (final || streamAge === undefined) return appendNative(final)
        return Effect.flatMap(now, (time) =>
          time - part.startedAt >= ageShare * streamAge
            ? rollNative(part, part.sent, false)
            : appendNative(final))
      })

    // --- overflow --------------------------------------------------------------

    const stepOverflow = (final: boolean): Effect.Effect<void, never, R2> =>
      Effect.suspend(() => {
        const rest = input.slice(overflowStart!)
        if (isBlank(rest)) {
          if (final) done(false)
          return Effect.void
        }
        if (overflow === "fail" || overflowBytes > limits.uploadBytes) {
          fail({ _tag: "Overflow" })
          return Effect.void
        }
        // The upload is skipped when the reply failed or was interrupted.
        if (!final || finishing) {
          if (finishing) done(false)
          return Effect.void
        }
        const file: File = {
          name: overflow.file.name,
          contentType: "text/markdown",
          content: new TextEncoder().encode(rest)
        }
        const part = (posted: Posted): Part => ({
          messageId: posted.id,
          timestamp: posted.timestamp,
          markdown: "",
          text: rest,
          kind: "overflowFile",
          transport: "post"
        })
        return Effect.map(create(chat.post(thread, { markdown: "", files: [file] }), part), (exit) => {
          if (Exit.isSuccess(exit)) {
            parts.push(part(exit.value))
            overflowStart = input.length
            return done(false)
          }
          const error = firstError(exit)
          if (error === undefined) return
          overflowUncertain = error.retry === "uncertain"
          failChat(error)
        })
      })

    // --- the loop --------------------------------------------------------------

    const hasWork = (): boolean => {
      if (!isRunning() || upstream !== undefined) return true
      if (overflowStart !== undefined) {
        return !isBlank(input.slice(overflowStart)) && (overflow === "fail" || overflowBytes > limits.uploadBytes)
      }
      const part = current
      if (input.length <= part.attempted) return false
      if (!part.native) return !isBlank(input.slice(part.start))
      return part.posted === undefined
        ? !isBlank(releasable(input.slice(part.start), part.fence))
        : releasable(input.slice(part.sent), fenceAtInput(part, part.sent)) !== ""
    }

    /** Waits until there is something to write, or a retry is due. */
    const awaitWork: Effect.Effect<void> = Effect.suspend(() => {
      if (retryAt !== undefined) {
        const at = retryAt
        retryAt = undefined
        return Effect.flatMap(now, (time) => time < at ? Effect.sleep(Duration.millis(at - time)) : Effect.void)
      }
      if (hasWork()) return Effect.void
      latch.closeUnsafe()
      return Effect.andThen(latch.await, awaitWork)
    })

    const step = (final: boolean): Effect.Effect<void, never, R2> => {
      if (overflowStart !== undefined) return stepOverflow(final)
      return current.native ? stepNative(final) : stepEdit(final)
    }

    const loop: Effect.Effect<void, never, R2> = Effect.suspend(() =>
      isRunning() ?
        Effect.flatMap(awaitWork, () => {
          if (!isRunning() || (upstream !== undefined && Exit.isFailure(upstream))) return Effect.void
          // The write takes whatever arrived while it waited for the floor.
          return Effect.andThen(pace, Effect.suspend(() => step(upstream !== undefined))).pipe(Effect.andThen(loop))
        }) :
        Effect.void
    )

    /** Writes what was received as the end of the reply, closing an open fence, within a short timeout. */
    const finish: Effect.Effect<void, never, R2> = Effect.suspend(() => {
      finishing = true
      const drain: Effect.Effect<void, never, R2> = Effect.suspend(() =>
        isRunning() ? Effect.andThen(step(true), drain) : Effect.void
      )
      // Interruptible, so the timeout can cut it short when it runs in the interrupt finalizer.
      return Effect.asVoid(Effect.timeoutOption(Effect.interruptible(drain), finishTimeout))
    })

    const toError = (cause: FailureCause<E>): ChatMarkdownError<E> => {
      const posted = parts.slice()
      let uncertain = ""
      let from: number
      if (overflowStart !== undefined) {
        from = overflowStart
        if (overflowUncertain) {
          uncertain = input.slice(from)
          from = input.length
        }
      } else {
        const part = current
        if (part.posted !== undefined) posted.push(toPart(part, part.posted, part.markdown, part.confirmed))
        from = Math.max(part.confirmed, part.uncertain)
        uncertain = input.slice(part.confirmed, from)
      }
      return new ChatMarkdownError<E>({
        posted,
        remaining: input.slice(from),
        ...(uncertain === "" ? {} : { uncertain }),
        cause
      })
    }

    const consume: Effect.Effect<void, never, R> = options.deltas === undefined
      ? Effect.void
      : Effect.flatMap(
        Effect.exit(Stream.runForEach(options.deltas, (chunk) =>
          Effect.sync(() => {
            input += chunk
            if (overflowStart !== undefined) overflowBytes += utf8Length(chunk)
            latch.openUnsafe()
          }))),
        (exit) =>
          Effect.sync(() => {
            upstream = exit
            latch.openUnsafe()
          })
      )

    return Effect.gen(function*() {
      const fiber = yield* Effect.forkChild(consume)
      yield* Effect.onInterrupt(loop, () => Effect.andThen(Fiber.interrupt(fiber), finish))
      yield* Fiber.interrupt(fiber)
      if (upstream !== undefined && Exit.isFailure(upstream) && (isRunning() || state._tag === "Done")) {
        const cause = upstream.cause
        state = { _tag: "Running" }
        yield* finish
        const error = Cause.findErrorOption(cause)
        if (Option.isNone(error)) return yield* Effect.failCause(cause as Cause.Cause<never>)
        state = { _tag: "Failed", cause: { _tag: "Upstream", error: error.value } }
      }
      yield* Effect.annotateCurrentSpan("chat.markdown.transport", renderedNatively ? "native" : current.transport)
      if (state._tag === "Failed") return yield* Effect.fail(toError(state.cause))
      return { parts, stopped: state._tag === "Done" && state.stopped }
    })
  })

// -----------------------------------------------------------------------------
// the calls
// -----------------------------------------------------------------------------

/**
 * Posts Markdown of any length, split into as many messages as it needs.
 *
 * **Details**
 *
 * - A part ends at a block boundary: after a blank line or a closed code
 *   fence. A block too long for one message is cut at a line, closing the code
 *   fence it is in and reopening it in the next part. Length is measured with
 *   the adapter's `measure`.
 * - Each part is posted once and never edited. Parts are paced by
 *   `minWriteInterval`.
 * - `files` go with the last part. When the platform refuses them with a
 *   `denied` failure and `unattachedNote` is given, the last part goes out
 *   without them, ending in the note, or followed by the note when it does not
 *   fit. Without `unattachedNote` the refusal fails the call.
 * - An empty input posts nothing and succeeds with no parts, unless there are
 *   files, which then go out in a message of their own.
 *
 * **Gotchas**
 *
 * A failure in the middle leaves the parts already posted in place. The error
 * says what was posted and what was not.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const post = <R = never>(
  thread: ChatThread,
  markdown: string,
  options?: Options<R> & {
    readonly files?: ReadonlyArray<File> | undefined
    readonly unattachedNote?: ((files: ReadonlyArray<File>) => string) | undefined
  }
): Effect.Effect<Result, ChatMarkdownError, Chat.Chat | R> =>
  Effect.gen(function*() {
    const chat = yield* Chat.Chat
    const descriptor = yield* Effect.mapError(
      chat.descriptor(thread.platform),
      (error) => new ChatMarkdownError<never>({ posted: [], remaining: markdown, cause: { _tag: "Chat", error } })
    )
    return yield* reply<never, never, R>({ ...options, thread, initial: markdown, descriptor, chat })
  }).pipe(Effect.withSpan("ChatMarkdown.post", { attributes: { "chat.platform": thread.platform } }))

/**
 * Writes a stream of Markdown deltas as one reply, as the text arrives.
 *
 * **Details**
 *
 * - With a `recipient` and an adapter that has a native stream, the reply is
 *   written by native appends. Otherwise, or when the first native start fails
 *   with `Unsupported`, it posts and then edits. The result and the span say
 *   which ran.
 * - Text that outgrows a message rolls over into a new one at a block
 *   boundary, and each new message counts against `maxParts`. A native stream
 *   rolls over at the next block boundary past 85% of `limits.streamLength`,
 *   and rotates once it is 80% of `limits.streamAge` old.
 * - Writes are paced by `minWriteInterval`, on `Clock`. The next write is
 *   scheduled only after the previous one returns, and takes all the text that
 *   arrived meanwhile.
 * - An append holds back the unfinished last line, unless inside a code fence.
 *   An edit closes an open code fence.
 * - An intermediate edit that fails `retry` or `uncertain` is dropped, since
 *   the next edit carries the whole text. A `denied` failure, and any failure
 *   of a post or of a part's last edit, fails the reply.
 * - A native append that fails `retry` is tried again after its
 *   `retryAfter`, or the write interval, whether or not new text arrived.
 *   Three in a row, or one `uncertain` failure, stop the stream, edit the part
 *   to its whole known text and carry on by post-then-edit. `TooLarge` starts
 *   the next part with the chunk.
 * - `Result.stopped` is true when a user clicked stop on the reply. The
 *   upstream is then interrupted.
 * - When the upstream fails or the call is interrupted, what was received is
 *   written out, with an open code fence closed, within a short timeout, and
 *   left posted.
 *
 * **Gotchas**
 *
 * - There are no files: post them after the result, when it is known whether
 *   the reply stopped.
 * - To stop a reply, end `deltas` with `Stream.interruptWhen` or
 *   `Stream.haltWhen`, so a `Result` still comes back. Interrupting the call
 *   leaves only the ids collected through `onPart`.
 * - Native writes go to the adapter through the `Registry`, so a layer that
 *   wraps `Chat` does not see them.
 * - A native part that is rolled over on `TooLarge` or rotated on age can end
 *   inside an open code fence, since it can no longer be appended to. The next
 *   part reopens the fence.
 * - Post-then-edit needs the `edit` capability.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const stream = <E, R, R2 = never>(
  thread: ChatThread,
  deltas: Stream.Stream<string, E, R>,
  options?: Options<R2> & {
    readonly recipient?: string | undefined
  }
): Effect.Effect<Result, ChatMarkdownError<E>, Chat.Chat | Registry | R | R2> =>
  Effect.gen(function*() {
    const chat = yield* Chat.Chat
    const registry = yield* Registry
    const adapter = yield* Effect.mapError(
      registry.get(thread.platform),
      (error) => new ChatMarkdownError<E>({ posted: [], remaining: "", cause: { _tag: "Chat", error } })
    )
    const native = adapter.descriptor.capabilities.has("nativeStream") ? adapter.nativeStream : undefined
    return yield* reply<E, R, R2>({
      ...options,
      thread,
      initial: "",
      deltas,
      descriptor: adapter.descriptor,
      chat,
      native
    })
  }).pipe(Effect.withSpan("ChatMarkdown.stream", { attributes: { "chat.platform": thread.platform } }))
