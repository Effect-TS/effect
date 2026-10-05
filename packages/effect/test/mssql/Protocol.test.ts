import { assert, describe, it } from "@effect/vitest"
import * as Protocol from "effect/mssql/internal/protocol"

const u16 = (n: number) => Uint8Array.of(n & 255, n >>> 8 & 255)
const u32 = (n: number) => Uint8Array.of(n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255)
const done = Uint8Array.of(0xfd, 0x10, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0)
const column = (name: string, type: Uint8Array) =>
  Protocol.concat([u32(0), u16(0), type, Uint8Array.of(name.length), Protocol.unicode(name)])

describe("native TDS protocol", () => {
  it("encodes LOGIN7 offsets, database, and SQL authentication password obfuscation", () => {
    const bytes = Protocol.login({
      host: "server",
      username: "sa",
      password: "secret",
      database: "db",
      applicationName: "app",
      packetSize: 4096,
      strict: false
    })
    const view = new DataView(bytes.buffer)
    assert.strictEqual(view.getUint32(0, true), bytes.length)
    assert.strictEqual(view.getUint32(4, true), 0x74000004)
    const decode = (offset: number) =>
      new TextDecoder("utf-16le").decode(
        bytes.subarray(
          view.getUint16(offset, true),
          view.getUint16(offset, true) + view.getUint16(offset + 2, true) * 2
        )
      )
    assert.strictEqual(decode(40), "sa")
    assert.strictEqual(decode(68), "db")
    const password = bytes.subarray(view.getUint16(44, true), view.getUint16(44, true) + 12)
    assert.deepStrictEqual(password, Protocol.unicode("secret").map((b) => ((b << 4 | b >>> 4) & 255) ^ 0xa5))
  })

  it("fragments packets with sequence IDs and a final end-of-message bit", () => {
    const bytes = new Uint8Array(1400).fill(42)
    const packets = Protocol.packets(3, bytes, 512)
    assert.deepStrictEqual(packets.map((packet) => [packet[0], packet[1], packet[6]]), [[3, 0, 1], [3, 0, 2], [
      3,
      1,
      3
    ]])
    assert.deepStrictEqual(Protocol.concat(packets.map((p) => p.subarray(8))), bytes)
    assert.throws(() => Protocol.packets(3, bytes, 10), /packet size/)
  })

  it("wraps TLS handshake records and decodes every transport split", () => {
    const payload = Uint8Array.from({ length: 1400 }, (_, i) => i & 255)
    const framing = Protocol.tlsHandshakeFraming(512, 4096)
    assert.deepStrictEqual(framing.encode(payload), Protocol.concat(Protocol.packets(0x12, payload, 512)))
    for (const type of [4, 0x12]) {
      const bytes = Protocol.concat(Protocol.packets(type, payload, 512))
      for (let split = 0; split <= bytes.length; split++) {
        const decoder = Protocol.tlsHandshakeFraming(512, 4096)
        assert.deepStrictEqual(
          Protocol.concat([
            ...decoder.decode(bytes.subarray(0, split)),
            ...decoder.decode(bytes.subarray(split))
          ]),
          payload
        )
        assert.deepStrictEqual(decoder.onSecure(), [])
      }
    }
  })

  it("preserves raw TLS records coalesced with the final wrapped handshake", () => {
    const framing = Protocol.tlsHandshakeFraming(512, 4096)
    const handshake = Uint8Array.of(0x16, 3, 3, 0, 2, 42, 43)
    const application = Uint8Array.of(0x17, 3, 3, 0, 2, 44, 45)
    const bytes = Protocol.concat([...Protocol.packets(4, handshake, 512), application])
    assert.deepStrictEqual(Protocol.concat(framing.decode(bytes)), handshake)
    assert.deepStrictEqual(framing.onSecure(), [application])
    assert.deepStrictEqual(framing.onSecure(), [])
    assert.deepStrictEqual(framing.encode(application), application)
    assert.deepStrictEqual(framing.decode(application), [application])
  })

  it("accepts SQL Server's zero packet IDs throughout wrapped handshake messages", () => {
    const payload = Uint8Array.from({ length: 1400 }, (_, i) => i & 255)
    const framing = Protocol.tlsHandshakeFraming(512, 4096)
    const packets = Protocol.packets(4, payload, 512).map((packet) => {
      const bytes = packet.slice()
      bytes[6] = 0
      return bytes
    })
    const decoded: Array<Uint8Array> = []
    for (const byte of Protocol.concat(packets)) decoded.push(...framing.decode(Uint8Array.of(byte)))
    assert.deepStrictEqual(Protocol.concat(decoded), payload)
    const final = Protocol.packets(0x12, Uint8Array.of(42), 512)[0].slice()
    final[6] = 0
    assert.deepStrictEqual(framing.decode(final), [Uint8Array.of(42)])
    assert.deepStrictEqual(framing.onSecure(), [])
  })

  it("rejects malformed and oversized framed TLS before handing it to the engine", () => {
    const packet = Protocol.packets(4, Uint8Array.of(1, 2, 3), 512)[0]
    for (const [offset, value] of [[0, 1], [1, 2], [3, 7], [6, 2], [7, 1]]) {
      const invalid = packet.slice()
      invalid[offset] = value
      assert.throws(() => Protocol.tlsHandshakeFraming(512, 4096).decode(invalid), /Invalid/)
    }
    assert.throws(
      () =>
        Protocol.tlsHandshakeFraming(512, 512).decode(
          Protocol.concat(Protocol.packets(4, new Uint8Array(600), 512))
        ),
      /maximum size/
    )
    assert.throws(() => Protocol.tlsHandshakeFraming(512, 512).encode(new Uint8Array(513)), /maximum size/)
    const partial = Protocol.tlsHandshakeFraming(512, 4096)
    partial.decode(packet.subarray(0, 5))
    assert.throws(() => partial.onSecure(), /incomplete/)
    const unfinished = Protocol.tlsHandshakeFraming(512, 4096)
    unfinished.decode(Protocol.packets(4, new Uint8Array(600), 512)[0])
    assert.throws(() => unfinished.onSecure(), /incomplete/)
    const wrappedSequence = Protocol.tlsHandshakeFraming(512, 200000)
    wrappedSequence.decode(Protocol.concat(Protocol.packets(4, new Uint8Array(256 * 504 + 1), 512).slice(0, 256)))
    assert.throws(() => wrappedSequence.onSecure(), /incomplete/)
    assert.throws(() => wrappedSequence.decode(Uint8Array.of(0x17, 3, 3, 0, 0)), /Incomplete/)
  })

  it("decodes arbitrary token fragmentation without duplicating rows or side effects", () => {
    const metadata = Protocol.concat([
      Uint8Array.of(0x81),
      u16(2),
      column("id", Uint8Array.of(0x38)),
      column("__proto__", Uint8Array.of(0xe7, 20, 0, 9, 4, 0xd0, 0, 0x34))
    ])
    const row = Protocol.concat([Uint8Array.of(0xd1), u32(42), u16(4), Protocol.unicode("ok")])
    const response = Protocol.concat([metadata, row, done])
    for (let split = 0; split <= response.length; split++) {
      const parser = new Protocol.Parser()
      parser.feed(response.subarray(0, split))
      parser.feed(response.subarray(split), true)
      assert.strictEqual(parser.rowObjects.length, 1)
      assert.deepStrictEqual(parser.rows, [[42, "ok"]])
      assert.strictEqual(Object.getPrototypeOf(parser.rowObjects[0]), Object.prototype)
      assert.strictEqual(parser.rowObjects[0]["__proto__"], "ok")
      assert.strictEqual(parser.rowCount, BigInt(1))
      assert.isTrue(parser.done)
    }
  })

  it("decodes NBC nulls, decimal strings, bigint, dates, and max-length Unicode PLP", () => {
    const metadata = Protocol.concat([
      Uint8Array.of(0x81),
      u16(4),
      column("nil", Uint8Array.of(0x26, 4)),
      column("amount", Uint8Array.of(0x6a, 9, 18, 2)),
      column("large", Uint8Array.of(0x7f)),
      column("text", Uint8Array.of(0xe7, 255, 255, 9, 4, 0xd0, 0, 0x34))
    ])
    const row = Protocol.concat([
      Uint8Array.of(0xd2, 1, 9, 1, 0xd2, 4, 0, 0, 0, 0, 0, 0),
      Uint8Array.of(255, 255, 255, 255, 255, 255, 255, 127),
      Uint8Array.of(4, 0, 0, 0, 0, 0, 0, 0),
      u32(2),
      Protocol.unicode("a"),
      u32(2),
      Protocol.unicode("b"),
      u32(0)
    ])
    const parser = new Protocol.Parser()
    for (const byte of Protocol.concat([metadata, row, done])) parser.feed(Uint8Array.of(byte))
    parser.feed(new Uint8Array(), true)
    assert.deepStrictEqual(parser.rows, [[null, "12.34", BigInt("9223372036854775807"), "ab"]])
  })

  it("encodes bound RPC types without interpolating values into SQL", () => {
    const query = "SELECT @1"
    const attack = "'; DROP TABLE users;--"
    const bytes = Protocol.rpc("sp_executesql", [
      { name: "stmt", type: "NVarChar", value: query },
      { name: "1", type: "NVarChar", value: attack },
      { name: "2", type: "VarBinary", value: new Uint8Array([1, 2, 3]).subarray(1) },
      { name: "3", type: "DateTime2", value: new Date("2025-01-01T00:00:00Z") }
    ], new Uint8Array(8))
    const decoded = new TextDecoder("utf-16le").decode(bytes)
    assert.include(decoded, query)
    assert.notInclude(decoded, query.replace("@1", attack))
    assert.throws(
      () => Protocol.rpc("p", [{ name: "a", type: "Int", value: 2147483648 }], new Uint8Array(8)),
      /Invalid int/
    )
    assert.throws(
      () => Protocol.rpc("p", [{ name: "a", type: "BigInt", value: BigInt("9223372036854775808") }], new Uint8Array(8)),
      /64-bit/
    )
  })

  it("decodes datetimeoffset UTC values without applying the displayed offset twice", () => {
    const parser = new Protocol.Parser()
    const metadata = Protocol.concat([Uint8Array.of(0x81), u16(1), column("date", Uint8Array.of(0x2b, 7))])
    // 0001-01-01T00:00:00Z, with a displayed timezone offset of +02:00.
    const bytes = Uint8Array.of(0xd1, 10, 0, 0, 0, 0, 0, 0, 0, 0, 120, 0)
    parser.feed(Protocol.concat([metadata, bytes, done]), true)
    assert.strictEqual((parser.rows[0][0] as Date).toISOString(), "0001-01-01T00:00:00.000Z")
  })

  it("rejects unsupported varchar code pages rather than corrupting text", () => {
    const parser = new Protocol.Parser()
    const metadata = Protocol.concat([
      Uint8Array.of(0x81),
      u16(1),
      column("text", Uint8Array.of(0xa7, 20, 0, 0x11, 4, 0, 0, 0))
    ])
    assert.throws(() => parser.feed(metadata), /collation/)
  })

  it("distinguishes SQL Windows-1252 collations from the CP850 sort ID range", () => {
    const metadata = (sortId: number) =>
      Protocol.concat([
        Uint8Array.of(0x81),
        u16(1),
        column("text", Uint8Array.of(0xa7, 20, 0, 9, 4, 0, 0, sortId))
      ])
    // SQL sort IDs 51–54 use Windows-1252, where 0x80 is the euro sign.
    for (const sortId of [51, 52, 53, 54]) {
      const parser = new Protocol.Parser()
      parser.feed(Protocol.concat([metadata(sortId), Uint8Array.of(0xd1, 1, 0, 0x80), done]), true)
      assert.deepStrictEqual(parser.rows, [["€"]])
    }
    // SQL sort IDs 55–61 use CP850, where the same byte means Ç.
    for (const sortId of [55, 56, 57, 58, 59, 60, 61]) {
      assert.throws(() => new Protocol.Parser().feed(metadata(sortId)), /collation/)
    }
  })

  it("rejects malformed, oversized, and unsupported tokens", () => {
    assert.throws(() => new Protocol.Parser().feed(Uint8Array.of(0xd1, 0xfe), true), /Truncated/)
    assert.throws(() => new Protocol.Parser(8).feed(Uint8Array.of(0x81, 2, 0, 0, 0, 0, 0, 0, 0, 0xe7)), /maximum/)
    assert.throws(() => new Protocol.Parser().feed(Uint8Array.of(0x01)), /Unsupported/)
    assert.throws(() => Protocol.encryption(Uint8Array.of(1, 0, 99, 0, 1)), /offset/)
  })
})
