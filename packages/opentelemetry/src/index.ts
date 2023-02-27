/**
 * @since 1.0.0
 */
import * as OtelApi from "@opentelemetry/api"

import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as Layer from "@effect/io/Layer"

/**
 * @since 1.0.0
 */
export const currentApi = FiberRef.unsafeMake(Option.none<typeof OtelApi>())

/**
 * @since 1.0.0
 */
export const currentTracer = FiberRef.unsafeMake(Option.none<OtelApi.Tracer>())

/**
 * @since 1.0.0
 */
export const currentSpan = FiberRef.unsafeMake(Option.none<OtelApi.Span>())

/**
 * @since 1.0.0
 */
export const withSpan: {
  (name: string, options?: OtelApi.SpanOptions): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: OtelApi.SpanOptions): Effect.Effect<R, E, A>
} = Debug.dualWithTrace<
  (name: string, options?: OtelApi.SpanOptions) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: OtelApi.SpanOptions) => Effect.Effect<R, E, A>
>(
  (args) => typeof args[0] !== "string",
  (trace) =>
    (self, name, options) =>
      FiberRef.getWith(currentApi, (maybeApi) =>
        maybeApi._tag === "None" ? self : FiberRef.getWith(
          currentTracer,
          (maybeTracer) =>
            maybeTracer._tag === "None" ?
              self :
              FiberRef.getWith(
                currentSpan,
                (maybeParent) =>
                  Effect.acquireUseRelease(
                    Effect.sync(() => {
                      const active = maybeApi.value.context.active()
                      if (maybeParent._tag === "Some") {
                        const context = maybeApi.value.trace.setSpan(active, maybeParent.value)
                        return maybeTracer.value.startSpan(name, options ? {} : {}, context)
                      }
                      return maybeTracer.value.startSpan(name, options ? {} : {}, active)
                    }),
                    (span) => FiberRef.locally(currentSpan, Option.some(span))(self),
                    (span, exit) =>
                      Effect.sync(() => {
                        if (exit._tag === "Success") {
                          span.setStatus({
                            code: maybeApi.value.SpanStatusCode.OK
                          })
                        } else {
                          if (Cause.isInterruptedOnly(exit.cause)) {
                            span.setStatus({
                              code: maybeApi.value.SpanStatusCode.OK
                            })
                          } else {
                            span.setStatus({
                              code: maybeApi.value.SpanStatusCode.ERROR,
                              message: Cause.pretty(exit.cause)
                            })
                          }
                        }
                        span.end()
                      })
                  )
              )
        )).traced(trace)
)

/**
 * @since 1.0.0
 */
export const Api = Layer.scopedDiscard(
  Effect.suspendSucceed(() => FiberRef.locallyScoped(currentApi, Option.some(OtelApi)))
)

/**
 * @since 1.0.0
 */
export const Tracer = (name: string, version?: string) =>
  Layer.scopedDiscard(
    FiberRef.getWith(
      currentApi,
      (maybeApi) =>
        maybeApi._tag === "None" ?
          Effect.unit() :
          FiberRef.locallyScoped(currentTracer, Option.some(maybeApi.value.trace.getTracer(name, version)))
    )
  )
