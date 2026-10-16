import { assert, describe, it } from "@effect/vitest"
import { Cause, Channel, Context, Effect, Schema, SchemaGetter, Stream } from "effect"
import { Csv } from "effect/encoding"

const parse = (parts: ReadonlyArray<string>, options?: Csv.DecodeOptions) =>
  Stream.fromArray(parts).pipe(
    Stream.pipeThroughChannel(Csv.decodeString(options)),
    Stream.runCollect
  )
const Person = Schema.Struct({ name: Schema.String, age: Schema.FiniteFromString }).pipe(
  Schema.encodeKeys({ name: "Full Name", age: "Age (years)" })
)
const TuplePerson = Schema.Tuple([Schema.String, Schema.NumberFromString]).pipe(
  Schema.decodeTo(Schema.Struct({ name: Schema.String, age: Schema.Number }), {
    decode: SchemaGetter.transform(([name, age]) => ({ name, age })),
    encode: SchemaGetter.transform(({ name, age }) => [name, age] as const)
  })
)

describe("Csv", () => {
  it("recognizes branded CSV errors", () => {
    const error = new Csv.CsvError({ kind: "Syntax", message: "Invalid CSV", record: 1 })
    assert.isTrue(Csv.isCsvError(error))
    assert.isTrue(Csv.isCsvError({ ...error }))
    assert.isFalse(Csv.isCsvError({ _tag: "CsvError" }))
    assert.isFalse(Csv.isCsvError(null))
  })

  it.effect("skips header-only chunks and completes header-only input", () =>
    Effect.gen(function*() {
      const channel = Csv.decodeSchemaString(Person)({ headers: true })
      const empty = yield* Stream.make("Full Name,Age (years)\n").pipe(
        Stream.pipeThroughChannel(channel),
        Stream.runCollect
      )
      assert.deepStrictEqual(empty, [])
      const people = yield* Stream.make("Full Name,Age (years)\n").pipe(
        Stream.concat(Stream.make("Alice,32\n")),
        Stream.pipeThroughChannel(channel),
        Stream.runCollect
      )
      assert.deepStrictEqual(people, [{ name: "Alice", age: 32 }])
    }))

  it.effect("parses quoted fields and separators at every chunk boundary", () =>
    Effect.gen(function*() {
      const text = "\uFEFFname,city,note\r\nAlice,\"San\r\nFrancisco\",\"says \"\"hi\"\"\"\r\nBob,London,\n,,last"
      const expected = [["name", "city", "note"], ["Alice", "San\r\nFrancisco", "says \"hi\""], ["Bob", "London", ""], [
        "",
        "",
        "last"
      ]]
      for (let i = 0; i <= text.length; i++) {
        assert.deepStrictEqual(yield* parse([text.slice(0, i), "", text.slice(i)]), expected)
      }
      assert.deepStrictEqual(yield* parse(text.split("")), expected)
    }))

  it.effect("preserves blank cells, whitespace and final records", () =>
    Effect.gen(function*() {
      for (
        const [text, expected] of [
          ["", []],
          ["\uFEFF", []],
          ["\n", [[""]]],
          ["\r\n", [[""]]],
          [",", [["", ""]]],
          ["\"\"", [[""]]],
          [" a , b ", [[" a ", " b "]]],
          ["a\rb\r", [["a"], ["b"]]]
        ] as const
      ) assert.deepStrictEqual(yield* parse([text]), [...expected])
      assert.deepStrictEqual(yield* parse(["a;\"b;c\""], { delimiter: ";" }), [["a", "b;c"]])
    }))

  it.effect("reports malformed CSV with physical line and cell positions", () =>
    Effect.gen(function*() {
      for (const text of ["a,b\"c", "a,\"b\"x", "a,\"b"]) {
        const error = yield* Effect.flip(parse([text]))
        assert.strictEqual(error.kind, "Syntax")
        assert.strictEqual(error.record, 1)
        assert.strictEqual(error.column, 2)
      }
      const error = yield* Effect.flip(parse(["\"a\r", "\nb\",c\r", "\nx,\"oops"]))
      assert.strictEqual(error.record, 2)
      assert.strictEqual(error.line, 3)
    }))

  it.effect("enforces record limits across chunks and resets between records", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* parse(["ab\r\ncd"], { maxRecordSize: 2 }), [["ab"], ["cd"]])
      const error = yield* Effect.flip(parse(["a", "b", "c"], { maxRecordSize: 2 }))
      assert.strictEqual(error.kind, "RecordSize")
      assert.strictEqual(error.column, 1)
      assert.deepStrictEqual(yield* parse(["abc"], { maxRecordSize: Infinity }), [["abc"]])
    }))

  it.effect("fails invalid configuration in the typed error channel", () =>
    Effect.gen(function*() {
      for (
        const options of [{ delimiter: "" }, { delimiter: "ab" }, { delimiter: "\"" }, { delimiter: "\n" }, {
          maxRecordSize: 0
        }, { maxRecordSize: NaN }]
      ) {
        assert.strictEqual((yield* Effect.flip(parse([], options))).kind, "Configuration")
      }
    }))

  it.effect("round trips string rows including leading BOM and empty cells", () =>
    Effect.gen(function*() {
      const rows = [[""], ["\uFEFFvalue", "a\"b", "c,d", "x\ny", "x\ry"], [" a ", ""]]
      const encoded = yield* Stream.fromArray(rows).pipe(
        Stream.pipeThroughChannel(Csv.encodeString()),
        Stream.runCollect
      )
      assert.strictEqual(encoded[0], "\r\n")
      assert.deepStrictEqual(yield* parse(encoded), rows)
    }))

  it.effect("decodes split UTF-8 characters and encodes bytes", () =>
    Effect.gen(function*() {
      const bytes = new TextEncoder().encode("\"Zoë\",東京\r\n")
      const rows = yield* Stream.fromArray(Array.from(bytes, (byte) => Uint8Array.of(byte))).pipe(
        Stream.pipeThroughChannel(Csv.decode()),
        Stream.runCollect
      )
      assert.deepStrictEqual(rows, [["Zoë", "東京"]])
      const encoded = yield* Stream.fromArray(rows).pipe(Stream.pipeThroughChannel(Csv.encode()), Stream.runCollect)
      assert.strictEqual(new TextDecoder().decode(encoded[0]), "Zoë,東京\r\n")
    }))

  it.effect("round trips renamed headers through Schema", () =>
    Effect.gen(function*() {
      const people = [{ name: "Alice", age: 32 }, { name: "Bob", age: 28 }]
      const channel = Csv.encodeSchemaString(Person)({ columns: ["Full Name", "Age (years)"], headers: true })
      const text = yield* Stream.fromArray(people).pipe(Stream.pipeThroughChannel(channel), Stream.runCollect)
      assert.strictEqual(text.join(""), "Full Name,Age (years)\r\nAlice,32\r\nBob,28\r\n")
      const decoded = yield* Stream.fromArray(text).pipe(
        Stream.pipeThroughChannel(Csv.decodeSchemaString(Person)({ headers: true })),
        Stream.runCollect
      )
      assert.deepStrictEqual(decoded, people)
      const empty = yield* Stream.empty.pipe(Stream.pipeThroughChannel(channel), Stream.runCollect)
      assert.deepStrictEqual(empty, ["Full Name,Age (years)\r\n"])
    }))

  it.effect("round trips a tuple-to-object transformation", () =>
    Effect.gen(function*() {
      const text = yield* Stream.make({ name: "Alice", age: 32 }).pipe(
        Stream.pipeThroughChannel(Csv.encodeSchemaString(TuplePerson)({})),
        Stream.runCollect
      )
      assert.deepStrictEqual(text, ["Alice,32\r\n"])
      const people = yield* Stream.fromArray(text).pipe(
        Stream.pipeThroughChannel(Csv.decodeSchemaString(TuplePerson)()),
        Stream.runCollect
      )
      assert.deepStrictEqual(people, [{ name: "Alice", age: 32 }])
    }))

  it.effect("round trips schema byte channels", () =>
    Effect.gen(function*() {
      const people = yield* Stream.make({ name: "Zoë", age: 32 }).pipe(
        Stream.pipeThroughChannel(Csv.encodeSchema(Person)({ columns: ["Full Name", "Age (years)"], headers: true })),
        Stream.pipeThroughChannel(Csv.decodeSchema(Person)({ headers: true })),
        Stream.runCollect
      )
      assert.deepStrictEqual(people, [{ name: "Zoë", age: 32 }])
    }))

  it.effect("rejects duplicate headers and mismatched widths", () =>
    Effect.gen(function*() {
      for (const text of ["name,name\na,b", "name,age\nAlice", "name,age\nAlice,32,extra"]) {
        const error = yield* Stream.make(text).pipe(
          Stream.pipeThroughChannel(Csv.decodeSchemaString(Schema.Unknown)({ headers: true })),
          Stream.runCollect,
          Effect.flip
        )
        assert.strictEqual(error.kind, "Header")
      }
    }))

  it.effect("treats special header names as own data properties", () =>
    Effect.gen(function*() {
      const rows = yield* Stream.make("__proto__,constructor\na,b").pipe(
        Stream.pipeThroughChannel(Csv.decodeSchemaString(Schema.Unknown)({ headers: true })),
        Stream.runCollect
      )
      assert.deepStrictEqual(rows, [Object.fromEntries([["__proto__", "a"], ["constructor", "b"]])])
    }))

  it.effect("preserves schema errors with record and line context", () =>
    Effect.gen(function*() {
      const error = yield* Stream.make("Full Name,Age (years)\n\"Alice\nSmith\",oops").pipe(
        Stream.pipeThroughChannel(Csv.decodeSchemaString(Person)({ headers: true })),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(error.kind, "Schema")
      assert.strictEqual(error.record, 2)
      assert.strictEqual(error.line, 2)
      assert.instanceOf(error.cause, Schema.SchemaError)
      const encoded = yield* Stream.make({ name: "Alice", age: -1 }).pipe(
        Stream.pipeThroughChannel(
          Csv.encodeSchemaString(
            Schema.Struct({
              name: Schema.String,
              age: Schema.NumberFromString.pipe(Schema.check(Schema.isGreaterThan(0)))
            })
          )({ columns: ["name", "age"] })
        ),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(encoded.kind, "Schema")
      assert.instanceOf(encoded.cause, Schema.SchemaError)
    }))

  it.effect("rejects non-string encoded cells and duplicate columns", () =>
    Effect.gen(function*() {
      const error = yield* Stream.make({ age: 32 }).pipe(
        Stream.pipeThroughChannel(Csv.encodeSchemaString(Schema.Struct({ age: Schema.Number }))({ columns: ["age"] })),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(error.kind, "Encoding")
      assert.strictEqual(error.column, 1)
      const duplicate = yield* Stream.empty.pipe(
        Stream.pipeThroughChannel(Csv.encodeSchemaString(Person)({ columns: ["Full Name", "Full Name"] })),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(duplicate.kind, "Header")
    }))

  it.effect("preserves upstream errors instead of flushing partial rows", () =>
    Effect.gen(function*() {
      const error = yield* Stream.make("\"unfinished").pipe(
        Stream.concat(Stream.fail("upstream")),
        Stream.pipeThroughChannel(Csv.decodeString()),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(error, "upstream")
    }))

  it.effect("preserves completion values after flushing the final row", () =>
    Effect.gen(function*() {
      const source = Channel.fromTransform(() =>
        Effect.sync(() => {
          let first = true
          return Effect.suspend(() => {
            if (!first) return Cause.done(42)
            first = false
            return Effect.succeed(["last"] as const)
          })
        })
      )
      const channel = Channel.pipeTo(source, Csv.decodeString<never, number>())
      const result = yield* Channel.runCollect(Channel.mapDone(channel, (done) => {
        assert.strictEqual(done, 42)
      }))
      assert.deepStrictEqual(result, [[["last"]]])
    }))
  it.effect("supports effectful schema transformations and required services", () =>
    Effect.gen(function*() {
      class Names extends Context.Service<Names, { readonly prefix: string }>()("CsvTestNames") {}
      const name = Schema.String.pipe(Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformEffect((value) => Effect.map(Names, ({ prefix }) => prefix + value)),
        encode: SchemaGetter.transformEffect((value) => Effect.map(Names, ({ prefix }) => value.slice(prefix.length)))
      }))
      const schema = Schema.Struct({ name })
      const rows = yield* Stream.make("name\nAlice").pipe(
        Stream.pipeThroughChannel(Csv.decodeSchemaString(schema)({ headers: true })),
        Stream.runCollect,
        Effect.provideService(Names, { prefix: "Hello " })
      )
      assert.deepStrictEqual(rows, [{ name: "Hello Alice" }])
      const csv = yield* Stream.fromArray(rows).pipe(
        Stream.pipeThroughChannel(Csv.encodeSchemaString(schema)({ columns: ["name"], headers: true })),
        Stream.runCollect,
        Effect.provideService(Names, { prefix: "Hello " })
      )
      assert.strictEqual(csv.join(""), "name\r\nAlice\r\n")
    }))

  it.effect("isolates parser and header state on concurrent reuse", () =>
    Effect.gen(function*() {
      const channel = Csv.decodeSchemaString(Person)({ headers: true })
      const run = Stream.make("Full Name,Age (years)\nAlice,32").pipe(
        Stream.pipeThroughChannel(channel),
        Stream.runCollect
      )
      const results = yield* Effect.all([run, run], { concurrency: 2 })
      assert.deepStrictEqual(results, [[{ name: "Alice", age: 32 }], [{ name: "Alice", age: 32 }]])
    }))

  it.effect("stops pulling when the consumer has enough rows", () =>
    Effect.gen(function*() {
      const rows = yield* Stream.make("first\n").pipe(
        Stream.concat(Stream.fail("Unexpected extra pull")),
        Stream.pipeThroughChannel(Csv.decodeString()),
        Stream.take(1),
        Stream.runCollect
      )
      assert.deepStrictEqual(rows, [["first"]])
    }))

  it.effect("encodes custom separators and rejects missing cells", () =>
    Effect.gen(function*() {
      const text = yield* Stream.make(["a;b", "c"]).pipe(
        Stream.pipeThroughChannel(Csv.encodeString({ delimiter: ";", newline: "\n" })),
        Stream.runCollect
      )
      assert.deepStrictEqual(text, ["\"a;b\";c\n"])
      const empty = yield* Stream.make([] as Array<string>).pipe(
        Stream.pipeThroughChannel(Csv.encodeString()),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(empty.kind, "Encoding")
      const missing = yield* Stream.make({}).pipe(
        Stream.pipeThroughChannel(
          Csv.encodeSchemaString(Schema.Struct({ name: Schema.optional(Schema.String) }))({ columns: ["name"] })
        ),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(missing.kind, "Encoding")
    }))
})
