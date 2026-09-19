import { Buffer } from "node:buffer"

/** MS-TDS 2.2.3: packet headers use network byte order. */
export const HEADER_SIZE = 8
export const SQL_BATCH = 0x01
export const RPC = 0x03
export const RESPONSE = 0x04
export const ATTENTION = 0x06
export const LOGIN7 = 0x10
export const PRELOGIN = 0x12

export class ProtocolError extends Error {
  readonly code = "EPROTOCOL"
  constructor(message: string) {
    super(message)
    this.name = "TdsProtocolError"
  }
}

export interface Packet {
  readonly type: number
  readonly status: number
  readonly data: Buffer
}

/** The callback runs synchronously; it may change the session's protocol state. */
export class PacketParser {
  private readonly header = Buffer.alloc(HEADER_SIZE)
  private headerBytes = 0
  private body: Buffer | undefined
  private bodyBytes = 0
  private bodySize = 0
  private type = 0
  private status = 0

  push(chunk: Buffer, consume: (packet: Packet) => void): void {
    let offset = 0
    while (offset < chunk.length) {
      if (this.headerBytes < HEADER_SIZE) {
        const size = Math.min(HEADER_SIZE - this.headerBytes, chunk.length - offset)
        chunk.copy(this.header, this.headerBytes, offset, offset + size)
        offset += size
        this.headerBytes += size
        if (this.headerBytes < HEADER_SIZE) return
        const length = this.header.readUInt16BE(2)
        if (length < HEADER_SIZE) throw new ProtocolError(`Invalid TDS packet length ${length}`)
        this.type = this.header[0]
        this.status = this.header[1]
        this.bodySize = length - HEADER_SIZE
        this.bodyBytes = 0
      }
      const remaining = this.bodySize - this.bodyBytes
      if (this.body === undefined && chunk.length - offset >= remaining) {
        const data = chunk.subarray(offset, offset + remaining)
        offset += remaining
        this.headerBytes = 0
        consume({ type: this.type, status: this.status, data })
      } else {
        this.body ??= Buffer.allocUnsafe(this.bodySize)
        const size = Math.min(remaining, chunk.length - offset)
        chunk.copy(this.body, this.bodyBytes, offset, offset + size)
        this.bodyBytes += size
        offset += size
        if (this.bodyBytes < this.bodySize) return
        const data = this.body
        this.body = undefined
        this.headerBytes = 0
        consume({ type: this.type, status: this.status, data })
      }
    }
  }

  end(): void {
    if (this.headerBytes !== 0 || this.body !== undefined) {
      throw new ProtocolError("Connection ended inside a TDS packet")
    }
  }
}

/** Encode a complete message in one allocation, including an empty ATTENTION. */
export const encode = (type: number, data: Buffer, packetSize = 4096): Buffer => {
  if (!Number.isInteger(packetSize) || packetSize < 512 || packetSize > 32767) {
    throw new ProtocolError("TDS packet size must be an integer between 512 and 32767")
  }
  const capacity = packetSize - HEADER_SIZE
  const count = Math.max(1, Math.ceil(data.length / capacity))
  const output = Buffer.allocUnsafe(data.length + count * HEADER_SIZE)
  let source = 0
  let offset = 0
  for (let i = 0; i < count; i++) {
    const size = Math.min(capacity, data.length - source)
    output[offset] = type
    output[offset + 1] = i === count - 1 ? 1 : 0
    output.writeUInt16BE(size + HEADER_SIZE, offset + 2)
    output.writeUInt16BE(0, offset + 4)
    output[offset + 6] = (i + 1) & 0xff
    output[offset + 7] = 0
    data.copy(output, offset + HEADER_SIZE, source, source + size)
    source += size
    offset += size + HEADER_SIZE
  }
  return output
}

/** Bounded assembly for startup messages; query rows use the token parser. */
export class MessageParser {
  private parts: Array<Buffer> = []
  private size = 0
  private type: number | undefined

  readonly maxMessageSize: number
  constructor(maxMessageSize = 16 * 1024 * 1024) {
    this.maxMessageSize = maxMessageSize
  }

  push(packet: Packet): Buffer | undefined {
    if (this.type !== undefined && this.type !== packet.type) {
      throw new ProtocolError("TDS packet type changed inside a message")
    }
    this.type = packet.type
    this.size += packet.data.length
    if (this.size > this.maxMessageSize) throw new ProtocolError("TDS message exceeds configured size limit")
    this.parts.push(packet.data)
    if ((packet.status & 1) === 0) return undefined
    const data = this.parts.length === 1 ? this.parts[0] : Buffer.concat(this.parts, this.size)
    this.parts = []
    this.size = 0
    this.type = undefined
    return data
  }

  end(): void {
    if (this.type !== undefined) throw new ProtocolError("Connection ended inside a TDS message")
  }
}

/** MS-TDS 2.2.6.5: VERSION, ENCRYPTION, INSTOPT, THREADID, MARS. */
export const prelogin = (encrypt: boolean, fedAuth = false): Buffer => {
  const entries = [
    Buffer.from([0, 0, 0, 0, 0, 0]),
    Buffer.from([encrypt ? 1 : 2]),
    Buffer.from([0]),
    Buffer.alloc(4),
    Buffer.from([0]),
    ...(fedAuth ? [Buffer.from([1])] : [])
  ]
  const header = Buffer.alloc(entries.length * 5 + 1)
  let offset = header.length
  for (let i = 0; i < entries.length; i++) {
    header[i * 5] = i === 5 ? 6 : i // FEDAUTHREQUIRED is option 0x06
    header.writeUInt16BE(offset, i * 5 + 1)
    header.writeUInt16BE(entries[i].length, i * 5 + 3)
    offset += entries[i].length
  }
  header[header.length - 1] = 0xff
  return Buffer.concat([header, ...entries])
}

export const preloginOptions = (data: Buffer): { encryption: number; fedAuthRequired: boolean } => {
  let encryption: number | undefined
  let fedAuth: number | undefined
  let offset = 0
  const ranges: Array<readonly [number, number]> = []
  while (offset < data.length && data[offset] !== 0xff) {
    if (offset + 5 > data.length) throw new ProtocolError("Truncated PRELOGIN option")
    const start = data.readUInt16BE(offset + 1)
    const size = data.readUInt16BE(offset + 3)
    if (start + size > data.length) throw new ProtocolError("PRELOGIN option outside message")
    ranges.push([start, size])
    if (data[offset] === 1) {
      if (size !== 1 || encryption !== undefined) throw new ProtocolError("Invalid PRELOGIN encryption option")
      encryption = data[start]
    }
    if (data[offset] === 6) {
      if (size !== 1 || fedAuth !== undefined || data[start] > 1) {
        throw new ProtocolError("Invalid PRELOGIN FEDAUTHREQUIRED option")
      }
      fedAuth = data[start]
    }
    offset += 5
  }
  if (offset >= data.length) throw new ProtocolError("Missing PRELOGIN terminator")
  for (const [start] of ranges) {
    if (start <= offset) throw new ProtocolError("PRELOGIN option overlaps header")
  }
  if (encryption === undefined || encryption > 3) throw new ProtocolError("Missing or invalid PRELOGIN encryption")
  return { encryption, fedAuthRequired: fedAuth === 1 }
}

export const preloginEncryption = (data: Buffer): number => preloginOptions(data).encryption

export interface LoginOptions {
  readonly server: string
  readonly username?: string | undefined
  readonly password?: string | undefined
  readonly database?: string | undefined
  readonly applicationName?: string | undefined
  readonly packetSize?: number | undefined
  readonly sspi?: Buffer | undefined
  readonly accessToken?: string | undefined
  readonly fedAuthEcho?: boolean | undefined
}

/** TDS 7.4 LOGIN7 with UTF-8 support and optional Security Token FedAuth. */
export const login = (options: LoginOptions): Buffer => {
  if (
    options.accessToken !== undefined &&
    (options.sspi || options.accessToken.length === 0 || options.accessToken.length > 60000)
  ) {
    throw new ProtocolError("Invalid federated authentication token or conflicting SSPI authentication")
  }
  const header = Buffer.alloc(94)
  header.writeUInt32LE(0x74000004, 4)
  header.writeUInt32LE(options.packetSize ?? 4096, 8)
  header.writeUInt32LE(process.pid, 16)
  header[24] = 0xe0 // little endian, ASCII, IEEE, database notification, fatal database error
  header[25] = 0x03 // fatal language error and ODBC session semantics
  if (options.sspi) header[25] |= 0x80
  header[27] = 0x18 // unknown collation handling and feature extensions
  const fields = [
    [36, "effect"],
    [40, options.sspi || options.accessToken !== undefined ? "" : options.username ?? ""],
    [44, options.sspi || options.accessToken !== undefined ? "" : options.password ?? ""],
    [48, options.applicationName ?? "@effect/sql-mssql"],
    [52, options.server],
    [56, ""],
    [60, "Effect"],
    [64, ""],
    [68, options.database ?? "master"],
    [78, ""],
    [82, ""],
    [86, ""]
  ] as const
  const parts: Array<Buffer> = [header]
  let offset = header.length
  for (const [position, value] of fields) {
    if (value.length > 128) throw new ProtocolError("LOGIN7 field exceeds 128 UTF-16 code units")
    const data = Buffer.from(value, "utf16le")
    if (position === 44) {
      for (let i = 0; i < data.length; i++) data[i] = ((data[i] << 4) | (data[i] >>> 4)) ^ 0xa5
    }
    header.writeUInt16LE(offset, position)
    header.writeUInt16LE(value.length, position + 2)
    parts.push(data)
    offset += data.length
  }
  if (options.sspi) {
    if (options.sspi.length > 65535) throw new ProtocolError("SSPI payload too long")
    header.writeUInt16LE(offset, 78)
    header.writeUInt16LE(options.sspi.length, 80)
    parts.push(options.sspi)
    offset += options.sspi.length
  }
  // ibExtension points to a DWORD containing the absolute FeatureExt offset.
  if (offset > 65535) throw new ProtocolError("LOGIN7 variable fields exceed offset limit")
  header.writeUInt16LE(offset, 56)
  header.writeUInt16LE(4, 58)
  const pointer = Buffer.alloc(4)
  pointer.writeUInt32LE(offset + 4)
  parts.push(pointer)
  offset += 4
  if (options.accessToken !== undefined) {
    const token = Buffer.from(options.accessToken, "utf16le")
    const feature = Buffer.alloc(10)
    feature[0] = 2
    feature.writeUInt32LE(token.length + 5, 1)
    feature[5] = 2 | (options.fedAuthEcho ? 1 : 0)
    feature.writeUInt32LE(token.length, 6)
    parts.push(feature, token)
    offset += feature.length + token.length
  }
  const utf8 = Buffer.from([0x0a, 1, 0, 0, 0, 1, 0xff])
  parts.push(utf8)
  offset += utf8.length
  if (offset > 131071) throw new ProtocolError("LOGIN7 exceeds protocol length limit")
  header.writeUInt32LE(offset, 0)
  return Buffer.concat(parts, offset)
}

/** MS-TDS 2.2.5.3: transaction descriptor ALL_HEADERS. */
export const allHeaders = (transaction: Buffer): Buffer => {
  if (transaction.length !== 8) throw new ProtocolError("Invalid transaction descriptor")
  const header = Buffer.alloc(22)
  header.writeUInt32LE(22, 0)
  header.writeUInt32LE(18, 4)
  header.writeUInt16LE(2, 8)
  transaction.copy(header, 10)
  header.writeUInt32LE(1, 18)
  return header
}
