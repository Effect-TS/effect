import { Schema } from "effect"
import type { Cookies, Headers, UrlParams } from "effect/unstable/http"
import { describe, expect, it } from "tstyche"

describe("unstable HTTP schemas", () => {
  it("exposes the HTTP declarations from Schema", () => {
    expect(Schema.Cookie).type.toBe<Schema.Cookie>()
    expect(Schema.Cookies).type.toBe<Schema.Cookies>()
    expect(Schema.Headers).type.toBe<Schema.Headers>()
    expect(Schema.UrlParams).type.toBe<Schema.UrlParams>()

    expect<typeof Schema.Cookie["Type"]>().type.toBe<Cookies.Cookie>()
    expect<typeof Schema.Cookies["Type"]>().type.toBe<Cookies.Cookies>()
    expect<typeof Schema.Headers["Type"]>().type.toBe<Headers.Headers>()
    expect<typeof Schema.UrlParams["Type"]>().type.toBe<UrlParams.UrlParams>()
  })

  it("exposes the moved helper schemas", () => {
    expect(Schema.RecordFromCookies).type.toBe<Schema.RecordFromCookies>()
    expect(Schema.JsonFromUrlParamsField("json")).type.toBe<Schema.JsonFromUrlParamsField>()
    expect(Schema.RecordFromUrlParams).type.toBe<Schema.RecordFromUrlParams>()
  })
})
