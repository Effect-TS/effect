import { assert, describe, it } from "@effect/vitest"
import {
  BigDecimal,
  Cause,
  Chunk,
  DateTime,
  Duration,
  Effect,
  Exit,
  HashMap,
  HashSet,
  Option,
  Redacted,
  Result,
  Schema,
  SchemaIssue,
  SchemaParser
} from "effect"
import * as SchemaBinary from "effect/unstable/encoding/SchemaBinary"

const encode = <A, I>(schema: Schema.Codec<A, I>, value: A): Uint8Array<ArrayBuffer> =>
  Schema.encodeUnknownSync(SchemaBinary.toCodec(schema))(value)

const roundtrip = <A, I>(schema: Schema.Codec<A, I>, value: A): A => {
  const codec = SchemaBinary.toCodec(schema)
  return Schema.decodeUnknownSync(codec)(Schema.encodeUnknownSync(codec)(value))
}

const concat = (...chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

const schemaError = (f: () => unknown): Schema.SchemaError => {
  try {
    f()
  } catch (error) {
    if (Schema.isSchemaError(error)) return error
    throw error
  }
  throw new Error("expected SchemaError")
}

describe("SchemaBinary", () => {
  describe("wire layout", () => {
    it("packs fixed-size array elements", () => {
      const numbers = [1.5, Number.NaN, -0, Number.POSITIVE_INFINITY]
      const numberBytes = encode(Schema.Array(Schema.Number), numbers)
      const decoded = roundtrip(Schema.Array(Schema.Number), numbers)
      assert.strictEqual(numberBytes.length, 35)
      assert.strictEqual(decoded[0], 1.5)
      assert.isTrue(Number.isNaN(decoded[1]))
      assert.isTrue(Object.is(decoded[2], -0))
      assert.strictEqual(decoded[3], Number.POSITIVE_INFINITY)

      const boolBytes = encode(Schema.Array(Schema.Boolean), [true, false, true])
      assert.strictEqual(boolBytes.length, 6)
      assert.deepStrictEqual(roundtrip(Schema.Array(Schema.Boolean), [true, false, true]), [true, false, true])
    })

    it("length-prefixes variable-size array elements and nested arrays", () => {
      assert.deepStrictEqual(
        roundtrip(Schema.Array(Schema.String), ["ab", "", "cdé"]),
        ["ab", "", "cdé"]
      )
      assert.deepStrictEqual(
        roundtrip(Schema.Array(Schema.Array(Schema.Number)), [[1, 2], [], [3]]),
        [[1, 2], [], [3]]
      )
    })

    it("round-trips zero-width array elements", () => {
      assert.deepStrictEqual(roundtrip(Schema.Array(Schema.Null), [null, null, null]), [null, null, null])
      assert.deepStrictEqual(
        roundtrip(Schema.Array(Schema.Undefined), [undefined, undefined]),
        [undefined, undefined]
      )
    })

    it("omits the count for fixed tuples and includes it for optional tuples", () => {
      const pair = Schema.Tuple([Schema.String, Schema.Number])
      assert.strictEqual(encode(pair, ["key", 42]).length, 14)
      assert.deepStrictEqual(roundtrip(pair, ["key", 42]), ["key", 42])

      const optional = Schema.Tuple([Schema.Number, Schema.optionalKey(Schema.Number)])
      assert.deepStrictEqual(roundtrip(optional, [1]), [1])
      assert.deepStrictEqual(roundtrip(optional, [1, 2]), [1, 2])
    })

    it("supports tuple rest and trailing slots", () => {
      const schema = Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number, Schema.Boolean])
      assert.deepStrictEqual(
        roundtrip(schema, ["head", 1.5, 2.5, 3.5, true]),
        ["head", 1.5, 2.5, 3.5, true]
      )
      assert.deepStrictEqual(roundtrip(schema, ["head", false]), ["head", false])
    })

    it("writes a length-first frame and rejects envelope or leftovers", () => {
      const codec = SchemaBinary.toCodec(Schema.Number)
      const bytes = Schema.encodeUnknownSync(codec)(1)
      assert.deepStrictEqual(Array.from(bytes.slice(0, 2)), [9, 0x10])

      const flags = bytes.slice()
      flags[1] = 0x11
      assert.match(schemaError(() => Schema.decodeUnknownSync(codec)(flags)).message, /version 1 envelope, flags 0/)

      const version = bytes.slice()
      version[1] = 0x20
      assert.match(schemaError(() => Schema.decodeUnknownSync(codec)(version)).message, /version 1 envelope, flags 0/)
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(codec)(concat(bytes, bytes))).message,
        /no leftover bytes/
      )
    })
  })

  describe("output arena", () => {
    it("keeps an earlier result stable through later encodes and arena rollover", () => {
      const codec = SchemaBinary.toCodec(Schema.String)
      const encode = Schema.encodeUnknownSync(codec)
      const first = encode("first")
      const expected = first.slice()
      let rolledOver = false

      for (let i = 0; i < 500; i++) {
        const later = encode(`later-${i}-${"x".repeat(32)}`)
        if (later.buffer !== first.buffer) rolledOver = true
        assert.deepStrictEqual(first, expected)
      }

      assert.isTrue(rolledOver)
      assert.strictEqual(Schema.decodeUnknownSync(codec)(first), "first")
    })

    it("keeps different results independent inside a shared arena", () => {
      const codec = SchemaBinary.toCodec(Schema.String)
      const encode = Schema.encodeUnknownSync(codec)
      const decode = Schema.decodeUnknownSync(codec)
      const results = [encode("alpha"), encode("bravo"), encode("charlie")]

      assert.deepStrictEqual(results.map((bytes) => decode(bytes)), ["alpha", "bravo", "charlie"])
      const shared = results.flatMap((left, index) => results.slice(index + 1).map((right) => [left, right] as const))
        .find(([left, right]) => left.buffer === right.buffer)
      assert.isDefined(shared)
      assert.notStrictEqual(shared![0].byteOffset, shared![1].byteOffset)
    })

    it("preserves nested two-phase codec composition", () => {
      const Inner = Schema.Struct({ id: Schema.Number, label: Schema.String })
      const Outer = Schema.Struct({ id: Schema.String, inner: SchemaBinary.toCodec(Inner) })
      const codec = SchemaBinary.toCodec(Outer)
      const value = { id: "outer", inner: { id: 1, label: "inner" } }

      assert.deepStrictEqual(Schema.decodeUnknownSync(codec)(Schema.encodeUnknownSync(codec)(value)), value)
    })

    it.effect("keeps concurrent fiber results readable after their producing turn", () => {
      const Value = Schema.Struct({ id: Schema.Number, value: Schema.String })
      const codec = SchemaBinary.toCodec(Value)
      const encode = Schema.encodeUnknownEffect(codec)
      const decode = Schema.decodeUnknownSync(codec)
      const values = Array.from({ length: 100 }, (_, id) => ({ id, value: `value-${id}` }))

      return Effect.gen(function*() {
        const encoded = yield* Effect.forEach(
          values,
          (value) => encode(value).pipe(Effect.flatMap((bytes) => Effect.yieldNow.pipe(Effect.as(bytes)))),
          { concurrency: "unbounded" }
        )
        yield* Effect.yieldNow
        assert.deepStrictEqual(encoded.map((bytes) => decode(bytes)), values)
      })
    })
  })

  describe("schema evolution", () => {
    it("skips unknown fields, accepts field reorder, and leaves missing optionals absent", () => {
      const Writer = Schema.Struct({ a: Schema.Number, extra: Schema.String, b: Schema.String })
      const Reader = Schema.Struct({ b: Schema.String, a: Schema.Number, optional: Schema.optionalKey(Schema.Boolean) })
      const bytes = encode(Writer, { a: 1, extra: "drop", b: "keep" })
      assert.deepStrictEqual(Schema.decodeUnknownSync(SchemaBinary.toCodec(Reader))(bytes), { a: 1, b: "keep" })

      const OrderedA = Schema.Struct({ a: Schema.Number, b: Schema.String })
      const OrderedB = Schema.Struct({ b: Schema.String, a: Schema.Number })
      assert.deepStrictEqual([...encode(OrderedA, { a: 1, b: "x" })], [...encode(OrderedB, { a: 1, b: "x" })])
    })

    it("uses fieldId as the encoded-side field identity", () => {
      const Before = Schema.Struct({ oldName: Schema.String.pipe(SchemaBinary.fieldId(1)) })
      const After = Schema.Struct({ newName: Schema.String.pipe(SchemaBinary.fieldId(1)) })
      const bytes = encode(Before, { oldName: "value" })
      assert.deepStrictEqual(Schema.decodeUnknownSync(SchemaBinary.toCodec(After))(bytes), { newName: "value" })
      assert.throws(() => SchemaBinary.fieldId(0))
      assert.throws(() => SchemaBinary.fieldId(1.5))
    })

    it("skips an unknown union member on an optional struct field", () => {
      const A = Schema.Struct({ _tag: Schema.Literal("A"), n: Schema.Number })
      const B = Schema.Struct({ _tag: Schema.Literal("B"), text: Schema.String })
      const Writer = Schema.Struct({ event: Schema.optionalKey(Schema.Union([A, B])) })
      const Reader = Schema.Struct({ event: Schema.optionalKey(Schema.Union([A])) })
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(SchemaBinary.toCodec(Reader))(encode(Writer, { event: { _tag: "B", text: "new" } })),
        {}
      )
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(SchemaBinary.toCodec(Reader))(encode(Writer, { event: { _tag: "A", n: 1 } })),
        { event: { _tag: "A", n: 1 } }
      )
    })

    it("keeps tuple sentinels in variant payloads", () => {
      const A = Schema.Tuple([Schema.Literal("A"), Schema.Number])
      const B = Schema.Tuple([Schema.Literal("B"), Schema.String])
      const schema = Schema.Union([A, B])
      assert.deepStrictEqual(roundtrip(schema, ["A", 1]), ["A", 1])
      assert.deepStrictEqual(roundtrip(schema, ["B", "value"]), ["B", "value"])
    })

    it("rejects unknown union members in positional slots", () => {
      const A = Schema.Struct({ _tag: Schema.Literal("A") })
      const B = Schema.Struct({ _tag: Schema.Literal("B") })
      const WriterArray = Schema.Array(Schema.Union([A, B]))
      const ReaderArray = Schema.Array(Schema.Union([A]))
      assert.match(
        schemaError(() =>
          Schema.decodeUnknownSync(SchemaBinary.toCodec(ReaderArray))(encode(WriterArray, [{ _tag: "B" }]))
        ).message,
        /Missing key/
      )

      const WriterTuple = Schema.Tuple([Schema.optionalKey(Schema.Union([A, B]))])
      const ReaderTuple = Schema.Tuple([Schema.optionalKey(Schema.Union([A]))])
      assert.match(
        schemaError(() =>
          Schema.decodeUnknownSync(SchemaBinary.toCodec(ReaderTuple))(encode(WriterTuple, [{ _tag: "B" }]))
        ).message,
        /known union member/
      )
    })

    it("reports the array or tuple index for an unknown positional union member", () => {
      const A = Schema.Struct({ _tag: Schema.Literal("A") })
      const B = Schema.Struct({ _tag: Schema.Literal("B") })
      const WriterArray = Schema.Struct({ xs: Schema.Array(Schema.Union([A, B])) })
      const ReaderArray = Schema.Struct({ xs: Schema.Array(Schema.Union([A])) })
      assert.match(
        schemaError(() =>
          Schema.decodeUnknownSync(SchemaBinary.toCodec(ReaderArray))(
            encode(WriterArray, { xs: [{ _tag: "B" }] })
          )
        ).message,
        /Missing key\n  at \["xs"\]\[0\]/
      )

      const WriterTuple = Schema.Struct({ xs: Schema.Tuple([Schema.String, Schema.Union([A, B])]) })
      const ReaderTuple = Schema.Struct({ xs: Schema.Tuple([Schema.String, Schema.Union([A])]) })
      assert.match(
        schemaError(() =>
          Schema.decodeUnknownSync(SchemaBinary.toCodec(ReaderTuple))(
            encode(WriterTuple, { xs: ["head", { _tag: "B" }] })
          )
        ).message,
        /Missing key\n  at \["xs"\]\[1\]/
      )
    })

    it("uses kind tags for mixed enums", () => {
      const Mixed = { Text: "text", Code: 1 } as const
      const schema = Schema.Enum(Mixed)
      assert.strictEqual(roundtrip(schema, Mixed.Text), "text")
      assert.strictEqual(roundtrip(schema, Mixed.Code), 1)
    })

    it("encodes record entries in the reserved field zero map", () => {
      const schema = Schema.Record(Schema.String, Schema.Number)
      const value = { z: 1, a: 2 }
      assert.deepStrictEqual(roundtrip(schema, value), value)
      assert.deepStrictEqual([...encode(schema, value)], [...encode(schema, { a: 2, z: 1 })])
    })
  })

  describe("parser", () => {
    it("parses concatenated frames split across chunks", () => {
      const schema = Schema.Struct({ a: Schema.Number })
      const first = encode(schema, { a: 1 })
      const second = encode(schema, { a: 2 })
      const bytes = concat(first, second)
      const parser = SchemaBinary.parser(schema)
      assert.deepStrictEqual(parser.feedSync(bytes.slice(0, first.length + 3)), [{ a: 1 }])
      assert.deepStrictEqual(parser.feedSync(bytes.slice(first.length + 3)), [{ a: 2 }])
      parser.endSync()
      assert.match(schemaError(() => parser.feedSync(new Uint8Array())).message, /parser is spent/)
    })

    it("retains partial frames across one-byte feeds", () => {
      const bytes = concat(...Array.from({ length: 100 }, (_, i) => encode(Schema.Number, i)))
      const parser = SchemaBinary.parser(Schema.Number)
      const values: Array<number> = []
      for (const byte of bytes) values.push(...parser.feedSync(Uint8Array.of(byte)))
      parser.endSync()
      assert.deepStrictEqual(values, Array.from({ length: 100 }, (_, i) => i))
    })

    it("delivers completed values before reporting a later failure", () => {
      const good = encode(Schema.Number, 1)
      const bad = encode(Schema.Number, 2).slice(0, 4)
      const parser = SchemaBinary.parser(Schema.Number)
      assert.deepStrictEqual(parser.feedSync(concat(good, bad)), [1])
      assert.match(schemaError(() => parser.endSync()).message, /complete value/)
      assert.match(schemaError(() => parser.feedSync(new Uint8Array())).message, /parser is spent/)
    })

    it("enforces maxFrameSize", () => {
      const bytes = encode(Schema.String, "too large")
      const parser = SchemaBinary.parser(Schema.String, { maxFrameSize: 2 })
      assert.match(schemaError(() => parser.feedSync(bytes)).message, /frame within maxFrameSize/)
    })

    it("fails a ten-byte unterminated length immediately", () => {
      const bytes = new Uint8Array(10).fill(0x80)
      const parser = SchemaBinary.parser(Schema.String, { reportInput: true })
      const error = schemaError(() => parser.feedSync(bytes))
      assert.match(error.message, /uvarint/)
      assert.isTrue(SchemaIssue.hasInput(error.issue))
    })

    it.effect("wraps feed and end in SchemaError effects", () =>
      Effect.gen(function*() {
        const parser = SchemaBinary.parser(Schema.Number)
        const values = yield* parser.feed(encode(Schema.Number, 1))
        assert.deepStrictEqual(values, [1])
        yield* parser.end()
      }))
  })

  describe("native declarations", () => {
    it("round-trips bigint, Date, bytes, Option, and Result", () => {
      assert.strictEqual(roundtrip(Schema.BigInt, -12345678901234567890n), -12345678901234567890n)
      assert.strictEqual(roundtrip(Schema.Date, new Date(-123456789)).getTime(), -123456789)
      assert.deepStrictEqual([...roundtrip(Schema.Uint8Array, Uint8Array.of(0, 1, 255))], [0, 1, 255])

      const option = roundtrip(Schema.Option(Schema.String), Option.some("value"))
      assert.isTrue(Option.isSome(option))
      if (Option.isSome(option)) assert.strictEqual(option.value, "value")

      const result = roundtrip(Schema.Result(Schema.Number, Schema.String), Result.fail("error"))
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) assert.strictEqual(result.failure, "error")
    })

    it("round-trips Duration and normalized BigDecimal", () => {
      const duration = roundtrip(Schema.Duration, Duration.millis(1.5))
      assert.strictEqual(Duration.toNanosUnsafe(duration), 1_500_000n)
      assert.strictEqual(roundtrip(Schema.Duration, Duration.infinity), Duration.infinity)

      const decimal = roundtrip(Schema.BigDecimal, BigDecimal.make(100n, 2))
      assert.strictEqual(decimal.value, 1n)
      assert.strictEqual(decimal.scale, 0)
    })

    it("round-trips UTC and zoned DateTime values", () => {
      const utc = DateTime.makeUnsafe(-123456789)
      assert.strictEqual(DateTime.toEpochMillis(roundtrip(Schema.DateTimeUtc, utc)), -123456789)

      for (
        const zoned of [
          DateTime.makeZonedUnsafe(123456789, { timeZone: 3_600_000 }),
          DateTime.makeZonedUnsafe(123456789, { timeZone: "Europe/London" })
        ]
      ) {
        const decoded = roundtrip(Schema.DateTimeZoned, zoned)
        assert.strictEqual(DateTime.toEpochMillis(decoded), DateTime.toEpochMillis(zoned))
        assert.strictEqual(DateTime.zoneToString(decoded.zone), DateTime.zoneToString(zoned.zone))
      }
    })

    it("round-trips Exit, Cause, and CauseReason", () => {
      const causeSchema = Schema.Cause(Schema.String, Schema.Unknown)
      const cause = Cause.fromReasons([
        Cause.makeFailReason("boom"),
        Cause.makeDieReason({ defect: true }),
        Cause.makeInterruptReason(0),
        Cause.makeInterruptReason()
      ])
      const decoded = roundtrip(causeSchema, cause)
      assert.deepStrictEqual(decoded.reasons.map((reason) => reason._tag), ["Fail", "Die", "Interrupt", "Interrupt"])
      assert.strictEqual((decoded.reasons[2] as Cause.Interrupt).fiberId, 0)
      assert.strictEqual((decoded.reasons[3] as Cause.Interrupt).fiberId, undefined)

      const reason = roundtrip(
        Schema.CauseReason(Schema.String, Schema.Unknown),
        Cause.makeFailReason("failure")
      )
      assert.strictEqual(reason._tag, "Fail")

      const exit = roundtrip(Schema.Exit(Schema.Number, Schema.String, Schema.Unknown), Exit.failCause(cause))
      assert.isTrue(Exit.isFailure(exit))
    })
  })

  describe("generic declarations and recursion", () => {
    it("uses declaration codec links for collections, Redacted, Class, and TaggedClass", () => {
      const chunk = roundtrip(Schema.Chunk(Schema.Number), Chunk.make(1, 2, 3))
      assert.deepStrictEqual(Chunk.toReadonlyArray(chunk), [1, 2, 3])

      const map = roundtrip(Schema.HashMap(Schema.String, Schema.Number), HashMap.make(["a", 1], ["b", 2]))
      assert.strictEqual(HashMap.get(map, "a").pipe(Option.getOrUndefined), 1)
      assert.strictEqual(HashMap.get(map, "b").pipe(Option.getOrUndefined), 2)

      const set = roundtrip(Schema.HashSet(Schema.String), HashSet.make("a", "b"))
      assert.isTrue(HashSet.has(set, "a"))
      assert.isTrue(HashSet.has(set, "b"))

      const redacted = roundtrip(Schema.Redacted(Schema.String), Redacted.make("secret"))
      assert.strictEqual(Redacted.value(redacted), "secret")

      class Person extends Schema.Class<Person>("Person")({ name: Schema.String }) {}
      const person = roundtrip(Person, new Person({ name: "Ada" }))
      assert.instanceOf(person, Person)
      assert.strictEqual(person.name, "Ada")

      class Event extends Schema.TaggedClass<Event>()("Event", { value: Schema.Number }) {}
      const event = roundtrip(Event, new Event({ value: 1 }))
      assert.instanceOf(event, Event)
      assert.strictEqual(event._tag, "Event")
      assert.strictEqual(event.value, 1)
    })

    it("compiles and round-trips recursive suspended schemas", () => {
      interface Node {
        readonly value: number
        readonly children: ReadonlyArray<Node>
      }
      let Node: Schema.Codec<Node>
      Node = Schema.Struct({
        value: Schema.Number,
        children: Schema.Array(Schema.suspend(() => Node))
      })
      const value: Node = { value: 1, children: [{ value: 2, children: [] }] }
      assert.deepStrictEqual(roundtrip(Node, value), value)
    })

    it("fails cyclic JSON values with the acyclic value issue", () => {
      const value: Record<string, unknown> = {}
      value.self = value
      assert.match(schemaError(() => encode(Schema.Unknown, value)).message, /acyclic value/)
    })

    it("fails cyclic recursive struct values with the acyclic value issue", () => {
      interface Node {
        readonly value: number
        readonly next?: Node
      }
      let Node: Schema.Codec<Node>
      Node = Schema.Struct({
        value: Schema.Number,
        next: Schema.optionalKey(Schema.suspend(() => Node))
      })
      const value: { value: number; next?: Node } = { value: 1 }
      value.next = value
      assert.match(schemaError(() => encode(Node, value)).message, /acyclic value/)
    })

    it("fails array-mediated cycles with the acyclic value issue", () => {
      interface Node {
        readonly name: string
        readonly children: ReadonlyArray<Node>
      }
      let Node: Schema.Codec<Node>
      Node = Schema.Struct({
        name: Schema.String,
        children: Schema.Array(Schema.suspend(() => Node))
      })
      const node: { name: string; children: Array<Node> } = { name: "root", children: [] }
      node.children.push(node)
      assert.match(schemaError(() => encode(Node, node)).message, /acyclic value/)

      const unknown: Array<unknown> = []
      unknown.push(unknown)
      assert.match(schemaError(() => encode(Schema.Unknown, unknown)).message, /acyclic value/)
    })

    it("runs user encoding links before the binary layer", () => {
      const bytes = encode(Schema.NumberFromString, 123)
      assert.strictEqual(bytes.length, 5)
      assert.strictEqual(roundtrip(Schema.NumberFromString, 123), 123)

      const Before = Schema.Struct({ value: Schema.NumberFromString.pipe(SchemaBinary.fieldId(7)) })
      const After = Schema.Struct({ renamed: Schema.NumberFromString.pipe(SchemaBinary.fieldId(7)) })
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(SchemaBinary.toCodec(After))(encode(Before, { value: 123 })),
        { renamed: 123 }
      )
    })

    it("keeps a sound runtime type guard on the derived codec", () => {
      const codec = SchemaBinary.toCodec(Schema.Struct({ name: Schema.String, age: Schema.Number }))
      assert.isTrue(Schema.is(codec)({ name: "Ada", age: 42 }))
      assert.isFalse(Schema.is(codec)({ nope: 1 }))
    })

    it("keeps a sound runtime type guard on recursive derived codecs", () => {
      interface Node {
        readonly value: number
        readonly children: ReadonlyArray<Node>
      }
      let Node: Schema.Codec<Node>
      Node = Schema.Struct({
        value: Schema.Number,
        children: Schema.Array(Schema.suspend(() => Node))
      })
      const codec = SchemaBinary.toCodec(Node)

      assert.isTrue(Schema.is(codec)({ value: 1, children: [] }))
      assert.isFalse(Schema.is(codec)({ nope: 1 }))
      assert.isFalse(Schema.is(Schema.Struct({ inner: codec }))({ inner: { nope: 1 } }))
    })
  })

  describe("parse options", () => {
    it("honors checks and disableChecks", () => {
      const bytes = encode(Schema.Number, 1.5)
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(SchemaBinary.toCodec(Schema.Int))(bytes)).message,
        /integer/
      )

      const parser = SchemaBinary.parser(Schema.Int, { disableChecks: true })
      assert.deepStrictEqual(parser.feedSync(bytes), [1.5])
      parser.endSync()
    })

    it("honors disableChecks for recursive schemas", () => {
      interface Node {
        readonly value: number
        readonly children: ReadonlyArray<Node>
      }
      let Writer: Schema.Codec<Node>
      Writer = Schema.Struct({
        value: Schema.Number,
        children: Schema.Array(Schema.suspend(() => Writer))
      })
      let Reader: Schema.Codec<Node>
      Reader = Schema.Struct({
        value: Schema.Int,
        children: Schema.Array(Schema.suspend(() => Reader))
      })
      const value: Node = { value: 1.5, children: [] }
      const parser = SchemaBinary.parser(Reader, { disableChecks: true })

      assert.deepStrictEqual(parser.feedSync(encode(Writer, value)), [value])
      parser.endSync()
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(SchemaBinary.toCodec(Reader), { disableChecks: true })(encode(Writer, value)),
        value
      )
    })

    it("honors errors all for missing fields", () => {
      const bytes = encode(Schema.Struct({}), {})
      const Reader = Schema.Struct({ a: Schema.String, b: Schema.Number })
      const error = schemaError(() => Schema.decodeUnknownSync(SchemaBinary.toCodec(Reader), { errors: "all" })(bytes))
      assert.strictEqual(error.message.match(/Missing key/g)?.length, 2)
    })
  })

  describe("layout and data errors", () => {
    it("throws Error while compiling invalid layouts", () => {
      const declaration = Schema.declare((_): _ is { readonly value: string } => true)
      assert.throws(
        () => SchemaBinary.toCodec(declaration),
        /Binary layout: declaration <anonymous> has no toCodecJson or toCodec/
      )
      assert.throws(
        () =>
          SchemaBinary.toCodec(Schema.Union([
            Schema.Struct({ a: Schema.String }),
            Schema.Struct({ b: Schema.Number })
          ])),
        /union members are not uniquely identifiable/
      )
      assert.throws(
        () =>
          SchemaBinary.toCodec(Schema.Struct({
            a: Schema.String.pipe(SchemaBinary.fieldId(1)),
            b: Schema.String.pipe(SchemaBinary.fieldId(1))
          })),
        /Binary layout field id collision: 1/
      )
      assert.throws(
        () =>
          SchemaBinary.toCodec(Schema.Union([
            Schema.Literal("a"),
            Schema.UniqueSymbol(Symbol.for("SchemaBinary/symbol"))
          ])),
        /union members are not uniquely identifiable/
      )
      assert.throws(
        () => SchemaBinary.toCodec(Schema.Struct({ [Symbol.for("SchemaBinary/key")]: Schema.String })),
        /symbol property names are illegal/
      )
      assert.throws(
        () =>
          SchemaBinary.toCodec(Schema.Union([
            Schema.Struct({ _tag: Schema.Literal("1a0a49t3mq") }),
            Schema.Struct({ _tag: Schema.Literal("m7r4q02dm7") })
          ])),
        /Binary layout sentinel collision: 3370793117/
      )
    })

    it("uses SchemaIssue for binary failures", () => {
      const codec = SchemaBinary.toCodec(Schema.Boolean)
      const error = schemaError(() => Schema.decodeUnknownSync(codec)(Uint8Array.of(2, 0x10, 2)))
      assert.isTrue(SchemaIssue.isIssue(error.issue))
      assert.match(error.message, /bool/)
    })

    it.effect("preserves the SchemaParser Issue and Schema SchemaError surfaces", () =>
      Effect.gen(function*() {
        const codec = SchemaBinary.toCodec(Schema.Boolean)
        const bytes = Uint8Array.of(2, 0x10, 2)
        const issue = yield* SchemaParser.decodeUnknownEffect(codec)(bytes).pipe(Effect.flip)
        assert.isTrue(SchemaIssue.isIssue(issue))
        const error = yield* Schema.decodeUnknownEffect(codec)(bytes).pipe(Effect.flip)
        assert.isTrue(Schema.isSchemaError(error))
      }))

    it("reports a missing fixed tuple slot as MissingKey", () => {
      const emptyTuple = encode(Schema.Tuple([]), [])
      const error = schemaError(() =>
        Schema.decodeUnknownSync(SchemaBinary.toCodec(Schema.Tuple([Schema.String])))(emptyTuple)
      )
      assert.match(error.message, /Missing key/)
    })

    it("rejects malformed lengths and text", () => {
      const string = SchemaBinary.toCodec(Schema.String)
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(string)(Uint8Array.of(0))).message,
        /nonzero frame length/
      )
      assert.match(
        schemaError(() =>
          Schema.decodeUnknownSync(string)(Uint8Array.of(0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x10))
        ).message,
        /safe integer length/
      )
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(string)(Uint8Array.of(2, 0x10, 0xFF))).message,
        /utf-8/
      )
    })

    it("rejects attacker-sized zero-width array counts", () => {
      const codec = SchemaBinary.toCodec(Schema.Array(Schema.Null))
      const bytes = Uint8Array.of(6, 0x10, 0x80, 0x80, 0x80, 0x80, 0x10)
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(codec)(bytes)).message,
        /array count within allocation limit/
      )
    })

    it("rejects duplicate struct field ids and extra keys", () => {
      const struct = Schema.Struct({ value: Schema.String })
      const encodedStruct = encode(struct, { value: "x" })
      const field = encodedStruct.slice(2)
      const duplicateField = concat(Uint8Array.of(1 + field.length * 2, 0x10), field, field)
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(SchemaBinary.toCodec(struct))(duplicateField)).message,
        /unique field ids/
      )

      const record = Schema.Record(Schema.String, Schema.Number)
      const encodedRecord = encode(record, { a: 1 })
      const pair = encodedRecord.slice(4)
      const duplicateKey = concat(Uint8Array.of(3 + pair.length * 2, 0x10, 0, pair.length * 2), pair, pair)
      assert.match(
        schemaError(() => Schema.decodeUnknownSync(SchemaBinary.toCodec(record))(duplicateKey)).message,
        /unique extra keys/
      )
    })

    it("rejects a duplicate field id after an unknown union decodes as absent", () => {
      const A = Schema.Struct({ _tag: Schema.Literal("A") })
      const B = Schema.Struct({ _tag: Schema.Literal("B"), value: Schema.String })
      const Writer = Schema.Struct({ event: Schema.optionalKey(Schema.Union([A, B])) })
      const Reader = Schema.Struct({ event: Schema.optionalKey(Schema.Union([A])) })
      const encoded = encode(Writer, { event: { _tag: "B", value: "new" } })
      const field = encoded.slice(2)
      const duplicateField = concat(Uint8Array.of(1 + field.length * 2, 0x10), field, field)

      assert.match(
        schemaError(() => Schema.decodeUnknownSync(SchemaBinary.toCodec(Reader))(duplicateField)).message,
        /unique field ids/
      )
    })

    it("does not satisfy wide-field presence from the extra-key map", () => {
      const fields: Record<string, typeof Schema.String> = {}
      const value: Record<string, string> = {}
      for (let i = 0; i < 34; i++) {
        const key = `field${i}`
        fields[key] = Schema.String
        value[key] = key
      }
      const record = Schema.Record(Schema.String, Schema.String)
      const struct = Schema.StructWithRest(Schema.Struct(fields), [record])
      const error = schemaError(() =>
        Schema.decodeUnknownSync(SchemaBinary.toCodec(struct), { errors: "all" })(encode(record, value))
      )

      assert.strictEqual(error.message.match(/Missing key/g)?.length, 34)
    })

    it("fails Never values and unregistered symbols through SchemaError", () => {
      assert.isTrue(Schema.isSchemaError(schemaError(() => encode(Schema.Never, undefined))))
      assert.isTrue(
        Schema.isSchemaError(
          schemaError(() => Schema.decodeUnknownSync(SchemaBinary.toCodec(Schema.Never))(Uint8Array.of(1, 0x10)))
        )
      )
      assert.match(schemaError(() => encode(Schema.Symbol, Symbol("local"))).message, /registered symbol/)
    })
  })
})
