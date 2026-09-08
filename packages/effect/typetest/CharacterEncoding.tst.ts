import * as C from "effect/CharacterEncoding"
import type * as Effect from "effect/Effect"
import * as All from "effect/encoding/All"
import * as Utf8 from "effect/encoding/Utf8"
import { hole } from "effect/Function"
import type * as Stream from "effect/Stream"
import { describe, expect, it } from "tstyche"

describe("CharacterEncoding", () => {
  it("accepts codec values and exposes typed lookup failures", () => {
    expect(C.encode("hello", Utf8.encoding)).type.toBe<Effect.Effect<Uint8Array, C.CharacterEncodingError>>()
    expect(C.decode(new Uint8Array(), Utf8.encoding)).type.toBe<Effect.Effect<string, C.CharacterEncodingError>>()
    expect(All.resolve("utf8")).type.toBe<Effect.Effect<C.Encoding, C.CharacterEncodingError>>()
    expect(C.makeRegistry([Utf8.encoding])).type.toBe<C.Registry>()
  })

  it("preserves upstream errors and requirements", () => {
    const bytes = hole<Stream.Stream<Uint8Array, "upstream", "service">>()
    const text = hole<Stream.Stream<string, "upstream", "service">>()
    expect(C.decodeStream(Utf8.encoding)(bytes)).type.toBe<
      Stream.Stream<string, "upstream" | C.CharacterEncodingError, "service">
    >()
    expect(C.encodeStream(Utf8.encoding)(text)).type.toBe<
      Stream.Stream<Uint8Array, "upstream" | C.CharacterEncodingError, "service">
    >()
    expect(C.transcodeStream(Utf8.encoding, Utf8.encoding)(bytes)).type.toBe<
      Stream.Stream<Uint8Array, "upstream" | C.CharacterEncodingError, "service">
    >()
  })
})
