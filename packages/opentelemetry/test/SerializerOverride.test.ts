import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as OtlpSerializer from "../src/OtlpSerializer.js"
import * as OtlpSerializerProtobuf from "../src/OtlpSerializerProtobuf.js"

describe("OtlpSerializer override behavior", () => {
  it.effect("json layer provides json contentType", () =>
    Effect.gen(function*() {
      const serializer = yield* OtlpSerializer.OtlpSerializer
      expect(serializer.contentType).toBe("application/json")
    }).pipe(Effect.provide(OtlpSerializer.json)))

  it.effect("protobuf layer provides protobuf contentType", () =>
    Effect.gen(function*() {
      const serializer = yield* OtlpSerializer.OtlpSerializer
      expect(serializer.contentType).toBe("application/x-protobuf")
    }).pipe(Effect.provide(OtlpSerializerProtobuf.protobuf)))

  it.effect("layerWithSerializer pattern allows protobuf override", () =>
    Effect.gen(function*() {
      // This simulates: Otlp.layerWithSerializer(...).pipe(Layer.provide(protobuf))
      // The layerWithSerializer does NOT provide json internally, so protobuf can be provided

      // Layer that requires OtlpSerializer (like layerWithSerializer)
      const innerLayer = Layer.scopedDiscard(
        Effect.gen(function*() {
          const serializer = yield* OtlpSerializer.OtlpSerializer
          // Protobuf should be used since we provide it externally
          expect(serializer.contentType).toBe("application/x-protobuf")
        })
      )

      // Provide protobuf externally
      const finalLayer = innerLayer.pipe(Layer.provide(OtlpSerializerProtobuf.protobuf))

      yield* Layer.build(finalLayer).pipe(Scope.extend(yield* Effect.scope))
    }).pipe(Effect.scoped))

  it.effect("layer pattern uses json by default", () =>
    Effect.gen(function*() {
      // This simulates: Otlp.layer(...) which provides json internally
      const innerLayer = Layer.scopedDiscard(
        Effect.gen(function*() {
          const serializer = yield* OtlpSerializer.OtlpSerializer
          expect(serializer.contentType).toBe("application/json")
        })
      ).pipe(Layer.provide(OtlpSerializer.json))

      yield* Layer.build(innerLayer).pipe(Scope.extend(yield* Effect.scope))
    }).pipe(Effect.scoped))
})
