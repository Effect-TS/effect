import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as Layer from "@effect/io/Layer"
import * as Otel from "@effect/opentelemetry"
import * as it from "@effect/opentelemetry/test/utils/extend"

const AppTest = Layer.provideMerge(Otel.Api, Otel.Tracer("test-tracer"))

describe("Effect", () => {
  it.effect("withSpan", () =>
    Effect.provideSomeLayer(AppTest)(
      Effect.gen(function*($) {
        const result = yield* $(Otel.withSpan("ok")(FiberRef.get(Otel.currentSpan)))
        assert.deepEqual(result._tag, "Some")
      })
    ))
})
