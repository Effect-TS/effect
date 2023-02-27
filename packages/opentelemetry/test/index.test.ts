import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as Otel from "@effect/opentelemetry"
import * as it from "@effect/opentelemetry/test/utils/extend"

describe("Effect", () => {
  describe("WithTracer", () => {
    it.effect("withSpan", () =>
      Effect.provideSomeLayer(Otel.Tracer("test-tracer"))(
        Otel.withSpan("ok")(
          Effect.gen(function*($) {
            const result = yield* $(FiberRef.get(Otel.currentSpan))
            assert.deepEqual(result._tag, "Some")
          })
        )
      ))
  })
  describe("WithoutTracer", () => {
    it.effect("withSpan", () =>
      Otel.withSpan("ok")(
        Effect.gen(function*($) {
          const result = yield* $(FiberRef.get(Otel.currentSpan))
          assert.deepEqual(result._tag, "None")
        })
      ))
  })
})
