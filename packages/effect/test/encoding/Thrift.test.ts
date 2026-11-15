import { assert, describe, it } from "@effect/vitest"
import { Result, Schema } from "effect"
import * as Thrift from "effect/encoding/Thrift"
import { readFileSync } from "node:fs"

// Expected bytes were written by the official Apache Thrift Python library;
// see fixtures/thrift/README.md
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
    case "Double": {
      const d = v.value
      return {
        _tag: "Double",
        value: Number.isFinite(d) && !Object.is(d, -0) ? d : Object.is(d, -0) ? "-0" : String(d)
      }
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

const nest = (depth: number): Thrift.Value => {
  let v: Thrift.Value = { _tag: "Struct", fields: [] }
  for (let i = 0; i < depth - 1; i++) v = { _tag: "Struct", fields: [{ id: 1, value: v }] }
  return v
}

describe("Thrift", () => {
  describe("gold", () => {
    it("reads the official library's bytes", () => {
      assert.isAbove(gold.cases.length, 300)
      for (const c of gold.cases) {
        assert.deepStrictEqual(toJson(Result.getOrThrow(readAll(fromHex(c.bytes), c.type))), c.value, c.id)
      }
    })

    it("writes the official library's bytes", () => {
      for (const c of gold.cases) {
        assert.strictEqual(toHex(write((w) => w.writeValue(fromJson(c.value)))), c.bytes, c.id)
      }
    })

    it("skips every value to its end", () => {
      for (const c of gold.cases) {
        const bytes = fromHex(c.bytes)
        const r = Thrift.makeReader(bytes)
        r.skip(Thrift.Type[c.type])
        assert.strictEqual(r.position, bytes.length, c.id)
      }
    })

    it("reads and writes structs cut from Parquet files", () => {
      assert.strictEqual(gold.parquet.length, 7)
      for (const c of gold.parquet) {
        const value = Result.getOrThrow(readAll(fromHex(c.bytes), "Struct"))
        assert.deepStrictEqual(toJson(value), c.value, c.id)
        assert.strictEqual(toHex(write((w) => w.writeValue(value))), c.bytes, c.id)
      }
    })
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
      Thrift.decode(bytes, (r) => {
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
      })
    const bloom = Result.getOrThrow(footer(fromHex(gold.parquet[0].bytes)))
    assert.strictEqual(bloom.numRows, 14)
    assert.deepStrictEqual(bloom.columns, ["String"])
    assert.deepStrictEqual(bloom.dataPageOffsets, [4])
    assert.match(bloom.createdBy, /^parquet-mr version 1\.13\.0-SNAPSHOT/)
    const tiny = Result.getOrThrow(footer(fromHex(gold.parquet[5].bytes)))
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

  describe("encoding", () => {
    // One example per rule of the compact protocol spec.
    const s = (...fields: Array<readonly [number, Thrift.Value]>): Thrift.Value => ({
      _tag: "Struct",
      fields: fields.map(([id, value]) => ({ id, value }))
    })
    const i32 = (value: number): Thrift.Value => ({ _tag: "I32", value })
    const table: ReadonlyArray<readonly [string, Thrift.Value, string]> = [
      ["a field id delta packs into the header", s([1, i32(1)], [3, i32(-1)]), "1502250100"],
      ["a delta over 15 uses the long form", s([16, i32(0)]), "05200000"],
      ["a decreasing id uses the long form", s([2, i32(0)], [1, i32(0)]), "250005020000"],
      [
        "a bool field's value is its header type",
        s([1, { _tag: "Bool", value: true }], [2, { _tag: "Bool", value: false }]),
        "111200"
      ],
      [
        "a nested struct counts ids from zero",
        s([5, s([1, i32(0)])], [6, i32(0)]),
        "5c150000150000"
      ],
      ["integers are zigzag varints", s([1, i32(-65)], [2, i32(64)]), "15810115800100"],
      ["i8 is a raw byte", { _tag: "I8", value: -1 }, "ff"],
      ["i64 is a zigzag varint", { _tag: "I64", value: BigInt(-1) << BigInt(63) }, "ffffffffffffffffff01"],
      ["double is little-endian", { _tag: "Double", value: 1 }, "000000000000f03f"],
      ["binary is a length and bytes", { _tag: "Binary", value: Uint8Array.of(0x61, 0x62) }, "026162"],
      ["a list of up to 14 packs its size", { _tag: "List", elementType: "I32", elements: [i32(1), i32(2)] }, "250204"],
      [
        "a list of 15 or more has a varint size",
        { _tag: "List", elementType: "I8", elements: Array.from({ length: 15 }, () => ({ _tag: "I8", value: 0 })) },
        "f30f" + "00".repeat(15)
      ],
      [
        "list bools are bytes 1 and 2",
        {
          _tag: "List",
          elementType: "Bool",
          elements: [{ _tag: "Bool", value: true }, { _tag: "Bool", value: false }]
        },
        "210102"
      ],
      ["an empty map is one byte", { _tag: "Map", keyType: "Stop", valueType: "Stop", entries: [] }, "00"],
      ["a map packs key and value types", {
        _tag: "Map",
        keyType: "I32",
        valueType: "I32",
        entries: [[i32(1), i32(2)]]
      }, "01550204"]
    ]
    for (const [name, value, hex] of table) {
      it(name, () => {
        assert.strictEqual(toHex(write((w) => w.writeValue(value))), hex)
        assert.deepStrictEqual(Result.getOrThrow(readAll(fromHex(hex), value._tag)), value)
      })
    }

    it("reads a bool list element type written as 2", () => {
      // Some writers use the FALSE code for the element type of list<bool>.
      const r = Thrift.makeReader(Uint8Array.of(0x12, 0x01))
      assert.strictEqual(r.readListBegin(), 1)
      assert.strictEqual(r.elementType, Thrift.Type.Bool)
      assert.isTrue(r.readBool())
    })
  })

  describe("scalars", () => {
    const roundTrip = <A>(writeOne: (w: Thrift.Writer, a: A) => void, readOne: (r: Thrift.Reader) => A, a: A) => {
      const bytes = write((w) => writeOne(w, a))
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
        assert.strictEqual(roundTrip((w, a) => w.writeI64(a), (r) => r.readI64(), n), n)
      }
    )

    it.prop("i64 round-trips as number", [Schema.Int], ([n]) => {
      assert.strictEqual(roundTrip((w, a) => w.writeI64Number(a), (r) => r.readI64Number(), n), n)
      assert.strictEqual(roundTrip<number | bigint>((w) => w.writeI64Number(n), (r) => r.readI64(), n), BigInt(n))
    })

    it.prop(
      "i32 round-trips",
      [Schema.Int.check(Schema.isBetween({ minimum: -(2 ** 31), maximum: 2 ** 31 - 1 }))],
      ([n]) => {
        assert.strictEqual(roundTrip((w, a) => w.writeI32(a), (r) => r.readI32(), n), n)
      }
    )

    it.prop("double round-trips", [Schema.Number], ([n]) => {
      assert.isTrue(Object.is(roundTrip((w, a) => w.writeDouble(a), (r) => r.readDouble(), n), n))
    })

    it.prop("string round-trips through UTF-8", [Schema.String], ([s]) => {
      // Lone surrogates have no UTF-8 encoding and become U+FFFD.
      const expected = new TextDecoder().decode(new TextEncoder().encode(s))
      assert.strictEqual(roundTrip((w, a) => w.writeString(a), (r) => r.readString(), s), expected)
    })

    it.prop("binary round-trips", [Schema.Uint8Array], ([bytes]) => {
      assert.deepStrictEqual(roundTrip((w, a) => w.writeBinary(a), (r) => r.readBinary(), bytes), bytes)
    })

    it("reads i64 limits", () => {
      const max = BigInt(Number.MAX_SAFE_INTEGER)
      const bytesOf = (n: bigint) => write((w) => w.writeI64(n))
      const asNumber = (n: bigint) => Thrift.decode(bytesOf(n), (r) => r.readI64Number())
      assert.strictEqual(Result.getOrThrow(asNumber(max)), Number.MAX_SAFE_INTEGER)
      assert.strictEqual(Result.getOrThrow(asNumber(-max)), -Number.MAX_SAFE_INTEGER)
      assert.strictEqual(kindOf(asNumber(max + BigInt(1))), "Range")
      assert.strictEqual(kindOf(asNumber(-max - BigInt(1))), "Range")
      for (const n of [max, max + BigInt(1), -max - BigInt(1), -max - BigInt(2)]) {
        assert.strictEqual(Result.getOrThrow(Thrift.decode(bytesOf(n), (r) => r.readI64())), n)
      }
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

    it("reads lengths with a three-byte varint", () => {
      const value = new Uint8Array(20000).fill(7)
      const bytes = write((w) => w.writeBinary(value))
      assert.strictEqual(bytes.length, 3 + value.length)
      assert.deepStrictEqual(Thrift.makeReader(bytes).readBinary(), value)
    })
  })

  describe("malformed input", () => {
    const fails = (hex: string, read: (r: Thrift.Reader) => unknown, options?: Thrift.Options) =>
      kindOf(Thrift.decode(fromHex(hex), read, options))
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
      ["an unknown field type", "1e", struct, "Malformed"],
      ["an unknown list element type", "1e", (r) => r.readListBegin(), "Malformed"],
      ["a non-empty list of Stop", "10", (r) => r.readListBegin(), "Malformed"],
      ["a list larger than the input", "f5ffff03", (r) => r.readListBegin(), "Truncated"],
      ["a map larger than the input", "0355020406", (r) => r.readMapBegin(), "Truncated"],
      ["a binary longer than the input", "0561", (r) => r.readBinary(), "Truncated"],
      ["a string that isn't UTF-8", "02c328", (r) => r.readString(), "InvalidUtf8"],
      ["a long string that isn't UTF-8", "41" + "61".repeat(64) + "ff", (r) => r.readString(), "InvalidUtf8"],
      ["skipping Stop", "00", (r) => r.skip(Thrift.Type.Stop), "Malformed"],
      ["readStructEnd without readStructBegin", "", (r) => r.readStructEnd(), "Usage"],
      ["a position before the input", "00", (r) => r.position = -1, "Usage"],
      ["a position past the input", "00", (r) => r.position = 2, "Usage"],
      ["a binary over maxBinaryLength", "03616263", (r) => r.readBinary(), "Limit", { maxBinaryLength: 2 }],
      ["a skipped binary over maxBinaryLength", "1803616263", (r) => r.skip(Thrift.Type.Struct), "Limit", {
        maxBinaryLength: 2
      }],
      ["a list over maxContainerSize", "35010203", (r) => r.readListBegin(), "Limit", { maxContainerSize: 2 }],
      ["a struct over maxDepth", "1c1c000000", struct, "Limit", { maxDepth: 2 }],
      ["lists over maxDepth", "1919191500", (r) => r.skip(Thrift.Type.List), "Limit", { maxDepth: 2 }]
    ]
    for (const [name, hex, read, kind, options] of table) {
      it(name, () => assert.strictEqual(fails(hex, read, options), kind))
    }

    it("limits nesting to 64 by default", () => {
      const bytesOf = (depth: number) => write((w) => w.writeValue(nest(depth)))
      assert.isTrue(Result.isSuccess(readAll(bytesOf(64), "Struct")))
      assert.strictEqual(kindOf(readAll(bytesOf(65), "Struct")), "Limit")
      assert.strictEqual(kindOf(Thrift.decode(bytesOf(65), (r) => r.skip(Thrift.Type.Struct))), "Limit")
    })

    it("fails every truncated gold case", () => {
      for (const c of gold.cases) {
        const bytes = fromHex(c.bytes)
        for (let n = 0; n < bytes.length; n += Math.max(1, Math.floor(bytes.length / 16))) {
          assert.strictEqual(kindOf(readAll(bytes.subarray(0, n), c.type)), "Truncated", `${c.id} at ${n}`)
        }
      }
    })

    it("decode rethrows errors that aren't ThriftErrors", () => {
      assert.throws(() =>
        Thrift.decode(Uint8Array.of(0), () => {
          throw new Error("boom")
        }), "boom")
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
      for (const c of [...gold.cases, ...gold.parquet.map((p) => ({ ...p, type: "Struct" as const }))]) {
        const original = fromHex(c.bytes)
        for (let round = 0; round < 10; round++) {
          const bytes = original.slice()
          const flips = 1 + Math.floor(random() * 4)
          for (let i = 0; i < flips && bytes.length > 0; i++) {
            bytes[Math.floor(random() * bytes.length)] = Math.floor(random() * 256)
          }
          for (
            const read of [
              (r: Thrift.Reader) => r.readValue(Thrift.Type[c.type]),
              (r: Thrift.Reader) => r.skip(Thrift.Type[c.type])
            ]
          ) {
            try {
              read(Thrift.makeReader(bytes, { maxContainerSize: 1 << 16 }))
            } catch (error) {
              assert.isTrue(Thrift.isThriftError(error), `${c.id}: ${String(error)}`)
              failures++
            }
          }
        }
      }
      assert.isAbove(failures, 0)
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
      it(`rejects ${name}`, () => {
        try {
          f(Thrift.makeWriter())
          assert.fail("expected a ThriftError")
        } catch (error) {
          assert.isTrue(Thrift.isThriftError(error))
          assert.strictEqual((error as Thrift.ThriftError).kind, "Usage")
        }
      })
    }

    it("grows from a small buffer and returns a copy", () => {
      const w = Thrift.makeWriter({ initialSize: 1 })
      w.writeValue(fromJson(gold.cases.at(-1)!.value))
      const bytes = w.finish()
      assert.strictEqual(bytes.length, w.length)
      assert.strictEqual(bytes.byteOffset, 0)
      assert.strictEqual(bytes.buffer.byteLength, bytes.length)
    })
  })
})
