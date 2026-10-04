/** @internal */
import * as Effect from "../../Effect.ts"
import type * as SocketConnector from "../../socket/SocketConnector.ts"
import { ConnectionError, SqlError } from "../../sql/SqlError.ts"

export const encoder = new TextEncoder()
export const decoder = new TextDecoder()
export const concat = (...parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}
export const protocolError = (message: string, cause?: unknown): SqlError =>
  new SqlError({
    reason: new ConnectionError({ message: `MySQL: ${message}`, cause, operation: "protocol" })
  })
export class Reader {
  offset = 0
  readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  get remaining() {
    return this.bytes.length - this.offset
  }
  take(n: number): Uint8Array {
    if (!Number.isSafeInteger(n) || n < 0 || n > this.remaining) throw protocolError("Truncated packet")
    const bytes = this.bytes.subarray(this.offset, this.offset + n)
    this.offset += n
    return bytes
  }
  u8() {
    return this.take(1)[0]
  }
  u16() {
    const b = this.take(2)
    return b[0] + b[1] * 256
  }
  u24() {
    const b = this.take(3)
    return b[0] + b[1] * 256 + b[2] * 65536
  }
  u32() {
    const b = this.take(4)
    return new DataView(b.buffer, b.byteOffset, 4).getUint32(0, true)
  }
  u64() {
    const b = this.take(8)
    return new DataView(b.buffer, b.byteOffset, 8).getBigUint64(0, true)
  }
  nul() {
    const i = this.bytes.indexOf(0, this.offset)
    if (i < 0) throw protocolError("Unterminated string")
    const b = this.take(i - this.offset)
    this.offset++
    return decoder.decode(b)
  }
  len(): number | bigint | null {
    const n = this.u8()
    if (n < 251) return n
    if (n === 251) return null
    if (n === 252) return this.u16()
    if (n === 253) return this.u24()
    if (n === 254) return this.u64()
    throw protocolError("Invalid length encoded integer")
  }
  field(): Uint8Array | null {
    const n = this.len()
    return n === null ? null : this.take(Number(n))
  }
  text() {
    const bytes = this.field()
    return bytes === null ? null : decoder.decode(bytes)
  }
}
export const u32 = (n: number): Uint8Array => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}
export const lengthEncoded = (bytes: Uint8Array): Uint8Array => {
  const n = bytes.length
  let prefix: Uint8Array
  if (n < 251) prefix = Uint8Array.of(n)
  else if (n < 65536) prefix = Uint8Array.of(252, n & 255, n >>> 8)
  else if (n < 0x1000000) prefix = Uint8Array.of(253, n & 255, (n >>> 8) & 255, n >>> 16)
  else {
    prefix = new Uint8Array(9)
    prefix[0] = 254
    new DataView(prefix.buffer).setBigUint64(1, BigInt(n), true)
  }
  return concat(prefix, bytes)
}

export const frame = (payload: Uint8Array, sequence: number): Uint8Array =>
  concat(
    Uint8Array.of(payload.length & 255, (payload.length >>> 8) & 255, payload.length >>> 16, sequence & 255),
    payload
  )
export const packetIO = (socket: SocketConnector.Connection, maxPacketSize: number) => {
  let buffer: Uint8Array = new Uint8Array(0)
  let sequence = 0
  const read = Effect.gen(function*() {
    const fragments: Array<Uint8Array> = []
    let total = 0
    while (true) {
      while (buffer.length < 4) {
        const chunks = yield* socket.pull.pipe(Effect.mapError((cause) => protocolError("Socket read failed", cause)))
        buffer = concat(buffer, ...chunks.map((c) => typeof c === "string" ? encoder.encode(c) : c))
      }
      const n = buffer[0] + buffer[1] * 256 + buffer[2] * 65536
      if (buffer[3] !== (sequence & 255)) return yield* Effect.fail(protocolError("Unexpected packet sequence"))
      if (total + n > maxPacketSize) return yield* Effect.fail(protocolError("Packet size limit exceeded"))
      while (buffer.length < n + 4) {
        const chunks = yield* socket.pull.pipe(Effect.mapError((cause) => protocolError("Socket read failed", cause)))
        buffer = concat(buffer, ...chunks.map((c) => typeof c === "string" ? encoder.encode(c) : c))
      }
      fragments.push(buffer.slice(4, n + 4))
      buffer = buffer.slice(n + 4)
      total += n
      sequence++
      if (n !== 0xffffff) return concat(...fragments)
    }
  })
  const write = (payload: Uint8Array) =>
    Effect.gen(function*() {
      if (payload.length > maxPacketSize) return yield* Effect.fail(protocolError("Packet size limit exceeded"))
      const frames: Array<Uint8Array> = []
      let offset = 0
      do {
        const part = payload.subarray(offset, offset + 0xffffff)
        frames.push(frame(part, sequence++))
        offset += part.length
        if (part.length < 0xffffff) break
      } while (offset <= payload.length)
      yield* socket.writeAll(frames as [Uint8Array, ...Array<Uint8Array>]).pipe(
        Effect.mapError((cause) => protocolError("Socket write failed", cause))
      )
    })
  return {
    read,
    write,
    reset: () => {
      sequence = 0
    }
  }
}
export interface Column {
  readonly name: string
  readonly type: number
  readonly flags: number
  readonly charset: number
}
export const column = (packet: Uint8Array): Column => {
  const r = new Reader(packet)
  r.text()
  r.text()
  r.text()
  r.text()
  const name = r.text()!
  r.text()
  r.len()
  const charset = r.u16()
  r.u32()
  const type = r.u8()
  const flags = r.u16()
  return { name, type, flags, charset }
}
const numeric = new Set([1, 2, 3, 4, 5, 8, 9, 13])
export const textValue = (bytes: Uint8Array | null, c: Column): unknown => {
  if (bytes === null) return null
  const text = decoder.decode(bytes)
  if (numeric.has(c.type)) {
    if (c.type === 8) {
      const n = Number(text)
      return Number.isSafeInteger(n) ? n : text
    }
    return Number(text)
  }
  if (c.type === 245) return JSON.parse(text)
  if (c.type === 16 || (c.charset === 63 && [249, 250, 251, 252, 253, 254].includes(c.type))) return bytes.slice()
  if ([7, 10, 12, 14].includes(c.type)) {
    return new Date(text.replace(" ", "T") + (c.type === 10 || c.type === 14 ? "T00:00:00" : ""))
  }
  return text
}
export const textRow = (packet: Uint8Array, columns: ReadonlyArray<Column>): Array<unknown> => {
  const r = new Reader(packet)
  const values = columns.map((c) => textValue(r.field(), c))
  if (r.remaining !== 0) throw protocolError("Unexpected row data")
  return values
}
export const binaryRow = (packet: Uint8Array, columns: ReadonlyArray<Column>): Array<unknown> => {
  const r = new Reader(packet)
  if (r.u8() !== 0) throw protocolError("Invalid binary row")
  const nulls = r.take(Math.floor((columns.length + 9) / 8))
  const values = columns.map((c, i) => {
    if ((nulls[Math.floor((i + 2) / 8)] & (1 << ((i + 2) % 8))) !== 0) return null
    const signed = (c.flags & 32) === 0
    switch (c.type) {
      case 1: {
        const n = r.u8()
        return signed && n > 127 ? n - 256 : n
      }
      case 2:
      case 13: {
        const n = r.u16()
        return signed && n > 32767 ? n - 65536 : n
      }
      case 3:
      case 9: {
        const n = r.u32()
        return signed && n > 2147483647 ? n - 4294967296 : n
      }
      case 8: {
        let n = r.u64()
        if (signed && n > BigInt("9223372036854775807")) n -= BigInt("18446744073709551616")
        const value = Number(n)
        return Number.isSafeInteger(value) ? value : String(n)
      }
      case 4: {
        const b = r.take(4)
        return new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, true)
      }
      case 5: {
        const b = r.take(8)
        return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, true)
      }
      case 7:
      case 10:
      case 12:
      case 14: {
        const len = r.u8()
        if (len === 0) return new Date(NaN)
        const date = new Reader(r.take(len))
        const year = date.u16()
        const month = date.u8()
        const day = date.u8()
        const hour = len >= 7 ? date.u8() : 0
        const minute = len >= 7 ? date.u8() : 0
        const second = len >= 7 ? date.u8() : 0
        const ms = len === 11 ? date.u32() / 1000 : 0
        return new Date(year, month - 1, day, hour, minute, second, ms)
      }
      case 11: {
        const len = r.u8()
        if (len === 0) return "00:00:00"
        const time = new Reader(r.take(len))
        const negative = time.u8() !== 0
        const days = time.u32()
        const hours = time.u8() + days * 24
        const minutes = time.u8()
        const seconds = time.u8()
        const micros = len === 12 ? time.u32() : 0
        return `${negative ? "-" : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${
          String(seconds).padStart(2, "0")
        }${micros ? `.${String(micros).padStart(6, "0")}` : ""}`
      }
      case 6:
        return null
      default:
        return textValue(r.field(), c)
    }
  })
  if (r.remaining !== 0) throw protocolError("Unexpected binary row data")
  return values
}
export const executePacket = (id: number, params: ReadonlyArray<unknown>): Uint8Array => {
  const nulls = new Uint8Array(Math.ceil(params.length / 8))
  const types: Array<number> = []
  const values: Array<Uint8Array> = []
  params.forEach((value, i) => {
    if (value === null || value === undefined) {
      nulls[i >>> 3] |= 1 << (i & 7)
      types.push(6, 0)
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) throw protocolError("Non-finite parameter")
      types.push(5, 0)
      const b = new Uint8Array(8)
      new DataView(b.buffer).setFloat64(0, value, true)
      values.push(b)
    } else if (
      typeof value === "bigint" && value >= BigInt("-9223372036854775808") && value <= BigInt("18446744073709551615")
    ) {
      const unsigned = value >= BigInt(0)
      types.push(8, unsigned ? 128 : 0)
      const bytes = new Uint8Array(8)
      if (unsigned) new DataView(bytes.buffer).setBigUint64(0, value, true)
      else new DataView(bytes.buffer).setBigInt64(0, value, true)
      values.push(bytes)
    } else if (typeof value === "boolean") {
      types.push(1, 0)
      values.push(Uint8Array.of(value ? 1 : 0))
    } else if (value instanceof Uint8Array) {
      types.push(252, 0)
      values.push(lengthEncoded(value))
    } else if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) throw protocolError("Invalid date parameter")
      types.push(12, 0)
      const b = new Uint8Array(12)
      const view = new DataView(b.buffer)
      b[0] = 11
      view.setUint16(1, value.getFullYear(), true)
      b[3] = value.getMonth() + 1
      b[4] = value.getDate()
      b[5] = value.getHours()
      b[6] = value.getMinutes()
      b[7] = value.getSeconds()
      view.setUint32(8, value.getMilliseconds() * 1000, true)
      values.push(b)
    } else {
      types.push(253, 0)
      const text = typeof value === "string" || typeof value === "bigint" ? String(value) : JSON.stringify(value)
      values.push(lengthEncoded(encoder.encode(text)))
    }
  })
  return concat(
    Uint8Array.of(23),
    u32(id),
    Uint8Array.of(0),
    u32(1),
    params.length ? concat(nulls, Uint8Array.of(1), Uint8Array.from(types), ...values) : new Uint8Array(0)
  )
}
const literal = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw protocolError("Non-finite parameter")
    return String(value)
  }
  if (typeof value === "bigint") return String(value)
  if (typeof value === "boolean") return value ? "1" : "0"
  const bytes = value instanceof Uint8Array
    ? value
    : encoder.encode(
      value instanceof Date
        ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${
          String(value.getDate()).padStart(2, "0")
        } ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${
          String(value.getSeconds()).padStart(2, "0")
        }.${String(value.getMilliseconds()).padStart(3, "0")}`
        : typeof value === "string"
        ? value
        : JSON.stringify(value)
    )
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return value instanceof Uint8Array ? `X'${hex}'` : `CONVERT(X'${hex}' USING utf8mb4)`
}
export const interpolate = (sql: string, params: ReadonlyArray<unknown>): string => {
  let result = ""
  let index = 0
  let quote = ""
  let line = false
  let block = false
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    const next = sql[i + 1]
    if (line) {
      result += c
      if (c === "\n") line = false
      continue
    }
    if (block) {
      result += c
      if (c === "*" && next === "/") {
        result += next
        i++
        block = false
      }
      continue
    }
    if (quote) {
      result += c
      if (c === "\\") {
        result += next ?? ""
        i++
      } else if (c === quote) {
        if (next === quote) {
          result += next
          i++
        } else quote = ""
      }
      continue
    }
    if (c === "'" || c === "\"" || c === "`") {
      quote = c
      result += c
    } else if (c === "#" || (c === "-" && next === "-" && /\s/.test(sql[i + 2] ?? ""))) {
      line = true
      result += c
    } else if (c === "/" && next === "*") {
      block = true
      result += c
    } else if (c === "?") {
      if (index >= params.length) throw protocolError("Missing query parameter")
      result += literal(params[index++])
    } else result += c
  }
  if (index !== params.length) throw protocolError("Too many query parameters")
  return result
}
