import { type Result, Schema } from "effect"
import { MediaType } from "effect/unstable/http"
import { describe, expect, it } from "tstyche"

describe("MediaType", () => {
  it("constructors and dual helpers preserve their public types", () => {
    expect(MediaType.parse("text/plain")).type.toBe<
      Result.Result<MediaType.MediaType, MediaType.MediaTypeParseError>
    >()
    expect(MediaType.parseUnsafe("text/plain")).type.toBe<MediaType.MediaType>()
    const mediaType = MediaType.textPlain
    expect(MediaType.getParameter(mediaType, "charset")).type.toBe<ReturnType<typeof MediaType.getParameter>>()
    expect(mediaType.pipe(MediaType.getParameter("charset"))).type.toBe<ReturnType<typeof MediaType.getParameter>>()
    expect(MediaType.sameEssence(mediaType, mediaType)).type.toBe<boolean>()
    expect(mediaType.pipe(MediaType.sameEssence(mediaType))).type.toBe<boolean>()
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
