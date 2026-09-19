import { MysqlProtocol } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"

const hex = (value: Uint8Array): string => Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")

const bytes = (value: string): Uint8Array => {
  const out = new Uint8Array(value.length / 2)
  for (let index = 0; index < out.length; index++) {
    out[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return out
}

const success = <A, E>(result: Result.Result<A, E>): A => {
  assert.isTrue(Result.isSuccess(result), "expected a success")
  return (result as Result.Success<A, E>).success
}

const failure = <A, E>(result: Result.Result<A, E>): E => {
  assert.isTrue(Result.isFailure(result), "expected a failure")
  return (result as Result.Failure<A, E>).failure
}

const write = (
  run: Parameters<typeof MysqlProtocol.encodeWith>[0]
): Uint8Array => success(MysqlProtocol.encodeWith(run))

const assertThrowsTagged = (tag: string, run: () => unknown): void => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { readonly _tag?: string })._tag, tag)
    return
  }
  assert.fail(`Expected ${tag}`)
}

describe("MysqlProtocol", () => {
  describe("framing", () => {
    it("writes a three-byte little-endian length and a sequence id", () => {
      assert.strictEqual(hex(MysqlProtocol.frame(bytes("aabbcc"), 7)), "03000007aabbcc")
    })

    it("frames an empty payload", () => {
      assert.strictEqual(hex(MysqlProtocol.frame(new Uint8Array(0), 0)), "00000000")
    })

    it("round-trips a payload through the parser", () => {
      const parser = MysqlProtocol.makeParser()
      const packets = parser.push(MysqlProtocol.frame(bytes("0102030405"), 0))
      assert.strictEqual(packets.length, 1)
      assert.strictEqual(packets[0].sequenceId, 0)
      assert.strictEqual(hex(packets[0].payload), "0102030405")
    })

    it("reads several packets from one chunk", () => {
      const parser = MysqlProtocol.makeParser()
      const chunk = new Uint8Array([
        ...MysqlProtocol.frame(bytes("aa"), 0),
        ...MysqlProtocol.frame(bytes("bbbb"), 1),
        ...MysqlProtocol.frame(bytes("cc"), 2)
      ])
      const packets = parser.push(chunk)
      assert.deepStrictEqual(packets.map((packet) => hex(packet.payload)), ["aa", "bbbb", "cc"])
      assert.deepStrictEqual(packets.map((packet) => packet.sequenceId), [0, 1, 2])
    })

    it("reassembles a packet fed one byte at a time", () => {
      const parser = MysqlProtocol.makeParser()
      const framed = MysqlProtocol.frame(bytes("deadbeefcafe"), 0)
      const seen: Array<string> = []
      for (const byte of framed) {
        for (const packet of parser.push(new Uint8Array([byte]))) seen.push(hex(packet.payload))
      }
      assert.deepStrictEqual(seen, ["deadbeefcafe"])
    })

    it("holds back a partial packet", () => {
      const parser = MysqlProtocol.makeParser()
      const framed = MysqlProtocol.frame(bytes("0102030405"), 0)
      assert.strictEqual(parser.push(framed.subarray(0, 6)).length, 0)
      const packets = parser.push(framed.subarray(6))
      assert.strictEqual(packets.length, 1)
      assert.strictEqual(hex(packets[0].payload), "0102030405")
    })

    it("rejects an out-of-order sequence id", () => {
      const parser = MysqlProtocol.makeParser()
      assertThrowsTagged(
        "MysqlProtocolParseError",
        () => parser.push(MysqlProtocol.frame(bytes("aa"), 3))
      )
    })

    it("starts from an explicit sequence id", () => {
      const parser = MysqlProtocol.makeParser({ expectedSequenceId: 1 })
      const packets = parser.push(MysqlProtocol.frame(bytes("aa"), 1))
      assert.strictEqual(packets.length, 1)
      assert.strictEqual(parser.expectedSequenceId, 2)
    })

    it("wraps the sequence id at 256", () => {
      const parser = MysqlProtocol.makeParser({ expectedSequenceId: 255 })
      parser.push(MysqlProtocol.frame(bytes("aa"), 255))
      assert.strictEqual(parser.expectedSequenceId, 0)
    })

    it("cannot be reused after a failure", () => {
      const parser = MysqlProtocol.makeParser()
      assertThrowsTagged("MysqlProtocolParseError", () => parser.push(MysqlProtocol.frame(bytes("aa"), 9)))
      assertThrowsTagged("MysqlProtocolParseError", () => parser.push(MysqlProtocol.frame(bytes("aa"), 0)))
    })

    it("splits and rejoins a payload of exactly the maximum size", () => {
      const payload = new Uint8Array(MysqlProtocol.maxPacketPayload)
      payload[0] = 0x41
      payload[payload.length - 1] = 0x5a
      const framed = MysqlProtocol.frame(payload, 0)
      // One full packet plus an empty terminator, so the server can tell a split
      // message from a complete one.
      assert.strictEqual(framed.length, MysqlProtocol.maxPacketPayload + MysqlProtocol.packetHeaderSize * 2)
      const packets = MysqlProtocol.makeParser().push(framed)
      assert.strictEqual(packets.length, 1)
      assert.strictEqual(packets[0].payload.length, MysqlProtocol.maxPacketPayload)
      assert.strictEqual(packets[0].payload[0], 0x41)
      assert.strictEqual(packets[0].payload[packets[0].payload.length - 1], 0x5a)
    })

    it("rejoins a payload that straddles the maximum size", () => {
      const payload = new Uint8Array(MysqlProtocol.maxPacketPayload + 5)
      payload.fill(0x2a)
      payload[payload.length - 1] = 0x7f
      const packets = MysqlProtocol.makeParser().push(MysqlProtocol.frame(payload, 0))
      assert.strictEqual(packets.length, 1)
      assert.strictEqual(packets[0].payload.length, payload.length)
      assert.strictEqual(packets[0].payload[payload.length - 1], 0x7f)
    })

    it("refuses a joined message above maxMessageSize", () => {
      const payload = new Uint8Array(MysqlProtocol.maxPacketPayload + 1)
      const parser = MysqlProtocol.makeParser({ maxMessageSize: 1024 })
      assertThrowsTagged("MysqlProtocolParseError", () => parser.push(MysqlProtocol.frame(payload, 0)))
    })
  })

  describe("length-encoded values", () => {
    it("writes each integer width", () => {
      assert.strictEqual(hex(write((w) => w.lenencInt(250))), "fa")
      assert.strictEqual(hex(write((w) => w.lenencInt(251))), "fcfb00")
      assert.strictEqual(hex(write((w) => w.lenencInt(0xffff))), "fcffff")
      assert.strictEqual(hex(write((w) => w.lenencInt(0x10000))), "fd000001")
      assert.strictEqual(hex(write((w) => w.lenencInt(0xffffff))), "fdffffff")
      assert.strictEqual(hex(write((w) => w.lenencInt(0x1000000))), "fe0000000100000000")
    })

    it("keeps precision above the safe integer range", () => {
      const value = 2n ** 63n + 1n
      assert.strictEqual(hex(write((w) => w.lenencInt(value))), "fe0100000000000080")
    })

    it("refuses a negative length", () => {
      assert.strictEqual(failure(MysqlProtocol.encodeWith((w) => w.lenencInt(-1)))._tag, "MysqlProtocolEncodeError")
    })

    it("writes a length-encoded string by byte length, not code units", () => {
      assert.strictEqual(hex(write((w) => w.lenencString("é"))), "02c3a9")
    })
  })

  describe("decodeResponse", () => {
    it("reads an OK packet", () => {
      const response = success(MysqlProtocol.decodeResponse(bytes("00010302000000")))
      assert.strictEqual(response._tag, "Ok")
      if (response._tag === "Ok") assert.strictEqual(response.ok.affectedRows, 1)
    })

    it("reads an ERR packet", () => {
      const response = success(MysqlProtocol.decodeResponse(bytes("ff1504")))
      assert.strictEqual(response._tag, "Error")
    })

    it("reads a result-set header and its column count", () => {
      const response = success(MysqlProtocol.decodeResponse(bytes("03")))
      assert.strictEqual(response._tag, "ResultSet")
      if (response._tag === "ResultSet") assert.strictEqual(response.columnCount, 3)
    })

    it("reads a LOCAL INFILE request, which is only meaningful here", () => {
      assert.strictEqual(success(MysqlProtocol.decodeResponse(bytes("fb2f746d702f78")))._tag, "LocalInfile")
    })

    it("reads the short 0xfe packet as an OK", () => {
      assert.strictEqual(success(MysqlProtocol.decodeResponse(bytes("fe000002000000")))._tag, "Ok")
    })
  })

  describe("decodeRow", () => {
    it("reads a row", () => {
      const row = success(MysqlProtocol.decodeRow(write((w) => w.lenencString("alice"))))
      assert.strictEqual(row._tag, "Row")
    })

    it("reads a row whose first column is an empty string, not an OK packet", () => {
      // 0x00 followed by enough bytes to look like an OK packet in the
      // response position.
      const payload = write((w) => {
        w.lenencString("")
        w.lenencString("aaaaaaaa")
      })
      assert.isAtLeast(payload.length, 7)
      assert.strictEqual(success(MysqlProtocol.decodeRow(payload))._tag, "Row")
    })

    it("reads a row whose first column is NULL, not a LOCAL INFILE request", () => {
      const payload = write((w) => {
        w.uint8(0xfb)
        w.lenencString("value")
      })
      assert.strictEqual(success(MysqlProtocol.decodeRow(payload))._tag, "Row")
    })

    it("reads the terminator", () => {
      const end = success(MysqlProtocol.decodeRow(bytes("fe000002000000")))
      assert.strictEqual(end._tag, "End")
      if (end._tag === "End") {
        assert.isTrue(
          MysqlProtocol.ServerStatus.has(end.ok.statusFlags, MysqlProtocol.ServerStatusFlag.autocommit)
        )
      }
    })

    it("reads an error", () => {
      assert.strictEqual(success(MysqlProtocol.decodeRow(bytes("ff1504")))._tag, "Error")
    })

    it("treats a long 0xfe payload as a row, because 0xfe also prefixes a length", () => {
      assert.strictEqual(success(MysqlProtocol.decodeRow(bytes("fe00000000000000ff")))._tag, "Row")
    })
  })

  describe("decoding", () => {
    it("decodes an OK packet", () => {
      const ok = success(MysqlProtocol.decodeOk(bytes("00010302000000")))
      assert.strictEqual(ok.affectedRows, 1)
      assert.strictEqual(ok.lastInsertId, 3)
      assert.strictEqual(ok.statusFlags, 2)
      assert.strictEqual(ok.warnings, 0)
      assert.strictEqual(ok.info, "")
    })

    it("decodes the 0xfe OK packet that replaces EOF", () => {
      const ok = success(MysqlProtocol.decodeOk(bytes("fe000002000000")))
      assert.strictEqual(ok.affectedRows, 0)
      assert.strictEqual(ok.statusFlags, 2)
    })

    it("decodes trailing info", () => {
      const payload = write((w) => {
        w.uint8(0x00)
        w.lenencInt(0)
        w.lenencInt(0)
        w.uint16(2)
        w.uint16(0)
        w.utf8("Records: 3")
      })
      assert.strictEqual(success(MysqlProtocol.decodeOk(payload)).info, "Records: 3")
    })

    it("decodes an ERR packet with a SQL state", () => {
      const payload = write((w) => {
        w.uint8(0xff)
        w.uint16(1062)
        w.uint8(0x23)
        w.utf8("23000")
        w.utf8("Duplicate entry 'a' for key 'users.email'")
      })
      const err = success(MysqlProtocol.decodeErr(payload))
      assert.strictEqual(err.code, 1062)
      assert.strictEqual(err.sqlState, "23000")
      assert.strictEqual(err.message, "Duplicate entry 'a' for key 'users.email'")
    })

    it("decodes an ERR packet sent before capabilities are agreed", () => {
      const payload = write((w) => {
        w.uint8(0xff)
        w.uint16(1040)
        w.utf8("Too many connections")
      })
      const err = success(MysqlProtocol.decodeErr(payload))
      assert.strictEqual(err.code, 1040)
      assert.strictEqual(err.sqlState, undefined)
      assert.strictEqual(err.message, "Too many connections")
    })

    it("decodes a legacy EOF packet", () => {
      const eof = success(MysqlProtocol.decodeEof(bytes("fe00000200")))
      assert.strictEqual(eof.warnings, 0)
      assert.strictEqual(eof.statusFlags, 2)
    })

    it("decodes a column definition", () => {
      const payload = write((w) => {
        w.lenencString("def")
        w.lenencString("effect")
        w.lenencString("users")
        w.lenencString("users")
        w.lenencString("email")
        w.lenencString("email")
        w.lenencInt(0x0c)
        w.uint16(MysqlProtocol.defaultCollation)
        w.uint32(1020)
        w.uint8(MysqlProtocol.ColumnType.varString)
        w.uint16(MysqlProtocol.ColumnFlag.notNull)
        w.uint8(0)
        w.fill(0, 2)
      })
      const column = success(MysqlProtocol.decodeColumn(payload))
      assert.strictEqual(column.schema, "effect")
      assert.strictEqual(column.table, "users")
      assert.strictEqual(column.name, "email")
      assert.strictEqual(column.type, MysqlProtocol.ColumnType.varString)
      assert.strictEqual(column.columnLength, 1020)
      assert.isTrue(MysqlProtocol.ColumnFlags.has(column.flags, MysqlProtocol.ColumnFlag.notNull))
    })
  })

  describe("decodeTextRow", () => {
    const row = (payload: Uint8Array, columns: number) =>
      MysqlProtocol.decodeTextRow(payload, columns, MysqlProtocol.readFieldString)

    it("decodes fields and NULLs", () => {
      const payload = write((w) => {
        w.lenencString("alice")
        w.uint8(0xfb)
        w.lenencString("30")
      })
      assert.deepStrictEqual(success(row(payload, 3)), ["alice", null, "30"])
    })

    it("decodes a field longer than 250 bytes", () => {
      const long = "x".repeat(300)
      const payload = write((w) => w.lenencString(long))
      assert.deepStrictEqual(success(row(payload, 1)), [long])
    })

    it("decodes an empty field", () => {
      const payload = write((w) => w.lenencString(""))
      assert.deepStrictEqual(success(row(payload, 1)), [""])
    })

    it("fails when a field claims more bytes than the row holds", () => {
      assert.strictEqual(failure(row(bytes("0561626364"), 1))._tag, "MysqlProtocolParseError")
    })

    it("fails when the row has trailing bytes", () => {
      const payload = write((w) => {
        w.lenencString("a")
        w.lenencString("b")
      })
      assert.strictEqual(failure(row(payload, 1))._tag, "MysqlProtocolParseError")
    })

    it("fails when the row runs out of columns", () => {
      const payload = write((w) => w.lenencString("a"))
      assert.strictEqual(failure(row(payload, 2))._tag, "MysqlProtocolParseError")
    })

    it("hands out byte views with the default reader", () => {
      const payload = write((w) => {
        w.lenencString("hi")
        w.uint8(0xfb)
      })
      const decoded = success(MysqlProtocol.decodeTextRow(payload, 2, MysqlProtocol.readFieldBytes))
      assert.strictEqual(hex(decoded[0]!), "6869")
      assert.strictEqual(decoded[1], null)
    })
  })

  describe("commands", () => {
    it("frames COM_QUERY at sequence id zero", () => {
      assert.strictEqual(hex(MysqlProtocol.encodeQuery("SELECT 1")), "090000000353454c4543542031")
    })

    it("frames COM_PING and COM_QUIT", () => {
      assert.strictEqual(hex(MysqlProtocol.encodePing()), "010000000e")
      assert.strictEqual(hex(MysqlProtocol.encodeQuit()), "0100000001")
    })

    it("frames COM_INIT_DB", () => {
      assert.strictEqual(hex(MysqlProtocol.encodeInitDb("effect")), "0700000002656666656374")
    })
  })

  describe("Capabilities", () => {
    it("reads flags above the signed 32-bit range", () => {
      const capabilities = MysqlProtocol.Capabilities.of([
        MysqlProtocol.Capability.protocol41,
        MysqlProtocol.Capability.sslVerifyServerCert
      ])
      assert.isTrue(MysqlProtocol.Capabilities.has(capabilities, MysqlProtocol.Capability.sslVerifyServerCert))
      assert.isTrue(MysqlProtocol.Capabilities.has(capabilities, MysqlProtocol.Capability.protocol41))
      assert.isFalse(MysqlProtocol.Capabilities.has(capabilities, MysqlProtocol.Capability.deprecateEof))
    })

    it("rebuilds the set from the two halves the handshake sends", () => {
      const capabilities = MysqlProtocol.Capabilities.fromHalves(
        MysqlProtocol.Capability.protocol41,
        MysqlProtocol.Capability.deprecateEof / 0x10000
      )
      assert.isTrue(MysqlProtocol.Capabilities.has(capabilities, MysqlProtocol.Capability.protocol41))
      assert.isTrue(MysqlProtocol.Capabilities.has(capabilities, MysqlProtocol.Capability.deprecateEof))
    })

    it("keeps only the flags both sides offer", () => {
      const server = MysqlProtocol.Capabilities.of([
        MysqlProtocol.Capability.protocol41,
        MysqlProtocol.Capability.compress
      ])
      const wanted = [MysqlProtocol.Capability.protocol41, MysqlProtocol.Capability.deprecateEof]
      const agreed = MysqlProtocol.Capabilities.retain(server, wanted)
      assert.isTrue(MysqlProtocol.Capabilities.has(agreed, MysqlProtocol.Capability.protocol41))
      assert.isFalse(MysqlProtocol.Capabilities.has(agreed, MysqlProtocol.Capability.deprecateEof))
      assert.isFalse(MysqlProtocol.Capabilities.has(agreed, MysqlProtocol.Capability.compress))
    })

    it("reduces to 32 bits on the wire", () => {
      const all = MysqlProtocol.Capabilities.of([
        MysqlProtocol.Capability.protocol41,
        MysqlProtocol.Capability.rememberOptions
      ])
      assert.strictEqual(MysqlProtocol.Capabilities.wire(all), 2 ** 9 + 2 ** 31)
    })
  })
})
