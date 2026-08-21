import { PgProtocol, PgTypes } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { bytes, rows } from "./fixtures/goldens.ts"

/** Extracts the single column of a captured `DataRow` golden. */
const column = (golden: string): Uint8Array => {
  const messages = PgProtocol.makeParser().push(bytes(golden))
  const row = messages[0] as PgProtocol.DataRow
  return row.values[0]!
}

const assertThrowsTagged = (tag: string, run: () => unknown) => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { _tag?: string })._tag, tag)
    return
  }
  assert.fail(`Expected ${tag} to be thrown`)
}

/** Every value below was produced by PostgreSQL for the encoded parameter. */
const roundTrips: Array<{
  readonly name: keyof typeof rows
  readonly oid: number
  readonly value: unknown
  /** Set when PostgreSQL normalises the value, so encode is checked separately. */
  readonly encoded?: unknown
}> = [
  { name: "bool", oid: PgTypes.OID.bool, value: true },
  { name: "int2", oid: PgTypes.OID.int2, value: -12345 },
  { name: "int4", oid: PgTypes.OID.int4, value: 2147483647 },
  { name: "int8Max", oid: PgTypes.OID.int8, value: BigInt("9223372036854775807") },
  { name: "int8Min", oid: PgTypes.OID.int8, value: BigInt("-9223372036854775808") },
  { name: "oid", oid: PgTypes.OID.oid, value: 4294967295 },
  { name: "float4", oid: PgTypes.OID.float4, value: 1.5 },
  { name: "float8", oid: PgTypes.OID.float8, value: -3.0625 },
  { name: "numeric", oid: PgTypes.OID.numeric, value: "12345.6789" },
  { name: "numericSmall", oid: PgTypes.OID.numeric, value: "0.0001" },
  { name: "numericNegative", oid: PgTypes.OID.numeric, value: "-98765432109876543210" },
  { name: "numericNaN", oid: PgTypes.OID.numeric, value: "NaN" },
  { name: "text", oid: PgTypes.OID.text, value: "héllo ☃" },
  { name: "varchar", oid: PgTypes.OID.varchar, value: "abc" },
  { name: "bpchar", oid: PgTypes.OID.bpchar, value: "xy" },
  { name: "name", oid: PgTypes.OID.name, value: "some_name" },
  { name: "bytea", oid: PgTypes.OID.bytea, value: new Uint8Array([0, 1, 254, 255]) },
  { name: "json", oid: PgTypes.OID.json, value: { a: [1, 2], b: null } },
  // jsonb text is reformatted by the server, so only decoding is byte-exact
  { name: "jsonb", oid: PgTypes.OID.jsonb, value: { a: [1, 2], b: null }, encoded: false },
  { name: "uuid", oid: PgTypes.OID.uuid, value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" },
  { name: "inet4", oid: PgTypes.OID.inet, value: "192.168.0.1" },
  { name: "inet4Masked", oid: PgTypes.OID.inet, value: "192.168.0.1/24" },
  { name: "inet6", oid: PgTypes.OID.inet, value: "2001:db8::1" },
  { name: "cidr", oid: PgTypes.OID.cidr, value: "10.0.0.0/8" },
  { name: "date", oid: PgTypes.OID.date, value: "2024-02-29" },
  { name: "dateInfinity", oid: PgTypes.OID.date, value: "infinity" },
  { name: "dateNegInfinity", oid: PgTypes.OID.date, value: "-infinity" },
  { name: "time", oid: PgTypes.OID.time, value: BigInt(45296000000) },
  { name: "timetz", oid: PgTypes.OID.timetz, value: "12:34:56+02:00" },
  { name: "timestamp", oid: PgTypes.OID.timestamp, value: 1717171717123 },
  { name: "timestampInfinity", oid: PgTypes.OID.timestamp, value: Number.POSITIVE_INFINITY },
  { name: "timestamptz", oid: PgTypes.OID.timestamptz, value: 1717171717123 },
  { name: "timestamptzNegInfinity", oid: PgTypes.OID.timestamptz, value: Number.NEGATIVE_INFINITY },
  { name: "int4ArrayWithNulls", oid: PgTypes.OID.int4Array, value: [1, null, -3] },
  { name: "textArrayEmpty", oid: PgTypes.OID.textArray, value: [] },
  { name: "timestamptzArray", oid: PgTypes.OID.timestamptzArray, value: [0, null, 1717171717000] }
]

describe("PgTypes", () => {
  describe("round trips against captured PostgreSQL rows", () => {
    for (const { encoded, name, oid, value } of roundTrips) {
      it(name, () => {
        const golden = column(rows[name])
        assert.deepStrictEqual(PgTypes.decode(golden, oid, 1), value)
        if (encoded !== false) {
          assert.deepStrictEqual(PgTypes.encode(value, oid), golden)
        }
        assert.deepStrictEqual(PgTypes.decode(PgTypes.encode(value, oid), oid, 1), value)
      })
    }
  })

  describe("arrays", () => {
    it("decodes a zero-dimension array as empty", () => {
      assert.deepStrictEqual(PgTypes.decode(column(rows.textArrayEmpty), PgTypes.OID.textArray, 1), [])
    })

    it("keeps nulls inside a 1-dimensional array", () => {
      assert.deepStrictEqual(
        PgTypes.decode(column(rows.int4ArrayWithNulls), PgTypes.OID.int4Array, 1),
        [1, null, -3]
      )
    })

    it("rejects arrays with more than one dimension", () => {
      // ndim 2, no nulls, int4 elements, dims 1x1, one element
      assertThrowsTagged(
        "PgTypesCodecError",
        () =>
          PgTypes.decode(
            bytes("000000020000000000000017000000010000000100000001000000010000000400000001"),
            PgTypes.OID.int4Array,
            1
          )
      )
    })

    it("rejects a truncated array element", () => {
      assertThrowsTagged(
        "PgTypesCodecError",
        () => PgTypes.decode(bytes("000000010000000000000017000000010000000100000004000000"), PgTypes.OID.int4Array, 1)
      )
    })

    it("rejects an array element length below the NULL sentinel", () => {
      assertThrowsTagged(
        "PgTypesCodecError",
        () => PgTypes.decode(bytes("0000000100000000000000110000000100000001fffffffe"), PgTypes.OID.byteaArray, 1)
      )
    })

    it("rejects an array whose lower bound is not one", () => {
      assertThrowsTagged(
        "PgTypesCodecError",
        () =>
          PgTypes.decode(
            bytes("0000000100000000000000170000000300000000000000040000000100000004000000020000000400000003"),
            PgTypes.OID.int4Array,
            1
          )
      )
    })
  })

  describe("errors", () => {
    it("rejects the text format", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.decode(bytes("31"), PgTypes.OID.int4, 0))
    })

    it("rejects a value of the wrong JavaScript type", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("1", PgTypes.OID.int4))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(1, PgTypes.OID.int8))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(1, PgTypes.OID.text))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode([1], PgTypes.OID.bytea))
    })

    it("rejects integers outside their range", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(32768, PgTypes.OID.int2))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(1.5, PgTypes.OID.int4))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(-1, PgTypes.OID.oid))
      assertThrowsTagged(
        "PgTypesCodecError",
        () => PgTypes.encode(BigInt("9223372036854775808"), PgTypes.OID.int8)
      )
    })

    it("rejects NaN timestamps", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(Number.NaN, PgTypes.OID.timestamptz))
    })

    it("rejects timestamps outside the PostgreSQL int64 range", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(1e300, PgTypes.OID.timestamptz))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(-1e300, PgTypes.OID.timestamp))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(Number.MAX_VALUE, PgTypes.OID.timestamp))
    })

    it("rejects malformed dates and uuids", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("2024-2-9", PgTypes.OID.date))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("2023-02-31", PgTypes.OID.date))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("2023-04-31", PgTypes.OID.date))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("not-a-uuid", PgTypes.OID.uuid))
    })

    it("rejects finite dates outside the PostgreSQL wire range or on its infinity sentinels", () => {
      for (const value of ["5881610-07-11", "-5877611-06-22", "999999999-12-31", "-999999999-01-01"]) {
        assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode(value, PgTypes.OID.date))
      }
    })

    it("rejects host bits outside a cidr netmask", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("10.1.2.3/8", PgTypes.OID.cidr))
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("2001:db8::1/32", PgTypes.OID.cidr))
    })

    it("rejects a value the wrong size for its OID", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.decode(bytes("0001"), PgTypes.OID.int4, 1))
    })
  })

  describe("unknown OIDs", () => {
    it("decodes to the raw bytes", () => {
      assert.deepStrictEqual(PgTypes.decode(bytes("00ff"), 99999, 1), bytes("00ff"))
    })

    it("fails to encode until a codec is registered", () => {
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("x", 99999))
      PgTypes.register<string>(99999, {
        encode: (value) => new TextEncoder().encode(value.toUpperCase()),
        decode: (value) => new TextDecoder().decode(value).toLowerCase()
      })
      try {
        assert.deepStrictEqual(PgTypes.encode("ab", 99999), bytes("4142"))
        assert.strictEqual(PgTypes.decode(bytes("4142"), 99999, 1), "ab")
      } finally {
        PgTypes.unregister(99999)
      }
      assertThrowsTagged("PgTypesCodecError", () => PgTypes.encode("x", 99999))
    })
  })

  describe("numeric", () => {
    it("round trips values with only a fractional part", () => {
      for (const value of ["0", "0.00", "1", "-1", "0.5", "1000000", "0.000000001", "1e3", "12345678901234567890"]) {
        const expected = value === "1e3" ? "1000" : value
        assert.strictEqual(
          PgTypes.decode(PgTypes.encode(value, PgTypes.OID.numeric), PgTypes.OID.numeric, 1),
          expected
        )
      }
    })

    it("round trips the special values", () => {
      for (const value of ["NaN", "Infinity", "-Infinity"]) {
        assert.strictEqual(
          PgTypes.decode(PgTypes.encode(value, PgTypes.OID.numeric), PgTypes.OID.numeric, 1),
          value
        )
      }
    })
  })

  describe("timestamps", () => {
    it("truncates sub-millisecond values toward zero on both sides of the PostgreSQL epoch", () => {
      const before = new Uint8Array(8)
      const after = new Uint8Array(8)
      new DataView(before.buffer).setBigInt64(0, BigInt(-1))
      new DataView(after.buffer).setBigInt64(0, BigInt(1))
      assert.strictEqual(PgTypes.decode(before, PgTypes.OID.timestamp, 1), 946684800000)
      assert.strictEqual(PgTypes.decode(after, PgTypes.OID.timestamp, 1), 946684800000)
    })
  })

  describe("parameters", () => {
    it("copies bytea values when encoding", () => {
      const source = bytes("010203")
      const encoded = PgTypes.encode(source, PgTypes.OID.bytea)
      assert.notStrictEqual(encoded, source)
      source[0] = 0xff
      assert.deepStrictEqual(encoded, bytes("010203"))
    })

    it("carries the OID with the value", () => {
      assert.deepStrictEqual(PgTypes.int4(1), { oid: PgTypes.OID.int4, value: 1 })
      assert.deepStrictEqual(PgTypes.timestamptz(0), { oid: PgTypes.OID.timestamptz, value: 0 })
      assert.deepStrictEqual(PgTypes.array([1, null], PgTypes.OID.int4), {
        oid: PgTypes.OID.int4Array,
        value: [1, null]
      })
    })

    it("encodes SQL NULL as null", () => {
      assert.strictEqual(PgTypes.encodeParameter(PgTypes.int4(null)), null)
      assert.deepStrictEqual(PgTypes.encodeParameter(PgTypes.int4(1)), bytes("00000001"))
    })

    it("encodes strings past the ASCII fast path", () => {
      const encoder = new TextEncoder()
      // longer than the scratch buffer the encoder writes through
      for (const value of ["abc", "é", "x".repeat(200), "héllo ☃ 👋🏽", "y".repeat(70_000)]) {
        assert.deepStrictEqual(PgTypes.encode(value, PgTypes.OID.text), encoder.encode(value))
        assert.strictEqual(PgTypes.decode(PgTypes.encode(value, PgTypes.OID.text), PgTypes.OID.text, 1), value)
        const jsonb = PgTypes.encode(value, PgTypes.OID.jsonb)
        assert.strictEqual(jsonb[0], 1)
        assert.deepStrictEqual(jsonb.subarray(1), encoder.encode(JSON.stringify(value)))
      }
    })

    it("writes every builtin parameter as the bytes encode produces", () => {
      const encodeBind = PgProtocol.makeBindEncoder(PgTypes.writeParameter)
      const parameters = [
        ...roundTrips.map(({ oid, value }) => ({ oid, value })),
        { oid: PgTypes.OID.int4, value: null },
        { oid: PgTypes.OID.textArray, value: null }
      ]
      assert.deepStrictEqual(
        encodeBind({ portal: "p1", statement: "s1", parameters }),
        PgProtocol.encodeBind({
          portal: "p1",
          statement: "s1",
          parameters: parameters.map(PgTypes.encodeParameter)
        })
      )
    })

    it("writes a registered codec through encode when it has no writer", () => {
      const encodeBind = PgProtocol.makeBindEncoder(PgTypes.writeParameter)
      const parameters = [{ oid: 99999, value: "ab" }]
      assertThrowsTagged("PgTypesCodecError", () => encodeBind({ portal: "", statement: "", parameters }))
      PgTypes.register<string>(99999, {
        encode: (value) => new TextEncoder().encode(value.toUpperCase()),
        decode: (value) => new TextDecoder().decode(value).toLowerCase()
      })
      try {
        assert.deepStrictEqual(
          encodeBind({ portal: "", statement: "", parameters }),
          PgProtocol.encodeBind({ portal: "", statement: "", parameters: parameters.map(PgTypes.encodeParameter) })
        )
      } finally {
        PgTypes.unregister(99999)
      }
    })

    it("keeps a bytea frame intact when the source is mutated afterwards", () => {
      const encodeBind = PgProtocol.makeBindEncoder(PgTypes.writeParameter)
      const source = bytes("010203")
      const encoded = encodeBind({ portal: "", statement: "", parameters: [PgTypes.bytea(source)] })
      source[0] = 0xff
      // the frame ends with the four bytes of the result format code
      assert.deepStrictEqual(encoded.slice(-7, -4), bytes("010203"))
    })

    it("maps element OIDs to array OIDs", () => {
      assert.strictEqual(PgTypes.arrayOidFor(PgTypes.OID.text), PgTypes.OID.textArray)
      assert.strictEqual(PgTypes.arrayOidFor(99999), undefined)
    })
  })
})
