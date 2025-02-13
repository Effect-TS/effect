import { Config, hole, pipe } from "effect"
import { describe, expect, it } from "tstyche"

declare const string: Config.Config<string>
declare const number: Config.Config<number>
declare const stringArray: Array<Config.Config<string>>
declare const numberRecord: Record<string, Config.Config<number>>

describe("Config", () => {
  describe("all", () => {
    it("tuple", () => {
      expect(Config.all([string, number])).type.toBe<Config.Config<[string, number]>>()
      expect(pipe([string, number] as const, Config.all)).type.toBe<Config.Config<[string, number]>>()
    })

    it("struct", () => {
      expect(Config.all({ a: string, b: number })).type.toBe<Config.Config<{ a: string; b: number }>>()
      expect(pipe({ a: string, b: number }, Config.all)).type.toBe<Config.Config<{ a: string; b: number }>>()
    })

    it("array", () => {
      expect(Config.all(stringArray)).type.toBe<Config.Config<Array<string>>>()
      expect(pipe(stringArray, Config.all)).type.toBe<Config.Config<Array<string>>>()
    })

    it("record", () => {
      expect(Config.all(numberRecord)).type.toBe<Config.Config<Record<string, number>>>()
      expect(pipe(numberRecord, Config.all)).type.toBe<Config.Config<Record<string, number>>>()
    })
  })

  it("Success", () => {
    expect(hole<Config.Config.Success<typeof string>>()).type.toBe<string>()
    expect(hole<Config.Config.Success<typeof number>>()).type.toBe<number>()
    const config = Config.all({ a: string, b: number })
    expect(hole<Config.Config.Success<typeof config>>()).type.toBe<{ a: string; b: number }>()
  })
})
