import * as Iconv from "iconv-lite"
import { Buffer } from "node:buffer"
import { encoding } from "./tdsCollation.ts"
import { ProtocolError } from "./tdsPacket.ts"

const incomplete = Symbol("incomplete")

export class Reader {
  offset = 0
  readonly data: Buffer
  readonly bounded: boolean
  constructor(data: Buffer, bounded = false) {
    this.data = data
    this.bounded = bounded
  }
  take(size: number): Buffer {
    if (size < 0 || !Number.isSafeInteger(size)) throw new ProtocolError("Invalid TDS value length")
    if (this.offset + size > this.data.length) {
      if (this.bounded) throw new ProtocolError("Malformed length-delimited TDS token")
      throw incomplete
    }
    const result = this.data.subarray(this.offset, this.offset + size)
    this.offset += size
    return result
  }
  u8(): number {
    return this.take(1)[0]
  }
  u16(): number {
    return this.take(2).readUInt16LE(0)
  }
  u32(): number {
    return this.take(4).readUInt32LE(0)
  }
  bString(): string {
    return this.take(this.u8() * 2).toString("utf16le")
  }
  usString(): string {
    return this.take(this.u16() * 2).toString("utf16le")
  }
}

export interface Column {
  readonly name: string
  readonly type: number
  readonly length: number
  readonly scale: number
  readonly precision: number
  readonly collation?: Buffer | undefined
}

export interface ServerError {
  readonly number: number
  readonly state: number
  readonly class: number
  readonly message: string
  readonly serverName: string
  readonly procName: string
  readonly lineNumber: number
}

export type Token =
  | { readonly _tag: "Metadata"; readonly columns: ReadonlyArray<Column> }
  | { readonly _tag: "Row"; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "Done"; readonly kind: number; readonly status: number; readonly rowCount: bigint }
  | { readonly _tag: "Error" | "Info"; readonly error: ServerError }
  | { readonly _tag: "EnvChange"; readonly data: Buffer }
  | { readonly _tag: "LoginAck"; readonly version: number }
  | { readonly _tag: "ReturnStatus"; readonly value: number }
  | { readonly _tag: "ReturnValue"; readonly name: string; readonly value: unknown }
  | { readonly _tag: "Sspi"; readonly data: Buffer }
  | { readonly _tag: "Ignored" }

const fixedSizes: Readonly<Record<number, number>> = {
  0x1f: 0,
  0x30: 1,
  0x32: 1,
  0x34: 2,
  0x38: 4,
  0x3a: 4,
  0x3b: 4,
  0x3c: 8,
  0x3d: 8,
  0x3e: 8,
  0x7a: 4,
  0x7f: 8
}

export const metadata = (r: Reader): Column => {
  r.u32() // user type
  const flags = r.u16()
  if (flags & 0x0800) throw new ProtocolError("Encrypted column metadata is not supported")
  const type = r.u8()
  let length = fixedSizes[type] ?? 0
  let scale = 0
  let precision = 0
  let collation: Buffer | undefined
  if (type in fixedSizes || type === 0x28) {
    // Fixed types and DATE have no additional metadata.
  } else if ([0x24, 0x26, 0x68, 0x6d, 0x6e, 0x6f].includes(type)) {
    length = r.u8()
  } else if (type === 0x6a || type === 0x6c) {
    length = r.u8()
    precision = r.u8()
    scale = r.u8()
    if (precision < 1 || precision > 38 || scale > precision) throw new ProtocolError("Invalid decimal metadata")
  } else if (type === 0x29 || type === 0x2a || type === 0x2b) {
    scale = r.u8()
    if (scale > 7) throw new ProtocolError("Invalid time scale")
  } else if ([0xa5, 0xad, 0xa7, 0xaf, 0xe7, 0xef].includes(type)) {
    length = r.u16()
    if ([0xa7, 0xaf, 0xe7, 0xef].includes(type)) collation = Buffer.from(r.take(5))
  } else if ([0x22, 0x23, 0x63].includes(type)) {
    length = r.u32()
    if (type !== 0x22) collation = Buffer.from(r.take(5))
  } else if (type === 0xf1) {
    length = 0xffff
    if (r.u8() === 1) {
      r.bString()
      r.bString()
      r.usString()
    }
  } else if (type === 0xf0) {
    length = r.u16()
    r.bString()
    r.bString()
    r.bString()
    r.usString()
  } else if (type === 0x62) {
    length = r.u32()
  } else {
    throw new ProtocolError(`Unsupported TDS type 0x${type.toString(16)}`)
  }
  return { name: "", type, length, scale, precision, collation }
}

const dateEpoch = -62135596800000
const datetimeEpoch = -2208988800000

const characters = (data: Buffer, column: Column): string => {
  if ([0xe7, 0xef, 0x63, 0xf1].includes(column.type)) {
    if (data.length % 2 !== 0) throw new ProtocolError("Odd UTF-16 value length")
    return data.toString("utf16le")
  }
  const collation = column.collation
  if (!collation) throw new ProtocolError("Missing character collation")
  const codepage = encoding(collation)
  if (!codepage) throw new ProtocolError("Unsupported SQL Server collation")
  return Iconv.decode(data, codepage)
}

const plp = (r: Reader, maxValueSize: number): Buffer | null => {
  const length = r.take(8).readBigUInt64LE(0)
  if (length === BigInt("18446744073709551615")) return null
  const unknown = length === BigInt("18446744073709551614")
  if (!unknown && length > BigInt(maxValueSize)) throw new ProtocolError("TDS value exceeds configured size limit")
  const chunks: Array<Buffer> = []
  let total = 0
  while (true) {
    const size = r.u32()
    if (size === 0) break
    total += size
    if (total > maxValueSize || (!unknown && BigInt(total) > length)) {
      throw new ProtocolError("Invalid PLP chunk length")
    }
    chunks.push(r.take(size))
  }
  if (!unknown && BigInt(total) !== length) throw new ProtocolError("PLP total length mismatch")
  return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total)
}

const sized = (data: Buffer, sizes: ReadonlyArray<number>): void => {
  if (!sizes.includes(data.length)) throw new ProtocolError(`Invalid TDS value size ${data.length}`)
}

export const value = (r: Reader, c: Column, maxValueSize: number): unknown => {
  const type = c.type
  let data: Buffer | null
  if (type in fixedSizes) {
    data = r.take(fixedSizes[type])
  } else if (type === 0xf1 || type === 0xf0 || c.length === 0xffff) {
    data = plp(r, maxValueSize)
  } else if ([0xa5, 0xad, 0xa7, 0xaf, 0xe7, 0xef].includes(type)) {
    const length = r.u16()
    if (length === 0xffff) return null
    if (length > c.length) throw new ProtocolError("Value exceeds column length")
    data = r.take(length)
  } else if ([0x22, 0x23, 0x63].includes(type)) {
    const pointerLength = r.u8()
    if (pointerLength === 0) return null
    r.take(pointerLength + 8)
    const length = r.u32()
    if (length > maxValueSize) throw new ProtocolError("TDS value exceeds configured size limit")
    data = r.take(length)
  } else if (type === 0x62) {
    const length = r.u32()
    if (length === 0) return null
    if (length > 8016) throw new ProtocolError("SQL_VARIANT exceeds type size limit")
    const variant = new Reader(r.take(length), true)
    const baseType = variant.u8()
    const properties = new Reader(variant.take(variant.u8()), true)
    let column: Column = { name: "", type: baseType, length: fixedSizes[baseType] ?? 0, scale: 0, precision: 0 }
    if (baseType === 0x6a || baseType === 0x6c) {
      column = { ...column, precision: properties.u8(), scale: properties.u8() }
    } else if ([0x29, 0x2a, 0x2b].includes(baseType)) {
      column = { ...column, scale: properties.u8() }
    } else if ([0xa7, 0xaf, 0xe7, 0xef].includes(baseType)) {
      column = { ...column, collation: Buffer.from(properties.take(5)), length: properties.u16() }
    } else if ([0xa5, 0xad].includes(baseType)) {
      column = { ...column, length: properties.u16() }
    } else if (!(baseType in fixedSizes) && baseType !== 0x24 && baseType !== 0x28) {
      throw new ProtocolError("Invalid SQL_VARIANT base type")
    }
    if (properties.offset !== properties.data.length) throw new ProtocolError("Invalid SQL_VARIANT properties")
    const body = variant.take(variant.data.length - variant.offset)
    let prefix = Buffer.alloc(0)
    if ([0xa5, 0xad, 0xa7, 0xaf, 0xe7, 0xef].includes(baseType)) {
      prefix = Buffer.alloc(2)
      prefix.writeUInt16LE(body.length)
    } else if (!(baseType in fixedSizes)) prefix = Buffer.from([body.length])
    const reader = new Reader(Buffer.concat([prefix, body]), true)
    const result = value(reader, column, maxValueSize)
    if (reader.offset !== reader.data.length) throw new ProtocolError("SQL_VARIANT length mismatch")
    return result
  } else {
    const length = r.u8()
    if (length === 0) return null
    data = r.take(length)
  }
  if (data === null) return null
  switch (type) {
    case 0x1f:
      return null
    case 0x30:
      return data[0]
    case 0x34:
      return data.readInt16LE(0)
    case 0x38:
      return data.readInt32LE(0)
    case 0x7f:
      return data.readBigInt64LE(0).toString()
    case 0x26:
      sized(data, [1, 2, 4, 8])
      return data.length === 8 ?
        data.readBigInt64LE(0).toString() :
        data.length === 1
        ? data[0]
        : data.readIntLE(0, data.length)
    case 0x32:
    case 0x68:
      sized(data, [1])
      return data[0] !== 0
    case 0x3b:
      return data.readFloatLE(0)
    case 0x3e:
      return data.readDoubleLE(0)
    case 0x6d:
      sized(data, [4, 8])
      return data.length === 4 ? data.readFloatLE(0) : data.readDoubleLE(0)
    case 0x7a:
    case 0x3c:
    case 0x6e:
      sized(data, [4, 8])
      return data.length === 4 ?
        data.readInt32LE(0) / 10000 :
        (data.readInt32LE(0) * 0x100000000 + data.readUInt32LE(4)) / 10000
    case 0x6a:
    case 0x6c: {
      sized(data, [5, 9, 13, 17])
      let n = BigInt("0")
      for (let i = data.length - 1; i > 0; i--) n = (n << BigInt("8")) | BigInt(data[i])
      if (data[0] > 1) throw new ProtocolError("Invalid decimal sign")
      return Number(n) / 10 ** c.scale * (data[0] === 0 ? -1 : 1)
    }
    case 0x24: {
      sized(data, [16])
      const hex = data.toString("hex").toUpperCase()
      return `${hex.slice(6, 8)}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}-${hex.slice(10, 12)}${
        hex.slice(8, 10)
      }-${hex.slice(14, 16)}${hex.slice(12, 14)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    case 0x3a:
    case 0x3d:
    case 0x6f:
      sized(data, [4, 8])
      return data.length === 4 ?
        new Date(datetimeEpoch + data.readUInt16LE(0) * 86400000 + data.readUInt16LE(2) * 60000) :
        new Date(datetimeEpoch + data.readInt32LE(0) * 86400000 + Math.round(data.readUInt32LE(4) * 10 / 3))
    case 0x28:
      sized(data, [3])
      return new Date(dateEpoch + data.readUIntLE(0, 3) * 86400000)
    case 0x29:
    case 0x2a:
    case 0x2b: {
      const timeLength = c.scale <= 2 ? 3 : c.scale <= 4 ? 4 : 5
      sized(data, [timeLength + (type === 0x29 ? 0 : type === 0x2a ? 3 : 5)])
      const time = data.readUIntLE(0, timeLength) / 10 ** c.scale * 1000
      const days = type === 0x29 ? 0 : data.readUIntLE(timeLength, 3)
      // DATETIMEOFFSET's date/time fields are already UTC on the wire.
      return new Date((type === 0x29 ? 0 : dateEpoch) + days * 86400000 + Math.floor(time))
    }
    case 0xa7:
    case 0xaf:
    case 0xe7:
    case 0xef:
    case 0x23:
    case 0x63:
    case 0xf1:
      return characters(data, c)
    case 0xa5:
    case 0xad:
    case 0x22:
    case 0xf0:
      return Buffer.from(data)
    default:
      throw new ProtocolError(`Unsupported value type ${type}`)
  }
}

/** Incremental token decoder. Buffer capacity grows geometrically under fragmentation. */
export class TokenParser {
  private buffer = Buffer.alloc(4096)
  private start = 0
  private endOffset = 0
  columns: ReadonlyArray<Column> | undefined

  readonly maxTokenSize: number
  constructor(maxTokenSize = 16 * 1024 * 1024) {
    if (!Number.isSafeInteger(maxTokenSize) || maxTokenSize < 1) throw new ProtocolError("Invalid token size limit")
    this.maxTokenSize = maxTokenSize
  }

  push(chunk: Buffer, consume: (token: Token) => void): void {
    // Process bounded pieces so a large socket chunk of small rows does not
    // count as one oversized token.
    for (let offset = 0; offset < chunk.length;) {
      const pending = this.endOffset - this.start
      const size = Math.min(chunk.length - offset, this.maxTokenSize - pending)
      if (size === 0) throw new ProtocolError("TDS token exceeds configured size limit")
      if (this.endOffset + size > this.buffer.length) {
        if (pending + size <= this.buffer.length) {
          this.buffer.copyWithin(0, this.start, this.endOffset)
        } else {
          const next = Buffer.allocUnsafe(Math.min(this.maxTokenSize, Math.max(this.buffer.length * 2, pending + size)))
          this.buffer.copy(next, 0, this.start, this.endOffset)
          this.buffer = next
        }
        this.start = 0
        this.endOffset = pending
      }
      chunk.copy(this.buffer, this.endOffset, offset, offset + size)
      this.endOffset += size
      offset += size
      while (this.start < this.endOffset) {
        const reader = new Reader(this.buffer.subarray(this.start, this.endOffset))
        let token: Token
        try {
          token = this.read(reader)
        } catch (error) {
          if (error === incomplete) break
          throw error
        }
        this.start += reader.offset
        if (token._tag === "Metadata") this.columns = token.columns
        consume(token)
      }
      if (this.start === this.endOffset) this.start = this.endOffset = 0
    }
  }

  end(): void {
    if (this.start !== this.endOffset) throw new ProtocolError("Truncated TDS token at end of message")
  }

  private read(r: Reader): Token {
    const kind = r.u8()
    switch (kind) {
      case 0x81: {
        const count = r.u16()
        if (count === 0xffff) return { _tag: "Ignored" }
        const columns: Array<Column> = []
        for (let i = 0; i < count; i++) {
          const column = metadata(r)
          if ([0x22, 0x23, 0x63].includes(column.type)) {
            const parts = r.u8()
            for (let p = 0; p < parts; p++) r.usString()
          }
          columns.push({ ...column, name: r.bString() })
        }
        return { _tag: "Metadata", columns }
      }
      case 0xd1:
      case 0xd2: {
        const columns = this.columns
        if (!columns) throw new ProtocolError("ROW received before COLMETADATA")
        const nulls = kind === 0xd2 ? r.take(Math.ceil(columns.length / 8)) : undefined
        const values = new Array<unknown>(columns.length)
        for (let i = 0; i < columns.length; i++) {
          values[i] = nulls && (nulls[i >> 3] & (1 << (i & 7))) !== 0 ? null : value(r, columns[i], this.maxTokenSize)
        }
        return { _tag: "Row", values }
      }
      case 0xfd:
      case 0xfe:
      case 0xff: {
        const body = r.take(12)
        return { _tag: "Done", kind, status: body.readUInt16LE(0), rowCount: body.readBigUInt64LE(4) }
      }
      case 0xaa:
      case 0xab: {
        const body = new Reader(r.take(r.u16()), true)
        const error = {
          number: body.u32(),
          state: body.u8(),
          class: body.u8(),
          message: body.usString(),
          serverName: body.bString(),
          procName: body.bString(),
          lineNumber: body.u32()
        }
        return { _tag: kind === 0xaa ? "Error" : "Info", error }
      }
      case 0xe3:
        return { _tag: "EnvChange", data: Buffer.from(r.take(r.u16())) }
      case 0xad: {
        const body = new Reader(r.take(r.u16()), true)
        body.u8()
        const version = body.take(4).readUInt32BE(0)
        body.bString()
        body.take(4)
        return { _tag: "LoginAck", version }
      }
      case 0x79:
        return { _tag: "ReturnStatus", value: r.take(4).readInt32LE(0) }
      case 0xac: {
        r.u16()
        const name = r.bString()
        r.u8()
        const column = metadata(r)
        return {
          _tag: "ReturnValue",
          name: name.startsWith("@") ? name.slice(1) : name,
          value: value(r, column, this.maxTokenSize)
        }
      }
      case 0xed:
        return { _tag: "Sspi", data: Buffer.from(r.take(r.u16())) }
      case 0xa4:
      case 0xa5:
      case 0xa9:
        r.take(r.u16())
        return { _tag: "Ignored" }
      case 0xe4:
      case 0xee:
        r.take(r.u32())
        return { _tag: "Ignored" }
      case 0xae:
        while (r.u8() !== 0xff) r.take(r.u32())
        return { _tag: "Ignored" }
      default:
        throw new ProtocolError(`Unexpected TDS token 0x${kind.toString(16)}`)
    }
  }
}
