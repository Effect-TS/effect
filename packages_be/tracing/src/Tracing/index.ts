import { Tracer as OT, Span as OS, FORMAT_HTTP_HEADERS, Tags } from "opentracing"
import { ERROR } from "opentracing/lib/ext/tags"
import Span from "opentracing/lib/span"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"

export const TracerContext = "@matechs/tracing/tracerContextURI"

export interface TracerContext {
  [TracerContext]: {
    instance: OT
  }
}

export const SpanContext = "@matechs/tracing/spanContextURI"

export interface SpanContext {
  [SpanContext]: {
    spanInstance: OS
    component: string
  }
}

export const Tracer = "@matechs/tracing/tracerURI"

export interface TracerOps {
  withTracer<S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A>
  withControllerSpan(
    component: string,
    operation: string,
    headers: { [k: string]: string }
  ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A>
  withChildSpan(
    operation: string
  ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A>
}

export interface Tracer {
  [Tracer]: TracerOps
}

function runWithSpan<S, R, E, A>(
  ma: T.Effect<S, SpanContext & R, E, A>,
  span: Span,
  component: string
) {
  return pipe(
    ma,
    T.chainError((e) =>
      pipe(
        T.sync(() => {
          span.setTag(ERROR, e instanceof Error ? e.message : JSON.stringify(e))
          span.finish()
        }),
        T.chain(() => T.raiseError(e))
      )
    ),
    T.chain((r) =>
      T.Do()
        .do(
          T.sync(() => {
            span.finish()
          })
        )
        .return(() => r)
    ),
    T.provide<SpanContext>({
      [SpanContext]: { spanInstance: span, component }
    })
  )
}

export function createControllerSpan(
  tracer: OT,
  component: string,
  operation: string,
  headers: any
): T.Sync<Span> {
  return T.sync(() => {
    let traceSpan: Span
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, headers)

    if (
      parentSpanContext &&
      parentSpanContext.toSpanId &&
      parentSpanContext.toSpanId().length > 0
    ) {
      traceSpan = tracer.startSpan(operation, {
        childOf: parentSpanContext,
        tags: {
          [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
          [Tags.COMPONENT]: component
        }
      })
    } else {
      traceSpan = tracer.startSpan(operation, {
        tags: {
          [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
          [Tags.COMPONENT]: component
        }
      })
    }

    return traceSpan
  })
}

export function hasTracerContext(u: unknown): u is TracerContext {
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u[TracerContext] !== "undefined" &&
    u[TracerContext] !== null
  )
}

export function hasTracer(u: unknown): u is Tracer {
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u[Tracer] !== "undefined" &&
    u[Tracer] !== null
  )
}

export const tracer: (factory?: T.Sync<OT>) => Tracer = (
  factory = T.sync(() => new OT())
) => ({
  [Tracer]: {
    withTracer<S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> {
      return T.Do()
        .bind("instance", factory)
        .bindL("res", ({ instance }) =>
          T.provide<TracerContext>({
            [TracerContext]: {
              instance
            }
          })(ma)
        )
        .return((s) => s.res)
    },
    withControllerSpan(
      component: string,
      operation: string,
      headers: { [k: string]: string }
    ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A> {
      return <S, R, E, A>(ma: T.Effect<S, R, E, A>) =>
        T.accessM((r: R) =>
          hasTracerContext(r)
            ? T.Do()
                .bindL("span", () =>
                  createControllerSpan(
                    r[TracerContext].instance,
                    component,
                    operation,
                    headers
                  )
                )
                .bindL("res", ({ span }) => runWithSpan(ma, span, component))
                .return((s) => s.res)
            : ma
        )
    },
    withChildSpan(
      operation: string
    ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A> {
      return <S, R, E, A>(ma: T.Effect<S, R, E, A>) =>
        T.accessM((r: R) =>
          hasChildContext(r)
            ? T.Do()
                .bindL("span", () =>
                  T.sync(() =>
                    r[TracerContext].instance.startSpan(operation, {
                      childOf: r[SpanContext].spanInstance
                    })
                  )
                )
                .bindL("res", ({ span }) =>
                  runWithSpan(ma, span, r[SpanContext].component)
                )
                .return((s) => s.res)
            : ma
        )
    }
  }
})

export function withTracer<S, R, E, A>(ma: T.Effect<S, R, E, A>) {
  return T.accessM((r: R) => (hasTracer(r) ? r[Tracer].withTracer(ma) : ma))
}

export function withControllerSpan(
  component: string,
  operation: string,
  headers: { [k: string]: string } = {}
) {
  return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
    T.accessM((r: R) =>
      hasTracer(r)
        ? r[Tracer].withControllerSpan(component, operation, headers)(ma)
        : ma
    )
}

export function withChildSpan(operation: string) {
  return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
    T.accessM((r: R) => (hasTracer(r) ? r[Tracer].withChildSpan(operation)(ma) : ma))
}

export type ChildContext = SpanContext & TracerContext

export function hasSpanContext(u: unknown): u is SpanContext {
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u[SpanContext] !== "undefined" &&
    u[SpanContext] !== null
  )
}

export function hasChildContext(u: unknown): u is ChildContext {
  return hasTracerContext(u) && hasSpanContext(u)
}
