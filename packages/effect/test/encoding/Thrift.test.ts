import { assert, describe, it } from "@effect/vitest"
import { Result, Schema } from "effect"
import * as Thrift from "effect/encoding/Thrift"
import { readFileSync } from "node:fs"

// Expected bytes and trees come from the official Apache Thrift Python
// library; see fixtures/thrift/README.md
type Json =
  | { readonly _tag: "Bool"; readonly value: boolean }
  | { readonly _tag: "I8" | "I16" | "I32"; readonly value: number }
  | { readonly _tag: "I64"; readonly value: string }
  | { readonly _tag: "Double"; readonly value: number | string }
  | { readonly _tag: "Binary" | "Uuid"; readonly value: string }
  | { readonly _tag: "Struct"; readonly fields: ReadonlyArray<{ readonly id: number; readonly value: Json }> }
  | { readonly _tag: "List" | "Set"; readonly elementType: Thrift.TypeName; readonly elements: ReadonlyArray<Json> }
  | {
    readonly _tag: "Map"
    readonly keyType: Thrift.TypeName
    readonly valueType: Thrift.TypeName
    readonly entries: ReadonlyArray<readonly [Json, Json]>
  }
interface Case {
  readonly id: string
  readonly type: Thrift.TypeName
  readonly value: Json
  readonly bytes: string
}

const gold: { readonly cases: ReadonlyArray<Case>; readonly parquet: ReadonlyArray<Omit<Case, "type">> } = JSON
  .parse(readFileSync(new URL("../fixtures/thrift/gold.json", import.meta.url), "utf8"))
const corpus: ReadonlyArray<Case> = [...gold.cases, ...gold.parquet.map((c) => ({ ...c, type: "Struct" as const }))]
const parquet = (id: string) => fromHex(gold.parquet.find((c) => c.id === id)!.bytes)

const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16))
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

const fromJson = (v: Json): Thrift.Value => {
  switch (v._tag) {
    case "I64":
      return { _tag: "I64", value: BigInt(v.value) }
    case "Double":
      return { _tag: "Double", value: Number(v.value) }
    case "Binary":
    case "Uuid":
      return { _tag: v._tag, value: fromHex(v.value) }
    case "Struct":
      return { _tag: "Struct", fields: v.fields.map((f) => ({ id: f.id, value: fromJson(f.value) })) }
    case "List":
    case "Set":
      return { ...v, elements: v.elements.map(fromJson) }
    case "Map":
      return { ...v, entries: v.entries.map(([k, x]) => [fromJson(k), fromJson(x)] as const) }
    default:
      return v
  }
}

const toJson = (v: Thrift.Value): Json => {
  switch (v._tag) {
    case "I64":
      return { _tag: "I64", value: String(v.value) }
    case "Double":
      return {
        _tag: "Double",
        value: Object.is(v.value, -0) ? "-0" : Number.isFinite(v.value) ? v.value : String(v.value)
      }
    case "Binary":
    case "Uuid":
      return { _tag: v._tag, value: toHex(v.value) }
    case "Struct":
      return { _tag: "Struct", fields: v.fields.map((f) => ({ id: f.id, value: toJson(f.value) })) }
    case "List":
    case "Set":
      return { ...v, elements: v.elements.map(toJson) }
    case "Map":
      return { ...v, entries: v.entries.map(([k, x]) => [toJson(k), toJson(x)] as const) }
    default:
      return v
  }
}

const readAll = (bytes: Uint8Array, type: Thrift.TypeName, options?: Thrift.Options) =>
  Thrift.decode(bytes, (r) => {
    const value = r.readValue(Thrift.Type[type])
    assert.strictEqual(r.position, bytes.length)
    return value
  }, options)

const write = (f: (w: Thrift.Writer) => void): Uint8Array => {
  const w = Thrift.makeWriter()
  f(w)
  return w.finish()
}

const kindOf = <A>(result: Result.Result<A, Thrift.ThriftError>): Thrift.ThriftError["kind"] | undefined =>
  Result.isFailure(result) ? result.failure.kind : undefined

const thrown = (f: () => unknown): Thrift.ThriftError["kind"] | undefined => {
  try {
    f()
  } catch (error) {
    assert.isTrue(Thrift.isThriftError(error), String(error))
    return (error as Thrift.ThriftError).kind
  }
  return undefined
}

describe("Thrift", () => {
  describe("official library", () => {
    it("reads, skips and writes every gold case as the official library does", () => {
      for (const c of corpus) {
        const bytes = fromHex(c.bytes)
        assert.deepStrictEqual(toJson(Result.getOrThrow(readAll(bytes, c.type))), c.value, c.id)
        const r = Thrift.makeReader(bytes)
        r.skip(Thrift.Type[c.type])
        assert.strictEqual(r.position, bytes.length, c.id)
        assert.strictEqual(toHex(write((w) => w.writeValue(fromJson(c.value)))), c.bytes, c.id)
      }
    })

    it("reads a Parquet footer field by field", () => {
      // The fields of parquet.thrift's FileMetaData that pyarrow reports, read
      // the way a typed reader does: by field id, skipping the rest.
      const struct = (r: Thrift.Reader, field: (id: number, type: Thrift.Type) => void) => {
        r.readStructBegin()
        for (let t = r.readFieldBegin(); t !== Thrift.Type.Stop; t = r.readFieldBegin()) field(r.fieldId, t)
        r.readStructEnd()
      }
      const list = (r: Thrift.Reader, element: (index: number) => void) => {
        for (let n = r.readListBegin(), i = 0; i < n; i++) element(i)
      }
      const footer = (bytes: Uint8Array) =>
        Result.getOrThrow(Thrift.decode(bytes, (r) => {
          const out = { numRows: 0, columns: [] as Array<string>, createdBy: "", dataPageOffsets: [] as Array<number> }
          // ColumnChunk → 3: ColumnMetaData → 9: data_page_offset
          const columnChunk = () =>
            struct(r, (id, t) => {
              if (id !== 3) return r.skip(t)
              struct(r, (id, t) => id === 9 ? out.dataPageOffsets.push(r.readI64Number()) : r.skip(t))
            })
          // RowGroup → 1: list<ColumnChunk>
          const rowGroup = () => struct(r, (id, t) => id === 1 ? list(r, columnChunk) : r.skip(t))
          // SchemaElement → 4: name; element 0 is the root
          const schemaElement = (i: number) =>
            struct(r, (id, t) => id === 4 && i > 0 ? out.columns.push(r.readString()) : r.skip(t))
          struct(r, (id, t) => {
            if (id === 2) list(r, schemaElement)
            else if (id === 3) out.numRows = r.readI64Number()
            else if (id === 4) list(r, rowGroup)
            else if (id === 6) out.createdBy = r.readString()
            else r.skip(t)
          })
          assert.strictEqual(r.position, bytes.length)
          return out
        }))
      const bloom = footer(parquet("data_index_bloom_encoding_stats.parquet/footer"))
      assert.strictEqual(bloom.numRows, 14)
      assert.deepStrictEqual(bloom.columns, ["String"])
      assert.deepStrictEqual(bloom.dataPageOffsets, [4])
      assert.match(bloom.createdBy, /^parquet-mr version 1\.13\.0-SNAPSHOT/)
      const tiny = footer(parquet("alltypes_tiny_pages.parquet/footer"))
      assert.strictEqual(tiny.numRows, 7300)
      assert.deepStrictEqual(tiny.columns, [
        "id",
        "bool_col",
        "tinyint_col",
        "smallint_col",
        "int_col",
        "bigint_col",
        "float_col",
        "double_col",
        "date_string_col",
        "string_col",
        "timestamp_col",
        "year",
        "month"
      ])
      assert.strictEqual(tiny.dataPageOffsets[0], 4)
    })
  })

  describe("Reader", () => {
    const roundTrip = <A>(writeOne: (w: Thrift.Writer) => void, readOne: (r: Thrift.Reader) => A): A => {
      const bytes = write(writeOne)
      const r = Thrift.makeReader(bytes)
      const back = readOne(r)
      assert.strictEqual(r.position, bytes.length)
      return back
    }

    it.prop(
      "i64 round-trips as bigint",
      [Schema.BigInt.check(
        Schema.isBetweenBigInt({ minimum: -(BigInt(1) << BigInt(63)), maximum: (BigInt(1) << BigInt(63)) - BigInt(1) })
      )],
      ([n]) => {
        assert.strictEqual(roundTrip((w) => w.writeI64(n), (r) => r.readI64()), n)
      }
    )

    it.prop("i64 round-trips as number", [Schema.Int], ([n]) => {
      assert.strictEqual(roundTrip((w) => w.writeI64Number(n), (r) => r.readI64Number()), n)
      assert.strictEqual(roundTrip((w) => w.writeI64Number(n), (r) => r.readI64()), BigInt(n))
    })

    it.prop("string round-trips through UTF-8", [Schema.String], ([s]) => {
      // Lone surrogates have no UTF-8 encoding and become U+FFFD.
      const expected = new TextDecoder().decode(new TextEncoder().encode(s))
      assert.strictEqual(roundTrip((w) => w.writeString(s), (r) => r.readString()), expected)
    })

    it("keeps a leading byte order mark in a string", () => {
      assert.strictEqual(roundTrip((w) => w.writeString("\uFEFFa"), (r) => r.readString()), "\uFEFFa")
    })

    it("reads i64 as a number only when it is a safe integer", () => {
      const max = BigInt(Number.MAX_SAFE_INTEGER)
      const asNumber = (n: bigint) => Thrift.decode(write((w) => w.writeI64(n)), (r) => r.readI64Number())
      assert.strictEqual(Result.getOrThrow(asNumber(max)), Number.MAX_SAFE_INTEGER)
      assert.strictEqual(Result.getOrThrow(asNumber(-max)), -Number.MAX_SAFE_INTEGER)
      assert.strictEqual(kindOf(asNumber(max + BigInt(1))), "Range")
      assert.strictEqual(kindOf(asNumber(-max - BigInt(1))), "Range")
    })

    it("reads from a position set by the caller", () => {
      // A Parquet page header sits at an offset inside the file.
      const r = Thrift.makeReader(Uint8Array.of(0xff, 0xff, 0x15, 0x02, 0x00))
      r.position = 2
      assert.deepStrictEqual(r.readValue(Thrift.Type.Struct), {
        _tag: "Struct",
        fields: [{ id: 1, value: { _tag: "I32", value: 1 } }]
      })
      assert.strictEqual(r.position, 5)
    })

    it("reads binary as a view of the input", () => {
      const bytes = Uint8Array.of(2, 7, 8)
      const view = Thrift.makeReader(bytes).readBinary()
      assert.strictEqual(view.buffer, bytes.buffer)
      assert.deepStrictEqual(Array.from(view), [7, 8])
    })

    it("reads a bool list element type written as 2", () => {
      // Some writers use the FALSE code for the element type of list<bool>.
      const r = Thrift.makeReader(Uint8Array.of(0x12, 0x01))
      assert.strictEqual(r.readListBegin(), 1)
      assert.strictEqual(r.elementType, Thrift.Type.Bool)
      assert.isTrue(r.readBool())
    })
  })

  describe("hostile input", () => {
    const struct = (r: Thrift.Reader) => r.readValue(Thrift.Type.Struct)
    const table: ReadonlyArray<
      readonly [string, string, (r: Thrift.Reader) => unknown, Thrift.ThriftError["kind"], Thrift.Options?]
    > = [
      ["empty input", "", struct, "Truncated"],
      ["a struct without its stop", "1502", struct, "Truncated"],
      ["an i32 varint over 5 bytes", "808080808001", (r) => r.readI32(), "Malformed"],
      ["an i32 varint over 32 bits", "ffffffff1f", (r) => r.readI32(), "Malformed"],
      ["an i64 varint over 10 bytes", "ffffffffffffffffff8101", (r) => r.readI64(), "Malformed"],
      ["an i64 varint over 64 bits", "ffffffffffffffffff02", (r) => r.readI64(), "Malformed"],
      // Other readers wrap these to 16 bits or keep them, so fields would alias.
      ["an i16 over 16 bits", "808004", (r) => r.readI16(), "Malformed"],
      ["a field id over 16 bits", "0580800400", struct, "Malformed"],
      ["a field id delta past 32767", "05feff0300f50000", struct, "Malformed"],
      ["an unknown field type", "1e", struct, "Malformed"],
      ["an unknown list element type", "1e", (r) => r.readListBegin(), "Malformed"],
      ["a non-empty list of Stop", "10", (r) => r.readListBegin(), "Malformed"],
      ["a list larger than the input", "f5ffff03", (r) => r.readListBegin(), "Truncated"],
      ["a map larger than the input", "0355020406", (r) => r.readMapBegin(), "Truncated"],
      ["a binary longer than the input", "0561", (r) => r.readBinary(), "Truncated"],
      ["a string that isn't UTF-8", "02c328", (r) => r.readString(), "InvalidUtf8"],
      ["a binary over maxBinaryLength", "03616263", (r) => r.readBinary(), "Limit", { maxBinaryLength: 2 }],
      ["a skipped binary over maxBinaryLength", "1803616263", (r) => r.skip(Thrift.Type.Struct), "Limit", {
        maxBinaryLength: 2
      }],
      ["a list over maxContainerSize", "35010203", (r) => r.readListBegin(), "Limit", { maxContainerSize: 2 }],
      ["a struct over maxDepth", "1c1c000000", struct, "Limit", { maxDepth: 2 }],
      ["lists over maxDepth", "1919191500", (r) => r.skip(Thrift.Type.List), "Limit", { maxDepth: 2 }]
    ]
    for (const [name, hex, read, kind, options] of table) {
      it(`fails on ${name}`, () => assert.strictEqual(kindOf(Thrift.decode(fromHex(hex), read, options)), kind))
    }

    it("limits nesting to 64 by default", () => {
      const nest = (depth: number): Thrift.Value => {
        let v: Thrift.Value = { _tag: "Struct", fields: [] }
        for (let i = 1; i < depth; i++) v = { _tag: "Struct", fields: [{ id: 1, value: v }] }
        return v
      }
      const bytesOf = (depth: number) => write((w) => w.writeValue(nest(depth)))
      assert.isTrue(Result.isSuccess(readAll(bytesOf(64), "Struct")))
      assert.strictEqual(kindOf(readAll(bytesOf(65), "Struct")), "Limit")
      assert.strictEqual(kindOf(Thrift.decode(bytesOf(65), (r) => r.skip(Thrift.Type.Struct))), "Limit")
    })

    it("fails every truncated gold case with Truncated", () => {
      for (const c of corpus) {
        const bytes = fromHex(c.bytes)
        for (let n = 0; n < bytes.length; n += Math.max(1, Math.floor(bytes.length / 16))) {
          assert.strictEqual(kindOf(readAll(bytes.subarray(0, n), c.type)), "Truncated", `${c.id} at ${n}`)
        }
      }
    })

    it("only ever fails with ThriftError on corrupted input", () => {
      // Deterministic xorshift so failures reproduce.
      let seed = 0x5eed
      const random = () => {
        seed ^= seed << 13
        seed ^= seed >>> 17
        seed ^= seed << 5
        return (seed >>> 0) / 0x100000000
      }
      let failures = 0
      for (const c of corpus) {
        const original = fromHex(c.bytes)
        const type = Thrift.Type[c.type]
        for (let round = 0; round < 50; round++) {
          const bytes = original.slice()
          const flips = 1 + Math.floor(random() * 4)
          for (let i = 0; i < flips && bytes.length > 0; i++) {
            bytes[Math.floor(random() * bytes.length)] = Math.floor(random() * 256)
          }
          if (thrown(() => Thrift.makeReader(bytes).readValue(type)) !== undefined) failures++
          if (thrown(() => Thrift.makeReader(bytes).skip(type)) !== undefined) failures++
        }
      }
      assert.isAbove(failures, 0)
    })

    it("rejects limits that aren't integers in range", () => {
      // NaN used to disable a limit and a fractional one to round it.
      for (
        const options of [
          { maxDepth: NaN },
          { maxDepth: 0 },
          { maxDepth: 1.5 },
          { maxBinaryLength: -1 },
          { maxBinaryLength: NaN },
          { maxContainerSize: Infinity }
        ]
      ) {
        assert.strictEqual(
          thrown(() => Thrift.makeReader(new Uint8Array(0), options)),
          "Usage",
          Object.entries(options).join()
        )
      }
    })

    it("decode rethrows errors that aren't ThriftErrors", () => {
      assert.throws(() =>
        Thrift.decode(Uint8Array.of(0), () => {
          throw new Error("boom")
        }), "boom")
    })

    it("decode rethrows Usage errors, which are the caller's", () => {
      const misuse: ReadonlyArray<(r: Thrift.Reader) => unknown> = [
        (r) => r.readStructEnd(),
        (r) => r.position = -1,
        (r) => r.position = 2,
        (r) => r.position = 0.5,
        (r) => r.skip(Thrift.Type.Stop),
        (r) => r.readValue(7 as Thrift.Type)
      ]
      for (const f of misuse) {
        assert.strictEqual(thrown(() => Thrift.decode(Uint8Array.of(0), f)), "Usage", String(f))
      }
    })
  })

  describe("Writer", () => {
    const usage: ReadonlyArray<readonly [string, (w: Thrift.Writer) => void]> = [
      ["an i8 out of range", (w) => w.writeI8(128)],
      ["a fractional i16", (w) => w.writeI16(1.5)],
      ["an i32 out of range", (w) => w.writeI32(2 ** 31)],
      ["an unsafe i64 number", (w) => w.writeI64Number(2 ** 53)],
      ["an i64 out of range", (w) => w.writeI64(BigInt(1) << BigInt(63))],
      ["a uuid that isn't 16 bytes", (w) => w.writeUuid(new Uint8Array(15))],
      ["a field outside a struct", (w) => w.writeFieldBegin(Thrift.Type.I32, 1)],
      ["a field id out of range", (w) => {
        w.writeStructBegin()
        w.writeFieldBegin(Thrift.Type.I32, 40000)
      }],
      ["a Stop field", (w) => {
        w.writeStructBegin()
        w.writeFieldBegin(Thrift.Type.Stop, 1)
      }],
      ["a bool field without writeBool", (w) => {
        w.writeStructBegin()
        w.writeFieldBegin(Thrift.Type.Bool, 1)
        w.writeI32(1)
      }],
      ["writeStructEnd without writeStructBegin", (w) => w.writeStructEnd()],
      ["finish inside a struct", (w) => {
        w.writeStructBegin()
        w.finish()
      }],
      ["a non-empty list of Stop", (w) => w.writeListBegin(Thrift.Type.Stop, 1)],
      ["a negative list size", (w) => w.writeListBegin(Thrift.Type.I32, -1)],
      [
        "a list element of another type",
        (w) => w.writeValue({ _tag: "List", elementType: "I32", elements: [{ _tag: "I8", value: 1 }] })
      ]
    ]
    for (const [name, f] of usage) {
      it(`rejects ${name}`, () => assert.strictEqual(thrown(() => f(Thrift.makeWriter())), "Usage"))
    }

    it("rejects an initialSize that isn't a non-negative integer", () => {
      // NaN used to make the buffer grow forever.
      for (const initialSize of [NaN, Infinity, -1, 1.5]) {
        assert.strictEqual(thrown(() => Thrift.makeWriter({ initialSize })), "Usage", String(initialSize))
      }
    })

    it("grows from a small buffer and returns a copy", () => {
      const bytes = parquet("alltypes_tiny_pages.parquet/footer")
      const w = Thrift.makeWriter({ initialSize: 1 })
      w.writeValue(Result.getOrThrow(readAll(bytes, "Struct")))
      const out = w.finish()
      assert.deepStrictEqual(out, bytes)
      assert.strictEqual(out.buffer.byteLength, out.length)
    })
  })
})
