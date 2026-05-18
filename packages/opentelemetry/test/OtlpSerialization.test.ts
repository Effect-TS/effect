import { assert, describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as OtlpSerialization from "../src/OtlpSerialization.js"

describe("OtlpSerialization override behavior", () => {
  it.effect("json roundtrip", () =>
    Effect.gen(function*() {
      const serialization = yield* OtlpSerialization.OtlpSerialization
      const body = serialization.traces({ test: "data" })
      assert(body._tag === "Uint8Array")
      expect(body.contentType).toBe("application/json")
      const result = JSON.parse(new TextDecoder().decode(body.body))
      expect(result).toEqual({ test: "data" })
    }).pipe(Effect.provide(OtlpSerialization.layerJson)))

  it.effect("protobuf layer provides protobuf HttpBody", () =>
    Effect.gen(function*() {
      const serialization = yield* OtlpSerialization.OtlpSerialization
      const body = serialization.traces({ resourceSpans: [] })
      expect(body.contentType).toBe("application/x-protobuf")
    }).pipe(Effect.provide(OtlpSerialization.layerProtobuf)))
})
