import * as DateTime from "effect/DateTime"
import { describe, expect, it } from "tstyche"

declare const utc: DateTime.Utc
declare const zoned: DateTime.Zoned
declare const any: DateTime.DateTime

describe("DateTime", () => {
  it("min", () => {
    expect(DateTime.min(utc, zoned)).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(DateTime.min(utc, utc)).type.toBe<DateTime.Utc>()
    expect(DateTime.min(zoned, zoned)).type.toBe<DateTime.Zoned>()
    expect(DateTime.min(any, zoned)).type.toBe<DateTime.DateTime>()
    expect(DateTime.min(any, utc)).type.toBe<DateTime.DateTime>()
    expect(DateTime.min(any, any)).type.toBe<DateTime.DateTime>()

    expect(utc.pipe(DateTime.min(zoned))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(zoned.pipe(DateTime.min(utc))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(utc.pipe(DateTime.min(utc))).type.toBe<DateTime.Utc>()
    expect(zoned.pipe(DateTime.min(zoned))).type.toBe<DateTime.Zoned>()
    expect(any.pipe(DateTime.min(zoned))).type.toBe<DateTime.DateTime>()
    expect(any.pipe(DateTime.min(utc))).type.toBe<DateTime.DateTime>()
    expect(any.pipe(DateTime.min(any))).type.toBe<DateTime.DateTime>()
  })

  it("max", () => {
    expect(DateTime.max(utc, zoned)).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(DateTime.max(utc, utc)).type.toBe<DateTime.Utc>()
    expect(DateTime.max(zoned, zoned)).type.toBe<DateTime.Zoned>()
    expect(DateTime.max(any, zoned)).type.toBe<DateTime.DateTime>()
    expect(DateTime.max(any, utc)).type.toBe<DateTime.DateTime>()
    expect(DateTime.max(any, any)).type.toBe<DateTime.DateTime>()

    expect(utc.pipe(DateTime.max(zoned))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(zoned.pipe(DateTime.max(utc))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(utc.pipe(DateTime.max(utc))).type.toBe<DateTime.Utc>()
    expect(zoned.pipe(DateTime.max(zoned))).type.toBe<DateTime.Zoned>()
    expect(any.pipe(DateTime.max(zoned))).type.toBe<DateTime.DateTime>()
    expect(any.pipe(DateTime.max(utc))).type.toBe<DateTime.DateTime>()
    expect(any.pipe(DateTime.max(any))).type.toBe<DateTime.DateTime>()
  })
})
