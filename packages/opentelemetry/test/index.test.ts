import * as Effect from "@effect/io/Effect"
import * as Otel from "@effect/opentelemetry"
import * as it from "@effect/opentelemetry/test/utils/extend"

const Telemetry = Otel.Telemetry({
  tracer: { name: "test-tracer" },
  meter: { name: "test-meter" }
})

describe("Effect", () => {
  describe("with Telemetry provided", () => {
    it.effect("withSpan", () =>
      Effect.provideSomeLayer(Telemetry)(
        Otel.withSpan("ok")(
          Effect.gen(function*($) {
            const result = yield* $(Otel.currentSpanOption())
            assert.deepEqual(result._tag, "Some")
          })
        )
      ))
  })
  describe("with no Telemetry provided", () => {
    it.effect("withSpan", () =>
      Otel.withSpan("ok")(
        Effect.gen(function*($) {
          const result = yield* $(Otel.currentSpanOption())
          assert.deepEqual(result._tag, "None")
        })
      ))
  })
})
