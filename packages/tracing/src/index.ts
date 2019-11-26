import * as T from "@matechs/effect";
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
import { IO } from "fp-ts/lib/IO";

export interface HasTracerContext {
  tracer: {
    context: {
      tracerInstance: OT;
    };
  };
}

export interface HasSpanContext {
  span: {
    context: {
      spanInstance: OS;
      component: string;
    };
  };
}

export interface Tracer {
  tracer: {
    withTracer<R, E, A>(
      ma: T.Effect<HasTracerContext & R, E, A>
    ): T.Effect<R, E, A>;
    withControllerSpan(
      component: string,
      operation: string,
      headers: { [k: string]: string }
    ): <R, A>(
      ma: T.Effect<HasSpanContext & R, Error, A>
    ) => T.Effect<HasTracerContext & R, Error, A>;
    withChildSpan(
      operation: string
    ): <R, A>(ma: T.Effect<R, Error, A>) => T.Effect<R, Error, A>;
  };
}

function runWithSpan<R, A>(
  ma: T.Effect<HasSpanContext & R, Error, A>,
  span: Span,
  component: string
) {
  return pipe(
    ma,
    T.chainErrorWith(e =>
      pipe(
        T.sync(() => {
          span.setTag(ERROR, e.message);
          span.finish();
        }),
        T.pipeF.chain(() => T.raiseError(e))
      )
    ),
    T.chainWith(r =>
      Do(T.effectMonad)
        .do(
          T.sync(() => {
            span.finish();
          })
        )
        .return(() => r)
    ),
    T.provideR((r: R) => ({
      ...r,
      span: {
        context: { spanInstance: span, component }
      }
    }))
  );
}

export function createControllerSpan(
  tracer: OT,
  component: string,
  operation: string,
  headers: any
): IO<Span> {
  return () => {
    let traceSpan: Span;
    // NOTE: OpenTracing type definitions at
    // <https://github.com/opentracing/opentracing-javascript/blob/master/src/tracer.ts>
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
  };
}

export const tracer: (factory?: T.Effect<T.NoEnv, never, OT>) => Tracer = (
  factory = T.sync(() => new OT())
) => ({
  tracer: {
    withTracer<R, E, A>(
      ma: T.Effect<HasTracerContext & R, E, A>
    ): T.Effect<R, E, A> {
      return Do(T.effectMonad)
        .bind("instance", factory)
        .bindL("res", ({ instance }) =>
          T.provideR((r: R) => ({
            ...r,
            tracer: { ...r["tracer"], context: { tracerInstance: instance } }
          }))(ma)
        )
        .return(s => s.res);
    },
    withControllerSpan(
      component: string,
      operation: string,
      headers: { [k: string]: string }
    ): <R, A>(
      ma: T.Effect<HasSpanContext & R, Error, A>
    ) => T.Effect<R & HasTracerContext, Error, A> {
      return ma =>
        T.accessM(
          ({
            tracer: {
              context: { tracerInstance }
            }
          }: HasTracerContext) =>
            Do(T.effectMonad)
              .bindL("span", () =>
                T.sync(
                  createControllerSpan(
                    tracerInstance,
                    component,
                    operation,
                    headers
                  )
                )
              )
              .bindL("res", ({ span }) => runWithSpan(ma, span, component))
              .return(s => s.res)
        );
    },
    withChildSpan(
      operation: string
    ): <R, A>(ma: T.Effect<R, Error, A>) => T.Effect<R, Error, A> {
      return <R, A>(ma: T.Effect<R, Error, A>) =>
        T.accessM((r: R) =>
          hasChildContext(r)
            ? Do(T.effectMonad)
                .bindL("span", () =>
                  T.sync(() =>
                    r.tracer.context.tracerInstance.startSpan(operation, {
                      childOf: r.span.context.spanInstance
                    })
                  )
                )
                .bindL("res", ({ span }) =>
                  runWithSpan(ma, span, r.span.context.component)
                )
                .return(s => s.res)
            : ma
        );
    }
  }
});

export function withTracer<R, E, A>(ma: T.Effect<HasTracerContext & R, E, A>) {
  return T.accessM(({ tracer }: Tracer) => tracer.withTracer(ma));
}

export function withControllerSpan(
  component: string,
  operation: string,
  headers: { [k: string]: string } = {}
) {
  return <R, A>(
    ma: T.Effect<HasSpanContext & R, Error, A>
  ): T.Effect<HasTracerContext & Tracer & R, Error, A> =>
    T.accessM(({ tracer }: Tracer) =>
      tracer.withControllerSpan(component, operation, headers)(ma)
    );
}

export function withChildSpan(operation: string) {
  return <R, A>(ma: T.Effect<R, Error, A>): T.Effect<Tracer & R, Error, A> =>
    T.accessM(({ tracer }: Tracer) => tracer.withChildSpan(operation)(ma));
}

// provide opt-out utility for components of the ecosystem that integrate tracing
// this can be used if you don't want to configure tracing
export function noTracing<R, A>(
  op: T.Effect<Tracer & ChildContext & HasTracerContext & R, Error, A>
): T.Effect<R, Error, A> {
  return T.provideR((r: R) => ({ ...r, ...tracer() }))(
    withTracer(withControllerSpan("no-tracing", "dummy-controller")(op))
  );
}

export type ChildContext = HasSpanContext & HasTracerContext;

export function hasChildContext(t: any): t is ChildContext {
  return t && t.span && t.span.context && t.tracer && t.tracer.context;
}
