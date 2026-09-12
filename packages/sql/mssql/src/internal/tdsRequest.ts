import * as Iconv from "iconv-lite"
import { Buffer } from "node:buffer"
import { encoding } from "./tdsCollation.ts"
import { allHeaders, ProtocolError } from "./tdsPacket.ts"

export interface ParameterOptions {
  readonly length?: number | undefined
  readonly precision?: number | undefined
  readonly scale?: number | undefined
}

export interface DataType {
  readonly name: string
  readonly id: number
  readonly validate: (value: unknown, collation?: unknown) => unknown
}

const type = (name: string, id: number): DataType => ({ name, id, validate: (value) => value ?? null })

export const TYPES = {
  TinyInt: type("TinyInt", 0x30),
  SmallInt: type("SmallInt", 0x34),
  Int: type("Int", 0x38),
  BigInt: type("BigInt", 0x7f),
  Bit: type("Bit", 0x32),
  Real: type("Real", 0x3b),
  Float: type("Float", 0x3e),
  NVarChar: type("NVarChar", 0xe7),
  NChar: type("NChar", 0xef),
  VarChar: type("VarChar", 0xa7),
  Char: type("Char", 0xaf),
  VarBinary: type("VarBinary", 0xa5),
  Binary: type("Binary", 0xad),
  Date: type("Date", 0x28),
  Time: type("Time", 0x29),
  DateTime: type("DateTime", 0x3d),
  DateTime2: type("DateTime2", 0x2a),
  DateTimeOffset: type("DateTimeOffset", 0x2b),
  SmallDateTime: type("SmallDateTime", 0x3a),
  UniqueIdentifier: type("UniqueIdentifier", 0x24),
  Decimal: type("Decimal", 0x6a),
  Numeric: type("Numeric", 0x6c),
  Money: type("Money", 0x3c),
  SmallMoney: type("SmallMoney", 0x7a),
  Text: type("Text", 0x23),
  NText: type("NText", 0x63),
  Image: type("Image", 0x22),
  Xml: type("Xml", 0xf1),
  TVP: type("TVP", 0xf3),
  UDT: type("UDT", 0xf0),
  Variant: type("Variant", 0x62)
} as const

export interface Table {
  readonly name: string
  readonly schema?: string | undefined
  readonly columns: ReadonlyArray<ParameterOptions & { readonly name: string; readonly type: DataType }>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
}

const table = (value: unknown): Table => {
  if (
    typeof value !== "object" || value === null || !("columns" in value) || !("rows" in value) ||
    !Array.isArray(value.columns) || !Array.isArray(value.rows) || !("name" in value) || typeof value.name !== "string"
  ) {
    throw new ProtocolError("Expected a named table-valued parameter with columns and rows")
  }
  if (value.columns.length > 1024) throw new ProtocolError("TVP exceeds column limit")
  return value as unknown as Table
}

const identifier = (name: string): string => {
  if (name.length === 0 || name.length > 128 || name.includes("\0")) {
    throw new ProtocolError("Invalid SQL type identifier")
  }
  return `[${name.replaceAll("]", "]]")}]`
}

export interface Parameter {
  readonly name: string
  readonly type: DataType
  readonly value: unknown
  readonly options?: ParameterOptions | undefined
  readonly output?: boolean | undefined
}

const u16 = (n: number): Buffer => {
  const b = Buffer.allocUnsafe(2)
  b.writeUInt16LE(n)
  return b
}

const integer = (value: unknown, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ProtocolError(`Expected integer between ${min} and ${max}`)
  }
  return value
}

const number = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ProtocolError("Expected a finite number")
  return value
}

const date = (value: unknown): Date => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new ProtocolError("Expected a valid Date")
  return value
}

export const declaration = (p: Parameter): string => {
  const name = p.type.name.toLowerCase()
  const options = p.options ?? {}
  if (name === "tvp") {
    const t = table(p.value)
    return `${identifier(t.schema ?? "dbo")}.${identifier(t.name)} READONLY`
  }
  if (["nvarchar", "nchar", "varchar", "char", "varbinary", "binary"].includes(name)) {
    const unicode = name.startsWith("n")
    const limit = unicode ? 4000 : 8000
    const valueLength = typeof p.value === "string" ?
      (unicode ? p.value.length : Buffer.byteLength(p.value)) :
      p.value instanceof Uint8Array
      ? p.value.byteLength
      : 1
    const length = options.length ?? (p.value == null ? limit : Math.max(1, valueLength))
    if (!(length === Infinity || Number.isInteger(length) && length > 0)) {
      throw new ProtocolError("Invalid parameter length")
    }
    if ((name === "nchar" || name === "char" || name === "binary") && length > limit) {
      throw new ProtocolError("Fixed parameter length exceeds type limit")
    }
    return `${name}(${length > limit ? "max" : length})`
  }
  if (name === "decimal" || name === "numeric") {
    const precision = options.precision ?? 18
    const scale = options.scale ?? 0
    integer(precision, 1, 38)
    integer(scale, 0, precision)
    return `${name}(${precision},${scale})`
  }
  if (["time", "datetime2", "datetimeoffset"].includes(name)) {
    return `${name}(${integer(options.scale ?? 7, 0, 7)})`
  }
  if (!Object.values(TYPES).some((t) => t.name === p.type.name)) {
    throw new ProtocolError(`Unsupported parameter type ${p.type.name}`)
  }
  return name
}

const encodeValue = (p: Parameter, collation: Buffer): { info: Buffer; body: Buffer } => {
  const declared = declaration(p)
  const value = p.value
  const isNull = value === null || value === undefined
  const name = p.type.name
  let info: Buffer
  let data: Buffer = Buffer.alloc(0)
  let prefix: Buffer | undefined
  if (name === "TVP") {
    if (p.output) throw new ProtocolError("TVPs cannot be output parameters")
    const t = table(value)
    const bString = (s: string) => {
      if (s.length > 128) throw new ProtocolError("TVP type name too long")
      return Buffer.concat([Buffer.from([s.length]), Buffer.from(s, "utf16le")])
    }
    info = Buffer.concat([Buffer.from([0xf3, 0]), bString(t.schema ?? "dbo"), bString(t.name)])
    const columns = t.columns.map((c) => {
      if (["TVP", "Text", "NText", "Image"].includes(c.type.name)) {
        throw new ProtocolError("Unsupported TVP column type")
      }
      const length = c.length ?? (c.type.name.startsWith("N") ? 4000 : 8000)
      const p: Parameter = { name: c.name, type: c.type, value: null, options: { ...c, length } }
      return { parameter: p, info: encodeValue(p, collation).info }
    })
    const parts = [u16(columns.length)]
    for (const c of columns) parts.push(Buffer.alloc(6), c.info, Buffer.from([0]))
    parts.push(Buffer.from([0]))
    for (const row of t.rows) {
      if (!Array.isArray(row) || row.length !== columns.length) {
        throw new ProtocolError("TVP row does not match columns")
      }
      parts.push(Buffer.from([1]))
      for (let i = 0; i < columns.length; i++) {
        parts.push(encodeValue({ ...columns[i].parameter, value: row[i] }, collation).body)
      }
    }
    parts.push(Buffer.from([0]))
    return { info, body: Buffer.concat(parts) }
  } else if (["Text", "NText", "Image", "Xml"].includes(name)) {
    if (!isNull) {
      if (name === "Image") {
        if (!(value instanceof Uint8Array)) throw new ProtocolError("Expected Uint8Array")
        data = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
      } else {
        if (typeof value !== "string") throw new ProtocolError("Expected string")
        const codepage = name === "Text" ? encoding(collation) : "utf16le"
        if (!codepage) throw new ProtocolError("Unsupported SQL Server collation")
        data = Iconv.encode(value, codepage)
      }
    }
    if (name === "Xml") {
      info = Buffer.from([0xf1, 0])
      const total = Buffer.alloc(8, isNull ? 0xff : 0)
      if (!isNull) total.writeBigUInt64LE(BigInt(data.length))
      const chunk = Buffer.alloc(4)
      chunk.writeUInt32LE(data.length)
      return {
        info,
        body: isNull ? total : Buffer.concat([total, chunk, data, ...(data.length > 0 ? [Buffer.alloc(4)] : [])])
      }
    }
    const length = Buffer.alloc(4)
    length.writeUInt32LE(isNull ? 0xffffffff : data.length)
    info = Buffer.concat([Buffer.from([p.type.id]), length, ...(name === "Image" ? [] : [collation])])
    prefix = length
  } else if (["TinyInt", "SmallInt", "Int", "BigInt"].includes(name)) {
    const size = name === "TinyInt" ? 1 : name === "SmallInt" ? 2 : name === "Int" ? 4 : 8
    info = Buffer.from([0x26, size])
    if (!isNull) {
      data = Buffer.allocUnsafe(size)
      if (size === 8) {
        if (typeof value === "number" && !Number.isSafeInteger(value)) {
          throw new ProtocolError("BigInt number must be a safe integer")
        }
        if (typeof value !== "bigint" && typeof value !== "string" && typeof value !== "number") {
          throw new ProtocolError("Invalid BigInt")
        }
        data.writeBigInt64LE(BigInt(value))
      } else if (size === 1) data[0] = integer(value, 0, 255)
      else data.writeIntLE(integer(value, -(2 ** (size * 8 - 1)), 2 ** (size * 8 - 1) - 1), 0, size)
    }
  } else if (name === "Bit") {
    info = Buffer.from([0x68, 1])
    if (!isNull) {
      if (typeof value !== "boolean" && value !== 0 && value !== 1) throw new ProtocolError("Invalid Bit")
      data = Buffer.from([value ? 1 : 0])
    }
  } else if (name === "Float" || name === "Real") {
    const size = name === "Real" ? 4 : 8
    info = Buffer.from([0x6d, size])
    if (!isNull) {
      data = Buffer.allocUnsafe(size)
      if (size === 4) data.writeFloatLE(number(value))
      else data.writeDoubleLE(number(value))
    }
  } else if (["NVarChar", "NChar", "VarChar", "Char", "VarBinary", "Binary"].includes(name)) {
    const unicode = name.startsWith("N")
    const binary = name === "VarBinary" || name === "Binary"
    if (!isNull) {
      if (binary) {
        if (!(value instanceof Uint8Array)) throw new ProtocolError("Expected Uint8Array")
        data = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
      } else {
        if (typeof value !== "string") throw new ProtocolError("Expected string")
        const codepage = unicode ? "utf16le" : encoding(collation)
        if (!codepage) throw new ProtocolError("Unsupported SQL Server parameter collation")
        data = Iconv.encode(value, codepage)
      }
    }
    const max = declared.endsWith("(max)")
    const length = max ? 0xffff : Number(declared.slice(declared.indexOf("(") + 1, -1)) * (unicode ? 2 : 1)
    if (!max && data.length > length) throw new ProtocolError("Parameter exceeds declared length")
    info = Buffer.concat([Buffer.from([p.type.id]), u16(length), ...(binary ? [] : [collation])])
    if (max) {
      const total = Buffer.alloc(8, isNull ? 0xff : 0)
      if (!isNull) total.writeBigUInt64LE(BigInt(data.length))
      if (isNull) prefix = total
      else {
        const chunk = Buffer.alloc(4)
        chunk.writeUInt32LE(data.length)
        prefix = Buffer.concat([total, chunk])
        if (data.length > 0) data = Buffer.concat([data, Buffer.alloc(4)])
      }
    } else prefix = u16(isNull ? 0xffff : data.length)
  } else if (["Date", "Time", "DateTime2", "DateTimeOffset"].includes(name)) {
    const scale = p.options?.scale ?? 7
    const timeSize = scale <= 2 ? 3 : scale <= 4 ? 4 : 5
    info = Buffer.from(name === "Date" ? [0x28] : [p.type.id, scale])
    if (!isNull) {
      const d = date(value)
      if (d.getUTCFullYear() < 1 || d.getUTCFullYear() > 9999) throw new ProtocolError("Date outside SQL Server range")
      let days = Math.floor((d.getTime() + 62135596800000) / 86400000)
      const time = ((d.getTime() % 86400000) + 86400000) % 86400000
      const parts: Array<Buffer> = []
      if (name !== "Date") {
        // The result decoder uses tedious's plural spelling. Accept the legacy
        // singular spelling too, which tedious's input encoder used.
        const temporal = d as Date & { nanosecondsDelta?: unknown; nanosecondDelta?: unknown }
        const delta = temporal.nanosecondsDelta ?? temporal.nanosecondDelta ?? 0
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta < 0 || delta >= 0.001) {
          throw new ProtocolError("Invalid sub-millisecond time fraction")
        }
        let ticks = Math.round(time * 10 ** (scale - 3) + delta * 10 ** scale)
        if (ticks === 86400 * 10 ** scale) {
          ticks = 0
          if (name !== "Time") days++
        }
        if (days > 3652058) throw new ProtocolError("Rounded date outside SQL Server range")
        const t = Buffer.alloc(timeSize)
        t.writeUIntLE(ticks, 0, timeSize)
        parts.push(t)
      }
      if (name !== "Time") {
        const d = Buffer.alloc(3)
        d.writeUIntLE(days, 0, 3)
        parts.push(d)
      }
      if (name === "DateTimeOffset") parts.push(Buffer.alloc(2))
      data = Buffer.concat(parts)
    }
  } else if (name === "DateTime" || name === "SmallDateTime") {
    const size = name === "DateTime" ? 8 : 4
    info = Buffer.from([0x6f, size])
    if (!isNull) {
      const d = date(value)
      let days = Math.floor((d.getTime() + 2208988800000) / 86400000)
      const time = ((d.getTime() % 86400000) + 86400000) % 86400000
      data = Buffer.alloc(size)
      if (size === 8) {
        if (d.getUTCFullYear() < 1753 || d.getUTCFullYear() > 9999) {
          throw new ProtocolError("DateTime outside SQL Server range")
        }
        let ticks = Math.round(time * 0.3)
        if (ticks === 25920000) {
          days++
          ticks = 0
        }
        if (new Date(days * 86400000 - 2208988800000).getUTCFullYear() > 9999) {
          throw new ProtocolError("Rounded DateTime outside SQL Server range")
        }
        data.writeInt32LE(days)
        data.writeUInt32LE(ticks, 4)
      } else {
        let minutes = Math.round(time / 60000)
        if (minutes === 1440) {
          days++
          minutes = 0
        }
        integer(days, 0, 65535)
        data.writeUInt16LE(days)
        data.writeUInt16LE(minutes, 2)
      }
    }
  } else if (name === "Decimal" || name === "Numeric") {
    const precision = p.options?.precision ?? 18
    const scale = p.options?.scale ?? 0
    const size = precision <= 9 ? 5 : precision <= 19 ? 9 : precision <= 28 ? 13 : 17
    info = Buffer.from([p.type.id, size, precision, scale])
    if (!isNull) {
      const n = scaledInteger(value, scale)
      let magnitude = n < BigInt("0") ? -n : n
      if (magnitude >= BigInt("10") ** BigInt(precision)) throw new ProtocolError("Decimal exceeds declared precision")
      data = Buffer.alloc(size)
      data[0] = n < BigInt("0") ? 0 : 1
      for (let i = 1; i < size; i++) {
        data[i] = Number(magnitude & BigInt("255"))
        magnitude >>= BigInt("8")
      }
    }
  } else if (name === "Money" || name === "SmallMoney") {
    const size = name === "Money" ? 8 : 4
    info = Buffer.from([0x6e, size])
    if (!isNull) {
      const n = scaledInteger(value, 4)
      const limit = BigInt("1") << BigInt(size * 8 - 1)
      if (n < -limit || n >= limit) throw new ProtocolError("Money outside SQL Server range")
      data = Buffer.alloc(size)
      if (size === 4) data.writeInt32LE(Number(n))
      else {
        data.writeInt32LE(Number(n >> BigInt("32")))
        data.writeUInt32LE(Number(n & BigInt("4294967295")), 4)
      }
    }
  } else if (name === "UniqueIdentifier") {
    info = Buffer.from([0x24, 16])
    if (!isNull) {
      if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) {
        throw new ProtocolError("Invalid UUID")
      }
      data = Buffer.from(value.replaceAll("-", ""), "hex")
      data.subarray(0, 4).reverse()
      data.subarray(4, 6).reverse()
      data.subarray(6, 8).reverse()
    }
  } else {
    throw new ProtocolError(`Parameter encoding for ${name} is not implemented`)
  }
  return { info, body: Buffer.concat([prefix ?? Buffer.from([data.length]), data]) }
}

export const encodeParameter = (p: Parameter, collation: Buffer): Buffer => {
  const parameterName = p.name.startsWith("@") ? p.name : `@${p.name}`
  if (parameterName.length > 255 || !/^@[\p{L}\p{N}_@$#]+$/u.test(parameterName)) {
    throw new ProtocolError("Invalid RPC parameter name")
  }
  const { info, body } = encodeValue(p, collation)
  return Buffer.concat([
    Buffer.from([parameterName.length]),
    Buffer.from(parameterName, "utf16le"),
    Buffer.from([p.output ? 1 : 0]),
    info,
    body
  ])
}

/** Round decimal text using integer arithmetic, including exponent notation. */
const scaledInteger = (value: unknown, scale: number): bigint => {
  if (typeof value !== "number" && typeof value !== "string" && typeof value !== "bigint") {
    throw new ProtocolError("Invalid decimal")
  }
  const text = String(value)
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text)
  if (!match || text.length > 1000) throw new ProtocolError("Invalid decimal")
  const exponent = Number(match[4] ?? 0) + scale - (match[3]?.length ?? 0)
  if (Math.abs(exponent) > 1000) throw new ProtocolError("Decimal exponent outside supported range")
  let n = BigInt(match[2] + (match[3] ?? ""))
  if (exponent >= 0) n *= BigInt("10") ** BigInt(exponent)
  else {
    const divisor = BigInt("10") ** BigInt(-exponent)
    n = (n + divisor / BigInt("2")) / divisor
  }
  return match[1] === "-" ? -n : n
}

export const rpc = (
  procedure: string | number,
  parameters: ReadonlyArray<Parameter>,
  transaction: Buffer,
  collation: Buffer
): Buffer => {
  const name = typeof procedure === "number" ?
    Buffer.concat([u16(0xffff), u16(procedure)]) :
    Buffer.concat([u16(procedure.length), Buffer.from(procedure, "utf16le")])
  return Buffer.concat([allHeaders(transaction), name, u16(0), ...parameters.map((p) => encodeParameter(p, collation))])
}

export const sql = (
  query: string,
  parameters: ReadonlyArray<Parameter>,
  transaction: Buffer,
  collation: Buffer
): Buffer =>
  rpc(
    10,
    [
      { name: "stmt", type: TYPES.NVarChar, value: query },
      ...(parameters.length === 0 ? [] : [{
        name: "params",
        type: TYPES.NVarChar,
        value: parameters.map((p) => `@${p.name} ${declaration(p)}${p.output ? " OUTPUT" : ""}`).join(",")
      }]),
      ...parameters
    ],
    transaction,
    collation
  )
