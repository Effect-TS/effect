import { Brand, Config, hole, pipe } from "effect"
import { describe, expect, it } from "tstyche"

declare const string: Config.Config<string>
declare const number: Config.Config<number>
declare const array: Array<Config.Config<string>>
declare const record: Record<string, Config.Config<number>>

type Int = Brand.Branded<number, "Int">
const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

type Str = Brand.Branded<string, "Str">
const Str = Brand.refined<Str>(
  (n) => n.length > 2,
  (n) => Brand.error(`Expected "${n}" to be longer than 2`)
)

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
      expect(Config.all(array)).type.toBe<Config.Config<Array<string>>>()
      expect(pipe(array, Config.all)).type.toBe<Config.Config<Array<string>>>()
    })

    it("record", () => {
      expect(Config.all(record)).type.toBe<Config.Config<Record<string, number>>>()
      expect(pipe(record, Config.all)).type.toBe<Config.Config<Record<string, number>>>()
    })
  })

  it("branded", () => {
    // @ts-expect-error
    Config.branded("NAME", Int)
    // @ts-expect-error
    Config.branded(number, Str)
    // @ts-expect-error
    number.pipe(Config.branded(Str))

    expect(Config.branded(number, Int)).type.toBe<Config.Config<Int>>()
    expect(Config.branded("NAME", Str)).type.toBe<Config.Config<Str>>()
    expect(number.pipe(Config.branded(Int))).type.toBe<Config.Config<Int>>()
    expect(pipe([string, number] as const, Config.all)).type.toBe<Config.Config<[string, number]>>()
  })

  it("Config.Success helper type", () => {
    expect(hole<Config.Config.Success<typeof string>>()).type.toBe<string>()
    expect(hole<Config.Config.Success<typeof number>>()).type.toBe<number>()
    const config = Config.all({ a: string, b: number })
    expect(hole<Config.Config.Success<typeof config>>()).type.toBe<{ a: string; b: number }>()
  })
})
