import * as Request from "#tds/tdsRequest"
import { describe, expect, it } from "@effect/vitest"
import { Buffer } from "node:buffer"

const collation = Buffer.from("0904d00034", "hex")
const parameter = (type: Request.DataType, value: unknown, options?: Request.ParameterOptions) =>
  Request.encodeParameter({ name: "x", type, value, options }, collation)

describe("TDS request encoding", () => {
  it("rejects invalid values before they reach the wire", () => {
    expect(() => parameter(Request.TYPES.TinyInt, 256)).toThrow("integer")
    expect(() => parameter(Request.TYPES.Int, 1.5)).toThrow("integer")
    expect(() => parameter(Request.TYPES.Float, NaN)).toThrow("finite")
    expect(() => parameter(Request.TYPES.BigInt, Number.MAX_SAFE_INTEGER + 1)).toThrow("safe integer")
    expect(() => parameter(Request.TYPES.NVarChar, "long", { length: 2 })).toThrow("declared length")
    expect(() => parameter(Request.TYPES.UniqueIdentifier, "bad uuid")).toThrow("UUID")
    expect(() => parameter(Request.TYPES.Decimal, "1234", { precision: 3 })).toThrow("precision")
    expect(() => parameter(Request.TYPES.Decimal, "1", { precision: 2, scale: 3 })).toThrow("integer")
    expect(() => parameter(Request.TYPES.Date, new Date(NaN))).toThrow("valid Date")
    expect(() => parameter(Request.TYPES.DateTime, new Date("1000-01-01Z"))).toThrow("range")
    expect(() => Request.encodeParameter({ name: "x; DROP TABLE t", type: Request.TYPES.Int, value: 1 }, collation))
      .toThrow("parameter name")
  })

  it("encodes exact decimal strings through 38 digits without floating-point multiplication", () => {
    const encoded = parameter(Request.TYPES.Decimal, "99999999999999999999999999999999999999", { precision: 38 })
    const bytes = encoded.subarray(-16)
    let magnitude = BigInt(0)
    for (let i = 15; i >= 0; i--) magnitude = (magnitude << BigInt(8)) | BigInt(bytes[i])
    expect(magnitude.toString()).toBe("99999999999999999999999999999999999999")
    const rounded = parameter(Request.TYPES.Decimal, "-1.005", { precision: 5, scale: 2 })
    expect(rounded.subarray(-5)).toEqual(Buffer.from([0, 101, 0, 0, 0]))
  })

  it("carries rounded datetime ticks and smalldatetime minutes into the next day", () => {
    const a = parameter(Request.TYPES.DateTime, new Date("2024-01-01T23:59:59.999Z"))
    const b = parameter(Request.TYPES.DateTime, new Date("2024-01-02T00:00:00.000Z"))
    expect(a).toEqual(b)
    expect(parameter(Request.TYPES.SmallDateTime, new Date("2024-01-01T23:59:45Z")))
      .toEqual(parameter(Request.TYPES.SmallDateTime, new Date("2024-01-02T00:00:00Z")))
  })

  it("validates TVP column counts and cell values before encoding an RPC", () => {
    const value = { name: "Items", columns: [{ name: "n", type: Request.TYPES.Int }], rows: [[1, 2]] }
    expect(() => parameter(Request.TYPES.TVP, value)).toThrow("does not match")
    expect(() => parameter(Request.TYPES.TVP, { ...value, rows: [["invalid"]] })).toThrow("integer")
  })
})
