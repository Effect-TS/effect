import { type Option, type Result, Schema } from "effect"
import { MediaType } from "effect/unstable/http"
import { describe, expect, it } from "tstyche"

describe("MediaType", () => {
  it("parse errors and data-last parameter lookup preserve their public types", () => {
    expect(MediaType.parse("text/plain")).type.toBe<
      Result.Result<MediaType.MediaType, MediaType.MediaTypeParseError>
    >()
    const mediaType = MediaType.textPlain
    expect(mediaType.pipe(MediaType.getParameter("charset"))).type.toBe<Option.Option<string>>()
  })

  it("Schema types use the string representation without services", () => {
    expect(Schema.MediaType.Type).type.toBe<MediaType.MediaType>()
    expect(Schema.MediaType.Iso).type.toBe<MediaType.MediaType>()
    expect(Schema.MediaTypeFromString.Type).type.toBe<MediaType.MediaType>()
    expect<Schema.Codec.Encoded<typeof Schema.MediaTypeFromString>>().type.toBe<string>()
    expect<Schema.Codec.DecodingServices<typeof Schema.MediaTypeFromString>>().type.toBe<never>()
    expect<Schema.Codec.EncodingServices<typeof Schema.MediaTypeFromString>>().type.toBe<never>()
  })
})
