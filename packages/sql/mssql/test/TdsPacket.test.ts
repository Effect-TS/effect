import * as Packet from "#tds/tdsPacket"
import { describe, expect, it } from "@effect/vitest"
import { Buffer } from "node:buffer"

describe("TDS packets", () => {
  it("decodes every two-chunk split including empty packets and multiple messages", () => {
    const payload = Buffer.alloc(1800, 0x5a)
    const wire = Buffer.concat([
      Packet.encode(Packet.SQL_BATCH, payload, 512),
      Packet.encode(Packet.ATTENTION, Buffer.alloc(0))
    ])
    for (let split = 0; split <= wire.length; split++) {
      const parser = new Packet.PacketParser()
      const packets: Array<Packet.Packet> = []
      parser.push(wire.subarray(0, split), (packet) => packets.push(packet))
      parser.push(wire.subarray(split), (packet) => packets.push(packet))
      parser.end()
      expect(packets.map((p) => p.status)).toEqual([0, 0, 0, 1, 1])
      expect(Buffer.concat(packets.slice(0, 4).map((p) => p.data))).toEqual(payload)
      expect(packets[4].type).toBe(Packet.ATTENTION)
      expect(packets[4].data.length).toBe(0)
    }
  })

  it("handles one-byte fragments and packet id wraparound", () => {
    const payload = Buffer.alloc(504 * 257, 0x7b)
    const wire = Packet.encode(Packet.RPC, payload, 512)
    expect(wire[255 * 512 + 6]).toBe(0)
    expect(wire[256 * 512 + 6]).toBe(1)
    const parser = new Packet.PacketParser()
    const messages = new Packet.MessageParser()
    let result: Buffer | undefined
    for (let i = 0; i < wire.length; i++) {
      parser.push(wire.subarray(i, i + 1), (p) => {
        result = messages.push(p)
      })
    }
    parser.end()
    messages.end()
    expect(result).toEqual(payload)
  })

  it("rejects invalid framing and truncated input", () => {
    const invalid = Buffer.from([4, 1, 0, 7, 0, 0, 1, 0])
    expect(() => new Packet.PacketParser().push(invalid, () => {})).toThrow("length")
    const wire = Packet.encode(Packet.RESPONSE, Buffer.from([1, 2, 3]))
    for (let end = 1; end < wire.length; end++) {
      const parser = new Packet.PacketParser()
      parser.push(wire.subarray(0, end), () => {})
      expect(() => parser.end()).toThrow("inside a TDS packet")
    }
    expect(() => Packet.encode(1, Buffer.alloc(0), 65536)).toThrow("packet size")
  })

  it("bounds startup assembly and rejects mixed message types", () => {
    const parser = new Packet.MessageParser(2)
    parser.push({ type: 4, status: 0, data: Buffer.from([1, 2]) })
    expect(() => parser.end()).toThrow("message")
    expect(() => parser.push({ type: 4, status: 1, data: Buffer.from([3]) })).toThrow("limit")
    const mixed = new Packet.MessageParser()
    mixed.push({ type: 4, status: 0, data: Buffer.from([1]) })
    expect(() => mixed.push({ type: 18, status: 1, data: Buffer.from([2]) })).toThrow("type changed")
  })

  it("encodes and validates PRELOGIN option offsets", () => {
    expect(Packet.preloginEncryption(Packet.prelogin(true))).toBe(1)
    expect(Packet.preloginEncryption(Packet.prelogin(false))).toBe(2)
    expect(() => Packet.preloginEncryption(Buffer.from([1, 0]))).toThrow("Truncated")
    const invalid = Packet.prelogin(true)
    invalid.writeUInt16BE(0, 6)
    expect(() => Packet.preloginEncryption(invalid)).toThrow("overlaps")
  })

  it("writes UTF-16 login offsets and obfuscates the password", () => {
    const data = Packet.login({ server: "localhost", username: "sa", password: "abc", database: "λ" })
    expect(data.readUInt32LE(0)).toBe(data.length)
    expect(data.readUInt32LE(4)).toBe(0x74000004)
    expect(data.readUInt16LE(46)).toBe(3)
    const offset = data.readUInt16LE(44)
    expect(data.subarray(offset, offset + 6).toString("hex")).toBe("b3a583a593a5")
    expect(data.toString("utf16le", data.readUInt16LE(68), data.readUInt16LE(68) + 2)).toBe("λ")
    expect(() => Packet.login({ server: "x".repeat(129) })).toThrow("128")
  })
})
