import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import {
  Tracer as OT,
  Span as OS,
  FORMAT_HTTP_HEADERS,
  Tags
} from "opentracing";
import { Do } from "fp-ts-contrib/lib/Do";
import { ERROR } from "opentracing/lib/ext/tags";
import Span from "opentracing/lib/span";

export const TracerContext = "@matechs/tracing/tracerContextURI";

export interface TracerContext {
  [TracerContext]: {
    instance: OT;
  };
}

export const SpanContext = "@matechs/tracing/spanContextURI";

export interface SpanContext {
  [SpanContext]: {
    spanInstance: OS;
    component: string;
  };
}

export const Tracer = "@matechs/tracing/tracerURI";

export interface TracerOps {
  withTracer<R, E, A>(ma: T.Effect<R, E, A>): T.Effect<R, E, A>;
  withControllerSpan(
    component: string,
    operation: string,
    headers: { [k: string]: string }
  ): <R, A>(ma: T.Effect<R, Error, A>) => T.Effect<R, Error, A>;
  withChildSpan(
    operation: string
  ): <R, A>(ma: T.Effect<R, Error, A>) => T.Effect<R, Error, A>;
}

export interface Tracer {
  [Tracer]: TracerOps;
}

function runWithSpan<R, A>(
  ma: T.Effect<SpanContext & R, Error, A>,
  span: Span,
  component: string
) {
  return pipe(
    ma,
    T.chainError(e =>
      pipe(
        T.sync(() => {
          span.setTag(ERROR, e.message);
          span.finish();
        }),
        T.chain(() => T.raiseError(e))
      )
    ),
    T.chain(r =>
      Do(T.effect)
        .do(
          T.sync(() => {
            span.finish();
          })
        )
        .return(() => r)
    ),
    T.provideS<SpanContext>({
      [SpanContext]: { spanInstance: span, component }
    })
  );
}

export function createControllerSpan(
  tracer: OT,
  component: string,
  operation: string,
  headers: any
): T.UIO<Span> {
  return T.sync(() => {
    let traceSpan: Span;
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, headers);

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
      });
    } else {
      traceSpan = tracer.startSpan(operation, {
        tags: {
          [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
          [Tags.COMPONENT]: component
        }
      });
    }

    return traceSpan;
  });
}

export function hasTracerContext(u: unknown): u is TracerContext {
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u[TracerContext] !== "undefined" &&
    u[TracerContext] !== null
  );
}

export function hasTracer(u: unknown): u is Tracer {
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u[Tracer] !== "undefined" &&
    u[Tracer] !== null
  );
}

export const tracer: (factory?: T.Effect<T.NoEnv, never, OT>) => Tracer = (
  factory = T.sync(() => new OT())
) => ({
  [Tracer]: {
    withTracer<R, E, A>(ma: T.Effect<R, E, A>): T.Effect<R, E, A> {
      return Do(T.effect)
        .bind("instance", factory)
        .bindL("res", ({ instance }) =>
          T.provideS<TracerContext>({
            [TracerContext]: {
              instance
            }
          })(ma)
        )
        .return(s => s.res);
    },
    withControllerSpan(
      component: string,
      operation: string,
      headers: { [k: string]: string }
    ): <R, A>(ma: T.Effect<R, Error, A>) => T.Effect<R, Error, A> {
      return <R, A>(ma: T.Effect<R, Error, A>) =>
        T.accessM((r: R) =>
          hasTracerContext(r)
            ? Do(T.effect)
                .bindL("span", () =>
                  createControllerSpan(
                    r[TracerContext].instance,
                    component,
                    operation,
                    headers
                  )
                )
                .bindL("res", ({ span }) => runWithSpan(ma, span, component))
                .return(s => s.res)
            : ma
        );
    },
    withChildSpan(
      operation: string
    ): <R, A>(ma: T.Effect<R, Error, A>) => T.Effect<R, Error, A> {
      return <R, A>(ma: T.Effect<R, Error, A>) =>
        T.accessM((r: R) =>
          hasChildContext(r)
            ? Do(T.effect)
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
                .return(s => s.res)
            : ma
        );
    }
  }
});

export function withTracer<R, E, A>(ma: T.Effect<R, E, A>) {
  return T.accessM((r: R) => (hasTracer(r) ? r[Tracer].withTracer(ma) : ma));
}

export function withControllerSpan(
  component: string,
  operation: string,
  headers: { [k: string]: string } = {}
) {
  return <R, A>(ma: T.Effect<R, Error, A>): T.Effect<R, Error, A> =>
    T.accessM((r: R) =>
      hasTracer(r)
        ? r[Tracer].withControllerSpan(component, operation, headers)(ma)
        : ma
    );
}

export function withChildSpan(operation: string) {
  return <R, A>(ma: T.Effect<R, Error, A>): T.Effect<R, Error, A> =>
    T.accessM((r: R) =>
      hasTracer(r) ? r[Tracer].withChildSpan(operation)(ma) : ma
    );
}

export type ChildContext = SpanContext & TracerContext;

export function hasSpanContext(u: unknown): u is SpanContext {
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u[SpanContext] !== "undefined" &&
    u[SpanContext] !== null
  );
}

export function hasChildContext(u: unknown): u is ChildContext {
  return hasTracerContext(u) && hasSpanContext(u);
}
