/**
 * Decodes and encodes XML 1.0 documents as streams of events in Effect
 * channels.
 *
 * `decode` and `decodeString` turn UTF-8 bytes or text into events, and
 * `encode` and `encodeString` write events back as XML. `elements` collects
 * repeated elements, such as the items of a feed, into small trees, so that a
 * large document can be processed one record at a time.
 *
 * The decoder checks that documents are well-formed. It never reads external
 * resources and never expands entities declared in a DOCTYPE, so external
 * entity (XXE) and entity expansion attacks do not apply. It does not validate
 * documents against a DTD or schema, and reports names as written, without
 * resolving namespaces.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Channel from "../Channel.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import * as Pull from "../Pull.ts"

const XmlErrorTypeId = "~effect/encoding/Xml/XmlError"

/**
 * Error raised when XML cannot be decoded or encoded.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `Syntax`: the input is not well-formed XML or not valid UTF-8.
 * - `Unsupported`: the input uses a feature this module does not process, such
 *   as an entity declared in a DOCTYPE or a byte encoding other than UTF-8.
 * - `Limit`: the input exceeds `maxTokenSize`, `maxDepth` or `maxElementSize`.
 * - `InvalidEvent`: events cannot be written as a well-formed document, such as
 *   an end tag that does not match its start tag.
 *
 * Decoding errors carry the one-based `line` and `column` where the problem
 * was found, also appended to `message`. Columns count UTF-16 code units, and
 * lines end at LF, CR or CRLF.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class XmlError extends Data.TaggedError("XmlError")<{
  readonly kind: "Syntax" | "Unsupported" | "Limit" | "InvalidEvent"
  readonly message: string
  readonly line?: number | undefined
  readonly column?: number | undefined
}> {
  /**
   * Marks this value as an XML error for runtime guards.
   *
   * @stability unstable
   * @since 4.0.6
   */
  readonly [XmlErrorTypeId] = XmlErrorTypeId
}

/**
 * Checks whether a value is an `XmlError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.6
 */
export const isXmlError = (u: unknown): u is XmlError => Predicate.hasProperty(u, XmlErrorTypeId)

/**
 * Event for the XML declaration at the start of a document, such as
 * `<?xml version="1.0" encoding="UTF-8"?>`.
 *
 * **Details**
 *
 * `encoding` and `standalone` are present only when the declaration sets them.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Declaration {
  readonly _tag: "Declaration"
  readonly version: string
  readonly encoding?: string | undefined
  readonly standalone?: boolean | undefined
}

/**
 * Event for a document type declaration, such as `<!DOCTYPE html>`.
 *
 * **Details**
 *
 * `publicId` and `systemId` are present only when the declaration names an
 * external DTD; the DTD is never read. Whitespace in `publicId` is collapsed
 * to single spaces. The internal subset is not reported.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Doctype {
  readonly _tag: "Doctype"
  readonly name: string
  readonly publicId?: string | undefined
  readonly systemId?: string | undefined
}

/**
 * Event for a start tag, with its attributes in document order.
 *
 * **Details**
 *
 * Attribute values have their references replaced and whitespace normalized as
 * XML requires. A self-closing tag such as `<br/>` is decoded as a
 * `StartElement` followed by an `EndElement`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface StartElement {
  readonly _tag: "StartElement"
  readonly name: string
  readonly attributes: Readonly<Record<string, string>>
}

/**
 * Event for an end tag.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EndElement {
  readonly _tag: "EndElement"
  readonly name: string
}

/**
 * Event for character data inside the root element.
 *
 * **Details**
 *
 * Adjacent text, references and CDATA sections are decoded into one `Text`
 * event that ends at the next tag, comment or processing instruction, however
 * the input is chunked. Line endings are normalized to `\n`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Text {
  readonly _tag: "Text"
  readonly text: string
}

/**
 * Event for a comment, holding the text between `<!--` and `-->`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Comment {
  readonly _tag: "Comment"
  readonly text: string
}

/**
 * Event for a processing instruction, such as
 * `<?xml-stylesheet href="style.xsl"?>`.
 *
 * **Details**
 *
 * `data` is the text after the target, without leading whitespace.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ProcessingInstruction {
  readonly _tag: "ProcessingInstruction"
  readonly target: string
  readonly data: string
}

/**
 * Event produced by the decoders and consumed by the encoders.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Event =
  | Declaration
  | Doctype
  | StartElement
  | EndElement
  | Text
  | Comment
  | ProcessingInstruction

/**
 * Element collected by `elements`, with its attributes and children.
 *
 * **Details**
 *
 * Children are elements and strings of character data, in document order.
 * Adjacent text is merged into one string; comments and processing
 * instructions are dropped.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Element {
  readonly name: string
  readonly attributes: Readonly<Record<string, string>>
  readonly children: ReadonlyArray<Element | string>
}

/**
 * Options for the XML decoders.
 *
 * **Details**
 *
 * - `maxTokenSize`: the maximum length of a single token in UTF-16 code units,
 *   as written in the input: a tag with its attributes, a comment, a processing
 *   instruction, a DOCTYPE, or a text node including its references and CDATA
 *   sections. Defaults to 10 MiB; `Infinity` disables the limit.
 * - `maxDepth`: the maximum number of nested elements, which also bounds nested
 *   groups in DOCTYPE content models. Defaults to 1024; `Infinity` disables
 *   the limit.
 *
 * Invalid options throw when the channel is created.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.6
 */
export interface DecodeOptions {
  readonly maxTokenSize?: number | undefined
  readonly maxDepth?: number | undefined
}

/**
 * Options for `elements`.
 *
 * **Details**
 *
 * `maxElementSize` is the maximum size of one collected element, counted as
 * the UTF-16 code units of its names, attribute names and values, and text.
 * Defaults to 16 MiB; `Infinity` disables the limit. Invalid options throw when
 * the channel is created.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.6
 */
export interface ElementsOptions {
  readonly maxElementSize?: number | undefined
}

/**
 * Creates a channel that decodes XML text chunks into events.
 *
 * **Details**
 *
 * - Tokens can be split anywhere between chunks. Each output chunk holds the
 *   events completed by one input chunk.
 * - The document must have one root element. Whitespace outside it is not
 *   reported.
 * - A leading byte order mark is skipped, and the encoding named by the XML
 *   declaration is ignored.
 * - Events completed before an error are emitted before the channel fails.
 *
 * **Gotchas**
 *
 * - A DOCTYPE is reported as a `Doctype` event, and its internal subset is
 *   checked and skipped: its declarations are not applied, so default
 *   attribute values are not added, and parameter entities are not expanded.
 * - References to entities other than `&lt;`, `&gt;`, `&amp;`, `&apos;` and
 *   `&quot;` fail with an `Unsupported` `XmlError` when the document has a
 *   DOCTYPE that could declare them, and with a `Syntax` `XmlError` otherwise.
 *   Character references such as `&#233;` are always decoded.
 * - Names are reported as written, including namespace prefixes, and `xmlns`
 *   declarations are ordinary attributes.
 * - Tokens longer than `maxTokenSize` and elements nested deeper than
 *   `maxDepth` fail with a `Limit` `XmlError`.
 *
 * **Example** (Decoding events)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Xml } from "effect/encoding"
 *
 * const events = Stream.make("<note id=\"1\">Hi &amp; bye<br/></note>").pipe(
 *   Stream.pipeThroughChannel(Xml.decodeString()),
 *   Stream.map((event) => event._tag),
 *   Stream.runCollect
 * )
 * await Effect.runPromise(events) // => ["StartElement", "Text", "StartElement", "EndElement", "EndElement"]
 * ```
 *
 * @see {@link decode} for UTF-8 byte input
 * @see {@link elements} for collecting repeated elements into trees
 * @see {@link encodeString} for the inverse operation
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const decodeString = <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Event>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done
> => makeDecoder<string, IE, Done>(options, false)

/**
 * Creates a channel that decodes UTF-8 XML bytes into events.
 *
 * **Details**
 *
 * Works like `decodeString` after decoding the bytes as UTF-8. Multi-byte
 * characters can be split between chunks, and a leading byte order mark is
 * skipped.
 *
 * **Gotchas**
 *
 * - Invalid or truncated UTF-8 fails with a `Syntax` `XmlError`.
 * - An XML declaration naming an encoding other than UTF-8 or US-ASCII fails
 *   with an `Unsupported` `XmlError`. Decode such bytes to text with a
 *   `TextDecoder` for that encoding and use `decodeString`.
 *
 * @see {@link decodeString} for text input and the shared gotchas
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const decode = <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Event>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done
> => makeDecoder<Uint8Array, IE, Done>(options, true)

/**
 * Creates a channel that collects the elements at a path into trees.
 *
 * **When to use**
 *
 * Use to process large documents such as feeds, sitemaps or exports one record
 * at a time, without holding the whole document in memory.
 *
 * **Details**
 *
 * `path` lists element names from the root, and `"*"` matches any name. Each
 * element whose ancestors and own name match the path is emitted once its end
 * tag arrives, with all of its descendants; everything outside the matched
 * elements is skipped. Because paths start at the root, an element nested in a
 * matched element is part of its tree and is not emitted separately.
 *
 * **Gotchas**
 *
 * - A path that does not start at the root element matches nothing.
 * - Whitespace between child elements, such as indentation, is kept as string
 *   children.
 * - A collected element larger than `maxElementSize` fails with a `Limit`
 *   `XmlError`.
 * - Events that end inside an element, or end an element that was never
 *   started, fail with an `InvalidEvent` `XmlError`.
 * - A path that is empty or contains an invalid name throws when the channel is
 *   created.
 *
 * **Example** (Reading feed items)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Xml } from "effect/encoding"
 *
 * const feed = `<rss><channel><title>News</title>
 * <item><title>First</title></item>
 * <item><title>Second</title></item>
 * </channel></rss>`
 *
 * const items = await Effect.runPromise(
 *   Stream.make(feed).pipe(
 *     Stream.pipeThroughChannel(Xml.decodeString()),
 *     Stream.pipeThroughChannel(Xml.elements(["rss", "channel", "item"])),
 *     Stream.runCollect
 *   )
 * )
 * items.length // => 2
 * items[1] // => { name: "item", attributes: {}, children: [{ name: "title", attributes: {}, children: ["Second"] }] }
 * ```
 *
 * @see {@link decode} for producing events from bytes
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.6
 */
export const elements = <IE = never, Done = unknown>(
  path: ReadonlyArray<string>,
  options?: ElementsOptions
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Element>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Event>,
  IE,
  Done
> => {
  if (path.length === 0) {
    throw new Error("Xml: elements path must not be empty")
  }
  for (const name of path) {
    if (name !== "*" && !isName(name)) {
      throw new Error(`Xml: invalid element name in path: ${JSON.stringify(name)}`)
    }
  }
  const maxElementSize = checkLimit("maxElementSize", options?.maxElementSize, defaultMaxElementSize)
  const segments = Array.from(path)
  return makeChannel<Event, Element, IE, Done>(() => new Collector(segments, maxElementSize))
}

/**
 * Creates a channel that writes events as XML text.
 *
 * **Details**
 *
 * - Each input chunk is written as one string.
 * - Text escapes `&`, `<` and `>`. Attribute values are double-quoted and
 *   escape `&`, `<`, `"`, tabs and line breaks. Carriage returns are written
 *   as `&#13;` so that they survive decoding.
 * - A `StartElement` immediately followed by its `EndElement` is written as a
 *   self-closing tag.
 * - Nothing is added between events, so whitespace comes only from `Text`
 *   events.
 *
 * **Gotchas**
 *
 * Events that do not form one well-formed document fail with an
 * `InvalidEvent` `XmlError`: an end tag that does not match the open element,
 * a second root element, non-whitespace text outside the root element, invalid
 * names or characters, `--` in a comment, `?>` in processing instruction data,
 * a declaration that is not the first event, or a DOCTYPE after the root
 * element. The stream must end with the root element closed.
 *
 * **Example** (Writing a document)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Xml } from "effect/encoding"
 *
 * const events: ReadonlyArray<Xml.Event> = [
 *   { _tag: "StartElement", name: "a", attributes: { href: "x?a=1&b=2" } },
 *   { _tag: "Text", text: "1 < 2" },
 *   { _tag: "EndElement", name: "a" }
 * ]
 *
 * const xml = Stream.fromIterable(events).pipe(
 *   Stream.pipeThroughChannel(Xml.encodeString()),
 *   Stream.mkString
 * )
 * await Effect.runPromise(xml) // => '<a href="x?a=1&amp;b=2">1 &lt; 2</a>'
 * ```
 *
 * @see {@link encode} for UTF-8 byte output
 * @see {@link decodeString} for the inverse operation
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.6
 */
export const encodeString = <IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Event>,
  IE,
  Done
> => makeChannel<Event, string, IE, Done>(() => new Writer(false))

/**
 * Creates a channel that writes events as UTF-8 XML bytes.
 *
 * **Details**
 *
 * Works like `encodeString`, with one byte array per input chunk. A
 * `Declaration` event may only name the UTF-8 or US-ASCII encoding, otherwise
 * encoding fails with an `InvalidEvent` `XmlError`.
 *
 * @see {@link encodeString} for text output and the shared gotchas
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.6
 */
export const encode = <IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Event>,
  IE,
  Done
> =>
  Channel.map(makeChannel<Event, string, IE, Done>(() => new Writer(true)), Arr.map((text) => textEncoder.encode(text)))

// -----------------------------------------------------------------------------
// Channels
// -----------------------------------------------------------------------------

const defaultMaxTokenSize = 10 * 1024 * 1024
const defaultMaxDepth = 1024
const defaultMaxElementSize = 16 * 1024 * 1024

const checkLimit = (name: string, value: number | undefined, defaultValue: number): number => {
  const limit = value ?? defaultValue
  if (!(limit > 0)) {
    throw new Error(`Xml: ${name} must be positive, got ${limit}`)
  }
  return limit
}

// The per-run state of a channel. `push` and `end` add output to `out`, and
// throw `XmlError`s.
interface Machine<In, Out> {
  out: Array<Out>
  push(input: In): void
  end(): void
}

const makeChannel = <In, Out, IE, Done>(make: () => Machine<In, Out>): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Out>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<In>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<In>, IE, Done>, _scope) =>
    Effect.sync(() => {
      const machine = make()
      let done: Pull.Pull<never, never, Done> | undefined
      let failure: XmlError | undefined

      // Output completed before an error is emitted before the failure.
      const emit = (run: () => void): Pull.Pull<Arr.NonEmptyReadonlyArray<Out>, XmlError | IE, Done> => {
        try {
          run()
        } catch (error) {
          if (!isXmlError(error)) throw error
          failure = error
        }
        const out = machine.out
        if (Arr.isArrayNonEmpty(out)) {
          machine.out = []
          return Effect.succeed(out)
        }
        return pull
      }

      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<Out>, XmlError | IE, Done> = Effect.suspend(() => {
        if (failure !== undefined) return Effect.fail(failure)
        if (done !== undefined) return done
        return Pull.matchEffect(upstream, {
          onSuccess: (inputs) =>
            emit(() => {
              for (const input of inputs) machine.push(input)
            }),
          onFailure: Effect.failCause,
          onDone: (value) => {
            done = Cause.done(value)
            return emit(() => machine.end())
          }
        })
      })
      return pull
    })
  )

const makeDecoder = <In extends string | Uint8Array, IE, Done>(
  options: DecodeOptions | undefined,
  bytes: boolean
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Event>,
  XmlError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<In>,
  IE,
  Done
> => {
  const maxTokenSize = checkLimit("maxTokenSize", options?.maxTokenSize, defaultMaxTokenSize)
  const maxDepth = checkLimit("maxDepth", options?.maxDepth, defaultMaxDepth)
  return makeChannel<In, Event, IE, Done>(() => {
    const parser = new Parser(maxTokenSize, maxDepth, bytes)
    return bytes ? new Utf8Input(parser) as Machine<In, Event> : new TextInput(parser) as Machine<In, Event>
  })
}

const textEncoder = new TextEncoder()

// -----------------------------------------------------------------------------
// Characters
// -----------------------------------------------------------------------------

const TAB = 9
const LF = 10
const CR = 13
const SPACE = 32
const BANG = 33
const DQUOTE = 34
const HASH = 35
const PERCENT = 37
const AMPERSAND = 38
const SQUOTE = 39
const LPAREN = 40
const RPAREN = 41
const STAR = 42
const PLUS = 43
const COMMA = 44
const DASH = 45
const SLASH = 47
const SEMICOLON = 59
const LT = 60
const EQUALS = 61
const GT = 62
const QUESTION = 63
const LBRACKET = 91
const RBRACKET = 93
const PIPE = 124
const LOWER_X = 120

const isSpace = (c: number): boolean => c === SPACE || c === LF || c === TAB || c === CR

// Characters outside the XML `Char` production, including unpaired surrogates
// oxlint-disable-next-line no-control-regex
const invalidChar = /[\0-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF\uD800-\uDFFF]/u

// Decoded UTF-8 has no unpaired surrogates, and without the `u` flag the
// search runs several times faster on non-ASCII text
// oxlint-disable-next-line no-control-regex
const invalidDecodedChar = /[\0-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/

const isChar = (c: number): boolean =>
  c === TAB || c === LF || c === CR || (c >= 0x20 && c <= 0xD7FF) || (c >= 0xE000 && c <= 0xFFFD) ||
  (c >= 0x10000 && c <= 0x10FFFF)

const NAME_START = 1
const NAME_CHAR = 2
const asciiName = new Uint8Array(128)
for (let c = 0; c < 128; c++) {
  if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 58) asciiName[c] = NAME_START | NAME_CHAR
  else if ((c >= 48 && c <= 57) || c === DASH || c === 46) asciiName[c] = NAME_CHAR
}

// Name characters of XML 1.0 fifth edition. Supplementary characters are
// accepted by their surrogates, which are paired once input is validated.
const isNameStartCode = (c: number): boolean =>
  c < 128 ?
    (asciiName[c] & NAME_START) !== 0 :
    (c >= 0xC0 && c <= 0xD6) || (c >= 0xD8 && c <= 0xF6) || (c >= 0xF8 && c <= 0x2FF) ||
    (c >= 0x370 && c <= 0x37D) || (c >= 0x37F && c <= 0x1FFF) || (c >= 0x200C && c <= 0x200D) ||
    (c >= 0x2070 && c <= 0x218F) || (c >= 0x2C00 && c <= 0x2FEF) || (c >= 0x3001 && c <= 0xD7FF) ||
    (c >= 0xF900 && c <= 0xFDCF) || (c >= 0xFDF0 && c <= 0xFFFD) || (c >= 0xD800 && c <= 0xDB7F)

const isNameCode = (c: number): boolean =>
  c < 128 ?
    (asciiName[c] & NAME_CHAR) !== 0 :
    isNameStartCode(c) || c === 0xB7 || (c >= 0x300 && c <= 0x36F) || (c >= 0x203F && c <= 0x2040) ||
    (c >= 0xDC00 && c <= 0xDFFF)

// Returns the end of the name starting at `i`, or `i` when there is none
const scanName = (s: string, i: number, end: number): number => {
  if (i >= end || !isNameStartCode(s.charCodeAt(i))) return i
  i++
  while (i < end && isNameCode(s.charCodeAt(i))) i++
  return i
}

const isName = (s: string): boolean => s.length > 0 && scanName(s, 0, s.length) === s.length && !invalidChar.test(s)

const skipSpace = (s: string, i: number, end: number): number => {
  while (i < end && isSpace(s.charCodeAt(i))) i++
  return i
}

const lineEndings = /\r\n?/g
const attributeWhitespace = /\r\n|[\t\n\r]/g
const publicIdWhitespace = /[ \r\n]+/g
const decimalDigits = /^[0-9]+$/
const hexDigits = /^[0-9a-fA-F]+$/
const versionPattern = /^1\.[0-9]+$/
const encodingPattern = /^[A-Za-z][A-Za-z0-9._-]*$/

// Normalizes CRLF and CR line endings to LF
const normalizeLines = (s: string): string => s.indexOf("\r") === -1 ? s : s.replace(lineEndings, "\n")

// Normalizes the line endings and whitespace of a literal attribute value part
const normalizeAttribute = (s: string): string => s.replace(attributeWhitespace, " ")

const isReservedTarget = (target: string): boolean => target.length === 3 && target.toLowerCase() === "xml"

const isUtf8 = (encoding: string): boolean => {
  const lower = encoding.toLowerCase()
  return lower === "utf-8" || lower === "us-ascii"
}

const declarationPattern =
  /^[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(?:"(1\.[0-9]+)"|'(1\.[0-9]+)')(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(?:"([A-Za-z][A-Za-z0-9._-]*)"|'([A-Za-z][A-Za-z0-9._-]*)'))?(?:[ \t\r\n]+standalone[ \t\r\n]*=[ \t\r\n]*(?:"(yes|no)"|'(yes|no)'))?[ \t\r\n]*$/

const pubidPattern = /^[ \r\na-zA-Z0-9\-'()+,./:=?;!*#@$_%]*$/

const predefinedEntities: Record<string, string> = { lt: "<", gt: ">", amp: "&", apos: "'", quot: "\"" }

// -----------------------------------------------------------------------------
// Token scanner
// -----------------------------------------------------------------------------

// States of `Scanner`, which finds where a token split between chunks ends
const S_START = 0
const S_TEXT = 1
const S_LT = 2 // after "<"
const S_BANG = 3 // after "<!"
const S_KEYWORD = 4 // matching the rest of "<!--", "<![CDATA[" or "<!DOCTYPE"
const S_COMMENT = 5
const S_CDATA = 6
const S_PI = 7
const S_TAG = 8
const S_DOCTYPE = 9 // a DOCTYPE before its internal subset
const S_SUBSET = 10
const S_SUBSET_LT = 11
const S_SUBSET_BANG = 12
const S_SUBSET_BANG_DASH = 13
const S_SUBSET_COMMENT = 14
const S_SUBSET_PI = 15
const S_DECLARATION = 16 // a markup declaration in the internal subset
const S_AFTER_SUBSET = 17

// Scans a token one character at a time, so that the scan can resume in the
// next chunk. A token "ends" where it is complete or where it is known to be
// malformed; the parser then reads the complete token from a single string.
class Scanner {
  state = S_START
  // A count of trailing "-", "]" or "?" characters, or an open quote
  aux = 0
  keyword = ""

  reset(state: number): void {
    this.state = state
    this.aux = 0
  }

  // Returns an index of `s` at which the token has ended, or -1
  scan(s: string, i: number): number {
    const n = s.length
    while (i < n) {
      const c = s.charCodeAt(i)
      switch (this.state) {
        case S_START: {
          this.state = c === LT ? S_LT : S_TEXT
          if (c !== LT) continue
          break
        }
        case S_TEXT: {
          return s.indexOf("<", i)
        }
        case S_LT: {
          if (c === BANG) {
            this.state = S_BANG
          } else if (c === QUESTION) {
            this.reset(S_PI)
          } else {
            this.reset(S_TAG)
            continue
          }
          break
        }
        case S_BANG: {
          if (c === DASH) this.keyword = "--"
          else if (c === LBRACKET) this.keyword = "[CDATA["
          else if (c === 68) this.keyword = "DOCTYPE"
          else return i
          this.state = S_KEYWORD
          this.aux = 1
          break
        }
        case S_KEYWORD: {
          if (c !== this.keyword.charCodeAt(this.aux)) return i
          if (++this.aux === this.keyword.length) {
            this.reset(this.keyword === "--" ? S_COMMENT : this.keyword === "DOCTYPE" ? S_DOCTYPE : S_CDATA)
          }
          break
        }
        case S_COMMENT:
        case S_SUBSET_COMMENT: {
          if (c === DASH) {
            this.aux++
          } else if (c === GT && this.aux >= 2) {
            if (this.state === S_COMMENT) return i + 1
            this.reset(S_SUBSET)
          } else {
            this.aux = 0
          }
          break
        }
        case S_CDATA: {
          if (c === RBRACKET) this.aux++
          else if (c === GT && this.aux >= 2) return i + 1
          else this.aux = 0
          break
        }
        case S_PI:
        case S_SUBSET_PI: {
          if (c === GT && this.aux === 1) {
            if (this.state === S_PI) return i + 1
            this.reset(S_SUBSET)
          } else {
            this.aux = c === QUESTION ? 1 : 0
          }
          break
        }
        case S_TAG: {
          // Attribute values cannot contain "<"
          if (c === LT) return i
          if (this.aux === 0) {
            if (c === GT) return i + 1
            if (c === DQUOTE || c === SQUOTE) this.aux = c
          } else if (c === this.aux) {
            this.aux = 0
          }
          break
        }
        case S_DOCTYPE:
        case S_DECLARATION: {
          if (this.aux === 0) {
            if (c === LT) return i
            if (c === GT) {
              if (this.state === S_DOCTYPE) return i + 1
              this.reset(S_SUBSET)
            } else if (c === LBRACKET && this.state === S_DOCTYPE) {
              this.reset(S_SUBSET)
            } else if (c === DQUOTE || c === SQUOTE) {
              this.aux = c
            }
          } else if (c === this.aux) {
            this.aux = 0
          }
          break
        }
        case S_SUBSET: {
          if (c === RBRACKET) this.state = S_AFTER_SUBSET
          else if (c === LT) this.state = S_SUBSET_LT
          else if (c === DQUOTE || c === SQUOTE || c === GT) return i
          break
        }
        case S_SUBSET_LT: {
          if (c === BANG) this.state = S_SUBSET_BANG
          else if (c === QUESTION) this.reset(S_SUBSET_PI)
          else return i
          break
        }
        case S_SUBSET_BANG: {
          if (c === DASH) {
            this.state = S_SUBSET_BANG_DASH
          } else {
            this.reset(S_DECLARATION)
            continue
          }
          break
        }
        case S_SUBSET_BANG_DASH: {
          if (c !== DASH) return i
          this.reset(S_SUBSET_COMMENT)
          break
        }
        case S_AFTER_SUBSET: {
          if (c === GT) return i + 1
          if (!isSpace(c)) return i
          break
        }
      }
      i++
    }
    return -1
  }
}

// -----------------------------------------------------------------------------
// Decoder
// -----------------------------------------------------------------------------

const PROLOG = 0
const CONTENT = 1
const EPILOG = 2

const describeToken = (s: string, i: number): string =>
  s.startsWith("<!--", i) ?
    "comment" :
    s.startsWith("<![CDATA[", i) ?
    "CDATA section" :
    s.startsWith("<!DOCTYPE", i) ?
    "DOCTYPE" :
    s.startsWith("<?", i) ?
    "processing instruction" :
    s.startsWith("</", i) ?
    "end tag" :
    "start tag"

// Returns 1 when `s` has `keyword` at `i`, 0 when `s` ends with a prefix of it,
// and -1 otherwise
const matchKeyword = (s: string, i: number, keyword: string): number => {
  for (let k = 0; k < keyword.length; k++) {
    if (i + k >= s.length) return 0
    if (s.charCodeAt(i + k) !== keyword.charCodeAt(k)) return -1
  }
  return 1
}

const emptyAttributes: Readonly<Record<string, string>> = Object.freeze({})

class Parser {
  out: Array<Event> = []

  // The text being parsed, which starts at document offset `base`
  private buf = ""
  private base = 0
  // Number of characters received, excluding a byte order mark
  private received = 0
  private started = false

  // A token that continues in the next chunk
  private pending: Array<string> | undefined
  private pendingStart = 0
  private pendingLength = 0
  private readonly scanner = new Scanner()

  // Line and column of document offset `counted`
  private line = 1
  private lineStart = 0
  private counted = 0

  private state = PROLOG
  private readonly stack: Array<string> = []
  private doctype = false
  private literalEnd = 0
  // Character data that has not been emitted yet, and its size in the input
  private text = ""
  private textSize = 0

  private readonly maxTokenSize: number
  private readonly maxDepth: number
  private readonly bytes: boolean

  constructor(maxTokenSize: number, maxDepth: number, bytes: boolean) {
    this.maxTokenSize = maxTokenSize
    this.maxDepth = maxDepth
    this.bytes = bytes
  }

  // Document offset of the end of the input received so far
  get offset(): number {
    return this.received
  }

  feed(chunk: string): void {
    if (chunk.length === 0) return
    if (!this.started) {
      this.started = true
      if (chunk.charCodeAt(0) === 0xFEFF) chunk = chunk.slice(1)
    }
    const invalid = chunk.search(this.bytes ? invalidDecodedChar : invalidChar)
    if (invalid !== -1) {
      // Parse up to the invalid character first, so that earlier errors are
      // reported first however the input is chunked
      this.consume(chunk.slice(0, invalid), true)
      const code = chunk.codePointAt(invalid)!.toString(16).toUpperCase().padStart(4, "0")
      throw this.error("Syntax", `invalid character U+${code}`, this.received)
    }
    this.consume(chunk)
  }

  end(): void {
    if (this.pending !== undefined) {
      this.load(this.pending.join(""), this.pendingStart)
      this.pending = undefined
    }
    this.parse(true)
    if (this.state === PROLOG) throw this.error("Syntax", "no root element", this.received)
    if (this.state === CONTENT) {
      throw this.error("Syntax", `unclosed element <${this.stack[this.stack.length - 1]}>`, this.received)
    }
  }

  error(kind: XmlError["kind"], message: string, at: number): XmlError {
    if (at > this.counted) {
      if (this.pending !== undefined) this.count(this.pending.join(""), this.pendingStart, at - this.pendingStart)
      else this.count(this.buf, this.base, at - this.base)
    }
    const line = this.line
    const column = at - this.lineStart + 1
    return new XmlError({ kind, message: `${message} at line ${line}, column ${column}`, line, column })
  }

  // Advances the line count from `counted` to `to`, an index of `s`, which
  // starts at document offset `base`. Counting resumes only where parsing
  // stopped, which is never between a CR and an LF.
  private count(s: string, base: number, to: number): void {
    let i = this.counted - base
    if (i >= to) return
    const cr = s.indexOf("\r", i)
    if (cr === -1 || cr >= to) {
      let lf = s.indexOf("\n", i)
      while (lf !== -1 && lf < to) {
        this.line++
        this.lineStart = base + lf + 1
        lf = s.indexOf("\n", lf + 1)
      }
    } else {
      for (; i < to; i++) {
        const c = s.charCodeAt(i)
        if (c === CR || (c === LF && !(i > 0 && s.charCodeAt(i - 1) === CR))) {
          this.line++
          this.lineStart = base + i + 1
        } else if (c === LF) {
          this.lineStart = base + i + 1
        }
      }
    }
    this.counted = base + to
  }

  private syntax(message: string, i: number): XmlError {
    return this.error("Syntax", message, this.base + i)
  }

  private limit(message: string, at: number): XmlError {
    return this.error("Limit", message, at)
  }

  private consume(chunk: string, force = false): void {
    this.received += chunk.length
    if (this.pending !== undefined) {
      if (!force && this.scanner.scan(chunk, 0) === -1) {
        this.pending.push(chunk)
        this.pendingLength += chunk.length
        this.checkPending()
        return
      }
      this.load(this.pending.join("") + chunk, this.pendingStart)
      this.pending = undefined
    } else {
      this.load(chunk, this.received - chunk.length)
    }
    this.parse(false)
  }

  private load(buf: string, base: number): void {
    this.buf = buf
    this.base = base
  }

  private checkPending(): void {
    const text = this.scanner.state === S_TEXT ? this.textSize : 0
    if (this.pendingLength + text > this.maxTokenSize) {
      throw this.limit(`token exceeds maxTokenSize of ${this.maxTokenSize}`, this.pendingStart)
    }
  }

  private parse(final: boolean): void {
    const s = this.buf
    const n = s.length
    // Positions of the next "&", CR and "]]>", so that text runs are checked
    // without searching past them repeatedly
    let nextAmp = -1
    let nextCR = -1
    let nextCdataEnd = -1
    let i = 0
    while (i < n) {
      if (s.charCodeAt(i) !== LT) {
        let j = s.indexOf("<", i)
        if (j === -1) {
          if (!final) break
          j = n
        }
        if (this.state !== CONTENT) {
          this.checkSize(i, j)
          this.whitespace(s, i, j)
        } else {
          this.addText(i, j - i)
          if (nextCdataEnd < i) nextCdataEnd = indexOrEnd(s, "]]>", i)
          if (nextCdataEnd < j) throw this.syntax("\"]]>\" is not allowed in text", nextCdataEnd)
          if (nextAmp < i) nextAmp = indexOrEnd(s, "&", i)
          if (nextCR < i) nextCR = indexOrEnd(s, "\r", i)
          const raw = s.slice(i, j)
          this.text += nextAmp >= j && nextCR >= j ? raw : this.decodeText(raw, i, false)
        }
        i = j
        continue
      }
      const end = this.markup(s, i)
      if (end === -1) {
        if (final) throw this.syntax(`unterminated ${describeToken(s, i)}`, i)
        break
      }
      i = end
    }
    this.count(s, this.base, i)
    this.buf = ""
    if (i < n) {
      const rest = i === 0 ? s : s.slice(i)
      this.pending = [rest]
      this.pendingStart = this.base + i
      this.pendingLength = rest.length
      // Brings the scanner to the end of the incomplete token
      this.scanner.reset(S_START)
      this.scanner.scan(rest, 0)
      this.checkPending()
    }
  }

  private flushText(): void {
    if (this.text.length > 0) {
      this.out.push({ _tag: "Text", text: this.text })
      this.text = ""
    }
    this.textSize = 0
  }

  // Adds the size of the text run or CDATA section at `i`. Exceeding the limit
  // is reported there, rather than at the start of the text.
  private addText(i: number, size: number): void {
    this.textSize += size
    if (this.textSize > this.maxTokenSize) {
      throw this.limit(`text exceeds maxTokenSize of ${this.maxTokenSize}`, this.base + i)
    }
  }

  // Checks that the text run `s[i, j)` outside the root element is whitespace
  private whitespace(s: string, i: number, j: number): void {
    for (let k = i; k < j; k++) {
      if (!isSpace(s.charCodeAt(k))) {
        throw this.syntax(this.state === PROLOG ? "text before the root element" : "text after the root element", k)
      }
    }
  }

  // Replaces references and normalizes line endings, or attribute whitespace
  private decodeText(raw: string, offset: number, attribute: boolean): string {
    let out = ""
    let k = 0
    while (true) {
      const amp = raw.indexOf("&", k)
      const literal = raw.slice(k, amp === -1 ? raw.length : amp)
      out += attribute ? normalizeAttribute(literal) : normalizeLines(literal)
      if (amp === -1) return out
      const semicolon = raw.indexOf(";", amp + 1)
      if (semicolon === -1) throw this.syntax("unterminated reference", offset + amp)
      out += this.reference(raw, amp, semicolon, offset)
      k = semicolon + 1
    }
  }

  // Decodes the reference `raw[amp, semicolon]`
  private reference(raw: string, amp: number, semicolon: number, offset: number): string {
    if (raw.charCodeAt(amp + 1) === HASH) {
      const hex = raw.charCodeAt(amp + 2) === LOWER_X
      const digits = raw.slice(amp + (hex ? 3 : 2), semicolon)
      const code = (hex ? hexDigits : decimalDigits).test(digits) ? parseInt(digits, hex ? 16 : 10) : -1
      if (!isChar(code)) throw this.syntax("invalid character reference", offset + amp)
      return String.fromCodePoint(code)
    }
    const name = raw.slice(amp + 1, semicolon)
    const value = predefinedEntities[name]
    if (value !== undefined && Object.hasOwn(predefinedEntities, name)) return value
    if (!isName(name)) throw this.syntax("invalid reference", offset + amp)
    if (this.doctype) {
      throw this.error(
        "Unsupported",
        `entity references other than the predefined entities are not supported: &${name};`,
        this.base + offset + amp
      )
    }
    throw this.syntax(`undefined entity &${name};`, offset + amp)
  }

  // Parses the markup at `i`, and returns its end or -1 when it is incomplete
  private markup(s: string, i: number): number {
    const n = s.length
    if (i + 1 >= n) return -1
    const c = s.charCodeAt(i + 1)
    if (c === SLASH) return this.endTag(s, i)
    if (c === QUESTION) return this.processingInstruction(s, i)
    if (c !== BANG) return this.startTag(s, i)
    if (i + 2 >= n) return -1
    const keyword = s.charCodeAt(i + 2) === DASH ? "<!--" : s.charCodeAt(i + 2) === LBRACKET ? "<![CDATA[" : "<!DOCTYPE"
    const match = matchKeyword(s, i, keyword)
    if (match === 0) return -1
    if (match < 0) throw this.syntax("invalid markup", i)
    return keyword === "<!--"
      ? this.comment(s, i)
      : keyword === "<!DOCTYPE"
      ? this.doctypeDeclaration(s, i)
      : this.cdata(s, i)
  }

  private checkSize(i: number, end: number): void {
    if (end - i > this.maxTokenSize) {
      throw this.limit(`token exceeds maxTokenSize of ${this.maxTokenSize}`, this.base + i)
    }
  }

  private startTag(s: string, i: number): number {
    const n = s.length
    if (this.state === EPILOG) throw this.syntax("content after the root element", i)
    let j = scanName(s, i + 1, n)
    if (j === i + 1) throw this.syntax("invalid element name", i + 1)
    if (j >= n) return -1
    const name = s.slice(i + 1, j)
    let attributes: Record<string, string> | undefined
    let selfClosing = false
    while (true) {
      let c = s.charCodeAt(j)
      const space = isSpace(c)
      if (space) {
        j = skipSpace(s, j, n)
        if (j >= n) return -1
        c = s.charCodeAt(j)
      }
      if (c === GT) {
        j++
        break
      }
      if (c === SLASH) {
        if (j + 1 >= n) return -1
        if (s.charCodeAt(j + 1) !== GT) throw this.syntax("expected \">\"", j + 1)
        j += 2
        selfClosing = true
        break
      }
      if (!space) throw this.syntax("expected whitespace, \">\" or \"/>\"", j)
      const nameStart = j
      j = scanName(s, j, n)
      if (j === nameStart) throw this.syntax("invalid attribute name", j)
      if (j >= n) return -1
      const attribute = s.slice(nameStart, j)
      j = skipSpace(s, j, n)
      if (j >= n) return -1
      if (s.charCodeAt(j) !== EQUALS) throw this.syntax("expected \"=\"", j)
      j = skipSpace(s, j + 1, n)
      if (j >= n) return -1
      const quote = s.charCodeAt(j)
      if (quote !== DQUOTE && quote !== SQUOTE) throw this.syntax("expected a quoted attribute value", j)
      const close = s.indexOf(quote === DQUOTE ? "\"" : "'", j + 1)
      if (close === -1) {
        const lt = s.indexOf("<", j + 1)
        if (lt !== -1) throw this.syntax("\"<\" is not allowed in attribute values", lt)
        return -1
      }
      const value = this.attributeValue(s, j + 1, close)
      if (attributes === undefined) {
        attributes = {}
      } else if (Object.hasOwn(attributes, attribute)) {
        throw this.syntax(`duplicate attribute ${attribute}`, nameStart)
      }
      if (attribute === "__proto__") {
        Object.defineProperty(attributes, attribute, { value, enumerable: true, writable: true, configurable: true })
      } else {
        attributes[attribute] = value
      }
      j = close + 1
      if (j >= n) return -1
    }
    this.checkSize(i, j)
    if (this.stack.length >= this.maxDepth) {
      throw this.limit(`element nesting exceeds maxDepth of ${this.maxDepth}`, this.base + i)
    }
    this.flushText()
    this.out.push({ _tag: "StartElement", name, attributes: attributes ?? emptyAttributes })
    if (selfClosing) {
      this.out.push({ _tag: "EndElement", name })
      if (this.stack.length === 0) this.state = EPILOG
    } else {
      this.stack.push(name)
      this.state = CONTENT
    }
    return j
  }

  private attributeValue(s: string, i: number, j: number): string {
    let decode = false
    for (let k = i; k < j; k++) {
      const c = s.charCodeAt(k)
      if (c === LT) throw this.syntax("\"<\" is not allowed in attribute values", k)
      if (c === AMPERSAND || c === TAB || c === LF || c === CR) decode = true
    }
    return decode ? this.decodeText(s.slice(i, j), i, true) : s.slice(i, j)
  }

  private endTag(s: string, i: number): number {
    const n = s.length
    const j = scanName(s, i + 2, n)
    if (j === i + 2) {
      if (j >= n) return -1
      throw this.syntax("invalid element name", j)
    }
    const k = skipSpace(s, j, n)
    if (k >= n) return -1
    if (s.charCodeAt(k) !== GT) throw this.syntax("expected \">\"", k)
    const open = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined
    if (open === undefined) throw this.syntax("end tag without a start tag", i)
    if (j - i - 2 !== open.length || !s.startsWith(open, i + 2)) {
      throw this.syntax(`end tag </${s.slice(i + 2, j)}> does not match <${open}>`, i)
    }
    this.checkSize(i, k + 1)
    this.flushText()
    this.stack.pop()
    this.out.push({ _tag: "EndElement", name: open })
    if (this.stack.length === 0) this.state = EPILOG
    return k + 1
  }

  private comment(s: string, i: number): number {
    const end = s.indexOf("-->", i + 4)
    if (end === -1) return -1
    const dashes = s.indexOf("--", i + 4)
    if (dashes < end) throw this.syntax("\"--\" is not allowed in comments", dashes)
    this.checkSize(i, end + 3)
    this.flushText()
    this.out.push({ _tag: "Comment", text: normalizeLines(s.slice(i + 4, end)) })
    return end + 3
  }

  private processingInstruction(s: string, i: number): number {
    const end = s.indexOf("?>", i + 2)
    if (end === -1) return -1
    const t = scanName(s, i + 2, end)
    if (t === i + 2) throw this.syntax("invalid processing instruction target", i + 2)
    const target = s.slice(i + 2, t)
    if (isReservedTarget(target)) {
      if (target === "xml" && this.base + i === 0) return this.declaration(s, i, t, end)
      throw this.syntax(
        target === "xml" ?
          "the XML declaration is only allowed at the start of the document" :
          `processing instruction target ${target} is reserved`,
        i
      )
    }
    let data = ""
    if (t < end) {
      if (!isSpace(s.charCodeAt(t))) throw this.syntax("expected whitespace after the target", t)
      data = normalizeLines(s.slice(skipSpace(s, t, end), end))
    }
    this.checkSize(i, end + 2)
    this.flushText()
    this.out.push({ _tag: "ProcessingInstruction", target, data })
    return end + 2
  }

  private declaration(s: string, i: number, t: number, end: number): number {
    this.checkSize(i, end + 2)
    const match = declarationPattern.exec(s.slice(t, end))
    if (match === null) throw this.syntax("invalid XML declaration", i)
    const encoding = match[3] ?? match[4]
    const standalone = match[5] ?? match[6]
    if (this.bytes && encoding !== undefined && !isUtf8(encoding)) {
      throw this.error(
        "Unsupported",
        `encoding ${encoding} is not supported for byte input, decode the bytes to text first`,
        this.base + i
      )
    }
    const event: { -readonly [K in keyof Declaration]: Declaration[K] } = {
      _tag: "Declaration",
      version: match[1] ?? match[2]
    }
    if (encoding !== undefined) event.encoding = encoding
    if (standalone !== undefined) event.standalone = standalone === "yes"
    this.out.push(event)
    return end + 2
  }

  private cdata(s: string, i: number): number {
    const end = s.indexOf("]]>", i + 9)
    if (end === -1) return -1
    if (this.state !== CONTENT) throw this.syntax("CDATA sections are only allowed inside the root element", i)
    this.addText(i, end + 3 - i)
    this.text += normalizeLines(s.slice(i + 9, end))
    return end + 3
  }

  private doctypeDeclaration(s: string, i: number): number {
    if (this.state !== PROLOG || this.doctype) {
      throw this.syntax("a DOCTYPE is only allowed once, before the root element", i)
    }
    const scanner = new Scanner()
    scanner.reset(S_DOCTYPE)
    const end = scanner.scan(s, i + 9)
    if (end === -1) return -1
    this.checkSize(i, end)
    // Entity references in the internal subset are unsupported, as in content
    this.doctype = true
    let j = this.space(s, i + 9, end)
    const nameEnd = this.name(s, j, end)
    const event: { -readonly [K in keyof Doctype]: Doctype[K] } = { _tag: "Doctype", name: s.slice(j, nameEnd) }
    j = skipSpace(s, nameEnd, end)
    if (j > nameEnd && (s.startsWith("PUBLIC", j) || s.startsWith("SYSTEM", j))) {
      if (s.charCodeAt(j) === 80) {
        // Whitespace in public identifiers is normalized for matching
        event.publicId = this.publicLiteral(s, this.space(s, j + 6, end), end).replace(publicIdWhitespace, " ").trim()
        j = this.literalEnd
      }
      event.systemId = normalizeLines(
        this.literal(s, this.space(s, j + (event.publicId === undefined ? 6 : 0), end), end)
      )
      j = skipSpace(s, this.literalEnd, end)
    }
    if (s.charCodeAt(j) === LBRACKET) j = skipSpace(s, this.internalSubset(s, j + 1, end), end)
    if (j !== end - 1 || s.charCodeAt(j) !== GT) throw this.syntax("invalid DOCTYPE", j)
    this.out.push(event)
    return end
  }

  // Skips the whitespace that is required at `i`
  private space(s: string, i: number, end: number): number {
    if (i >= end || !isSpace(s.charCodeAt(i))) throw this.syntax("expected whitespace", i)
    return skipSpace(s, i, end)
  }

  // Returns the end of the name that is required at `i`
  private name(s: string, i: number, end: number): number {
    const nameEnd = scanName(s, i, end)
    if (nameEnd === i) throw this.syntax("expected a name", i)
    return nameEnd
  }

  // Reads the quoted literal at `i`, and sets `literalEnd` to the index after it
  private literal(s: string, i: number, end: number): string {
    const quote = s.charCodeAt(i)
    if (quote !== DQUOTE && quote !== SQUOTE) throw this.syntax("expected a quoted literal", i)
    const close = s.indexOf(quote === DQUOTE ? "\"" : "'", i + 1)
    if (close === -1 || close >= end) throw this.syntax("unterminated literal", i)
    this.literalEnd = close + 1
    return s.slice(i + 1, close)
  }

  private publicLiteral(s: string, i: number, end: number): string {
    const literal = this.literal(s, i, end)
    if (!pubidPattern.test(literal)) throw this.syntax("invalid public identifier", i)
    return literal
  }

  // Checks the internal subset starting at `i`, and returns the index after "]"
  private internalSubset(s: string, i: number, end: number): number {
    while (i < end) {
      const c = s.charCodeAt(i)
      if (isSpace(c)) {
        i++
      } else if (c === RBRACKET) {
        return i + 1
      } else if (c === PERCENT) {
        const nameEnd = this.name(s, i + 1, end)
        if (s.charCodeAt(nameEnd) !== SEMICOLON) throw this.syntax("expected \";\"", nameEnd)
        i = nameEnd + 1
      } else if (s.startsWith("<!--", i)) {
        const close = s.indexOf("-->", i + 4)
        const dashes = s.indexOf("--", i + 4)
        if (close === -1 || close >= end) throw this.syntax("unterminated comment", i)
        if (dashes < close) throw this.syntax("\"--\" is not allowed in comments", dashes)
        i = close + 3
      } else if (s.startsWith("<?", i)) {
        const close = s.indexOf("?>", i + 2)
        if (close === -1 || close >= end) throw this.syntax("unterminated processing instruction", i)
        const t = scanName(s, i + 2, close)
        if (t === i + 2 || isReservedTarget(s.slice(i + 2, t)) || (t < close && !isSpace(s.charCodeAt(t)))) {
          throw this.syntax("invalid processing instruction", i)
        }
        i = close + 2
      } else if (s.startsWith("<!", i)) {
        i = this.markupDeclaration(s, i, end)
      } else {
        throw this.syntax("invalid markup in the internal subset", i)
      }
    }
    throw this.syntax("unterminated internal subset", i)
  }

  // Checks the element, attribute list, entity or notation declaration at `i`,
  // and returns the index after it. Declarations are not applied.
  private markupDeclaration(s: string, i: number, end: number): number {
    let j: number
    if (s.startsWith("<!ELEMENT", i)) {
      j = this.space(s, this.name(s, this.space(s, i + 9, end), end), end)
      if (s.startsWith("EMPTY", j)) j += 5
      else if (s.startsWith("ANY", j)) j += 3
      else j = this.contentModel(s, j, end)
    } else if (s.startsWith("<!ATTLIST", i)) {
      j = this.name(s, this.space(s, i + 9, end), end)
      while (true) {
        const k = skipSpace(s, j, end)
        if (k === j || s.charCodeAt(k) === GT) break
        j = this.space(s, this.name(s, k, end), end)
        j = this.space(s, this.attributeType(s, j, end), end)
        j = this.defaultDeclaration(s, j, end)
      }
    } else if (s.startsWith("<!ENTITY", i)) {
      j = this.space(s, i + 8, end)
      const parameter = s.charCodeAt(j) === PERCENT
      if (parameter) j = this.space(s, j + 1, end)
      j = this.space(s, this.name(s, j, end), end)
      const quote = s.charCodeAt(j)
      if (quote === DQUOTE || quote === SQUOTE) {
        j = this.entityValue(s, j, end)
      } else {
        j = this.externalId(s, j, end, false)
        const k = skipSpace(s, j, end)
        if (!parameter && k > j && s.startsWith("NDATA", k)) j = this.name(s, this.space(s, k + 5, end), end)
      }
    } else if (s.startsWith("<!NOTATION", i)) {
      j = this.space(s, this.name(s, this.space(s, i + 10, end), end), end)
      j = this.externalId(s, j, end, true)
    } else {
      throw this.syntax("invalid markup declaration", i)
    }
    j = skipSpace(s, j, end)
    if (s.charCodeAt(j) !== GT) throw this.syntax("expected \">\"", j)
    return j + 1
  }

  // Checks a content model of an element declaration, such as `(a, (b | c)*)`
  private contentModel(s: string, i: number, end: number): number {
    if (s.charCodeAt(i) !== LPAREN) throw this.syntax("invalid content specification", i)
    let j = skipSpace(s, i + 1, end)
    if (!s.startsWith("#PCDATA", j)) return this.contentGroup(s, j, end, 1)
    j = skipSpace(s, j + 7, end)
    let names = false
    while (s.charCodeAt(j) === PIPE) {
      j = skipSpace(s, this.name(s, skipSpace(s, j + 1, end), end), end)
      names = true
    }
    if (s.charCodeAt(j) !== RPAREN) throw this.syntax("expected \")\"", j)
    if (s.charCodeAt(j + 1) === STAR) return j + 2
    if (names) throw this.syntax("expected \"*\"", j + 1)
    return j + 1
  }

  // Checks a choice or sequence after its "(", and returns the index after it
  private contentGroup(s: string, i: number, end: number, depth: number): number {
    if (depth > this.maxDepth) {
      throw this.limit(`content model nesting exceeds maxDepth of ${this.maxDepth}`, this.base + i)
    }
    let separator = 0
    while (true) {
      i = s.charCodeAt(i) === LPAREN ?
        this.contentGroup(s, skipSpace(s, i + 1, end), end, depth + 1) :
        quantified(s, this.name(s, i, end))
      i = skipSpace(s, i, end)
      const c = s.charCodeAt(i)
      if (c === RPAREN) return quantified(s, i + 1)
      if ((c !== PIPE && c !== COMMA) || (separator !== 0 && c !== separator)) {
        throw this.syntax("expected \")\"", i)
      }
      separator = c
      i = skipSpace(s, i + 1, end)
    }
  }

  private attributeType(s: string, i: number, end: number): number {
    if (s.charCodeAt(i) === LPAREN) return this.enumeration(s, i, end, false)
    if (s.startsWith("NOTATION", i)) return this.enumeration(s, this.space(s, i + 8, end), end, true)
    const typeEnd = scanName(s, i, end)
    if (!attributeTypes.has(s.slice(i, typeEnd))) throw this.syntax("invalid attribute type", i)
    return typeEnd
  }

  // Checks `(a | b)`, where the alternatives are names or name tokens
  private enumeration(s: string, i: number, end: number, names: boolean): number {
    if (s.charCodeAt(i) !== LPAREN) throw this.syntax("expected \"(\"", i)
    do {
      i = skipSpace(s, i + 1, end)
      const tokenEnd = names ? scanName(s, i, end) : scanNameToken(s, i, end)
      if (tokenEnd === i) throw this.syntax("expected a name", i)
      i = skipSpace(s, tokenEnd, end)
    } while (s.charCodeAt(i) === PIPE)
    if (s.charCodeAt(i) !== RPAREN) throw this.syntax("expected \")\"", i)
    return i + 1
  }

  private defaultDeclaration(s: string, i: number, end: number): number {
    if (s.startsWith("#REQUIRED", i)) return i + 9
    if (s.startsWith("#IMPLIED", i)) return i + 8
    if (s.startsWith("#FIXED", i)) i = this.space(s, i + 6, end)
    const value = this.literal(s, i, end)
    this.attributeValue(s, i + 1, i + 1 + value.length)
    return this.literalEnd
  }

  // Checks an entity value, whose references are not replaced
  private entityValue(s: string, i: number, end: number): number {
    const value = this.literal(s, i, end)
    for (let k = 0; k < value.length; k++) {
      const c = value.charCodeAt(k)
      if (c === PERCENT) {
        throw this.syntax("parameter entity references are not allowed in internal subset declarations", i + 1 + k)
      }
      if (c === AMPERSAND) {
        const semicolon = value.indexOf(";", k + 1)
        if (semicolon === -1) throw this.syntax("unterminated reference", i + 1 + k)
        if (value.charCodeAt(k + 1) === HASH) this.reference(value, k, semicolon, i + 1)
        else if (!isName(value.slice(k + 1, semicolon))) throw this.syntax("invalid reference", i + 1 + k)
        k = semicolon
      }
    }
    return this.literalEnd
  }

  private externalId(s: string, i: number, end: number, notation: boolean): number {
    if (s.startsWith("SYSTEM", i)) {
      this.literal(s, this.space(s, i + 6, end), end)
      return this.literalEnd
    }
    if (!s.startsWith("PUBLIC", i)) throw this.syntax("expected an external identifier", i)
    this.publicLiteral(s, this.space(s, i + 6, end), end)
    const j = this.literalEnd
    // Notations may have a public identifier alone
    const k = skipSpace(s, j, end)
    const quote = s.charCodeAt(k)
    if (notation && (k === j || (quote !== DQUOTE && quote !== SQUOTE))) return j
    this.literal(s, this.space(s, j, end), end)
    return this.literalEnd
  }
}

const attributeTypes = new Set(["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"])

const scanNameToken = (s: string, i: number, end: number): number => {
  while (i < end && isNameCode(s.charCodeAt(i))) i++
  return i
}

const quantified = (s: string, i: number): number => {
  const c = s.charCodeAt(i)
  return c === QUESTION || c === STAR || c === PLUS ? i + 1 : i
}

const indexOrEnd = (s: string, search: string, from: number): number => {
  const i = s.indexOf(search, from)
  return i === -1 ? s.length : i
}

class TextInput implements Machine<string, Event> {
  private readonly parser: Parser
  // A high surrogate at the end of a chunk, which pairs with the next chunk
  private surrogate = ""

  constructor(parser: Parser) {
    this.parser = parser
  }

  get out(): Array<Event> {
    return this.parser.out
  }
  set out(out: Array<Event>) {
    this.parser.out = out
  }

  push(chunk: string): void {
    if (this.surrogate !== "") {
      chunk = this.surrogate + chunk
      this.surrogate = ""
    }
    const last = chunk.charCodeAt(chunk.length - 1)
    if (last >= 0xD800 && last <= 0xDBFF) {
      this.surrogate = chunk.slice(-1)
      chunk = chunk.slice(0, -1)
    }
    this.parser.feed(chunk)
  }

  end(): void {
    // An unpaired high surrogate fails as an invalid character
    this.parser.feed(this.surrogate)
    this.parser.end()
  }
}

const utf8Length = (lead: number): number => lead >= 0xF0 ? 4 : lead >= 0xE0 ? 3 : lead >= 0xC0 ? 2 : 1

// Returns the length of the valid UTF-8 prefix of `bytes`
const validUtf8 = (bytes: Uint8Array): number => {
  let i = 0
  while (i < bytes.length) {
    const lead = bytes[i]
    if (lead < 0x80) {
      i++
      continue
    }
    const length = lead >= 0xC2 && lead <= 0xF4 ? utf8Length(lead) : 0
    if (length === 0 || i + length > bytes.length) return i
    let code = lead & (0xFF >> (length + 1))
    for (let k = 1; k < length; k++) {
      const c = bytes[i + k]
      if ((c & 0xC0) !== 0x80) return i
      code = (code << 6) | (c & 0x3F)
    }
    const min = length === 2 ? 0x80 : length === 3 ? 0x800 : 0x10000
    if (code < min || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return i
    i += length
  }
  return i
}

// Decodes UTF-8 without streaming state, so that the position of invalid bytes
// is known: an incomplete sequence at the end of a chunk is carried over.
class Utf8Input implements Machine<Uint8Array, Event> {
  private readonly parser: Parser
  private readonly decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  private carry: Uint8Array | undefined

  constructor(parser: Parser) {
    this.parser = parser
  }

  get out(): Array<Event> {
    return this.parser.out
  }
  set out(out: Array<Event>) {
    this.parser.out = out
  }

  push(chunk: Uint8Array): void {
    let start = 0
    if (this.carry !== undefined) {
      const need = utf8Length(this.carry[0]) - this.carry.length
      const head = new Uint8Array(this.carry.length + Math.min(need, chunk.length))
      head.set(this.carry)
      head.set(chunk.subarray(0, need), this.carry.length)
      if (chunk.length < need) {
        this.carry = head
        return
      }
      this.carry = undefined
      this.decode(head)
      start = need
    }
    const n = chunk.length
    let end = n
    for (let k = 1; k <= 3 && n - k >= start; k++) {
      const b = chunk[n - k]
      if ((b & 0xC0) === 0x80) continue
      if (b >= 0xC0 && k < utf8Length(b)) end = n - k
      break
    }
    if (end < n) this.carry = chunk.slice(end)
    if (end > start) this.decode(start === 0 && end === n ? chunk : chunk.subarray(start, end))
  }

  end(): void {
    if (this.carry !== undefined) {
      throw this.parser.error("Syntax", "incomplete UTF-8 sequence at the end of the input", this.parser.offset)
    }
    this.parser.end()
  }

  private decode(bytes: Uint8Array): void {
    let text: string
    try {
      text = this.decoder.decode(bytes)
    } catch {
      this.parser.feed(this.decoder.decode(bytes.subarray(0, validUtf8(bytes))))
      throw this.parser.error("Syntax", "invalid UTF-8", this.parser.offset)
    }
    this.parser.feed(text)
  }
}

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

interface MutableElement {
  readonly name: string
  readonly attributes: Readonly<Record<string, string>>
  readonly children: Array<MutableElement | string>
}

class Collector implements Machine<Event, Element> {
  out: Array<Element> = []
  private depth = 0
  // Number of open elements, from the root, that match the path
  private matched = 0
  // The element being collected and its open descendants
  private readonly stack: Array<MutableElement> = []
  private size = 0
  private readonly path: ReadonlyArray<string>
  private readonly maxElementSize: number

  constructor(path: ReadonlyArray<string>, maxElementSize: number) {
    this.path = path
    this.maxElementSize = maxElementSize
  }

  push(event: Event): void {
    switch (event._tag) {
      case "StartElement": {
        const depth = this.depth++
        if (this.stack.length === 0) {
          const segment = this.path[depth]
          if (this.matched !== depth || (segment !== "*" && segment !== event.name)) return
          if (++this.matched < this.path.length) return
          this.size = 0
        }
        let size = event.name.length
        for (const key in event.attributes) size += key.length + event.attributes[key].length
        this.grow(size)
        const element: MutableElement = { name: event.name, attributes: event.attributes, children: [] }
        if (this.stack.length > 0) this.stack[this.stack.length - 1].children.push(element)
        this.stack.push(element)
        return
      }
      case "EndElement": {
        if (this.depth === 0) throw invalidEvent(`end tag </${event.name}> without a start tag`)
        if (this.stack.length > 0) {
          const element = this.stack.pop()!
          if (this.stack.length === 0) this.out.push(element)
        }
        if (this.matched === this.depth) this.matched--
        this.depth--
        return
      }
      case "Text": {
        if (this.stack.length === 0 || event.text.length === 0) return
        this.grow(event.text.length)
        const children = this.stack[this.stack.length - 1].children
        const last = children.length - 1
        if (last >= 0 && typeof children[last] === "string") children[last] += event.text
        else children.push(event.text)
        return
      }
    }
  }

  end(): void {
    if (this.depth > 0) throw invalidEvent("events ended inside an element")
  }

  private grow(size: number): void {
    this.size += size
    if (this.size > this.maxElementSize) {
      throw new XmlError({
        kind: "Limit",
        message: `element <${
          this.stack.length > 0 ? this.stack[0].name : this.path[this.path.length - 1]
        }> exceeds maxElementSize of ${this.maxElementSize}`
      })
    }
  }
}

// -----------------------------------------------------------------------------
// Encoder
// -----------------------------------------------------------------------------

const invalidEvent = (message: string) => new XmlError({ kind: "InvalidEvent", message })

const textEscapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\r": "&#13;" }
const attributeEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  "\"": "&quot;",
  "\t": "&#9;",
  "\n": "&#10;",
  "\r": "&#13;"
}

const textSpecials = /[&<>\r]/g
const attributeSpecials = /[&<"\t\n\r]/g
const escapeText = (s: string): string => s.replace(textSpecials, (c) => textEscapes[c])
const escapeAttribute = (s: string): string => s.replace(attributeSpecials, (c) => attributeEscapes[c])

const checkChars = (what: string, s: string): void => {
  const invalid = s.search(invalidChar)
  if (invalid !== -1) {
    const code = s.codePointAt(invalid)!.toString(16).toUpperCase().padStart(4, "0")
    throw invalidEvent(`${what} contains the invalid character U+${code}`)
  }
}

const checkName = (what: string, name: string): void => {
  if (typeof name !== "string" || !isName(name)) throw invalidEvent(`invalid ${what} ${JSON.stringify(name)}`)
}

const isWhitespace = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    if (!isSpace(s.charCodeAt(i))) return false
  }
  return true
}

const NOTHING_WRITTEN = 3

class Writer implements Machine<Event, string> {
  out: Array<string> = []
  private readonly stack: Array<string> = []
  private state = NOTHING_WRITTEN
  private doctype = false
  // Whether the last start tag still lacks its closing ">"
  private open = false
  private readonly bytes: boolean

  constructor(bytes: boolean) {
    this.bytes = bytes
  }

  push(event: Event): void {
    const text = this.write(event)
    if (text.length > 0) {
      const out = this.out
      if (out.length > 0) out[0] += text
      else out.push(text)
    }
  }

  end(): void {
    if (this.stack.length > 0) throw invalidEvent(`unclosed element <${this.stack[this.stack.length - 1]}>`)
    if (this.state !== EPILOG) throw invalidEvent("no root element")
  }

  private write(event: Event): string {
    if (event._tag === "EndElement") {
      const open = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined
      if (open === undefined) throw invalidEvent(`end tag </${event.name}> without a start tag`)
      if (event.name !== open) throw invalidEvent(`end tag </${event.name}> does not match <${open}>`)
      this.stack.pop()
      if (this.stack.length === 0) this.state = EPILOG
      if (this.open) {
        this.open = false
        return "/>"
      }
      return `</${open}>`
    }
    const prefix = this.open ? ">" : ""
    this.open = false
    switch (event._tag) {
      case "StartElement": {
        if (this.state === EPILOG) throw invalidEvent(`second root element <${event.name}>`)
        checkName("element name", event.name)
        let tag = prefix + "<" + event.name
        for (const name in event.attributes) {
          if (!Object.hasOwn(event.attributes, name)) continue
          const value = event.attributes[name]
          checkName("attribute name", name)
          if (typeof value !== "string") throw invalidEvent(`attribute ${name} must be a string`)
          checkChars(`attribute ${name}`, value)
          tag += ` ${name}="${escapeAttribute(value)}"`
        }
        this.stack.push(event.name)
        this.state = CONTENT
        this.open = true
        return tag
      }
      case "Text": {
        checkChars("text", event.text)
        if (this.state !== CONTENT) {
          if (!isWhitespace(event.text)) throw invalidEvent("text outside the root element must be whitespace")
          if (this.state === NOTHING_WRITTEN && event.text.length > 0) this.state = PROLOG
          return prefix + event.text
        }
        return prefix + escapeText(event.text)
      }
      case "Comment": {
        checkChars("comment", event.text)
        if (event.text.includes("--") || event.text.endsWith("-")) {
          throw invalidEvent("comments cannot contain \"--\" or end with \"-\"")
        }
        if (this.state === NOTHING_WRITTEN) this.state = PROLOG
        return `${prefix}<!--${event.text}-->`
      }
      case "ProcessingInstruction": {
        checkName("processing instruction target", event.target)
        if (isReservedTarget(event.target)) {
          throw invalidEvent(`processing instruction target ${event.target} is reserved`)
        }
        checkChars("processing instruction", event.data)
        if (event.data.includes("?>")) throw invalidEvent("processing instruction data cannot contain \"?>\"")
        if (this.state === NOTHING_WRITTEN) this.state = PROLOG
        return `${prefix}<?${event.target}${event.data === "" ? "" : " " + event.data}?>`
      }
      case "Declaration": {
        if (this.state !== NOTHING_WRITTEN) throw invalidEvent("the XML declaration must be the first event")
        if (!versionPattern.test(event.version)) throw invalidEvent(`invalid XML version ${event.version}`)
        let declaration = `<?xml version="${event.version}"`
        if (event.encoding !== undefined) {
          if (!encodingPattern.test(event.encoding)) {
            throw invalidEvent(`invalid encoding name ${event.encoding}`)
          }
          if (this.bytes && !isUtf8(event.encoding)) {
            throw invalidEvent(`encoding ${event.encoding} cannot be declared for UTF-8 output`)
          }
          declaration += ` encoding="${event.encoding}"`
        }
        if (event.standalone !== undefined) declaration += ` standalone="${event.standalone ? "yes" : "no"}"`
        this.state = PROLOG
        return declaration + "?>"
      }
      case "Doctype": {
        if (this.state === CONTENT || this.state === EPILOG || this.doctype) {
          throw invalidEvent("a DOCTYPE must appear once, before the root element")
        }
        checkName("DOCTYPE name", event.name)
        let doctype = `<!DOCTYPE ${event.name}`
        if (event.publicId !== undefined) {
          if (event.systemId === undefined) {
            throw invalidEvent("a DOCTYPE with a public identifier needs a system identifier")
          }
          if (!pubidPattern.test(event.publicId)) throw invalidEvent(`invalid public identifier ${event.publicId}`)
          doctype += ` PUBLIC "${event.publicId}"`
        }
        if (event.systemId !== undefined) {
          checkChars("system identifier", event.systemId)
          const hasDouble = event.systemId.includes("\"")
          if (hasDouble && event.systemId.includes("'")) {
            throw invalidEvent("a system identifier cannot contain both quote characters")
          }
          if (event.publicId === undefined) doctype += " SYSTEM"
          doctype += hasDouble ? ` '${event.systemId}'` : ` "${event.systemId}"`
        }
        this.doctype = true
        this.state = PROLOG
        return doctype + ">"
      }
    }
  }
}
