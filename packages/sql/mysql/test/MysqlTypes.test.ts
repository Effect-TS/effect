import { MysqlProtocol, MysqlTypes } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"

/**
 * Decoding driven straight from bytes, with no server involved. The
 * integration suite proves the mapping agrees with MySQL; this one covers the
 * edges a server will not readily produce - boundary values, unsigned wrap,
 * truncated fields - and costs no container to do it.
 */

const column = (overrides: Partial<MysqlProtocol.Column> = {}): MysqlProtocol.Column => ({
  schema: "test",
  table: "t",
  orgTable: "t",
  name: "c",
  orgName: "c",
  collation: MysqlProtocol.defaultCollation,
  columnLength: 255,
  type: MysqlProtocol.ColumnType.varString,
  flags: MysqlProtocol.ColumnFlags.none,
  decimals: 0,
  ...overrides
})

const unsigned = (type: number, decimals = 0): MysqlProtocol.Column =>
  column({ type, decimals, flags: MysqlProtocol.ColumnFlags.of([MysqlProtocol.ColumnFlag.unsigned]) })

const binaryColumn = (type: number): MysqlProtocol.Column => column({ type, collation: MysqlProtocol.binaryCollation })

/** Decodes one text-protocol field, which arrives as the value's digits. */
const text = (
  col: MysqlProtocol.Column,
  value: string,
  options: MysqlTypes.DecodeOptions = {}
): unknown => {
  const bytes = new TextEncoder().encode(value)
  return MysqlTypes.makeTextFieldReader([col], options)(bytes, 0, bytes.length, 0)
}

/** Decodes one binary-protocol field from its exact bytes. */
const binary = (
  col: MysqlProtocol.Column,
  bytes: ReadonlyArray<number>,
  options: MysqlTypes.DecodeOptions = {}
): unknown => {
  const buffer = new Uint8Array(bytes)
  // A binary reader returns the value with the offset just past it, because
  // fields are packed back to back with no length prefix of their own.
  return MysqlTypes.makeBinaryFieldReader([col], options)(buffer, 0, buffer.length, 0)[0]
}

const T = MysqlProtocol.ColumnType

describe("MysqlTypes", () => {
  describe("integers", () => {
    it("decodes the signed boundaries", () => {
      assert.strictEqual(text(column({ type: T.tiny }), "-128"), -128)
      assert.strictEqual(text(column({ type: T.tiny }), "127"), 127)
      assert.strictEqual(text(column({ type: T.long }), "-2147483648"), -2147483648)
      assert.strictEqual(text(column({ type: T.long }), "2147483647"), 2147483647)
    })

    it("reads unsigned columns as unsigned rather than wrapping negative", () => {
      // The same byte is 255 unsigned and -1 signed; only the column flag says which.
      assert.strictEqual(binary(unsigned(T.tiny), [0xff]), 255)
      assert.strictEqual(binary(column({ type: T.tiny }), [0xff]), -1)
      assert.strictEqual(binary(unsigned(T.short), [0xff, 0xff]), 65535)
      assert.strictEqual(binary(column({ type: T.short }), [0xff, 0xff]), -1)
      assert.strictEqual(binary(unsigned(T.long), [0xff, 0xff, 0xff, 0xff]), 4294967295)
      assert.strictEqual(binary(column({ type: T.long }), [0xff, 0xff, 0xff, 0xff]), -1)
    })

    it("keeps BIGINT exact past 2^53", () => {
      // 9007199254740993 is the first odd integer a double cannot hold.
      assert.strictEqual(text(column({ type: T.longlong }), "9007199254740993"), BigInt("9007199254740993"))
      assert.strictEqual(
        text(unsigned(T.longlong), "18446744073709551615"),
        BigInt("18446744073709551615")
      )
      assert.strictEqual(
        binary(unsigned(T.longlong), [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        BigInt("18446744073709551615")
      )
      assert.strictEqual(
        binary(column({ type: T.longlong }), [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        BigInt("-1")
      )
    })

    it("gives up exactness for a number when asked", () => {
      const options = { bigintAsNumber: true }
      assert.strictEqual(text(column({ type: T.longlong }), "42", options), 42)
      assert.strictEqual(binary(column({ type: T.longlong }), [1, 0, 0, 0, 0, 0, 0, 0], options), 1)
    })

    it("does not turn TINYINT(1) into a boolean", () => {
      // MySQL has no boolean, and a caller reading a TINYINT column should not
      // have to guess whether its width changed the type.
      assert.strictEqual(text(column({ type: T.tiny, columnLength: 1 }), "1"), 1)
      assert.strictEqual(text(column({ type: T.tiny, columnLength: 1 }), "0"), 0)
    })
  })

  describe("decimals and floats", () => {
    it("keeps DECIMAL as its digits rather than rounding through a double", () => {
      const value = "12345678901234567890.12345678901234567890"
      assert.strictEqual(text(column({ type: T.newdecimal }), value), value)
      assert.strictEqual(text(column({ type: T.decimal }), "0.1"), "0.1")
    })

    it("decodes FLOAT and DOUBLE from their IEEE bytes", () => {
      assert.strictEqual(binary(column({ type: T.double }), [0, 0, 0, 0, 0, 0, 0xf0, 0x3f]), 1)
      assert.strictEqual(binary(column({ type: T.float }), [0, 0, 0x80, 0x3f]), 1)
    })
  })

  describe("temporal", () => {
    it("decodes DATE as a plain string, with no zone invented", () => {
      assert.strictEqual(text(column({ type: T.date }), "2024-01-02"), "2024-01-02")
      assert.strictEqual(binary(column({ type: T.date }), [4, 0xe8, 0x07, 1, 2]), "2024-01-02")
    })

    it("decodes DATETIME as epoch milliseconds", () => {
      assert.strictEqual(
        text(column({ type: T.datetime }), "2024-01-02 03:04:05"),
        Date.UTC(2024, 0, 2, 3, 4, 5)
      )
    })

    it("decodes TIME as signed microseconds, because it is a duration", () => {
      // MySQL TIME spans -838:59:59 to 838:59:59, so it is not a clock reading
      // and can be negative.
      assert.strictEqual(text(column({ type: T.time }), "01:02:03"), BigInt(3723) * BigInt(1000000))
      assert.strictEqual(text(column({ type: T.time }), "-01:02:03"), -BigInt(3723) * BigInt(1000000))
      assert.strictEqual(text(column({ type: T.time }), "838:59:59"), BigInt(3020399) * BigInt(1000000))
    })

    it("renders dateStrings to the column's declared precision", () => {
      // The binary form omits the microseconds field when the value has none,
      // so the trailing zeroes can only come from the column.
      const wholeSecond = [7, 0xe8, 0x07, 1, 2, 3, 4, 5]
      assert.strictEqual(
        binary(column({ type: T.datetime, decimals: 6 }), wholeSecond, { dateStrings: true }),
        "2024-01-02 03:04:05.000000"
      )
      assert.strictEqual(
        binary(column({ type: T.datetime, decimals: 0 }), wholeSecond, { dateStrings: true }),
        "2024-01-02 03:04:05"
      )
      assert.strictEqual(
        binary(column({ type: T.datetime, decimals: 3 }), [11, 0xe8, 0x07, 1, 2, 3, 4, 5, 0x40, 0xe2, 1, 0], {
          dateStrings: true
        }),
        "2024-01-02 03:04:05.123"
      )
    })

    it("decodes MySQL's zero date without throwing, though it has no real epoch", () => {
      // '0000-00-00 00:00:00' is a value MySQL accepts and no calendar has.
      // It decodes rather than failing the row; callers who allow zero dates
      // want `dateStrings` so they can see it for what it is.
      assert.isNumber(binary(column({ type: T.datetime }), [0]))
      assert.strictEqual(
        binary(column({ type: T.datetime }), [0], { dateStrings: true }),
        "0000-00-00 00:00:00"
      )
    })
  })

  describe("text and bytes", () => {
    it("tells BLOB from TEXT by the collation, not the type byte", () => {
      // They share a type byte; only the binary collation separates them.
      assert.strictEqual(text(column({ type: T.blob }), "hello"), "hello")
      assert.deepStrictEqual(
        text(binaryColumn(T.blob), "hi"),
        new Uint8Array([0x68, 0x69])
      )
      assert.deepStrictEqual(
        text(binaryColumn(T.varString), "hi"),
        new Uint8Array([0x68, 0x69])
      )
    })

    it("decodes multi-byte UTF-8 correctly at and past the ASCII fast path", () => {
      // Short values take a per-character loop and longer ones TextDecoder, so
      // both sides of that threshold need to agree.
      assert.strictEqual(text(column(), "héllo"), "héllo")
      assert.strictEqual(text(column(), "日本語のテキストです"), "日本語のテキストです")
      assert.strictEqual(text(column(), "🎉"), "🎉")
    })

    it("parses JSON, which MySQL sends as text even though it stores binary", () => {
      assert.deepStrictEqual(text(column({ type: T.json }), `{"a":[1,2]}`), { a: [1, 2] })
    })

    it("decodes BIT as a bigint", () => {
      assert.strictEqual(binary(column({ type: T.bit }), [2, 0x01, 0x00]), BigInt(256))
      assert.strictEqual(binary(column({ type: T.bit }), [1, 0x05]), BigInt(5))
    })

    it("hands back GEOMETRY as raw bytes", () => {
      assert.deepStrictEqual(binary(binaryColumn(T.geometry), [2, 0xaa, 0xbb]), new Uint8Array([0xaa, 0xbb]))
    })
  })

  describe("NULL", () => {
    it("reads a text field of size -1 as NULL", () => {
      // The text protocol marks NULL with 0xfb, which the row reader turns
      // into a size of -1 before the field reader sees it.
      assert.strictEqual(MysqlTypes.makeTextFieldReader([column()])(new Uint8Array(), 0, -1, 0), null)
    })
  })

  describe("rejecting malformed values", () => {
    it("fails rather than inventing a value for a truncated field", () => {
      // A binary DOUBLE needs eight bytes; four is a desync, not a zero.
      assert.throws(() => binary(column({ type: T.double }), [0, 0, 0, 0]))
      assert.throws(() => binary(column({ type: T.longlong }), [1, 2, 3]))
    })

    it("fails on invalid UTF-8 rather than substituting replacement characters", () => {
      const invalid = new Uint8Array([0xff, 0xfe, 0xfd])
      assert.throws(() => MysqlTypes.makeTextFieldReader([column()])(invalid, 0, invalid.length, 0))
    })

    it("fails on malformed JSON", () => {
      assert.throws(() => text(column({ type: T.json }), "{not json"))
    })
  })

  describe("parameter binding", () => {
    const typeOf = (value: unknown): number => MysqlTypes.bindParameter(value).type

    it("infers a type from the JavaScript value", () => {
      assert.strictEqual(typeOf(true), T.tiny)
      assert.strictEqual(typeOf(1), T.long)
      assert.strictEqual(typeOf(2147483648), T.longlong)
      assert.strictEqual(typeOf(1.5), T.double)
      assert.strictEqual(typeOf(BigInt(1)), T.longlong)
      assert.strictEqual(typeOf("a"), T.varString)
      assert.strictEqual(typeOf(new Uint8Array([1])), T.blob)
      assert.strictEqual(typeOf(new Date()), T.datetime)
    })

    it("binds null and undefined alike, since both mean SQL NULL", () => {
      assert.strictEqual(typeOf(null), T.null)
      assert.strictEqual(typeOf(undefined), T.null)
      assert.strictEqual(MysqlTypes.bindParameter(null).write, undefined)
    })

    it("marks a bigint above the signed maximum as unsigned", () => {
      assert.isTrue(MysqlTypes.bindParameter(BigInt("18446744073709551615")).unsigned)
      assert.isFalse(MysqlTypes.bindParameter(BigInt(1)).unsigned)
    })
  })
})
