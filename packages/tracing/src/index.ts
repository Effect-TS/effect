import * as M from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { Tracer as OT, Span as OS } from "opentracing";
import { Do } from "fp-ts-contrib/lib/Do";
import { ERROR } from "opentracing/lib/ext/tags";
import { Effect } from "@matechs/effect/lib";
import Span from "opentracing/lib/span";

export interface TracerFactory {
  tracer: {
    factory: M.Effect<M.NoEnv, never, OT>;
  };
}

export const tracerFactoryDummy: TracerFactory = {
  tracer: {
    factory: M.liftIO(() => new OT())
  }
};

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
    };
  };
}

export interface Tracer {
  tracer: {
    withTracer<R, E, A>(
      ma: M.Effect<HasTracerContext & R, E, A>
    ): M.Effect<R & TracerFactory, E, A>;
    withControllerSpan(
      name: string
    ): <R, A>(
      ma: M.Effect<HasSpanContext & R, Error, A>
    ) => M.Effect<HasTracerContext & R, Error, A>;
    withChildSpan(
      name: string
    ): <R, A>(
      ma: M.Effect<HasSpanContext & R, Error, A>
    ) => M.Effect<HasSpanContext & HasTracerContext & R, Error, A>;
  };
}

function runWithSpan<R, A>(
  ma: Effect<HasSpanContext & R, Error, A>,
  span: Span
) {
  return pipe(
    M.chainLeft(
      pipe(
        ma,
        M.chain(r =>
          Do(M.effectMonad)
            .do(
              M.liftIO(() => {
                span.finish();
              })
            )
            .return(() => r)
        )
      ),
      e =>
        pipe(
          M.liftIO(() => {
            span.setTag(ERROR, e.message);
            span.finish();
          }),
          M.chain(() => M.left(e))
        )
    ),
    M.provide<HasSpanContext>({
      span: {
        context: { spanInstance: span }
      }
    })
  );
}

export const tracer: Tracer = {
  tracer: {
    withTracer<R, E, A>(
      ma: M.Effect<HasTracerContext & R, E, A>
    ): M.Effect<R & TracerFactory, E, A> {
      return M.accessM(({ tracer: { factory } }: TracerFactory) =>
        Do(M.effectMonad)
          .bind("instance", factory)
          .bindL("res", ({ instance }) =>
            M.provide<HasTracerContext>({
              tracer: { context: { tracerInstance: instance } }
            })(ma)
          )
          .return(s => s.res)
      );
    },
    withControllerSpan(
      name: string
    ): <R, A>(
      ma: M.Effect<HasSpanContext & R, Error, A>
    ) => M.Effect<R & HasTracerContext, Error, A> {
      return ma =>
        M.accessM(
          ({
            tracer: {
              context: { tracerInstance }
            }
          }: HasTracerContext) =>
            Do(M.effectMonad)
              .bindL("span", () =>
                M.liftIO(() => tracerInstance.startSpan(name))
              )
              .bindL("res", ({ span }) => runWithSpan(ma, span))
              .return(s => s.res)
        );
    },
    withChildSpan(
      name: string
    ): <R, A>(
      ma: M.Effect<HasSpanContext & R, Error, A>
    ) => M.Effect<HasSpanContext & HasTracerContext & R, Error, A> {
      return ma =>
        M.accessM(
          ({
            tracer: {
              context: { tracerInstance }
            },
            span: {
              context: { spanInstance }
            }
          }: HasTracerContext & HasSpanContext) =>
            Do(M.effectMonad)
              .bindL("span", () =>
                M.liftIO(() =>
                  tracerInstance.startSpan(name, { childOf: spanInstance })
                )
              )
              .bindL("res", ({ span }) => runWithSpan(ma, span))
              .return(s => s.res)
        );
    }
  }
};

export function withTracer<R, E, A>(ma: M.Effect<HasTracerContext & R, E, A>) {
  return M.accessM(({ tracer }: Tracer) => tracer.withTracer(ma));
}

export function withControllerSpan(name: string) {
  return <R, A>(
    ma: M.Effect<HasSpanContext & R, Error, A>
  ): M.Effect<HasTracerContext & Tracer & R, Error, A> =>
    M.accessM(({ tracer }: Tracer) => tracer.withControllerSpan(name)(ma));
}

export function withChildSpan(name: string) {
  return <R, A>(
    ma: M.Effect<HasSpanContext & R, Error, A>
  ): M.Effect<HasTracerContext & HasSpanContext & Tracer & R, Error, A> =>
    M.accessM(({ tracer }: Tracer) => tracer.withChildSpan(name)(ma));
}

export type ChildContext = HasSpanContext & HasTracerContext;
