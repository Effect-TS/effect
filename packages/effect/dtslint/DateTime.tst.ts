import * as DateTime from "effect/DateTime"
import { describe, expect, it } from "tstyche"

declare const utc: DateTime.Utc
declare const zoned: DateTime.Zoned
declare const dateTime: DateTime.DateTime

describe("DateTime", () => {
  it("min", () => {
    expect(DateTime.min(utc, zoned)).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(DateTime.min(utc, utc)).type.toBe<DateTime.Utc>()
    expect(DateTime.min(zoned, zoned)).type.toBe<DateTime.Zoned>()
    expect(DateTime.min(dateTime, zoned)).type.toBe<DateTime.DateTime>()
    expect(DateTime.min(dateTime, utc)).type.toBe<DateTime.DateTime>()
    expect(DateTime.min(dateTime, dateTime)).type.toBe<DateTime.DateTime>()

    expect(utc.pipe(DateTime.min(zoned))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(zoned.pipe(DateTime.min(utc))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(utc.pipe(DateTime.min(utc))).type.toBe<DateTime.Utc>()
    expect(zoned.pipe(DateTime.min(zoned))).type.toBe<DateTime.Zoned>()
    expect(dateTime.pipe(DateTime.min(zoned))).type.toBe<DateTime.DateTime>()
    expect(dateTime.pipe(DateTime.min(utc))).type.toBe<DateTime.DateTime>()
    expect(dateTime.pipe(DateTime.min(dateTime))).type.toBe<DateTime.DateTime>()
  })

  it("max", () => {
    expect(DateTime.max(utc, zoned)).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(DateTime.max(utc, utc)).type.toBe<DateTime.Utc>()
    expect(DateTime.max(zoned, zoned)).type.toBe<DateTime.Zoned>()
    expect(DateTime.max(dateTime, zoned)).type.toBe<DateTime.DateTime>()
    expect(DateTime.max(dateTime, utc)).type.toBe<DateTime.DateTime>()
    expect(DateTime.max(dateTime, dateTime)).type.toBe<DateTime.DateTime>()

    expect(utc.pipe(DateTime.max(zoned))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(zoned.pipe(DateTime.max(utc))).type.toBe<DateTime.Utc | DateTime.Zoned>()
    expect(utc.pipe(DateTime.max(utc))).type.toBe<DateTime.Utc>()
    expect(zoned.pipe(DateTime.max(zoned))).type.toBe<DateTime.Zoned>()
    expect(dateTime.pipe(DateTime.max(zoned))).type.toBe<DateTime.DateTime>()
    expect(dateTime.pipe(DateTime.max(utc))).type.toBe<DateTime.DateTime>()
    expect(dateTime.pipe(DateTime.max(dateTime))).type.toBe<DateTime.DateTime>()
  })
})
