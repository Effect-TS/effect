/**
 * Encodes and decodes CSV streams, with optional schema transformations.
 *
 * **Details**
 *
 * Follows RFC 4180 with a configurable delimiter. Cells are strings: whitespace
 * and empty cells are preserved and schemas own value conversion. Quoted fields
 * support embedded delimiters, line breaks and doubled quotes. Decoders accept
 * LF, CRLF and CR record separators and strip an initial BOM.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Channel from "../Channel.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import * as Pull from "../Pull.ts"
import type * as Record from "../Record.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"

const CsvErrorTypeId = "~effect/encoding/Csv/CsvError"

/**
 * A CSV decoding failure.
 *
 * **Details**
 *
 * `record` is one-based and counts the header row and blank lines. `line` is
 * the one-based physical line where the record starts. `column` is the
 * one-based cell index of a syntax error.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CsvError extends Data.TaggedError("CsvError")<{
  readonly kind: "Syntax" | "RecordSize" | "Header"
  readonly message: string
  readonly record: number
  readonly line: number
  readonly column?: number | undefined
}> {
  /**
   * Identifies CSV errors across module instances.
   *
   * @stability unstable
   * @since 4.1.0
   */
  readonly [CsvErrorTypeId] = CsvErrorTypeId
}

/**
 * Checks whether a value is a `CsvError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.1.0
 */
export const isCsvError = (u: unknown): u is CsvError => Predicate.hasProperty(u, CsvErrorTypeId)

/**
 * A record as an array of string cells.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Row = ReadonlyArray<string>

/**
 * CSV decoding options.
 *
 * **Details**
 *
 * - `delimiter`: a single character other than a quote or line break. Defaults
 *   to `","`.
 * - `maxRecordSize`: the maximum record length in UTF-16 code units, including
 *   quotes and delimiters but not the record separator. Defaults to 1 MiB;
 *   `Infinity` disables the limit.
 * - `ignoreEmptyLines`: skips records with no characters. Defaults to `false`,
 *   where an empty line is a record with one empty cell.
 * - `headers`: uses the first record as unique field names and emits the
 *   remaining records as objects of the same width. Defaults to `false`.
 *
 * Invalid options throw when the channel is created.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export interface DecodeOptions {
  readonly delimiter?: string | undefined
  readonly maxRecordSize?: number | undefined
  readonly ignoreEmptyLines?: boolean | undefined
  readonly headers?: boolean | undefined
}

/**
 * CSV encoding options.
 *
 * **Details**
 *
 * - `delimiter`: a single character other than a quote or line break. Defaults
 *   to `","`.
 * - `newline`: the record separator written after every record. Defaults to
 *   `"\r\n"`.
 * - `columns`: encodes object records by these keys, in order. Missing or
 *   `undefined` values become empty cells.
 * - `headers`: writes `columns` as the first record, even for an empty stream.
 *   Requires `columns`.
 *
 * Invalid options throw when the channel is created.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export interface EncodeOptions {
  readonly delimiter?: string | undefined
  readonly newline?: "\n" | "\r\n" | undefined
  readonly columns?: ReadonlyArray<string> | undefined
  readonly headers?: boolean | undefined
}

/**
 * Schemas whose encoded side is a row or a record of string cells.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface RowCodec
  extends Schema.ConstraintCodec<any, Row | Record.ReadonlyRecord<string, string | undefined>, unknown, unknown>
{}

/**
 * Schema encoding options. `columns` defaults to the encoded keys of a struct
 * schema; for other object schemas it is required. Tuple and array schemas
 * write cells by position and use `columns` only as header names.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export type EncodeSchemaOptions<S extends RowCodec> = Omit<EncodeOptions, "columns"> & {
  readonly columns?:
    | (S["Encoded"] extends ReadonlyArray<unknown> ? ReadonlyArray<string>
      : ReadonlyArray<Extract<keyof S["Encoded"], string>>)
    | undefined
}

const defaultMaxRecordSize = 1024 * 1024

const checkDelimiter = (delimiter: string): string => {
  if (delimiter.length !== 1 || delimiter === "\"" || delimiter === "\r" || delimiter === "\n") {
    throw new Error(`Csv: delimiter must be one character other than a quote or line break, got ${delimiter}`)
  }
  return delimiter
}

const QUOTE = 34
const CR = 13
const LF = 10

// Parser states
// At the start of a field.
const FIELD_START = 0
// Inside an unquoted field.
const UNQUOTED = 1
// Inside a quoted field.
const QUOTED = 2
// After a quote inside a quoted field: a closing or an escaped quote.
const QUOTE_IN_QUOTED = 3

interface Parsed {
  readonly cells: Row
  readonly record: number
  readonly line: number
}

class Parser {
  readonly delimiter: number
  readonly maxRecordSize: number
  readonly ignoreEmptyLines: boolean

  state: number = FIELD_START
  // The partial field, carried across chunks.
  field = ""
  cells: Array<string> = []
  size = 0
  record = 1
  line = 1
  recordLine = 1
  started = false
  // A CR ended the previous record, so a leading LF completes a CRLF.
  skipLF = false
  // Quoted content ended with a CR, so a leading LF does not start a new line.
  quotedCR = false

  constructor(delimiter: string, maxRecordSize: number, ignoreEmptyLines: boolean) {
    this.delimiter = delimiter.charCodeAt(0)
    this.maxRecordSize = maxRecordSize
    this.ignoreEmptyLines = ignoreEmptyLines
  }

  fail(kind: "Syntax" | "RecordSize", message: string): CsvError {
    return new CsvError({
      kind,
      message,
      record: this.record,
      line: this.recordLine,
      column: kind === "Syntax" ? this.cells.length + 1 : undefined
    })
  }

  grow(n: number): void {
    this.size += n
    if (this.size > this.maxRecordSize) {
      throw this.fail("RecordSize", `CSV record exceeds maxRecordSize of ${this.maxRecordSize}`)
    }
  }

  endField(): void {
    this.cells.push(this.field)
    this.field = ""
    this.state = FIELD_START
  }

  endRecord(out: Array<Parsed>): void {
    this.endField()
    if (this.size > 0 || !this.ignoreEmptyLines) {
      out.push({ cells: this.cells, record: this.record, line: this.recordLine })
    }
    this.cells = []
    this.size = 0
    this.record++
  }

  // Ends the record at a line break and moves past it.
  lineBreak(text: string, i: number, out: Array<Parsed>): number {
    this.endRecord(out)
    this.line++
    this.recordLine = this.line
    this.skipLF = text.charCodeAt(i) === CR
    return i + 1
  }

  countLines(text: string, start: number, end: number): void {
    for (let i = start; i < end; i++) {
      const c = text.charCodeAt(i)
      if (c === CR) this.line++
      else if (c === LF && !(i === start ? this.quotedCR : text.charCodeAt(i - 1) === CR)) this.line++
    }
    if (end > start) this.quotedCR = text.charCodeAt(end - 1) === CR
  }

  feed(text: string, out: Array<Parsed>): void {
    const length = text.length
    const delimiter = this.delimiter
    let i = 0
    if (length > 0 && !this.started) {
      this.started = true
      if (text.charCodeAt(0) === 0xFEFF) i = 1
    }
    while (i < length) {
      switch (this.state) {
        case FIELD_START: {
          if (this.skipLF) {
            this.skipLF = false
            if (text.charCodeAt(i) === LF) {
              i++
              continue
            }
          }
          if (text.charCodeAt(i) === QUOTE) {
            this.grow(1)
            this.state = QUOTED
            this.quotedCR = false
            i++
            continue
          }
          this.state = UNQUOTED
          continue
        }
        case UNQUOTED: {
          let j = i
          let c = 0
          while (j < length) {
            c = text.charCodeAt(j)
            if (c === delimiter || c === CR || c === LF || c === QUOTE) break
            j++
          }
          if (j > i) {
            this.grow(j - i)
            this.field += text.slice(i, j)
          }
          if (j === length) return
          if (c === QUOTE) throw this.fail("Syntax", "Unexpected quote in an unquoted field")
          if (c === delimiter) {
            this.grow(1)
            this.endField()
            i = j + 1
          } else {
            i = this.lineBreak(text, j, out)
          }
          continue
        }
        case QUOTED: {
          const end = text.indexOf("\"", i)
          const j = end === -1 ? length : end
          this.grow(j - i + (end === -1 ? 0 : 1))
          this.field += text.slice(i, j)
          this.countLines(text, i, j)
          if (end === -1) return
          this.state = QUOTE_IN_QUOTED
          i = j + 1
          continue
        }
        case QUOTE_IN_QUOTED: {
          const c = text.charCodeAt(i)
          if (c === QUOTE) {
            this.grow(1)
            this.field += "\""
            this.state = QUOTED
            this.quotedCR = false
            i++
          } else if (c === delimiter) {
            this.grow(1)
            this.endField()
            i++
          } else if (c === CR || c === LF) {
            i = this.lineBreak(text, i, out)
          } else {
            throw this.fail("Syntax", "Expected a delimiter or line break after a closing quote")
          }
          continue
        }
      }
    }
  }

  end(out: Array<Parsed>): void {
    if (this.state === QUOTED) throw this.fail("Syntax", "Unterminated quoted field")
    if (this.size > 0 || this.cells.length > 0) this.endRecord(out)
  }
}

interface Decoded {
  readonly value: Row | Record.ReadonlyRecord<string, string>
  readonly record: number
}

const decodeRecords = <IE, Done>(options: DecodeOptions | undefined): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Decoded>,
  IE | CsvError,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done
> => {
  const delimiter = checkDelimiter(options?.delimiter ?? ",")
  const maxRecordSize = options?.maxRecordSize ?? defaultMaxRecordSize
  if (!(maxRecordSize > 0)) {
    throw new Error(`Csv: maxRecordSize must be positive, got ${maxRecordSize}`)
  }
  const ignoreEmptyLines = options?.ignoreEmptyLines === true
  const useHeaders = options?.headers === true
  return Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      const parser = new Parser(delimiter, maxRecordSize, ignoreEmptyLines)
      let headers: Row | undefined
      let done: Pull.Pull<never, never, Done> | undefined

      const toRecord = (row: Parsed): Decoded => {
        if (!useHeaders) return { value: row.cells, record: row.record }
        if (row.cells.length !== headers!.length) {
          throw new CsvError({
            kind: "Header",
            message: `Expected ${headers!.length} cells, got ${row.cells.length}`,
            record: row.record,
            line: row.line
          })
        }
        return { value: Object.fromEntries(headers!.map((name, i) => [name, row.cells[i]])), record: row.record }
      }

      const emit = (
        run: (out: Array<Parsed>) => void
      ): Pull.Pull<Arr.NonEmptyReadonlyArray<Decoded>, IE | CsvError, Done> => {
        const rows: Array<Parsed> = []
        const out: Array<Decoded> = []
        try {
          run(rows)
          for (const row of rows) {
            if (useHeaders && headers === undefined) {
              if (new Set(row.cells).size !== row.cells.length) {
                throw new CsvError({
                  kind: "Header",
                  message: "Duplicate header name",
                  record: row.record,
                  line: row.line
                })
              }
              headers = row.cells
            } else {
              out.push(toRecord(row))
            }
          }
        } catch (error) {
          if (isCsvError(error)) return Effect.fail(error)
          throw error
        }
        return Arr.isArrayNonEmpty(out) ? Effect.succeed(out) : pull
      }

      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<Decoded>, IE | CsvError, Done> = Effect.suspend(() => {
        if (done !== undefined) return done
        return Pull.matchEffect(upstream, {
          onSuccess: (texts) =>
            emit((out) => {
              for (const text of texts) parser.feed(text, out)
            }),
          onFailure: Effect.failCause,
          onDone: (value) => {
            done = Cause.done(value)
            return emit((out) => parser.end(out))
          }
        })
      })
      return pull
    })
  )
}

/**
 * Creates a channel that parses text chunks into CSV records.
 *
 * **Details**
 *
 * Records are arrays of cells, or objects keyed by the first record when
 * `headers` is `true`. Parser state is created per channel run.
 *
 * **Example** (Parsing header records)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 *
 * const records = Stream.make("name,city\nAlice,\"San\nFrancisco\"\n").pipe(
 *   Stream.pipeThroughChannel(Csv.decodeString({ headers: true })),
 *   Stream.runCollect
 * )
 * await Effect.runPromise(records) // => [{ name: "Alice", city: "San\nFrancisco" }]
 * ```
 *
 * @see decode
 * @see decodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeString: {
  <IE = never, Done = unknown>(options: DecodeOptions & { readonly headers: true }): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Record.ReadonlyRecord<string, string>>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(options?: DecodeOptions & { readonly headers?: false | undefined }): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Row>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Row | Record.ReadonlyRecord<string, string>>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done
  >
} =
  (<IE, Done>(options?: DecodeOptions) =>
    Channel.map(decodeRecords<IE, Done>(options), Arr.map((record) => record.value))) as any

/**
 * Creates a channel that parses UTF-8 byte chunks into CSV records.
 *
 * @see decodeString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decode: {
  <IE = never, Done = unknown>(options: DecodeOptions & { readonly headers: true }): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Record.ReadonlyRecord<string, string>>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(options?: DecodeOptions & { readonly headers?: false | undefined }): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Row>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Row | Record.ReadonlyRecord<string, string>>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done
  >
} =
  (<IE, Done>(options?: DecodeOptions) =>
    Channel.pipeTo(Channel.decodeText<IE, Done>(), decodeString<IE, Done>(options))) as any

// Rewrites the chunk index at the head of each top-level issue path to the
// record number, keeping the rest of the issue unchanged.
const rebaseIssue = (error: Schema.SchemaError, record: (index: number) => number): Schema.SchemaError => {
  const issue = error.issue
  if (issue._tag !== "Composite") return error
  return new Schema.SchemaError(
    new SchemaIssue.Composite(
      issue.ast,
      Arr.map(issue.issues, (issue) =>
        issue._tag === "Pointer" && typeof issue.path[0] === "number"
          ? new SchemaIssue.Pointer([record(issue.path[0]), ...issue.path.slice(1)], issue.issue)
          : issue),
      issue.input,
      { reportInput: "input" in issue }
    )
  )
}

/**
 * Creates a channel that parses CSV text and decodes each record with a schema.
 *
 * **Details**
 *
 * With `headers: true` the schema receives objects keyed by header name;
 * otherwise it receives arrays of cells. Each chunk is decoded in one pass.
 * Schema failures are `SchemaError`s whose issue paths start with the record
 * number.
 *
 * **Example** (Decoding renamed headers)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 *
 * const Person = Schema.Struct({
 *   name: Schema.String,
 *   age: Schema.FiniteFromString
 * }).pipe(Schema.encodeKeys({ name: "Full Name", age: "Age (years)" }))
 *
 * const people = Stream.make("Full Name,Age (years)\nAlice,32").pipe(
 *   Stream.pipeThroughChannel(Csv.decodeSchemaString(Person)({ headers: true })),
 *   Stream.runCollect
 * )
 * await Effect.runPromise(people) // => [{ name: "Alice", age: 32 }]
 * ```
 *
 * **Example** (Transforming positional records into objects)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema, SchemaGetter, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 *
 * const Person = Schema.Tuple([Schema.String, Schema.FiniteFromString]).pipe(
 *   Schema.decodeTo(Schema.Struct({ name: Schema.String, age: Schema.Number }), {
 *     decode: SchemaGetter.transform(([name, age]) => ({ name, age })),
 *     encode: SchemaGetter.transform(({ name, age }) => [name, age] as const)
 *   })
 * )
 *
 * const people = Stream.make("Alice,32").pipe(
 *   Stream.pipeThroughChannel(Csv.decodeSchemaString(Person)()),
 *   Stream.runCollect
 * )
 * await Effect.runPromise(people) // => [{ name: "Alice", age: 32 }]
 * ```
 *
 * @see decodeSchema
 * @see encodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeSchemaString =
  <S extends RowCodec>(schema: S) =>
  <IE = never, Done = unknown>(options?: DecodeOptions, parseOptions?: SchemaAST.ParseOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE | CsvError | Schema.SchemaError,
    Done,
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done,
    S["DecodingServices"]
  > => {
    const decode = Schema.decodeUnknownEffect(Schema.NonEmptyArray(schema), parseOptions)
    return Channel.mapEffect(decodeRecords<IE, Done>(options), (records) =>
      Effect.mapError(
        decode(Arr.map(records, (record) => record.value)),
        (error) => rebaseIssue(error, (index) => records[index].record)
      ))
  }

/**
 * Creates a channel that parses UTF-8 CSV and decodes each record with a schema.
 *
 * @see decodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeSchema =
  <S extends RowCodec>(schema: S) =>
  <IE = never, Done = unknown>(options?: DecodeOptions, parseOptions?: SchemaAST.ParseOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE | CsvError | Schema.SchemaError,
    Done,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done,
    S["DecodingServices"]
  > => Channel.pipeTo(Channel.decodeText<IE, Done>(), decodeSchemaString(schema)<IE, Done>(options, parseOptions))

const textEncoder = new TextEncoder()

const needsQuotes = /["\r\n]/

const makeWriter = (options: EncodeOptions | undefined) => {
  const delimiter = checkDelimiter(options?.delimiter ?? ",")
  const newline = options?.newline ?? "\r\n"
  if (newline !== "\n" && newline !== "\r\n") {
    throw new Error(`Csv: newline must be "\\n" or "\\r\\n", got ${JSON.stringify(newline)}`)
  }
  const columns = options?.columns
  if (options?.headers === true && columns === undefined) {
    throw new Error("Csv: headers requires columns")
  }
  const cell = (value: unknown): string => {
    if (value === undefined) return ""
    if (typeof value !== "string") throw new TypeError(`Csv: expected a string cell, got ${typeof value}`)
    // A leading BOM is quoted so that decoders do not strip it.
    return value.includes(delimiter) || needsQuotes.test(value) || value.charCodeAt(0) === 0xFEFF
      ? "\"" + value.replaceAll("\"", "\"\"") + "\""
      : value
  }
  const write = (cells: ReadonlyArray<unknown>): string =>
    // A single empty cell is quoted so that it is not read back as an empty line.
    (cells.length === 1 && (cells[0] === "" || cells[0] === undefined) ? "\"\"" : cells.map(cell).join(delimiter)) +
    newline
  const header = options?.headers === true ? write(columns!) : undefined
  const writeRecord = (value: unknown): string => {
    if (Array.isArray(value)) return write(value)
    if (columns === undefined) throw new TypeError("Csv: encoding object records requires columns")
    const record = value as Record.ReadonlyRecord<string, unknown>
    return write(columns.map((key) => Object.hasOwn(record, key) ? record[key] : undefined))
  }
  return { header, writeRecord }
}

const encodeRecords = <A, IE, Done>(options: EncodeOptions | undefined): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done,
  Arr.NonEmptyReadonlyArray<A>,
  IE,
  Done
> => {
  const { header, writeRecord } = makeWriter(options)
  return Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      let pending = header
      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<string>, IE, Done> = Effect.suspend(() => {
        if (pending !== undefined) {
          const text = pending
          pending = undefined
          return Effect.succeed(Arr.of(text))
        }
        return Effect.flatMap(upstream, (records) => Effect.sync(() => Arr.map(records, writeRecord)))
      })
      return pull
    })
  )
}

/**
 * Creates a channel that writes CSV records as text, one string per record.
 *
 * **Details**
 *
 * Without `columns`, records are arrays of cells. With `columns`, records are
 * objects encoded by those keys. A non-string cell is a defect.
 *
 * **Example** (Writing header records)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 *
 * const csv = Stream.make({ name: "Smith, Charlie", city: "London" }).pipe(
 *   Stream.pipeThroughChannel(Csv.encodeString({ columns: ["name", "city"], headers: true })),
 *   Stream.runCollect,
 *   Effect.map((parts) => parts.join(""))
 * )
 * await Effect.runPromise(csv) // => 'name,city\r\n"Smith, Charlie",London\r\n'
 * ```
 *
 * @see encode
 * @see encodeSchemaString
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encodeString: {
  <IE = never, Done = unknown>(options: EncodeOptions & { readonly columns: ReadonlyArray<string> }): Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done,
    Arr.NonEmptyReadonlyArray<Record.ReadonlyRecord<string, string | undefined>>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(
    options?: EncodeOptions & { readonly columns?: undefined; readonly headers?: false | undefined }
  ): Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done,
    Arr.NonEmptyReadonlyArray<Row>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(options?: EncodeOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done,
    Arr.NonEmptyReadonlyArray<Row | Record.ReadonlyRecord<string, string | undefined>>,
    IE,
    Done
  >
} = <IE, Done>(options?: EncodeOptions) => encodeRecords<unknown, IE, Done>(options)

/**
 * Creates a channel that writes CSV records as UTF-8 bytes.
 *
 * @see encodeString
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encode: {
  <IE = never, Done = unknown>(options: EncodeOptions & { readonly columns: ReadonlyArray<string> }): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done,
    Arr.NonEmptyReadonlyArray<Record.ReadonlyRecord<string, string | undefined>>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(
    options?: EncodeOptions & { readonly columns?: undefined; readonly headers?: false | undefined }
  ): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done,
    Arr.NonEmptyReadonlyArray<Row>,
    IE,
    Done
  >
  <IE = never, Done = unknown>(options?: EncodeOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done,
    Arr.NonEmptyReadonlyArray<Row | Record.ReadonlyRecord<string, string | undefined>>,
    IE,
    Done
  >
} = <IE, Done>(options?: EncodeOptions) =>
  Channel.map(encodeRecords<unknown, IE, Done>(options), Arr.map((text) => textEncoder.encode(text)))

// Struct schemas encode by their encoded keys in declaration order. Tuple and
// array schemas encode by position. Other schemas, including records with
// index signatures, need explicit columns.
const schemaColumns = (
  schema: RowCodec,
  options: Pick<EncodeOptions, "columns" | "headers"> | undefined
): ReadonlyArray<string> | undefined => {
  if (options?.columns !== undefined) return options.columns
  const ast = SchemaAST.toEncoded(schema.ast)
  if (SchemaAST.isObjects(ast) && ast.indexSignatures.length === 0) {
    return ast.propertySignatures.flatMap((ps) => typeof ps.name === "string" ? [ps.name] : [])
  }
  if (SchemaAST.isArrays(ast)) {
    if (options?.headers === true) throw new Error("Csv: headers for tuple or array schemas require columns")
    return undefined
  }
  throw new Error(`Csv: columns are required to encode ${ast._tag} schemas`)
}

const encodeSchemaRecords = <S extends RowCodec, IE, Done>(
  schema: S,
  options: EncodeSchemaOptions<S> | undefined
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  IE | Schema.SchemaError,
  Done,
  Arr.NonEmptyReadonlyArray<S["Type"]>,
  IE,
  Done,
  S["EncodingServices"]
> => {
  const columns = schemaColumns(schema, options)
  const writer = encodeRecords<S["Encoded"], IE | Schema.SchemaError, Done>({ ...options, columns })
  const encode = Schema.encodeEffect(Schema.NonEmptyArray(schema))
  const firstRecord = options?.headers === true ? 2 : 1
  const values = Channel.fromTransform((
    upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<S["Type"]>, IE, Done>,
    _scope
  ) =>
    Effect.sync(() => {
      let record = firstRecord
      return Effect.flatMap(upstream, (chunk) => {
        const first = record
        record += chunk.length
        return Effect.mapError(encode(chunk), (error) => rebaseIssue(error, (index) => first + index))
      })
    })
  )
  return Channel.pipeTo(values, writer)
}

/**
 * Creates a channel that encodes values with a schema and writes them as CSV
 * text, one string per record.
 *
 * **Details**
 *
 * Columns default to the encoded keys of a struct schema, including keys
 * renamed with `Schema.encodeKeys`. Schema failures are `SchemaError`s whose
 * issue paths start with the output record number, counting the header row.
 *
 * **Example** (Encoding renamed headers)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 *
 * const Person = Schema.Struct({
 *   name: Schema.String,
 *   age: Schema.FiniteFromString
 * }).pipe(Schema.encodeKeys({ name: "Full Name", age: "Age (years)" }))
 *
 * const csv = Stream.make({ name: "Alice", age: 32 }).pipe(
 *   Stream.pipeThroughChannel(Csv.encodeSchemaString(Person)({ headers: true })),
 *   Stream.runCollect,
 *   Effect.map((parts) => parts.join(""))
 * )
 * await Effect.runPromise(csv) // => "Full Name,Age (years)\r\nAlice,32\r\n"
 * ```
 *
 * @see decodeSchemaString
 * @see encodeSchema
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encodeSchemaString =
  <S extends RowCodec>(schema: S) =>
  <IE = never, Done = unknown>(options?: EncodeSchemaOptions<S>): Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    IE | Schema.SchemaError,
    Done,
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE,
    Done,
    S["EncodingServices"]
  > => encodeSchemaRecords(schema, options)

/**
 * Creates a channel that encodes values with a schema and writes them as UTF-8
 * CSV bytes.
 *
 * **Gotchas**
 *
 * When the bytes stream an HTTP response body, for example through
 * `HttpApiSchema.StreamUint8Array`, an encoding failure ends the body; it
 * cannot change a status that was already sent.
 *
 * @see encodeSchemaString
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encodeSchema =
  <S extends RowCodec>(schema: S) =>
  <IE = never, Done = unknown>(options?: EncodeSchemaOptions<S>): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE | Schema.SchemaError,
    Done,
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE,
    Done,
    S["EncodingServices"]
  > =>
    Channel.map(
      encodeSchemaRecords<S, IE, Done>(schema, options),
      Arr.map((text) => textEncoder.encode(text))
    )
