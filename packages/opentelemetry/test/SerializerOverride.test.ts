import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as OtlpSerialization from "../src/OtlpSerialization.js"

describe("OtlpSerialization override behavior", () => {
  it.effect("json layer provides json HttpBody", () =>
    Effect.gen(function*() {
      const serialization = yield* OtlpSerialization.OtlpSerialization
      const body = serialization.traces({ test: "data" })
      expect(body.contentType).toBe("application/json")
    }).pipe(Effect.provide(OtlpSerialization.layerJson)))

  it.effect("protobuf layer provides protobuf HttpBody", () =>
    Effect.gen(function*() {
      const serialization = yield* OtlpSerialization.OtlpSerialization
      const body = serialization.traces({ resourceSpans: [] })
      expect(body.contentType).toBe("application/x-protobuf")
    }).pipe(Effect.provide(OtlpSerialization.layerProtobuf)))

  it.effect("custom layer can be provided", () =>
    Effect.gen(function*() {
      // This simulates: makeLayer(...).pipe(Layer.provide(customSerialization))
      // The makeLayer does NOT provide json internally, so custom can be provided

      // Layer that requires OtlpSerialization (like makeLayer)
      const innerLayer = Layer.scopedDiscard(
        Effect.gen(function*() {
          const serialization = yield* OtlpSerialization.OtlpSerialization
          // Protobuf should be used since we provide it externally
          const body = serialization.traces({ resourceSpans: [] })
          expect(body.contentType).toBe("application/x-protobuf")
        })
      )

      // Provide protobuf externally
      const finalLayer = innerLayer.pipe(Layer.provide(OtlpSerialization.layerProtobuf))

      yield* Layer.build(finalLayer).pipe(Scope.extend(yield* Effect.scope))
    }).pipe(Effect.scoped))

  it.effect("json layer produces valid HttpBody", () =>
    Effect.gen(function*() {
      const serialization = yield* OtlpSerialization.OtlpSerialization
      const body = serialization.traces({ test: "data" })
      expect(body._tag).toBe("Uint8Array")
      expect(body.contentType).toBe("application/json")
    }).pipe(Effect.provide(OtlpSerialization.layerJson)))
})
