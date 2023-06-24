import { identity } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { OtelSpan } from "@effect/opentelemetry/internal_effect_untraced/tracer"
import * as it from "@effect/opentelemetry/test/utils/extend"
import * as Otel from "@effect/opentelemetry/Tracer"

const TracerLive = Otel.layer({
  name: "test-tracer"
})

describe("Tracer", () => {
  describe("provided", () => {
    it.effect("withSpan", () =>
      Effect.provideLayer(
        Effect.withSpan("ok")(
          Effect.gen(function*(_) {
            const span = yield* _(Effect.flatMap(Effect.currentSpan(), identity))
            expect(span).instanceOf(OtelSpan)
          })
        ),
        TracerLive
      ))
  })
  describe("not provided", () => {
    it.effect("withSpan", () =>
      Effect.withSpan("ok")(
        Effect.gen(function*(_) {
          const span = yield* _(Effect.flatMap(Effect.currentSpan(), identity))
          expect(span).not.instanceOf(OtelSpan)
        })
      ))
  })
})
