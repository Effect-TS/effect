import { ByteSize, type ByteSize as ByteSizeType, type Config, type Option, type Schema } from "effect"
import { describe, expect, it } from "tstyche"

declare const value: ByteSizeType.ByteSize

describe("ByteSize", () => {
  it("infers data-last arithmetic", () => {
    expect(ByteSize.sum(value)(value)).type.toBe<ByteSizeType.ByteSize>()
    expect(ByteSize.times(2)(value)).type.toBe<Option.Option<ByteSizeType.ByteSize>>()
  })

  it("integrates with Schema and Config", () => {
    expect<Schema.Schema.Type<typeof Schema.ByteSize>>().type.toBe<ByteSizeType.ByteSize>()
    expect<Schema.Codec.Encoded<typeof Schema.ByteSizeFromString>>().type.toBe<string>()
    expect<ReturnType<typeof Config.ByteSize>>().type.toBe<Config.Config<ByteSizeType.ByteSize>>()
  })
})
