/**
 * Encodes and decodes a single JSON array as a stream of its elements.
 *
 * **Details**
 *
 * Use `Json` when a large response or file is one JSON document, such as
 * `[...]` or `{"items":[...],"total":n}`, and its elements should be processed
 * without buffering the whole document. Use `Ndjson` when the producer writes
 * one JSON value per line.
 *
 * Decoders stream the elements of one array, the root array by default or the
 * array selected by an RFC 6901 JSON Pointer. Each element is buffered only
 * until it is complete and then parsed with `JSON.parse`. The rest of the
 * document is validated and discarded. Decoders strip a leading BOM.
 * Encoders write a stream of values as one JSON array.
 *
 * **Example** (Streaming the items of a large HTTP response)
 *
 * ```ts
 * import { Effect, Schema, Stream } from "effect"
 * import { Json } from "effect/encoding"
 * import { HttpClient, HttpClientResponse } from "effect/http"
 *
 * const User = Schema.Struct({ id: Schema.Number, name: Schema.String })
 *
 * // The response body is {"data":[{"id":1,"name":"Alice"},...],"total":...}
 * const program = HttpClientResponse.stream(HttpClient.get("https://example.com/users")).pipe(
 *   Stream.pipeThroughChannel(Json.decodeSchema(User)({ pointer: "/data" })),
 *   Stream.runForEach((user) => Effect.log(user.name))
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Channel from "../Channel.ts"
import * as ChannelSchema from "../ChannelSchema.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import * as JsonPointer from "../JsonPointer.ts"
import * as Predicate from "../Predicate.ts"
import * as Pull from "../Pull.ts"
import type * as Schema from "../Schema.ts"

const JsonErrorTypeId = "~effect/encoding/Json/JsonError"

const textEncoder = new TextEncoder()

/**
 * Error raised when JSON stream encoding or decoding fails.
 *
 * **Details**
 *
 * - `Syntax`: the input is not valid JSON, including an empty input or
 *   content after the document.
 * - `Limit`: a value exceeds `maxDepth` or `maxElementSize`.
 * - `Pointer`: the pointer target is missing or not an array, a value along the
 *   pointer is not an object or array, or an object along the pointer repeats
 *   the key that the pointer follows.
 * - `Encode`: a value has no JSON representation.
 *
 * Decoding errors set `offset`, a zero-based offset in UTF-16 code units into
 * the decoded text after any leading BOM, and the one-based `line` and
 * `column` of that offset. Line breaks are LF, CRLF and CR. When `JSON.parse`
 * rejects a value, the position is the start of that value. `Encode` errors
 * have no position.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class JsonError extends Data.TaggedError("JsonError")<{
  readonly kind: "Syntax" | "Limit" | "Pointer" | "Encode"
  readonly message: string
  readonly offset?: number | undefined
  readonly line?: number | undefined
  readonly column?: number | undefined
}> {
  /**
   * Identifies JSON stream errors across module instances.
   *
   * @stability unstable
   * @since 4.0.6
   */
  readonly [JsonErrorTypeId] = JsonErrorTypeId
}

/**
 * Checks whether a value is a `JsonError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.6
 */
export const isJsonError = (u: unknown): u is JsonError => Predicate.hasProperty(u, JsonErrorTypeId)

/**
 * JSON stream decoding options.
 *
 * **Details**
 *
 * - `pointer`: an RFC 6901 JSON Pointer to the array to stream, such as
 *   `"/data"`. Defaults to `""`, the root. Tokens select object members by
 *   key and array elements by index.
 * - `maxDepth`: the maximum nesting of arrays and objects in one element,
 *   where an array or object element has depth 1. Defaults to 1000.
 * - `maxElementSize`: the maximum length of one element in UTF-16 code units.
 *   Defaults to 16 MiB; `Infinity` disables the limit.
 * - `reviver`: passed to `JSON.parse` for each element, so the element is the
 *   root of each call and is revived with the key `""`. An element revived
 *   to `undefined` is emitted as `undefined`. Errors thrown by the reviver
 *   are defects.
 *
 * Both limits also apply to values outside the selected array. Invalid options
 * throw when the channel is created.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.6
 */
export interface DecodeOptions {
  readonly pointer?: string | undefined
  readonly maxDepth?: number | undefined
  readonly maxElementSize?: number | undefined
  readonly reviver?: Parameters<typeof JSON.parse>[1] | undefined
}

const defaultMaxDepth = 1000
const defaultMaxElementSize = 16 * 1024 * 1024

const TAB = 9
const LF = 10
const CR = 13
const SPACE = 32
const QUOTE = 34
const COMMA = 44
const COLON = 58
const LBRACKET = 91
const BACKSLASH = 92
const RBRACKET = 93
const LBRACE = 123
const RBRACE = 125

// Structural states, for the containers along the pointer and the selected
// array. Values that are not on the pointer are captured and parsed instead.
const VALUE = 0 // expects the value at the current pointer prefix
const OBJECT_START = 1 // after `{`: a key or `}`
const OBJECT_KEY = 2 // after `,`: a key
const OBJECT_COLON = 3 // after a key: `:`
const OBJECT_NEXT = 4 // after a member: `,` or `}`
const ARRAY_START = 5 // after `[`: a value or `]`
const ARRAY_VALUE = 6 // after `,`: a value
const ARRAY_NEXT = 7 // after an element: `,` or `]`
const END = 8 // after the document

// Capture modes.
const NONE = 0
const SKIP = 1 // a value outside the selected array, validated and discarded
const ELEMENT = 2 // an element of the selected array
const KEY = 3 // a key in an object along the pointer

interface Frame {
  readonly target: boolean
  readonly object: boolean
  matched: boolean
  index: number
}

const isValueStart = (c: number): boolean =>
  c === QUOTE || c === LBRACKET || c === LBRACE || c === 45 || (c >= 48 && c <= 57) || c === 102 || c === 110 ||
  c === 116

const isWhitespace = (c: number): boolean => c === SPACE || c === LF || c === CR || c === TAB

const parsePointer = (pointer: string): ReadonlyArray<string> => {
  if (pointer === "") return []
  if (!pointer.startsWith("/") || /~(?:[^01]|$)/.test(pointer)) {
    throw new Error(`Json: pointer must be an RFC 6901 JSON Pointer, got ${JSON.stringify(pointer)}`)
  }
  return pointer.slice(1).split("/").map(JsonPointer.unescapeToken)
}

const isValid = (source: string): boolean => {
  try {
    JSON.parse(source)
    return true
  } catch {
    return false
  }
}

const describeChar = (c: number): string => JSON.stringify(String.fromCharCode(c))

interface Config {
  readonly tokens: ReadonlyArray<string>
  // The array index of each token, or -1 when it cannot select an element.
  readonly indices: ReadonlyArray<number>
  readonly maxDepth: number
  readonly maxElementSize: number
  readonly reviver: Parameters<typeof JSON.parse>[1] | undefined
}

const makeConfig = (options: DecodeOptions | undefined): Config => {
  const tokens = parsePointer(options?.pointer ?? "")
  const maxDepth = options?.maxDepth ?? defaultMaxDepth
  if (!(Number.isInteger(maxDepth) && maxDepth >= 0)) {
    throw new Error(`Json: maxDepth must be a non-negative integer, got ${maxDepth}`)
  }
  const maxElementSize = options?.maxElementSize ?? defaultMaxElementSize
  if (!(maxElementSize >= 1)) {
    throw new Error(`Json: maxElementSize must be at least 1, got ${maxElementSize}`)
  }
  return {
    tokens,
    indices: tokens.map((token) => /^(?:0|[1-9]\d*)$/.test(token) ? Number(token) : -1),
    maxDepth,
    maxElementSize,
    reviver: options?.reviver
  }
}

class Scanner {
  readonly config: Config

  state = VALUE
  frames: Array<Frame> = []
  key = ""
  started = false

  // Position of the start of the current chunk, and line tracking.
  base = 0
  line = 1
  lineStart = 0
  lastCR = -1

  // The value being captured, carried across chunks.
  capture = NONE
  buffer = ""
  start = 0
  startLine = 1
  startColumn = 1
  depth = 0
  inString = false
  escape = false
  scalar = false

  constructor(config: Config) {
    this.config = config
  }

  fail(kind: "Syntax" | "Limit" | "Pointer", message: string, offset: number): JsonError {
    return new JsonError({ kind, message, offset, line: this.line, column: offset - this.lineStart + 1 })
  }

  failCapture(kind: "Syntax" | "Limit", message: string): JsonError {
    return new JsonError({ kind, message, offset: this.start, line: this.startLine, column: this.startColumn })
  }

  newline(c: number, offset: number): void {
    if (c === CR) {
      this.lastCR = offset
      this.line++
    } else if (this.lastCR !== offset - 1) {
      this.line++
    }
    this.lineStart = offset + 1
  }

  pointerPrefix(): string {
    return this.config.tokens.slice(0, this.frames.length).map((token) => "/" + JsonPointer.escapeToken(token)).join("")
  }

  feed(text: string, out: Array<unknown>): void {
    if (!this.started && text.length > 0) {
      this.started = true
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    }
    const length = text.length
    let i = this.capture === NONE ? 0 : this.scan(text, 0, out)
    while (i < length) {
      const c = text.charCodeAt(i)
      if (isWhitespace(c)) {
        if (c === LF || c === CR) this.newline(c, this.base + i)
        i++
      } else {
        i = this.step(text, i, c, out)
      }
    }
    if (this.capture !== NONE && this.start !== -1) {
      this.buffer += text.slice(Math.max(this.start - this.base, 0))
      this.checkSize(this.buffer.length)
    }
    this.base += length
  }

  end(out: Array<unknown>): void {
    // A scalar ends at a delimiter, so one at the end of the input is complete.
    if (this.capture !== NONE && this.start !== -1 && this.scalar) this.complete(this.buffer, out)
    if (this.state !== END || this.capture !== NONE) {
      throw this.fail("Syntax", "Unexpected end of input", this.base)
    }
  }

  // Handles one structural character and returns the next index.
  step(text: string, i: number, c: number, out: Array<unknown>): number {
    const offset = this.base + i
    const frame = this.frames[this.frames.length - 1]
    switch (this.state) {
      case VALUE: {
        if (this.frames.length === this.config.tokens.length) {
          if (c === LBRACKET) {
            this.frames.push({ target: true, object: false, matched: true, index: 0 })
            this.state = ARRAY_START
            return i + 1
          }
          if (isValueStart(c)) {
            throw this.fail("Pointer", `Expected an array at ${JSON.stringify(this.pointerPrefix())}`, offset)
          }
        } else if (c === LBRACE || c === LBRACKET) {
          this.frames.push({ target: false, object: c === LBRACE, matched: false, index: 0 })
          this.state = c === LBRACE ? OBJECT_START : ARRAY_START
          return i + 1
        } else if (isValueStart(c)) {
          throw this.fail("Pointer", `Expected an object or array at ${JSON.stringify(this.pointerPrefix())}`, offset)
        }
        break
      }
      case OBJECT_START:
      case OBJECT_KEY: {
        if (c === QUOTE) return this.begin(KEY, text, i, out)
        if (c === RBRACE && this.state === OBJECT_START) return this.close(i)
        break
      }
      case OBJECT_COLON: {
        if (c !== COLON) break
        if (this.key === this.config.tokens[this.frames.length - 1]) {
          if (frame.matched) {
            throw this.fail("Pointer", `Duplicate key ${JSON.stringify(this.key)} along the pointer`, offset)
          }
          frame.matched = true
          this.state = VALUE
          return i + 1
        }
        this.state = OBJECT_NEXT
        return this.begin(SKIP, text, i + 1, out)
      }
      case OBJECT_NEXT: {
        if (c === COMMA) {
          this.state = OBJECT_KEY
          return i + 1
        }
        if (c === RBRACE) return this.close(i)
        break
      }
      case ARRAY_START:
      case ARRAY_VALUE: {
        if (c === RBRACKET && this.state === ARRAY_START) return this.close(i)
        if (!isValueStart(c)) break
        if (!frame.target && !frame.matched && frame.index === this.config.indices[this.frames.length - 1]) {
          frame.matched = true
          this.state = VALUE
          return i
        }
        this.state = ARRAY_NEXT
        if (frame.target) return this.begin(ELEMENT, text, i, out)
        frame.index++
        return this.begin(SKIP, text, i, out)
      }
      case ARRAY_NEXT: {
        if (c === COMMA) {
          this.state = ARRAY_VALUE
          return i + 1
        }
        if (c === RBRACKET) return this.close(i)
        break
      }
    }
    throw this.fail(
      "Syntax",
      this.state === END ? "Unexpected content after the document" : `Unexpected character ${describeChar(c)}`,
      offset
    )
  }

  // Starts capturing the value at or after `i`, skipping whitespace before it.
  begin(mode: number, text: string, i: number, out: Array<unknown>): number {
    this.capture = mode
    this.start = -1
    return this.scan(text, i, out)
  }

  checkSize(size: number): void {
    if (size > this.config.maxElementSize) {
      throw this.failCapture("Limit", `JSON value exceeds maxElementSize of ${this.config.maxElementSize}`)
    }
  }

  // Scans the captured value from `i` and completes it if it ends in this
  // chunk. Returns the index after the value, or the chunk length.
  scan(text: string, i: number, out: Array<unknown>): number {
    const length = text.length
    if (this.start === -1) {
      while (i < length) {
        const c = text.charCodeAt(i)
        if (!isWhitespace(c)) break
        if (c === LF || c === CR) this.newline(c, this.base + i)
        i++
      }
      if (i === length) return length
      const c = text.charCodeAt(i)
      const offset = this.base + i
      if (!isValueStart(c)) throw this.fail("Syntax", `Unexpected character ${describeChar(c)}`, offset)
      this.start = offset
      this.startLine = this.line
      this.startColumn = offset - this.lineStart + 1
      this.escape = false
      this.inString = c === QUOTE
      this.depth = c === LBRACKET || c === LBRACE ? 1 : 0
      this.scalar = !this.inString && this.depth === 0
      if (this.depth > this.config.maxDepth) this.failDepth()
      i++
    }
    let end = -1
    if (this.scalar) {
      while (i < length) {
        const c = text.charCodeAt(i)
        if (isWhitespace(c) || c === COMMA || c === RBRACKET || c === RBRACE) {
          end = i
          break
        }
        i++
      }
    } else {
      end = this.scanNested(text, i)
    }
    if (end === -1) return length
    const from = Math.max(this.start - this.base, 0)
    this.complete(this.buffer === "" ? text.slice(from, end) : this.buffer + text.slice(from, end), out)
    return end
  }

  failDepth(): never {
    throw this.failCapture("Limit", `JSON value exceeds maxDepth of ${this.config.maxDepth}`)
  }

  // Scans a string, array or object, tracking only string, escape and
  // nesting state. Returns the index after the value, or -1.
  scanNested(text: string, i: number): number {
    const length = text.length
    let depth = this.depth
    let inString = this.inString
    let escape = this.escape
    let end = -1
    while (i < length) {
      const c = text.charCodeAt(i++)
      if (inString) {
        if (escape) {
          escape = false
        } else if (c === BACKSLASH) {
          escape = true
        } else if (c === QUOTE) {
          inString = false
          if (depth === 0) {
            end = i
            break
          }
        }
      } else if (c === QUOTE) {
        inString = true
      } else if (c === LBRACKET || c === LBRACE) {
        if (++depth > this.config.maxDepth) this.failDepth()
      } else if (c === RBRACKET || c === RBRACE) {
        if (--depth === 0) {
          end = i
          break
        }
      } else if (c === LF || c === CR) {
        this.newline(c, this.base + i - 1)
      }
    }
    this.depth = depth
    this.inString = inString
    this.escape = escape
    return end
  }

  complete(source: string, out: Array<unknown>): void {
    this.checkSize(source.length)
    const mode = this.capture
    this.capture = NONE
    this.buffer = ""
    let value: unknown
    try {
      value = mode === ELEMENT ? JSON.parse(source, this.config.reviver) : JSON.parse(source)
    } catch (error) {
      // An error thrown by the reviver for valid JSON is a defect.
      if (mode === ELEMENT && this.config.reviver !== undefined && isValid(source)) throw error
      throw this.failCapture("Syntax", "Invalid JSON value")
    }
    if (mode === ELEMENT) {
      out.push(value)
    } else if (mode === KEY) {
      this.key = value as string
      this.state = OBJECT_COLON
    }
  }

  close(i: number): number {
    const frame = this.frames.pop()!
    if (!frame.matched) {
      const pointer = this.pointerPrefix() + "/" + JsonPointer.escapeToken(this.config.tokens[this.frames.length])
      throw this.fail("Pointer", `No value at ${JSON.stringify(pointer)}`, this.base + i)
    }
    const parent = this.frames[this.frames.length - 1]
    if (parent === undefined) {
      this.state = END
    } else if (parent.object) {
      this.state = OBJECT_NEXT
    } else {
      parent.index++
      this.state = ARRAY_NEXT
    }
    return i + 1
  }
}

const decodeValues = <IE, Done>(config: Config): Channel.Channel<
  Arr.NonEmptyReadonlyArray<unknown>,
  IE | JsonError,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      const scanner = new Scanner(config)
      let done: Pull.Pull<never, never, Done> | undefined

      const emit = (
        run: (out: Array<unknown>) => void
      ): Pull.Pull<Arr.NonEmptyReadonlyArray<unknown>, IE | JsonError, Done> => {
        const out: Array<unknown> = []
        try {
          run(out)
        } catch (error) {
          if (isJsonError(error)) return Effect.fail(error)
          throw error
        }
        return Arr.isArrayNonEmpty(out) ? Effect.succeed(out) : pull
      }

      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<unknown>, IE | JsonError, Done> = Effect.suspend(() => {
        if (done !== undefined) return done
        return Pull.matchEffect(upstream, {
          onSuccess: (texts) =>
            emit((out) => {
              for (const text of texts) scanner.feed(text, out)
            }),
          onFailure: Effect.failCause,
          onDone: (value) => {
            done = Cause.done(value)
            return emit((out) => scanner.end(out))
          }
        })
      })
      return pull
    })
  )

/**
 * Creates a channel that parses the text of one JSON document and emits the
 * elements of one of its arrays.
 *
 * **When to use**
 *
 * Use when a large JSON array, or an object that contains one, arrives as
 * string chunks and its elements should be processed as they arrive.
 *
 * **Details**
 *
 * Each output chunk holds the elements completed by one input chunk. Elements
 * may span input chunks and are buffered only until they are complete.
 *
 * **Gotchas**
 *
 * - The document is validated as it streams, so elements from earlier input
 *   chunks have already been emitted when a later syntax error, limit or
 *   missing pointer target fails the channel.
 * - The pointer follows the first occurrence of a key, where `JSON.parse`
 *   keeps the last. A repeated followed key fails with a `Pointer` error, as
 *   does a first occurrence that is not an object or array where the pointer
 *   needs one.
 * - A root that is not an array fails with a `Pointer` error unless the
 *   pointer selects an array inside it.
 *
 * **Example** (Streaming an array inside an envelope)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Json } from "effect/encoding"
 *
 * const items = Stream.make("{\"total\":2,\"items\":[{\"id\":1},{\"i", "d\":2}]}").pipe(
 *   Stream.pipeThroughChannel(Json.decodeString({ pointer: "/items" })),
 *   Stream.runCollect
 * )
 * await Effect.runPromise(items) // => [{ id: 1 }, { id: 2 }]
 * ```
 *
 * @see decode
 * @see decodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const decodeString = <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<unknown>,
  IE | JsonError,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done
> => decodeValues(makeConfig(options))

// Unlike `Channel.decodeText`, flushes the decoder at the end so that a
// truncated character after the document is reported instead of dropped.
const decodeUtf8 = <IE, Done>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      const decoder = new TextDecoder("utf-8", { ignoreBOM: true })
      const options = { stream: true }
      let done: Pull.Pull<never, never, Done> | undefined
      type Out = Pull.Pull<Arr.NonEmptyReadonlyArray<string>, IE, Done>
      const pull: Out = Effect.suspend((): Out => {
        if (done !== undefined) return done
        return Pull.matchEffect(upstream, {
          onSuccess: (chunks) => Effect.succeed(Arr.map(chunks, (chunk) => decoder.decode(chunk, options))),
          onFailure: Effect.failCause,
          onDone: (value): Out => {
            done = Cause.done(value)
            const rest = decoder.decode()
            return rest === "" ? done : Effect.succeed(Arr.of(rest))
          }
        })
      })
      return pull
    })
  )

/**
 * Creates a channel that parses UTF-8 bytes of one JSON document and emits the
 * elements of one of its arrays.
 *
 * **Details**
 *
 * Multi-byte characters may span input chunks, and invalid UTF-8 is replaced
 * with U+FFFD.
 *
 * @see decodeString
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const decode = <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<unknown>,
  IE | JsonError,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done
> => Channel.pipeTo(decodeUtf8<IE, Done>(), decodeString(options))

/**
 * Creates a channel that parses the text of one JSON document and decodes the
 * elements of one of its arrays with a schema.
 *
 * @see decodeString
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const decodeSchemaString = <S extends Schema.Constraint>(
  schema: S
) =>
<IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<S["Type"]>,
  Schema.SchemaError | JsonError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done,
  S["DecodingServices"]
> => Channel.pipeTo(decodeString(options), ChannelSchema.decodeUnknown(schema)())

/**
 * Creates a channel that parses UTF-8 bytes of one JSON document and decodes
 * the elements of one of its arrays with a schema.
 *
 * @see decodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const decodeSchema = <S extends Schema.Constraint>(
  schema: S
) =>
<IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<S["Type"]>,
  Schema.SchemaError | JsonError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done,
  S["DecodingServices"]
> => Channel.pipeTo(decode(options), ChannelSchema.decodeUnknown(schema)())

const stringify = (value: unknown): string => {
  let output: string | undefined
  try {
    output = JSON.stringify(value)
  } catch (cause) {
    throw new JsonError({ kind: "Encode", message: cause instanceof Error ? cause.message : String(cause) })
  }
  if (output === undefined) {
    throw new JsonError({ kind: "Encode", message: `Value of type ${typeof value} cannot be represented as JSON` })
  }
  return output
}

/**
 * Creates a channel that writes a stream of values as the text of one JSON
 * array.
 *
 * **Details**
 *
 * Each input chunk produces one string. An empty stream produces `"[]"`.
 * Values are written with `JSON.stringify`.
 *
 * **Gotchas**
 *
 * A value that `JSON.stringify` cannot write, such as `undefined`, a function
 * or a `bigint`, fails with an `Encode` error after the preceding text has
 * been emitted.
 *
 * **Example** (Writing values as a JSON array)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Json } from "effect/encoding"
 *
 * const json = Stream.make({ id: 1 }, { id: 2 }).pipe(
 *   Stream.pipeThroughChannel(Json.encodeString()),
 *   Stream.mkString
 * )
 * await Effect.runPromise(json) // => '[{"id":1},{"id":2}]'
 * ```
 *
 * @see encode
 * @see encodeSchemaString
 * @stability unstable
 * @category encoding
 * @since 4.0.6
 */
export const encodeString = <IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  IE | JsonError,
  Done,
  Arr.NonEmptyReadonlyArray<unknown>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      let started = false
      let done: Pull.Pull<never, never, Done> | undefined
      type Out = Pull.Pull<Arr.NonEmptyReadonlyArray<string>, IE | JsonError, Done>
      const pull: Out = Effect.suspend((): Out => {
        if (done !== undefined) return done
        return Pull.matchEffect(upstream, {
          onSuccess: (values): Out => {
            let text = started ? "," : "["
            try {
              text += values.map(stringify).join(",")
            } catch (error) {
              if (isJsonError(error)) return Effect.fail(error)
              throw error
            }
            started = true
            return Effect.succeed(Arr.of(text))
          },
          onFailure: Effect.failCause,
          onDone: (value) => {
            done = Cause.done(value)
            return Effect.succeed(Arr.of(started ? "]" : "[]"))
          }
        })
      })
      return pull
    })
  )

/**
 * Creates a channel that writes a stream of values as UTF-8 bytes of one JSON
 * array.
 *
 * @see encodeString
 * @stability unstable
 * @category encoding
 * @since 4.0.6
 */
export const encode = <IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE | JsonError,
  Done,
  Arr.NonEmptyReadonlyArray<unknown>,
  IE,
  Done
> => Channel.map(encodeString(), Arr.map((text) => textEncoder.encode(text)))

/**
 * Creates a channel that encodes values with a schema and writes them as the
 * text of one JSON array.
 *
 * @see encodeString
 * @stability unstable
 * @category encoding
 * @since 4.0.6
 */
export const encodeSchemaString = <S extends Schema.Constraint>(
  schema: S
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  JsonError | Schema.SchemaError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<S["Type"]>,
  IE,
  Done,
  S["EncodingServices"]
> => Channel.pipeTo(ChannelSchema.encode(schema)(), encodeString())

/**
 * Creates a channel that encodes values with a schema and writes them as UTF-8
 * bytes of one JSON array.
 *
 * @see encodeSchemaString
 * @stability unstable
 * @category encoding
 * @since 4.0.6
 */
export const encodeSchema = <S extends Schema.Constraint>(
  schema: S
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  JsonError | Schema.SchemaError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<S["Type"]>,
  IE,
  Done,
  S["EncodingServices"]
> => Channel.pipeTo(ChannelSchema.encode(schema)(), encode())

/**
 * Wraps a bidirectional byte channel with JSON array encoding and decoding.
 *
 * **Details**
 *
 * Outgoing values are written as UTF-8 bytes of one JSON array, and the
 * elements of the selected array in the incoming bytes are emitted.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const duplex: {
  (options?: DecodeOptions): <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      OE,
      OutDone,
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      IE | JsonError,
      InDone,
      R
    >
  ) => Channel.Channel<
    Arr.NonEmptyReadonlyArray<unknown>,
    JsonError | OE,
    OutDone,
    Arr.NonEmptyReadonlyArray<unknown>,
    IE,
    InDone,
    R
  >
  <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      OE,
      OutDone,
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      IE | JsonError,
      InDone,
      R
    >,
    options?: DecodeOptions
  ): Channel.Channel<
    Arr.NonEmptyReadonlyArray<unknown>,
    JsonError | OE,
    OutDone,
    Arr.NonEmptyReadonlyArray<unknown>,
    IE,
    InDone,
    R
  >
} = dual((args) => Channel.isChannel(args[0]), <R, IE, OE, OutDone, InDone>(
  self: Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    OE,
    OutDone,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE | JsonError,
    InDone,
    R
  >,
  options?: DecodeOptions
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<unknown>,
  JsonError | OE,
  OutDone,
  Arr.NonEmptyReadonlyArray<unknown>,
  IE,
  InDone,
  R
> =>
  Channel.pipeTo(
    Channel.pipeTo(encode(), self),
    decode(options)
  ))

/**
 * Wraps a bidirectional string channel with JSON array encoding and decoding.
 *
 * **Details**
 *
 * Outgoing values are written as the text of one JSON array, and the elements
 * of the selected array in the incoming text are emitted.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const duplexString: {
  (options?: DecodeOptions): <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<string>,
      OE,
      OutDone,
      Arr.NonEmptyReadonlyArray<string>,
      IE | JsonError,
      InDone,
      R
    >
  ) => Channel.Channel<
    Arr.NonEmptyReadonlyArray<unknown>,
    JsonError | OE,
    OutDone,
    Arr.NonEmptyReadonlyArray<unknown>,
    IE,
    InDone,
    R
  >
  <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<string>,
      OE,
      OutDone,
      Arr.NonEmptyReadonlyArray<string>,
      IE | JsonError,
      InDone,
      R
    >,
    options?: DecodeOptions
  ): Channel.Channel<
    Arr.NonEmptyReadonlyArray<unknown>,
    JsonError | OE,
    OutDone,
    Arr.NonEmptyReadonlyArray<unknown>,
    IE,
    InDone,
    R
  >
} = dual((args) => Channel.isChannel(args[0]), <R, IE, OE, OutDone, InDone>(
  self: Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    OE,
    OutDone,
    Arr.NonEmptyReadonlyArray<string>,
    IE | JsonError,
    InDone,
    R
  >,
  options?: DecodeOptions
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<unknown>,
  JsonError | OE,
  OutDone,
  Arr.NonEmptyReadonlyArray<unknown>,
  IE,
  InDone,
  R
> =>
  Channel.pipeTo(
    Channel.pipeTo(encodeString(), self),
    decodeString(options)
  ))

/**
 * Wraps a bidirectional byte channel with schema-aware JSON array encoding and
 * decoding.
 *
 * **Details**
 *
 * Values sent to the wrapped channel are encoded with `inputSchema`; elements
 * of the selected array in the bytes received from it are decoded with
 * `outputSchema`.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const duplexSchema: {
  <In extends Schema.Constraint, Out extends Schema.Constraint>(
    options: DecodeOptions & {
      readonly inputSchema: In
      readonly outputSchema: Out
    }
  ): <OutErr, OutDone, InErr, InDone, R>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      OutErr,
      OutDone,
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      JsonError | Schema.SchemaError | InErr,
      InDone,
      R
    >
  ) => Channel.Channel<
    Arr.NonEmptyReadonlyArray<Out["Type"]>,
    JsonError | Schema.SchemaError | OutErr,
    OutDone,
    Arr.NonEmptyReadonlyArray<In["Type"]>,
    InErr,
    InDone,
    R | In["EncodingServices"] | Out["DecodingServices"]
  >
  <Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      OutErr,
      OutDone,
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      JsonError | Schema.SchemaError | InErr,
      InDone,
      R
    >,
    options: DecodeOptions & {
      readonly inputSchema: In
      readonly outputSchema: Out
    }
  ): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Out["Type"]>,
    JsonError | Schema.SchemaError | OutErr,
    OutDone,
    Arr.NonEmptyReadonlyArray<In["Type"]>,
    InErr,
    InDone,
    R | In["EncodingServices"] | Out["DecodingServices"]
  >
} = dual(2, <Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(
  self: Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    OutErr,
    OutDone,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    JsonError | Schema.SchemaError | InErr,
    InDone,
    R
  >,
  options: DecodeOptions & {
    readonly inputSchema: In
    readonly outputSchema: Out
  }
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Out["Type"]>,
  JsonError | Schema.SchemaError | OutErr,
  OutDone,
  Arr.NonEmptyReadonlyArray<In["Type"]>,
  InErr,
  InDone,
  R | In["EncodingServices"] | Out["DecodingServices"]
> => ChannelSchema.duplexUnknown(duplex(self, options), options))

/**
 * Wraps a bidirectional string channel with schema-aware JSON array encoding
 * and decoding.
 *
 * **Details**
 *
 * Values sent to the wrapped channel are encoded with `inputSchema`; elements
 * of the selected array in the text received from it are decoded with
 * `outputSchema`.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const duplexSchemaString: {
  <In extends Schema.Constraint, Out extends Schema.Constraint>(
    options: DecodeOptions & {
      readonly inputSchema: In
      readonly outputSchema: Out
    }
  ): <OutErr, OutDone, InErr, InDone, R>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<string>,
      OutErr,
      OutDone,
      Arr.NonEmptyReadonlyArray<string>,
      JsonError | Schema.SchemaError | InErr,
      InDone,
      R
    >
  ) => Channel.Channel<
    Arr.NonEmptyReadonlyArray<Out["Type"]>,
    JsonError | Schema.SchemaError | OutErr,
    OutDone,
    Arr.NonEmptyReadonlyArray<In["Type"]>,
    InErr,
    InDone,
    R | In["EncodingServices"] | Out["DecodingServices"]
  >
  <Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(
    self: Channel.Channel<
      Arr.NonEmptyReadonlyArray<string>,
      OutErr,
      OutDone,
      Arr.NonEmptyReadonlyArray<string>,
      JsonError | Schema.SchemaError | InErr,
      InDone,
      R
    >,
    options: DecodeOptions & {
      readonly inputSchema: In
      readonly outputSchema: Out
    }
  ): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Out["Type"]>,
    JsonError | Schema.SchemaError | OutErr,
    OutDone,
    Arr.NonEmptyReadonlyArray<In["Type"]>,
    InErr,
    InDone,
    R | In["EncodingServices"] | Out["DecodingServices"]
  >
} = dual(2, <Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(
  self: Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    OutErr,
    OutDone,
    Arr.NonEmptyReadonlyArray<string>,
    JsonError | Schema.SchemaError | InErr,
    InDone,
    R
  >,
  options: DecodeOptions & {
    readonly inputSchema: In
    readonly outputSchema: Out
  }
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Out["Type"]>,
  JsonError | Schema.SchemaError | OutErr,
  OutDone,
  Arr.NonEmptyReadonlyArray<In["Type"]>,
  InErr,
  InDone,
  R | In["EncodingServices"] | Out["DecodingServices"]
> => ChannelSchema.duplexUnknown(duplexString(self, options), options))
