/**
 * Decodes Trino result values, driven by each column's `typeSignature`.
 *
 * The server writes values with `JsonEncodingUtils` (trino-main
 * `server/protocol/JsonEncodingUtils.java`): integers as JSON numbers, DECIMAL
 * and every date/time type as strings, VARBINARY as base64, ROW as a
 * positional array and MAP as an object whose keys are always strings.
 * `TrinoTypes` describes the decoded types and how to replace them.
 */
import * as Base64 from "effect/encoding/Base64"
import * as Result from "effect/Result"
import type { Codec, Column, Registry, TypeInfo, TypeSignature } from "../TrinoTypes.ts"
import { DecodeFailure } from "./failure.ts"
import { asObject, entries, JsonNumber, type JsonValue } from "./json.ts"
import { Invalid, invalid, parseTimestamp, parseZonedTimestamp } from "./wire.ts"

/** Decodes the rows of one result set. */
export interface RowDecoder {
  /** Decodes one raw row positionally; the result has one value per column. */
  readonly decode: (row: ReadonlyArray<JsonValue>) => Result.Result<ReadonlyArray<unknown>, DecodeFailure>
}

type Decode = (value: JsonValue) => unknown

const describe = (value: JsonValue): string =>
  value instanceof JsonNumber ? value.source : JSON.stringify(value) ?? String(value)

// -----------------------------------------------------------------------------
// numbers
// -----------------------------------------------------------------------------

const INT64_MIN = BigInt("-9223372036854775808")
const INT64_MAX = BigInt("9223372036854775807")

const decodeInteger: Decode = (value) => {
  if (value instanceof JsonNumber) {
    const n = Number(value.source)
    if (Number.isSafeInteger(n)) return n
  }
  return invalid(`Expected an integer, received ${describe(value)}`)
}

const decodeBigint: Decode = (value) => {
  // the server sends a number; strings are accepted like the Java client does
  const source = value instanceof JsonNumber ? value.source : typeof value === "string" ? value : undefined
  if (source !== undefined && /^-?\d+$/.test(source)) {
    const n = BigInt(source)
    if (n >= INT64_MIN && n <= INT64_MAX) return n
  }
  return invalid(`Expected a 64-bit integer, received ${describe(value)}`)
}

const decodeFloat: Decode = (value) => {
  if (value instanceof JsonNumber) return Number(value.source)
  switch (value) {
    case "NaN":
      return Number.NaN
    case "Infinity":
      return Number.POSITIVE_INFINITY
    case "-Infinity":
      return Number.NEGATIVE_INFINITY
  }
  return invalid(`Expected a floating point number, received ${describe(value)}`)
}

// DECIMAL and NUMBER keep the text the server wrote: NaN and ±Infinity stay text too
const decodeNumeric: Decode = (value) => {
  if (typeof value === "string") return value
  if (value instanceof JsonNumber) return value.source
  return invalid(`Expected a decimal, received ${describe(value)}`)
}

// -----------------------------------------------------------------------------
// text and bytes
// -----------------------------------------------------------------------------

const decodeBoolean: Decode = (value) =>
  typeof value === "boolean" ? value : invalid(`Expected a boolean, received ${describe(value)}`)

const decodeString: Decode = (value) =>
  typeof value === "string" ? value : invalid(`Expected a string, received ${describe(value)}`)

const decodeBinary: Decode = (value) => {
  if (typeof value === "string") {
    const bytes = Base64.decode(value)
    if (Result.isSuccess(bytes)) return bytes.success
  }
  return invalid(`Expected base64 bytes, received ${describe(value)}`)
}

// -----------------------------------------------------------------------------
// dates and times
// -----------------------------------------------------------------------------

const toDate = (epochMillis: number, text: string): Date => {
  const date = new Date(epochMillis)
  return Number.isNaN(date.getTime()) ? invalid(`Out of range: "${text}"`) : date
}

/** `timestamp(p)`: the wall clock read as UTC fields, truncated to milliseconds. */
const decodeTimestamp: Decode = (value) =>
  typeof value === "string"
    ? toDate(parseTimestamp(value).millis, value)
    : invalid(`Expected a timestamp, received ${describe(value)}`)

/** `timestamp(p) with time zone`: the instant; the zone is dropped. */
const decodeZonedTimestamp: Decode = (value) =>
  typeof value === "string"
    ? toDate(parseZonedTimestamp(value).dateTime.epochMilliseconds, value)
    : invalid(`Expected a timestamp with a time zone, received ${describe(value)}`)

// -----------------------------------------------------------------------------
// type dispatch
// -----------------------------------------------------------------------------

const passThrough: Decode = (value) => value

/** The first numeric type argument (precision of time and timestamp types), or 3 when absent. */
const precisionOf = (signature: TypeSignature): number => {
  for (const argument of signature.arguments) {
    if (argument.kind === "LONG") return argument.value
  }
  // without the PARAMETRIC_DATETIME capability the server sends bare types rounded to milliseconds
  return 3
}

const typeArgument = (signature: TypeSignature, index: number): TypeSignature => {
  const argument = signature.arguments[index]
  if (argument !== undefined && (argument.kind === "TYPE" || argument.kind === "NAMED_TYPE")) return argument.value
  return invalid(`Type ${signature.rawType} is missing type argument ${index}`)
}

const nullable = (decode: Decode): Decode => (value) => value === null ? null : decode(value)

const setField = (target: Record<string, unknown>, key: string, value: unknown): void => {
  // `__proto__` must stay an own data property, never the prototype
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true })
}

const makeArrayDecoder = (element: Decode): Decode => (value) =>
  Array.isArray(value) ? value.map(element) : invalid(`Expected an array, received ${describe(value)}`)

const makeRowFieldsDecoder = (signature: TypeSignature, registry: Registry | undefined): Decode => {
  const fields = signature.arguments.map((argument, index) => {
    if (argument.kind === "NAMED_TYPE") {
      return {
        name: argument.fieldName ?? `field${index}`,
        decode: nullable(makeDecoder(argument.value, registry))
      }
    }
    if (argument.kind === "TYPE") {
      return { name: `field${index}`, decode: nullable(makeDecoder(argument.value, registry)) }
    }
    return invalid(`Unexpected ${argument.kind} argument in a row type`)
  })
  return (value) => {
    if (!Array.isArray(value) || value.length !== fields.length) {
      return invalid(`Expected a row of ${fields.length} fields, received ${describe(value)}`)
    }
    const out: Record<string, unknown> = {}
    for (let i = 0; i < fields.length; i++) setField(out, fields[i].name, fields[i].decode(value[i]))
    return out
  }
}

/**
 * Map keys arrive as `key.toString()` of the server-side Java value. Scalar
 * keys are parsed back with the value decoder for the key type; ARRAY, MAP and
 * ROW keys (rendered by `List.toString()`/`Map.toString()`) have no reliable
 * inverse and stay strings.
 */
const makeMapKeyDecoder = (signature: TypeSignature, registry: Registry | undefined): (key: string) => unknown => {
  switch (signature.rawType.toLowerCase()) {
    case "tinyint":
    case "smallint":
    case "integer":
    case "bigint":
    case "real":
    case "double": {
      const decode = makeDecoder(signature, registry)
      return (key) => decode(/^-?\d/.test(key) ? new JsonNumber(key) : key)
    }
    case "boolean":
      return (key) =>
        key === "true" ? true : key === "false" ? false : invalid(`Expected a boolean key, received "${key}"`)
    case "array":
    case "map":
    case "row":
      return (key) => key
    default:
      return makeDecoder(signature, registry)
  }
}

const makeMapDecoder = (signature: TypeSignature, registry: Registry | undefined): Decode => {
  const decodeKey = makeMapKeyDecoder(typeArgument(signature, 0), registry)
  const decodeValue = nullable(makeDecoder(typeArgument(signature, 1), registry))
  return (value) => {
    const object = asObject(value)
    if (object === undefined) return invalid(`Expected a map object, received ${describe(value)}`)
    const out = new Map<unknown, unknown>()
    for (const [key, entry] of entries(object)) out.set(decodeKey(key), decodeValue(entry))
    return out
  }
}

/** Hands a registered codec the text of a scalar value. */
const makeCodecDecoder = (codec: Codec<unknown>, signature: TypeSignature): Decode => {
  const info: TypeInfo = { rawType: signature.rawType.toLowerCase(), precision: precisionOf(signature) }
  return (value) => {
    const text = typeof value === "string" ? value : value instanceof JsonNumber ? value.source : undefined
    if (text === undefined) return invalid(`Expected text for ${info.rawType}, received ${describe(value)}`)
    const result = codec.decode(text, info)
    return Result.isSuccess(result) ? result.success : invalid(result.failure.message)
  }
}

const makeDecoder = (signature: TypeSignature, registry: Registry | undefined): Decode => {
  const rawType = signature.rawType.toLowerCase()
  switch (rawType) {
    case "array":
      return makeArrayDecoder(nullable(makeDecoder(typeArgument(signature, 0), registry)))
    case "map":
      return makeMapDecoder(signature, registry)
    case "row":
      return makeRowFieldsDecoder(signature, registry)
    case "boolean":
      return decodeBoolean
  }
  const custom = registry?.lookup(rawType)
  if (custom !== undefined) return makeCodecDecoder(custom, signature)
  switch (rawType) {
    case "tinyint":
    case "smallint":
    case "integer":
      return decodeInteger
    case "bigint":
      return decodeBigint
    case "real":
    case "double":
      return decodeFloat
    case "decimal":
    case "number":
      return decodeNumeric
    case "varchar":
    case "char":
    case "json":
    case "uuid":
    case "ipaddress":
    case "date":
    case "time":
    case "time with time zone":
    case "interval day to second":
    case "interval year to month":
      return decodeString
    case "varbinary":
      return decodeBinary
    case "timestamp":
      return decodeTimestamp
    case "timestamp with time zone":
      return decodeZonedTimestamp
    default:
      return passThrough
  }
}

/** Builds the decoder for the columns announced by the first `Columns` event. */
export const rowDecoder = (columns: ReadonlyArray<Column>, registry?: Registry): RowDecoder => {
  const names = columns.map((column) => column.name)
  const decoders: Array<Result.Result<Decode, DecodeFailure>> = columns.map((column) => {
    try {
      return Result.succeed(nullable(makeDecoder(column.typeSignature, registry)))
    } catch (error) {
      if (error instanceof Invalid) {
        return Result.fail(
          new DecodeFailure({ message: error.message, column: column.name, cause: column.typeSignature })
        )
      }
      throw error
    }
  })
  return {
    decode: (row) => {
      if (row.length !== columns.length) {
        return Result.fail(
          new DecodeFailure({
            message: `Expected ${columns.length} values per row, received ${row.length}`,
            column: undefined,
            cause: row
          })
        )
      }
      const out: Array<unknown> = []
      for (let i = 0; i < decoders.length; i++) {
        const decoder = decoders[i]
        if (Result.isFailure(decoder)) return Result.fail(decoder.failure)
        try {
          out.push(decoder.success(row[i]))
        } catch (error) {
          if (error instanceof Invalid) {
            return Result.fail(new DecodeFailure({ message: error.message, column: names[i], cause: row[i] }))
          }
          throw error
        }
      }
      return Result.succeed(out)
    }
  }
}
