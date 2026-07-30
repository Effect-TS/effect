/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Mailbox from "effect/Mailbox"
import { hasProperty } from "effect/Predicate"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"

const SseErrorTypeId = "@effect/experimental/Sse/SseError"

/**
 * @since 1.0.0
 * @category errors
 */
export class EventTooLarge extends Data.TaggedError("EventTooLarge")<{
  readonly maxEventSize: number
}> {
  override get message() {
    return `Pending SSE event exceeded the maximum size of ${this.maxEventSize}`
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export type SseErrorReason = EventTooLarge

/**
 * @since 1.0.0
 * @category errors
 */
export class SseError extends Data.TaggedError("SseError")<{
  readonly cause: SseErrorReason
}> {
  readonly [SseErrorTypeId] = SseErrorTypeId

  override get message() {
    return this.cause.message
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface DecodeOptions {
  /**
   * Maximum number of string code units retained for a pending event. The default is 10 MiB.
   */
  readonly maxEventSize?: number | undefined
}

const defaultMaxEventSize = 10 * 1024 * 1024

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel = <IE, Done>(
  options?: DecodeOptions & {
    readonly bufferSize?: number
  }
): Channel.Channel<
  Chunk.Chunk<Event>,
  Chunk.Chunk<string>,
  IE,
  IE,
  void,
  Done
> => {
  const events = Mailbox.make<Event, IE | Retry>(options?.bufferSize ?? 16).pipe(
    Effect.map((mailbox) => {
      let events: Array<Event> = []
      let retry: Retry | undefined
      const parser = makeParser((event) => {
        switch (event._tag) {
          case "Retry":
            return (retry = event)
          case "Event":
            return events.push(event)
        }
      }, options)
      const input: AsyncInput.AsyncInputProducer<
        IE,
        Chunk.Chunk<string>,
        Done
      > = {
        awaitRead() {
          return Effect.void
        },
        emit(chunks) {
          let error: SseError | undefined
          Chunk.forEach(chunks, (chunk) => {
            if (error === undefined) {
              error = parser.feed(chunk)
            }
          })
          const toEmit = events
          events = []
          return error
            ? Effect.zipRight(mailbox.offerAll(toEmit), mailbox.failCause(Cause.die(error)))
            : retry
            ? Effect.zipRight(mailbox.offerAll(toEmit), mailbox.fail(retry))
            : mailbox.offerAll(toEmit)
        },
        error(cause) {
          return mailbox.failCause(cause)
        },
        done(_) {
          return mailbox.end
        }
      }
      return Channel.embedInput(Mailbox.toChannel(mailbox), input)
    }),
    Channel.unwrap
  )

  const withRetry: Channel.Channel<
    Chunk.Chunk<Event>,
    Chunk.Chunk<string>,
    IE,
    IE,
    void,
    Done
  > = Channel.catchAll(events, (error) =>
    Retry.is(error) ?
      Effect.sleep(error.duration).pipe(
        Effect.as(withRetry),
        Channel.unwrap
      ) :
      Channel.fail(error))

  return withRetry
}

/**
 * Create a SSE parser.
 *
 * Adapted from https://github.com/rexxars/eventsource-parser under MIT license.
 * `feed` returns an `SseError` if the pending event exceeds `maxEventSize`.
 *
 * @since 1.0.0
 * @category constructors
 */
export function makeParser(onParse: (event: AnyEvent) => void, options?: DecodeOptions): Parser {
  const maxEventSize = options?.maxEventSize ?? defaultMaxEventSize

  // Processing state
  let isFirstChunk: boolean
  let buffer: string
  let startingPosition: number
  let startingFieldLength: number

  // Event state
  let eventId: string | undefined
  let lastEventId: string | undefined
  let eventName: string | undefined
  let data: string

  reset()
  return { feed, reset }

  function reset(): void {
    isFirstChunk = true
    buffer = ""
    startingPosition = 0
    startingFieldLength = -1

    eventId = undefined
    eventName = undefined
    data = ""
  }

  function feed(chunk: string): SseError | undefined {
    buffer = buffer ? buffer + chunk : chunk

    // Strip any UTF8 byte order mark (BOM) at the start of the stream.
    // Note that we do not strip any non - UTF8 BOM, as eventsource streams are
    // always decoded as UTF8 as per the specification.
    if (isFirstChunk && hasBom(buffer)) {
      buffer = buffer.slice(BOM.length)
    }

    isFirstChunk = false

    // Set up chunk-specific processing state
    const length = buffer.length
    let position = 0
    let discardTrailingNewline = false

    // Read the current buffer byte by byte
    while (position < length) {
      // EventSource allows for carriage return + line feed, which means we
      // need to ignore a linefeed character if the previous character was a
      // carriage return
      // @todo refactor to reduce nesting, consider checking previous byte?
      // @todo but consider multiple chunks etc
      if (discardTrailingNewline) {
        if (buffer[position] === "\n") {
          ++position
        }
        discardTrailingNewline = false
      }

      let lineLength = -1
      let fieldLength = startingFieldLength
      let character: string

      for (let index = startingPosition; lineLength < 0 && index < length; ++index) {
        character = buffer[index]
        if (character === ":" && fieldLength < 0) {
          fieldLength = index - position
        } else if (character === "\r") {
          discardTrailingNewline = true
          lineLength = index - position
        } else if (character === "\n") {
          lineLength = index - position
        }
      }

      if (lineLength < 0) {
        startingPosition = length - position
        startingFieldLength = fieldLength
        break
      } else {
        startingPosition = 0
        startingFieldLength = -1
      }

      parseEventStreamLine(buffer, position, fieldLength, lineLength)

      position += lineLength + 1
    }

    if (position === length) {
      // If we consumed the entire buffer to read the event, reset the buffer
      buffer = ""
    } else if (position > 0) {
      // If there are bytes left to process, set the buffer to the unprocessed
      // portion of the buffer only
      buffer = buffer.slice(position)
    }

    if (buffer.length + data.length > maxEventSize) {
      const error = new SseError({ cause: new EventTooLarge({ maxEventSize }) })
      reset()
      return error
    }
  }

  function parseEventStreamLine(
    lineBuffer: string,
    index: number,
    fieldLength: number,
    lineLength: number
  ) {
    if (lineLength === 0) {
      // We reached the last line of this event
      if (data.length > 0) {
        onParse({
          _tag: "Event",
          id: eventId,
          event: eventName ?? "message",
          data: data.slice(0, -1) // remove trailing newline
        })
        data = ""
        eventId = undefined
      }
      eventName = undefined
      return
    }

    const noValue = fieldLength < 0
    const field = lineBuffer.slice(index, index + (noValue ? lineLength : fieldLength))
    let step = 0

    if (noValue) {
      step = lineLength
    } else if (lineBuffer[index + fieldLength + 1] === " ") {
      step = fieldLength + 2
    } else {
      step = fieldLength + 1
    }

    const position = index + step
    const valueLength = lineLength - step
    const value = lineBuffer.slice(position, position + valueLength).toString()

    if (field === "data") {
      data += value ? `${value}\n` : "\n"
    } else if (field === "event") {
      eventName = value
    } else if (field === "id" && !value.includes("\u0000")) {
      eventId = value
      lastEventId = value
    } else if (field === "retry") {
      const retry = parseInt(value, 10)
      if (!Number.isNaN(retry)) {
        onParse(new Retry({ duration: Duration.millis(retry), lastEventId }))
      }
    }
  }
}

const BOM = [239, 187, 191]

function hasBom(buffer: string) {
  return BOM.every((charCode: number, index: number) => buffer.charCodeAt(index) === charCode)
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Parser {
  feed(chunk: string): SseError | undefined
  reset(): void
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Encoder {
  write(event: AnyEvent): string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Event {
  readonly _tag: "Event"
  readonly event: string
  readonly id: string | undefined
  readonly data: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface EventEncoded {
  readonly event: string
  readonly id: string | undefined
  readonly data: string
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const RetryTypeId: unique symbol = Symbol.for("@effect/experimental/Sse/Retry")

/**
 * @since 1.0.0
 * @category type ids
 */
export type RetryTypeId = typeof RetryTypeId

/**
 * @since 1.0.0
 * @category models
 */
export class Retry extends Data.TaggedClass("Retry")<{
  readonly duration: Duration.Duration
  readonly lastEventId: string | undefined
}> {
  /**
   * @since 1.0.0
   */
  readonly [RetryTypeId]: RetryTypeId = RetryTypeId
  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is Retry {
    return hasProperty(u, RetryTypeId)
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export type AnyEvent = Event | Retry

/**
 * @since 1.0.0
 * @category constructors
 */
export const encoder: Encoder = {
  write(event: AnyEvent): string {
    switch (event._tag) {
      case "Event": {
        let data = ""
        if (event.id !== undefined) {
          data += `id: ${event.id}\n`
        }
        if (event.event !== "message") {
          data += `event: ${event.event}\n`
        }
        if (event.data !== "") {
          data += `data: ${event.data.replace(/\n/g, "\ndata: ")}\n`
        }
        return data + "\n"
      }
      case "Retry": {
        return `retry: ${Duration.toMillis(event.duration)}\n\n`
      }
    }
  }
}
