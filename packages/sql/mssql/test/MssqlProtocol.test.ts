import { MssqlProtocol, MssqlTypes } from "@effect/sql-mssql"
import { describe, expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { Buffer } from "node:buffer"

const { PacketType } = MssqlProtocol

const unwrap = <A, E>(result: Result.Result<A, E>): A => {
  if (Result.isFailure(result)) throw result.failure
  return result.success
}

const bytes = (data: Uint8Array) => Buffer.from(data.buffer, data.byteOffset, data.byteLength)

const packet = (type: number, payload: Uint8Array, packetSize?: number) =>
  unwrap(MssqlProtocol.encodePacket(type, payload, packetSize))

const login = (options: MssqlProtocol.Login7) => bytes(unwrap(MssqlProtocol.encodeLogin7(options)))

const prelogin = (data: Uint8Array) => unwrap(MssqlProtocol.decodePrelogin(data))

// Exhaustive synchronous fragmentation loops must not starve concurrently
// scheduled tests in the same worker (notably on busy Bun CI runners).
describe("MssqlProtocol packets", { concurrent: false }, () => {
  it("encodes Security Token and UTF-8 feature extensions with byte lengths and indirect offsets", () => {
    const data = login({
      server: "localhost",
      username: "ignored",
      password: "ignored",
      accessToken: "token-λ",
      fedAuthEcho: true
    })
    expect(data[27] & 0x10).toBe(0x10)
    expect(data[25] & 0x80).toBe(0)
    expect(data.readUInt16LE(42)).toBe(0)
    expect(data.readUInt16LE(46)).toBe(0)
    expect(data.readUInt16LE(58)).toBe(4)
    const offset = data.readUInt32LE(data.readUInt16LE(56))
    expect(data.subarray(offset, offset + 10)).toEqual(Buffer.from([2, 19, 0, 0, 0, 3, 14, 0, 0, 0]))
    expect(data.toString("utf16le", offset + 10, offset + 24)).toBe("token-λ")
    expect(data.subarray(offset + 24)).toEqual(Buffer.from([10, 1, 0, 0, 0, 1, 255]))
    expect(data.readUInt32LE(0)).toBe(data.length)
    expect(prelogin(MssqlProtocol.encodePrelogin({ encrypt: true, fedAuth: true }))).toEqual({
      encryption: 1,
      fedAuthRequired: true
    })
    expect(prelogin(MssqlProtocol.encodePrelogin({ encrypt: true }))).toEqual({ encryption: 1, fedAuthRequired: false })
    expect(() => login({ server: "localhost", accessToken: "" })).toThrow("token")
    expect(() => login({ server: "localhost", accessToken: "x".repeat(60001) })).toThrow("token")
    expect(() => login({ server: "localhost", accessToken: "x", sspi: new Uint8Array([1]) })).toThrow("SSPI")
  })

  it("decodes every two-chunk split including empty packets and multiple messages", () => {
    const payload = new Uint8Array(1800).fill(0x5a)
    const wire = Buffer.concat([
      packet(PacketType.SqlBatch, payload, 512),
      packet(PacketType.Attention, new Uint8Array(0))
    ])
    for (let split = 0; split <= wire.length; split++) {
      const parser = MssqlProtocol.makePacketParser()
      const packets: Array<MssqlProtocol.Packet> = []
      parser.push(wire.subarray(0, split), (packet) => packets.push(packet))
      parser.push(wire.subarray(split), (packet) => packets.push(packet))
      parser.end()
      expect(packets.map((p) => p.status)).toEqual([0, 0, 0, 1, 1])
      expect(new Uint8Array(Buffer.concat(packets.slice(0, 4).map((p) => p.data)))).toEqual(payload)
      expect(packets[4].type).toBe(PacketType.Attention)
      expect(packets[4].data.length).toBe(0)
    }
  }, 30000)

  it("handles one-byte fragments and packet id wraparound", () => {
    const payload = new Uint8Array(504 * 257).fill(0x7b)
    const wire = packet(PacketType.Rpc, payload, 512)
    expect(wire[255 * 512 + 6]).toBe(0)
    expect(wire[256 * 512 + 6]).toBe(1)
    const parser = MssqlProtocol.makePacketParser()
    const messages = MssqlProtocol.makeMessageParser()
    let result: Uint8Array | undefined
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
    const invalid = new Uint8Array([4, 1, 0, 7, 0, 0, 1, 0])
    expect(() => MssqlProtocol.makePacketParser().push(invalid, () => {})).toThrow("length")
    const wire = packet(PacketType.Response, new Uint8Array([1, 2, 3]))
    for (let end = 1; end < wire.length; end++) {
      const parser = MssqlProtocol.makePacketParser()
      parser.push(wire.subarray(0, end), () => {})
      expect(() => parser.end()).toThrow("inside a TDS packet")
    }
    expect(() => packet(1, new Uint8Array(0), 65536)).toThrow("packet size")
  })

  it("bounds startup assembly and rejects mixed message types", () => {
    const parser = MssqlProtocol.makeMessageParser(2)
    parser.push({ type: 4, status: 0, data: new Uint8Array([1, 2]) })
    expect(() => parser.end()).toThrow("message")
    expect(() => parser.push({ type: 4, status: 1, data: new Uint8Array([3]) })).toThrow("limit")
    const mixed = MssqlProtocol.makeMessageParser()
    mixed.push({ type: 4, status: 0, data: new Uint8Array([1]) })
    expect(() => mixed.push({ type: 18, status: 1, data: new Uint8Array([2]) })).toThrow("type changed")
  })

  it("encodes and validates PRELOGIN option offsets", () => {
    expect(prelogin(MssqlProtocol.encodePrelogin({ encrypt: true })).encryption).toBe(1)
    expect(prelogin(MssqlProtocol.encodePrelogin({ encrypt: false })).encryption).toBe(2)
    expect(() => prelogin(new Uint8Array([1, 0]))).toThrow("Truncated")
    const invalid = Buffer.from(MssqlProtocol.encodePrelogin({ encrypt: true }))
    invalid.writeUInt16BE(0, 6)
    expect(() => prelogin(invalid)).toThrow("overlaps")
  })

  it("writes UTF-16 login offsets and obfuscates the password", () => {
    const data = login({ server: "localhost", username: "sa", password: "abc", database: "λ" })
    expect(data.readUInt32LE(0)).toBe(data.length)
    expect(data.readUInt32LE(4)).toBe(MssqlProtocol.tdsVersion)
    expect(data.readUInt16LE(46)).toBe(3)
    const offset = data.readUInt16LE(44)
    expect(data.subarray(offset, offset + 6).toString("hex")).toBe("b3a583a593a5")
    expect(data.toString("utf16le", data.readUInt16LE(68), data.readUInt16LE(68) + 2)).toBe("λ")
    expect(() => login({ server: "x".repeat(129) })).toThrow("128")
  })

  it("obfuscates the password wherever the shared writer's pool runs out", () => {
    // Consecutive messages share one pool, so some of these logins start near
    // its end and move to a new buffer part way through.
    for (let i = 0; i < 64; i++) {
      const data = login({ server: "s".repeat(128), username: "u".repeat(i), password: "abc" })
      const offset = data.readUInt16LE(44)
      expect(data.subarray(offset, offset + 6).toString("hex")).toBe("b3a583a593a5")
    }
  })
})

const done = Buffer.from("fd100000000100000000000000", "hex")
const intColumn = (name: string) =>
  Buffer.concat([
    Buffer.from("00000000000038", "hex"),
    Buffer.from([name.length]),
    Buffer.from(name, "utf16le")
  ])
const metadata = Buffer.concat([Buffer.from([0x81, 2, 0]), intColumn("a"), intColumn("b")])
const row = Buffer.from([0xd1, 42, 0, 0, 0, 255, 255, 255, 255])
const nbcRow = Buffer.from([0xd2, 1, 7, 0, 0, 0])

describe("MssqlProtocol tokens", () => {
  it("decodes fragmented feature acknowledgements and rejects duplicate IDs", () => {
    const data = Buffer.from([0xae, 2, 0, 0, 0, 0, 10, 1, 0, 0, 0, 1, 255])
    for (let split = 0; split <= data.length; split++) {
      const parser = MssqlProtocol.makeTokenParser()
      const tokens: Array<MssqlProtocol.Token> = []
      parser.push(data.subarray(0, split), (token) => tokens.push(token))
      parser.push(data.subarray(split), (token) => tokens.push(token))
      parser.end()
      expect(tokens).toEqual([{
        _tag: "FeatureAck",
        features: new Map([[2, new Uint8Array(0)], [10, new Uint8Array([1])]])
      }])
    }
    expect(() => MssqlProtocol.makeTokenParser().push(Buffer.from([0xae, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 255]), () => {}))
      .toThrow("Duplicate")
  })

  it("handles every split through metadata, ROW, NBCROW, and DONE", () => {
    const data = Buffer.concat([metadata, row, nbcRow, done])
    for (let i = 0; i <= data.length; i++) {
      const parser = MssqlProtocol.makeTokenParser()
      const tokens: Array<MssqlProtocol.Token> = []
      parser.push(data.subarray(0, i), (token) => tokens.push(token))
      parser.push(data.subarray(i), (token) => tokens.push(token))
      parser.end()
      expect(tokens.map((t) => t._tag)).toEqual(["Metadata", "Row", "Row", "Done"])
      expect(tokens[1]).toEqual({ _tag: "Row", values: [42, -1] })
      expect(tokens[2]).toEqual({ _tag: "Row", values: [null, 7] })
      expect(tokens[3]).toEqual({ _tag: "Done", kind: 0xfd, status: 16, rowCount: 1 })
    }
  })

  it("handles bytewise PLP fragmentation without retaining mutable result buffers", () => {
    const columns = Buffer.from("810100000000000000a5ffff017800", "hex")
    const plp = Buffer.from("d10300000000000000020000000102010000000300000000", "hex")
    const data = Buffer.concat([columns, plp, done])
    const parser = MssqlProtocol.makeTokenParser()
    const rows: Array<ReadonlyArray<unknown>> = []
    for (let i = 0; i < data.length; i++) {
      parser.push(data.subarray(i, i + 1), (t) => {
        if (t._tag === "Row") rows.push(t.values)
      })
    }
    parser.end()
    parser.push(Buffer.concat(Array.from({ length: 400 }, () => done)), () => {})
    expect(rows).toEqual([[Buffer.from([1, 2, 3])]])
  })

  it("copies values decoded straight from a chunk", () => {
    const columns = Buffer.from("810100000000000000a5ffff017800", "hex")
    const plp = Buffer.concat([
      Buffer.from([0xd1, 3, 0, 0, 0, 0, 0, 0, 0]),
      Buffer.from([3, 0, 0, 0, 1, 2, 3]),
      Buffer.from([0, 0, 0, 0])
    ])
    const data = Buffer.concat([columns, plp, done])
    const rows: Array<ReadonlyArray<unknown>> = []
    MssqlProtocol.makeTokenParser().push(data, (t) => {
      if (t._tag === "Row") rows.push(t.values)
    })
    data.fill(0)
    expect(rows).toEqual([[Buffer.from([1, 2, 3])]])
  })

  it("rejects unexpected tokens, rows without metadata, and truncated messages", () => {
    expect(() => MssqlProtocol.makeTokenParser().push(Buffer.from([0]), () => {})).toThrow("Unexpected")
    expect(() => MssqlProtocol.makeTokenParser().push(row, () => {})).toThrow("before COLMETADATA")
    const parser = MssqlProtocol.makeTokenParser()
    parser.push(done.subarray(0, 10), () => {})
    expect(() => parser.end()).toThrow("Truncated")
  })

  it("rejects malformed length-delimited tokens immediately", () => {
    expect(() => MssqlProtocol.makeTokenParser().push(Buffer.from([0xaa, 1, 0, 0]), () => {})).toThrow("Malformed")
  })

  it("enforces a token bound but permits large chunks of small tokens", () => {
    const parser = MssqlProtocol.makeTokenParser({ maxTokenSize: 32 })
    let count = 0
    parser.push(Buffer.concat(Array.from({ length: 1000 }, () => done)), () => count++)
    parser.end()
    expect(count).toBe(1000)
    const invalid = MssqlProtocol.makeTokenParser({ maxTokenSize: 16 })
    expect(() => invalid.push(Buffer.concat([Buffer.from([0xaa, 100, 0]), Buffer.alloc(100)]), () => {})).toThrow(
      "limit"
    )
  })

  it("decodes ENVCHANGE routing, collation, and transaction changes", () => {
    const changes: Array<MssqlProtocol.EnvChange> = []
    const host = Buffer.from("db", "utf16le")
    const route = Buffer.concat([Buffer.from([0, 0x99, 0x05, 2, 0]), host])
    const env = (body: Buffer) => Buffer.concat([Buffer.from([0xe3, body.length, body.length >> 8]), body])
    MssqlProtocol.makeTokenParser().push(
      Buffer.concat([
        env(Buffer.concat([Buffer.from([20, route.length, 0]), route, Buffer.from([0, 0])])),
        env(Buffer.from([7, 5, 9, 4, 0xd0, 0, 0x34, 0])),
        env(Buffer.from([8, 8, 1, 2, 3, 4, 5, 6, 7, 8, 0])),
        env(Buffer.from([9, 0, 8, 1, 2, 3, 4, 5, 6, 7, 8]))
      ]),
      (token) => {
        if (token._tag === "EnvChange") changes.push(token.change)
      }
    )
    expect(changes).toEqual([
      { _tag: "Routing", server: "db", port: 0x0599 },
      { _tag: "Collation", collation: new Uint8Array([9, 4, 0xd0, 0, 0x34]) },
      { _tag: "BeginTransaction", descriptor: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
      { _tag: "EndTransaction" }
    ])
  })
})

const collation = Buffer.from("0904d00034", "hex")
const parameter = (type: MssqlTypes.DataType, value: unknown, options?: MssqlTypes.ParameterOptions) =>
  bytes(unwrap(MssqlProtocol.encodeParameter({ name: "x", type, value, options }, collation)))

describe("MssqlProtocol parameters", () => {
  it("rejects invalid values before they reach the wire", () => {
    expect(() => parameter(MssqlTypes.TinyInt, 256)).toThrow("integer")
    expect(() => parameter(MssqlTypes.Int, 1.5)).toThrow("integer")
    expect(() => parameter(MssqlTypes.Float, NaN)).toThrow("finite")
    expect(() => parameter(MssqlTypes.BigInt, Number.MAX_SAFE_INTEGER + 1)).toThrow("safe integer")
    expect(() => parameter(MssqlTypes.NVarChar, "long", { length: 2 })).toThrow("declared length")
    expect(() => parameter(MssqlTypes.UniqueIdentifier, "bad uuid")).toThrow("UUID")
    expect(() => parameter(MssqlTypes.Decimal, "1234", { precision: 3 })).toThrow("precision")
    expect(() => parameter(MssqlTypes.Decimal, "1", { precision: 2, scale: 3 })).toThrow("integer")
    expect(() => parameter(MssqlTypes.Date, new Date(NaN))).toThrow("valid Date")
    expect(() => parameter(MssqlTypes.DateTime, new Date("1000-01-01Z"))).toThrow("range")
    expect(() =>
      unwrap(MssqlProtocol.encodeParameter({ name: "x; DROP TABLE t", type: MssqlTypes.Int, value: 1 }, collation))
    ).toThrow("parameter name")
  })

  it("encodes exact decimal strings through 38 digits without floating-point multiplication", () => {
    const encoded = parameter(MssqlTypes.Decimal, "99999999999999999999999999999999999999", { precision: 38 })
    const magnitudeBytes = encoded.subarray(-16)
    let magnitude = BigInt(0)
    for (let i = 15; i >= 0; i--) magnitude = (magnitude << BigInt(8)) | BigInt(magnitudeBytes[i])
    expect(magnitude.toString()).toBe("99999999999999999999999999999999999999")
    const rounded = parameter(MssqlTypes.Decimal, "-1.005", { precision: 5, scale: 2 })
    expect(rounded.subarray(-5)).toEqual(Buffer.from([0, 101, 0, 0, 0]))
  })

  it("carries rounded datetime ticks and smalldatetime minutes into the next day", () => {
    const a = parameter(MssqlTypes.DateTime, new Date("2024-01-01T23:59:59.999Z"))
    const b = parameter(MssqlTypes.DateTime, new Date("2024-01-02T00:00:00.000Z"))
    expect(a).toEqual(b)
    expect(parameter(MssqlTypes.SmallDateTime, new Date("2024-01-01T23:59:45Z")))
      .toEqual(parameter(MssqlTypes.SmallDateTime, new Date("2024-01-02T00:00:00Z")))
  })

  it("validates TVP column counts and cell values before encoding an RPC", () => {
    const value = { name: "Items", columns: [{ name: "n", type: MssqlTypes.Int }], rows: [[1, 2]] }
    expect(() => parameter(MssqlTypes.TVP, value)).toThrow("does not match")
    expect(() => parameter(MssqlTypes.TVP, { ...value, rows: [["invalid"]] })).toThrow("integer")
  })

  it("rounds temporal scales, carries midnight, and preserves sub-millisecond fractions", () => {
    for (const type of [MssqlTypes.Time, MssqlTypes.DateTime2, MssqlTypes.DateTimeOffset]) {
      expect(parameter(type, new Date("2024-01-01T23:59:59.999Z"), { scale: 0 }))
        .toEqual(parameter(type, new Date("2024-01-02T00:00:00Z"), { scale: 0 }))
      const value = Object.assign(new Date("2024-01-01T00:00:00.123Z"), { nanosecondsDelta: 0.0004567 })
      const encoded = parameter(type, value, { scale: 7 })
      const timeOffset = encoded.length - (type.name === "Time" ? 5 : type.name === "DateTime2" ? 8 : 10)
      expect(encoded.readUIntLE(timeOffset, 5)).toBe(1234567)
      expect(() => parameter(type, Object.assign(new Date(), { nanosecondsDelta: NaN }))).toThrow("fraction")
    }
    expect(() => parameter(MssqlTypes.DateTime2, new Date("9999-12-31T23:59:59.999Z"), { scale: 0 }))
      .toThrow("Rounded date")
  })

  it("encodes integers, floats, money, and UUIDs little-endian", () => {
    expect(parameter(MssqlTypes.SmallInt, -2).subarray(-3)).toEqual(Buffer.from([2, 0xfe, 0xff]))
    expect(parameter(MssqlTypes.Int, -2).subarray(-5)).toEqual(Buffer.from([4, 0xfe, 0xff, 0xff, 0xff]))
    expect(parameter(MssqlTypes.BigInt, "-9223372036854775808").subarray(-8)).toEqual(
      Buffer.from([0, 0, 0, 0, 0, 0, 0, 0x80])
    )
    expect(parameter(MssqlTypes.Float, 1.5).subarray(-8).readDoubleLE(0)).toBe(1.5)
    const money = parameter(MssqlTypes.Money, "-1.0001").subarray(-8)
    expect(money.readInt32LE(0) * 0x100000000 + money.readUInt32LE(4)).toBe(-10001)
    expect(parameter(MssqlTypes.UniqueIdentifier, "12345678-abcd-ef01-2345-6789abcdef01").subarray(-16)).toEqual(
      Buffer.from("78563412cdab01ef23456789abcdef01", "hex")
    )
  })
})

describe("MssqlProtocol SQL Browser", () => {
  it("encodes instance requests and decodes validated responses", () => {
    expect(unwrap(MssqlProtocol.encodeInstanceRequest("NATIVE"))).toEqual(
      new Uint8Array([4, ...Buffer.from("NATIVE"), 0])
    )
    expect(() => unwrap(MssqlProtocol.encodeInstanceRequest("A;B"))).toThrow("instance name")
    const body = Buffer.from("ServerName;local;InstanceName;NATIVE;tcp;14339;;")
    const response = Buffer.concat([Buffer.from([5, body.length, body.length >> 8]), body])
    expect(unwrap(MssqlProtocol.decodeInstanceResponse(response, "native"))).toBe(14339)
    expect(() => unwrap(MssqlProtocol.decodeInstanceResponse(response, "OTHER"))).toThrow("not present")
    expect(() => unwrap(MssqlProtocol.decodeInstanceResponse(response.subarray(1), "NATIVE"))).toThrow("Invalid")
  })
})
