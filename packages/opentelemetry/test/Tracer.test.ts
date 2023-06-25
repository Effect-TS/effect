import { identity } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import { OtelSpan } from "@effect/opentelemetry/internal_effect_untraced/tracer"
import * as Resource from "@effect/opentelemetry/Resource"
import * as it from "@effect/opentelemetry/test/utils/extend"
import * as Tracer from "@effect/opentelemetry/Tracer"

const TracingLive = Layer.provide(
  Resource.layer({ serviceName: "test" }),
  Tracer.layer
)

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
        TracingLive
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
