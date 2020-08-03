import { Tracer as OT, Span as OS, FORMAT_HTTP_HEADERS, Tags } from "opentracing"
import { ERROR } from "opentracing/lib/ext/tags"
import Span from "opentracing/lib/span"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as L from "@matechs/core/Layer"

export const TracerContext = "@matechs/tracing/tracerContextURI"
export const SpanContext = "@matechs/tracing/spanContextURI"
export const TracerURI = "@matechs/tracing/tracerURI"
const CauseURI = "@matechs/core/Cause"

export const EXTRA_TAGS = {
  ERROR_TYPE: "error.type",
  ERROR_CAUSE_TYPE: "error.causeType",
  ERROR_NAME: "error.name",
  ERROR_MESSAGE: "error.message"
}

export interface TracerContext {
  [TracerContext]: {
    instance: OT
  }
}

export interface SpanContext {
  [SpanContext]: {
    spanInstance: OS
    component: string
  }
}

export type ChildContext = SpanContext & TracerContext

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
  addSpanTags(
    extraTags: Record<string, unknown>
  ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A>
  setSpanTag(
    key: string,
    value: unknown
  ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A>
}

export interface Tracer {
  [TracerURI]: TracerOps
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
    typeof u[TracerURI] !== "undefined" &&
    u[TracerURI] !== null
  )
}

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

function runWithSpan<S, R, E, A>(
  ma: T.Effect<S, SpanContext & R, E, A>,
  span: Span,
  component: string
) {
  return pipe(
    ma,
    T.chainCause((e) =>
      pipe(
        T.sync(() => {
          span.setTag(ERROR, true)
          span.setTag(EXTRA_TAGS.ERROR_TYPE, CauseURI)
          span.setTag(EXTRA_TAGS.ERROR_CAUSE_TYPE, e._tag)

          if (
            e._tag === "Raise" &&
            e.next._tag === "None" &&
            e.error instanceof Error
          ) {
            span.setTag(EXTRA_TAGS.ERROR_NAME, e.error.constructor.name)
            span.setTag(EXTRA_TAGS.ERROR_MESSAGE, e.error.message)
          } else if (
            e._tag === "Abort" &&
            e.next._tag === "None" &&
            e.abortedWith instanceof Error
          ) {
            span.setTag(EXTRA_TAGS.ERROR_NAME, e.abortedWith.constructor.name)
            span.setTag(EXTRA_TAGS.ERROR_MESSAGE, e.abortedWith.message)
          } else {
            span.setTag(
              EXTRA_TAGS.ERROR_MESSAGE,
              JSON.stringify(e, (_, value) =>
                typeof value.toJSON !== "function" && value instanceof Error
                  ? value.toString()
                  : value
              )
            )
          }

          span.finish()
        }),
        T.chain(() => T.completed(e))
      )
    ),
    T.apFirst(T.sync(() => span.finish())),
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
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, headers)

    const childData =
      parentSpanContext &&
      parentSpanContext.toSpanId &&
      parentSpanContext.toSpanId().length > 0
        ? { childOf: parentSpanContext }
        : {}

    return tracer.startSpan(operation, {
      ...childData,
      tags: {
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
        [Tags.COMPONENT]: component
      }
    })
  })
}

export const Tracer = (factory: T.Sync<OT> = T.sync(() => new OT())) =>
  pipe(
    factory,
    L.useEffect((instance) =>
      L.fromValue<Tracer>({
        [TracerURI]: {
          withTracer<S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> {
            return T.provide<TracerContext>({
              [TracerContext]: {
                instance
              }
            })(ma)
          },
          withControllerSpan(
            component: string,
            operation: string,
            headers: { [k: string]: string }
          ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A> {
            return <S, R, E, A>(ma: T.Effect<S, R, E, A>) =>
              T.accessM((r: R) =>
                hasTracerContext(r)
                  ? T.chain_(
                      createControllerSpan(
                        r[TracerContext].instance,
                        component,
                        operation,
                        headers
                      ),
                      (span) => runWithSpan(ma, span, component)
                    )
                  : ma
              )
          },
          withChildSpan(
            operation: string
          ): <S, R, E, A>(ma: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A> {
            return <S, R, E, A>(ma: T.Effect<S, R, E, A>) =>
              T.accessM((r: R) =>
                hasChildContext(r)
                  ? pipe(
                      T.sync(() =>
                        r[TracerContext].instance.startSpan(operation, {
                          childOf: r[SpanContext].spanInstance
                        })
                      ),
                      T.chain((span) => runWithSpan(ma, span, r[SpanContext].component))
                    )
                  : ma
              )
          },
          addSpanTags(extraTags: Record<string, unknown>) {
            return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
              T.accessM((r: R) =>
                hasSpanContext(r)
                  ? T.applySecond(
                      T.sync(() => r[SpanContext].spanInstance.addTags(extraTags)),
                      ma
                    )
                  : ma
              )
          },
          setSpanTag(key: string, value: unknown) {
            return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
              T.accessM((r: R) =>
                hasSpanContext(r)
                  ? T.applySecond(
                      T.sync(() => r[SpanContext].spanInstance.setTag(key, value)),
                      ma
                    )
                  : ma
              )
          }
        }
      })
    )
  )

export function withTracer<S, R, E, A>(ma: T.Effect<S, R, E, A>) {
  return T.accessM((r: R) => (hasTracer(r) ? r[TracerURI].withTracer(ma) : ma))
}

export function withControllerSpan(
  component: string,
  operation: string,
  headers: { [k: string]: string } = {}
) {
  return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
    T.accessM((r: R) =>
      hasTracer(r)
        ? r[TracerURI].withControllerSpan(component, operation, headers)(ma)
        : ma
    )
}

export function withChildSpan(operation: string) {
  return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
    T.accessM((r: R) => (hasTracer(r) ? r[TracerURI].withChildSpan(operation)(ma) : ma))
}

export function addSpanTags(extraTags: Record<string, unknown>) {
  return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
    T.accessM((r: R) => (hasTracer(r) ? r[TracerURI].addSpanTags(extraTags)(ma) : ma))
}

export function setSpanTag(key: string, value: unknown) {
  return <S, R, E, A>(ma: T.Effect<S, R, E, A>): T.Effect<S, R, E, A> =>
    T.accessM((r: R) => (hasTracer(r) ? r[TracerURI].setSpanTag(key, value)(ma) : ma))
}
