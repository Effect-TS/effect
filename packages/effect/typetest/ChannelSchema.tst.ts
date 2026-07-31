import { type Channel, ChannelSchema, Schema } from "effect"
import type * as Arr from "effect/Array"
import { describe, expect, it } from "tstyche"

describe("ChannelSchema", () => {
  it("decodeUnknown consumes unknown input while decode remains typed", () => {
    expect(ChannelSchema.decodeUnknown(Schema.NumberFromString)()).type.toBe<
      Channel.Channel<
        Arr.NonEmptyReadonlyArray<number>,
        Schema.SchemaError,
        unknown,
        Arr.NonEmptyReadonlyArray<unknown>,
        never,
        unknown,
        never
      >
    >()
    expect(ChannelSchema.decode(Schema.NumberFromString)()).type.toBe<
      Channel.Channel<
        Arr.NonEmptyReadonlyArray<number>,
        Schema.SchemaError,
        unknown,
        Arr.NonEmptyReadonlyArray<string>,
        never,
        unknown,
        never
      >
    >()
  })
})
