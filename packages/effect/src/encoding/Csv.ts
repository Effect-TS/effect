/**
 * Encodes and decodes CSV streams, with optional schema transformations.
 *
 * Cells are strings. Whitespace and empty cells are preserved; schemas own value
 * conversion. Quoted fields support embedded delimiters, newlines and doubled
 * quotes. Decoders accept LF, CRLF and CR record separators and an initial BOM.
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
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"

const CsvErrorTypeId = "~effect/encoding/Csv/CsvError"

/**
 * CSV syntax, header, size, encoding or schema failure with a one-based record
 * number. `line` is a one-based physical input line; `column` identifies a cell,
 * not a character offset. Schema failures preserve the original `SchemaError`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CsvError extends Data.TaggedError("CsvError")<{
  readonly kind: "Syntax" | "Header" | "RecordSize" | "Schema" | "Encoding" | "Configuration"
  readonly message: string
  readonly record: number
  readonly line?: number | undefined
  readonly column?: number | undefined
  readonly cause?: Schema.SchemaError | undefined
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
 * CSV parsing options. The delimiter defaults to a comma. `maxRecordSize`
 * defaults to 1,048,576 UTF-16 code units, including quotes and delimiters but
 * excluding the record separator. Use `Infinity` to disable the limit.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export interface DecodeOptions {
  readonly delimiter?: string | undefined
  readonly maxRecordSize?: number | undefined
}

/**
 * Schema decoding options. With `headers: true`, the first record supplies
 * unique field names and each subsequent record must have the same width.
 * Otherwise the schema receives an array of string cells. Empty input yields
 * no records. Blank lines represent a single empty cell.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export interface DecodeSchemaOptions extends DecodeOptions {
  readonly headers?: boolean | undefined
}

/**
 * CSV serialization options. The delimiter defaults to a comma and the record
 * separator defaults to CRLF. Every encoded record includes its separator.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export interface EncodeOptions {
  readonly delimiter?: string | undefined
  readonly newline?: "\n" | "\r\n" | undefined
}

/**
 * Schema encoding options. Record schemas require an explicit ordered list of
 * encoded string keys. `headers: true` emits these names even for an empty
 * stream. Tuple and array schemas use positional cells without headers.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.0
 */
export type EncodeSchemaOptions<S extends Schema.Constraint> =
  & EncodeOptions
  & (
    S["Encoded"] extends ReadonlyArray<unknown> ? {
        readonly columns?: never
        readonly headers?: false | undefined
      }
      : {
        readonly columns: Arr.NonEmptyReadonlyArray<Extract<keyof S["Encoded"], string>>
        readonly headers?: boolean | undefined
      }
  )

interface Row {
  readonly cells: ReadonlyArray<string>
  readonly record: number
  readonly line: number
}

const delimiterOf = (delimiter = ","): string => {
  if (delimiter.length !== 1 || /["\r\n\uFEFF]/.test(delimiter) || /[\uD800-\uDFFF]/.test(delimiter)) {
    throw new CsvError({
      kind: "Configuration",
      message: "Expected a single delimiter other than a quote, newline or BOM",
      record: 1
    })
  }
  return delimiter
}

class Parser {
  readonly delimiter: string
  readonly limit: number
  cells: Array<string> = []
  field = ""
  state: "start" | "plain" | "quoted" | "closed" = "start"
  record = 1
  line = 1
  startLine = 1
  size = 0
  initial = true
  skipLF = false
  previousCR = false

  constructor(options?: DecodeOptions) {
    this.delimiter = delimiterOf(options?.delimiter)
    this.limit = options?.maxRecordSize ?? 1_048_576
    if (!(this.limit > 0) || (this.limit !== Infinity && !Number.isSafeInteger(this.limit))) {
      throw new CsvError({
        kind: "Configuration",
        message: "maxRecordSize must be a positive safe integer or Infinity",
        record: 1
      })
    }
  }

  error(kind: "Syntax" | "RecordSize", message: string): CsvError {
    return new CsvError({ kind, message, record: this.record, line: this.line, column: this.cells.length + 1 })
  }

  finishRow(): Row {
    this.cells.push(this.field)
    const row = { cells: this.cells, record: this.record++, line: this.startLine }
    this.cells = []
    this.field = ""
    this.state = "start"
    this.size = 0
    return row
  }

  feed(text: string): Array<Row> {
    const rows: Array<Row> = []
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (this.initial) {
        this.initial = false
        if (ch === "\uFEFF") continue
      }
      if (this.skipLF) {
        this.skipLF = false
        if (ch === "\n") {
          this.previousCR = false
          continue
        }
      }
      const separator = this.state !== "quoted" && (ch === "\r" || ch === "\n")
      if (!separator && ++this.size > this.limit) throw this.error("RecordSize", "CSV record exceeds maxRecordSize")
      if (separator) {
        rows.push(this.finishRow())
        this.skipLF = ch === "\r"
      } else if (this.state === "quoted") {
        if (ch === "\"") this.state = "closed"
        else this.field += ch
      } else if (this.state === "closed") {
        if (ch === "\"") {
          this.field += ch
          this.state = "quoted"
        } else if (ch === this.delimiter) {
          this.cells.push(this.field)
          this.field = ""
          this.state = "start"
        } else throw this.error("Syntax", "Expected a delimiter or record separator after closing quote")
      } else if (ch === this.delimiter) {
        this.cells.push(this.field)
        this.field = ""
        this.state = "start"
      } else if (ch === "\"") {
        if (this.state !== "start") throw this.error("Syntax", "Unexpected quote in unquoted field")
        this.state = "quoted"
      } else {
        this.field += ch
        this.state = "plain"
      }
      if (ch === "\r" || (ch === "\n" && !this.previousCR)) this.line++
      this.previousCR = ch === "\r"
      if (separator) this.startLine = this.line
    }
    return rows
  }

  end(): Array<Row> {
    if (this.state === "quoted") throw this.error("Syntax", "Unterminated quoted field")
    return this.size > 0 ? [this.finishRow()] : []
  }
}

const attempt = <A>(f: () => A): Effect.Effect<A, CsvError> =>
  Effect.try({
    try: f,
    catch: (error) => {
      if (isCsvError(error)) return error
      throw error
    }
  })

const decodeRows = <IE, Done>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Row>,
  IE | CsvError,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream) =>
    Effect.map(attempt(() => new Parser(options)), (parser) => {
      let end: Effect.Effect<never, Cause.Done<Done>> | undefined
      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<Row>, IE | CsvError, Done> = Effect.suspend(() => {
        if (end) return end
        return Effect.flatMap(
          Pull.catchDone(Effect.map(upstream, (texts) => ({ texts })), (done) => {
            // Upstream completion carries Done; IE describes ordinary failures.
            end = Cause.done(done as Done)
            return Effect.succeed({ texts: undefined })
          }),
          ({ texts }) =>
            Effect.flatMap(
              attempt(() => texts ? texts.flatMap((text) => parser.feed(text)) : parser.end()),
              (rows) => Arr.isArrayNonEmpty(rows) ? Effect.succeed(rows) : pull
            )
        )
      })
      return pull
    })
  )

/**
 * Creates a channel that parses text chunks into arrays of string cells.
 *
 * @see decode
 * @see decodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeString = <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<ReadonlyArray<string>>,
  IE | CsvError,
  Done,
  Arr.NonEmptyReadonlyArray<string>,
  IE,
  Done
> => Channel.map(decodeRows<IE, Done>(options), (rows) => Arr.map(rows, (row) => row.cells))

/**
 * Creates a channel that parses UTF-8 byte chunks into arrays of string cells.
 *
 * @see decodeString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decode = <IE = never, Done = unknown>(options?: DecodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<ReadonlyArray<string>>,
  IE | CsvError,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done
> => Channel.pipeTo(Channel.decodeText(), decodeString(options))

const checkColumns = (columns: ReadonlyArray<string>) => {
  if (
    columns.length === 0 || columns.some((key) => typeof key !== "string") || new Set(columns).size !== columns.length
  ) {
    throw new CsvError({ kind: "Header", message: "Expected non-empty, unique string columns", record: 1, line: 1 })
  }
}

/**
 * Creates a channel that parses CSV text and decodes each row through a schema.
 * Schema failures include the record number and its starting physical line.
 *
 * **Example** (Renaming CSV headers)
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
 * **Example** (Transforming positional rows into objects)
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
 * **Example** (Formatting structured names without changing CSV encoding)
 *
 * This input uses `last, first` names. The transformation retains both parts
 * and normalizes surrounding whitespace; the formatter controls display only.
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema, SchemaGetter, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 *
 * const Name = Schema.String.pipe(
 *   Schema.decodeTo(Schema.Struct({ first: Schema.String, last: Schema.String }), {
 *     decode: SchemaGetter.transform((name) => {
 *       const [last, ...first] = name.split(",")
 *       return { first: first.join(",").trim(), last: last.trim() }
 *     }),
 *     encode: SchemaGetter.transform(({ first, last }) => first ? `${last}, ${first}` : last)
 *   }),
 *   Schema.overrideToFormatter(() => ({ first, last }) => `${first} ${last}`.trim())
 * )
 * const Person = Schema.Struct({ name: Name, age: Schema.FiniteFromString }).pipe(
 *   Schema.encodeKeys({ name: "Full Name", age: "Age (years)" })
 * )
 * const formatName = Schema.toFormatter(Name)
 *
 * const people = await Effect.runPromise(
 *   Stream.make('Full Name,Age (years)\n"Smith, Charlie",28').pipe(
 *     Stream.pipeThroughChannel(Csv.decodeSchemaString(Person)({ headers: true })),
 *     Stream.runCollect
 *   )
 * )
 * people // => [{ name: { first: "Charlie", last: "Smith" }, age: 28 }]
 * people.map((person) => formatName(person.name)) // => ["Charlie Smith"]
 *
 * const csv = await Effect.runPromise(
 *   Stream.fromArray(people).pipe(
 *     Stream.pipeThroughChannel(Csv.encodeSchemaString(Person)({
 *       columns: ["Full Name", "Age (years)"],
 *       headers: true,
 *       newline: "\n"
 *     })),
 *     Stream.runCollect,
 *     Effect.map((parts) => parts.join(""))
 *   )
 * )
 * csv // => 'Full Name,Age (years)\n"Smith, Charlie",28\n'
 * ```
 *
 * @see decodeSchema
 * @see encodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeSchemaString =
  <S extends Schema.Constraint>(schema: S) =>
  <IE = never, Done = unknown>(options?: DecodeSchemaOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<string>,
    IE,
    Done,
    S["DecodingServices"]
  > =>
    Channel.unwrap(Effect.sync(() => {
      let headers: ReadonlyArray<string> | undefined
      const decode = Schema.decodeUnknownEffect(schema)
      return Channel.filterMapArrayEffect(decodeRows<IE, Done>(options), (row) =>
        Effect.gen(function*() {
          if (options?.headers && headers === undefined) {
            yield* attempt(() => checkColumns(row.cells))
            headers = row.cells
            return Result.fail(undefined)
          }
          const input = yield* attempt(() => {
            if (!headers) return row.cells
            if (row.cells.length !== headers.length) {
              throw new CsvError({
                kind: "Header",
                message: `Expected ${headers.length} cells, received ${row.cells.length}`,
                record: row.record,
                line: row.line
              })
            }
            return Object.fromEntries(headers.map((header, i) => [header, row.cells[i]]))
          })
          const value = yield* Effect.mapError(decode(input), (cause) =>
            new CsvError({
              kind: "Schema",
              message: "CSV row failed schema decoding",
              record: row.record,
              line: row.line,
              cause
            }))
          return Result.succeed(value)
        }))
    }))

/**
 * Creates a channel that parses UTF-8 CSV and decodes rows through a schema.
 *
 * @see decodeSchemaString
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeSchema =
  <S extends Schema.Constraint>(schema: S) =>
  <IE = never, Done = unknown>(options?: DecodeSchemaOptions): Channel.Channel<
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE,
    Done,
    S["DecodingServices"]
  > => Channel.pipeTo(Channel.decodeText(), decodeSchemaString(schema)<IE, Done>(options))

const textEncoder = new TextEncoder()

const writer = (options?: EncodeOptions) => {
  const delimiter = delimiterOf(options?.delimiter)
  const newline = options?.newline ?? "\r\n"
  if (newline !== "\n" && newline !== "\r\n") {
    throw new CsvError({ kind: "Configuration", message: "Expected LF or CRLF newline", record: 1 })
  }
  return (cells: unknown, record: number) => {
    if (!Array.isArray(cells) || cells.length === 0) {
      throw new CsvError({ kind: "Encoding", message: "Expected at least one string cell", record })
    }
    return cells.map((cell, i) => {
      if (typeof cell !== "string") {
        throw new CsvError({ kind: "Encoding", message: "Expected a string cell", record, column: i + 1 })
      }
      return cell.includes(delimiter) || /["\r\n\uFEFF]/.test(cell) ? "\"" + cell.replaceAll("\"", "\"\"") + "\"" : cell
    }).join(delimiter) + newline
  }
}

/**
 * Creates a channel that serializes string-cell rows into CSV text.
 *
 * @see encode
 * @see encodeSchemaString
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encodeString = <IE = never, Done = unknown>(options?: EncodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<string>,
  IE | CsvError,
  Done,
  Arr.NonEmptyReadonlyArray<ReadonlyArray<string>>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream) =>
    Effect.map(attempt(() => writer(options)), (write) => {
      let record = 0
      return Effect.flatMap(upstream, (rows) => attempt(() => Arr.map(rows, (row) => write(row, ++record))))
    })
  )

/**
 * Creates a channel that serializes string-cell rows into UTF-8 CSV bytes.
 *
 * @see encodeString
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encode = <IE = never, Done = unknown>(options?: EncodeOptions): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE | CsvError,
  Done,
  Arr.NonEmptyReadonlyArray<ReadonlyArray<string>>,
  IE,
  Done
> => Channel.map(encodeString<IE, Done>(options), (texts) => Arr.map(texts, (text) => textEncoder.encode(text)))

/**
 * Creates a channel that schema-encodes values and serializes their string cells
 * as CSV text. Columns select encoded field names after schema transformations.
 *
 * **Example** (Encoding renamed columns in an explicit order)
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
 *   Stream.pipeThroughChannel(Csv.encodeSchemaString(Person)({
 *     columns: ["Full Name", "Age (years)"],
 *     headers: true
 *   })),
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
  <S extends Schema.Constraint>(schema: S) =>
  <IE = never, Done = unknown>(options: EncodeSchemaOptions<S>): Channel.Channel<
    Arr.NonEmptyReadonlyArray<string>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE,
    Done,
    S["EncodingServices"]
  > =>
    Channel.fromTransform((upstream) =>
      Effect.map(
        attempt(() => {
          const write = writer(options)
          if (options.columns) checkColumns(options.columns)
          if (options.headers && !options.columns) {
            throw new CsvError({ kind: "Configuration", message: "Headers require columns", record: 1 })
          }
          return write
        }),
        (write) => {
          const encode = Schema.encodeEffect(schema)
          let record = options.headers ? 1 : 0
          let header = options.headers && options.columns ? write(options.columns, 1) : undefined
          return Effect.suspend(() => {
            if (header !== undefined) {
              const text = header
              header = undefined
              return Effect.succeed(Arr.of(text))
            }
            return Effect.flatMap(upstream, (values) =>
              Effect.forEach(values, (value) =>
                Effect.gen(function*() {
                  const index = ++record
                  const encoded = yield* Effect.mapError(encode(value), (cause) =>
                    new CsvError({
                      kind: "Schema",
                      message: "CSV row failed schema encoding",
                      record: index,
                      cause
                    }))
                  return yield* attempt(() => {
                    let cells: unknown
                    if (options.columns) {
                      if (encoded === null || typeof encoded !== "object" || Array.isArray(encoded)) {
                        throw new CsvError({ kind: "Encoding", message: "Expected an encoded record", record: index })
                      }
                      cells = options.columns.map((key) => Object.hasOwn(encoded, key) ? encoded[key] : undefined)
                    } else cells = encoded
                    return write(cells, index)
                  })
                })))
          })
        }
      )
    )

/**
 * Creates a channel that schema-encodes values into UTF-8 CSV bytes.
 *
 * **Details**
 *
 * For HTTP API exports, declare `HttpApiSchema.StreamUint8Array` with a CSV
 * content type and return the encoded stream from the handler. The generated
 * client receives a byte stream that can be piped through `decodeSchema`.
 *
 * **Gotchas**
 *
 * Failures during response streaming terminate the body; they cannot change an
 * HTTP status already sent. Use a buffered text response when encoding must
 * succeed before sending the response.
 *
 * **Example** (Returning a streaming CSV HTTP API response)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema, Stream } from "effect"
 * import { Csv } from "effect/encoding"
 * import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
 *
 * const Person = Schema.Struct({ name: Schema.String, age: Schema.FiniteFromString })
 * const Api = HttpApi.make("Exports").add(
 *   HttpApiGroup.make("people").add(
 *     HttpApiEndpoint.get("export", "/people.csv", {
 *       success: HttpApiSchema.StreamUint8Array({ contentType: "text/csv; charset=utf-8" })
 *     })
 *   )
 * )
 * const exportPeople = () => Stream.make({ name: "Smith, Charlie", age: 28 }).pipe(
 *   Stream.pipeThroughChannel(Csv.encodeSchema(Person)({
 *     columns: ["name", "age"],
 *     headers: true
 *   }))
 * )
 * const PeopleLive = HttpApiBuilder.group(Api, "people", (handlers) =>
 *   handlers.handle("export", () => Effect.succeed(exportPeople()))
 * )
 *
 * const text = await Effect.runPromise(exportPeople().pipe(
 *   Stream.decodeText(),
 *   Stream.runCollect,
 *   Effect.map((parts) => parts.join(""))
 * ))
 * text // => 'name,age\r\n"Smith, Charlie",28\r\n'
 * ```
 *
 * @see encodeSchemaString
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const encodeSchema =
  <S extends Schema.Constraint>(schema: S) =>
  <IE = never, Done = unknown>(options: EncodeSchemaOptions<S>): Channel.Channel<
    Arr.NonEmptyReadonlyArray<Uint8Array>,
    IE | CsvError,
    Done,
    Arr.NonEmptyReadonlyArray<S["Type"]>,
    IE,
    Done,
    S["EncodingServices"]
  > =>
    Channel.map(
      encodeSchemaString(schema)<IE, Done>(options),
      (texts) => Arr.map(texts, (text) => textEncoder.encode(text))
    )
