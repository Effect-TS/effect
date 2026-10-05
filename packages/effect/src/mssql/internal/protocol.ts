import type * as Socket from "../../socket/Socket.ts"
import type { BoundParameter, DataType, ServerError } from "../MssqlTypes.ts"

const utf16 = new TextDecoder("utf-16le")
const utf8 = new TextDecoder()
const needMore = Symbol("needMore")

/** @internal */
export const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}

/** @internal */
export const unicode = (value: string): Uint8Array => {
  const bytes = new Uint8Array(value.length * 2)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < value.length; i++) view.setUint16(i * 2, value.charCodeAt(i), true)
  return bytes
}

class Writer {
  readonly bytes: Array<number> = []
  u8(n: number) {
    this.bytes.push(n & 255)
    return this
  }
  u16(n: number) {
    return this.u8(n).u8(n >>> 8)
  }
  u32(n: number) {
    return this.u16(n).u16(n >>> 16)
  }
  u64(n: bigint) {
    for (let i = 0; i < 8; i++) this.u8(Number((n >> BigInt(i * 8)) & BigInt(255)))
    return this
  }
  raw(bytes: Uint8Array) {
    for (const b of bytes) this.u8(b)
    return this
  }
  text(value: string) {
    return this.raw(unicode(value))
  }
  result() {
    return Uint8Array.from(this.bytes)
  }
}

/** @internal */
export const packets = (type: number, payload: Uint8Array, packetSize = 4096): ReadonlyArray<Uint8Array> => {
  if (!Number.isInteger(packetSize) || packetSize < 512 || packetSize > 32767) {
    throw new Error("Invalid TDS packet size")
  }
  const out: Array<Uint8Array> = []
  let index = 0
  do {
    const offset = index * (packetSize - 8)
    const bytes = payload.subarray(offset, offset + packetSize - 8)
    const packet = new Uint8Array(8 + bytes.length)
    packet[0] = type
    packet[1] = offset + bytes.length >= payload.length ? 1 : 0
    new DataView(packet.buffer).setUint16(2, packet.length)
    packet[6] = (index + 1) & 255
    packet.set(bytes, 8)
    out.push(packet)
    index++
  } while (index * (packetSize - 8) < payload.length)
  return out
}

/** @internal */
export const tlsHandshakeFraming = (packetSize: number, maximum: number): Socket.TlsHandshakeFraming => {
  if (
    !Number.isInteger(packetSize) || packetSize < 512 || packetSize > 32767 ||
    !Number.isSafeInteger(maximum) || maximum < 512
  ) {
    throw new Error("Invalid TDS TLS handshake size")
  }
  let pending: Uint8Array = new Uint8Array()
  let expectedId = 1
  let messageSize = 0
  let messageOpen = false
  let zeroPacketIds = false
  let secure = false
  return {
    encode: (bytes) => {
      if (secure) return bytes
      if (bytes.length > maximum) throw new Error("TDS TLS handshake exceeds maximum size")
      return concat(packets(0x12, bytes, packetSize))
    },
    decode: (bytes) => {
      if (secure) return bytes.length === 0 ? [] : [bytes]
      pending = concat([pending, bytes])
      const chunks: Array<Uint8Array> = []
      while (pending.length > 0) {
        // The server's final wrapped handshake and its first raw TLS record
        // can share a transport read. Keep the latter for the secure boundary.
        if (pending[0] >= 20 && pending[0] <= 23) {
          if (messageOpen) throw new Error("Incomplete TDS TLS handshake message")
          if (pending.length > maximum) throw new Error("Buffered TLS data exceeds maximum size")
          break
        }
        if (pending[0] !== 0x12 && pending[0] !== 4) throw new Error("Invalid TDS TLS handshake packet type")
        if (pending.length < 8) break
        const length = pending[2] * 256 + pending[3]
        if (length < 8 || length - 8 > maximum) throw new Error("Invalid TDS TLS handshake packet length")
        // SQL Server's TLS PRELOGIN responses use packet ID zero. Ordinary
        // responses still use the numbered sequence, including wraparound.
        if (!messageOpen && pending[6] === 0) zeroPacketIds = true
        const packetId = zeroPacketIds ? 0 : expectedId
        if ((pending[1] & ~1) !== 0 || pending[6] !== packetId || pending[7] !== 0) {
          throw new Error(
            `Invalid TDS TLS handshake packet header (status ${pending[1]}, id ${
              pending[6]
            }, expected ${packetId}, window ${pending[7]})`
          )
        }
        if (pending.length < length) break
        messageSize += length - 8
        if (messageSize > maximum) throw new Error("TDS TLS handshake exceeds maximum size")
        const packet = pending.subarray(0, length)
        pending = pending.subarray(length)
        chunks.push(packet.subarray(8))
        if ((packet[1] & 1) !== 0) {
          expectedId = 1
          messageSize = 0
          messageOpen = false
          zeroPacketIds = false
        } else {
          expectedId = (expectedId + 1) & 255
          messageOpen = true
        }
      }
      return chunks
    },
    onSecure: () => {
      if (secure) return []
      if (messageOpen || pending.length > 0 && (pending[0] < 20 || pending[0] > 23)) {
        throw new Error("TLS became secure inside an incomplete TDS handshake packet")
      }
      secure = true
      const chunks = pending.length === 0 ? [] : [pending]
      pending = new Uint8Array()
      return chunks
    }
  }
}

/** @internal */
export const prelogin = (strict: boolean, mandatory = false): Uint8Array =>
  Uint8Array.of(0, 0, 11, 0, 6, 1, 0, 17, 0, 1, 255, 0, 0, 0, 0, 0, 0, strict ? 0 : mandatory ? 1 : 2)

/** @internal */
export const encryption = (bytes: Uint8Array): number => {
  for (let i = 0; i < bytes.length && bytes[i] !== 255; i += 5) {
    if (i + 5 > bytes.length) throw new Error("Truncated PRELOGIN option")
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const offset = view.getUint16(i + 1)
    const length = view.getUint16(i + 3)
    if (offset + length > bytes.length) throw new Error("Invalid PRELOGIN option offset")
    if (bytes[i] === 1) {
      if (length !== 1) throw new Error("Invalid PRELOGIN encryption option")
      return bytes[offset]
    }
  }
  throw new Error("PRELOGIN response omitted encryption negotiation")
}

/** @internal */
export const login = (options: {
  readonly host: string
  readonly username: string
  readonly password: string
  readonly database: string
  readonly applicationName: string
  readonly packetSize: number
  readonly strict: boolean
}): Uint8Array => {
  const fields = [
    "effect",
    options.username,
    options.password,
    options.applicationName,
    options.host,
    "",
    "effect/mssql",
    "",
    options.database
  ]
  const chunks = fields.map(unicode)
  chunks[2] = chunks[2].map((b) => (((b << 4) | (b >>> 4)) & 255) ^ 0xa5)
  const length = 94 + chunks.reduce((n, chunk) => n + chunk.length, 0)
  if (length > 65535) throw new Error("LOGIN7 credentials exceed the TDS offset limit")
  const out = new Uint8Array(length)
  const view = new DataView(out.buffer)
  view.setUint32(0, length, true)
  view.setUint32(4, options.strict ? 0x08000000 : 0x74000004, true)
  view.setUint32(8, options.packetSize, true)
  view.setUint32(12, 0x01000000, true)
  out[24] = 0xe0
  out[25] = 3
  out[27] = 0x08
  view.setUint32(32, 0x00000409, true)
  let offset = 94
  for (let i = 0; i < fields.length; i++) {
    view.setUint16(36 + i * 4, offset, true)
    view.setUint16(38 + i * 4, fields[i].length, true)
    out.set(chunks[i], offset)
    offset += chunks[i].length
  }
  // SSPI, attached database file, and changed password are absent.
  view.setUint16(78, offset, true)
  view.setUint16(82, offset, true)
  view.setUint16(86, offset, true)
  return out
}

/** @internal */
export const infer = (value: unknown): DataType => {
  if (value === null || value === undefined) return "NVarChar"
  if (typeof value === "string") return "NVarChar"
  if (typeof value === "number") return "Float"
  if (typeof value === "bigint") return "BigInt"
  if (typeof value === "boolean") return "Bit"
  if (value instanceof Date) return "DateTime2"
  if (value instanceof Uint8Array || value instanceof Int8Array) return "VarBinary"
  throw new Error("Unsupported SQL Server parameter value")
}

/** @internal */
export const declaration = (param: BoundParameter): string => {
  switch (param.type) {
    case "NVarChar":
      return `nvarchar(${param.options?.length ?? "max"})`
    case "VarBinary":
      return `varbinary(${param.options?.length ?? "max"})`
    case "Float":
      return "float"
    case "BigInt":
      return "bigint"
    case "Int":
      return "int"
    case "Bit":
      return "bit"
    case "DateTime2":
      return "datetime2(7)"
    case "UniqueIdentifier":
      return "uniqueidentifier"
  }
}

const dateEpoch = -62135596800000
const parameter = (writer: Writer, param: BoundParameter): void => {
  const name = param.name.startsWith("@") ? param.name : `@${param.name}`
  if (name.length > 255) throw new Error("TDS parameter name exceeds 255 characters")
  writer.u8(name.length).text(name).u8(param.output ? 1 : 0)
  const value = param.value
  const nil = value === null || value === undefined
  switch (param.type) {
    case "NVarChar":
    case "VarBinary": {
      const text = param.type === "NVarChar"
      if (!nil && (text ? typeof value !== "string" : !(value instanceof Uint8Array || value instanceof Int8Array))) {
        throw new Error(`Invalid ${param.type} parameter`)
      }
      const bytes = nil
        ? new Uint8Array()
        : text
        ? unicode(value as string)
        : new Uint8Array(
          (value as Uint8Array).buffer,
          (value as Uint8Array).byteOffset,
          (value as Uint8Array).byteLength
        )
      const length = param.options?.length
      if (length !== undefined && (!Number.isInteger(length) || length < 1 || length > (text ? 4000 : 8000))) {
        throw new Error("Invalid parameter length")
      }
      if (length !== undefined && bytes.length > length * (text ? 2 : 1)) {
        throw new Error("Parameter exceeds its declared length")
      }
      writer.u8(text ? 0xe7 : 0xa5).u16(length === undefined ? 65535 : length * (text ? 2 : 1))
      if (text) writer.raw(Uint8Array.of(9, 4, 0xd0, 0, 0x34))
      if (length === undefined) {
        writer.u64(nil ? BigInt("0xffffffffffffffff") : BigInt(bytes.length))
        if (!nil) {
          if (bytes.length > 0) writer.u32(bytes.length).raw(bytes)
          writer.u32(0)
        }
      } else {
        writer.u16(nil ? 65535 : bytes.length)
        if (!nil) writer.raw(bytes)
      }
      return
    }
    case "Float": {
      writer.u8(0x6d).u8(8).u8(nil ? 0 : 8)
      if (!nil) {
        if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid float parameter")
        const bytes = new Uint8Array(8)
        new DataView(bytes.buffer).setFloat64(0, value, true)
        writer.raw(bytes)
      }
      return
    }
    case "Int":
    case "BigInt": {
      const length = param.type === "Int" ? 4 : 8
      writer.u8(0x26).u8(length).u8(nil ? 0 : length)
      if (!nil) {
        if (
          length === 4 &&
          (typeof value !== "number" || !Number.isInteger(value) || value < -2147483648 || value > 2147483647)
        ) throw new Error("Invalid int parameter")
        const n = BigInt(value as number | bigint)
        if (length === 8 && (n < -BigInt("9223372036854775808") || n > BigInt("9223372036854775807"))) {
          throw new Error("BigInt parameter exceeds signed 64-bit range")
        }
        if (length === 4) writer.u32(Number(n))
        else writer.u64(n)
      }
      return
    }
    case "Bit":
      if (!nil && typeof value !== "boolean") throw new Error("Invalid bit parameter")
      writer.u8(0x68).u8(1).u8(nil ? 0 : 1)
      if (!nil) writer.u8(value ? 1 : 0)
      return
    case "DateTime2": {
      writer.u8(0x2a).u8(7).u8(nil ? 0 : 8)
      if (!nil) {
        if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
          throw new Error("Invalid datetime2 parameter")
        }
        const delta = value.getTime() - dateEpoch
        const days = Math.floor(delta / 86400000)
        if (days < 0 || days > 3652058) throw new Error("Datetime2 parameter is outside years 0001–9999")
        const ticks = BigInt(delta - days * 86400000) * BigInt(10000)
        for (let i = 0; i < 5; i++) writer.u8(Number(ticks >> BigInt(i * 8)))
        writer.u16(days).u8(days >>> 16)
      }
      return
    }
    case "UniqueIdentifier": {
      writer.u8(0x24).u8(16).u8(nil ? 0 : 16)
      if (!nil) {
        if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) {
          throw new Error("Invalid uniqueidentifier parameter")
        }
        const bytes = Uint8Array.from(value.replace(/-/g, "").match(/../g)!, (s) => Number.parseInt(s, 16))
        writer.raw(
          Uint8Array.of(
            bytes[3],
            bytes[2],
            bytes[1],
            bytes[0],
            bytes[5],
            bytes[4],
            bytes[7],
            bytes[6],
            ...bytes.subarray(8)
          )
        )
      }
      return
    }
  }
}

const headers = (transaction: Uint8Array): Writer => new Writer().u32(22).u32(18).u16(2).raw(transaction).u32(1)

/** @internal */
export const batch = (sql: string, transaction: Uint8Array): Uint8Array => headers(transaction).text(sql).result()

/** @internal */
export const rpc = (name: string, params: ReadonlyArray<BoundParameter>, transaction: Uint8Array): Uint8Array => {
  const writer = headers(transaction).u16(name.length).text(name).u16(0)
  for (const param of params) parameter(writer, param)
  return writer.result()
}

class Reader {
  offset = 0
  readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  raw(length: number): Uint8Array {
    if (length < 0 || this.offset + length > this.bytes.length) throw needMore
    const out = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    return out
  }
  u8() {
    return this.raw(1)[0]
  }
  u16() {
    const b = this.raw(2)
    return b[0] | b[1] << 8
  }
  u32() {
    const b = this.raw(4)
    return new DataView(b.buffer, b.byteOffset, 4).getUint32(0, true)
  }
  u64() {
    const b = this.raw(8)
    return new DataView(b.buffer, b.byteOffset, 8).getBigUint64(0, true)
  }
  text(length: number) {
    return utf16.decode(this.raw(length * 2))
  }
  bText() {
    return this.text(this.u8())
  }
  usText() {
    return this.text(this.u16())
  }
}

interface Column {
  readonly name: string
  readonly type: number
  readonly length: number
  readonly scale: number
  readonly utf8: boolean
}

const typeInfo = (reader: Reader, name = ""): Column => {
  const type = reader.u8()
  let length = 0
  let scale = 0
  let isUtf8 = false
  switch (type) {
    case 0x30:
      length = 1
      break
    case 0x32:
      length = 1
      break
    case 0x34:
      length = 2
      break
    case 0x38:
      length = 4
      break
    case 0x7f:
      length = 8
      break
    case 0x3b:
      length = 4
      break
    case 0x3e:
      length = 8
      break
    case 0x3c:
      length = 8
      break
    case 0x7a:
      length = 4
      break
    case 0x3a:
      length = 4
      break
    case 0x3d:
      length = 8
      break
    case 0x1f:
      break
    case 0x24:
    case 0x26:
    case 0x68:
    case 0x6d:
    case 0x6e:
    case 0x6f:
      length = reader.u8()
      break
    case 0x6a:
    case 0x6c:
      length = reader.u8()
      reader.u8()
      scale = reader.u8()
      break
    case 0x28:
      length = 3
      break
    case 0x29:
    case 0x2a:
    case 0x2b:
      scale = reader.u8()
      length = scale <= 2 ? 3 : scale <= 4 ? 4 : 5
      break
    case 0xa5:
    case 0xad:
      length = reader.u16()
      break
    case 0xa7:
    case 0xaf:
    case 0xe7:
    case 0xef: {
      length = reader.u16()
      const collation = reader.raw(5)
      isUtf8 = (collation[3] & 4) !== 0
      if ((type === 0xa7 || type === 0xaf) && !isUtf8) {
        const language = (collation[0] | collation[1] << 8) & 0x3ff
        const sortId = collation[4]
        const latinLanguages = [6, 7, 9, 10, 11, 12, 15, 16, 19, 20, 22, 29, 33, 45, 54, 56]
        if (!(sortId >= 51 && sortId <= 54) && !(sortId === 0 && latinLanguages.includes(language))) {
          throw new Error("Unsupported non-Unicode TDS collation; use nvarchar or UTF-8 varchar")
        }
      }
      break
    }
    case 0xf1:
      length = 65535
      if (reader.u8() === 1) {
        reader.bText()
        reader.bText()
        reader.usText()
      }
      break
    default:
      throw new Error(`Unsupported TDS result type 0x${type.toString(16)}`)
  }
  return { name, type, length, scale, utf8: isUtf8 }
}

const littleInteger = (bytes: Uint8Array): bigint => {
  let out = BigInt(0)
  for (let i = bytes.length - 1; i >= 0; i--) out = (out << BigInt(8)) | BigInt(bytes[i])
  return out
}

const value = (reader: Reader, column: Column): unknown => {
  const { type } = column
  if (type === 0x1f) return null
  let bytes: Uint8Array
  if (
    type === 0xa5 || type === 0xad || type === 0xa7 || type === 0xaf || type === 0xe7 || type === 0xef || type === 0xf1
  ) {
    if (column.length === 65535) {
      const length = reader.u64()
      if (length === BigInt("0xffffffffffffffff")) return null
      const chunks: Array<Uint8Array> = []
      let total = 0
      while (true) {
        const size = reader.u32()
        if (size === 0) break
        total += size
        chunks.push(reader.raw(size))
      }
      if (length !== BigInt("0xfffffffffffffffe") && BigInt(total) !== length) throw new Error("Invalid TDS PLP length")
      bytes = concat(chunks)
    } else {
      const length = reader.u16()
      if (length === 65535) return null
      bytes = reader.raw(length)
    }
    if (type === 0xa5 || type === 0xad) return bytes.slice()
    if (type === 0xe7 || type === 0xef || type === 0xf1) return utf16.decode(bytes)
    return (column.utf8 ? utf8 : new TextDecoder("windows-1252")).decode(bytes)
  }
  const nullable = [0x24, 0x26, 0x68, 0x6d, 0x6e, 0x6f, 0x6a, 0x6c, 0x28, 0x29, 0x2a, 0x2b].includes(type)
  const length = nullable ? reader.u8() : column.length
  if (nullable && length === 0) return null
  bytes = reader.raw(length)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  switch (type) {
    case 0x30:
      return bytes[0]
    case 0x34:
      return view.getInt16(0, true)
    case 0x38:
      return view.getInt32(0, true)
    case 0x7f:
      return view.getBigInt64(0, true)
    case 0x26:
      switch (length) {
        case 1:
          return bytes[0]
        case 2:
          return view.getInt16(0, true)
        case 4:
          return view.getInt32(0, true)
        case 8:
          return view.getBigInt64(0, true)
        default:
          throw new Error("Invalid TDS integer length")
      }
    case 0x32:
    case 0x68:
      return bytes[0] !== 0
    case 0x3b:
      return view.getFloat32(0, true)
    case 0x3e:
      return view.getFloat64(0, true)
    case 0x6d:
      return length === 4 ? view.getFloat32(0, true) : view.getFloat64(0, true)
    case 0x6a:
    case 0x6c: {
      const sign = bytes[0] === 0 ? "-" : ""
      const digits = littleInteger(bytes.subarray(1)).toString().padStart(column.scale + 1, "0")
      return sign + (column.scale === 0 ? digits : `${digits.slice(0, -column.scale)}.${digits.slice(-column.scale)}`)
    }
    case 0x3c:
    case 0x7a:
    case 0x6e: {
      const n = length === 4
        ? BigInt(view.getInt32(0, true))
        : BigInt(view.getInt32(0, true)) * BigInt(4294967296) + BigInt(view.getUint32(4, true))
      return Number(n) / 10000
    }
    case 0x3a:
    case 0x3d:
    case 0x6f: {
      const days = length === 4 ? view.getUint16(0, true) : view.getInt32(0, true)
      const millis = length === 4 ? view.getUint16(2, true) * 60000 : Math.round(view.getUint32(4, true) * 1000 / 300)
      return new Date(Date.UTC(1900, 0, 1) + days * 86400000 + millis)
    }
    case 0x28:
      return new Date(dateEpoch + Number(littleInteger(bytes)) * 86400000)
    case 0x29:
      return Number(littleInteger(bytes)) / 10 ** column.scale
    case 0x2a:
    case 0x2b: {
      const timeLength = column.length
      const days = Number(littleInteger(bytes.subarray(timeLength, timeLength + 3)))
      const millis = Number(littleInteger(bytes.subarray(0, timeLength))) * 1000 / 10 ** column.scale
      return new Date(dateEpoch + days * 86400000 + millis)
    }
    case 0x24: {
      const order = [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15]
      const hex = order.map((i) => bytes[i].toString(16).padStart(2, "0")).join("")
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    default:
      throw new Error(`Unsupported TDS value type 0x${type.toString(16)}`)
  }
}

/** @internal */
export class Parser {
  private pending: Uint8Array = new Uint8Array()
  columns: ReadonlyArray<Column> = []
  readonly rows: Array<ReadonlyArray<unknown>> = []
  readonly rowObjects: Array<Record<string, unknown>> = []
  readonly output: Record<string, unknown> = {}
  readonly errors: Array<ServerError> = []
  readonly notices: Array<ServerError> = []
  rowCount = BigInt(0)
  returnStatus = 0
  loginAcknowledged = false
  done = false
  doneError = false
  transaction = new Uint8Array(8)
  transactionChanged = false
  packetSize: number | undefined

  readonly maxTokenSize: number
  readonly collect: boolean
  constructor(maxTokenSize = 16 * 1024 * 1024, collect = true) {
    this.maxTokenSize = maxTokenSize
    this.collect = collect
  }

  feed(bytes: Uint8Array, end = false): ReadonlyArray<Record<string, unknown>> {
    this.pending = concat([this.pending, bytes])
    const reader = new Reader(this.pending)
    const emitted: Array<Record<string, unknown>> = []
    while (reader.offset < reader.bytes.length) {
      const start = reader.offset
      try {
        const row = this.token(reader)
        if (reader.offset - start > this.maxTokenSize) throw new Error("TDS token exceeds maximum size")
        if (row !== undefined) emitted.push(row)
      } catch (cause) {
        if (cause !== needMore) throw cause
        reader.offset = start
        break
      }
    }
    this.pending = this.pending.subarray(reader.offset)
    if (this.pending.length > this.maxTokenSize) throw new Error("TDS token exceeds maximum size")
    if (end && this.pending.length !== 0) throw new Error("Truncated TDS response token")
    return emitted
  }

  private token(reader: Reader): Record<string, unknown> | undefined {
    const token = reader.u8()
    switch (token) {
      case 0x81: {
        const count = reader.u16()
        if (count === 65535) return
        const columns: Array<Column> = []
        for (let i = 0; i < count; i++) {
          reader.u32()
          reader.u16()
          const column = typeInfo(reader)
          columns.push({ ...column, name: reader.bText() })
        }
        this.columns = columns
        return
      }
      case 0xd1:
      case 0xd2: {
        const bitmap = token === 0xd2 ? reader.raw(Math.ceil(this.columns.length / 8)) : undefined
        const values = this.columns.map((column, i) =>
          bitmap !== undefined && (bitmap[i >>> 3] & (1 << (i & 7))) !== 0 ? null : value(reader, column)
        )
        const object: Record<string, unknown> = {}
        for (let i = 0; i < values.length; i++) {
          Object.defineProperty(object, this.columns[i].name, {
            value: values[i],
            enumerable: true,
            writable: true,
            configurable: true
          })
        }
        if (this.collect) {
          this.rows.push(values)
          this.rowObjects.push(object)
        }
        return object
      }
      case 0xfd:
      case 0xfe:
      case 0xff: {
        const status = reader.u16()
        reader.u16()
        const count = reader.u64()
        if ((status & 0x10) !== 0) this.rowCount += count
        this.doneError = this.doneError || (status & 0x102) !== 0
        if ((status & 1) === 0 && token !== 0xff) this.done = true
        return
      }
      case 0xaa:
      case 0xab: {
        const sub = new Reader(reader.raw(reader.u16()))
        const detail = {
          number: sub.u32(),
          state: sub.u8(),
          severity: sub.u8(),
          message: sub.usText(),
          server: sub.bText(),
          procedure: sub.bText(),
          line: sub.u32()
        }
        ;(token === 0xaa ? this.errors : this.notices).push(detail)
        return
      }
      case 0xe3: {
        const sub = new Reader(reader.raw(reader.u16()))
        const kind = sub.u8()
        if (kind === 8 || kind === 9 || kind === 10) {
          const next = sub.raw(sub.u8())
          this.transaction = kind === 8 ? next.slice() : new Uint8Array(8)
          this.transactionChanged = true
        } else if (kind === 4) this.packetSize = Number(sub.bText())
        else if (kind === 20) throw new Error("SQL Server routing requires reconnecting to the routed endpoint")
        return
      }
      case 0xad:
        reader.raw(reader.u16())
        this.loginAcknowledged = true
        return
      case 0x79:
        this.returnStatus = reader.u32() | 0
        return
      case 0xac: {
        reader.u16()
        const name = reader.bText().replace(/^@/, "")
        reader.u8()
        reader.u32()
        reader.u16()
        const column = typeInfo(reader)
        const out = value(reader, column)
        Object.defineProperty(this.output, name, { value: out, enumerable: true, configurable: true, writable: true })
        return
      }
      case 0xa9:
      case 0xa4:
      case 0xa5:
      case 0xed:
        reader.raw(reader.u16())
        return
      case 0xe4: {
        while (true) {
          const id = reader.u8()
          if (id === 255) return
          reader.raw(reader.u32())
        }
      }
      case 0xee:
        reader.raw(reader.u32())
        return
      default:
        throw new Error(`Unsupported TDS response token 0x${token.toString(16)}`)
    }
  }
}
